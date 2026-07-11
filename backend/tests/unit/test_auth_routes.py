"""
Unit tests for admin auth routes: listing users, granting tokens, usage summary,
and the max_token_budget_grant cap enforced on both approve() and grant-tokens().
"""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.auth import AuthenticatedUser, require_admin, get_current_user

client = TestClient(app)


def _admin_user():
    return AuthenticatedUser(user_id="admin-1", email="admin@x.com", role="admin")


def _approved_user():
    return AuthenticatedUser(user_id="u2", email="x@y.com", role="approved")


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_list_users_requires_admin(monkeypatch):
    app.dependency_overrides[require_admin] = _admin_user
    mock = MagicMock()
    mock.table.return_value.select.return_value.order.return_value.execute.return_value.data = [
        {
            "id": "u1",
            "email": "a@b.com",
            "role": "approved",
            "token_budget": 50000,
            "tokens_consumed": 100,
            "created_at": "2026-01-01",
        }
    ]
    monkeypatch.setattr("app.api.routes.auth.get_supabase_client", lambda: mock)

    resp = client.get("/api/auth/users")

    assert resp.status_code == 200
    assert resp.json()["users"][0]["email"] == "a@b.com"


def test_grant_tokens_rejects_over_cap(monkeypatch):
    app.dependency_overrides[require_admin] = _admin_user
    monkeypatch.setattr("app.api.routes.auth.settings.max_token_budget_grant", 100000)

    resp = client.post("/api/auth/grant-tokens/u1", json={"token_budget": 999999})

    assert resp.status_code == 400


def test_grant_tokens_updates_within_cap(monkeypatch):
    app.dependency_overrides[require_admin] = _admin_user
    monkeypatch.setattr("app.api.routes.auth.settings.max_token_budget_grant", 200000)
    mock = MagicMock()
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"id": "u1", "token_budget": 75000}
    ]
    monkeypatch.setattr("app.api.routes.auth.get_supabase_client", lambda: mock)

    resp = client.post("/api/auth/grant-tokens/u1", json={"token_budget": 75000})

    assert resp.status_code == 200


def test_approve_rejects_token_budget_over_cap(monkeypatch):
    app.dependency_overrides[require_admin] = _admin_user
    monkeypatch.setattr("app.api.routes.auth.settings.max_token_budget_grant", 100000)

    resp = client.post("/api/auth/approve/u1", json={"action": "approved", "token_budget": 999999})

    assert resp.status_code == 400


def test_usage_summary_aggregates(monkeypatch):
    app.dependency_overrides[require_admin] = _admin_user
    mock = MagicMock()
    mock.table.return_value.select.return_value.execute.return_value.data = [
        {"role": "approved", "token_budget": 50000, "tokens_consumed": 1000},
        {"role": "admin", "token_budget": 100000, "tokens_consumed": 500},
    ]
    monkeypatch.setattr("app.api.routes.auth.get_supabase_client", lambda: mock)

    resp = client.get("/api/auth/usage-summary")

    body = resp.json()
    assert body["total_tokens_consumed"] == 1500
    assert body["total_token_budget"] == 150000
    assert body["by_role"] == {"approved": 1, "admin": 1}


def test_non_admin_rejected_on_admin_routes():
    app.dependency_overrides[get_current_user] = _approved_user

    assert client.get("/api/auth/users").status_code == 403
    assert client.get("/api/auth/usage-summary").status_code == 403
    assert client.post("/api/auth/grant-tokens/u1", json={"token_budget": 1000}).status_code == 403
    assert client.post("/api/auth/set-role/u1", json={"role": "admin"}).status_code == 403


def test_set_role_updates_to_valid_role(monkeypatch):
    app.dependency_overrides[require_admin] = _admin_user
    mock = MagicMock()
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"id": "u1", "role": "admin"}
    ]
    monkeypatch.setattr("app.api.routes.auth.get_supabase_client", lambda: mock)

    resp = client.post("/api/auth/set-role/u1", json={"role": "admin"})

    assert resp.status_code == 200


def test_set_role_rejects_invalid_role():
    app.dependency_overrides[require_admin] = _admin_user

    resp = client.post("/api/auth/set-role/u1", json={"role": "superuser"})

    assert resp.status_code == 400


def test_set_role_rejects_self_demotion():
    app.dependency_overrides[require_admin] = _admin_user

    resp = client.post("/api/auth/set-role/admin-1", json={"role": "approved"})

    assert resp.status_code == 400
