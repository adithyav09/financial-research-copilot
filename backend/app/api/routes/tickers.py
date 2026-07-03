"""
Ticker search proxy. Serves company name/ticker autocomplete from SEC's
company_tickers.json, fetched and cached server-side so the browser never calls
SEC directly (that cross-origin call fails silently under CORS / SEC rate limits).
"""

import asyncio
from typing import List, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()

_SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"

# In-process cache of the normalized company list. Populated on the first request and
# reused for the life of the process (the SEC file changes at most daily).
_cache: Optional[List["Company"]] = None
_lock = asyncio.Lock()


class Company(BaseModel):
    ticker: str
    title: str
    cik_str: int


class TickerSearchResponse(BaseModel):
    results: List[Company]


async def _load_companies() -> List[Company]:
    global _cache
    if _cache is not None:
        return _cache
    async with _lock:
        if _cache is not None:  # another request filled it while we waited
            return _cache
        try:
            headers = {"User-Agent": settings.sec_user_agent}
            async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
                r = await client.get(_SEC_TICKERS_URL)
                r.raise_for_status()
                raw = r.json()
            _cache = [
                Company(ticker=e["ticker"], title=e["title"], cik_str=e["cik_str"])
                for e in raw.values()
            ]
        except Exception:
            # Leave the cache unset so a later request can retry; return empty now.
            return []
    return _cache


@router.get("/tickers", response_model=TickerSearchResponse)
async def search_tickers(q: str = "", limit: int = 8) -> TickerSearchResponse:
    """Return companies whose ticker or name matches `q` (ticker matches first)."""
    query = q.strip().upper()
    if not query:
        return TickerSearchResponse(results=[])

    companies = await _load_companies()
    ticker_matches = [c for c in companies if c.ticker.startswith(query)]
    name_matches = [
        c for c in companies
        if not c.ticker.startswith(query) and query in c.title.upper()
    ]
    limit = max(1, min(limit, 25))
    return TickerSearchResponse(results=(ticker_matches + name_matches)[:limit])
