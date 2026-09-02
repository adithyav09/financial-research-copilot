"""Publish a local eval run (evals/results/*.json) to Arize as an Experiment.

Self-contained: talks to the Arize management API directly via the `arize` SDK
(ArizeClient) — no `ax` CLI profile, region, or SSL-env setup needed. It:

  1. Ensures the Arize dataset exists (creates it from the run's examples if missing).
  2. Maps each local qid -> Arize example id.
  3. Creates an experiment whose runs carry the generated answer plus every RAGAS /
     judge score, embedded via evaluator_columns (scores show up in the UI directly).

Auth: uses ARIZE_SVC_KEY (a management/service-account key) if set, else ARIZE_API_KEY,
against ARIZE_API_HOST (default api.arize.com — the correct host for GCP-cluster
accounts; AWS accounts use api.<region>.arize.com). This is separate from trace export.

Usage (from backend/):
    python -m evals.push_to_arize evals/results/eval_<ts>.json
    python -m evals.push_to_arize <results.json> --dataset financial-rag-eval --experiment ragas-baseline

Reusing one dataset across runs makes each run a comparable experiment — the
before/after-reranking view in Arize → Datasets → <dataset> → Experiments.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import certifi

from app.core.config import settings

# Binary (0/1) judges get a readable pass/fail label in addition to the score.
BINARY_JUDGES = {"no_advice_compliance", "numerical_groundedness"}


def _client():
    key = settings.arize_svc_key or settings.arize_api_key
    if not key:
        sys.exit("No Arize key — set ARIZE_SVC_KEY (or ARIZE_API_KEY) in .env.")
    from arize import ArizeClient

    return ArizeClient(
        api_key=key,
        api_host=settings.arize_api_host,
        ssl_ca_cert=certifi.where(),
    )


def _qid(example) -> str | None:
    return (getattr(example, "additional_properties", None) or {}).get("qid")


def main() -> None:
    ap = argparse.ArgumentParser(description="Publish an eval run to Arize as an experiment.")
    ap.add_argument("results", help="Path to an evals/results/*.json file")
    ap.add_argument("--dataset", default="financial-rag-eval", help="Arize dataset name (reused across runs)")
    ap.add_argument("--experiment", default=None, help="Experiment name (default: ragas-<model>-<ts>)")
    ap.add_argument("--space", default=settings.arize_space_id, help="Arize space name or ID")
    args = ap.parse_args()

    if not args.space:
        sys.exit("No Arize space — set ARIZE_SPACE_ID in .env or pass --space.")

    report = json.loads(Path(args.results).read_text())
    rows = report["results"]
    if not rows:
        sys.exit("Results file has no rows.")

    from arize.experiments.evaluators.types import EvaluationResultFieldNames
    from arize.experiments.types import ExperimentTaskFieldNames

    client = _client()

    # 1. Ensure the dataset exists.
    existing = [d for d in client.datasets.list(space=args.space, name=args.dataset).datasets
                if getattr(d, "name", None) == args.dataset]
    if existing:
        dataset_id = existing[0].id
        print(f"Using existing dataset '{args.dataset}'.")
    else:
        print(f"Dataset '{args.dataset}' not found — creating from {len(rows)} examples...")
        ds = client.datasets.create(
            name=args.dataset,
            space=args.space,
            examples=[
                {"qid": r["qid"], "ticker": r["ticker"], "question": r["question"], "ground_truth": r["reference"]}
                for r in rows
            ],
        )
        dataset_id = ds.id

    # 2. Map qid -> Arize example id.
    examples = client.datasets.list_examples(space=args.space, dataset=dataset_id, all=True).examples
    qid_to_example = {_qid(e): e.id for e in examples if _qid(e)}
    missing = [r["qid"] for r in rows if r["qid"] not in qid_to_example]
    if missing:
        print(f"  ! {len(missing)} qid(s) not in the dataset, skipping: {missing}")

    # 3. Build experiment runs with every score embedded, then create the experiment.
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    exp_name = args.experiment or f"ragas-{report.get('pipeline_model', 'model')}-{ts}"
    metric_names = list(report.get("aggregate", {}).keys())

    runs = []
    for r in rows:
        ex_id = qid_to_example.get(r["qid"])
        if not ex_id:
            continue
        run = {"example_id": ex_id, "output": r["answer"]}
        for name in metric_names:
            val = (r.get("scores") or {}).get(name)
            if val is None:
                continue
            run[f"{name}_score"] = float(val)
            if name in BINARY_JUDGES:
                run[f"{name}_label"] = "pass" if val >= 0.5 else "fail"
        runs.append(run)
    if not runs:
        sys.exit("No runs to create — no qid matched the dataset.")

    # Only build evaluators for metrics that have at least one non-null score.
    present = [n for n in metric_names if any(f"{n}_score" in run for run in runs)]
    evaluator_columns = {}
    for name in present:
        kwargs = {"score": f"{name}_score"}
        if name in BINARY_JUDGES:
            kwargs["label"] = f"{name}_label"
        evaluator_columns[name] = EvaluationResultFieldNames(**kwargs)

    print(f"Creating experiment '{exp_name}' with {len(runs)} runs and {len(present)} evaluators...")
    client.experiments.create(
        name=exp_name,
        dataset=dataset_id,
        space=args.space,
        experiment_runs=runs,
        task_fields=ExperimentTaskFieldNames(output="output", example_id="example_id"),
        evaluator_columns=evaluator_columns,
    )

    print(f"\n✅ Published experiment '{exp_name}' to Arize dataset '{args.dataset}'.")
    print("   Arize UI → Datasets → your dataset → Experiments to compare runs over time.")


if __name__ == "__main__":
    main()
