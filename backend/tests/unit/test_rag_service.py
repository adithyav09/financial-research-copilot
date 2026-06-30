"""
Unit tests for rag_service helpers.
"""
import pytest
from app.services.rag_service import _is_live_question


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
