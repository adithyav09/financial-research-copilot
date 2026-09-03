# Operations: Distributed Rate Limiting (Redis)

Operational runbook for the per-user request rate limiter
(`backend/app/core/ratelimit.py`). Covers provisioning, configuration, health,
capacity, failure/recovery, monitoring, rollback, and multi-instance
verification.

> **Scope.** This governs the **per-user, per-minute request rate limit** only.
> The shared *dollar* budget (monthly/daily) is enforced separately in Postgres
> (`reserve_budget()` advisory-lock RPC) and is already multi-instance-safe — it
> does **not** depend on Redis.

---

## 1. What it does

Each protected request (`/api/query`, `/api/ingest`) calls
`await budget.enforce_rate_limit(user_id)` **before** any model/DB work. The
limiter admits up to `RATE_LIMIT_PER_MINUTE` requests per user per rolling
60-second window; over-limit requests get **429** with a `Retry-After: 60`
header and a friendly message (no internal detail).

**Backend selection is automatic:**

| `REDIS_URL`         | Backend                       | Shared across instances? |
|---------------------|-------------------------------|--------------------------|
| set + reachable     | Redis sliding window (Lua)    | **Yes** (authoritative)  |
| unset (dev default) | in-memory sliding window      | No (per process)         |
| set but unreachable | fallback per `RATE_LIMIT_FAIL_MODE` | No (degraded)      |

The Redis path is atomic: a single Lua script does
`ZREMRANGEBYSCORE` (trim window) → `ZCARD` (count) → conditional `ZADD` +
`PEXPIRE`, so concurrent requests on any worker cannot race past the limit.

Keys: `{namespace}:rl:v1:{scope}:{blake2b(user_id, 16)}`. Namespaced (multi-app
safe), versioned (`v1` — bump to invalidate all keys), and **hashed** (raw user
ids never touch Redis, metrics, or logs). Keys self-expire via `PEXPIRE`, so an
idle user leaves nothing behind.

---

## 2. Provisioning Redis

Any Redis ≥ 5 (needs `EVAL`/`EVALSHA` for Lua). Managed options: AWS
ElastiCache, GCP Memorystore, Upstash, Redis Cloud.

**Sizing.** Memory is tiny: one small sorted set per *active* user per window,
each entry ~50–100 B and expiring within 60 s. Thousands of active users fit in
a few MB. `redis:7-alpine` with `--maxmemory 128mb --maxmemory-policy
allkeys-lru` (as in `docker-compose.yml`) is comfortable; LRU eviction is safe
here — an evicted key just means that user's window resets early (fail-safe, not
fail-open past the limit within a fresh window).

**Persistence.** Not needed. Rate-limit state is ephemeral by design — disable
RDB/AOF (`--save "" --appendonly no`) to avoid fork latency. Losing all state on
restart is acceptable (every user's window simply resets).

**Network / security.**
- Keep Redis on a private network; never expose 6379 publicly.
- Require auth (`requirepass` / ACL) and pass credentials in `REDIS_URL`.
- Use TLS in production: `rediss://` scheme.
- **Never commit a credentialed `REDIS_URL`** — inject via the platform's secret
  manager. `.env.example` ships blank with that warning.

---

## 3. Configuration (env vars)

| Var | Default | Meaning |
|-----|---------|---------|
| `REDIS_URL` | `""` | `redis://host:6379/0` or `rediss://…` for TLS. Blank = in-memory (single instance). |
| `REDIS_NAMESPACE` | `frc` | Key prefix. Bump to invalidate all limiter keys at once. |
| `REDIS_SOCKET_TIMEOUT_MS` | `100` | Per-command timeout. Keeps the request hot path fast — a slow Redis degrades rather than blocks. |
| `REDIS_CONNECT_TIMEOUT_MS` | `200` | Connection establishment timeout. |
| `REDIS_MAX_CONNECTIONS` | `10` | Pool size per process. Raise for very high concurrency. |
| `RATE_LIMIT_PER_MINUTE` | `20` | Per-user admits per 60 s. `0` disables limiting entirely. |
| `RATE_LIMIT_FAIL_MODE` | `local` | Redis-error behavior: `local` (bounded per-process), `closed` (reject), `open` (allow). |

**`RATE_LIMIT_FAIL_MODE` choice:**
- `local` *(default, recommended)* — on a Redis error, fall back to the bounded
  in-memory window. Still enforces a limit (per process), never unlimited. Best
  availability/safety trade-off.
- `closed` — reject (429) when Redis is down. Strictest; use if exceeding the
  limit is unacceptable even briefly.
- `open` — allow when Redis is down. Only if availability strictly outranks
  limiting and the dollar budget is your real backstop. **Not** unlimited spend:
  the Postgres budget still gates cost.

---

## 4. Startup, health, readiness

- Redis is connected in the FastAPI **`lifespan`** (`init_redis()`), closed on
  shutdown (`close_redis()`). Startup is **non-fatal**: an unreachable Redis at
  boot logs `ratelimit_redis_unavailable_at_startup` and installs the limiter
  anyway, so it retries per request and degrades per policy. The app still
  serves.
- **Liveness** — `GET /api/health` — never touches Redis. A Redis blip cannot
  restart the app.
- **Readiness** — `GET /api/health/ready` — reports the active backend:
  ```json
  { "status": "ready", "rate_limit_backend": "redis", "redis_reachable": true }
  ```
  `rate_limit_backend` is `redis` when configured **and** reachable, else
  `in_memory`. Returns 200 either way (informational for dashboards/LBs, not a
  hard gate).

---

## 5. Monitoring & alerts

Metrics are in the in-process registry at `GET /api/metrics` (scrape/forward to
your backend). All labels are **low-cardinality** (decision, scope, mode, error
type — never user ids).

| Metric | Type | Use |
|--------|------|-----|
| `ratelimit.decision{decision,scope}` | counter | allowed vs rejected volume per operation |
| `ratelimit.redis_latency_ms` | histogram | Redis round-trip latency (watch p95/p99) |
| `ratelimit.redis_error{error}` | counter | Redis timeouts/connection errors by type |
| `ratelimit.degraded{mode}` | counter | fallback engaged (local/closed/open) |
| `budget.denied{reason=rate}` | counter | user-visible 429s from rate limiting |

**Suggested alerts:**
- `ratelimit.redis_error` rate > 0 sustained (> 1 min) → Redis connectivity issue.
- `ratelimit.degraded` > 0 sustained → running degraded (per-process), not
  distributed — investigate Redis.
- `ratelimit.redis_latency_ms` p99 approaching `REDIS_SOCKET_TIMEOUT_MS` →
  Redis slow; raise timeout or scale Redis.
- `readiness.rate_limit_backend == in_memory` while `REDIS_URL` is set → Redis
  down.

Structured log events (component `ratelimit`): `ratelimit_backend`,
`ratelimit_redis_error`, `ratelimit_redis_unavailable_at_startup`.

---

## 6. Failure modes & recovery

| Failure | Behavior | Recovery |
|---------|----------|----------|
| Redis unreachable at startup | Logged; limiter installed; per-request retry + fallback | Auto-recovers on next successful command; no restart needed |
| Redis command timeout / error mid-request | `ratelimit.redis_error` emitted; decision via `RATE_LIMIT_FAIL_MODE` | Auto-recovers when Redis responds again |
| Redis restarted / flushed | All windows reset (state is ephemeral) | Self-heals; no action |
| Redis at maxmemory | `allkeys-lru` evicts idle keys (safe) | Scale memory if eviction is heavy |
| Malformed `RATE_LIMIT_FAIL_MODE` | Treated as `local` (bounded, safe) | Fix env; no crash |

Recovery is automatic throughout — the limiter re-attempts Redis every request
and stops degrading as soon as Redis is healthy again. No manual intervention or
redeploy required for transient Redis outages.

---

## 7. Rollback

The limiter is **backend-selected by env var** — rollback needs no code change:

1. **Disable Redis, keep limiting** — unset `REDIS_URL` (and redeploy/restart).
   Falls back to the in-memory limiter (per-process; the pre-Redis behavior).
2. **Disable rate limiting entirely** — set `RATE_LIMIT_PER_MINUTE=0`. The dollar
   budget still protects spend.
3. **Full code rollback** — revert the release commit. The public interface
   (`budget.enforce_rate_limit`, `budget.rate_limiter`, `RateLimiter`) is
   preserved and re-exported, so call sites in `routes/query.py` /
   `routes/ingest.py` are unaffected by reverting.

No schema/migration is involved — nothing to undo in Postgres.

---

## 8. Two-instance verification

Confirm the limit is genuinely **shared** across replicas (the whole point).

**Automated (no real Redis needed):** the test suite proves shared state and
atomicity with `fakeredis[lua]`:
```bash
cd backend && pytest tests/unit/test_ratelimit.py -v
```
- `test_concurrent_burst_cannot_exceed_limit` — 30 concurrent requests, limit 5
  → exactly 5 admitted (Lua atomicity).
- `test_two_instances_share_one_limit` — two independent `RedisRateLimiter`
  objects on one shared server → combined admits obey the single limit.

**Manual (real Redis, two processes):**
```bash
# 1. Start Redis
docker run --rm -p 6379:6379 redis:7-alpine

# 2. Two backend instances pointing at the SAME Redis
REDIS_URL=redis://localhost:6379/0 RATE_LIMIT_PER_MINUTE=5 \
  uvicorn app.main:app --port 8000 &
REDIS_URL=redis://localhost:6379/0 RATE_LIMIT_PER_MINUTE=5 \
  uvicorn app.main:app --port 8001 &

# 3. Alternate requests across both ports as ONE user (valid bearer token).
#    The 6th request within the window returns 429 with Retry-After: 60,
#    regardless of which port serves it — proving one shared limit.

# 4. Confirm the backend on each: GET /api/health/ready -> "rate_limit_backend":"redis"
```
Via `docker-compose`: `docker compose up --scale backend=2` (both replicas get
`REDIS_URL=redis://redis:6379/0` from the compose env) and drive the same user
against the load-balanced endpoint.

If instead each instance let the user through `2 × limit` requests, they are
**not** sharing state — check that both have the same reachable `REDIS_URL` and
that `/health/ready` reports `redis` on each.
