---
type: source
title: "Financial Report Chunking for Effective Retrieval Augmented Generation"
authors: [Antonio Jimeno Yepes, Yao You, Jan Milczek, Sebastian Laverde, Renyu Li]
published: 2024-02-05
clipped: 2026-08-20
url: https://arxiv.org/abs/2402.05131
source-type: paper
raw: "[[01-raw/Financial Report Chunking for Effective Retrieval Augmented Generation]]"
status: compiled
tags: [financial-rag, chunking, retrieval, document-structure]
---

## TL;DR
Proposes chunking financial documents by **structural element type** (rather than fixed paragraph length), using document-understanding models to annotate elements; yields the best chunk size without tuning and improves RAG QA on financial reports.

## Key claims
- "Chunking information is a key step in Retrieval Augmented Generation (RAG)"; current research primarily centers on paragraph-level chunking.
- Paragraph-level chunking "treats all texts as equal and neglects the information contained in the structure of documents."
- The paper chunks "primarily by structural element components of documents" — dissecting documents into constituent elements.
- Element-based chunking "yields the best chunk size without tuning."
- Element types are annotated by **document understanding models**; the framework evaluates how element-type chunking contributes to context and retrieval accuracy.
- "Findings support that element type based chunking largely improve RAG results on financial reporting."
- arXiv:2402.05131 (v3, Mar 2024), Computation and Language (cs.CL).

## Relevance to thesis
Directly relevant to this project's ingestion pipeline, which currently chunks SEC 10-K/10-Q text into ChromaDB collections. Structural/element-type chunking is a candidate improvement over generic paragraph chunking for filings whose meaning is carried by tables, sections, and item structure.

## Concepts touched
[[financial-document-qa]] · [[financial-document-chunking]] · [[three-phase-rag-pipeline]]