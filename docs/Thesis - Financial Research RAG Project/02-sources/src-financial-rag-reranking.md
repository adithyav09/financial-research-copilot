---
type: source
title: "Enhancing Financial Report Question-Answering: A Retrieval-Augmented Generation System with Reranking Analysis"
authors: [Zhiyuan Cheng, Longying Lai, Yue Liu, Kai Cheng, Xiaoxi Qi]
published: 2026-02-18
clipped: 2026-08-20
url: https://arxiv.org/abs/2603.16877
source-type: paper
raw: "[[01-raw/Enhancing Financial Report Question-Answering A Retrieval-Augmented Generation System with Reranking Analysis]]"
status: compiled
tags: [financial-rag, reranking, hybrid-retrieval, benchmark, finder]
---

## TL;DR
A RAG system for S&P 500 10-K QA that combines hybrid (full-text + semantic) search with an optional cross-encoder reranking stage; systematic evaluation on the FinDER benchmark shows reranking substantially improves answer quality.

## Key claims
- "Financial analysts face significant challenges extracting information from lengthy 10-K reports, which often exceed 100 pages."
- The pipeline "employs hybrid search combining full-text and semantic retrieval, followed by an optional reranking stage using a cross-encoder model."
- Evaluated on the **FinDER benchmark**, comprising 1,500 queries across five experimental groups.
- Reranking improved correctness for scores of 8 or above from **33.5% to 49.0%** — a 15.5 percentage-point improvement.
- The error rate for completely incorrect answers "decreases from 35.3 percent to 22.5 percent" with reranking.
- Findings "emphasize the critical role of reranking in financial RAG systems."
- arXiv:2603.16877 (v2, Apr 2026), Computation and Language (cs.CL).

## Relevance to thesis
Quantifies the payoff of a cross-encoder reranking stage for exactly this project's use case (10-K QA). The current pipeline uses `MultiQueryRetriever` without a reranker; this paper is the evidence base for adding one and the metric to beat.

## Concepts touched
[[financial-document-qa]] · [[reranking]] · [[hybrid-retrieval]] · [[financial-qa-benchmarks]]