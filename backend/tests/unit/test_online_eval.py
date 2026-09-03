"""Tests for the online evaluators (cheap, non-LLM per-request quality signals)."""
import pytest

from app.core import online_eval
from app.core import observability as obs


@pytest.fixture(autouse=True)
def _enabled(monkeypatch):
    monkeypatch.setattr(online_eval.settings, "online_eval_enabled", True)
    obs.metrics.reset()
    yield


def _eval(**kw):
    base = dict(is_live=False, retrieved_chunk_count=5, citation_count=3,
                structured_ok=True, answer="Revenue grew 6% [1].")
    base.update(kw)
    return online_eval.evaluate(**base)


class TestOnlineEval:
    def test_clean_answer_has_no_failed_checks(self):
        c = _eval()
        assert c["empty_retrieval"] is False
        assert c["no_citations"] is False
        assert c["structured_parse_failed"] is False
        assert c["possible_advice"] is False

    def test_empty_retrieval_flagged_on_filing(self):
        assert _eval(retrieved_chunk_count=0)["empty_retrieval"] is True

    def test_no_citations_flagged_on_filing(self):
        assert _eval(citation_count=0)["no_citations"] is True

    def test_live_path_exempt_from_retrieval_checks(self):
        c = _eval(is_live=True, retrieved_chunk_count=0, citation_count=0)
        assert c["empty_retrieval"] is False and c["no_citations"] is False

    def test_structured_parse_failure_flagged(self):
        assert _eval(structured_ok=False)["structured_parse_failed"] is True

    def test_advice_heuristic_trips(self):
        assert _eval(answer="Honestly, you should buy AAPL now.")["possible_advice"] is True
        assert _eval(answer="Analysts set a price target of $250.")["possible_advice"] is True

    def test_advice_heuristic_ignores_neutral_analysis(self):
        assert _eval(answer="Revenue rose 6% YoY to $416B [1].")["possible_advice"] is False

    def test_disabled_returns_none(self, monkeypatch):
        monkeypatch.setattr(online_eval.settings, "online_eval_enabled", False)
        assert _eval() is None

    def test_emits_metrics(self):
        _eval(retrieved_chunk_count=0, citation_count=0)  # 2 failed regression checks
        snap = obs.metrics.snapshot()
        assert snap["counters"]["eval.total"]["__total__"] == 1
        assert snap["counters"]["eval.regression"]["__total__"] >= 2
        assert snap["histograms"]["eval.retrieved_chunks"]["count"] == 1
