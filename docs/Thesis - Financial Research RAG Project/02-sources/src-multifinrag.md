---
type: source
title: "MultiFinRAG: An Optimized Multimodal Retrieval-Augmented Generation Framework for Financial Question Answering"
authors: [Chinmay Gondhalekar, Urjitkumar Patel, Fang-Chun Yeh]
published: 2025-06-25
clipped: 2026-08-20
url: https://arxiv.org/abs/2506.20821
source-type: paper
raw: "[[01-raw/MultiFinRAG An Optimized Multimodal Retrieval-Augmented Generation (RAG) Framework for Financial Question Answering]]"
status: compiled
tags: [financial-rag, multimodal, tables, figures, cross-modal-reasoning]
---

## TL;DR
A multimodal RAG framework for financial QA that extracts tables and figures via a lightweight quantized open-source multimodal LLM into JSON + text summaries, indexes with modality-aware thresholds, and uses a tiered text→table→image fallback; beats ChatGPT-4o (free-tier) by 19 points on complex financial QA while running on commodity hardware.

## Key claims
- Financial documents (10-Ks, 10-Qs, investor presentations) "span hundreds of pages and combine diverse modalities, including dense narrative text, structured tables, and complex figures."
- Multimodal QA "strains traditional LLMs and RAG pipelines due to token limitations, layout loss, and fragmented cross-modal context."
- MultiFinRAG "first performs multimodal extraction by grouping table and figure images into batches and sending them to a lightweight, quantized open-source multimodal LLM," producing structured JSON outputs and concise textual summaries.
- Outputs plus narrative text "are embedded and indexed with modality-aware similarity thresholds for precise retrieval."
- A "tiered fallback strategy then dynamically escalates from text-only to text+table+image contexts when necessary," enabling cross-modal reasoning while reducing irrelevant context.
- "Despite running on commodity hardware, MultiFinRAG achieves 19 percentage points higher accuracy than ChatGPT-4o (free-tier) on complex financial QA tasks."
- arXiv:2506.20821 (v1, Jun 2025); published at 2025 IEEE International Conference on Big Data (BigData), Macau.

## Relevance to thesis
Financial filings are heavily tabular and this project currently ingests filing *text*; MultiFinRAG's modality-aware extraction and tiered fallback are the reference approach for extending the copilot to reason over the tables and figures in 10-Ks/10-Qs.

## Concepts touched
[[financial-document-qa]] · [[multimodal-financial-rag]] · [[financial-document-chunking]] · [[three-phase-rag-pipeline]]