"""
Unit test for token_budget enforcement: a user who has already consumed their
full budget must be rejected before any query/ingestion work happens.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.auth import AuthenticatedUser, require_approved

client = TestClient(app)


def _over_budget_user():
    return AuthenticatedUser(
        user_id="u1", email="x@y.com", role="approved",
        token_budget=50000, tokens_consumed=50000,
    )


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_query_rejected_when_over_budget():
    app.dependency_overrides[require_approved] = _over_budget_user

    resp = client.post("/api/query", json={"ticker": "AAPL", "question": "What is the stock price?"})

    assert resp.status_code == 403
    assert "budget" in resp.json()["detail"].lower()
