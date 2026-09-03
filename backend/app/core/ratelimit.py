"""Per-user request rate limiting.

Primary path is a **Redis-backed sliding-window** limiter that is atomic across
processes and application instances via a single Lua script (check-and-add run as
one unit, so concurrent requests on any worker cannot race past the limit). When
Redis is not configured or is unavailable, it degrades to a **conservative,
process-local, bounded** fallback (the original in-memory limiter) — never to
unlimited — and that degradation is emitted as logs + metrics.

Policy preserved from the previous implementation: one per-user, per-minute limit
shared across the protected operations (query + ingest), configured by
RATE_LIMIT_PER_MINUTE. The friendly-429 interface is unchanged; a Retry-After
header is now added.

Key format (namespaced + versioned so keys can't collide and are safe to expire):
    {namespace}:rl:v1:{scope}:{blake2b(user_id)}
The user id is hashed so raw identifiers never land in Redis keys, metrics, or logs.
"""

from __future__ import annotations

import hashlib
import time
import uuid
from collections import defaultdict, deque

from fastapi import HTTPException

from app.core import observability as obs
from app.core.config import settings

_KEY_VERSION = "v1"
_WINDOW_MS = 60_000  # per-minute window

# User-facing messages — deliberately free of internal cost/security detail.
_MESSAGES = {
    "rate": "You're sending requests too quickly. Please wait a few seconds and try again.",
    "daily": "You've reached today's usage limit for this demo. Please try again tomorrow.",
    "monthly": "The shared monthly demo budget has been reached. Please check back next month.",
}


def _limit_error(reason: str, retry_after: int | None = None) -> HTTPException:
    """429 for every quota/rate limit; the reason stays server-side only. Adds a
    Retry-After header when we can bound the wait (rate-limit case)."""
    headers = {"Retry-After": str(retry_after)} if retry_after else None
    return HTTPException(status_code=429, detail=_MESSAGES.get(reason, _MESSAGES["monthly"]), headers=headers)


def _emit_denied(reason: str) -> None:
    """Structured signal + metric whenever a request is blocked by a limit."""
    obs.metrics.counter("budget.denied").add(1, {"reason": reason})
    obs.log_event("budget_denied", component="budget", level="WARNING", success=False, reason=reason)


# --------------------------------------------------------------------------- #
# In-memory sliding window — the process-local fallback (and the dev default
# when no REDIS_URL is set). NOT shared across instances.
# --------------------------------------------------------------------------- #

class RateLimiter:
    def __init__(self, per_minute: int, window: float = 60.0) -> None:
        self.per_minute = per_minute
        self.window = window
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, user_id: str, now: float | None = None) -> bool:
        """Record a hit and return False if the user is over the per-minute rate."""
        if self.per_minute <= 0:
            return True
        now = time.monotonic() if now is None else now
        q = self._hits[user_id]
        cutoff = now - self.window
        while q and q[0] < cutoff:
            q.popleft()
        if len(q) >= self.per_minute:
            return False
        q.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


rate_limiter = RateLimiter(settings.rate_limit_per_minute)  # fallback / dev singleton


# --------------------------------------------------------------------------- #
# Redis sliding window — atomic across instances via Lua
# --------------------------------------------------------------------------- #

# Sliding-window log in a sorted set. Trim entries older than the window, count
# what remains, and only add (allow) if under the limit — all inside one atomic
# script so N concurrent callers can never all pass the check. PEXPIRE keeps the
# key from lingering after the window. Returns 1 = allowed, 0 = rejected.
_LUA_SLIDING_WINDOW = """
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
local count = redis.call('ZCARD', KEYS[1])
if count < limit then
  redis.call('ZADD', KEYS[1], now, member)
  redis.call('PEXPIRE', KEYS[1], window)
  return 1
end
redis.call('PEXPIRE', KEYS[1], window)
return 0
"""


class RedisRateLimiter:
    def __init__(self, client, per_minute: int, *, window_ms: int = _WINDOW_MS, namespace: str = "frc") -> None:
        self.per_minute = per_minute
        self.window_ms = window_ms
        self.namespace = namespace
        self._client = client
        self._script = client.register_script(_LUA_SLIDING_WINDOW)  # EVALSHA w/ EVAL fallback

    def key(self, user_id: str, scope: str) -> str:
        h = hashlib.blake2b(user_id.encode("utf-8"), digest_size=16).hexdigest()
        return f"{self.namespace}:rl:{_KEY_VERSION}:{scope}:{h}"

    async def allow(self, user_id: str, scope: str) -> bool:
        if self.per_minute <= 0:
            return True
        now_ms = int(time.time() * 1000)
        member = f"{now_ms}-{uuid.uuid4().hex}"  # unique so ZADD never overwrites
        res = await self._script(
            keys=[self.key(user_id, scope)],
            args=[now_ms, self.window_ms, self.per_minute, member],
        )
        return int(res) == 1


# --------------------------------------------------------------------------- #
# Lifecycle + composite decision (Redis primary, bounded local fallback)
# --------------------------------------------------------------------------- #

_redis_client = None
_redis_limiter: RedisRateLimiter | None = None


async def init_redis() -> None:
    """Called from the app lifespan. Non-fatal: if REDIS_URL is unset we run the
    process-local limiter (documented single-instance behavior); if Redis is set
    but unreachable at startup we log it and still install the limiter so it
    retries per request and falls back per the failure policy."""
    global _redis_client, _redis_limiter
    if not settings.redis_url:
        obs.log_event("ratelimit_backend", component="ratelimit", backend="in_memory",
                      note="REDIS_URL unset — single-process rate limiting only")
        return
    import redis.asyncio as aioredis

    _redis_client = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_timeout=settings.redis_socket_timeout_ms / 1000.0,
        socket_connect_timeout=settings.redis_connect_timeout_ms / 1000.0,
        max_connections=settings.redis_max_connections,
    )
    _redis_limiter = RedisRateLimiter(
        _redis_client, settings.rate_limit_per_minute, namespace=settings.redis_namespace
    )
    try:
        await _redis_client.ping()
        obs.log_event("ratelimit_backend", component="ratelimit", backend="redis", success=True)
    except Exception as exc:  # noqa: BLE001 — startup must not crash on a cold Redis
        obs.metrics.counter("ratelimit.redis_error").add(1, {"error": type(exc).__name__})
        obs.log_event("ratelimit_redis_unavailable_at_startup", component="ratelimit",
                      level="WARNING", success=False, error_type=type(exc).__name__)


async def close_redis() -> None:
    global _redis_client, _redis_limiter
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception:  # noqa: BLE001
            pass
    _redis_client, _redis_limiter = None, None


def set_redis_limiter(limiter: RedisRateLimiter | None) -> None:
    """Test hook to inject a limiter (e.g. backed by fakeredis)."""
    global _redis_limiter
    _redis_limiter = limiter


def redis_enabled() -> bool:
    return _redis_limiter is not None


async def redis_healthy() -> bool:
    """Readiness probe for Redis (distinct from liveness). False if unset/unreachable."""
    if _redis_client is None:
        return False
    try:
        return bool(await _redis_client.ping())
    except Exception:  # noqa: BLE001
        return False


def _fallback_decide(scoped_id: str) -> bool:
    """Redis error path. Conservative + bounded per process — DEGRADED, not
    distributed. RATE_LIMIT_FAIL_MODE picks the mode (default 'local')."""
    mode = (settings.rate_limit_fail_mode or "local").lower()
    if mode == "open":
        obs.metrics.counter("ratelimit.degraded").add(1, {"mode": "open"})
        return True
    obs.metrics.counter("ratelimit.degraded").add(1, {"mode": "closed" if mode == "closed" else "local"})
    if mode == "closed":
        return False
    return rate_limiter.check(scoped_id)  # 'local' (and any unknown value) -> bounded per-process


async def _decide(user_id: str, scope: str) -> bool:
    if settings.rate_limit_per_minute <= 0:
        return True
    scoped_id = f"{scope}:{user_id}"
    if _redis_limiter is not None:
        t0 = time.perf_counter()
        try:
            allowed = await _redis_limiter.allow(user_id, scope)
            obs.metrics.histogram("ratelimit.redis_latency_ms").record((time.perf_counter() - t0) * 1000)
            return allowed
        except Exception as exc:  # noqa: BLE001 — timeout / connection error
            obs.metrics.counter("ratelimit.redis_error").add(1, {"error": type(exc).__name__})
            obs.log_event("ratelimit_redis_error", component="ratelimit", level="WARNING",
                          success=False, error_type=type(exc).__name__)
            return _fallback_decide(scoped_id)
    # No Redis configured: process-local limiter (documented single-instance path).
    return rate_limiter.check(scoped_id)


async def enforce_rate_limit(user_id: str, scope: str = "request") -> None:
    """Raise 429 (with Retry-After) if the user is over their per-minute rate."""
    allowed = await _decide(user_id, scope)
    obs.metrics.counter("ratelimit.decision").add(
        1, {"decision": "allowed" if allowed else "rejected", "scope": scope}
    )
    if not allowed:
        _emit_denied("rate")
        raise _limit_error("rate", retry_after=_WINDOW_MS // 1000)
