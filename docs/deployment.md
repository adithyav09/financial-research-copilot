# Deployment Guide

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker + Docker Compose (optional)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Fill in your API keys
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env               # Set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

---

## Docker Compose (recommended)

```bash
cp backend/.env.example backend/.env    # Fill in keys
cp frontend/.env.example frontend/.env
docker-compose up --build
```

Services:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **ChromaDB data**: persisted in `chroma_data` Docker volume

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI API key for embeddings + LLM |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | ✅ | Anon key for JWT validation |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret from Supabase dashboard |
| `SEC_USER_AGENT` | ✅ | Required by SEC EDGAR (`Name email@domain.com`) |
| `CHROMA_PATH` | ✅ | Path to ChromaDB storage (`./chroma_db`) |
| `LLM_MODEL` | | OpenAI model name (default: `gpt-4o-mini`) |
| `EMBEDDING_MODEL` | | Embedding model (default: `text-embedding-3-small`) |
| `CHUNK_SIZE` | | Text chunk size (default: `1000`) |
| `CHUNK_OVERLAP` | | Chunk overlap (default: `200`) |
| `RETRIEVAL_K` | | Number of chunks to retrieve (default: `5`) |
| `FRED_API_KEY` | | FRED API key (optional, for macro data) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Backend URL (`http://localhost:8000`) |
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |

---

## Production Deployment

### Backend (Railway / Render / Fly.io)
1. Set all environment variables in the platform dashboard
2. Ensure `chroma_db/` is mounted as a persistent volume
3. Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` as start command

### Frontend (Netlify / Vercel)
1. Set `VITE_API_BASE_URL` to your backend's production URL
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build`; publish directory: `dist/`

### Supabase Setup
1. Run `supabase/migrations/increment_tokens_rpc.sql` in the SQL editor
2. Run `backend/supabase_schema.sql` to create all tables
3. Enable RLS on all tables (policies defined in schema)
4. Copy JWT secret from `Settings → API → JWT Secret`

---

## Running Tests

```bash
cd backend
pip install pytest pytest-asyncio
pytest tests/ -v
```
