---
type: technique
title: "RAG Evaluation (RAGAS + LLM-as-a-judge)"
aliases: [RAG eval, RAGAS, LLM-as-a-judge, faithfulness, context precision, context recall, answer relevancy]
status: draft
sources: ["[[src-observability-eval-implementation]]"]
updated: 2026-08-30
---

How to measure a retrieval-augmented pipeline's quality without hand-grading every answer. Where [[financial-qa-benchmarks]] supply *datasets* and headline accuracy, this covers the *metric methodology* — the per-component scores that tell you **which stage** of the [[three-phase-rag-pipeline]] is failing.

## The two layers
Reference-graded metrics are themselves LLM-judged, so a practical eval stack has two tiers ([[src-observability-eval-implementation]]):

1. **Standard RAGAS metrics** (a model scores each dimension 0–1):
   - **Faithfulness** — is every claim in the answer supported by the retrieved contexts? (generation grounding)
   - **Answer relevancy** — does the answer address the question? (generation focus)
   - **Context precision** — are the retrieved chunks relevant, or is retrieval dragging in noise? (retrieval ranking)
   - **Context recall** — did retrieval surface everything the reference needs? (retrieval coverage) *needs ground truth*
   - **Factual correctness** — does the answer agree with a ground-truth reference? *needs ground truth*
2. **Custom LLM-as-a-judge** — binary product-specific checks RAGAS doesn't cover, e.g. *no-advice compliance* (stays within research, not advice) and *numerical groundedness* (every figure traces to context) ([[src-observability-eval-implementation]]).

## Design rules
- **Reference-free vs reference-based.** Faithfulness / answer relevancy / context precision need no labels and can run immediately; context recall and factual correctness require a curated golden set of ground-truth answers ([[src-observability-eval-implementation]]).
- **Judge > pipeline.** Grade with a stronger model than the one under test — a model judging its own output is a known blind spot ([[src-observability-eval-implementation]]).
- **Per-component, not just end-to-end.** Splitting retrieval (precision/recall) from generation (faithfulness/relevancy) localizes the fault — the whole point vs. a single accuracy number.

## Synthesis
The precision/recall split is diagnostic. A **high-recall, low-precision** result (observed baseline: recall 0.92, precision 0.34 — [[src-observability-eval-implementation]]) means the right chunks are retrieved but poorly ranked — which is exactly the failure mode [[reranking]] fixes, and mirrors the corpus's strongest reported win (reranking lifted correctness 33.5%→49.0% — [[src-financial-rag-reranking]] via [[reranking]]). Evaluation methodology and the reranking hypothesis are thus two sides of one claim: you need the per-stage metric to *prove* the reranking gain rather than assert it.
Two metric caveats worth stating in any writeup: claim-overlap correctness scores penalize correct-but-verbose answers against terse references, and a groundedness judge that only sees filing chunks will false-flag numbers sourced from live/market data ([[src-observability-eval-implementation]]).
Draws on: [[src-observability-eval-implementation]], [[src-financial-rag-reranking]].

## See also
[[financial-qa-benchmarks]] · [[reranking]] · [[three-phase-rag-pipeline]] · [[llm-observability-tracing]]
