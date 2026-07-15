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


class Depth(str, Enum):
    """
    Explanation depth for answers — the Thesis redesign's replacement for the
    7 analysis-mode personas. Depth changes framing/register only, never the
    underlying data (same hard product rule that governed modes).
    """
    SIMPLE = "simple"
    ANALYST = "analyst"


class QueryRequest(BaseModel):
    ticker: str
    question: str
    # Deprecated: kept so older clients sending `mode` still validate.
    # The query path ignores it; `depth` drives the prompt now.
    mode: AnalysisMode = AnalysisMode.VALUE
    depth: Depth = Depth.ANALYST
    session_id: Optional[str] = None


class Citation(BaseModel):
    text: str
    source: str
    page: Optional[str] = None
    url: Optional[str] = None
    # Set only for filing citations — lets the frontend open the passage in
    # the in-app filing viewer instead of jumping to SEC.gov in a new tab.
    chunk_index: Optional[int] = None
    filing_type: Optional[str] = None


class FilingPassage(BaseModel):
    chunk_index: int
    content: str
    is_target: bool = False


class FilingPassageResponse(BaseModel):
    """A cited chunk plus its neighbors, for the in-app filing viewer."""
    ticker: str
    filing_type: str
    filing_year: Optional[int] = None
    filing_date: Optional[str] = None
    sec_url: Optional[str] = None
    chunk_index: int
    chunk_count: Optional[int] = None
    passages: list[FilingPassage] = []


class MetricCard(BaseModel):
    """One headline figure pulled out of the answer (design 1b metric cards)."""
    label: str
    value: str
    delta: Optional[str] = None            # e.g. "+11.9% YoY"
    delta_direction: Optional[str] = None  # "up" | "down" | "flat" — drives color only
    citation: Optional[int] = None         # 1-based index into the citations list


class ChartSpec(BaseModel):
    """
    Auto-chart request from the LLM. metric_keys must come from the XBRL
    series the backend already serves (validated server-side); the frontend
    renders from its own /xbrl data — no chart data travels in the answer.
    """
    title: str
    metric_keys: list[str]
    reason: Optional[str] = None  # shown as "Shown because …"


class StructuredAnswer(BaseModel):
    takeaway: str
    metrics: list[MetricCard] = []
    narrative: str
    chart: Optional[ChartSpec] = None
    follow_ups: list[str] = []


class QueryResponse(BaseModel):
    answer: str
    mode: AnalysisMode
    ticker: str
    citations: list[Citation] = []
    tokens_used: int = 0
    # Present when the LLM produced valid structured output; the frontend
    # falls back to rendering `answer` as markdown when it's null.
    structured: Optional[StructuredAnswer] = None


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
    is_stale: bool = False
    latest_sec_year: Optional[int] = None


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
    day_change_percent: Optional[float] = None
    price_history: Optional[List[float]] = None


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
