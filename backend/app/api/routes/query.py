import time
from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import QueryRequest, QueryResponse
from app.services.rag_service import query_filing, check_ticker_ingested
from app.core.database import get_supabase_client
from app.core.auth import AuthenticatedUser, require_approved

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_10k(request: QueryRequest, user: AuthenticatedUser = Depends(require_approved)):
    ticker = request.ticker.strip().upper()

    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question is required")

    start_time = time.time()
    
    try:
        # Check if ticker has been ingested
        is_ingested = await check_ticker_ingested(ticker)
        if not is_ingested:
            raise HTTPException(status_code=404, detail="Ticker not ingested. Please ingest first.")
        
        # Query the filing
        result = await query_filing(ticker, request.question, request.mode)
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Log to Supabase and update token budget
        tokens_used = result.get("tokens_used", 0)
        try:
            supabase = get_supabase_client()
            log_data = {
                "ticker": ticker,
                "question": request.question,
                "mode": request.mode.value,
                "answer_length": len(result["answer"]),
                "citations_count": len(result["citations"]),
                "latency_ms": latency_ms,
                "user_id": user.user_id,
                "session_id": request.session_id,
                "tokens_used": tokens_used,
            }
            supabase.table("query_logs").insert(log_data).execute()
            # Atomically increment tokens_consumed in profiles
            supabase.rpc(
                "increment_tokens_consumed",
                {"p_user_id": user.user_id, "p_tokens": tokens_used},
            ).execute()
        except Exception as log_error:
            print(f"Failed to log query/update tokens: {str(log_error)}")

        return QueryResponse(
            answer=result["answer"],
            mode=request.mode,
            ticker=ticker,
            citations=result["citations"],
            tokens_used=tokens_used,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query filing: {str(e)}")
