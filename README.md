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

Run `python scripts/check_env.py` to verify all variables are set.

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
