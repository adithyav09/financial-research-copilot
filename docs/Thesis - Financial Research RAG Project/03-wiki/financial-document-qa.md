---
type: concept
title: "Financial Document QA"
aliases: [financial QA, financial-rag, financial document question answering, financial RAG]
status: draft
sources: ["[[src-financial-rag-reranking]]", "[[src-multifinrag]]", "[[src-optimizing-financial-retrieval-strategies]]", "[[src-metadata-driven-financial-rag]]", "[[src-agentic-financial-rag-finagent]]"]
updated: 2026-08-20
---

**Financial Document QA** is the task of answering natural-language questions over corporate filings (10-Ks, 10-Qs, investor presentations) using retrieval-augmented generation. It is the core domain of this thesis and the problem this repository's copilot implements.

## Why it's hard
- Filings are long: 10-K reports "often exceed 100 pages" ([[src-financial-rag-reranking]]) and "span hundreds of pages" ([[src-multifinrag]]).
- Evidence is sparse and cross-referenced: RAG "struggles on long, structured financial filings where relevant evidence is sparse and cross-referenced" ([[src-metadata-driven-financial-rag]]).
- The data is multi-modal — "dense narrative text, structured tables, and complex figures" ([[src-multifinrag]]) — and finance documents have "domain-specific vocabulary and multi-hierarchical tabular data" ([[src-optimizing-financial-retrieval-strategies]]).
- Answers demand "complex multi-step numerical reasoning over heterogeneous evidence—structured tables, textual narratives, and footnotes" ([[src-agentic-financial-rag-finagent]]).
- Overall RAG quality "is dependent on the underlying retrieval system" ([[src-optimizing-financial-retrieval-strategies]]).

## The techniques (by pipeline stage)
The literature organizes solutions along a [[three-phase-rag-pipeline]] (pre-retrieval → retrieval → post-retrieval → generation):
- **Indexing / pre-retrieval:** [[financial-document-chunking]], [[metadata-driven-rag]], [[multimodal-financial-rag]]
- **Retrieval:** [[hybrid-retrieval]], [[embedding-fine-tuning]]
- **Post-retrieval:** [[reranking]]
- **Beyond single-pass:** [[agentic-rag]], [[program-of-thought]]

Progress is measured on [[financial-qa-benchmarks]].

## Synthesis
Two consistent signals across the corpus: (1) **retrieval quality dominates** end-to-end answer quality, so most gains come from indexing and post-retrieval refinement rather than the generator; and (2) **financial structure is signal, not noise** — element-type chunking, contextual metadata, and modality-aware handling of tables all beat treating a filing as flat prose. This repo's current pipeline (paragraph-ish chunking + `MultiQueryRetriever`, no reranker, text-only) sits at the baseline these papers improve on.
Draws on: [[src-financial-rag-reranking]], [[src-metadata-driven-financial-rag]], [[src-optimizing-financial-retrieval-strategies]].

## See also
[[three-phase-rag-pipeline]] · [[reranking]] · [[financial-qa-benchmarks]]
