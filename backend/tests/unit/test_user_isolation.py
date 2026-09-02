"""
Regression tests for per-user retrieval isolation.

Two users (A and B) ingest the SAME ticker with the SAME chunk indices. Every
retrieval path must return only the caller's own chunks:

  * main query path        -> rag_service.query_filing (vector search filter)
  * passage endpoint       -> GET /api/filing/{ticker}/passage
  * secondary metadata     -> GET /api/status/{ticker} (already covered in
                              test_status_routes.py; the isolation contract is
                              re-asserted here at the data layer)
  * ingestion              -> chunks are stamped with user_id and the idempotent
                              delete is scoped so one user can't wipe another's

The backend talks to Supabase with the service-role key (RLS bypassed), so these
application-layer filters are the actual isolation boundary — hence we assert on
them directly with fakes that enforce the same semantics as Postgres
(`metadata @> filter` containment and `metadata->>key` equality).
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from langchain_core.documents import Document

from app.core.auth import AuthenticatedUser, require_approved
from app.main import app

USER_A = "aaaaaaaa-0000-0000-0000-000000000001"
USER_B = "bbbbbbbb-0000-0000-0000-000000000002"


# --------------------------------------------------------------------------- #
# Fakes that mimic Postgres/Supabase filter semantics
# --------------------------------------------------------------------------- #

def _col(row, col):
    """Resolve a plain column or a `metadata->>key` jsonb accessor to a string."""
    if col.startswith("metadata->>"):
        key = col.split("->>", 1)[1]
        val = (row.get("metadata") or {}).get(key)
        return None if val is None else str(val)
    return row.get(col)


class _FakeQuery:
    """Chainable stand-in for supabase-py's query builder over a row list."""

    def __init__(self, rows):
        self._rows = list(rows)
        self._eq = []
        self._in = []

    def select(self, *a, **k):
        return self

    def eq(self, col, val):
        self._eq.append((col, val))
        return self

    def in_(self, col, vals):
        self._in.append((col, list(vals)))
        return self

    def order(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def _apply(self):
        rows = self._rows
        for col, val in self._eq:
            rows = [r for r in rows if _col(r, col) == val]
        for col, vals in self._in:
            rows = [r for r in rows if _col(r, col) in vals]
        return rows

    def execute(self):
        return SimpleNamespace(data=self._apply())


class _FakeSupabase:
    def __init__(self, tables):
        self._tables = tables  # {name: [rows]}

    def table(self, name):
        return _FakeQuery(self._tables.get(name, []))


class _FakeRetriever:
    """Enforces `metadata @> filter` containment, like match_document_chunks."""

    def __init__(self, flt, chunks):
        self._flt = flt or {}
        self._chunks = chunks

    async def ainvoke(self, _question):
        return [
            d for d in self._chunks
            if all((d.metadata.get(k) == v) for k, v in self._flt.items())
        ]


class _FakeVectorStore:
    def __init__(self, *a, **k):
        # chunks injected via classmethod bound in the test
        pass

    def as_retriever(self, *, search_type=None, search_kwargs=None):
        return _FakeRetriever((search_kwargs or {}).get("filter", {}), self._ALL_CHUNKS)


class _FakeLLMResp:
    content = "The main risk factors include competition and supply concentration."
    usage_metadata = {"input_tokens": 10, "output_tokens": 5, "total_tokens": 15}


class _FakeLLM:
    def __init__(self, *a, **k):
        pass

    def bind(self, **k):
        return self

    async def ainvoke(self, _prompt):
        return _FakeLLMResp()


# --------------------------------------------------------------------------- #
# Seed data: same ticker, same chunk indices, different owners
# --------------------------------------------------------------------------- #

def _chunk(user_id, idx):
    marker = "USER_A" if user_id == USER_A else "USER_B"
    return Document(
        page_content=f"[{marker}] AAPL 10-K risk factor passage #{idx}.",
        metadata={
            "user_id": user_id, "ticker": "AAPL", "filing_type": "10-K",
            "filing_year": 2024, "filing_date": "2024-11-01",
            "sec_url": f"https://sec.gov/{marker}", "chunk_index": idx,
        },
    )


ALL_CHUNKS = [_chunk(u, i) for u in (USER_A, USER_B) for i in range(3)]


def _ingestion_jobs():
    return [
        {"filing_type": "10-K", "status": "ready", "user_id": u, "ticker": "AAPL",
         "sec_url": f"https://sec.gov/{u}", "chunk_count": 3, "filing_year": 2024,
         "filing_date": "2024-11-01", "created_at": "2024-11-01T00:00:00Z"}
        for u in (USER_A, USER_B)
    ]


def _doc_rows():
    """document_chunks rows (content + metadata) for the passage endpoint."""
    return [{"content": d.page_content, "metadata": d.metadata} for d in ALL_CHUNKS]


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


# --------------------------------------------------------------------------- #
# 1. Main query path — vector retrieval is scoped to the caller
# --------------------------------------------------------------------------- #

@pytest.mark.asyncio
async def test_query_path_retrieves_only_callers_chunks(monkeypatch):
    from app.services import rag_service

    _FakeVectorStore._ALL_CHUNKS = ALL_CHUNKS
    supa = _FakeSupabase({"ingestion_jobs": _ingestion_jobs()})
    monkeypatch.setattr(rag_service, "get_supabase_client", lambda: supa)
    monkeypatch.setattr(rag_service, "OpenAIEmbeddings", lambda *a, **k: MagicMock())
    monkeypatch.setattr(rag_service, "SupabaseVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag_service, "ChatOpenAI", _FakeLLM)
    # Skip multi-query LLM expansion — use the base (fake) retriever directly.
    monkeypatch.setattr(rag_service.MultiQueryRetriever, "from_llm",
                        staticmethod(lambda retriever, llm: retriever))
    monkeypatch.setattr(rag_service, "fetch_market_data", AsyncMock(return_value=None))
    monkeypatch.setattr(rag_service, "fetch_xbrl_financials", AsyncMock(return_value=None))

    res_a = await rag_service.query_filing(
        "AAPL", "What are the main risk factors?", user_id=USER_A
    )
    # Isolation is asserted via the citations (each carries its chunk's text),
    # which every pipeline version returns.
    cites_a = " ".join(c.text for c in res_a["citations"])
    assert res_a["citations"] and "USER_A" in cites_a and "USER_B" not in cites_a

    res_b = await rag_service.query_filing(
        "AAPL", "What are the main risk factors?", user_id=USER_B
    )
    cites_b = " ".join(c.text for c in res_b["citations"])
    assert res_b["citations"] and "USER_B" in cites_b and "USER_A" not in cites_b


@pytest.mark.asyncio
async def test_query_path_returns_nothing_for_user_without_ingestion(monkeypatch):
    # Only USER_B has ingested. USER_A must not reach USER_B's chunks — query_filing
    # raises because USER_A has no ready ingestion_jobs row of their own.
    from app.services import rag_service

    _FakeVectorStore._ALL_CHUNKS = ALL_CHUNKS
    only_b = [j for j in _ingestion_jobs() if j["user_id"] == USER_B]
    supa = _FakeSupabase({"ingestion_jobs": only_b})
    monkeypatch.setattr(rag_service, "get_supabase_client", lambda: supa)
    monkeypatch.setattr(rag_service, "OpenAIEmbeddings", lambda *a, **k: MagicMock())
    monkeypatch.setattr(rag_service, "SupabaseVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag_service, "ChatOpenAI", _FakeLLM)
    monkeypatch.setattr(rag_service.MultiQueryRetriever, "from_llm",
                        staticmethod(lambda retriever, llm: retriever))
    monkeypatch.setattr(rag_service, "fetch_market_data", AsyncMock(return_value=None))
    monkeypatch.setattr(rag_service, "fetch_xbrl_financials", AsyncMock(return_value=None))

    with pytest.raises(Exception) as exc:
        await rag_service.query_filing(
            "AAPL", "What are the main risk factors?", user_id=USER_A
        )
    assert "No ready ingestion" in str(exc.value)


def test_chunk_filter_is_user_scoped():
    from app.services.rag_service import _chunk_filter
    fa = _chunk_filter("aapl", "10-K", USER_A)
    fb = _chunk_filter("aapl", "10-K", USER_B)
    assert fa["user_id"] == USER_A and fb["user_id"] == USER_B
    assert fa != fb  # two users never share a retrieval filter


# --------------------------------------------------------------------------- #
# 2. Passage endpoint — the in-app filing viewer path
# --------------------------------------------------------------------------- #

def _passage_client(monkeypatch, as_user):
    app.dependency_overrides[require_approved] = lambda: AuthenticatedUser(
        user_id=as_user, email="x@y.com", role="approved"
    )
    supa = _FakeSupabase({
        "document_chunks": _doc_rows(),
        "ingestion_jobs": _ingestion_jobs(),
    })
    monkeypatch.setattr("app.api.routes.filing.get_supabase_client", lambda: supa)
    return TestClient(app)


def test_passage_endpoint_returns_only_callers_passages(monkeypatch):
    client = _passage_client(monkeypatch, USER_A)
    resp = client.get("/api/filing/AAPL/passage?chunk_index=1&filing_type=10-K")
    assert resp.status_code == 200
    contents = " ".join(p["content"] for p in resp.json()["passages"])
    assert "USER_A" in contents and "USER_B" not in contents


def test_passage_endpoint_user_b_sees_only_their_own(monkeypatch):
    client = _passage_client(monkeypatch, USER_B)
    resp = client.get("/api/filing/AAPL/passage?chunk_index=1&filing_type=10-K")
    assert resp.status_code == 200
    contents = " ".join(p["content"] for p in resp.json()["passages"])
    assert "USER_B" in contents and "USER_A" not in contents


def test_passage_endpoint_404_when_only_other_user_has_chunks(monkeypatch):
    # Seed ONLY user B's chunks; user A must get 404, never B's passage.
    app.dependency_overrides[require_approved] = lambda: AuthenticatedUser(
        user_id=USER_A, email="x@y.com", role="approved"
    )
    only_b = [r for r in _doc_rows() if r["metadata"]["user_id"] == USER_B]
    supa = _FakeSupabase({"document_chunks": only_b, "ingestion_jobs": _ingestion_jobs()})
    monkeypatch.setattr("app.api.routes.filing.get_supabase_client", lambda: supa)

    resp = TestClient(app).get("/api/filing/AAPL/passage?chunk_index=1")
    assert resp.status_code == 404


def test_passage_endpoint_requires_auth():
    resp = TestClient(app).get("/api/filing/AAPL/passage?chunk_index=0")
    assert resp.status_code in (401, 403)


# --------------------------------------------------------------------------- #
# 3. Ingestion — chunks are owned, and re-ingest can't cross users
# --------------------------------------------------------------------------- #

@pytest.mark.asyncio
async def test_ingest_stamps_user_id_and_scopes_delete(monkeypatch):
    from app.services import ingestion_service

    captured = {}

    class _CapturingVectorStore:
        def __init__(self, *a, **k):
            pass

        async def aadd_documents(self, docs):
            captured["docs"] = docs

    mock_supa = MagicMock()
    monkeypatch.setattr(ingestion_service, "get_supabase_client", lambda: mock_supa)
    monkeypatch.setattr(ingestion_service, "OpenAIEmbeddings", lambda *a, **k: MagicMock())
    monkeypatch.setattr(ingestion_service, "SupabaseVectorStore", _CapturingVectorStore)

    filing = {
        "content": "Risk factors. " * 200, "filing_type": "10-K",
        "filing_year": 2024, "filing_date": "2024-11-01", "url": "https://sec.gov/a",
    }
    await ingestion_service.ingest_filing("AAPL", filing, USER_A)

    # Every stored chunk is tagged with the owner.
    assert captured["docs"] and all(d.metadata["user_id"] == USER_A for d in captured["docs"])
    # The idempotent delete is scoped to this user (never a global wipe).
    delete_eq_calls = [c.args for c in mock_supa.mock_calls if c.args == ("metadata->>user_id", USER_A)]
    assert delete_eq_calls, "re-ingest delete must be scoped by metadata->>user_id"


@pytest.mark.asyncio
async def test_ingest_requires_user_id():
    from app.services.ingestion_service import ingest_filing
    with pytest.raises(ValueError):
        await ingest_filing("AAPL", {"content": "x"}, "")
