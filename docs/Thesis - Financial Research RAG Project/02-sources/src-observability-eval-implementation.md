---
type: source
title: "Implementation: Arize observability + RAGAS/LLM-judge eval harness"
authors: [Adithya Venkatesh]
published: 2026-08-30
clipped: 2026-08-30
url: "internal — financial-research-copilot repo, branch feature/arize-observability"
source-type: note        # first-person engineering log (primary source = the codebase)
raw: ""
status: summarized
tags: [evaluation, ragas, llm-as-a-judge, observability, tracing, arize, reranking]
---

## TL;DR
Instrumented the financial-RAG backend with Arize AX distributed tracing (OpenInference + OpenTelemetry over LangChain) and built an offline evaluation harness that scores the live pipeline with RAGAS metrics plus custom LLM-as-a-judge checks, publishing each run to Arize as a versioned experiment. First baseline surfaced a **high-recall / low-precision** retrieval signature that empirically motivates reranking.

## Key claims
- Auto-instrumentation at the **framework** layer (LangChain) captures the whole retrieve→generate chain — retriever spans, MultiQuery expansion, and every `ChatOpenAI` call — with **zero changes to business logic**; only an `init_tracing()` bootstrap that must run *before* the first LangChain import.
- Tracing is **opt-in and non-fatal**: no credentials → no-op; missing deps → warn and continue. Observability must never break the app it observes.
- RAGAS is itself LLM-as-a-judge under the hood, so a useful eval stack is **two layers**: standard RAGAS metrics (faithfulness, answer relevancy, context precision/recall, factual correctness) **plus** product-specific judges (no-advice compliance, numerical groundedness).
- The **judge model must be stronger than the pipeline model** (gpt-4o judging gpt-4o-mini) — a model grading its own output is a known blind spot.
- First baseline (12 AAPL filing questions): faithfulness **0.91**, answer_relevancy **0.82**, context_recall **0.92**, **context_precision 0.34**, factual_correctness 0.41, no_advice_compliance **1.00**, numerical_groundedness 0.75.
- **High recall + low precision ⇒ retrieval brings back the right chunks but ranks them poorly** — the textbook signature that reranking targets. The baseline is the "before" number for a reranking A/B.
- Two measured caveats: `factual_correctness` is depressed by terse reference answers (claim-overlap F1 penalizes correct extra detail); `numerical_groundedness` only sees filing contexts, not the live/XBRL supplement, so numbers sourced from live data read as false hallucinations.
- **Observability ≠ management API.** Arize trace ingestion (`otlp.arize.com`) routes regardless of region; the datasets/experiments management API is region-hosted. A `404` (not `401`) on a management call with an *authenticating* key means wrong host, not bad key. This account is on Arize's GCP cluster, served via the generic `api.arize.com`, not the SDK/CLI default `api.us-east-1b.arize.com`.
- Running RAGAS 0.2.15 on Python 3.14 / LangChain 1.3 required compat shims (stub a removed `langchain_community` module; no-op `nest_asyncio.apply()` which broke `asyncio.current_task()`), and bypassing RAGAS's own executor by awaiting `single_turn_ascore` directly.

## Relevance to thesis
Supplies the **measurement layer** the thesis needs to make retrieval-improvement claims empirical rather than anecdotal: a repeatable harness + versioned experiments that turn "reranking should help" into a before/after number. Directly connects the literature's strongest reported win ([[reranking]]) to a local baseline.

## Concepts touched
[[rag-evaluation]] · [[llm-observability-tracing]] · [[reranking]] · [[financial-qa-benchmarks]] · [[three-phase-rag-pipeline]]
