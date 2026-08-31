---
type: source
title: "Metadata-Driven Retrieval-Augmented Generation for Financial Question Answering"
authors: [Michail Dadopoulos, et al.]
published: 2025-10-28
clipped: 2026-08-20
url: https://arxiv.org/abs/2510.24402
source-type: paper
raw: "[[01-raw/Metadata-Driven Retrieval-Augmented Generation for Financial Question Answering]]"
status: compiled
tags: [financial-rag, metadata, contextual-chunks, reranking, embeddings, financebench]
---

## TL;DR
A multi-stage RAG architecture using **LLM-generated metadata**, benchmarked on FinanceBench; finds that embedding chunk metadata directly with text ("contextual chunks") gives the largest gain, a reranker is essential for precision, and a custom metadata reranker is a cost-effective alternative to commercial ones.

## Key claims
- "RAG struggles on long, structured financial filings where relevant evidence is sparse and cross-referenced."
- Proposes a "novel, multi-stage RAG architecture that leverages LLM-generated metadata" with a "sophisticated indexing pipeline to create contextually rich document chunks."
- Benchmarks enhancements on **FinanceBench**: pre-retrieval filtering, post-retrieval reranking, and enriched embeddings.
- "While a powerful reranker is essential for precision, the most significant performance gains come from embedding chunk metadata directly with text ('contextual chunks')."
- Optimal architecture "combines LLM-driven pre-retrieval optimizations with these contextual embeddings."
- Presents a "custom metadata reranker" as a "compelling, cost-effective alternative to commercial solutions," a trade-off between peak performance and operational efficiency.
- Positioned as "a blueprint for building robust, metadata-aware RAG systems for financial document analysis."
- arXiv:2510.24402 (v1, Oct 2025); Information Retrieval (cs.IR), cs.AI, cs.CE.

## Relevance to thesis
Contextual chunks (metadata embedded with text) and LLM-generated metadata are concrete, high-leverage upgrades to this project's indexing step, and the custom-vs-commercial reranker trade-off maps onto the project's cost/token-budget concerns.

## Concepts touched
[[financial-document-qa]] · [[metadata-driven-rag]] · [[financial-document-chunking]] · [[reranking]] · [[embedding-fine-tuning]] · [[three-phase-rag-pipeline]] · [[financial-qa-benchmarks]]