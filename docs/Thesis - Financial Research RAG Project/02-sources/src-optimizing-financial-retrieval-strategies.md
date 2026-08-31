---
type: source
title: "Optimizing Retrieval Strategies for Financial Question Answering Documents in Retrieval-Augmented Generation Systems"
authors: [Sejong Kim, Hyunseo Song, Hyunwoo Seo, Hyunjun Kim]
published: 2025-03-19
clipped: 2026-08-20
url: https://arxiv.org/abs/2503.15191
source-type: paper
raw: "[[01-raw/Optimizing Retrieval Strategies for Financial Question Answering Documents in Retrieval-Augmented Generation Systems]]"
status: compiled
tags: [financial-rag, three-phase-pipeline, embeddings, hybrid-retrieval, dpo, benchmark]
---

## TL;DR
An end-to-end financial RAG pipeline structured in three phases — pre-retrieval (query/corpus preprocessing), retrieval (fine-tuned embeddings + hybrid dense/sparse), and post-retrieval (DPO training + document selection) — evaluated across seven financial QA datasets with a replicable GitHub pipeline (GAR).

## Key claims
- "RAG has emerged as a promising framework to mitigate hallucinations in LLMs, yet its overall performance is dependent on the underlying retrieval system."
- Finance documents like 10-K reports "pose distinct challenges due to domain-specific vocabulary and multi-hierarchical tabular data."
- The pipeline uses a **three-phase approach: pre-retrieval, retrieval, and post-retrieval.**
- Pre-retrieval: "various query and corpus preprocessing techniques are employed to enrich input data."
- Retrieval: "fine-tuned state-of-the-art (SOTA) embedding models with domain-specific knowledge" and "a hybrid retrieval strategy that combines dense and sparse representations."
- Post-retrieval: "leverages Direct Preference Optimization (DPO) training and document selection methods to further refine the results."
- Evaluated on seven datasets: FinDER, FinQABench, FinanceBench, TATQA, FinQA, ConvFinQA, and MultiHiertt.
- A "fully replicable pipeline is available on GitHub" (GAR: github.com/seohyunwoo-0407/GAR).
- arXiv:2503.15191 (v1, Mar 2025); Information Retrieval (cs.IR).

## Relevance to thesis
Provides the canonical **three-phase pipeline framing** (pre/retrieval/post) that can organize the thesis's methods chapter, plus concrete techniques (domain-fine-tuned embeddings, hybrid dense+sparse, DPO) directly applicable to improving this project's retrieval quality.

## Concepts touched
[[financial-document-qa]] · [[three-phase-rag-pipeline]] · [[embedding-fine-tuning]] · [[hybrid-retrieval]] · [[reranking]] · [[financial-qa-benchmarks]]