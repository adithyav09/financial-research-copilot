import time
from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import QueryRequest, QueryResponse
from app.services.rag_service import query_filing, _is_live_question
from app.core.database import get_supabase_client
from app.core.auth import AuthenticatedUser, require_approved
from app.core import budget, online_eval

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_10k(request: QueryRequest, user: AuthenticatedUser = Depends(require_approved)):
    ticker = request.ticker.strip().upper()

    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question is required")

    # Per-user rate limit (fast, before any DB/model work). Raises 429 if too fast.
    budget.enforce_rate_limit(user.user_id)

    # The backend is the single source of truth for live-vs-filing routing.
    # Live/news questions answer from Yahoo Finance only (no filing needed).
    # Filing questions require a ready ingestion for THIS user — the same scope
    # query_filing() uses. If none exists we signal the client to ingest first
    # (409) BEFORE reserving budget, so an ingest round-trip costs nothing.
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
            raise HTTPException(status_code=409, detail={"needs_ingestion": True, "ticker": ticker})

    # Reserve against the shared monthly budget + per-user daily cap. Raises 429
    # (friendly message) when a limit is reached; concurrency-safe in the DB.
    reservation_id = budget.reserve(user.user_id)

    start_time = time.time()
    try:
        result = await query_filing(
            ticker, request.question, request.mode,
            user_id=user.user_id, depth=request.depth,
        )
        latency_ms = int((time.time() - start_time) * 1000)

        tokens_used = result.get("tokens_used", 0)

        # Persist the query log (history). Best-effort — never fail the response.
        query_id = None
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
                log_result = supabase.table("query_logs").insert(log_data).execute()
            except Exception:
                # citations column may not exist yet (migration pending) — retry
                # without it so the log row still lands.
                log_data.pop("citations", None)
                log_result = supabase.table("query_logs").insert(log_data).execute()
            query_id = (log_result.data[0]["id"] if log_result.data else None) or request.session_id
        except Exception as log_error:
            print(f"Failed to log query: {str(log_error)}")

        # Reconcile the reservation to the ACTUAL cost (from real usage metadata).
        budget.record(
            reservation_id,
            user_id=user.user_id,
            model=result.get("model"),
            input_tokens=result.get("input_tokens", 0),
            output_tokens=result.get("output_tokens", 0),
            tokens_used=tokens_used,
            query_id=query_id,
        )

        # Online quality signals (cheap, non-LLM, best-effort — never fails here).
        online_eval.evaluate(
            is_live=_is_live_question(request.question),
            retrieved_chunk_count=len(result.get("contexts") or []),
            citation_count=len(result["citations"]),
            structured_ok=result.get("structured") is not None,
            answer=result.get("answer", ""),
        )

        return QueryResponse(
            answer=result["answer"],
            mode=request.mode,
            ticker=ticker,
            citations=result["citations"],
            tokens_used=tokens_used,
            structured=result.get("structured"),
            trace_id=result.get("trace_id"),
        )
    except HTTPException:
        budget.release(reservation_id)
        raise
    except Exception as e:
        budget.release(reservation_id)
        raise HTTPException(status_code=500, detail=f"Failed to query filing: {str(e)}")
