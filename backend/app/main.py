# Initialize Arize tracing BEFORE importing anything that pulls in LangChain, so
# OpenInference auto-instrumentation is active when langchain_openai first loads.
from app.core.tracing import init_tracing

init_tracing()

import time  # noqa: E402

from fastapi import FastAPI, Request  # noqa: E402  (import after init_tracing by design)
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.api.routes import (  # noqa: E402
    health, ingest, query, status, market_data, auth, suggestions, history, news, tickers, filing,
)
from app.core import observability as obs  # noqa: E402

obs.configure_logging()

app = FastAPI(
    title="Financial Research Copilot",
    description="RAG-powered SEC filing analysis with configurable research modes",
    version="0.1.0",
)

# Header clients/proxies use to supply or read the trace id, so a UI result can be
# matched back to backend logs (and a trace can span services later).
TRACE_HEADER = "X-Trace-Id"


@app.middleware("http")
async def trace_context_middleware(request: Request, call_next):
    """Assign one trace_id per request, log its lifecycle, echo it in the response.

    Accepts an inbound X-Trace-Id (propagation from a caller) or mints a fresh one.
    Emits request_received then request_completed/request_failed with end-to-end
    latency, and records request/success/failure counters + the e2e histogram.
    Telemetry never changes the response contract — the header is additive.
    """
    trace_id = obs.set_trace_id(request.headers.get(TRACE_HEADER))
    obs.set_trace_attr(http_method=request.method, http_path=request.url.path)
    obs.metrics.counter(obs.M_REQUESTS).add(1, {"path": request.url.path})
    obs.log_event(
        "request_received",
        component="api",
        http_method=request.method,
        http_path=request.url.path,
    )
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = (time.perf_counter() - started) * 1000
        obs.metrics.counter(obs.M_REQUESTS_ERR).add(1, {"path": request.url.path})
        obs.metrics.histogram(obs.M_E2E_LATENCY).record(duration_ms, {"path": request.url.path})
        obs.log_event(
            "request_failed",
            component="api",
            level="ERROR",
            success=False,
            duration_ms=duration_ms,
            error_type=type(exc).__name__,
            error=str(exc),
        )
        obs.reset_trace()
        raise
    duration_ms = (time.perf_counter() - started) * 1000
    status_code = response.status_code
    ok = status_code < 500
    obs.metrics.counter(obs.M_REQUESTS_OK if ok else obs.M_REQUESTS_ERR).add(
        1, {"path": request.url.path}
    )
    obs.metrics.histogram(obs.M_E2E_LATENCY).record(duration_ms, {"path": request.url.path})
    obs.log_event(
        "request_completed",
        component="api",
        success=ok,
        duration_ms=duration_ms,
        status_code=status_code,
    )
    response.headers[TRACE_HEADER] = trace_id
    obs.reset_trace()
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://financial-research-copilot-weld.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(market_data.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(suggestions.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(tickers.router, prefix="/api")
app.include_router(filing.router, prefix="/api")
