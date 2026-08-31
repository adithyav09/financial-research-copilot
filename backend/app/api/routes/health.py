from fastapi import APIRouter

from app.core import observability as obs
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", version="0.1.0")


@router.get("/metrics")
async def metrics_snapshot():
    """Aggregate in-process metrics (counts/latencies only — no request content).

    Local, infra-free view of request/success/failure counts, stage + end-to-end
    latency, retries, tool failures, token usage, and estimated cost. A hosted
    backend (OTLP/Prometheus) can later scrape or replace this without call-site
    changes; the numbers come from the same registry the app records into.
    """
    return obs.metrics.snapshot()
