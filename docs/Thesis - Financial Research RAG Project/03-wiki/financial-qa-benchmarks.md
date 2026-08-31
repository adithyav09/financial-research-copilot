---
type: reference
title: "Financial QA Benchmarks"
aliases: [FinDER, FinanceBench, FinQA, ConvFinQA, TAT-QA, TATQA, FinQABench, MultiHiertt]
status: draft
sources: ["[[src-optimizing-financial-retrieval-strategies]]", "[[src-financial-rag-reranking]]", "[[src-metadata-driven-financial-rag]]", "[[src-agentic-financial-rag-finagent]]"]
updated: 2026-08-20
---

The evaluation datasets used across the financial [[financial-document-qa|RAG]] corpus. The retrieval-optimization study alone evaluates on **seven**: "FinDER, FinQABench, FinanceBench, TATQA, FinQA, ConvFinQA, and MultiHiertt" ([[src-optimizing-financial-retrieval-strategies]]).

| Benchmark | Appears in | Note |
|-----------|-----------|------|
| **FinDER** | [[src-financial-rag-reranking]], [[src-optimizing-financial-retrieval-strategies]] | 1,500 queries across five experimental groups in the reranking study ([[src-financial-rag-reranking]]) |
| **FinanceBench** | [[src-metadata-driven-financial-rag]], [[src-optimizing-financial-retrieval-strategies]] | Used to benchmark metadata/contextual-chunk enhancements ([[src-metadata-driven-financial-rag]]) |
| **FinQA** | [[src-optimizing-financial-retrieval-strategies]], [[src-agentic-financial-rag-finagent]] | Numerical-reasoning QA; FinAgent-RAG reports 76.81% execution accuracy (unverified — withdrawn) ([[src-agentic-financial-rag-finagent]]) |
| **ConvFinQA** | [[src-optimizing-financial-retrieval-strategies]], [[src-agentic-financial-rag-finagent]] | Conversational FinQA; 78.46% reported (unverified — withdrawn) ([[src-agentic-financial-rag-finagent]]) |
| **TAT-QA / TATQA** | [[src-optimizing-financial-retrieval-strategies]], [[src-agentic-financial-rag-finagent]] | Table-and-text QA; 74.96% reported (unverified — withdrawn) ([[src-agentic-financial-rag-finagent]]) |
| **FinQABench** | [[src-optimizing-financial-retrieval-strategies]] | One of the seven retrieval-eval datasets ([[src-optimizing-financial-retrieval-strategies]]) |
| **MultiHiertt** | [[src-optimizing-financial-retrieval-strategies]] | Multi-hierarchical tabular QA ([[src-optimizing-financial-retrieval-strategies]]) |

## Synthesis
No single benchmark dominates — retrieval papers favor FinDER/FinanceBench, numerical-reasoning papers favor FinQA/ConvFinQA/TAT-QA. For the thesis, this table is the starting menu; note that the FinQA/ConvFinQA/TAT-QA numbers currently in the wiki come only from a **withdrawn** source and need re-sourcing before use.
Draws on: [[src-optimizing-financial-retrieval-strategies]], [[src-financial-rag-reranking]].

## See also
[[financial-document-qa]] · [[reranking]] · [[three-phase-rag-pipeline]]