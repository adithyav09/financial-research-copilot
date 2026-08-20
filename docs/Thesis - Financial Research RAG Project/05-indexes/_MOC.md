---
type: index
title: "Map of Content"
updated: 2026-08-20
---

# Map of Content

The front door to the vault. Agents read this first when [[query|querying]]. Kept current by COMPILE and LINT.

> **Note on scope:** this vault's `AGENTS.md` declares the domain as *financial-research / RAG*. The first compiled wiki is a **Claude Code Skills** knowledge base (a dogfood of the loop) — a distinct topic. The financial-RAG source papers in `01-raw/` are **not yet ingested**. See [[open-questions]].

## 🧩 Claude Code Skills (compiled)

**Core**
- [[agent-skills]] — the hub: what Agent Skills are, format, positioning
- [[skill-md]] — the SKILL.md file, frontmatter, content lifecycle
- [[progressive-disclosure]] — the three-tier on-demand loading model

**Authoring**
- [[writing-skill-descriptions]] — the description field & discovery
- [[skill-authoring-best-practices]] — degrees of freedom, eval-driven dev, anti-patterns
- [[allowed-tools]] — allowed/disallowed-tools & invocation control
- [[skill-security]] — trusted sources, malicious skills, self-granting

**Distribution & storage**
- [[skill-storage-and-precedence]] — where skills live, precedence
- [[claude-code-plugins]] — bundling skills + agents + hooks + MCP
- [[plugin-marketplace]] — official / community / demo marketplaces

**Positioning & availability**
- [[skills-vs-other-extensibility]] — vs CLAUDE.md / slash commands / subagents / hooks / MCP
- [[skills-across-surfaces]] — Claude Code / API / claude.ai / Agent SDK matrix
- [[agent-skills-open-standard]] — agentskills.io portability

**Surfaces & related concepts** (stubs)
- [[claude-code]] · [[claude-agent-sdk]] · [[claude-developer-platform]] · [[claude-ai]]
- [[model-context-protocol]] · [[slash-commands]] · [[subagents]] · [[hooks]] · [[claude-md-memory]]

## 💹 Financial-research RAG (not yet compiled)
_Source papers sit in `01-raw/` awaiting INGEST → COMPILE: financial-report chunking, reranking, metadata-driven retrieval, agentic RAG, MultiFinRAG, retrieval-strategy optimization._
- _(no articles yet)_

---
Other indexes: [[wiki-index]] · [[sources-log]] · [[open-questions]]