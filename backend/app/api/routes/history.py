from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.models.schemas import Citation
from app.core.database import get_supabase_client
from app.core.auth import AuthenticatedUser, require_approved

router = APIRouter()


class QueryLogRow(BaseModel):
    id: str
    ticker: str
    question: str
    answer: Optional[str] = None
    mode: str
    session_id: Optional[str] = None
    created_at: str
    tokens_used: Optional[int] = None
    citations: List[Citation] = []


class HistoryResponse(BaseModel):
    entries: List[QueryLogRow]


@router.get("/history", response_model=HistoryResponse)
async def get_history(user: AuthenticatedUser = Depends(require_approved)):
    """Return the last 200 query log entries for the authenticated user."""
    try:
        supabase = get_supabase_client()
        base_cols = "id, ticker, question, answer, mode, created_at, session_id, tokens_used"

        def _fetch(cols: str):
            return (
                supabase.table("query_logs")
                .select(cols)
                .eq("user_id", user.user_id)
                .order("created_at", desc=True)
                .limit(200)
                .execute()
            )

        try:
            # Preferred path: include persisted citations.
            resp = _fetch(f"{base_cols}, citations")
        except Exception:
            # The citations column may not exist yet (migration pending). Fall back
            # so history still loads — just without citations on older/unmigrated rows.
            resp = _fetch(base_cols)
        rows = []
        for r in (resp.data or []):
            raw_citations = r.get("citations") or []
            rows.append(QueryLogRow(
                id=r["id"],
                ticker=r["ticker"],
                question=r["question"],
                answer=r.get("answer"),
                mode=r["mode"],
                created_at=r["created_at"],
                session_id=r.get("session_id"),
                tokens_used=r.get("tokens_used"),
                citations=[Citation(**c) for c in raw_citations if isinstance(c, dict)],
            ))
        return HistoryResponse(entries=rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
