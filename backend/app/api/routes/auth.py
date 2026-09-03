"""
Auth routes: user profile + admin visibility.

Access approval was removed — every authenticated user can use the copilot
immediately (see app/core/auth.require_approved). Usage is bounded by a shared
application-wide monthly budget + per-user daily/rate limits (app/core/budget.py),
so there is no per-user token budget, no access-request queue, and no approve/deny.
OAuth sign-in itself is handled client-side by the Supabase JS SDK.
"""

from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from app.core import budget
from app.core.auth import AuthenticatedUser, get_current_user, require_admin
from app.core.config import settings
from app.core.database import get_supabase_client
from app.models.schemas import (
    AdminUserListResponse,
    SetRolePayload,
    UsageSummaryResponse,
    UserProfileResponse,
)

router = APIRouter()

VALID_ROLES = {"user", "approved", "admin"}


@router.get("/auth/me", response_model=UserProfileResponse)
async def get_me(user: AuthenticatedUser = Depends(get_current_user)) -> UserProfileResponse:
    """The current user's profile (identity + role). No per-user budget anymore."""
    supabase = get_supabase_client()
    result = (
        supabase.table("profiles")
        .select("id, email, role, created_at")
        .eq("id", user.user_id)
        .single()
        .execute()
    )
    p = result.data or {"id": user.user_id, "email": user.email, "role": user.role}
    return UserProfileResponse(
        user_id=p["id"],
        email=p.get("email"),
        role=p.get("role", "approved"),
        created_at=p.get("created_at"),
    )


@router.get("/auth/users", response_model=AdminUserListResponse, dependencies=[Depends(require_admin)])
async def list_users() -> AdminUserListResponse:
    """Admin: every user with role + this-month spend (for abuse spotting)."""
    supabase = get_supabase_client()
    result = (
        supabase.table("profiles")
        .select("id, email, role, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    spend = budget.user_month_spend()
    users = [
        UserProfileResponse(
            user_id=p["id"],
            email=p.get("email"),
            role=p.get("role", "approved"),
            created_at=p.get("created_at"),
            month_spent_usd=spend.get(p["id"], {}).get("spent_usd", 0.0),
            month_requests=spend.get(p["id"], {}).get("requests", 0),
        )
        for p in (result.data or [])
    ]
    return AdminUserListResponse(users=users)


@router.post("/auth/set-role/{user_id}")
async def set_role(
    user_id: str,
    payload: SetRolePayload,
    admin: AuthenticatedUser = Depends(require_admin),
) -> dict:
    """Admin: change a user's role. The only meaningful distinction now is admin
    vs. everyone else (admins see this dashboard); regular roles are equivalent."""
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {sorted(VALID_ROLES)}.")
    if user_id == admin.user_id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot change your own role.")

    supabase = get_supabase_client()
    result = supabase.table("profiles").update({"role": payload.role}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": f"role for {user_id} set to {payload.role}."}


@router.get("/auth/usage-summary", response_model=UsageSummaryResponse, dependencies=[Depends(require_admin)])
async def usage_summary() -> UsageSummaryResponse:
    """Admin: global monthly budget status + active per-user safeguards."""
    supabase = get_supabase_client()
    rows = (supabase.table("profiles").select("id, role").execute()).data or []

    by_role: Dict[str, int] = {}
    for r in rows:
        role = r.get("role", "user")
        by_role[role] = by_role.get(role, 0) + 1

    status = budget.budget_status()
    return UsageSummaryResponse(
        total_users=len(rows),
        by_role=by_role,
        month_spent_usd=status["month_spent_usd"],
        monthly_budget_usd=status["monthly_budget_usd"],
        month_remaining_usd=status["month_remaining_usd"],
        month_requests=status["month_requests"],
        user_daily_budget_usd=settings.user_daily_budget_usd,
        rate_limit_per_minute=settings.rate_limit_per_minute,
    )
