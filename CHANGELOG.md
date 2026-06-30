# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- 10-Q ingestion support alongside 10-K (parallel fetch, separate ChromaDB collection)
- Live question routing — news/current/TTM queries bypass ChromaDB, answered from Yahoo Finance only
- Source citations on all responses (Yahoo Finance, XBRL, SEC filings)
- Always-visible Sources footer in chat bubbles
- `/api/news/{ticker}` endpoint for recent headlines
- TTM/MRQ financials and news headlines injected into RAG context
- Staleness detection — warns when a newer 10-K is available on SEC EDGAR
- Chat history restore — full Q&A reconstructed when selecting a past session
- `tests/` scaffold with unit and integration stubs
- `docs/` folder — architecture, API reference, deployment guide
- `scripts/` — `reset_chroma.py`, `check_env.py`
- `Makefile` for common dev commands
- `pyproject.toml` for backend tooling configuration
- `CONTRIBUTING.md`, `LICENSE`, `CHANGELOG.md`

### Fixed
- InlineCharts only renders when user explicitly requests a chart (removed auto-scan)
- News/live questions no longer fallback to 10-K filings (Seagate BIS settlement bug)
- Filing questions always verify ingestion before querying, even after a live session
- `news.py` route missing `Depends()` wrapper causing FastAPI startup crash
- Chat history fetched via backend service role (bypasses RLS)

---

## [0.1.0] — 2026-06-01

### Added
- Initial release: SEC 10-K ingestion + RAG Q&A with ChromaDB and LangChain
- Multi-mode analysis (Value, Growth, Income, Quality, Conservative, ESG, Deep Dive)
- Supabase authentication with role-based access control
- Market data panel with Yahoo Finance integration
- XBRL historical financials from SEC EDGAR
- D3 inline charts (revenue, EPS, cash flow, debt)
- Query history with session grouping
- Docker Compose deployment
