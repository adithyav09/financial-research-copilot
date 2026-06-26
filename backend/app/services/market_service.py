"""
Market service for fetching live market data using yfinance.
Returns valuation metrics, price data, analyst recommendations,
TTM financials, and latest news headlines.
"""

import datetime
from typing import Any, Dict, List, Optional

import yfinance as yf


def _safe_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _safe_str(val: Any) -> Optional[str]:
    return str(val) if val is not None else None


def _fmt(v: float) -> str:
    """Human-readable dollar amount."""
    if abs(v) >= 1e12:
        return f"${v/1e12:.2f}T"
    if abs(v) >= 1e9:
        return f"${v/1e9:.2f}B"
    if abs(v) >= 1e6:
        return f"${v/1e6:.0f}M"
    return f"${v:,.0f}"


async def fetch_market_data(ticker: str) -> Dict:
    """
    Fetch live market data for a given ticker using yfinance.
    Returns valuation metrics, TTM financials, and news headlines.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info

        def _get(key: str) -> Optional[float]:
            return _safe_float(info.get(key))

        def _get_str(key: str) -> Optional[str]:
            return _safe_str(info.get(key))

        result: Dict[str, Any] = {
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

        # --- TTM / most-recent-quarter financials from yfinance ---
        ttm: Dict[str, Optional[str]] = {}
        try:
            # income statement (TTM)
            inc = t.income_stmt
            if inc is not None and not inc.empty:
                col = inc.columns[0]
                def _row(label: str) -> Optional[str]:
                    if label in inc.index:
                        v = inc.at[label, col]
                        return _fmt(float(v)) if v is not None and str(v) != "nan" else None
                    return None
                ttm["ttm_period"] = str(col.date()) if hasattr(col, "date") else str(col)
                ttm["ttm_revenue"] = _row("Total Revenue")
                ttm["ttm_gross_profit"] = _row("Gross Profit")
                ttm["ttm_operating_income"] = _row("Operating Income")
                ttm["ttm_net_income"] = _row("Net Income")
                ttm["ttm_ebitda"] = _row("EBITDA")
        except Exception:
            pass

        try:
            # cash flow (TTM)
            cf = t.cashflow
            if cf is not None and not cf.empty:
                col = cf.columns[0]
                def _cfrow(label: str) -> Optional[str]:
                    if label in cf.index:
                        v = cf.at[label, col]
                        return _fmt(float(v)) if v is not None and str(v) != "nan" else None
                    return None
                ttm["ttm_operating_cashflow"] = _cfrow("Operating Cash Flow")
                ttm["ttm_capex"] = _cfrow("Capital Expenditure")
                ocf_v = cf.at["Operating Cash Flow", col] if "Operating Cash Flow" in cf.index else None
                cap_v = cf.at["Capital Expenditure", col] if "Capital Expenditure" in cf.index else None
                if ocf_v is not None and cap_v is not None:
                    try:
                        fcf = float(ocf_v) + float(cap_v)  # capex is negative
                        ttm["ttm_free_cashflow"] = _fmt(fcf)
                    except Exception:
                        pass
        except Exception:
            pass

        try:
            # balance sheet (most recent quarter)
            bs = t.quarterly_balance_sheet
            if bs is not None and not bs.empty:
                col = bs.columns[0]
                def _bsrow(label: str) -> Optional[str]:
                    if label in bs.index:
                        v = bs.at[label, col]
                        return _fmt(float(v)) if v is not None and str(v) != "nan" else None
                    return None
                ttm["mrq_period"] = str(col.date()) if hasattr(col, "date") else str(col)
                ttm["mrq_total_assets"] = _bsrow("Total Assets")
                ttm["mrq_total_debt"] = _bsrow("Total Debt")
                ttm["mrq_cash"] = _bsrow("Cash And Cash Equivalents")
                ttm["mrq_stockholders_equity"] = _bsrow("Stockholders Equity")
        except Exception:
            pass

        result["ttm"] = ttm

        # --- Latest news headlines ---
        news: List[Dict[str, str]] = []
        try:
            raw_news = t.news or []
            today = datetime.datetime.utcnow()
            for item in raw_news[:8]:
                title = item.get("title") or item.get("headline") or ""
                publisher = item.get("publisher") or item.get("source", {}).get("name", "")
                pub_ts = item.get("providerPublishTime") or item.get("publishedAt")
                if pub_ts:
                    try:
                        dt = datetime.datetime.utcfromtimestamp(int(pub_ts))
                        age_days = (today - dt).days
                        date_str = dt.strftime("%b %d, %Y")
                    except Exception:
                        age_days = 99
                        date_str = ""
                else:
                    age_days = 99
                    date_str = ""
                if title:
                    news.append({
                        "title": title,
                        "publisher": publisher,
                        "date": date_str,
                        "age_days": age_days,
                    })
        except Exception:
            pass

        result["news"] = news
        return result

    except Exception as e:
        raise Exception(f"Failed to fetch market data for {ticker}: {str(e)}")


async def fetch_news(ticker: str) -> List[Dict[str, str]]:
    """Standalone news fetch for the /api/news endpoint."""
    try:
        t = yf.Ticker(ticker)
        raw_news = t.news or []
        today = datetime.datetime.utcnow()
        results = []
        for item in raw_news[:15]:
            title = item.get("title") or item.get("headline") or ""
            publisher = item.get("publisher") or item.get("source", {}).get("name", "")
            pub_ts = item.get("providerPublishTime") or item.get("publishedAt")
            url = item.get("link") or item.get("url") or ""
            if pub_ts:
                try:
                    dt = datetime.datetime.utcfromtimestamp(int(pub_ts))
                    date_str = dt.strftime("%b %d, %Y")
                    age_days = (today - dt).days
                except Exception:
                    date_str = ""
                    age_days = 99
            else:
                date_str = ""
                age_days = 99
            if title:
                results.append({
                    "title": title,
                    "publisher": publisher,
                    "date": date_str,
                    "age_days": age_days,
                    "url": url,
                })
        return results
    except Exception:
        return []
