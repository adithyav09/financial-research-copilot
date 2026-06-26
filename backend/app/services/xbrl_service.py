"""
XBRL service for fetching structured financial statement data from SEC EDGAR.
Uses the EDGAR XBRL company facts API — no API key required.
"""

import asyncio
from typing import Dict, List, Optional

import httpx

from app.core.config import settings


def _extract_annual_series(
    facts: Dict,
    namespace: str,
    concept: str,
    n: int = 5,
) -> Optional[List[Dict]]:
    """
    Extract the last n annual (10-K) USD entries for a given XBRL concept,
    sorted oldest-first.

    Args:
        facts: The facts dict from the EDGAR company facts JSON
        namespace: e.g. "us-gaap" or "dei"
        concept: e.g. "Revenues"
        n: number of annual periods to return

    Returns:
        List of {"year": int, "value": float} dicts, or None if unavailable
    """
    try:
        entries = facts[namespace][concept]["units"].get("USD") or facts[namespace][concept]["units"].get("shares")
        if not entries:
            return None
    except (KeyError, TypeError):
        return None

    # Keep only 10-K filings with an end date
    annual = [e for e in entries if e.get("form") == "10-K" and e.get("end")]

    if not annual:
        return None

    # Deduplicate by end date, keeping the entry with the largest absolute value
    # (some concepts have restated entries for the same period)
    by_end: Dict[str, Dict] = {}
    for entry in annual:
        end = entry["end"]
        if end not in by_end or abs(entry["val"]) > abs(by_end[end]["val"]):
            by_end[end] = entry

    # Sort by end date descending, take n most recent, then reverse to oldest-first
    sorted_entries = sorted(by_end.values(), key=lambda e: e["end"], reverse=True)[:n]
    sorted_entries = sorted(sorted_entries, key=lambda e: e["end"])

    return [{"year": int(e["end"][:4]), "value": float(e["val"])} for e in sorted_entries]


def _try_concepts(facts: Dict, namespace: str, *concepts: str, n: int = 5) -> Optional[List[Dict]]:
    """Try multiple concept names in order, returning the first successful result."""
    for concept in concepts:
        result = _extract_annual_series(facts, namespace, concept, n=n)
        if result:
            return result
    return None


def _compute_free_cash_flow(
    ocf_series: Optional[List[Dict]],
    capex_series: Optional[List[Dict]],
) -> Optional[List[Dict]]:
    """
    Compute FreeCashFlow = OperatingCashFlow - CapEx, matched by year.
    CapEx values from EDGAR are reported as positive outflows; subtract them.
    """
    if not ocf_series or not capex_series:
        return None

    capex_by_year = {e["year"]: e["value"] for e in capex_series}
    result = []
    for entry in ocf_series:
        year = entry["year"]
        capex = capex_by_year.get(year)
        if capex is not None:
            result.append({"year": year, "value": entry["value"] - capex})

    return result if result else None


async def fetch_xbrl_financials(ticker: str) -> Dict:
    """
    Fetch structured XBRL financial statement data for a given ticker
    from the SEC EDGAR company facts API.

    Args:
        ticker: Company ticker symbol

    Returns:
        Dictionary with time-series financial data; any unavailable series is None
    """
    headers = {"User-Agent": settings.sec_user_agent}

    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        try:
            # Step 1: Resolve ticker to CIK using official SEC ticker map
            tickers_url = "https://www.sec.gov/files/company_tickers.json"
            response = await client.get(tickers_url)
            response.raise_for_status()

            # Rate limit: wait 0.5 seconds between requests
            await asyncio.sleep(0.5)

            tickers_data = response.json()
            cik = None
            for entry in tickers_data.values():
                if entry["ticker"].upper() == ticker.upper():
                    cik = str(entry["cik_str"]).zfill(10)
                    break

            if not cik:
                raise ValueError(f"Ticker {ticker} not found in SEC company list")

            # Step 2: Fetch XBRL company facts
            facts_url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
            response = await client.get(facts_url)
            response.raise_for_status()

            # Rate limit: wait 0.5 seconds between requests
            await asyncio.sleep(0.5)

            data = response.json()
            facts = data.get("facts", {})

            gaap = facts.get("us-gaap", {})
            dei = facts.get("dei", {})

            # Step 3: Extract each concept series
            revenue_series = _try_concepts(
                facts, "us-gaap",
                "Revenues",
                "RevenueFromContractWithCustomerExcludingAssessedTax",
            )
            net_income_series = _try_concepts(facts, "us-gaap", "NetIncomeLoss")
            ocf_series = _try_concepts(facts, "us-gaap", "NetCashProvidedByUsedInOperatingActivities")
            capex_series = _try_concepts(facts, "us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment")
            total_debt_series = _try_concepts(
                facts, "us-gaap",
                "LongTermDebt",
                "LongTermDebtNoncurrent",
            )
            gross_profit_series = _try_concepts(facts, "us-gaap", "GrossProfit")
            operating_income_series = _try_concepts(facts, "us-gaap", "OperatingIncomeLoss")
            total_assets_series = _try_concepts(facts, "us-gaap", "Assets")
            total_liabilities_series = _try_concepts(facts, "us-gaap", "Liabilities")
            shareholders_equity_series = _try_concepts(facts, "us-gaap", "StockholdersEquity")

            # EPS diluted lives under dei namespace with shares units
            eps_diluted_series = _extract_annual_series(facts, "dei", "EarningsPerShareDiluted", n=5) \
                if "EarningsPerShareDiluted" in dei else None

            # Step 4: Compute free cash flow
            free_cash_flow_series = _compute_free_cash_flow(ocf_series, capex_series)

            return {
                "ticker": ticker.upper(),
                "cik": cik,
                "revenue_series": revenue_series,
                "net_income_series": net_income_series,
                "operating_cash_flow_series": ocf_series,
                "free_cash_flow_series": free_cash_flow_series,
                "total_debt_series": total_debt_series,
                "gross_profit_series": gross_profit_series,
                "operating_income_series": operating_income_series,
                "total_assets_series": total_assets_series,
                "total_liabilities_series": total_liabilities_series,
                "shareholders_equity_series": shareholders_equity_series,
                "eps_diluted_series": eps_diluted_series,
            }

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise Exception(f"SEC rate limit exceeded for {ticker}: {str(e)}")
            elif e.response.status_code == 503:
                raise Exception(f"SEC service unavailable for {ticker}: {str(e)}")
            else:
                raise Exception(f"SEC XBRL API error for {ticker}: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to fetch XBRL financials for {ticker}: {str(e)}")
