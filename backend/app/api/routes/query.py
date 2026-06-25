from fastapi import APIRouter, HTTPException

from app.models.schemas import QueryRequest, QueryResponse
from app.services.rag_service import query_filing

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_10k(request: QueryRequest):
    ticker = request.ticker.strip().upper()

    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question is required")

    try:
        result = await query_filing(ticker, request.question, request.mode)

        return QueryResponse(
            answer=result["answer"],
            mode=request.mode,
            ticker=ticker,
            citations=result["citations"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
