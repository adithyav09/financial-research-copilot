"""
Unit tests for market_service data parsing.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.services.market_service import fetch_market_data


@pytest.mark.asyncio
async def test_fetch_market_data_returns_dict():
    mock_ticker = MagicMock()
    mock_ticker.info = {
        "currentPrice": 150.0,
        "marketCap": 2_000_000_000_000,
        "trailingPE": 28.5,
        "recommendationKey": "buy",
        "shortName": "Apple Inc.",
        "sector": "Technology",
    }
    mock_ticker.income_stmt = MagicMock()
    mock_ticker.income_stmt.empty = True
    mock_ticker.cash_flow = MagicMock()
    mock_ticker.cash_flow.empty = True
    mock_ticker.quarterly_balance_sheet = MagicMock()
    mock_ticker.quarterly_balance_sheet.empty = True
    mock_ticker.news = []

    with patch("yfinance.Ticker", return_value=mock_ticker):
        result = await fetch_market_data("AAPL")

    assert isinstance(result, dict)
    assert result["current_price"] == 150.0
    assert result["market_cap"] == 2_000_000_000_000
