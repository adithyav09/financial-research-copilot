---
type: technique
title: "Reranking"
aliases: [cross-encoder reranking, neural reranking, metadata reranker, reranker]
status: draft
sources: ["[[src-financial-rag-reranking]]", "[[src-metadata-driven-financial-rag]]"]
updated: 2026-08-20
---

A post-retrieval stage (see [[three-phase-rag-pipeline]]) that re-scores retrieved candidates — typically with a **cross-encoder** — before they reach the generator. The most consistently validated single win in the financial-RAG corpus.

## Evidence
- A cross-encoder reranking stage over [[hybrid-retrieval|hybrid search]] results raised correctness (scores ≥8) from **33.5% to 49.0% — a 15.5 percentage-point improvement** — and cut the completely-incorrect error rate from **35.3% to 22.5%** on the FinDER benchmark ([[src-financial-rag-reranking]]). The authors "emphasize the critical role of reranking in financial RAG systems" ([[src-financial-rag-reranking]]).
- The metadata study concurs that "a powerful reranker is essential for precision," and contributes a **custom metadata reranker** as a "cost-effective alternative to commercial solutions," framing a trade-off between peak performance and operational efficiency ([[src-metadata-driven-financial-rag]]).

## Synthesis
Reranking is the highest-ROI, lowest-friction addition for this repo: it bolts onto the existing retriever without re-indexing and has the strongest reported effect size. The open design choice is the custom-vs-commercial reranker trade-off ([[src-metadata-driven-financial-rag]]), which maps onto the project's token/cost-budget constraints.
Draws on: [[src-financial-rag-reranking]], [[src-metadata-driven-financial-rag]].

## See also
[[hybrid-retrieval]] · [[metadata-driven-rag]] · [[financial-qa-benchmarks]]