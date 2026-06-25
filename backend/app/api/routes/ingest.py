from fastapi import APIRouter, HTTPException

from app.models.schemas import IngestRequest, IngestResponse
from app.services.sec_service import fetch_latest_10k
from app.services.ingestion_service import ingest_filing

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest_10k(request: IngestRequest):
    ticker = request.ticker.strip().upper()

    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    try:
        filing = await fetch_latest_10k(ticker)
        chunks = await ingest_filing(ticker, filing["content"])

        return IngestResponse(
            status="success",
            ticker=ticker,
            filing_type=filing["filing_type"],
            message=f"Successfully ingested {filing['filing_type']} for {ticker} (filed {filing['filing_date']})",
            chunks_processed=chunks,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
