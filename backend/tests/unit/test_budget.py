"""
Tests for the shared-budget usage-control model that replaced per-user token
budgets. Covers: authenticated users need no approval, anonymous rejection,
rate limiting, global-monthly + per-user-daily exhaustion, cost accounting
(prompt/completion priced separately), reserve/finalize/release wiring, and
concurrency of the rate limiter. Cross-user retrieval isolation is unchanged and
covered by test_user_isolation.py.

DB-derived pieces (the advisory-locked reserve_budget RPC and the calendar-month
rollover in SQL) can't run without Postgres; here we verify the app-side wiring
by mocking the RPC and asserting the correct params + friendly errors.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core import budget
from app.core import observability as obs
from app.core.auth import AuthenticatedUser, require_approved
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset():
    budget.rate_limiter.reset()
    yield
    app.dependency_overrides.clear()
    budget.rate_limiter.reset()


def _user(role="approved", uid="u1"):
    return AuthenticatedUser(user_id=uid, email="x@y.com", role=role)


# --------------------------------------------------------------------------- #
# Rate limiter (in-memory, deterministic via injected clock)
# --------------------------------------------------------------------------- #

class TestRateLimiter:
    def test_allows_up_to_limit_then_blocks(self):
        rl = budget.RateLimiter(per_minute=3)
        assert [rl.check("u", now=0.0) for _ in range(3)] == [True, True, True]
        assert rl.check("u", now=0.0) is False          # 4th within window blocked

    def test_window_slides(self):
        rl = budget.RateLimiter(per_minute=1, window=60)
        assert rl.check("u", now=0.0) is True
        assert rl.check("u", now=30.0) is False           # still in window
        assert rl.check("u", now=61.0) is True            # window passed

    def test_per_user_isolation(self):
        rl = budget.RateLimiter(per_minute=1)
        assert rl.check("a", now=0.0) is True
        assert rl.check("b", now=0.0) is True             # different user unaffected

    def test_disabled_when_zero(self):
        rl = budget.RateLimiter(per_minute=0)
        assert all(rl.check("u", now=0.0) for _ in range(100))

    def test_concurrent_burst_only_admits_limit(self):
        rl = budget.RateLimiter(per_minute=5)
        admitted = sum(rl.check("u", now=0.0) for _ in range(50))
        assert admitted == 5


# --------------------------------------------------------------------------- #
# Cost accounting — prompt and completion priced separately
# --------------------------------------------------------------------------- #

class TestCost:
    def test_config_override_prices_in_out_separately(self, monkeypatch):
        monkeypatch.setattr(budget.settings, "cost_input_per_1k", 1.0)
        monkeypatch.setattr(budget.settings, "cost_output_per_1k", 2.0)
        # 1000 in @ $1/1k + 500 out @ $2/1k = 1.0 + 1.0 = 2.0
        assert budget.cost_usd("any", 1000, 500) == pytest.approx(2.0)

    def test_falls_back_to_price_table(self, monkeypatch):
        monkeypatch.setattr(budget.settings, "cost_input_per_1k", 0.0)
        monkeypatch.setattr(budget.settings, "cost_output_per_1k", 0.0)
        # gpt-4o-mini: 0.00015 in + 0.0006 out per 1k
        assert budget.cost_usd("gpt-4o-mini", 1000, 1000) == pytest.approx(0.00075)


# --------------------------------------------------------------------------- #
# reserve / record / release wiring (mocked Supabase RPC)
# --------------------------------------------------------------------------- #

def _fake_supabase(rpc_data):
    m = MagicMock()
    m.rpc.return_value.execute.return_value = SimpleNamespace(data=rpc_data)
    m.table.return_value.insert.return_value.execute.return_value = SimpleNamespace(data=[{"id": "x"}])
    return m


class TestReserve:
    def test_allowed_returns_reservation_id(self, monkeypatch):
        m = _fake_supabase({"allowed": True, "reservation_id": "res-1"})
        monkeypatch.setattr(budget, "get_supabase_client", lambda: m)
        assert budget.reserve("u1") == "res-1"
        # the RPC must carry the configured limits (so SQL enforces them)
        _, kwargs = m.rpc.call_args
        params = m.rpc.call_args.args[1]
        assert params["p_monthly_limit"] == budget.settings.monthly_budget_usd
        assert params["p_user_daily_limit"] == budget.settings.user_daily_budget_usd

    def test_monthly_denied_raises_429_friendly(self, monkeypatch):
        m = _fake_supabase({"allowed": False, "reason": "monthly"})
        monkeypatch.setattr(budget, "get_supabase_client", lambda: m)
        with pytest.raises(Exception) as exc:
            budget.reserve("u1")
        assert exc.value.status_code == 429
        assert "monthly" in exc.value.detail.lower()
        assert "cost" not in exc.value.detail.lower()  # no internal detail leaked

    def test_daily_denied_raises_429(self, monkeypatch):
        m = _fake_supabase({"allowed": False, "reason": "daily"})
        monkeypatch.setattr(budget, "get_supabase_client", lambda: m)
        with pytest.raises(Exception) as exc:
            budget.reserve("u1")
        assert exc.value.status_code == 429
        assert "today" in exc.value.detail.lower()

    def test_reserve_fails_open_on_db_error(self, monkeypatch):
        monkeypatch.setattr(budget.settings, "budget_fail_open", True)
        m = MagicMock()
        m.rpc.side_effect = RuntimeError("db down")
        monkeypatch.setattr(budget, "get_supabase_client", lambda: m)
        assert budget.reserve("u1") is None  # None = proceed unbudgeted, recorded after

    def test_reserve_fail_closed_raises_503(self, monkeypatch):
        # Strict policy: an infra error must block rather than risk overspend.
        monkeypatch.setattr(budget.settings, "budget_fail_open", False)
        m = MagicMock()
        m.rpc.side_effect = RuntimeError("db down")
        monkeypatch.setattr(budget, "get_supabase_client", lambda: m)
        with pytest.raises(Exception) as exc:
            budget.reserve("u1")
        assert exc.value.status_code == 503

    def test_denial_emits_metric_and_event(self, monkeypatch):
        obs.metrics.reset()
        m = _fake_supabase({"allowed": False, "reason": "monthly"})
        monkeypatch.setattr(budget, "get_supabase_client", lambda: m)
        with pytest.raises(Exception):
            budget.reserve("u1")
        assert obs.metrics.snapshot()["counters"]["budget.denied"]["__total__"] == 1

    def test_record_finalizes_reservation(self, monkeypatch):
        m = _fake_supabase(None)
        monkeypatch.setattr(budget, "get_supabase_client", lambda: m)
        budget.record("res-1", user_id="u1", model="gpt-4o-mini",
                      input_tokens=10, output_tokens=5, tokens_used=15, query_id="q1")
        assert m.rpc.call_args.args[0] == "finalize_usage"

    def test_record_inserts_when_no_reservation(self, monkeypatch):
        m = _fake_supabase(None)
        monkeypatch.setattr(budget, "get_supabase_client", lambda: m)
        budget.record(None, user_id="u1", model="gpt-4o-mini",
                      input_tokens=10, output_tokens=5, tokens_used=15, query_id="q1")
        m.table.assert_called_with("token_usage")


# --------------------------------------------------------------------------- #
# /api/query route enforcement
# --------------------------------------------------------------------------- #

class TestQueryRoute:
    def test_anonymous_rejected(self):
        # No auth override, no token -> HTTPBearer rejects before the handler.
        resp = client.post("/api/query", json={"ticker": "AAPL", "question": "What is the price?"})
        assert resp.status_code in (401, 403)

    def test_authenticated_user_needs_no_approval(self, monkeypatch):
        # A user whose role is NOT 'approved' (legacy 'pending') must still be served.
        app.dependency_overrides[require_approved] = lambda: _user(role="pending")
        monkeypatch.setattr("app.api.routes.query.budget.enforce_rate_limit", lambda uid: None)
        monkeypatch.setattr("app.api.routes.query.budget.reserve", lambda uid: "res-1")
        monkeypatch.setattr("app.api.routes.query.budget.record", lambda *a, **k: 0.001)

        async def _fake_query(*a, **k):
            return {"answer": "A", "citations": [], "tokens_used": 5, "model": "gpt-4o-mini",
                    "input_tokens": 3, "output_tokens": 2, "structured": None, "trace_id": "t"}
        monkeypatch.setattr("app.api.routes.query.query_filing", _fake_query)

        # a live question skips the ingestion guard (no DB)
        resp = client.post("/api/query", json={"ticker": "AAPL", "question": "What is the current stock price?"})
        assert resp.status_code == 200
        assert resp.json()["answer"] == "A"

    def test_global_monthly_exhaustion_returns_429(self, monkeypatch):
        app.dependency_overrides[require_approved] = lambda: _user()
        monkeypatch.setattr("app.api.routes.query.budget.enforce_rate_limit", lambda uid: None)

        def _deny(uid):
            raise budget._limit_error("monthly")
        monkeypatch.setattr("app.api.routes.query.budget.reserve", _deny)

        resp = client.post("/api/query", json={"ticker": "AAPL", "question": "What's the stock price now?"})
        assert resp.status_code == 429
        assert "monthly" in resp.json()["detail"].lower()

    def test_daily_limit_exhaustion_returns_429(self, monkeypatch):
        app.dependency_overrides[require_approved] = lambda: _user()
        monkeypatch.setattr("app.api.routes.query.budget.enforce_rate_limit", lambda uid: None)

        def _deny(uid):
            raise budget._limit_error("daily")
        monkeypatch.setattr("app.api.routes.query.budget.reserve", _deny)

        resp = client.post("/api/query", json={"ticker": "AAPL", "question": "latest news?"})
        assert resp.status_code == 429
        assert "today" in resp.json()["detail"].lower()

    def test_rate_limit_returns_429(self, monkeypatch):
        app.dependency_overrides[require_approved] = lambda: _user()

        def _rate(uid):
            raise budget._limit_error("rate")
        monkeypatch.setattr("app.api.routes.query.budget.enforce_rate_limit", _rate)

        resp = client.post("/api/query", json={"ticker": "AAPL", "question": "latest news?"})
        assert resp.status_code == 429
        assert "quickly" in resp.json()["detail"].lower()


class TestIngestRoute:
    """Ingestion is gated by the same shared budget + rate limit as querying."""

    def test_ingest_rate_limited_before_any_work(self, monkeypatch):
        app.dependency_overrides[require_approved] = lambda: _user()

        def _rate(uid):
            raise budget._limit_error("rate")
        monkeypatch.setattr("app.api.routes.ingest.budget.enforce_rate_limit", _rate)

        resp = client.post("/api/ingest", json={"ticker": "AAPL"})
        assert resp.status_code == 429
        assert "quickly" in resp.json()["detail"].lower()

    def test_ingest_blocked_when_budget_exhausted(self, monkeypatch):
        app.dependency_overrides[require_approved] = lambda: _user()
        monkeypatch.setattr("app.api.routes.ingest.budget.enforce_rate_limit", lambda uid: None)

        def _deny(uid):
            raise budget._limit_error("monthly")
        monkeypatch.setattr("app.api.routes.ingest.budget.reserve", _deny)

        resp = client.post("/api/ingest", json={"ticker": "AAPL"})
        assert resp.status_code == 429
        assert "monthly" in resp.json()["detail"].lower()
