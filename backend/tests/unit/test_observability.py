"""
Tests for the observability foundation: trace propagation, stage timing,
failure logging, and redaction of secrets/keys/auth/prompt content.
"""
import time

import pytest
from fastapi.testclient import TestClient

from app.core import observability as obs
from app.main import TRACE_HEADER, app


@pytest.fixture
def sink():
    """Capture every emitted event dict via a temporary observability sink."""
    events: list[dict] = []
    obs._sinks.append(events.append)
    try:
        yield events
    finally:
        obs._sinks.remove(events.append)


@pytest.fixture(autouse=True)
def _reset_trace():
    yield
    obs.reset_trace()


# --------------------------------------------------------------------------- #
# Trace id creation + propagation
# --------------------------------------------------------------------------- #

class TestTracePropagation:
    def test_middleware_mints_trace_id_and_returns_header(self):
        client = TestClient(app)
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.headers.get(TRACE_HEADER)  # a fresh id was assigned + echoed

    def test_inbound_trace_id_is_propagated_back(self):
        client = TestClient(app)
        incoming = "abc123deadbeef"
        resp = client.get("/api/health", headers={TRACE_HEADER: incoming})
        # The caller-supplied id flows through unchanged so a client can correlate.
        assert resp.headers.get(TRACE_HEADER) == incoming

    def test_events_carry_the_active_trace_id(self, sink):
        obs.set_trace_id("trace-xyz")
        obs.log_event("unit_event", component="test")
        assert sink[-1]["trace_id"] == "trace-xyz"
        assert sink[-1]["event_name"] == "unit_event"
        assert sink[-1]["component"] == "test"

    def test_request_lifecycle_events_share_one_trace_id(self, sink):
        client = TestClient(app)
        client.get("/api/health")
        lifecycle = [e for e in sink if e["event_name"] in ("request_received", "request_completed")]
        assert {"request_received", "request_completed"} <= {e["event_name"] for e in lifecycle}
        trace_ids = {e["trace_id"] for e in lifecycle}
        assert len(trace_ids) == 1 and next(iter(trace_ids))  # same, non-null id


# --------------------------------------------------------------------------- #
# Stage timing
# --------------------------------------------------------------------------- #

class TestStageTiming:
    def test_completed_event_has_positive_duration(self, sink):
        with obs.stage("slow_stage", component="test"):
            time.sleep(0.01)
        completed = [e for e in sink if e["event_name"] == "slow_stage_completed"]
        assert completed and completed[-1]["success"] is True
        assert completed[-1]["duration_ms"] >= 10

    def test_started_and_completed_both_emitted(self, sink):
        with obs.stage("s", component="test"):
            pass
        names = [e["event_name"] for e in sink]
        assert "s_started" in names and "s_completed" in names

    def test_mutated_fields_land_on_completed(self, sink):
        with obs.stage("retrieval", component="retrieval") as st:
            st["retrieved_chunk_count"] = 7
        completed = [e for e in sink if e["event_name"] == "retrieval_completed"][-1]
        assert completed["retrieved_chunk_count"] == 7

    def test_latency_recorded_in_histogram(self):
        obs.metrics.reset()
        with obs.stage("timed", component="test"):
            pass
        hist = obs.metrics.histogram(obs.M_STAGE_LATENCY).collect()
        assert hist["count"] >= 1


# --------------------------------------------------------------------------- #
# Failure logging
# --------------------------------------------------------------------------- #

class TestFailureLogging:
    def test_stage_logs_failure_and_reraises(self, sink):
        with pytest.raises(ValueError):
            with obs.stage("boom", component="test"):
                raise ValueError("kaboom")
        failed = [e for e in sink if e["event_name"] == "boom_failed"]
        assert failed, "expected a *_failed event"
        ev = failed[-1]
        assert ev["success"] is False
        assert ev["error_type"] == "ValueError"
        assert ev["level"] == "ERROR"

    def test_no_completed_event_on_failure(self, sink):
        with pytest.raises(RuntimeError):
            with obs.stage("x", component="test"):
                raise RuntimeError()
        names = [e["event_name"] for e in sink]
        assert "x_completed" not in names


# --------------------------------------------------------------------------- #
# Redaction
# --------------------------------------------------------------------------- #

class TestRedaction:
    def test_sensitive_keys_are_dropped(self):
        out = obs.redact({
            "authorization": "Bearer supersecret",
            "openai_api_key": "sk-abc123",
            "supabase_service_key": "svc-key",
            "password": "hunter2",
            "ticker": "AAPL",
        })
        assert out["authorization"] == obs.REDACTED
        assert out["openai_api_key"] == obs.REDACTED
        assert out["supabase_service_key"] == obs.REDACTED
        assert out["password"] == obs.REDACTED
        assert out["ticker"] == "AAPL"  # non-sensitive preserved

    def test_token_count_fields_are_allowlisted(self):
        out = obs.redact({"tokens_used": 1234, "input_tokens": 10, "output_tokens": 5})
        assert out == {"tokens_used": 1234, "input_tokens": 10, "output_tokens": 5}

    def test_secret_patterns_scrubbed_from_free_text(self):
        text = "call failed with key sk-ABCDEFGHIJKLMNOP1234 and header Bearer eyJhbGciOiJIUzI1"
        out = obs._redact_str(text)
        assert "sk-ABCDEFGHIJKLMNOP1234" not in out
        assert "Bearer" not in out or obs.REDACTED in out
        assert obs.REDACTED in out

    def test_nested_structures_are_redacted(self):
        out = obs.redact({"headers": {"Authorization": "Bearer x"}, "list": [{"api_key": "sk-zzz"}]})
        assert out["headers"]["Authorization"] == obs.REDACTED
        assert out["list"][0]["api_key"] == obs.REDACTED

    def test_emitted_event_is_redacted(self, sink):
        obs.log_event("with_secret", component="test", authorization="Bearer leak", ticker="MSFT")
        assert sink[-1]["authorization"] == obs.REDACTED
        assert sink[-1]["ticker"] == "MSFT"

    def test_redact_prompt_truncates_by_default(self, monkeypatch):
        monkeypatch.setattr(obs.settings, "redact_prompt_content", False)
        long = "x" * 500
        out = obs.redact_prompt(long, max_chars=100)
        assert out is not None and len(out) <= 101 and out.endswith("…")

    def test_redact_prompt_drops_when_configured(self, monkeypatch):
        monkeypatch.setattr(obs.settings, "redact_prompt_content", True)
        assert obs.redact_prompt("What was revenue?") == obs.REDACTED


# --------------------------------------------------------------------------- #
# Cost + metrics
# --------------------------------------------------------------------------- #

class TestCostAndMetrics:
    def test_cost_estimate_known_model(self):
        # gpt-4o-mini: 0.00015 in + 0.0006 out per 1K
        assert obs.estimate_cost_usd("gpt-4o-mini", 1000, 1000) == pytest.approx(0.00075)

    def test_cost_estimate_unknown_model_uses_default(self):
        assert obs.estimate_cost_usd("some-future-model", 1000, 0) == pytest.approx(0.0005)

    def test_record_model_usage_updates_counters(self):
        obs.metrics.reset()
        cost = obs.record_model_usage("gpt-4o-mini", 100, 50)
        snap = obs.metrics.snapshot()
        assert cost > 0
        assert snap["counters"][obs.M_TOKENS_IN]["__total__"] == 100
        assert snap["counters"][obs.M_TOKENS_OUT]["__total__"] == 50

    def test_metrics_endpoint_returns_snapshot(self):
        client = TestClient(app)
        resp = client.get("/api/metrics")
        assert resp.status_code == 200
        body = resp.json()
        assert "counters" in body and "histograms" in body
