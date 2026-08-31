---
type: technique
title: "Program-of-Thought"
aliases: [PoT, numerical reasoning]
status: stub
sources: ["[[src-agentic-financial-rag-finagent]]"]
updated: 2026-08-20
---

Generating **executable code** for arithmetic instead of doing it in the model's head. In FinAgent-RAG it is "a Program-of-Thought reasoning module that generates executable Python code for precise arithmetic rather than relying on error-prone LLM-based mental computation" ([[src-agentic-financial-rag-finagent]]).

The motivation is specific to [[financial-document-qa|financial QA]], which "demands complex multi-step numerical reasoning over heterogeneous evidence" ([[src-agentic-financial-rag-finagent]]) — the kind of reasoning where LLMs make silent arithmetic errors.

> [!warning] Source withdrawn
> The only source for this article is the withdrawn FinAgent-RAG preprint; treat as motivation, not evidence. Program-of-Thought as a general technique predates it and should be re-sourced. See [[open-questions]].

## See also
[[agentic-rag]] · [[financial-document-qa]]