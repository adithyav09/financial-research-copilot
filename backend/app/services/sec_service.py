"""
SEC EDGAR service for fetching 10-K filings.
Placeholder implementation — real logic will fetch from SEC EDGAR API.
"""

from app.core.config import settings


async def fetch_latest_10k(ticker: str) -> dict:
    """
    Fetch the latest 10-K filing for a given ticker from SEC EDGAR.
    
    Returns:
        dict with keys: ticker, filing_date, content, url
    """
    # Placeholder: In production, this will:
    # 1. Query SEC EDGAR full-text search or company filings API
    # 2. Download the 10-K document
    # 3. Parse HTML/text content
    # 4. Return structured filing data
    return {
        "ticker": ticker.upper(),
        "filing_type": "10-K",
        "filing_date": "2024-02-15",
        "content": (
            f"{ticker.upper()} Annual Report on Form 10-K for the fiscal year ended December 31, 2023. "
            "Net revenues increased 8% year-over-year driven by strong product and services growth. "
            "Gross margin expanded to 44.1% from 43.3% in the prior year. "
            "Operating income was $114.3B with free cash flow of $99.5B. "
            "The company repurchased $77.5B of common stock during fiscal 2023. "
            "Research and development expenses totaled $29.9B, reflecting continued investment in innovation. "
            "Long-term debt stands at $95.3B with net cash position of $49.0B after subtracting debt. "
            "Key risk factors include intense competition, macroeconomic conditions, and regulatory scrutiny."
        ),
        "url": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=10-K",
    }
