# Product Guidelines — Scope, Vision & Governance

Condensed from "Financial Research Copilot — Scope, Product Vision, Access Control, Investor
Framework & Governance Blueprint" (source research compiled via Perplexity). This is the
canonical reference for what this project should and should not become. Any new feature
proposal should be checked against this document before being added to the roadmap.

## What This Product Is

A financial *research* assistant grounded in SEC regulatory filings (10-K, 10-Q, 8-K, DEF 14A,
S-1) and structured financial data (XBRL, Yahoo Finance). It answers natural-language questions
with source citations, presents a universal set of financial metrics, and supports multiple
analyst "lenses" (Value, Growth, Income, Quality, Conservative, ESG, Deep Dive, Activist/Short)
that change narrative framing — never the underlying data.

## Hard Boundaries — Never Build These

- Investment advice or recommendations (buy/sell/hold language)
- Predictions of future stock prices or earnings
- Claims that any extracted data is guaranteed accurate (LLMs hallucinate — always show sources)
- Anything resembling a licensed financial advisor / CPA relationship
- Ingestion or use of non-public, material (insider) information
- Trade execution, order routing, or brokerage/portfolio integration of any kind
- Retention of user query data beyond a short debugging window, or training models on it
- Persona/mode systems that surface *different data* per persona (only framing may differ —
  the underlying data panel is always complete and identical across lenses)

Every feature idea must be checked against this list. If a proposed feature would require any of
the above, do not suggest it — suggest a compliant alternative instead if one exists.

## Universal Financial Data Layer (already largely implemented)

Income statement: Revenue + YoY growth, Gross Profit/Margin, EBIT, EBITDA, Net Income, EPS
(basic/diluted), Operating Margin.
Balance sheet: Total Assets/Liabilities/Equity, Debt-to-Equity, Current/Quick Ratio, Book Value
per Share.
Cash flow: OCF, FCF, CapEx.
Valuation (live market data): P/E, PEG, P/B, EV/EBITDA, Dividend Yield, ROE, ROIC, Interest
Coverage Ratio.

## Already-Shipped Features (do not re-suggest — check CHANGELOG.md / README.md first)

- 10-K + 10-Q ingestion (parallel fetch)
- Smart query routing (live vs. filing questions)
- 7 analysis modes/personas
- Source citations on every answer
- Inline D3 charts (revenue, EPS, cash flow, debt) — on explicit request only
- Staleness alerts for newer 10-K availability
- Chat history restore
- Supabase OAuth + role-based auth with admin approval gate + token budget

## High-Value Feature Backlog (from Part 6 — pull from here first)

1. **Watchlist & Alerts** — tracked tickers auto-ingest new 10-K/10-Q/8-K filings and summarize
   material changes.
2. **Cross-Filing Trend View** — 3-5 year sparkline trend of universal metrics per ticker in the
   sidebar.
3. **Personal Research Library** — saved Q&A threads per ticker, organized by date, as a personal
   institutional memory.
4. **Quick Comparison Mode** — two tickers, universal metrics side-by-side over the same period.

## Governance & Ethics Guardrails for Any New Feature

- Data minimization — only collect what's strictly needed for the feature to work.
- Transparency — user must always know they're talking to an AI and where data comes from.
- Every claim must be traceable to a specific filing/section/page citation.
- RLS (Row-Level Security) must scope any new Supabase table to the owning user.
- No feature should imply human oversight is unnecessary (HITL must be preserved).

## Recruiter Narrative (Part 7)

The demo story is: dense regulatory filings → grounded RAG assistant with citations → explicit
non-advice scoping → production-grade access control, data governance, and AI ethics compliance.
New features should reinforce *one or more* of: system design depth, security rigor, AI/ML
engineering, data engineering, product judgment (knowing what NOT to build), or compliance
awareness. A feature that doesn't map to at least one of these six competencies is likely scope
creep for this project's purpose.
