from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, ingest, query, status, market_data, auth, suggestions, history, news

app = FastAPI(
    title="Financial Research Copilot",
    description="RAG-powered SEC filing analysis with configurable research modes",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(market_data.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(suggestions.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(news.router, prefix="/api")
