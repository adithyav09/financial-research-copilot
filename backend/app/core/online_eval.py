"""Online evaluators — cheap, non-LLM per-request quality signals.

Runs after each answer to surface two families of signal into the existing
observability setup (structured logs, `GET /api/metrics`, and any Arize export):

  * retrieval-quality drift — distributions of retrieved-chunk count and citation
    count, so a sudden drop (index/ingestion problem) is visible over time.
  * response regression tripwires — empty retrieval on a filing question, an
    answer with no citations, a structured-output parse failure, and a heuristic
    "looks like investment advice" check (the product's hard boundary).

No extra model calls and no cost — pure string/number checks. Feature-flagged via
ONLINE_EVAL_ENABLED and fully best-effort: it never changes or fails the response.
"""

from __future__ import annotations

import re

from app.core import observability as obs
from app.core.config import settings

# Heuristic tripwire for the "research, not advice" boundary. Cheap regex, not a
# judge — it flags likely regressions for review, it does not gate the response.
_ADVICE = re.compile(
    r"\b(you should (buy|sell|hold)"
    r"|i (recommend|suggest) (buying|selling|holding)"
    r"|(strong[- ])?(buy|sell) rating"
    r"|price target"
    r"|will (definitely |certainly )?(rise|fall|surge|crash|double|reach \$))",
    re.I,
)

# The regression checks whose failures are counted for alerting.
_REGRESSION_CHECKS = ("empty_retrieval", "no_citations", "structured_parse_failed", "possible_advice")


def evaluate(
    *,
    is_live: bool,
    retrieved_chunk_count: int,
    citation_count: int,
    structured_ok: bool,
    answer: str,
) -> dict | None:
    """Compute the signals and emit them. Returns the checks dict (handy for
    tests) or None when disabled. Never raises."""
    if not settings.online_eval_enabled:
        return None
    try:
        checks = {
            "retrieved_chunk_count": retrieved_chunk_count,
            "citation_count": citation_count,
            # regression tripwires — True means the check FAILED
            "empty_retrieval": (not is_live) and retrieved_chunk_count == 0,
            "no_citations": (not is_live) and citation_count == 0,
            "structured_parse_failed": not structured_ok,
            "possible_advice": bool(_ADVICE.search(answer or "")),
        }

        # Drift distributions.
        obs.metrics.histogram("eval.retrieved_chunks").record(retrieved_chunk_count)
        obs.metrics.histogram("eval.citations").record(citation_count)

        # Regression counters (per failing check) + a total for a pass-rate.
        failed = [k for k in _REGRESSION_CHECKS if checks[k]]
        obs.metrics.counter("eval.total").add(1)
        for k in failed:
            obs.metrics.counter("eval.regression").add(1, {"check": k})

        obs.log_event(
            "online_eval",
            component="eval",
            success=not failed,
            path="live" if is_live else "filing",
            failed_checks=failed,
            retrieved_chunk_count=retrieved_chunk_count,
            citation_count=citation_count,
        )
        return checks
    except Exception as exc:  # noqa: BLE001 — a monitor must never break the request
        obs.log_event("online_eval_error", component="eval", level="WARNING",
                      success=False, error_type=type(exc).__name__)
        return None
