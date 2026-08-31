---
type: concept
title: "LLM Observability & Tracing"
aliases: [observability, tracing, OpenTelemetry, OpenInference, Arize, distributed tracing, spans]
status: draft
sources: ["[[src-observability-eval-implementation]]"]
updated: 2026-08-30
---

Instrumenting an LLM application so every request emits a **trace** — a tree of **spans** capturing each step (retrieval, query expansion, the model call) with inputs, outputs, latency, and token counts. It answers *"what did the pipeline actually do on this query, and where did time/cost/quality go?"* — the runtime complement to offline [[rag-evaluation]].

## How it works
- **OpenTelemetry (OTel)** is the vendor-neutral tracing standard; **OpenInference** is the LLM-specific span convention layered on it; **Arize AX** is one backend that ingests OTel/OpenInference spans ([[src-observability-eval-implementation]]).
- **Auto-instrumentation at the framework layer.** Instrumenting **LangChain** (not the raw provider SDK) captures the whole retrieve→generate chain automatically, so no business logic changes — only a bootstrap that runs *before* the first framework import ([[src-observability-eval-implementation]]).
- **Opt-in, non-fatal.** Instrumentation should no-op without credentials and degrade gracefully if deps are missing — observability must never break the app it observes ([[src-observability-eval-implementation]]).

## Ingestion vs. management API (a real gotcha)
Trace **ingestion** (`otlp.arize.com`) routes to the right account regardless of region, but the **management API** (datasets/experiments) is region-hosted. Consequence: tracing working does **not** confirm the management host. A `404` (not `401`) on a management call with a key that *authenticates* means the wrong regional endpoint, not a bad key ([[src-observability-eval-implementation]]).

## Synthesis
Tracing and offline [[rag-evaluation]] are complementary: traces tell you *what happened* on real traffic (debugging, latency, cost, token accounting); the eval harness tells you *how good* the answers are against a fixed set. Together they close the loop — a traced production failure becomes a golden-set case, and an eval regression becomes a trace to inspect.
Draws on: [[src-observability-eval-implementation]].

## See also
[[rag-evaluation]] · [[three-phase-rag-pipeline]] · [[agentic-rag]]
