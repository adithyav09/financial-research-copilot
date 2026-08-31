"""RAGAS + custom LLM-as-judge eval harness for the financial RAG pipeline.

Runs the *real* ``query_filing()`` pipeline over a golden dataset, then scores each
answer with RAGAS metrics (faithfulness, answer relevancy, context precision/recall,
factual correctness) plus custom domain judges (no-advice compliance, numerical
groundedness). Writes a versioned results JSON to evals/results/.

Usage (from backend/, with the app venv active and requirements-eval.txt installed):

    python -m evals.run_eval
    python -m evals.run_eval --dataset evals/datasets/financial_qa.jsonl --limit 3

Requires OPENAI_API_KEY + Supabase creds, and the dataset's tickers must already be
ingested (their 10-K/10-Q `ready`) — this calls the live retrieval pipeline, it does
not mock anything. Answers are graded by EVAL_JUDGE_MODEL (default gpt-4o).
"""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.models.schemas import Depth
from app.services.rag_service import query_filing

EVALS_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = EVALS_DIR / "datasets" / "financial_qa.jsonl"
RESULTS_DIR = EVALS_DIR / "results"


def load_dataset(path: str | Path) -> list[dict]:
    rows: list[dict] = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            rows.append(json.loads(line))
    return rows


async def generate(rows: list[dict]) -> list[dict]:
    """Run the real pipeline per row; capture answer + retrieved contexts.

    Rows that route to the live path (empty contexts) or whose ticker isn't
    ingested are skipped — RAGAS retrieval metrics need real contexts.
    """
    samples: list[dict] = []
    for i, r in enumerate(rows, 1):
        depth = Depth(r.get("depth", "analyst"))
        print(f"[{i}/{len(rows)}] {r['ticker']}: {r['question'][:68]}...")
        try:
            result = await query_filing(ticker=r["ticker"], question=r["question"], depth=depth)
        except Exception as e:  # noqa: BLE001 — one bad row shouldn't abort the run
            print(f"    ! query_filing failed: {e}")
            continue

        contexts = result.get("contexts") or []
        if not contexts:
            print("    ! no retrieved contexts (live-routed or ticker not ingested) — skipping")
            continue

        samples.append({
            "qid": r.get("qid", f"q{i}"),
            "ticker": r["ticker"],
            "user_input": r["question"],
            "response": result["answer"],
            "retrieved_contexts": contexts,
            "reference": r["ground_truth"],
            "tokens_used": result.get("tokens_used", 0),
        })
    return samples


def score(samples: list[dict]):
    """Score answers with RAGAS + custom judges using EVAL_JUDGE_MODEL.

    We call each metric's async ``single_turn_ascore`` directly inside our own event
    loop rather than RAGAS's ``evaluate()`` executor — that executor applies
    ``asyncio.timeout`` outside a task, which Python 3.14 rejects
    (``RuntimeError: Timeout should be used inside a task``).
    """
    from evals import _compat  # noqa: F401 - registers a langchain shim before RAGAS imports
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings
    from ragas.dataset_schema import SingleTurnSample
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.llms import LangchainLLMWrapper
    from ragas.run_config import RunConfig

    from evals.judges import custom_judges, ragas_metrics

    judge_llm = LangchainLLMWrapper(
        ChatOpenAI(model=settings.eval_judge_model, temperature=0, api_key=settings.openai_api_key)
    )
    judge_emb = LangchainEmbeddingsWrapper(
        OpenAIEmbeddings(model=settings.embedding_model, api_key=settings.openai_api_key)
    )
    metrics = ragas_metrics() + custom_judges()

    run_config = RunConfig()
    for m in metrics:
        if getattr(m, "llm", None) is None:
            m.llm = judge_llm
        if hasattr(m, "embeddings") and getattr(m, "embeddings", None) is None:
            m.embeddings = judge_emb
        try:
            m.init(run_config)
        except Exception:  # noqa: BLE001 - some metrics need no init; llm/embeddings already set
            pass

    async def one_metric(metric, sample):
        try:
            val = await metric.single_turn_ascore(sample)
            return metric.name, (None if val != val else float(val))  # NaN -> None
        except Exception as e:  # noqa: BLE001 - a failed metric shouldn't sink the row
            print(f"    ! metric {metric.name} failed: {e}")
            return metric.name, None

    async def score_one(i, sample_dict):
        sample = SingleTurnSample(
            user_input=sample_dict["user_input"],
            retrieved_contexts=sample_dict["retrieved_contexts"],
            response=sample_dict["response"],
            reference=sample_dict["reference"],
        )
        pairs = await asyncio.gather(*(one_metric(m, sample) for m in metrics))
        print(f"    scored [{i + 1}/{len(samples)}] {sample_dict['qid']}")
        return dict(pairs)

    async def score_all():
        # Metrics run concurrently within a sample; samples run sequentially to keep
        # the OpenAI request rate reasonable.
        return [await score_one(i, s) for i, s in enumerate(samples)]

    row_scores = asyncio.run(score_all())
    return row_scores, [m.name for m in metrics]


def build_report(samples, row_scores, metric_names, pipeline_model) -> dict:
    per_row = []
    for i, s in enumerate(samples):
        scores = row_scores[i]
        per_row.append({
            "qid": s["qid"],
            "ticker": s["ticker"],
            "question": s["user_input"],
            "answer": s["response"],
            "reference": s["reference"],
            "n_contexts": len(s["retrieved_contexts"]),
            "tokens_used": s["tokens_used"],
            "scores": scores,
        })

    aggregate = {}
    for name in metric_names:
        vals = [r["scores"].get(name) for r in per_row if r["scores"].get(name) is not None]
        aggregate[name] = round(sum(vals) / len(vals), 4) if vals else None

    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "pipeline_model": pipeline_model,
        "judge_model": settings.eval_judge_model,
        "embedding_model": settings.embedding_model,
        "retrieval_k": settings.retrieval_k,
        "n_examples": len(per_row),
        "aggregate": aggregate,
        "results": per_row,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="RAGAS + LLM-judge eval for the financial RAG pipeline.")
    ap.add_argument("--dataset", default=str(DEFAULT_DATASET), help="Golden JSONL dataset path")
    ap.add_argument("--limit", type=int, default=None, help="Only run the first N examples")
    ap.add_argument("--out", default=None, help="Explicit output path (default: evals/results/eval_<ts>.json)")
    args = ap.parse_args()

    rows = load_dataset(args.dataset)
    if args.limit:
        rows = rows[: args.limit]
    print(f"Loaded {len(rows)} golden examples from {args.dataset}\n")

    samples = asyncio.run(generate(rows))
    if not samples:
        print("\nNo scorable samples — ensure the dataset's tickers are ingested and `ready`. Aborting.")
        return

    print(f"\nScoring {len(samples)} answers with RAGAS + custom judges (judge={settings.eval_judge_model})...")
    result, metric_names = score(samples)
    report = build_report(samples, result, metric_names, settings.llm_model)

    RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = Path(args.out) if args.out else RESULTS_DIR / f"eval_{ts}.json"
    out.write_text(json.dumps(report, indent=2))

    print("\nAggregate scores:")
    for name in metric_names:
        print(f"  {name:38s} {report['aggregate'].get(name)}")
    print(f"\nWrote {out}")
    print("Publish to Arize:  python -m evals.push_to_arize " + str(out))


if __name__ == "__main__":
    main()