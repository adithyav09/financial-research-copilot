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


def _parse_news_item(item: Dict, today: datetime.datetime) -> Optional[Dict[str, Any]]:
    """Normalize a yfinance news item into a flat dict.

    Yahoo changed the news schema: each item is now {'id', 'content': {...}} with
    the real fields nested under 'content' (pubDate is an ISO-8601 string,
    publisher under provider.displayName, url under canonicalUrl/clickThroughUrl).
    Falls back to the old flat schema so both formats work. Returns None if the
    item has no title.
    """
    content = item.get("content") if isinstance(item.get("content"), dict) else item

    title = content.get("title") or item.get("title") or item.get("headline") or ""
    if not title:
        return None

    provider = content.get("provider") if isinstance(content.get("provider"), dict) else {}
    publisher = (
        provider.get("displayName")
        or item.get("publisher")
        or (item.get("source") or {}).get("name", "")
        or ""
    )

    url = ""
    for key in ("canonicalUrl", "clickThroughUrl"):
        u = content.get(key)
        if isinstance(u, dict) and u.get("url"):
            url = u["url"]
            break
    if not url:
        url = item.get("link") or item.get("url") or ""

    # New schema: pubDate is an ISO-8601 string. Old schema: providerPublishTime
    # is a unix timestamp. Support both.
    date_str, age_days = "", 99
    pub_date = content.get("pubDate") or content.get("displayTime")
    pub_ts = item.get("providerPublishTime") or item.get("publishedAt")
    try:
        if pub_date:
            dt = datetime.datetime.fromisoformat(str(pub_date).replace("Z", "+00:00"))
            dt = dt.replace(tzinfo=None)
            date_str = dt.strftime("%b %d, %Y")
            age_days = (today - dt).days
        elif pub_ts:
            dt = datetime.datetime.utcfromtimestamp(int(pub_ts))
            date_str = dt.strftime("%b %d, %Y")
            age_days = (today - dt).days
    except Exception:
        date_str, age_days = "", 99

    return {
        "title": title,
        "publisher": publisher,
        "date": date_str,
        "age_days": age_days,
        "url": url,
    }


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

        # --- 6-month closes for the sidebar sparkline + today's move ---
        try:
            hist = t.history(period="6mo", interval="1d")
            if hist is not None and not hist.empty:
                closes = hist["Close"].dropna()
                # Downsample to ~30 points; the sparkline is ~250px wide so more
                # resolution than that just inflates every /market response.
                step = max(1, len(closes) // 30)
                result["price_history"] = [round(float(v), 2) for v in closes.iloc[::step]]
            prev_close = _get("previousClose")
            cur = result.get("current_price")
            if cur and prev_close:
                result["day_change_percent"] = round((cur - prev_close) / prev_close * 100, 2)
        except Exception:
            pass  # sparkline is decoration — never fail market data over it

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
            today = datetime.datetime.utcnow()
            for item in (t.news or [])[:8]:
                parsed = _parse_news_item(item, today)
                if parsed:
                    news.append(parsed)
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
        today = datetime.datetime.utcnow()
        results = []
        for item in (t.news or [])[:15]:
            parsed = _parse_news_item(item, today)
            if parsed:
                results.append(parsed)
        return results
    except Exception:
        return []
