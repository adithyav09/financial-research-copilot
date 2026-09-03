# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All backend commands assume `backend/.venv` exists and is activated. The `Makefile` at the repo root wraps the common ones:

```bash
make dev-backend      # uvicorn app.main:app --reload --port 8000  (run from backend/)
make dev-frontend     # vite dev server on :5173  (run from frontend/)
make test             # cd backend && pytest tests/ -v
make lint             # ruff check app/   (from backend/)
make format           # black app/        (from backend/)
make check-env        # python scripts/check_env.py — verify required env vars
make reset-chroma     # wipe all ChromaDB collections (interactive)
make docker-up        # docker-compose up --build  (backend :8000, frontend :5173)
```

Run a single backend test:
```bash
cd backend && source .venv/bin/activate
pytest tests/unit/test_rag_service.py -v
pytest tests/unit/test_rag_service.py::test_name -v
```

Frontend build/typecheck: `cd frontend && npm run build` (runs `tsc && vite build`). There is no frontend test suite or lint step.

Backend tool config (pytest markers, black, ruff) lives in `backend/pyproject.toml`. Env vars are loaded from `backend/.env` via `pydantic-settings` (see `app/core/config.py` for the full list and defaults). Required for real use: `openai_api_key`, `supabase_url`, `supabase_service_key`, `supabase_anon_key`.

## Architecture

> Human-facing version with the system diagram: [`docs/architecture.md`](docs/architecture.md).

Full-stack RAG assistant answering plain-English questions about public companies from SEC filings + live market data. FastAPI backend, React/Vite frontend, ChromaDB vector store, Supabase (Postgres) for auth + metadata.

### The central concept: live vs. filing question routing

The single most important design decision is **query routing based on keyword matching**. `LIVE_QUESTION_PATTERNS` (a list of ~24 substrings like "news", "stock price", "analyst", "q1", "ttm") lives in **exactly one place** — `backend/app/services/rag_service.py` (`_is_live_question`). The **backend is the single source of truth**; the frontend does no keyword classification. (This was previously duplicated in `App.tsx`, which caused "ticker not found" divergence bugs — do not reintroduce a frontend copy.)

- **Live questions** (a pattern matches) → skip ChromaDB entirely, answer *only* from Yahoo Finance market data + news. No ingestion required. Citations point at Yahoo Finance article URLs / XBRL.
- **Filing questions** (no pattern matches) → require an ingested filing. If none exists for the requesting user, `POST /api/query` returns **`409 {needs_ingestion: true, ticker}`**; the frontend (`App.tsx` `submitQuery`) then calls `/ingest`, polls `/status`, and retries the same question once. Otherwise it retrieves chunks from ChromaDB (10-K + 10-Q) and supplements with live data. Citations point at filing chunks with a `sec_url`.

`query_filing()` in `rag_service.py` branches on this flag throughout — it builds different prompts (`live_prompt` vs `filing_prompt`), retrieves docs only for filing questions, and constructs citations differently for each path. The `/api/query` route's ingestion guard is **user-scoped** (checks `ingestion_jobs` for `status=ready` AND `user_id`) so it never disagrees with what `query_filing` can actually load.

### Ingestion flow

`POST /api/ingest` (`routes/ingest.py`) fetches the latest **10-K (required) and 10-Q (best-effort) in parallel** via `asyncio.gather`, then chunks + embeds each into ChromaDB (`ingestion_service.ingest_filing`). Each filing becomes its own ChromaDB collection named **`{TICKER}_{FILING_TYPE}_{YEAR}`** (e.g. `AAPL_10-K_2024`) and its own row in the Supabase `ingestion_jobs` table (status `processing` → `ready`/`failed`). 10-K and 10-Q are tracked as separate rows sharing the same ticker.

At query time `query_filing` pulls all `ready` jobs for the ticker, picks the most recent 10-K as primary (for `sec_url`), and merges 10-Q retrieval results ahead of 10-K results (10-Q is more recent, so it takes priority). Retrieval uses LangChain `MultiQueryRetriever` over each collection.

### Data sources (backend/app/services/)

- `sec_service.py` — SEC EDGAR REST API: resolves ticker→CIK, fetches latest 10-K/10-Q document text. Requires a descriptive `sec_user_agent` header.
- `market_service.py` — Yahoo Finance (`yfinance`): live price, valuation ratios, TTM/MRQ financials, analyst rating, news headlines.
- `xbrl_service.py` — SEC EDGAR XBRL company-facts API: multi-year historical financial *series* (revenue, net income, cash flow, etc.) used for trend context and the on-demand Visualize chart builder (`frontend/src/components/charts/VisualizeBuilder.tsx` + `MetricChart.tsx`).
- `rag_service.py` — orchestrates all of the above into the LLM prompt. Market + XBRL fetches are **best-effort** (wrapped in try/except, never fail the query).

### Depth control (replaced the 7 analysis-mode personas)

The Thesis redesign replaced the 7 `AnalysisMode` personas with a `Depth` enum (`models/schemas.py`): `simple` (defines jargon inline via `EDUCATIONAL_INSTRUCTION`) and `analyst` (professional register, no inline definitions). Prompts live in `DEPTH_SYSTEM_PROMPTS` (`rag_service.py`). **Depth changes only narrative framing/register, never the underlying data** (the same hard product rule that governed modes — see below). Every depth prompt is prefixed with `DISCLAIMER` + `NO_ADVICE_INSTRUCTION`. `AnalysisMode` and `mode` request fields remain accepted for backward compatibility but no longer select prompts; the depth value is logged into the free-text `query_logs.mode` column.

### Structured answers

`query_filing` asks the LLM for a JSON contract (OpenAI JSON mode with plain-call fallback): takeaway, ≤3 metric cards, narrative markdown with `[N]` markers, optional chart spec (keys validated against `XBRL_CHART_KEYS`), and follow-ups. `_parse_structured_answer` hardens the reply and returns `None` on any failure, in which case the raw text renders as a plain markdown answer — never let structure break answering. Chart data never travels in the answer; the frontend renders requested series from its own `/xbrl` data (`StructuredAnswerView.tsx`).

### In-app filing viewer

Filing citations carry `chunk_index` + `filing_type`; `GET /api/filing/{ticker}/passage` (`routes/filing.py`) returns the cited chunk ± neighbors from `document_chunks`. Clicking an inline citation badge or filing source chip opens `FilingViewer.tsx` beside the chat. Live-data citations (news/quotes) keep external links.

### Auth (Supabase) + shared usage budget

`app/core/auth.py`: bearer token is verified by calling Supabase `/auth/v1/user` (no local JWT decoding). A `profiles` row is loaded (auto-created on first sight). **There is no access-approval step** — every authenticated user can use the copilot immediately. FastAPI dependencies:
- `get_current_user` — any authenticated user
- `require_approved` — kept as an alias; now just requires a valid session (no role gate). Gates `/query`, `/ingest`, etc.
- `require_admin` — admin-only endpoints (role `admin`)

Usage is bounded by **one shared application-wide monthly dollar budget** plus per-user safeguards, not per-user token budgets (`app/core/budget.py`, migration `003_shared_monthly_budget.sql`). Before each model call, `/query` enforces, in order: (1) per-user **rate limit** — a **Redis-backed distributed sliding window** (`app/core/ratelimit.py`) atomic across processes/instances via a single Lua script; keys are namespaced + versioned + hashed (`{namespace}:rl:v1:{scope}:{blake2b(user_id)}`) and self-expire. When `REDIS_URL` is unset (dev) or Redis is unreachable it degrades to a **conservative, bounded, process-local** fallback (never unlimited), governed by `RATE_LIMIT_FAIL_MODE` (`local`|`closed`|`open`); the degradation is emitted as logs + metrics. Redis is initialized/closed in the FastAPI `lifespan`; `GET /health/ready` reports the active backend (`redis` vs `in_memory`). (2) `reserve_budget()` — a `pg_advisory_xact_lock`-guarded RPC that atomically checks the **global monthly** + **per-user daily** caps and pre-charges a conservative estimate, so concurrent requests can't overspend. After the call, `record()` reconciles the reservation to the **actual cost** (from real input/output token metadata, priced separately via `budget.cost_usd` → config overrides or `observability.estimate_cost_usd`). Spend is stored on `token_usage.cost_usd`; the monthly/daily totals are **derived by summing the current UTC month/day** — they reset automatically, no cron. Limits are env-configured (`MONTHLY_BUDGET_USD`, `USER_DAILY_BUDGET_USD`, `USER_DAILY_TOKEN_LIMIT`, `RATE_LIMIT_PER_MINUTE`, `MAX_COST_PER_QUERY_USD`). Limit errors return **429** with a friendly message and no internal cost detail. `/ingest` is gated the same way (rate limit always; budget when `INGEST_COUNTS_TOWARD_BUDGET`). Two policy flags are explicit + configurable: `BUDGET_FAIL_OPEN` (on a budget-infra error, allow+record vs. 503) and `INGEST_COUNTS_TOWARD_BUDGET`. Every limit decision emits a `budget_denied` event + `budget.denied` metric.

### Online evaluators (`app/core/online_eval.py`)

After each answer, cheap **non-LLM** checks emit quality signals into the existing observability layer (logs + `GET /api/metrics`): retrieval-drift distributions (`eval.retrieved_chunks`, `eval.citations`) and regression tripwires (`eval.regression{check=empty_retrieval|no_citations|structured_parse_failed|possible_advice}`, plus `eval.total` for a pass-rate). No model calls, no cost; feature-flagged via `ONLINE_EVAL_ENABLED`; fully best-effort (never affects the response). The offline RAGAS + retrieval-baseline harness in `backend/evals/` remains the deeper, batch evaluator.

### Admin dashboard

`AdminDashboard.tsx` (navbar profile menu, admin role only) shows the **shared monthly budget status** (spent / limit / remaining, request count, active per-user safeguards) and the user list with each user's **this-month spend** for abuse-spotting, plus set-role (admin vs. user). Backed by `/api/auth/usage-summary` (`get_budget_status` RPC) and `/api/auth/users` (`get_user_month_spend` RPC), both gated by `require_admin`. The old approve/deny, grant-tokens, and pending-request flows were removed.

### Frontend flow

`frontend/src/App.tsx` is the orchestrator. `ensureIngestedThenQuery` mirrors the backend routing: live questions fire immediately; filing questions check `/api/status/{ticker}`, trigger ingest if needed, and **poll** status until `ready` before querying. The API client (`src/api/client.ts`) attaches the Supabase access token to every request. Staleness: `/api/status` compares the ingested 10-K year against the latest on SEC EDGAR and returns `is_stale`, surfaced as a banner. D3 charts (`src/components/charts/`) render inline **only when explicitly requested** in the question.

## Product boundaries (read docs/product-guidelines.md before proposing features)

This is a **research** tool, deliberately *not* an advisor. `docs/product-guidelines.md` is the canonical scope document — check any feature idea against its "Hard Boundaries" list. Never build: buy/sell/hold recommendations, price/earnings predictions, trade execution or brokerage integration, insider-data ingestion, per-persona data differences (framing may differ, data panel must stay identical), or long-term retention/training on user queries. The `NO_ADVICE_INSTRUCTION` prompt guard and universal disclaimer exist to enforce this at the LLM layer.