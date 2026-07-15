"""
Unit tests for rag_service helpers.
"""
import pytest
from app.models.schemas import Depth, QueryRequest
from app.services.rag_service import (
    DEPTH_SYSTEM_PROMPTS,
    DISCLAIMER,
    EDUCATIONAL_INSTRUCTION,
    NO_ADVICE_INSTRUCTION,
    _is_live_question,
)


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
