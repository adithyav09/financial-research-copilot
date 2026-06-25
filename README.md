# Financial Research Copilot

A full-stack RAG application that analyzes SEC 10-K filings with configurable research modes (Value / Growth), powered by LangChain and ChromaDB.

## Architecture

```
financial-research-copilot/
├── frontend/          # React + TypeScript + Vite + Tailwind CSS
├── backend/           # Python + FastAPI + LangChain + ChromaDB
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Docker

```bash
docker-compose up --build
```

## Features

- **Dynamic SEC Filing Ingestion** — Enter any public company ticker to fetch and process the latest 10-K
- **RAG-Powered Q&A** — Ask questions about filings with source citations
- **Research Modes** — Switch between Value and Growth analysis perspectives
- **Polished Fintech UI** — Dark theme, responsive layout, professional design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI |
| Vector DB | ChromaDB |
| RAG | LangChain, OpenAI |
| Deployment | Docker, Docker Compose |
