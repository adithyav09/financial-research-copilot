"""
Auth core: Supabase token verification and FastAPI dependency helpers.

Verifies tokens against Supabase /auth/v1/user — no local JWT secret needed.
The user's role is stored in the profiles table and loaded once per request.
"""

from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.database import get_supabase_client

bearer_scheme = HTTPBearer(auto_error=True)


class AuthenticatedUser:
    """A verified Supabase user. Usage limits are now shared/app-wide (see
    app/core/budget.py), so the user object no longer carries a per-user budget —
    only identity and whether they are an admin."""

    def __init__(self, user_id: str, email: str, role: str) -> None:
        self.user_id = user_id
        self.email = email
        self.role = role

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


async def _verify_token_with_supabase(token: str) -> dict:
    """
    Verify a Supabase access token by calling /auth/v1/user.
    Returns the user dict from Supabase if valid.

    Args:
        token: Raw Bearer token string

    Raises:
        HTTPException 401 on any verification failure
    """
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth is not configured on this server.",
        )
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Authorization": f"Bearer {token}",
                },
            )
        if r.status_code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is invalid or expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if r.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not verify token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return r.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Auth verification failed: {str(e)}",
        )


def _get_or_create_profile(user_id: str, email: str) -> dict:
    """Load the user's profile row, creating it on first sight.

    Access approval was removed, so every authenticated user gets a usable profile
    immediately — no admin step. We never overwrite an existing row (so an admin's
    role is preserved); on a create race we just re-read. Service role bypasses RLS.
    """
    supabase = get_supabase_client()
    result = (
        supabase.table("profiles").select("id, email, role").eq("id", user_id).limit(1).execute()
    )
    if result.data:
        return result.data[0]
    try:
        created = (
            supabase.table("profiles")
            .insert({"id": user_id, "email": email, "role": "approved"})
            .execute()
        )
        if created.data:
            return created.data[0]
    except Exception:
        # A concurrent request or a DB signup trigger already created it — re-read.
        existing = (
            supabase.table("profiles").select("id, email, role").eq("id", user_id).limit(1).execute()
        )
        if existing.data:
            return existing.data[0]
    return {"id": user_id, "email": email, "role": "approved"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency: verify token via Supabase and return the authenticated user.
    Raises 401 if the token is missing, expired, or invalid.
    """
    supabase_user = await _verify_token_with_supabase(credentials.credentials)
    user_id: Optional[str] = supabase_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user id.",
        )
    email = supabase_user.get("email", "") or ""
    profile = _get_or_create_profile(user_id, email)
    return AuthenticatedUser(
        user_id=user_id,
        email=profile.get("email") or email,
        role=profile.get("role", "approved"),
    )


async def require_approved(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """
    FastAPI dependency for the core copilot routes.

    Access approval was removed: every *authenticated* user may use the copilot
    immediately. This is kept as a dependency alias (so the routes stay wired and
    still require a valid session) — it no longer gates on role. Usage is bounded
    by the shared budget + per-user daily/rate limits enforced at call time.
    """
    return user


async def require_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """
    FastAPI dependency: require admin role.
    Raises 403 for non-admins.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user
