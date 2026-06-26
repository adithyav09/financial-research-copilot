from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_supabase_client
from app.core.auth import AuthenticatedUser, require_approved

router = APIRouter()


class QueryLogRow(BaseModel):
    id: str
    ticker: str
    question: str
    mode: str
    session_id: Optional[str] = None
    created_at: str
    tokens_used: Optional[int] = None


class HistoryResponse(BaseModel):
    entries: List[QueryLogRow]


@router.get("/history", response_model=HistoryResponse)
async def get_history(user: AuthenticatedUser = Depends(require_approved)):
    """Return the last 200 query log entries for the authenticated user."""
    try:
        supabase = get_supabase_client()
        resp = (
            supabase.table("query_logs")
            .select("id, ticker, question, mode, session_id, created_at, tokens_used")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .limit(200)
            .execute()
        )
        rows = [QueryLogRow(**r) for r in (resp.data or [])]
        return HistoryResponse(entries=rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
