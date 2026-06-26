from fastapi import APIRouter, HTTPException

from app.models.schemas import MarketDataResponse, XBRLFinancialsResponse
from app.services.market_service import fetch_market_data
from app.services.xbrl_service import fetch_xbrl_financials

router = APIRouter()


@router.get("/market-data/{ticker}", response_model=MarketDataResponse)
async def get_market_data(ticker: str) -> MarketDataResponse:
    """Fetch live market data for a ticker via yfinance."""
    try:
        data = await fetch_market_data(ticker.upper())
        return MarketDataResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/financials/{ticker}", response_model=XBRLFinancialsResponse)
async def get_xbrl_financials(ticker: str) -> XBRLFinancialsResponse:
    """Fetch structured XBRL financial statement data for a ticker from SEC EDGAR."""
    try:
        data = await fetch_xbrl_financials(ticker.upper())
        return XBRLFinancialsResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
