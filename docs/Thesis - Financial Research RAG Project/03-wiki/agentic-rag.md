---
type: technique
title: "Agentic RAG"
aliases: [FinAgent-RAG, iterative RAG, agentic retrieval]
status: stub
sources: ["[[src-agentic-financial-rag-finagent]]"]
updated: 2026-08-20
---

Moving beyond single-pass retrieve-then-generate to **iterative retrieve–reason–verify loops**. The main source here (FinAgent-RAG) argues existing RAG uses a "single-pass retrieve-then-generate paradigm that struggles with the compositional reasoning chains prevalent in financial analysis," and instead "orchestrates iterative retrieval-reasoning loops with self-verification" ([[src-agentic-financial-rag-finagent]]).

Its three innovations: a "Contrastive Financial Retriever trained with hard negative mining to distinguish semantically similar but numerically distinct financial passages"; a [[program-of-thought|Program-of-Thought]] module; and an "Adaptive Strategy Router that dynamically allocates computational resources based on question complexity" ([[src-agentic-financial-rag-finagent]]).

> [!warning] Source withdrawn
> FinAgent-RAG (arXiv:2605.05409) was **withdrawn by its authors**. The framing is useful for motivation, but its reported numbers are unverified — do not cite them as results. Prefer a non-withdrawn source for any load-bearing claim. See [[open-questions]].

## Synthesis
Conceptually adjacent to this repo's own agentic direction (routing, tool use). The durable, non-withdrawn ideas — iterate-and-verify, and code-based arithmetic ([[program-of-thought]]) — are worth carrying into the thesis independent of this specific paper.
Draws on: [[src-agentic-financial-rag-finagent]].

## See also
[[program-of-thought]] · [[financial-document-qa]] · [[reranking]]