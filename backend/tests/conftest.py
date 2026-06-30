"""
Shared pytest fixtures for the backend test suite.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def client():
    """Return a FastAPI TestClient with the app."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def mock_supabase(monkeypatch):
    """Mock Supabase client to avoid real DB calls in unit tests."""
    mock = MagicMock()
    monkeypatch.setattr("app.core.database.get_supabase_client", lambda: mock)
    return mock


@pytest.fixture
def mock_openai(monkeypatch):
    """Mock OpenAI calls."""
    mock = AsyncMock(return_value=MagicMock(content="Mocked answer", usage_metadata={"total_tokens": 10}))
    monkeypatch.setattr("langchain_openai.ChatOpenAI.ainvoke", mock)
    return mock
