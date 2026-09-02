"""Observability foundation: trace context, structured JSON logging, metrics, cost.

This module is the single seam for all telemetry. Everything (request middleware,
retrieval, model calls, tools) emits through :func:`log_event` / :func:`stage` and
records through the :data:`metrics` registry. That keeps call sites backend-agnostic:
to add a hosted backend later (Langfuse, an OTLP collector, Datadog…) you implement
one exporter and register it with :func:`add_sink` / point the metrics registry at
an OpenTelemetry meter — no call site changes.

Design goals:
  * Zero external infrastructure to run locally. The default sink writes one JSON
    line per event to stdout; metrics live in-process.
  * OpenTelemetry-compatible shapes. ``Counter.add`` / ``Histogram.record`` mirror
    the OTel API so the in-memory registry can be swapped for an OTel meter.
  * Never let telemetry break a request. Sinks and metric writes are best-effort.
  * Secrets never reach a log. The formatter redacts recursively before emit.

Distinct from ``app/core/tracing.py`` (Arize AX span export), which stays as-is;
this module is the request-scoped structured-logging + metrics layer that works
with or without Arize configured.
"""

from __future__ import annotations

import contextlib
import json
import logging
import re
import sys
import time
import uuid
from collections.abc import Callable
from contextvars import ContextVar
from typing import Any

from app.core.config import settings

# --------------------------------------------------------------------------- #
# Trace context
# --------------------------------------------------------------------------- #

# One trace_id per research request, set by the middleware and read by every
# stage below it (retrieval, model, tools). ContextVar keeps it correct across
# concurrent async requests without threading an argument through every call.
_trace_id: ContextVar[str | None] = ContextVar("trace_id", default=None)
# Optional coarse-grained attributes attached to every event in the request
# (e.g. component defaults, route). Kept small and non-sensitive.
_trace_attrs: ContextVar[dict[str, Any] | None] = ContextVar("trace_attrs", default=None)


def new_trace_id() -> str:
    """Generate a fresh trace id (hex, no dashes — compact and log-grep friendly)."""
    return uuid.uuid4().hex


def set_trace_id(trace_id: str | None) -> str:
    """Set the current trace id, generating one if ``None``. Returns the value set."""
    tid = trace_id or new_trace_id()
    _trace_id.set(tid)
    return tid


def get_trace_id() -> str | None:
    """Return the current request's trace id, or ``None`` outside a request."""
    return _trace_id.get()


def set_trace_attr(**attrs: Any) -> None:
    """Attach attributes echoed on every subsequent event in this trace."""
    current = dict(_trace_attrs.get() or {})
    current.update(attrs)
    _trace_attrs.set(current)


def reset_trace() -> None:
    """Clear trace context (call at the end of a request)."""
    _trace_id.set(None)
    _trace_attrs.set(None)


# --------------------------------------------------------------------------- #
# Redaction — secrets, keys, auth headers, sensitive prompt content
# --------------------------------------------------------------------------- #

REDACTED = "«redacted»"

# Field names whose *values* are always dropped, matched case-insensitively as a
# substring (so "authorization", "openai_api_key", "supabase_service_key" all hit).
_SENSITIVE_KEY_PARTS = (
    "authorization",
    "_key",   # api_key, service_key, anon_key, signing_key, private_key…
    "apikey",
    "secret",
    "token",  # jwt / access / service tokens; note: NOT "tokens_used" (see allowlist)
    "password",
    "passwd",
    "cookie",
    "bearer",
    "credential",
)
# Numeric/aggregate fields that legitimately contain "token"/"key" but are safe.
_KEY_ALLOWLIST = {
    "tokens_used",
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "prompt_tokens",
    "completion_tokens",
    "retrieved_document_ids",
    "citation_count",
    "retrieved_chunk_count",
}

# Value-level patterns for secrets that appear inside free text.
_VALUE_PATTERNS = [
    re.compile(r"\bsk-[A-Za-z0-9_\-]{16,}\b"),           # OpenAI-style keys
    re.compile(r"\bBearer\s+[A-Za-z0-9._\-]+\b", re.I),  # Authorization: Bearer …
    re.compile(r"\beyJ[A-Za-z0-9._\-]{10,}\b"),          # JWTs (header starts eyJ)
    re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{8,}\b"),     # Slack tokens
]


def _is_sensitive_key(key: str) -> bool:
    k = key.lower()
    if k in _KEY_ALLOWLIST:
        return False
    return any(part in k for part in _SENSITIVE_KEY_PARTS)


def _redact_str(value: str) -> str:
    for pat in _VALUE_PATTERNS:
        value = pat.sub(REDACTED, value)
    return value


def redact(obj: Any) -> Any:
    """Recursively redact secrets from a log-bound object.

    Drops values under sensitive keys entirely and scrubs secret-shaped tokens
    from any string. Pure (returns a new structure), so it never mutates the
    caller's data.
    """
    if isinstance(obj, dict):
        out: dict[str, Any] = {}
        for k, v in obj.items():
            if isinstance(k, str) and _is_sensitive_key(k):
                out[k] = REDACTED
            else:
                out[k] = redact(v)
        return out
    if isinstance(obj, (list, tuple)):
        return [redact(v) for v in obj]
    if isinstance(obj, str):
        return _redact_str(obj)
    return obj


def redact_prompt(text: str | None, *, max_chars: int = 200) -> str | None:
    """Sanitize free-text prompt/question content for logging.

    When ``settings.redact_prompt_content`` is set, prompt text is dropped
    entirely (only its length is kept, emitted separately by callers). Otherwise
    it is secret-scrubbed and truncated so a full filing prompt never floods logs.
    """
    if text is None:
        return None
    if settings.redact_prompt_content:
        return REDACTED
    scrubbed = _redact_str(text)
    if len(scrubbed) > max_chars:
        return scrubbed[:max_chars] + "…"
    return scrubbed


# --------------------------------------------------------------------------- #
# Metrics — OpenTelemetry-shaped, in-memory backend (no infra required)
# --------------------------------------------------------------------------- #


def _labels_key(labels: dict[str, Any] | None) -> tuple:
    if not labels:
        return ()
    return tuple(sorted((str(k), str(v)) for k, v in labels.items()))


class Counter:
    """Monotonic counter. ``add`` mirrors ``opentelemetry`` ``Counter.add``."""

    def __init__(self, name: str) -> None:
        self.name = name
        self._values: dict[tuple, float] = {}

    def add(self, amount: float = 1, labels: dict[str, Any] | None = None) -> None:
        key = _labels_key(labels)
        self._values[key] = self._values.get(key, 0) + amount

    def collect(self) -> dict[str, float]:
        return {"__total__": sum(self._values.values()), **{
            "|".join(f"{k}={v}" for k, v in key) or "__nolabels__": val
            for key, val in self._values.items()
        }}


class Histogram:
    """Latency/size distribution. ``record`` mirrors ``Histogram.record``."""

    def __init__(self, name: str) -> None:
        self.name = name
        self._count = 0
        self._sum = 0.0
        self._min: float | None = None
        self._max: float | None = None

    def record(self, value: float, labels: dict[str, Any] | None = None) -> None:
        self._count += 1
        self._sum += value
        self._min = value if self._min is None else min(self._min, value)
        self._max = value if self._max is None else max(self._max, value)

    def collect(self) -> dict[str, float]:
        return {
            "count": self._count,
            "sum": round(self._sum, 3),
            "avg": round(self._sum / self._count, 3) if self._count else 0.0,
            "min": self._min or 0.0,
            "max": self._max or 0.0,
        }


class MetricsRegistry:
    """Holds named counters/histograms. Swap this for an OTel ``Meter`` later."""

    def __init__(self) -> None:
        self._counters: dict[str, Counter] = {}
        self._histograms: dict[str, Histogram] = {}

    def counter(self, name: str) -> Counter:
        if name not in self._counters:
            self._counters[name] = Counter(name)
        return self._counters[name]

    def histogram(self, name: str) -> Histogram:
        if name not in self._histograms:
            self._histograms[name] = Histogram(name)
        return self._histograms[name]

    def snapshot(self) -> dict[str, Any]:
        """Aggregate view for a debug endpoint. Contains only counts, never data."""
        return {
            "counters": {n: c.collect() for n, c in self._counters.items()},
            "histograms": {n: h.collect() for n, h in self._histograms.items()},
        }

    def reset(self) -> None:
        self._counters.clear()
        self._histograms.clear()


metrics = MetricsRegistry()

# Canonical metric names (OTel-style dotted namespaces).
M_REQUESTS = "requests.total"
M_REQUESTS_OK = "requests.success"
M_REQUESTS_ERR = "requests.failure"
M_E2E_LATENCY = "request.duration_ms"
M_STAGE_LATENCY = "stage.duration_ms"
M_RETRIES = "retries.total"
M_TOOL_FAILURES = "tool.failures"
M_TOKENS_IN = "model.input_tokens"
M_TOKENS_OUT = "model.output_tokens"
M_COST = "model.cost_usd"


# --------------------------------------------------------------------------- #
# Cost estimation
# --------------------------------------------------------------------------- #

# USD per 1K tokens (input, output). Approximate list prices; kept small and
# central so pricing changes touch one place. Unknown models fall back to a
# conservative default rather than crashing.
_MODEL_PRICING: dict[str, tuple[float, float]] = {
    "gpt-4o-mini": (0.00015, 0.0006),
    "gpt-4o": (0.0025, 0.01),
    "gpt-4.1-mini": (0.0004, 0.0016),
    "gpt-4.1": (0.002, 0.008),
    "gpt-3.5-turbo": (0.0005, 0.0015),
    "text-embedding-3-small": (0.00002, 0.0),
    "text-embedding-3-large": (0.00013, 0.0),
}
_DEFAULT_PRICING = (0.0005, 0.0015)


def estimate_cost_usd(model: str | None, input_tokens: int, output_tokens: int) -> float:
    """Estimate model call cost in USD from token counts. Never raises."""
    if not model:
        in_price, out_price = _DEFAULT_PRICING
    else:
        in_price, out_price = _MODEL_PRICING.get(model.lower(), _DEFAULT_PRICING)
    cost = (input_tokens / 1000.0) * in_price + (output_tokens / 1000.0) * out_price
    return round(cost, 6)


# --------------------------------------------------------------------------- #
# Structured logging
# --------------------------------------------------------------------------- #

LOGGER_NAME = "observability"
_logger = logging.getLogger(LOGGER_NAME)

# Extra sinks (e.g. a future Langfuse/OTLP exporter) receive each event dict.
_sinks: list[Callable[[dict[str, Any]], None]] = []


def add_sink(sink: Callable[[dict[str, Any]], None]) -> None:
    """Register an extra event sink. The clean seam for hosted backends."""
    _sinks.append(sink)


class _JsonFormatter(logging.Formatter):
    """Render log records as single-line JSON with redaction already applied."""

    def format(self, record: logging.LogRecord) -> str:
        payload = getattr(record, "event", None)
        if payload is None:
            payload = {
                "event_name": record.name,
                "message": record.getMessage(),
            }
        base = {
            "level": record.levelname,
            "logger": record.name,
        }
        base.update(payload)
        return json.dumps(base, default=str, ensure_ascii=False)


_configured = False


def configure_logging() -> None:
    """Install the JSON formatter on the observability logger. Idempotent."""
    global _configured
    if _configured:
        return
    handler = logging.StreamHandler(sys.stdout)
    if settings.log_json:
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
    _logger.handlers = [handler]
    _logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    _logger.propagate = False
    _configured = True


def _now_iso() -> str:
    # Local wall-clock ISO-8601 with millisecond precision.
    t = time.time()
    lt = time.gmtime(t)
    return time.strftime("%Y-%m-%dT%H:%M:%S", lt) + f".{int((t % 1) * 1000):03d}Z"


def log_event(
    event_name: str,
    *,
    component: str,
    level: str = "INFO",
    success: bool | None = None,
    duration_ms: float | None = None,
    error_type: str | None = None,
    **fields: Any,
) -> dict[str, Any]:
    """Emit one structured event. Returns the (redacted) event dict.

    All the schema fields the task calls for are first-class kwargs or land in
    ``**fields``: model, prompt_version, input_tokens, output_tokens,
    estimated_cost_usd, retrieved_document_ids, retrieved_chunk_count,
    citation_count, release/version, etc.
    """
    if not _configured:
        configure_logging()

    event: dict[str, Any] = {
        "timestamp": _now_iso(),
        "level": level,
        "event_name": event_name,
        "trace_id": get_trace_id(),
        "component": component,
        "release": settings.release_version or None,
        "version": settings.release_version or None,
    }
    attrs = _trace_attrs.get()
    if attrs:
        event.update({k: v for k, v in attrs.items() if k not in event})
    if success is not None:
        event["success"] = success
    if duration_ms is not None:
        event["duration_ms"] = round(duration_ms, 2)
    if error_type is not None:
        event["error_type"] = error_type
    event.update(fields)

    safe = redact(event)
    _logger.log(getattr(logging, level.upper(), logging.INFO), event_name, extra={"event": safe})
    for sink in _sinks:
        with contextlib.suppress(Exception):
            sink(safe)
    return safe


@contextlib.contextmanager
def stage(event_name: str, *, component: str, **fields: Any):
    """Time a stage and emit ``{event}_started`` / ``{event}_completed`` / ``{event}_failed``.

    Records duration into the stage-latency histogram (labelled by event) and,
    on exception, logs ``error_type`` + ``success=False`` and re-raises so control
    flow is unchanged. Yield value is a mutable dict — mutate it to attach fields
    (e.g. token counts) that only become known mid-stage; they appear on the
    ``_completed`` event.

        with stage("retrieval", component="retrieval") as s:
            docs = retrieve()
            s["retrieved_chunk_count"] = len(docs)
    """
    log_event(f"{event_name}_started", component=component, **fields)
    started = time.perf_counter()
    extra: dict[str, Any] = {}
    try:
        yield extra
    except Exception as exc:
        duration_ms = (time.perf_counter() - started) * 1000
        metrics.histogram(M_STAGE_LATENCY).record(duration_ms, {"stage": event_name})
        log_event(
            f"{event_name}_failed",
            component=component,
            level="ERROR",
            success=False,
            duration_ms=duration_ms,
            error_type=type(exc).__name__,
            error=str(exc),
            **{**fields, **extra},
        )
        raise
    else:
        duration_ms = (time.perf_counter() - started) * 1000
        metrics.histogram(M_STAGE_LATENCY).record(duration_ms, {"stage": event_name})
        log_event(
            f"{event_name}_completed",
            component=component,
            success=True,
            duration_ms=duration_ms,
            **{**fields, **extra},
        )


def record_model_usage(model: str | None, input_tokens: int, output_tokens: int) -> float:
    """Record token + cost metrics for a model call and return estimated cost."""
    cost = estimate_cost_usd(model, input_tokens, output_tokens)
    labels = {"model": model or "unknown"}
    metrics.counter(M_TOKENS_IN).add(input_tokens, labels)
    metrics.counter(M_TOKENS_OUT).add(output_tokens, labels)
    metrics.counter(M_COST).add(cost, labels)
    return cost


def record_tool_failure(tool: str) -> None:
    metrics.counter(M_TOOL_FAILURES).add(1, {"tool": tool})


def record_retry(where: str) -> None:
    metrics.counter(M_RETRIES).add(1, {"where": where})
