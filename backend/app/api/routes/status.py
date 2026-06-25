from fastapi import APIRouter, HTTPException
from typing import List

from app.models.schemas import StatusResponse
from app.core.database import get_supabase_client

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
        
        return StatusResponse(
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
