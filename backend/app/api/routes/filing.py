"""
In-app filing viewer support: serve a cited chunk plus its neighbors so the
frontend can show the passage in context without jumping to SEC.gov.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import AuthenticatedUser, require_approved
from app.core.database import get_supabase_client
from app.models.schemas import FilingPassage, FilingPassageResponse

router = APIRouter()


@router.get("/filing/{ticker}/passage", response_model=FilingPassageResponse)
async def get_filing_passage(
    ticker: str,
    chunk_index: int = Query(..., ge=0),
    filing_type: str = Query("10-K"),
    context: int = Query(2, ge=0, le=5),
    user: AuthenticatedUser = Depends(require_approved),
):
    """Return the cited chunk ± `context` neighbors, ordered by chunk_index."""
    t = ticker.strip().upper()
    supabase = get_supabase_client()

    # chunk_index lives inside jsonb metadata; ->> stringifies it, so the
    # window query matches on the string forms of the wanted indices.
    wanted = [str(i) for i in range(max(0, chunk_index - context), chunk_index + context + 1)]
    try:
        resp = (
            supabase.table("document_chunks")
            .select("content, metadata")
            .eq("metadata->>ticker", t)
            .eq("metadata->>filing_type", filing_type)
            .in_("metadata->>chunk_index", wanted)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load passage: {e}")

    if not resp.data:
        raise HTTPException(status_code=404, detail="Passage not found — the filing may have been re-ingested")

    rows = sorted(resp.data, key=lambda r: int(r["metadata"].get("chunk_index", 0)))
    target_meta = next(
        (r["metadata"] for r in rows if int(r["metadata"].get("chunk_index", -1)) == chunk_index),
        rows[0]["metadata"],
    )

    # chunk_count bounds the viewer's prev/next navigation (best-effort)
    chunk_count = None
    try:
        job = (
            supabase.table("ingestion_jobs")
            .select("chunk_count")
            .eq("ticker", t)
            .eq("filing_type", filing_type)
            .eq("status", "ready")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if job.data:
            chunk_count = job.data[0].get("chunk_count")
    except Exception:
        pass

    return FilingPassageResponse(
        ticker=t,
        filing_type=filing_type,
        filing_year=target_meta.get("filing_year"),
        filing_date=target_meta.get("filing_date"),
        sec_url=target_meta.get("sec_url"),
        chunk_index=chunk_index,
        chunk_count=chunk_count,
        passages=[
            FilingPassage(
                chunk_index=int(r["metadata"].get("chunk_index", 0)),
                content=r["content"],
                is_target=int(r["metadata"].get("chunk_index", -1)) == chunk_index,
            )
            for r in rows
        ],
    )
