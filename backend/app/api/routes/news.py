from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel

from app.services.market_service import fetch_news
from app.core.auth import AuthenticatedUser, require_approved

router = APIRouter()


class NewsItem(BaseModel):
    title: str
    publisher: str
    date: str
    age_days: int
    url: str


class NewsResponse(BaseModel):
    ticker: str
    items: List[NewsItem]


@router.get("/news/{ticker}", response_model=NewsResponse)
async def get_news(ticker: str, user: AuthenticatedUser = Depends(require_approved)):
    try:
        items = await fetch_news(ticker.upper())
        return NewsResponse(
            ticker=ticker.upper(),
            items=[NewsItem(**i) for i in items],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
