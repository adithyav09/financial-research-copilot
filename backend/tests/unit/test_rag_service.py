"""
Unit tests for rag_service helpers.
"""
import pytest
import json

from app.models.schemas import Depth, QueryRequest
from app.services.rag_service import (
    DEPTH_SYSTEM_PROMPTS,
    DISCLAIMER,
    EDUCATIONAL_INSTRUCTION,
    NO_ADVICE_INSTRUCTION,
    _is_live_question,
    _parse_structured_answer,
)


VALID_STRUCTURED = {
    "takeaway": "Services grew 11.9% to $109.2B.",
    "metrics": [
        {"label": "Services revenue", "value": "$109.2B", "delta": "+11.9% YoY",
         "delta_direction": "up", "citation": 1},
    ],
    "narrative": "Services brought in $109.2B [1].",
    "chart": {"title": "Revenue, FY21-FY25", "metric_keys": ["revenue"], "reason": "multi-year trend"},
    "follow_ups": ["How exposed is Apple to the Google deal?"],
}


class TestParseStructuredAnswer:
    def test_valid_json(self):
        s = _parse_structured_answer(json.dumps(VALID_STRUCTURED))
        assert s is not None
        assert s.takeaway.startswith("Services grew")
        assert s.metrics[0].citation == 1
        assert s.chart and s.chart.metric_keys == ["revenue"]

    def test_code_fenced_json_still_parses(self):
        fenced = "```json\n" + json.dumps(VALID_STRUCTURED) + "\n```"
        assert _parse_structured_answer(fenced) is not None

    def test_plain_text_returns_none(self):
        assert _parse_structured_answer("Revenue grew 6% to $416B.") is None

    def test_empty_takeaway_returns_none(self):
        bad = {**VALID_STRUCTURED, "takeaway": "  "}
        assert _parse_structured_answer(json.dumps(bad)) is None

    def test_unknown_chart_keys_dropped(self):
        bad_chart = {**VALID_STRUCTURED,
                     "chart": {"title": "t", "metric_keys": ["stock_price"], "reason": None}}
        s = _parse_structured_answer(json.dumps(bad_chart))
        assert s is not None and s.chart is None

    def test_metrics_clamped_to_three(self):
        many = {**VALID_STRUCTURED,
                "metrics": [VALID_STRUCTURED["metrics"][0]] * 5}
        s = _parse_structured_answer(json.dumps(many))
        assert s is not None and len(s.metrics) == 3


class TestDepthPrompts:
    def test_both_depths_have_prompts(self):
        assert set(DEPTH_SYSTEM_PROMPTS) == {Depth.SIMPLE, Depth.ANALYST}

    def test_guardrails_prefix_every_depth(self):
        # The no-advice rule and disclaimer must survive the mode->depth migration
        for prompt in DEPTH_SYSTEM_PROMPTS.values():
            assert DISCLAIMER in prompt
            assert NO_ADVICE_INSTRUCTION in prompt

    def test_simple_defines_jargon_analyst_does_not(self):
        assert EDUCATIONAL_INSTRUCTION in DEPTH_SYSTEM_PROMPTS[Depth.SIMPLE]
        assert EDUCATIONAL_INSTRUCTION not in DEPTH_SYSTEM_PROMPTS[Depth.ANALYST]

    def test_query_request_defaults_to_analyst(self):
        req = QueryRequest(ticker="AAPL", question="What was revenue?")
        assert req.depth == Depth.ANALYST

    def test_query_request_accepts_legacy_mode(self):
        # Old clients still sending mode must not break
        req = QueryRequest(ticker="AAPL", question="q", mode="growth", depth="simple")
        assert req.depth == Depth.SIMPLE


class TestIsLiveQuestion:
    def test_news_keyword(self):
        assert _is_live_question("Give me the latest news on Apple") is True

    def test_current_price(self):
        assert _is_live_question("What is the current stock price?") is True

    def test_analyst_rating(self):
        assert _is_live_question("What is the analyst rating for TSLA?") is True

    def test_ttm_keyword(self):
        assert _is_live_question("Show me the TTM revenue") is True

    def test_filing_question(self):
        assert _is_live_question("What are the main risk factors?") is False

    def test_filing_revenue(self):
        assert _is_live_question("What was revenue in the annual report?") is False

    def test_empty(self):
        assert _is_live_question("") is False
