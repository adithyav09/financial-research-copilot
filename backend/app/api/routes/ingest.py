import asyncio
from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import IngestRequest, IngestResponse
from app.services.sec_service import fetch_latest_10k, fetch_latest_10q
from app.services.ingestion_service import ingest_filing
from app.core.database import get_supabase_client
from app.core.auth import AuthenticatedUser, require_approved

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest_10k(request: IngestRequest, user: AuthenticatedUser = Depends(require_approved)):
    ticker = request.ticker.strip().upper()

    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    supabase = get_supabase_client()
    
    try:
        # Step 1: Insert initial supabase row
        ingestion_data = {
            "ticker": ticker,
            "filing_type": "10-K",
            "status": "processing",
            "user_id": user.user_id,
        }
        response = supabase.table("ingestion_jobs").insert(ingestion_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create ingestion job")
        
        job_id = response.data[0]["id"]
        
        # Step 2: Fetch 10-K (required) + 10-Q (best-effort) in parallel
        try:
            results = await asyncio.gather(
                fetch_latest_10k(ticker),
                fetch_latest_10q(ticker),
                return_exceptions=True,
            )
        except Exception as e:
            supabase.table("ingestion_jobs").update({
                "status": "failed", "error_message": str(e)
            }).eq("id", job_id).execute()
            raise HTTPException(status_code=500, detail=f"Failed to fetch filing: {str(e)}")

        filing_10k = results[0]
        filing_10q = results[1] if not isinstance(results[1], Exception) else None

        if isinstance(filing_10k, Exception):
            supabase.table("ingestion_jobs").update({
                "status": "failed", "error_message": str(filing_10k)
            }).eq("id", job_id).execute()
            raise HTTPException(status_code=500, detail=f"Failed to fetch 10-K: {str(filing_10k)}")

        # Step 3: Ingest 10-K into the vector store
        try:
            chunks_10k = await ingest_filing(ticker, filing_10k)
        except Exception as e:
            supabase.table("ingestion_jobs").update({
                "status": "failed", "error_message": str(e)
            }).eq("id", job_id).execute()
            raise HTTPException(status_code=500, detail=f"Failed to ingest 10-K: {str(e)}")

        # Step 3b: Ingest 10-Q best-effort (don't fail the whole job if it errors)
        chunks_10q = 0
        tenq_date = ""
        if filing_10q:
            try:
                chunks_10q = await ingest_filing(ticker, filing_10q)
                tenq_date = filing_10q.get("filing_date", "")
                # Store 10-Q as its own ingestion_job row for status tracking
                supabase.table("ingestion_jobs").insert({
                    "ticker": ticker,
                    "filing_type": "10-Q",
                    "status": "ready",
                    "chunk_count": chunks_10q,
                    "filing_date": filing_10q["filing_date"],
                    "filing_year": filing_10q["filing_year"],
                    "sec_url": filing_10q["url"],
                    "user_id": user.user_id,
                }).execute()
            except Exception:
                chunks_10q = 0

        # Step 4: Update primary 10-K job row
        supabase.table("ingestion_jobs").update({
            "status": "ready",
            "chunk_count": chunks_10k,
            "filing_date": filing_10k["filing_date"],
            "filing_year": filing_10k["filing_year"],
            "sec_url": filing_10k["url"],
        }).eq("id", job_id).execute()

        extra = f" + 10-Q ({tenq_date}, {chunks_10q} chunks)" if chunks_10q else ""
        return IngestResponse(
            status="success",
            ticker=ticker,
            filing_type=filing_10k["filing_type"],
            message=f"Successfully ingested 10-K for {ticker} (filed {filing_10k['filing_date']}, {chunks_10k} chunks){extra}",
            chunks_processed=chunks_10k + chunks_10q,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during ingestion: {str(e)}")
