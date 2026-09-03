"""Shared application-wide usage/cost controls.

Replaces per-user token budgets with ONE monthly dollar budget for all model
spend, plus lightweight per-user safeguards (daily cap + rate limit) so a single
user can't drain it.

Enforcement order, before each model call (see routes/query.py):
  1. per-user rate limit   (Redis-backed distributed sliding window with a
                              process-local fallback — see app/core/ratelimit.py)
  2. reserve()             -> concurrency-safe DB reservation that atomically
                              checks the global monthly + per-user daily caps and
                              pre-charges a conservative estimate, so simultaneous
                              requests can't overspend. Reconciled to the actual
                              cost by record() after the call.

Cost is derived from real usage metadata (input/output tokens) and configurable
per-1K pricing (prompt and completion priced separately) — never a naive token
count. Limits and pricing are configured in app/core/config.py.
"""

from __future__ import annotations

from fastapi import HTTPException

from app.core import observability as obs
from app.core.config import settings
from app.core.database import get_supabase_client

# Rate limiting lives in its own module now (Redis-backed distributed limiter with
# a process-local bounded fallback). Re-exported here so existing budget.* call
# sites and the friendly-429 helpers keep working unchanged.
from app.core.ratelimit import (  # noqa: F401
    RateLimiter,
    _emit_denied,
    _limit_error,
    enforce_rate_limit,
    rate_limiter,
)

# --------------------------------------------------------------------------- #
# Cost
# --------------------------------------------------------------------------- #

def cost_usd(model: str | None, input_tokens: int, output_tokens: int) -> float:
    """Estimated USD cost from real token usage. Config price overrides win;
    otherwise fall back to the observability price table (input/output priced
    separately). Never raises."""
    if settings.cost_input_per_1k > 0 or settings.cost_output_per_1k > 0:
        return round(
            (input_tokens / 1000.0) * settings.cost_input_per_1k
            + (output_tokens / 1000.0) * settings.cost_output_per_1k,
            6,
        )
    return obs.estimate_cost_usd(model, input_tokens, output_tokens)


# --------------------------------------------------------------------------- #
# Reserve / reconcile against the shared budget (concurrency-safe in the DB)
# --------------------------------------------------------------------------- #

def reserve(user_id: str) -> str | None:
    """Atomically check the global monthly + per-user daily caps and pre-charge a
    conservative estimate. Returns a reservation id to reconcile later, or None if
    budgeting is unavailable (fail-open so a transient DB error doesn't take the
    demo down — usage is still recorded afterward). Raises 429 when a limit is hit.
    """
    try:
        resp = get_supabase_client().rpc(
            "reserve_budget",
            {
                "p_user_id": str(user_id),
                "p_est_cost": settings.max_cost_per_query_usd,
                "p_monthly_limit": settings.monthly_budget_usd,
                "p_user_daily_limit": settings.user_daily_budget_usd,
                "p_user_daily_tokens": settings.user_daily_token_limit,
            },
        ).execute()
        data = resp.data or {}
    except Exception as exc:  # noqa: BLE001 - infra error: fail-open policy decides
        obs.metrics.counter("budget.reserve_error").add(1)
        obs.log_event("budget_reserve_error", component="budget", level="WARNING",
                      success=False, error_type=type(exc).__name__, error=str(exc),
                      fail_open=settings.budget_fail_open)
        if settings.budget_fail_open:
            return None  # proceed unbudgeted; usage still recorded afterward
        # Strict policy: refuse rather than risk unbounded spend.
        raise HTTPException(status_code=503, detail="Usage limits are temporarily unavailable. Please retry shortly.")

    if not data.get("allowed"):
        reason = data.get("reason", "monthly")
        _emit_denied(reason)
        raise _limit_error(reason)
    return data.get("reservation_id")


def record(
    reservation_id: str | None,
    *,
    user_id: str,
    model: str | None,
    input_tokens: int,
    output_tokens: int,
    tokens_used: int,
    query_id: str | None,
) -> float:
    """Reconcile a reservation to the actual cost (or insert a fresh ledger row on
    the fail-open path where no reservation was made). Returns the actual cost.
    Never raises."""
    actual = cost_usd(model, input_tokens, output_tokens)
    try:
        supabase = get_supabase_client()
        if reservation_id:
            supabase.rpc("finalize_usage", {
                "p_reservation_id": reservation_id, "p_cost": actual,
                "p_tokens": tokens_used, "p_input": input_tokens,
                "p_output": output_tokens, "p_model": model, "p_query_id": query_id,
            }).execute()
        else:
            supabase.table("token_usage").insert({
                "user_id": str(user_id), "query_id": query_id, "tokens_used": tokens_used,
                "input_tokens": input_tokens, "output_tokens": output_tokens,
                "model": model, "cost_usd": actual, "status": "final",
            }).execute()
    except Exception as exc:  # noqa: BLE001
        obs.log_event("budget_record_error", component="budget", level="WARNING",
                      success=False, error_type=type(exc).__name__, error=str(exc))
    return actual


def release(reservation_id: str | None) -> None:
    """Free a reservation when the model call failed. Never raises."""
    if not reservation_id:
        return
    try:
        get_supabase_client().rpc("release_reservation", {"p_reservation_id": reservation_id}).execute()
    except Exception as exc:  # noqa: BLE001
        obs.log_event("budget_release_error", component="budget", level="WARNING",
                      success=False, error_type=type(exc).__name__, error=str(exc))


def budget_status() -> dict:
    """Global monthly budget status for the admin dashboard."""
    try:
        resp = get_supabase_client().rpc("get_budget_status").execute()
        data = resp.data or {}
    except Exception:
        data = {}
    spent = float(data.get("month_spent_usd", 0) or 0)
    limit = settings.monthly_budget_usd
    return {
        "month_start": data.get("month_start"),
        "month_spent_usd": round(spent, 4),
        "monthly_budget_usd": limit,
        "month_remaining_usd": round(max(0.0, limit - spent), 4),
        "month_requests": int(data.get("month_requests", 0) or 0),
    }


def user_month_spend() -> dict[str, dict]:
    """{user_id: {spent_usd, requests}} for the current month (admin visibility)."""
    try:
        resp = get_supabase_client().rpc("get_user_month_spend").execute()
        return {
            row["user_id"]: {"spent_usd": round(float(row.get("spent_usd", 0) or 0), 4),
                             "requests": int(row.get("requests", 0) or 0)}
            for row in (resp.data or [])
        }
    except Exception:
        return {}
