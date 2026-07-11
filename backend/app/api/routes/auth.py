"""
Auth routes: user profile, access requests, and admin approval.
OAuth sign-in itself is handled client-side by the Supabase JS SDK —
these endpoints manage the post-auth profile and access request flow.
"""

from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthenticatedUser, get_current_user, require_admin
from app.core.config import settings
from app.core.database import get_supabase_client
from app.models.schemas import (
    AccessRequestPayload,
    AdminApprovePayload,
    AdminUserListResponse,
    GrantTokensPayload,
    UsageSummaryResponse,
    UserProfileResponse,
)

router = APIRouter()


def _validate_token_budget(token_budget: int) -> None:
    """Admins can never set a user's token_budget above the configured cap."""
    if token_budget > settings.max_token_budget_grant:
        raise HTTPException(
            status_code=400,
            detail=f"token_budget cannot exceed max_token_budget_grant ({settings.max_token_budget_grant}).",
        )


@router.get("/auth/me", response_model=UserProfileResponse)
async def get_me(user: AuthenticatedUser = Depends(get_current_user)) -> UserProfileResponse:
    """
    Return the current user's profile, including role and token usage.
    Used by the frontend to determine what UI to show after sign-in.
    """
    supabase = get_supabase_client()
    result = (
        supabase.table("profiles")
        .select("id, email, role, token_budget, tokens_consumed, created_at")
        .eq("id", user.user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
    p = result.data
    return UserProfileResponse(
        user_id=p["id"],
        email=p["email"],
        role=p["role"],
        token_budget=p.get("token_budget", 50000),
        tokens_consumed=p.get("tokens_consumed", 0),
        created_at=p.get("created_at"),
    )


@router.post("/auth/request-access", status_code=status.HTTP_201_CREATED)
async def request_access(
    payload: AccessRequestPayload,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """
    Submit an access request for a pending user.
    Idempotent — silently succeeds if a request already exists.
    """
    supabase = get_supabase_client()

    # Check for existing request to keep this idempotent
    existing = (
        supabase.table("access_requests")
        .select("id, status")
        .eq("user_id", user.user_id)
        .execute()
    )
    if existing.data:
        return {"message": "Access request already submitted.", "status": existing.data[0]["status"]}

    supabase.table("access_requests").insert({
        "user_id": user.user_id,
        "email": user.email,
        "use_case": payload.use_case,
        "investor_type": payload.investor_type,
        "status": "pending",
    }).execute()

    return {"message": "Access request submitted. You will be notified when approved."}


@router.post("/auth/approve/{user_id}", dependencies=[Depends(require_admin)])
async def approve_user(
    user_id: str,
    payload: AdminApprovePayload,
) -> dict:
    """
    Admin: approve or deny a user. Updates both profiles and access_requests tables.

    Args:
        user_id: UUID of the user to approve/deny
        payload: Contains action ("approved" | "denied") and optional token_budget
    """
    if payload.action not in ("approved", "denied"):
        raise HTTPException(status_code=400, detail="action must be 'approved' or 'denied'.")

    supabase = get_supabase_client()

    profile_update: dict = {"role": payload.action}
    if payload.action == "approved" and payload.token_budget is not None:
        _validate_token_budget(payload.token_budget)
        profile_update["token_budget"] = payload.token_budget

    supabase.table("profiles").update(profile_update).eq("id", user_id).execute()
    supabase.table("access_requests").update({"status": payload.action}).eq("user_id", user_id).execute()

    return {"message": f"User {user_id} has been {payload.action}."}


@router.get("/auth/pending-requests", dependencies=[Depends(require_admin)])
async def list_pending_requests() -> dict:
    """
    Admin: list all pending access requests with user emails.
    """
    supabase = get_supabase_client()
    result = (
        supabase.table("access_requests")
        .select("id, user_id, email, use_case, investor_type, status, created_at")
        .eq("status", "pending")
        .order("created_at", desc=False)
        .execute()
    )
    return {"requests": result.data or []}


@router.get("/auth/users", response_model=AdminUserListResponse, dependencies=[Depends(require_admin)])
async def list_users() -> AdminUserListResponse:
    """
    Admin: list every user profile with role and token usage.
    """
    supabase = get_supabase_client()
    result = (
        supabase.table("profiles")
        .select("id, email, role, token_budget, tokens_consumed, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    users = [
        UserProfileResponse(
            user_id=p["id"],
            email=p.get("email"),
            role=p["role"],
            token_budget=p.get("token_budget", 50000),
            tokens_consumed=p.get("tokens_consumed", 0),
            created_at=p.get("created_at"),
        )
        for p in (result.data or [])
    ]
    return AdminUserListResponse(users=users)


@router.post("/auth/grant-tokens/{user_id}", dependencies=[Depends(require_admin)])
async def grant_tokens(user_id: str, payload: GrantTokensPayload) -> dict:
    """
    Admin: set a user's token_budget, subject to the max_token_budget_grant cap.
    """
    _validate_token_budget(payload.token_budget)
    supabase = get_supabase_client()
    result = (
        supabase.table("profiles")
        .update({"token_budget": payload.token_budget})
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": f"token_budget for {user_id} set to {payload.token_budget}."}


@router.get("/auth/usage-summary", response_model=UsageSummaryResponse, dependencies=[Depends(require_admin)])
async def usage_summary() -> UsageSummaryResponse:
    """
    Admin: aggregate token usage across all users, from our own tracked totals
    (not the OpenAI usage API — profiles.tokens_consumed is what we bill against).
    """
    supabase = get_supabase_client()
    result = supabase.table("profiles").select("role, token_budget, tokens_consumed").execute()
    rows = result.data or []

    by_role: Dict[str, int] = {}
    total_consumed = 0
    total_budget = 0
    for r in rows:
        role = r.get("role", "unknown")
        by_role[role] = by_role.get(role, 0) + 1
        total_consumed += r.get("tokens_consumed", 0) or 0
        total_budget += r.get("token_budget", 0) or 0

    return UsageSummaryResponse(
        total_users=len(rows),
        total_tokens_consumed=total_consumed,
        total_token_budget=total_budget,
        by_role=by_role,
        max_token_budget_grant=settings.max_token_budget_grant,
    )
