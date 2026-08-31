---
type: concept
title: "Three-Phase RAG Pipeline"
aliases: [pre-retrieval, post-retrieval, retrieval pipeline, multi-stage rag]
status: draft
sources: ["[[src-optimizing-financial-retrieval-strategies]]", "[[src-metadata-driven-financial-rag]]"]
updated: 2026-08-20
---

A common organizing frame for financial [[financial-document-qa|RAG]] systems: a **three-phase approach — pre-retrieval, retrieval, and post-retrieval** ([[src-optimizing-financial-retrieval-strategies]]).

## The phases
- **Pre-retrieval** — enrich the inputs before search: "various query and corpus preprocessing techniques are employed to enrich input data" ([[src-optimizing-financial-retrieval-strategies]]); LLM-driven pre-retrieval filtering and indexing enhancements ([[src-metadata-driven-financial-rag]]). Includes [[financial-document-chunking]] and [[metadata-driven-rag]].
- **Retrieval** — find the evidence: fine-tuned domain embeddings plus a [[hybrid-retrieval|hybrid dense/sparse strategy]] ([[src-optimizing-financial-retrieval-strategies]]).
- **Post-retrieval** — refine what was retrieved before generation: [[reranking]], plus "Direct Preference Optimization (DPO) training and document selection methods to further refine the results" ([[src-optimizing-financial-retrieval-strategies]]).

The metadata-driven work uses the same shape, describing a "multi-stage RAG architecture" that "combines LLM-driven pre-retrieval optimizations with … contextual embeddings" ([[src-metadata-driven-financial-rag]]).

## Synthesis
This is the scaffold for the thesis's methods chapter: each technique article slots into exactly one phase, and the two most reliable wins reported across papers — contextual/metadata chunks (pre-retrieval) and reranking (post-retrieval) — sit at the two ends of the pipeline, with retrieval itself in the middle.
Draws on: [[src-optimizing-financial-retrieval-strategies]], [[src-metadata-driven-financial-rag]].

## See also
[[financial-document-qa]] · [[reranking]] · [[hybrid-retrieval]] · [[metadata-driven-rag]]
