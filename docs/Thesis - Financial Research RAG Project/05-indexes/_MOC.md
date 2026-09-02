---
type: index
title: "Map of Content"
updated: 2026-08-30
---

# Map of Content

The front door to the vault. Agents read this first when [[query|querying]]. Kept current by COMPILE and LINT.

> **Note on scope:** this vault holds two compiled topics — a **Claude Code Skills** knowledge base (a dogfood of the loop) and the thesis's core **financial-research / RAG** literature. The vault's `AGENTS.md` still declares only the financial-RAG domain; whether to broaden it or split vaults is logged in [[open-questions]].

## 💹 Financial-research RAG (compiled)

**Problem & framing**
- [[financial-document-qa]] — the hub: the task, why it's hard, technique map
- [[three-phase-rag-pipeline]] — pre-retrieval → retrieval → post-retrieval framing

**Indexing / pre-retrieval**
- [[financial-document-chunking]] — structural/element-type + contextual chunks
- [[metadata-driven-rag]] — LLM-generated metadata, contextual embeddings
- [[multimodal-financial-rag]] — tables & figures, modality-aware retrieval

**Retrieval**
- [[hybrid-retrieval]] — dense + sparse
- [[embedding-fine-tuning]] — domain-adapted / enriched embeddings

**Post-retrieval & beyond single-pass**
- [[reranking]] — cross-encoder reranking (strongest reported win)
- [[agentic-rag]] — iterative retrieve–reason–verify ⚠️ withdrawn source
- [[program-of-thought]] — executable code for arithmetic ⚠️ withdrawn source

**Evaluation & measurement**
- [[financial-qa-benchmarks]] — FinDER, FinanceBench, FinQA, ConvFinQA, TAT-QA, …
- [[rag-evaluation]] — RAGAS + LLM-as-a-judge; per-component metrics (faithfulness, precision/recall)
- [[llm-observability-tracing]] — OpenTelemetry/OpenInference tracing (Arize), runtime complement to eval

## 🧩 Claude Code Skills (compiled)

**Core**
- [[agent-skills]] — the hub: what Agent Skills are, format, positioning
- [[skill-md]] — the SKILL.md file, frontmatter, content lifecycle
- [[progressive-disclosure]] — the three-tier on-demand loading model

**Authoring**
- [[writing-skill-descriptions]] · [[skill-authoring-best-practices]] · [[allowed-tools]] · [[skill-security]]

**Distribution & storage**
- [[skill-storage-and-precedence]] · [[claude-code-plugins]] · [[plugin-marketplace]]

**Positioning & availability**
- [[skills-vs-other-extensibility]] · [[skills-across-surfaces]] · [[agent-skills-open-standard]]

**Surfaces & related concepts** (stubs)
- [[claude-code]] · [[claude-agent-sdk]] · [[claude-developer-platform]] · [[claude-ai]]
- [[model-context-protocol]] · [[slash-commands]] · [[subagents]] · [[hooks]] · [[claude-md-memory]]

## 🛠️ Implementation outputs
Engineering work on the reference implementation (`financial-research-copilot`), filed back as outputs.
- [[rag-eval-and-observability-buildlog]] — build log + interview narrative: tracing, the RAGAS/judge harness, the first baseline, and the debugging stories (grounds [[rag-evaluation]] · [[llm-observability-tracing]])

---
Other indexes: [[wiki-index]] · [[sources-log]] · [[open-questions]]