"""
Unit tests for the ingestion-status routes after the access-flow + user-isolation
fix. Status must (1) be gated by the same access dependency as /query and /ingest,
and (2) be scoped to the requesting user's own ingestion_jobs — never report
another user's ingestion as the caller's.
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.auth import AuthenticatedUser, require_approved
from app.main import app

client = TestClient(app)


def _approved_user():
    return AuthenticatedUser(user_id="u2", email="x@y.com", role="approved")


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _no_sec_network(monkeypatch):
    """Stop the staleness check from hitting SEC EDGAR during tests."""
    async def _fake_year(_ticker):
        return None
    monkeypatch.setattr("app.api.routes.status._fetch_latest_sec_year", _fake_year)


def _user_id_scoped(mock: MagicMock) -> bool:
    """True if any Supabase call filtered by ('user_id', 'u2')."""
    return any(getattr(c, "args", ()) == ("user_id", "u2") for c in mock.mock_calls)


# --------------------------------------------------------------------------- #
# Disconnected access flow → status is now gated
# --------------------------------------------------------------------------- #

def test_status_by_ticker_requires_auth():
    # No token / no dependency override → HTTPBearer rejects before the handler.
    resp = client.get("/api/status/AAPL")
    assert resp.status_code in (401, 403)


def test_status_list_requires_auth():
    resp = client.get("/api/status")
    assert resp.status_code in (401, 403)


# --------------------------------------------------------------------------- #
# False user isolation → status is scoped to the caller's user_id
# --------------------------------------------------------------------------- #

def test_status_by_ticker_scoped_to_current_user(monkeypatch):
    app.dependency_overrides[require_approved] = _approved_user
    mock = MagicMock()
    (
        mock.table.return_value.select.return_value
        .eq.return_value.eq.return_value
        .order.return_value.limit.return_value
        .execute.return_value.data
    ) = [{
        "ticker": "AAPL", "status": "ready", "filing_type": "10-K",
        "filing_date": "2024-11-01", "filing_year": 2024,
        "chunk_count": 12, "created_at": "2024-11-01T00:00:00Z",
    }]
    monkeypatch.setattr("app.api.routes.status.get_supabase_client", lambda: mock)

    resp = client.get("/api/status/AAPL")

    assert resp.status_code == 200
    assert resp.json()["ticker"] == "AAPL"
    assert _user_id_scoped(mock), "ingestion_jobs query must filter by the caller's user_id"


def test_status_by_ticker_404_when_user_has_no_ingestion(monkeypatch):
    # Another user may have ingested AAPL, but this user hasn't — the scoped
    # query returns nothing, so the caller gets 404 (and the client will ingest).
    app.dependency_overrides[require_approved] = _approved_user
    mock = MagicMock()
    (
        mock.table.return_value.select.return_value
        .eq.return_value.eq.return_value
        .order.return_value.limit.return_value
        .execute.return_value.data
    ) = []
    monkeypatch.setattr("app.api.routes.status.get_supabase_client", lambda: mock)

    resp = client.get("/api/status/AAPL")

    assert resp.status_code == 404
    assert _user_id_scoped(mock)


def test_status_list_scoped_to_current_user(monkeypatch):
    app.dependency_overrides[require_approved] = _approved_user
    mock = MagicMock()
    (
        mock.table.return_value.select.return_value
        .eq.return_value.order.return_value
        .execute.return_value.data
    ) = [{
        "ticker": "MSFT", "status": "ready", "filing_type": "10-K",
        "filing_year": 2024, "chunk_count": 8,
    }]
    monkeypatch.setattr("app.api.routes.status.get_supabase_client", lambda: mock)

    resp = client.get("/api/status")

    assert resp.status_code == 200
    assert resp.json()[0]["ticker"] == "MSFT"
    assert _user_id_scoped(mock)
