"""
Market service for fetching live market data using yfinance.
Returns valuation metrics, price data, and analyst recommendations.
"""

from typing import Dict, Optional

import yfinance as yf


async def fetch_market_data(ticker: str) -> Dict:
    """
    Fetch live market data for a given ticker using yfinance.

    Args:
        ticker: Company ticker symbol

    Returns:
        Dictionary with market metrics; any unavailable field is None
    """
    try:
        info = yf.Ticker(ticker).info

        def _get(key: str) -> Optional[float]:
            val = info.get(key)
            if val is None:
                return None
            try:
                return float(val)
            except (TypeError, ValueError):
                return None

        def _get_str(key: str) -> Optional[str]:
            val = info.get(key)
            if val is None:
                return None
            return str(val)

        return {
            "ticker": ticker.upper(),
            "company_name": _get_str("longName"),
            "sector": _get_str("sector"),
            "industry": _get_str("industry"),
            "current_price": _get("currentPrice"),
            "market_cap": _get("marketCap"),
            "pe_ratio": _get("trailingPE"),
            "forward_pe": _get("forwardPE"),
            "price_to_book": _get("priceToBook"),
            "price_to_sales": _get("priceToSalesTrailing12Months"),
            "ev_to_ebitda": _get("enterpriseToEbitda"),
            "dividend_yield": _get("dividendYield"),
            "payout_ratio": _get("payoutRatio"),
            "beta": _get("beta"),
            "fifty_two_week_high": _get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": _get("fiftyTwoWeekLow"),
            "analyst_recommendation": _get_str("recommendationKey"),
            "short_float_percent": _get("shortPercentOfFloat"),
            "shares_outstanding": _get("sharesOutstanding"),
        }

    except Exception as e:
        raise Exception(f"Failed to fetch market data for {ticker}: {str(e)}")
