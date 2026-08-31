---
type: technique
title: "Hybrid Retrieval"
aliases: [hybrid search, dense-sparse retrieval, dense retrieval, sparse retrieval]
status: draft
sources: ["[[src-financial-rag-reranking]]", "[[src-optimizing-financial-retrieval-strategies]]"]
updated: 2026-08-20
---

Combining lexical (full-text/sparse) and semantic (dense embedding) retrieval — the retrieval-phase workhorse of the [[three-phase-rag-pipeline]].

## Evidence
- A financial 10-K QA system "employs hybrid search combining full-text and semantic retrieval" as the stage before optional [[reranking]] ([[src-financial-rag-reranking]]).
- The three-phase pipeline "implemented a hybrid retrieval strategy that combines dense and sparse representations," paired with domain-fine-tuned embeddings ([[src-optimizing-financial-retrieval-strategies]]) — see [[embedding-fine-tuning]].

## Why it fits finance
Filings mix "domain-specific vocabulary and multi-hierarchical tabular data" ([[src-optimizing-financial-retrieval-strategies]]); lexical search catches exact terms (ticker symbols, line-item names, GAAP terms) that dense embeddings may blur, while dense search catches paraphrase — so the two are complementary. This repo currently relies on dense retrieval via `MultiQueryRetriever`; adding a sparse/lexical arm is the hybrid upgrade.

## See also
[[embedding-fine-tuning]] · [[reranking]] · [[three-phase-rag-pipeline]]