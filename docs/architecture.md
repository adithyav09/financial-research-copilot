# Architecture

## Overview

Financial Research Copilot is a full-stack RAG (Retrieval-Augmented Generation) application that lets users ask plain-English questions about public companies, answered using a combination of:

- **SEC EDGAR filings** (10-K annual, 10-Q quarterly) — ingested into ChromaDB
- **Yahoo Finance** (live price, TTM/MRQ financials, news headlines)
- **SEC EDGAR XBRL** (structured historical financial series)

## System Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                            │
│                                                                │
│  React + TypeScript + Vite + TailwindCSS                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  ChatPanel   │  │   Sidebar    │  │   Navbar / Auth    │   │
│  └──────┬───────┘  └──────────────┘  └────────────────────┘   │
│         │ REST (fetch via api/client.ts)                        │
└─────────┼──────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND (Python)                    │
│                                                                │
│  /api/query  /api/ingest  /api/status  /api/market  /api/news  │
│                                                                │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────────┐   │
│  │  rag_service│   │ sec_service  │   │  market_service   │   │
│  │  (LangChain)│   │ (EDGAR fetch)│   │  (yfinance)       │   │
│  └──────┬──────┘   └──────┬───────┘   └────────┬──────────┘   │
│         │                 │                     │              │
│         ▼                 ▼                     ▼              │
│  ┌─────────────┐  ┌──────────────┐   ┌──────────────────┐     │
│  │  ChromaDB   │  │  Supabase    │   │  OpenAI API      │     │
│  │  (vectors)  │  │  (jobs, logs)│   │  (embeddings+LLM)│     │
│  └─────────────┘  └──────────────┘   └──────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

## Query Routing

Every user question is classified as either **live** or **filing**:

| Question type | Keywords | Data source | Requires ingestion? |
|---|---|---|---|
| Live | news, latest, today, current, stock price, analyst, TTM, quarter | Yahoo Finance + XBRL | No |
| Filing | risk factors, strategy, revenue breakdown, balance sheet detail | ChromaDB 10-K/10-Q chunks | Yes |

## Data Flow — Ingestion

```
User clicks "Ingest" (or asks a filing question)
  → POST /api/ingest { ticker }
  → fetch_latest_10k(ticker)   ─── SEC EDGAR → HTML → text
  → fetch_latest_10q(ticker)   ─── SEC EDGAR → HTML → text  (best-effort)
  → ingest_filing()            ─── chunk → embed → ChromaDB
  → ingestion_jobs row updated in Supabase (status: ready)
```

## Data Flow — Query

```
User sends a question
  → POST /api/query { ticker, question, mode }
  → _is_live_question(question)?
      YES → fetch_market_data() + fetch_xbrl() → LLM (Yahoo Finance only prompt)
      NO  → ChromaDB similarity search (10-K + 10-Q) + fetch_market_data() → LLM (RAG prompt)
  → citations constructed from retrieved docs or data sources
  → query logged to Supabase query_logs
```

## Auth Flow

```
Browser → Supabase Auth (email/password)
  → JWT token stored in localStorage
  → attached as Bearer token to all /api/* requests
  → backend validates JWT with SUPABASE_JWT_SECRET
  → checks profiles.is_approved before allowing query/ingest
```

## Key Design Decisions

- **Two-path routing** keeps live questions fast (no ChromaDB lookup) and accurate (no stale filing data polluting news answers)
- **10-Q ingested alongside 10-K** in parallel on first ingest; stored as separate ChromaDB collection and Supabase row
- **ChromaDB on persistent Docker volume** (`chroma_data`) so vectors survive container restarts
- **User-scoped collections**: `query_filing` filters `ingestion_jobs` by `user_id` to prevent cross-user stale data
