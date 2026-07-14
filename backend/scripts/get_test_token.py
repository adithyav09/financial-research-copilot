"""
Dev helper: mint a Supabase access token for a dedicated email/password test user,
so backend endpoints can be tested without the GitHub OAuth frontend flow.

Usage (from backend/, venv active):
    python scripts/get_test_token.py

It idempotently creates the test user (via the admin API + service key), then
signs in via password grant and prints the access_token. Paste that token into
Swagger's Authorize button, or use it directly:

    TOKEN=$(python scripts/get_test_token.py)
    curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/auth/me

Override the test identity with env vars TEST_EMAIL / TEST_PASSWORD if you like.
"""

import os
import sys

import httpx

from app.core.config import settings

supabase_url = os.getenv("SUPABASE_URL", settings.supabase_url)
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY", settings.supabase_service_key)

EMAIL = os.getenv("TEST_EMAIL", "devtest@example.com")
PASSWORD = os.getenv("TEST_PASSWORD", "devtest-password-123")


def _fail(msg: str) -> None:
    print(msg, file=sys.stderr)
    sys.exit(1)


def ensure_user() -> None:
    """Create the test user if it doesn't already exist. email_confirm=True so
    no confirmation email is required. A 422 'already registered' is fine."""
    try:
        request = httpx.post(
            f"{supabase_url}/auth/v1/admin/users",
            headers={
                "apikey": supabase_service_key,
                "Authorization": f"Bearer {supabase_service_key}",
                "Content-Type": "application/json",
            },
            json={"email": EMAIL, "password": PASSWORD, "email_confirm": True},
            timeout=10.0,
        )
        if request.status_code in (200, 201):
            print(f"# created test user {EMAIL}", file=sys.stderr)
        elif request.status_code in (409, 422):
            print(f"# test user {EMAIL} already exists", file=sys.stderr)
        else:
            _fail(f"admin create user failed [{request.status_code}]: {request.text}")
    except httpx.TimeoutException as e:
        _fail(f"admin create user timed out: {e}")
    except httpx.HTTPStatusError as e:
        _fail(f"admin create user failed with status code {e.response.status_code}: {e.response.text}")
    except httpx.HTTPError as e:
        _fail(f"admin create user failed: {e}")


def get_token() -> str:
    request = httpx.post(
        f"{settings.supabase_url}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": settings.supabase_anon_key, "Content-Type": "application/json"},
        json={"email": EMAIL, "password": PASSWORD},
        timeout=10.0,
    )
    if request.status_code != 200:
        _fail(f"password grant failed [{request.status_code}]: {request.text}")
    return request.json()["access_token"]


if __name__ == "__main__":
    if not settings.supabase_url or not settings.supabase_service_key:
        _fail("SUPABASE_URL / SUPABASE_SERVICE_KEY not set in backend/.env")
    ensure_user()
    print(get_token())