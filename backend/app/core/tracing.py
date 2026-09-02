"""Arize AX tracing bootstrap.

Registers an OpenTelemetry tracer provider that exports to Arize AX and turns on
OpenInference auto-instrumentation for LangChain. Because the LangChain
instrumentor patches LangChain's callback system, ``init_tracing()`` must run
*before* the first ``langchain``/``langchain_openai`` import (see app/main.py).

Tracing is opt-in: if ``ARIZE_SPACE_ID`` / ``ARIZE_API_KEY`` are unset, this is a
no-op so local dev and tests run unchanged.
"""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# arize-otel ships an explicit endpoint constant for US (its default) and EU; for
# other clusters we pass the OTLP gRPC endpoint as a string.
_REGION_ENDPOINTS = {
    "eu": "https://otlp.eu-west-1a.arize.com/v1",
    "canada": "https://otlp.ca-central-1a.arize.com/v1",
    "ca": "https://otlp.ca-central-1a.arize.com/v1",
}

_initialized = False


def init_tracing() -> bool:
    """Enable Arize tracing if credentials are configured. Returns True if enabled.

    Safe to call more than once; only the first call registers a provider.
    """
    global _initialized
    if _initialized:
        return True

    if not (settings.arize_space_id and settings.arize_api_key):
        logger.info(
            "Arize tracing disabled (set ARIZE_SPACE_ID and ARIZE_API_KEY to enable)."
        )
        return False

    try:
        from arize.otel import register
        from openinference.instrumentation.langchain import LangChainInstrumentor
    except ImportError as exc:  # deps not installed — never block the app
        logger.warning("Arize tracing deps missing (%s); skipping instrumentation.", exc)
        return False

    register_kwargs = {
        "space_id": settings.arize_space_id,
        "api_key": settings.arize_api_key,
        "project_name": settings.arize_project_name,
    }
    region = (settings.arize_region or "US").strip().lower()
    explicit_endpoint = (settings.arize_otlp_endpoint or "").strip()
    if explicit_endpoint:  # explicit override wins over region
        register_kwargs["endpoint"] = explicit_endpoint
    elif region not in ("us", ""):  # US is arize-otel's default endpoint
        endpoint = _REGION_ENDPOINTS.get(region)
        if endpoint:
            register_kwargs["endpoint"] = endpoint
        else:
            logger.warning(
                "Unknown ARIZE_REGION %r; falling back to the default US endpoint.",
                settings.arize_region,
            )

    tracer_provider = register(**register_kwargs)
    LangChainInstrumentor().instrument(tracer_provider=tracer_provider)

    _initialized = True
    logger.info(
        "Arize tracing enabled (project=%s, region=%s).",
        settings.arize_project_name,
        region.upper() or "US",
    )
    return True