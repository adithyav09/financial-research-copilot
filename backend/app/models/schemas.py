from pydantic import BaseModel
from typing import Optional
from enum import Enum


class AnalysisMode(str, Enum):
    VALUE = "value"
    GROWTH = "growth"


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
