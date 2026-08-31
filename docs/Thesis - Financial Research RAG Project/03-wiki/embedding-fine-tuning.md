---
type: technique
title: "Embedding Fine-Tuning"
aliases: [domain-adapted embeddings, contextual embeddings, enriched embeddings]
status: draft
sources: ["[[src-optimizing-financial-retrieval-strategies]]", "[[src-metadata-driven-financial-rag]]"]
updated: 2026-08-20
---

Adapting the retrieval embedding model to the financial domain — a retrieval-phase lever in the [[three-phase-rag-pipeline]].

## Evidence
- The three-phase pipeline "fine-tuned state-of-the-art (SOTA) embedding models with domain-specific knowledge" as its core retrieval improvement ([[src-optimizing-financial-retrieval-strategies]]).
- The metadata work pursues a related idea at index time — "enriched embeddings" and "contextual embeddings" that fold chunk metadata into the vector, which delivered its largest gains ([[src-metadata-driven-financial-rag]]) — see [[metadata-driven-rag]] and [[financial-document-chunking]].

## Synthesis
Two routes to better vectors: **fine-tune the model** on financial text, or **enrich the input** you embed (contextual chunks). The metadata paper suggests enriching the input is the cheaper, higher-yield of the two — relevant for a project that would rather not train and host a custom embedding model.
Draws on: [[src-optimizing-financial-retrieval-strategies]], [[src-metadata-driven-financial-rag]].

## See also
[[hybrid-retrieval]] · [[metadata-driven-rag]] · [[three-phase-rag-pipeline]]