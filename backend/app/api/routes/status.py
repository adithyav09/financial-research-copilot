from fastapi import APIRouter, HTTPException
from typing import List, Optional
import httpx

from app.models.schemas import StatusResponse
from app.core.database import get_supabase_client
from app.core.config import settings


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
async def get_ticker_status(ticker: str):
    """Get the most recent ingestion status for a specific ticker."""
    ticker = ticker.strip().upper()
    
    try:
        supabase = get_supabase_client()
        response = supabase.table("ingestion_jobs").select("*").eq("ticker", ticker).order("created_at", desc=True).limit(1).execute()
        
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
async def get_all_status():
    """Get all ingestion jobs status."""
    try:
        supabase = get_supabase_client()
        response = supabase.table("ingestion_jobs").select("*").order("created_at", desc=True).execute()
        
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
