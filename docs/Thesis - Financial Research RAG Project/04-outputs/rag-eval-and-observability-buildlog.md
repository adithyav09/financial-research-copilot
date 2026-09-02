---
type: output
title: "Build log: observability + evaluation for financial-research RAG"
kind: engineering-log
produced: 2026-08-30
query: "Document the Arize observability + RAGAS/LLM-judge eval work — changes, observations, and interview talking points."
sources: ["[[src-observability-eval-implementation]]"]
tags: [evaluation, ragas, observability, arize, reranking, interview-prep]
---

# Build log: observability + evaluation for financial-research RAG

> An engineering narrative of two systems added to the `financial-research-copilot` backend (branch `feature/arize-observability`, 2026-08-30): **distributed tracing** and an **offline evaluation harness**. Written to be talked through in interviews. Grounded in [[src-observability-eval-implementation]]; connects to the literature via [[rag-evaluation]], [[llm-observability-tracing]], and [[reranking]].

## 1. Why — the gap
The pipeline could answer questions but I had **no measurement layer**: no way to see what it did at runtime, and no number for how good the answers were. Every "reranking should help" claim was anecdotal. The thesis needs the opposite — a repeatable way to turn improvement hypotheses into before/after numbers. So: add **observability** (what happened) and **evaluation** (how good), the two halves of a feedback loop.

## 2. What I built

### A. Arize tracing (observability)
- Auto-instrumented **LangChain** with OpenInference + OpenTelemetry, exporting to Arize AX. Instrumenting the *framework* (not the OpenAI SDK) captures the entire retrieve→generate chain — retriever spans, MultiQuery expansion, every `ChatOpenAI` call — with **zero business-logic changes**.
- One new module, `app/core/tracing.py` (`init_tracing()`), called in `main.py` **before** the first LangChain import (the instrumentor patches LangChain's callback system at import time).
- **Opt-in and non-fatal by design**: no credentials → no-op; missing deps → warn and continue. Observability must never break the app it observes.

### B. Evaluation harness (`backend/evals/`)
- Runs the **real** `query_filing()` pipeline over a golden dataset (no mocks), captures the retrieved contexts, and scores each answer.
- **Two metric layers** (see [[rag-evaluation]]): standard **RAGAS** (faithfulness, answer relevancy, context precision/recall, factual correctness) + **custom LLM-as-a-judge** (no-advice compliance, numerical groundedness).
- **Judge model stronger than the pipeline** — gpt-4o grading gpt-4o-mini — so it isn't grading its own output.
- Writes a versioned JSON report, then publishes to **Arize as an experiment** so runs are comparable over time (the before/after-reranking view).
- One pipeline change to enable it: `query_filing()` now returns the retrieved `contexts` (backward-compatible extra key the API route ignores) — RAGAS needs the contexts, and truncated citations weren't enough.

## 3. Results — the first baseline
12 AAPL filing questions, judged by gpt-4o:

| Metric | Score | Reading |
|---|---|---|
| faithfulness | **0.91** | answers grounded in retrieved chunks |
| answer_relevancy | **0.82** | answers address the question |
| context_recall | **0.92** | retrieval surfaces what's needed |
| **context_precision** | **0.34** | ⚠️ retrieval drags in irrelevant chunks |
| factual_correctness | 0.41 | depressed by terse references (caveat below) |
| no_advice_compliance | **1.00** | product "research, not advice" boundary holds |
| numerical_groundedness | 0.75 | 3 flags, partly a harness blind spot (below) |

**The headline observation:** **high recall (0.92) + low precision (0.34)** is the textbook signature of *"retrieve the right chunks, rank them poorly."* This is exactly what [[reranking]] fixes — and the corpus's strongest reported win is precisely reranking (correctness 33.5%→49.0%, [[src-financial-rag-reranking]]). So the baseline **empirically motivates** the next build instead of me asserting it.

**Two honest caveats** (the kind worth volunteering in an interview):
- `factual_correctness` uses claim-overlap F1, which penalizes *correct but verbose* answers against my terse one-line references. It measures reference quality as much as answer quality — expand the golden set and it rises.
- `numerical_groundedness` only sees filing contexts, not the live/XBRL supplement the pipeline also uses — so numbers sourced from live data read as false hallucinations. Knowing *why* a metric is wrong matters as much as the score.

## 4. Debugging war stories (the interview gold)

**(a) A substring bug in query routing.** The pipeline routes "live" vs "filing" questions by keyword substring match. One golden question — *"reportable **operating** segments"* — silently routed to the live path and returned no contexts, because `"operating"` contains the live-keyword `"rating"`. *Lesson: substring matching is a footgun; caught it because the harness asserts every golden question hits the filing path.*

**(b) RAGAS vs. Python 3.14.** RAGAS 0.2.15 predates this stack (Python 3.14 / LangChain 1.3). Two failures, two root-caused fixes: it imported a `langchain_community` module that newer versions removed (stub it), and it called `nest_asyncio.apply()` which on 3.14 breaks `asyncio.current_task()`, making every metric's `asyncio.wait_for` throw *"Timeout should be used inside a task"* (no-op the shim, and await the metric's async method directly instead of RAGAS's own executor). *Lesson: read the traceback to the actual call site — the error was three layers below where it looked like it originated.*

**(c) The Arize `404` that wasn't an auth problem.** Publishing to Arize 404'd on every management call, with a key that authenticated. I first concluded "no account access" — **wrong**. The user pushed back: *a 404 is not a 401*. Re-testing the region hypothesis properly revealed the real cause: this account is on Arize's **GCP cluster**, whose management API is served through the generic **`api.arize.com`**, while the SDK/CLI default to `api.us-east-1b.arize.com` (AWS) → 404. Trace ingestion (`otlp.arize.com`) had worked the whole time because it routes regardless of region — which is *why* "tracing works" didn't confirm the management host. *Lesson: distinguish 404 (wrong resource/endpoint) from 401 (wrong key) rigorously, and don't over-trust one working path (ingestion) as evidence another (management) is configured right.* Fix: point the SDK at `api.arize.com`; the publisher was then rewritten to use the Arize SDK directly (dropping a fragile CLI-profile/region/SSL setup entirely). See [[llm-observability-tracing]].

## 5. Talking points (how to frame it)
- **Instrument the framework, not the model call.** One integration point traces the whole chain; no per-call plumbing.
- **Make observability opt-in and non-fatal.** It must never take down the thing it watches.
- **Two-layer eval:** off-the-shelf RAGAS for standard dimensions + bespoke judges for product rules (no-advice compliance is a *product boundary* expressed as a metric).
- **Judge with a stronger model than you test.** Avoid self-grading bias.
- **Per-component metrics localize the fault.** The recall/precision split *diagnosed* reranking as the fix — measurement drove the roadmap.
- **Debug discipline:** 404≠401; read tracebacks to the call site; version-compat shims; don't generalize from one working path.

## 6. Next
- **Reranking** ([[reranking]]) — the baseline's low precision points straight at it. Add it, re-run `make eval`, publish beside this baseline in Arize, and read the precision delta.
- **Expand the golden set** with fuller reference answers so `factual_correctness` reflects real quality.
- Feed the `numerical_groundedness` blind spot (live/XBRL context) into the harness so the judge sees everything the pipeline used.

---
Files: `app/core/tracing.py`, `evals/{run_eval,judges,push_to_arize,_compat}.py`, `evals/datasets/financial_qa.jsonl`, `evals/README.md`. Source: [[src-observability-eval-implementation]]. Related: [[rag-evaluation]] · [[llm-observability-tracing]] · [[reranking]] · [[three-phase-rag-pipeline]].
