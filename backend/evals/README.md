# RAG Evaluation Harness (`evals/`)

Offline evaluation of the financial RAG pipeline with **RAGAS** + **custom LLM-as-judge**
metrics. Runs the *real* `query_filing()` pipeline over a golden dataset (no mocks),
scores each answer, writes a versioned JSON report, and optionally publishes each run to
Arize as an **experiment** so runs are comparable over time (the before/after-reranking view).

## Why this exists

This is the **measured baseline** for the retrieval-quality work: capture the numbers
*before* changing retrieval (reranking, hybrid search), then re-run and compare. RAGAS is
itself LLM-judged; the custom judges add product-specific checks RAGAS doesn't cover.

> **Thesis / research notes.** The methodology, the first baseline + interpretation, and the
> debugging write-up live in the research vault (`docs/Thesis - Financial Research RAG Project/`):
> the [build log](../../docs/Thesis%20-%20Financial%20Research%20RAG%20Project/04-outputs/rag-eval-and-observability-buildlog.md),
> the [RAG evaluation](../../docs/Thesis%20-%20Financial%20Research%20RAG%20Project/03-wiki/rag-evaluation.md) concept,
> and [LLM observability & tracing](../../docs/Thesis%20-%20Financial%20Research%20RAG%20Project/03-wiki/llm-observability-tracing.md).

## Metrics

| Metric | Layer | What it measures | Needs ground truth |
|---|---|---|---|
| `faithfulness` | RAGAS | Answer claims supported by retrieved contexts | no |
| `answer_relevancy` | RAGAS | Answer actually addresses the question | no |
| `llm_context_precision_with_reference` | RAGAS | Retrieved contexts are relevant (signal vs. noise) | yes |
| `context_recall` | RAGAS | Retrieval surfaced what the reference needs | yes |
| `factual_correctness` | RAGAS | Answer agrees with the ground-truth reference | yes |
| `no_advice_compliance` | custom judge | Stays within *research*, not advice (product hard boundary) | no |
| `numerical_groundedness` | custom judge | Every number in the answer is in the contexts (no numeric hallucination) | no |

All scores are `0..1`; the two custom judges are binary (`1` = pass). The judge model is
`EVAL_JUDGE_MODEL` (default `gpt-4o`) — deliberately stronger than the pipeline's
`LLM_MODEL` so it isn't grading its own output.

## Prerequisites

1. Install eval deps into the backend venv (kept out of the app's `requirements.txt`):
   ```bash
   make eval-install          # or: pip install -r backend/requirements-eval.txt
   ```
2. `OPENAI_API_KEY` + Supabase creds in `backend/.env` (same as running the app).
3. **The golden set's tickers must already be ingested and `ready`.** The default set is
   all `AAPL` — ingest it once via the app (ask any filing question about AAPL), or the
   harness will skip every row for lack of retrieved contexts.

## Run it

```bash
make eval                     # full golden set → evals/results/eval_<ts>.json
# or, directly, from backend/ with the venv active:
python -m evals.run_eval --limit 3           # smoke test on 3 examples
python -m evals.run_eval --dataset evals/datasets/financial_qa.jsonl
```

Output: aggregate scores to stdout + a per-question JSON report in `evals/results/`.

## Baseline retrieval eval (hit@k / recall@k / MRR)

`run_eval.py` scores generated *answers*. `retrieval_eval.py` scores *retrieval* on its
own — the number to beat before adding reranking, hybrid search, or HyDE. It runs the
**base dense-vector retriever** (same embeddings, same `rag_service._chunk_filter`);
MultiQuery expansion is intentionally **off** so the baseline is deterministic and makes
no chat-LLM calls (embeddings only).

**Metrics** (0..1, mean over questions):

| Metric | Meaning |
|---|---|
| `hit_rate` | fraction of questions with ≥1 expected source in the top-k chunks |
| `recall_at_k` | mean fraction of a question's expected sources found in top-k |
| `mrr` | mean reciprocal rank of the first relevant chunk |

**Labeled set:** `datasets/retrieval_qa.jsonl` — reuses the AAPL questions/qids and labels
each row. Two kinds via `route`:

- **`route: "filing"`** (default) — a SEC-filing retrieval question, **scored**.
  `expected_sources` are distinctive answer-bearing **anchor phrases**; because
  `document_chunks` are character-split with no durable id, an anchor phrase *is* the
  source identifier (a retrieved chunk is relevant if its text contains the phrase,
  case-insensitive). `filing_type` (`10-K`/`10-Q`) is the stable filing identifier the
  harness filters on. Anchors are a first pass; the harness prints which matched.
- **`route: "live"`** — a market-data question answered from Yahoo Finance (trends also
  from SEC EDGAR XBRL company-facts). There is **no filing to retrieve**, so these are
  **recorded but not scored** — the harness lists them under `live_not_scored` with their
  `expected_source`. They exist to document market-data use-case coverage, not to inflate
  retrieval metrics.

`category` groups rows by use case (business-segments, risk-factors, mdna,
financial-statements-xbrl, quarterly-financials, market-data, …). The set is ~16 rows:
mostly 10-K, plus a 10-Q, an XBRL/financial-statements row (with `xbrl_concepts` recorded),
and two market-data rows.

**Prerequisite:** same as `run_eval` — the ticker's 10-K must already be ingested and
`ready` (rows that retrieve 0 chunks are reported as `n_no_context`). Needs
`OPENAI_API_KEY` + Supabase creds; **no** RAGAS deps required.

```bash
make eval-retrieval                                  # full labeled set, k = RETRIEVAL_K
# or, from backend/ with the venv active:
python -m evals.retrieval_eval --k 5
python -m evals.retrieval_eval --limit 3             # smoke test
python -m evals.retrieval_eval --dataset evals/datasets/retrieval_qa.jsonl --k 10
```

Output: aggregate metrics to stdout + a per-question JSON report in
`evals/results/retrieval_eval_<ts>.json`. Scoring logic is unit-tested in
`tests/unit/test_retrieval_eval.py` (no DB/API needed).

## Publish a run to Arize (experiment tracking)

```bash
make eval-push FILE=evals/results/eval_<ts>.json
# or: python -m evals.push_to_arize evals/results/eval_<ts>.json
```

Self-contained via the `arize` **SDK** (no `ax` CLI / profile / region setup). It creates
the `financial-rag-eval` dataset if missing, then creates an experiment whose runs embed
the answer + every RAGAS/judge score (via `evaluator_columns`). Reusing the one dataset
across runs makes every run a comparable experiment in
**Arize → Datasets → `financial-rag-eval` → Experiments** — the before/after-reranking view.

Requires in `.env` (all separate from trace ingestion):
- `ARIZE_SVC_KEY` — a **service-account key** (Settings → Service Accounts). Falls back to
  `ARIZE_API_KEY` if unset.
- `ARIZE_SPACE_ID` — the space (override with `--space`).
- `ARIZE_API_HOST` — the **management** host. **Critical:** GCP-cluster accounts
  (region `us-central-1a`) are served through the generic **`api.arize.com`**, *not*
  `api.us-central-1a.arize.com` (that hostname has a broken TLS cert). AWS accounts use
  `api.<region>.arize.com` (e.g. `api.us-east-1b.arize.com`). If management calls 404 with
  a key that authenticates, you're pointed at the wrong host — tracing working doesn't
  confirm the host, since the OTLP endpoint routes regardless of region.

## The golden dataset

`datasets/financial_qa.jsonl` — one JSON object per line:

```json
{"qid": "aapl-01", "ticker": "AAPL", "depth": "analyst",
 "question": "...", "ground_truth": "..."}
```

- `question` must route to the **filing** path (avoid the live-question keywords in
  `rag_service.LIVE_QUESTION_PATTERNS` — note the substring trap, e.g. "ope**rating**").
- `ground_truth` is the reference answer for the reference-based metrics. **The provided
  AAPL references are qualitative and should be spot-checked / expanded** against the
  current 10-K before you trust the correctness/recall numbers.
- Add rows for more tickers once they're ingested.

## Files

| File | Role |
|---|---|
| `run_eval.py` | Answer eval: drives the pipeline, scores with RAGAS + judges, writes the report |
| `retrieval_eval.py` | Retrieval baseline: hit@k / recall@k / MRR over labeled anchors |
| `judges.py` | RAGAS metric set + custom `AspectCritic` judge definitions |
| `push_to_arize.py` | Publishes a report to Arize as an experiment |
| `datasets/financial_qa.jsonl` | Answer-eval golden set (question + ground_truth) |
| `datasets/retrieval_qa.jsonl` | Retrieval-eval labeled set (question + expected_sources) |
| `results/` | Versioned run reports (gitignored) |