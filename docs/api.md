# API Reference

All endpoints are prefixed with `/api`. Authentication is required on all endpoints except `/api/health` — attach a Supabase JWT as `Authorization: Bearer <token>`.

---

## Health

### `GET /api/health`
Returns backend status. No auth required.

**Response**
```json
{ "status": "ok" }
```

---

## Ingestion

### `POST /api/ingest`
Fetches the latest 10-K (and 10-Q best-effort) from SEC EDGAR and stores embeddings in ChromaDB.

**Request**
```json
{ "ticker": "AAPL" }
```

**Response**
```json
{
  "status": "success",
  "ticker": "AAPL",
  "filing_type": "10-K",
  "message": "Successfully ingested 10-K for AAPL (filed 2024-11-01, 312 chunks) + 10-Q (2025-02-01, 148 chunks)",
  "chunks_processed": 460
}
```

---

## Query

### `POST /api/query`
Ask a question about a ticker. Routes to Yahoo Finance (live) or ChromaDB (filing) automatically.

**Request**
```json
{
  "ticker": "AAPL",
  "question": "What are the main risk factors?",
  "mode": "value",
  "session_id": "uuid"
}
```

**Response**
```json
{
  "answer": "Apple faces several key risks...",
  "mode": "value",
  "ticker": "AAPL",
  "citations": [
    {
      "text": "Excerpt from filing...",
      "source": "AAPL 10-K 2024 — chunk 3",
      "page": "12",
      "url": "https://www.sec.gov/..."
    }
  ],
  "tokens_used": 1420
}
```

**Modes**: `value` | `growth` | `income` | `quality` | `risk_averse` | `esg` | `activist`

---

## Status

### `GET /api/status/{ticker}`
Returns ingestion status for a ticker.

**Response**
```json
{
  "ticker": "AAPL",
  "status": "ready",
  "filing_type": "10-K",
  "filing_date": "2024-11-01",
  "filing_year": 2024,
  "chunk_count": 312,
  "chroma_collection": "AAPL_10-K_2024",
  "is_stale": false,
  "latest_sec_year": 2024
}
```

---

## Market Data

### `GET /api/market/{ticker}`
Returns live market data from Yahoo Finance.

### `GET /api/financials/{ticker}`
Returns historical XBRL financials from SEC EDGAR.

### `GET /api/news/{ticker}`
Returns recent news headlines for a ticker.

---

## Auth

### `GET /api/auth/me`
Returns the authenticated user's profile (tokens_consumed, role, is_approved).

### `POST /api/auth/request-access`
Submit an access request for a new user account.

---

## History

### `GET /api/history`
Returns paginated query history for the authenticated user, grouped by session.
