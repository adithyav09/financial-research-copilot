"""
Unit tests for the slimmed admin auth routes after per-user budgets + access
approval were removed. Admin now sees: the user list (with this-month spend) and
the global monthly budget status. Approve/deny, grant-tokens, pending-requests,
and request-access no longer exist.
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core import budget
from app.core.auth import AuthenticatedUser, get_current_user, require_admin
from app.main import app

client = TestClient(app)


def _admin():
    return AuthenticatedUser(user_id="admin-1", email="admin@x.com", role="admin")


def _regular():
    return AuthenticatedUser(user_id="u2", email="x@y.com", role="approved")


@pytest.fixture(autouse=True)
def _clear():
    yield
    app.dependency_overrides.clear()


def test_list_users_requires_admin(monkeypatch):
    app.dependency_overrides[require_admin] = _admin
    m = MagicMock()
    m.table.return_value.select.return_value.order.return_value.execute.return_value.data = [
        {"id": "u1", "email": "a@b.com", "role": "approved", "created_at": "2026-01-01"}
    ]
    monkeypatch.setattr("app.api.routes.auth.get_supabase_client", lambda: m)
    monkeypatch.setattr(budget, "user_month_spend", lambda: {"u1": {"spent_usd": 0.42, "requests": 3}})

    resp = client.get("/api/auth/users")

    assert resp.status_code == 200
    u = resp.json()["users"][0]
    assert u["email"] == "a@b.com"
    assert u["month_spent_usd"] == 0.42 and u["month_requests"] == 3


def test_usage_summary_reports_global_budget(monkeypatch):
    app.dependency_overrides[require_admin] = _admin
    m = MagicMock()
    m.table.return_value.select.return_value.execute.return_value.data = [
        {"id": "u1", "role": "approved"}, {"id": "u2", "role": "admin"},
    ]
    monkeypatch.setattr("app.api.routes.auth.get_supabase_client", lambda: m)
    monkeypatch.setattr(budget, "budget_status", lambda: {
        "month_start": "2026-09-01", "month_spent_usd": 3.5,
        "monthly_budget_usd": 20.0, "month_remaining_usd": 16.5, "month_requests": 12,
    })

    resp = client.get("/api/auth/usage-summary")

    body = resp.json()
    assert body["month_spent_usd"] == 3.5
    assert body["monthly_budget_usd"] == 20.0
    assert body["month_remaining_usd"] == 16.5
    assert body["total_users"] == 2
    assert body["by_role"] == {"approved": 1, "admin": 1}


def test_non_admin_rejected_on_admin_routes():
    app.dependency_overrides[get_current_user] = _regular

    assert client.get("/api/auth/users").status_code == 403
    assert client.get("/api/auth/usage-summary").status_code == 403
    assert client.post("/api/auth/set-role/u1", json={"role": "admin"}).status_code == 403


def test_set_role_updates_to_valid_role(monkeypatch):
    app.dependency_overrides[require_admin] = _admin
    m = MagicMock()
    m.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"id": "u1", "role": "admin"}
    ]
    monkeypatch.setattr("app.api.routes.auth.get_supabase_client", lambda: m)

    resp = client.post("/api/auth/set-role/u1", json={"role": "admin"})

    assert resp.status_code == 200


def test_set_role_rejects_invalid_role():
    app.dependency_overrides[require_admin] = _admin
    resp = client.post("/api/auth/set-role/u1", json={"role": "superuser"})
    assert resp.status_code == 400


def test_set_role_rejects_self_demotion():
    app.dependency_overrides[require_admin] = _admin
    resp = client.post("/api/auth/set-role/admin-1", json={"role": "approved"})
    assert resp.status_code == 400


def test_removed_routes_are_gone():
    # Approve/deny, grant-tokens, pending-requests, request-access were removed.
    app.dependency_overrides[get_current_user] = _admin
    app.dependency_overrides[require_admin] = _admin
    assert client.post("/api/auth/approve/u1", json={"action": "approved"}).status_code == 404
    assert client.post("/api/auth/grant-tokens/u1", json={"token_budget": 1000}).status_code == 404
    assert client.get("/api/auth/pending-requests").status_code == 404
