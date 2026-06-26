"""
Auth core: Supabase JWT verification and FastAPI dependency helpers.

Supabase issues HS256 JWTs signed with the project JWT secret.
We verify locally — no round-trip to Supabase on every request.
The user's role is stored in the profiles table and loaded once per request.
"""

from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.database import get_supabase_client

bearer_scheme = HTTPBearer(auto_error=True)


class AuthenticatedUser:
    """Represents a verified Supabase user with their profile role."""

    def __init__(self, user_id: str, email: str, role: str) -> None:
        self.user_id = user_id
        self.email = email
        self.role = role

    @property
    def is_approved(self) -> bool:
        return self.role in ("approved", "admin")

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _verify_jwt(token: str) -> dict:
    """
    Verify and decode a Supabase-issued JWT.

    Args:
        token: Raw Bearer token string

    Returns:
        Decoded JWT payload

    Raises:
        HTTPException 401 on any verification failure
    """
    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth is not configured on this server.",
        )
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _load_profile(user_id: str) -> dict:
    """
    Load the user's profile row from Supabase (service role bypasses RLS).

    Args:
        user_id: UUID from JWT sub claim

    Returns:
        Profile row dict

    Raises:
        HTTPException 401 if profile does not exist
    """
    supabase = get_supabase_client()
    result = (
        supabase.table("profiles")
        .select("id, email, role, token_budget, tokens_consumed")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found. Please sign in again.",
        )
    return result.data


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency: verify JWT and return the authenticated user.
    Raises 401 if the token is missing, expired, or invalid.
    """
    payload = _verify_jwt(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim.",
        )
    profile = _load_profile(user_id)
    return AuthenticatedUser(
        user_id=user_id,
        email=profile.get("email", ""),
        role=profile.get("role", "pending"),
    )


async def require_approved(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """
    FastAPI dependency: require approved or admin role.
    Raises 403 if the user's role is pending or denied.
    """
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval. Please wait for an admin to grant access.",
        )
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
