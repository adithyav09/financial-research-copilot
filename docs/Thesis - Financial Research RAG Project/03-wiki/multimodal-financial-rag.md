---
type: technique
title: "Multimodal Financial RAG"
aliases: [multimodal RAG, MultiFinRAG, cross-modal reasoning]
status: draft
sources: ["[[src-multifinrag]]"]
updated: 2026-08-20
---

Extending [[financial-document-qa|financial RAG]] to reason jointly over text, **tables, and figures** — motivated by the fact that filings "combine diverse modalities, including dense narrative text, structured tables, and complex figures" that "strain traditional LLMs and RAG pipelines due to token limitations, layout loss, and fragmented cross-modal context" ([[src-multifinrag]]).

## MultiFinRAG's approach
- **Multimodal extraction:** group table and figure images into batches and send them to "a lightweight, quantized open-source multimodal LLM," producing "structured JSON outputs and concise textual summaries" ([[src-multifinrag]]).
- **Modality-aware indexing:** outputs plus narrative text "are embedded and indexed with modality-aware similarity thresholds for precise retrieval" ([[src-multifinrag]]) — a [[financial-document-chunking|chunking/indexing]] variant.
- **Tiered fallback:** "dynamically escalates from text-only to text+table+image contexts when necessary," enabling cross-modal reasoning while reducing irrelevant context ([[src-multifinrag]]).

## Result
"Despite running on commodity hardware, MultiFinRAG achieves 19 percentage points higher accuracy than ChatGPT-4o (free-tier) on complex financial QA tasks involving text, tables, images, and combined multimodal reasoning" ([[src-multifinrag]]).

## Synthesis
Most directly relevant gap for this repo: it ingests filing **text** today, but 10-K/10-Q value is heavily tabular. Modality-aware extraction + tiered fallback is the reference design for adding table/figure reasoning without blowing the context budget.
Draws on: [[src-multifinrag]].

## See also
[[financial-document-chunking]] · [[financial-document-qa]] · [[three-phase-rag-pipeline]]