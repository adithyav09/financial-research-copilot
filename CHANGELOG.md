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

### Changed — production hardening (PR #21, #22)
- **Access model:** removed the manual access-request/approval flow — any authenticated user can use the copilot immediately (`require_approved` now only requires a valid session; profiles auto-created on first sight).
- **Usage control:** replaced per-user token budgets with **one shared application-wide monthly dollar budget** + per-user daily and rate limits. Cost is derived from real input/output token metadata (prompt/completion priced separately); monthly/daily totals are derived from timestamped usage — auto-reset, no cron. Concurrency-safe via a `pg_advisory_xact_lock` reservation. Ingestion is gated the same way. Config: `MONTHLY_BUDGET_USD`, `USER_DAILY_BUDGET_USD`, `USER_DAILY_TOKEN_LIMIT`, `RATE_LIMIT_PER_MINUTE`, `MAX_COST_PER_QUERY_USD`, `BUDGET_FAIL_OPEN`, `INGEST_COUNTS_TOWARD_BUDGET`.
- Admin dashboard now shows shared monthly budget status + per-user month spend (replaces per-user token bars / approve / grant flows).

### Security
- **Per-user retrieval isolation:** every vector-search / passage / metadata query is scoped by the authenticated `user_id` (chunks carry `metadata.user_id`; re-ingest delete is user-scoped). The backend uses the service-role key (RLS bypassed), so these app-layer filters are the enforcement boundary; RLS remains enabled on all tenant tables as defense-in-depth.
- **DB functions locked down:** all budget + legacy `SECURITY DEFINER` functions revoked from `anon`/`authenticated` (service-role only) with pinned `search_path`, closing PostgREST RPC exposure. Signup trigger unaffected. (migrations `003`, `004`)

### Distributed rate limiting
- **Redis-backed distributed rate limiter** (`app/core/ratelimit.py`) replaces the per-process in-memory limiter. A single **Lua sliding-window** script makes check-and-admit atomic across processes and instances, so N concurrent requests on any worker can't race past the per-user per-minute limit. Keys are **namespaced + versioned + hashed** (`{namespace}:rl:v1:{scope}:{blake2b(user_id)}`) — raw user ids never land in Redis/metrics/logs — and self-expire via `PEXPIRE`.
- **Graceful degradation, never unlimited:** with `REDIS_URL` unset (dev default) or Redis unreachable, it falls back to a **conservative, bounded, process-local** window. `RATE_LIMIT_FAIL_MODE` (`local` \| `closed` \| `open`, default `local`) governs the Redis-error path; degradation and Redis errors/latency are surfaced as metrics (`ratelimit.decision`, `ratelimit.redis_latency_ms`, `ratelimit.redis_error`, `ratelimit.degraded`) + structured logs. 429s now carry a `Retry-After` header.
- **Lifecycle + readiness:** Redis client initialized/closed in the FastAPI `lifespan`; new `GET /health/ready` reports the active backend (`redis` vs `in_memory`) without gating liveness. Config: `REDIS_URL`, `REDIS_NAMESPACE`, `REDIS_SOCKET_TIMEOUT_MS`, `REDIS_CONNECT_TIMEOUT_MS`, `REDIS_MAX_CONNECTIONS`, `RATE_LIMIT_FAIL_MODE`. `docker-compose.yml` ships a `redis:7-alpine` service. Ops guide: [`docs/operations-rate-limiting.md`](docs/operations-rate-limiting.md).

### Observability & evaluation
- Per-request tracing (`X-Trace-Id`), redacted structured JSON logs, in-process metrics at `GET /api/metrics`, opt-in Arize AX tracing. Every limit decision emits a `budget_denied` event + `budget.*` metric.
- **Online evaluators** (`ONLINE_EVAL_ENABLED`): cheap non-LLM per-request signals — retrieval-drift distributions (`eval.retrieved_chunks`, `eval.citations`) and regression tripwires (`eval.regression`) — into logs + `/api/metrics`. Offline RAGAS + retrieval-baseline harness under `backend/evals/`, with an answer-behavior gold set (`evals/datasets/eval_behaviors.jsonl`) for refusal/uncertainty/injection/grounding/tenant cases.

### Known limitations
- The shared *dollar* budget is DB-authoritative and multi-instance-safe; the *rate* limiter is now Redis-distributed too. Without `REDIS_URL`, rate limiting is process-local by design (documented dev/single-instance path).
- Historical `token_usage` rows predating the budget migration have `cost_usd = 0`, so month-to-date spend ignores pre-migration usage.

### Verification (release candidate `da4d7d4`, 2026-09-03)
- Backend `cd backend && pytest tests/ -q` → **105 passed**; frontend `cd frontend && npm run build` → **passes** (tsc + vite).
- Live smoke: server boots; `/api/health` 200; unauthenticated `/api/query` & `/api/ingest` → **401**; `/api/metrics` emits counters/histograms; structured JSON logs + `X-Trace-Id` present.
- Live DB: budget reserve→release round-trips clean; **monthly / daily-dollar / daily-token caps all deny**; budget `SECURITY DEFINER` functions **not** callable by `anon`/`authenticated`; RLS enabled on `document_chunks, ingestion_jobs, profiles, query_logs, token_usage`; migrations `003`/`004` applied.
- Not exercised here (requires a real user JWT + a live OpenAI call — credentials + cost): authenticated ingestion, SEC/XBRL processing, retrieval, answer generation, citation display, and a real online-evaluator recorded result through the API.

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
