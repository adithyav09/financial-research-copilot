import time
from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import QueryRequest, QueryResponse
from app.services.rag_service import query_filing, _is_live_question
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
        # The backend is the single source of truth for live-vs-filing routing.
        # Live/news questions answer from Yahoo Finance only (no filing needed).
        # Filing questions require a ready ingestion for THIS user — the same scope
        # query_filing() uses — so the guard and the query never disagree. If none
        # exists we signal the client to ingest first (409, not a hard error).
        if not _is_live_question(request.question):
            supabase = get_supabase_client()
            ready = (
                supabase.table("ingestion_jobs")
                .select("id")
                .eq("ticker", ticker)
                .eq("status", "ready")
                .eq("user_id", user.user_id)
                .limit(1)
                .execute()
            )
            if not ready.data:
                raise HTTPException(
                    status_code=409,
                    detail={"needs_ingestion": True, "ticker": ticker},
                )

        # Query the filing
        result = await query_filing(
            ticker, request.question, request.mode,
            user_id=user.user_id, depth=request.depth,
        )
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Log to Supabase and update token budget
        tokens_used = result.get("tokens_used", 0)
        try:
            supabase = get_supabase_client()
            log_data = {
                "ticker": ticker,
                "question": request.question,
                # mode is a free-text column; depth values land here so history
                # keeps working without a schema migration.
                "mode": request.depth.value,
                "answer_length": len(result["answer"]),
                "citations_count": len(result["citations"]),
                "citations": [c.model_dump() for c in result["citations"]],
                "latency_ms": latency_ms,
                "user_id": user.user_id,
                "session_id": request.session_id,
                "tokens_used": tokens_used,
                "answer": result["answer"],
            }
            try:
                supabase.table("query_logs").insert(log_data).execute()
            except Exception:
                # The citations column may not exist yet (migration pending) — retry
                # without it so the log row (and token accounting below) still lands.
                log_data.pop("citations", None)
                supabase.table("query_logs").insert(log_data).execute()
            # Atomically increment tokens_consumed in profiles
            supabase.rpc(
                "increment_tokens_consumed",
                {"p_user_id": str(user.user_id), "p_tokens": tokens_used},
            ).execute()
        except Exception as log_error:
            print(f"Failed to log query/update tokens: {str(log_error)}")

        return QueryResponse(
            answer=result["answer"],
            mode=request.mode,
            ticker=ticker,
            citations=result["citations"],
            tokens_used=tokens_used,
            structured=result.get("structured"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query filing: {str(e)}")
