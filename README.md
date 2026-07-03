# Financial Research Copilot

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

A full-stack AI research assistant that answers plain-English questions about any public company using:
- **SEC EDGAR** 10-K (annual) and 10-Q (quarterly) filings — ingested into a vector store
- **Yahoo Finance** — live price, TTM/MRQ financials, analyst ratings, and news headlines
- **SEC XBRL** — structured multi-year historical financial series

Questions about current data (news, stock price, analyst ratings) are answered directly from Yahoo Finance with no ingestion required. Questions about filings (risk factors, strategy, balance sheet detail) retrieve relevant chunks from ChromaDB.

---

## Features

- **Smart query routing** — live questions skip ChromaDB and answer from Yahoo Finance only
- **10-K + 10-Q ingestion** — both fetched in parallel on first ask; 10-Q chunks take priority as more recent
- **7 analysis modes** — Value, Growth, Income, Quality, Conservative, ESG, Deep Dive
- **Source citations** — every answer includes a Sources panel linking back to the original filing or data source
- **Inline D3 charts** — revenue, EPS, cash flow, debt — only rendered when explicitly requested
- **Staleness alerts** — warns when a newer 10-K is available on SEC EDGAR
- **Chat history** — past sessions restored with full Q&A
- **Role-based auth** — Supabase authentication with admin approval gate and token budget

---

## Directory Structure

```
financial-research-copilot/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── api/routes/         # FastAPI route handlers
│   │   ├── core/               # Config, auth, DB client, ChromaDB client
│   │   ├── models/             # Pydantic schemas
│   │   └── services/           # Business logic (RAG, SEC, market, XBRL, ingestion)
│   ├── tests/
│   │   ├── unit/               # Unit tests (no external I/O)
│   │   └── integration/        # Integration tests (TestClient)
│   ├── requirements.txt
│   ├── pyproject.toml          # Tool config (pytest, black, ruff)
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/                # Backend API client
│   │   ├── components/         # UI components (ChatPanel, Sidebar, charts/)
│   │   ├── context/            # AuthContext
│   │   ├── lib/                # Supabase client init
│   │   └── types/              # Shared TypeScript interfaces
│   ├── Dockerfile
│   └── .env.example
│
├── docs/
│   ├── architecture.md         # System design and data flow
│   ├── api.md                  # Full API reference
│   └── deployment.md           # Local, Docker, and production setup
│
├── scripts/
│   ├── reset_chroma.py         # Wipe all ChromaDB collections
│   └── check_env.py            # Verify all required env vars are set
│
├── supabase/                   # DB migrations
├── docker-compose.yml
├── Makefile                    # Common dev commands
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.11+, Node.js 18+
- OpenAI API key
- Supabase project ([free tier](https://supabase.com))

### 1. Clone & configure

```bash
git clone https://github.com/your-username/financial-research-copilot.git
cd financial-research-copilot

cp backend/.env.example backend/.env    # fill in your keys
cp frontend/.env.example frontend/.env
```

`backend/.env` needs, at minimum: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`. Get the Supabase values from your project's **Settings → API** page. `frontend/.env` needs the matching `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

Run `python scripts/check_env.py` to verify all variables are set.

#### Supabase setup (auth + database)

1. Create a free project at [supabase.com](https://supabase.com).
2. Run the SQL files under `supabase/migrations/` in the SQL editor (in order) to create the `profiles`, `access_requests`, `ingestion_jobs`, and `query_logs` tables plus the `increment_tokens_consumed` RPC.
3. Enable **GitHub** as an OAuth provider under **Authentication → Providers**, and register an OAuth app in your GitHub account settings with the callback URL Supabase gives you.
4. The first user who signs in has `role = pending` by default and won't be able to query or ingest until an admin approves them (`POST /api/auth/approve/{user_id}`). To bootstrap your first admin, sign in once, then manually set `role = 'admin'` for your row in the `profiles` table via the Supabase dashboard.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Docker (alternative)

```bash
docker-compose up --build
```

Backend: http://localhost:8000 · Frontend: http://localhost:5173

---

## Testing the API without the frontend (Swagger / curl)

Sign-in is GitHub OAuth, handled client-side by the Supabase JS SDK — there's no backend login endpoint that issues a token. Every protected route expects a Supabase access token in an `Authorization: Bearer <token>` header (see `app/core/auth.py`).

To exercise the API directly (e.g. via the FastAPI docs at http://localhost:8000/docs) without going through the GitHub OAuth flow each time, use the dev helper script, which creates (once) and signs in as a fixed local test user via the Supabase admin API:

```bash
cd backend && source .venv/bin/activate
python scripts/get_test_token.py
```

This prints an access token. To use it:

- **Swagger UI**: open `/docs`, click **Authorize**, paste the token (no `Bearer` prefix), click **Authorize** → **Close**. All protected endpoints will now send it automatically.
- **curl**:
  ```bash
  TOKEN=$(python scripts/get_test_token.py 2>/dev/null)
  curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/auth/me
  ```

Notes:
- The script reuses the same test identity every run (override with `TEST_EMAIL`/`TEST_PASSWORD` env vars); only the token itself is short-lived (~1 hour) and needs to be re-minted after it expires.
- A freshly created test user has no `profiles` row until your Supabase project's signup trigger creates one, and defaults to `role = pending`. `GET /api/auth/me` will 404 until the row exists; `POST /api/query` and `POST /api/ingest` will 403 until the role is `approved` or `admin`. Set the role directly in the `profiles` table for local testing.
- This script requires `SUPABASE_SERVICE_KEY` in `backend/.env` (admin-level) — never expose that key to the frontend or commit it.

---

## Running Tests

```bash
cd backend
pip install pytest pytest-asyncio
pytest tests/ -v
```

Or via Makefile from the project root:
```bash
make test
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, D3.js |
| Backend | Python 3.11, FastAPI, LangChain |
| LLM / Embeddings | OpenAI (gpt-4o-mini, text-embedding-3-small) |
| Vector DB | ChromaDB |
| Database / Auth | Supabase (PostgreSQL + Row Level Security) |
| Live Market Data | Yahoo Finance (yfinance) |
| Filing Data | SEC EDGAR REST API + XBRL |
| Deployment | Docker, Docker Compose |

---

## Documentation

- [Architecture & data flow](docs/architecture.md)
- [API reference](docs/api.md)
- [Deployment guide](docs/deployment.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

---

## License

MIT — see [LICENSE](LICENSE)
