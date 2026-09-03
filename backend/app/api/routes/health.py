from fastapi import APIRouter

from app.core import observability as obs
from app.core import ratelimit
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Liveness — the process is up and serving. Never depends on Redis, so a
    Redis blip can't restart the app (the limiter degrades instead)."""
    return HealthResponse(status="healthy", version="0.1.0")


@router.get("/health/ready")
async def readiness_check():
    """Readiness — dependency status (distinct from liveness). Reports the rate-
    limit backend: `redis` (distributed) when configured and reachable, else
    `in_memory` (single-instance / degraded). Returns 200 either way; the field is
    for dashboards/load-balancers, not a hard gate (the app still functions)."""
    if not ratelimit.redis_enabled():
        return {"status": "ready", "rate_limit_backend": "in_memory"}
    healthy = await ratelimit.redis_healthy()
    return {
        "status": "ready",
        "rate_limit_backend": "redis" if healthy else "in_memory",
        "redis_reachable": healthy,
    }


@router.get("/metrics")
async def metrics_snapshot():
    """Aggregate in-process metrics (counts/latencies only — no request content).

    Local, infra-free view of request/success/failure counts, stage + end-to-end
    latency, retries, tool failures, token usage, and estimated cost. A hosted
    backend (OTLP/Prometheus) can later scrape or replace this without call-site
    changes; the numbers come from the same registry the app records into.
    """
    return obs.metrics.snapshot()
