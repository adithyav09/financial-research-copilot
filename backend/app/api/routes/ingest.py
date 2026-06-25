from fastapi import APIRouter, HTTPException

from app.models.schemas import IngestRequest, IngestResponse
from app.services.sec_service import fetch_latest_10k
from app.services.ingestion_service import ingest_filing
from app.core.database import get_supabase_client

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest_10k(request: IngestRequest):
    ticker = request.ticker.strip().upper()

    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    supabase = get_supabase_client()
    
    try:
        # Step 1: Insert initial Supabase row
        ingestion_data = {
            "ticker": ticker,
            "filing_type": "10-K",
            "status": "processing"
        }
        response = supabase.table("ingestion_jobs").insert(ingestion_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create ingestion job")
        
        job_id = response.data[0]["id"]
        
        # Step 2: Fetch filing from SEC
        try:
            filing = await fetch_latest_10k(ticker)
        except Exception as e:
            # Update Supabase with failure
            supabase.table("ingestion_jobs").update({
                "status": "failed",
                "error_message": str(e)
            }).eq("id", job_id).execute()
            raise HTTPException(status_code=500, detail=f"Failed to fetch filing: {str(e)}")
        
        # Step 3: Ingest filing into ChromaDB
        try:
            chunks = await ingest_filing(ticker, filing)
        except Exception as e:
            # Update Supabase with failure
            supabase.table("ingestion_jobs").update({
                "status": "failed",
                "error_message": str(e)
            }).eq("id", job_id).execute()
            raise HTTPException(status_code=500, detail=f"Failed to ingest filing: {str(e)}")
        
        # Step 4: Update Supabase with success
        collection_name = f"{ticker}_{filing['filing_type']}_{filing['filing_year']}"
        supabase.table("ingestion_jobs").update({
            "status": "ready",
            "chunk_count": chunks,
            "filing_date": filing["filing_date"],
            "filing_year": filing["filing_year"],
            "sec_url": filing["url"],
            "chroma_collection": collection_name
        }).eq("id", job_id).execute()
        
        return IngestResponse(
            status="success",
            ticker=ticker,
            filing_type=filing["filing_type"],
            message=f"Successfully ingested {filing['filing_type']} for {ticker} (filed {filing['filing_date']})",
            chunks_processed=chunks,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during ingestion: {str(e)}")
