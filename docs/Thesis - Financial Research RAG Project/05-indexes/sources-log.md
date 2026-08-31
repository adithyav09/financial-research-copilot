---
type: index
title: "Sources Log"
updated: 2026-08-30
---

# Sources Log

Every source in `02-sources/`. Appended by INGEST, reconciled by LINT. `status`: `summarized` → `compiled`.

## Financial-research RAG
| Source | Type | Published | Clipped | Status |
|--------|------|-----------|---------|--------|
| [[src-financial-report-chunking]] | paper | 2024-02-05 | 2026-08-20 | compiled |
| [[src-optimizing-financial-retrieval-strategies]] | paper | 2025-03-19 | 2026-08-20 | compiled |
| [[src-multifinrag]] | paper | 2025-06-25 | 2026-08-20 | compiled |
| [[src-metadata-driven-financial-rag]] | paper | 2025-10-28 | 2026-08-20 | compiled |
| [[src-financial-rag-reranking]] | paper | 2026-02-18 | 2026-08-20 | compiled |
| [[src-agentic-financial-rag-finagent]] | paper | 2026-05-06 | 2026-08-20 | compiled ⚠️ withdrawn |
| [[src-observability-eval-implementation]] | note | 2026-08-30 | 2026-08-30 | compiled |

> `src-observability-eval-implementation` is a **first-person engineering log** (primary source = the repo, branch `feature/arize-observability`), not an external paper. It grounds [[rag-evaluation]], [[llm-observability-tracing]], and the [[rag-eval-and-observability-buildlog]] output.

> ⚠️ `src-agentic-financial-rag-finagent` (arXiv:2605.05409) was **withdrawn by its authors**; compiled with all its numeric claims marked unverified. See [[open-questions]].

## Claude Code Skills
| Source | Type | Published | Clipped | Status |
|--------|------|-----------|---------|--------|
| [[src-equipping-agents-for-the-real-world-with-agent-skills]] | article | 2025-10-16 | 2026-08-16 | compiled |
| [[src-agent-skills-overview]] | docs | 2026-08-16? | 2026-08-16 | compiled |
| [[src-skill-authoring-best-practices]] | docs | 2026-08-16? | 2026-08-16 | compiled |
| [[src-claude-code-skills]] | docs | 2026-08-16? | 2026-08-16 | compiled |
| [[src-claude-code-discover-install-plugins-marketplaces]] | docs | 2026-08-16? | 2026-08-16 | compiled |
| [[src-agent-skills-in-the-agent-sdk]] | docs | 2026-08-16? | 2026-08-16 | compiled |

> Skills provenance: docs pages carry no on-page date (`?`). Engineering blog by Barry Zhang, Keith Lazuka & Mahesh Murag (2025-10-16; open-standard update 2025-12-18). Six canonical sources after deduping 11 lane clips.