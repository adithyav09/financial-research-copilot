---
type: technique
title: "Metadata-Driven RAG"
aliases: [metadata-aware RAG, LLM-generated metadata]
status: draft
sources: ["[[src-metadata-driven-financial-rag]]"]
updated: 2026-08-20
---

Using **LLM-generated metadata** to enrich indexing and filtering — a pre-retrieval strategy in the [[three-phase-rag-pipeline]].

## The approach
A "multi-stage RAG architecture that leverages LLM-generated metadata," built on "a sophisticated indexing pipeline to create contextually rich document chunks" ([[src-metadata-driven-financial-rag]]). Benchmarked enhancements on FinanceBench span "pre-retrieval filtering, post-retrieval reranking, and enriched embeddings" ([[src-metadata-driven-financial-rag]]).

## Key findings
- "The most significant performance gains come from embedding chunk metadata directly with text ('contextual chunks')" — see [[financial-document-chunking]] and [[embedding-fine-tuning]] ([[src-metadata-driven-financial-rag]]).
- "A powerful reranker is essential for precision" — see [[reranking]] ([[src-metadata-driven-financial-rag]]).
- The optimal architecture "combines LLM-driven pre-retrieval optimizations with these contextual embeddings" ([[src-metadata-driven-financial-rag]]).
- A "custom metadata reranker" offers a "cost-effective alternative to commercial solutions" ([[src-metadata-driven-financial-rag]]).
- Presented as "a blueprint for building robust, metadata-aware RAG systems for financial document analysis" ([[src-metadata-driven-financial-rag]]).

## See also
[[financial-document-chunking]] · [[reranking]] · [[embedding-fine-tuning]] · [[three-phase-rag-pipeline]]