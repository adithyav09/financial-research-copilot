from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import AuthenticatedUser, require_approved
from app.core.config import settings
from app.core.database import get_supabase_client
from app.models.schemas import StatusResponse


async def _fetch_latest_sec_year(ticker: str) -> Optional[int]:
    """Quick check of SEC EDGAR to find the most recently filed 10-K year."""
    try:
        headers = {"User-Agent": settings.sec_user_agent}
        async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
            # Resolve CIK
            r = await client.get("https://www.sec.gov/files/company_tickers.json")
            r.raise_for_status()
            cik = None
            for entry in r.json().values():
                if entry["ticker"].upper() == ticker.upper():
                    cik = str(entry["cik_str"]).zfill(10)
                    break
            if not cik:
                return None
            # Fetch submission history
            r2 = await client.get(f"https://data.sec.gov/submissions/CIK{cik}.json")
            r2.raise_for_status()
            data = r2.json()
            recent = data["filings"]["recent"]
            for i, form in enumerate(recent["form"]):
                if form == "10-K":
                    date = recent["filingDate"][i]
                    return int(date.split("-")[0])
    except Exception:
        pass
    return None

router = APIRouter()


@router.get("/status/{ticker}", response_model=StatusResponse)
async def get_ticker_status(
    ticker: str, user: AuthenticatedUser = Depends(require_approved)
):
    """Get the requesting user's most recent ingestion status for a ticker.

    Scoped to the caller (user_id) so it reports only what THIS user has ingested
    — the same scope the /query guard and query_filing use. A global status would
    report another user's ingestion as ready and disagree with what the user can
    actually query (409 needs_ingestion).
    """
    ticker = ticker.strip().upper()

    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("ingestion_jobs")
            .select("*")
            .eq("ticker", ticker)
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail=f"No ingestion jobs found for ticker {ticker}")
        
        job_data = response.data[0]
        
        ingested_year = job_data.get("filing_year")
        latest_sec_year = await _fetch_latest_sec_year(ticker)
        is_stale = bool(
            latest_sec_year and ingested_year and latest_sec_year > ingested_year
        )

        return StatusResponse(
            ticker=job_data["ticker"],
            status=job_data["status"],
            filing_type=job_data.get("filing_type"),
            filing_date=job_data.get("filing_date"),
            filing_year=ingested_year,
            chunk_count=job_data.get("chunk_count", 0),
            chroma_collection=job_data.get("chroma_collection"),
            error_message=job_data.get("error_message"),
            created_at=job_data.get("created_at"),
            is_stale=is_stale,
            latest_sec_year=latest_sec_year,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch status for {ticker}: {str(e)}")


@router.get("/status", response_model=List[StatusResponse])
async def get_all_status(user: AuthenticatedUser = Depends(require_approved)):
    """Get all ingestion jobs for the requesting user (scoped to user_id)."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("ingestion_jobs")
            .select("*")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        if not response.data:
            return []
        
        status_list = []
        for job_data in response.data:
            status_response = StatusResponse(
                ticker=job_data["ticker"],
                status=job_data["status"],
                filing_type=job_data.get("filing_type"),
                filing_date=job_data.get("filing_date"),
                filing_year=job_data.get("filing_year"),
                chunk_count=job_data.get("chunk_count", 0),
                chroma_collection=job_data.get("chroma_collection"),
                error_message=job_data.get("error_message"),
                created_at=job_data.get("created_at")
            )
            status_list.append(status_response)
        
        return status_list
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch all statuses: {str(e)}")
