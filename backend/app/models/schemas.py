from pydantic import BaseModel
from typing import Optional
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
