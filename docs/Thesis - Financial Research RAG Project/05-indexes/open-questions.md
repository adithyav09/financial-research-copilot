---
type: index
title: "Open Questions"
updated: 2026-08-20
---

# Open Questions

The vault's "known unknowns" — gaps, unresolved conflicts, and article candidates. Fed by every verb; doubles as the thesis's research backlog.

## Unresolved conflicts
- **"Claude Developer Platform" vs "Claude API".** The engineering blog names the API surface "Claude Developer Platform" ([[src-equipping-agents-for-the-real-world-with-agent-skills]]); the platform docs call it "Claude API" ([[src-agent-skills-overview]]). Merged into [[claude-developer-platform]] with both as aliases; confirm the canonical current name and pick one. → resolve by checking the live docs nav.

## Gaps to research
- **Vault domain mismatch.** `AGENTS.md` declares the domain as *financial-research / RAG*, but the compiled wiki is *Claude Code Skills*. Decide: broaden the domain statement, split into a second vault, or treat Skills as a methods chapter of the thesis. → user decision.
- **Financial-RAG papers un-ingested.** 6 arXiv papers sit in `01-raw/` (financial-report chunking; reranking QA; metadata-driven retrieval; agentic RAG / FinAgent-RAG; MultiFinRAG; retrieval-strategy optimization) with no source notes. → run INGEST → COMPILE on them.
  - Note: `Agentic Retrieval-Augmented Generation for Financial Document Question Answering` (arXiv:2605.05409) was **withdrawn (v2)** per its raw clip — flag credibility before citing.
- **Skill evaluation depth.** The best-practices guide asserts eval-driven development but the sources give no worked metric/benchmark for skill quality. → search for empirical skill-evaluation studies.

## Article candidates
- **`code-execution-tool`** — currently an alias of [[skills-across-surfaces]]; referenced enough (API container, progressive disclosure, sandbox) that it may deserve its own article. → promote if a 3rd source elaborates it.
- **`context-engineering`** — currently an alias of [[progressive-disclosure]]; a broader concept that may warrant its own hub as the wiki grows.
- **`skill-versioning`** — mentioned via `license`/`compatibility`/`metadata` fields but never fully documented in the sources. → gather a source, then promote.

## Verification follow-ups (for LINT)
- The engineering-blog clips originally came through a summarizing reader; load-bearing blog claims (launch date, "supported across 4 surfaces", open standard) were cross-checked against the docs clips during COMPILE. A clean verbatim re-pull would further harden [[agent-skills]] and [[agent-skills-open-standard]].