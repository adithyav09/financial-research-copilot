from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from enum import Enum


class AnalysisMode(str, Enum):
    VALUE = "value"
    GROWTH = "growth"
    INCOME = "income"
    QUALITY = "quality"
    RISK_AVERSE = "risk_averse"
    ESG = "esg"
    ACTIVIST = "activist"


class IngestionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class IngestRequest(BaseModel):
    ticker: str


class IngestResponse(BaseModel):
    status: str
    ticker: str
    filing_type: str
    message: str
    chunks_processed: int = 0


class QueryRequest(BaseModel):
    ticker: str
    question: str
    mode: AnalysisMode = AnalysisMode.VALUE


class Citation(BaseModel):
    text: str
    source: str
    page: Optional[str] = None
    url: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    mode: AnalysisMode
    ticker: str
    citations: list[Citation] = []


class HealthResponse(BaseModel):
    status: str
    version: str


class StatusResponse(BaseModel):
    ticker: str
    status: IngestionStatus
    filing_type: Optional[str] = None
    filing_date: Optional[str] = None
    filing_year: Optional[int] = None
    chunk_count: int = 0
    chroma_collection: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None


class UserProfileResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: str
    token_budget: int = 50000
    tokens_consumed: int = 0
    created_at: Optional[str] = None


class AccessRequestPayload(BaseModel):
    use_case: str
    investor_type: str


class AdminApprovePayload(BaseModel):
    action: str
    token_budget: Optional[int] = None


class MarketDataResponse(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    current_price: Optional[float] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    forward_pe: Optional[float] = None
    price_to_book: Optional[float] = None
    price_to_sales: Optional[float] = None
    ev_to_ebitda: Optional[float] = None
    dividend_yield: Optional[float] = None
    payout_ratio: Optional[float] = None
    beta: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    analyst_recommendation: Optional[str] = None
    short_float_percent: Optional[float] = None
    shares_outstanding: Optional[float] = None


class XBRLFinancialsResponse(BaseModel):
    ticker: str
    cik: str
    revenue_series: Optional[List[Dict[str, Any]]] = None
    net_income_series: Optional[List[Dict[str, Any]]] = None
    operating_cash_flow_series: Optional[List[Dict[str, Any]]] = None
    free_cash_flow_series: Optional[List[Dict[str, Any]]] = None
    total_debt_series: Optional[List[Dict[str, Any]]] = None
    gross_profit_series: Optional[List[Dict[str, Any]]] = None
    operating_income_series: Optional[List[Dict[str, Any]]] = None
    total_assets_series: Optional[List[Dict[str, Any]]] = None
    total_liabilities_series: Optional[List[Dict[str, Any]]] = None
    shareholders_equity_series: Optional[List[Dict[str, Any]]] = None
    eps_diluted_series: Optional[List[Dict[str, Any]]] = None
