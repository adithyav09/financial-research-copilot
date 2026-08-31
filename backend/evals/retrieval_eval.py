"""Baseline RETRIEVAL eval for the financial RAG pipeline (hit@k / recall@k / MRR).

This is the retrieval-only complement to ``run_eval.py`` (which scores generated
answers with RAGAS). It measures how well the *base dense-vector retriever* surfaces
the answer-bearing passages for each labeled question — the number to beat before
adding reranking, hybrid search, or HyDE.

What it does, per question:
  1. Embed the question and retrieve the top-k chunks from ``document_chunks`` using
     the SAME filter the app uses (``rag_service._chunk_filter``) — reused, not
     re-implemented. MultiQuery expansion is intentionally OFF so the baseline is
     deterministic and free of chat-LLM calls; the base similarity retriever is the
     thing reranking/hybrid/HyDE will later be compared against.
  2. Score against the labeled ``expected_sources`` anchors (see the dataset header):
     a retrieved chunk is relevant to a source if its text contains that anchor
     (case-insensitive substring).

Metrics (all 0..1, higher is better), aggregated as means over questions:
  - hit_rate           : fraction of questions with >=1 expected source in top-k
  - recall_at_k        : mean fraction of a question's expected sources found in top-k
  - mrr                : mean reciprocal rank of the first relevant chunk

Usage (from backend/, app venv active; no extra deps beyond the app's — RAGAS not needed):
    python -m evals.retrieval_eval
    python -m evals.retrieval_eval --k 5 --limit 3
    python -m evals.retrieval_eval --dataset evals/datasets/retrieval_qa.jsonl --k 10

Prerequisite: the dataset's tickers must already be ingested and ``ready`` (same as
run_eval) — retrieval reads real chunks from Supabase. Needs OPENAI_API_KEY (embeddings)
+ Supabase creds in backend/.env. Writes a versioned report to evals/results/.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

EVALS_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = EVALS_DIR / "datasets" / "retrieval_qa.jsonl"
RESULTS_DIR = EVALS_DIR / "results"


# --------------------------------------------------------------------------- #
# Pure scoring (no I/O, no infra) — unit-tested in tests/unit/test_retrieval_eval.py
# --------------------------------------------------------------------------- #

def match_sources(retrieved_texts: list[str], expected_sources: list[str], k: int) -> dict[str, int]:
    """Map each expected source anchor -> 1-based rank of the FIRST top-k chunk
    whose text contains it (case-insensitive). Absent anchors are omitted."""
    anchors = [s.lower() for s in expected_sources]
    top_k = [(t or "").lower() for t in retrieved_texts[:k]]
    first_rank: dict[str, int] = {}
    for rank, text in enumerate(top_k, start=1):
        for a in anchors:
            if a and a in text and a not in first_rank:
                first_rank[a] = rank
    return first_rank


def score_row(retrieved_texts: list[str], expected_sources: list[str], k: int) -> dict:
    """Compute hit / recall@k / reciprocal-rank for one question."""
    anchors = [s.lower() for s in expected_sources]
    found = match_sources(retrieved_texts, anchors, k)
    hit = 1.0 if found else 0.0
    recall = len(found) / len(anchors) if anchors else 0.0
    first_relevant_rank = min(found.values()) if found else None
    rr = 1.0 / first_relevant_rank if first_relevant_rank else 0.0
    return {
        "hit": hit,
        "recall_at_k": round(recall, 4),
        "reciprocal_rank": round(rr, 4),
        "first_relevant_rank": first_relevant_rank,
        "sources_found": sorted(found),
        "sources_missed": sorted(a for a in anchors if a not in found),
    }


def aggregate(row_scores: list[dict], k: int, n_no_context: int) -> dict:
    n = len(row_scores)
    mean = lambda key: round(sum(r[key] for r in row_scores) / n, 4) if n else 0.0  # noqa: E731
    return {
        "hit_rate": mean("hit"),
        "recall_at_k": mean("recall_at_k"),
        "mrr": mean("reciprocal_rank"),
        "k": k,
        "n_questions": n,
        "n_no_context": n_no_context,
    }


def partition_rows(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """Split labeled rows into (filing rows, live rows).

    `route` defaults to "filing" when absent (back-compat with the original set).
    Only filing rows are retrieval-scorable — live/market-data questions are
    answered from Yahoo Finance with no filing to retrieve, so the harness records
    but does not score them.
    """
    filing = [r for r in rows if r.get("route", "filing") != "live"]
    live = [r for r in rows if r.get("route", "filing") == "live"]
    return filing, live


# --------------------------------------------------------------------------- #
# I/O + live retrieval
# --------------------------------------------------------------------------- #

def load_dataset(path: str | Path) -> list[dict]:
    rows: list[dict] = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            rows.append(json.loads(line))
    return rows


def _make_retriever(k: int, ticker: str, filing_type: str):
    """Build the base dense-similarity retriever exactly as the app does.

    Reuses rag_service._chunk_filter so the eval and the app agree on scoping.
    user_id is None here (offline, single-owner eval) -> the filter is not
    user-scoped, matching how run_eval.py exercises the pipeline.
    """
    from langchain_community.vectorstores import SupabaseVectorStore
    from langchain_openai import OpenAIEmbeddings

    from app.core.config import settings
    from app.core.database import get_supabase_client
    from app.services.rag_service import _chunk_filter

    embeddings = OpenAIEmbeddings(model=settings.embedding_model, api_key=settings.openai_api_key)
    vectorstore = SupabaseVectorStore(
        client=get_supabase_client(),
        embedding=embeddings,
        table_name="document_chunks",
        query_name="match_document_chunks",
    )
    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k, "filter": _chunk_filter(ticker, filing_type, None)},
    )


def run(rows: list[dict], k: int) -> tuple[list[dict], int]:
    """Retrieve + score every row. Returns (per_row_reports, n_no_context)."""
    per_row: list[dict] = []
    n_no_context = 0
    for i, r in enumerate(rows, 1):
        ticker = r["ticker"]
        filing_type = r.get("filing_type", "10-K")
        question = r["question"]
        expected = r["expected_sources"]
        print(f"[{i}/{len(rows)}] {ticker} {r.get('qid', '')}: {question[:60]}...")

        retriever = _make_retriever(k, ticker, filing_type)
        docs = retriever.invoke(question)
        texts = [d.page_content for d in docs]
        if not texts:
            n_no_context += 1
            print("    ! no chunks retrieved (ticker not ingested / wrong filing_type)")

        s = score_row(texts, expected, k)
        s.update({
            "qid": r.get("qid", f"q{i}"),
            "ticker": ticker,
            "question": question,
            "n_retrieved": len(texts),
            "expected_sources": expected,
        })
        per_row.append(s)
        print(f"    hit={s['hit']:.0f} recall@{k}={s['recall_at_k']:.2f} "
              f"rr={s['reciprocal_rank']:.2f} found={s['sources_found']}")
    return per_row, n_no_context


def build_report(per_row: list[dict], k: int, n_no_context: int, live_rows: list[dict] | None = None) -> dict:
    from app.core.config import settings
    live_rows = live_rows or []
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "kind": "retrieval_baseline",
        "embedding_model": settings.embedding_model,
        "retriever": "base_dense_similarity (no multiquery/rerank/hybrid/hyde)",
        "aggregate": aggregate(per_row, k, n_no_context),
        "results": per_row,
        # Market-data / live questions carried for use-case coverage but NOT
        # retrieval-scored (no filing to retrieve). Recorded, not scored.
        "live_not_scored": [
            {"qid": r.get("qid"), "category": r.get("category"),
             "question": r["question"], "expected_source": r.get("expected_source")}
            for r in live_rows
        ],
    }


def main() -> None:
    from app.core.config import settings

    ap = argparse.ArgumentParser(description="Baseline retrieval eval (hit@k / recall@k / MRR).")
    ap.add_argument("--dataset", default=str(DEFAULT_DATASET), help="Labeled JSONL dataset path")
    ap.add_argument("--k", type=int, default=settings.retrieval_k, help="Top-k chunks to retrieve")
    ap.add_argument("--limit", type=int, default=None, help="Only run the first N questions")
    ap.add_argument("--out", default=None, help="Explicit output path (default: evals/results/retrieval_eval_<ts>.json)")
    args = ap.parse_args()

    rows = load_dataset(args.dataset)
    if args.limit:
        rows = rows[: args.limit]
    filing_rows, live_rows = partition_rows(rows)
    print(f"Loaded {len(rows)} labeled questions from {args.dataset} "
          f"({len(filing_rows)} filing/scored, {len(live_rows)} live/market-data skipped; k={args.k})\n")

    per_row, n_no_context = run(filing_rows, args.k)
    report = build_report(per_row, args.k, n_no_context, live_rows)

    RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = Path(args.out) if args.out else RESULTS_DIR / f"retrieval_eval_{ts}.json"
    out.write_text(json.dumps(report, indent=2))

    agg = report["aggregate"]
    print("\nBaseline retrieval metrics:")
    print(f"  hit_rate      {agg['hit_rate']}")
    print(f"  recall@{args.k}      {agg['recall_at_k']}")
    print(f"  mrr           {agg['mrr']}")
    if n_no_context:
        print(f"  ! {n_no_context}/{agg['n_questions']} question(s) retrieved 0 chunks "
              "— ensure the ticker's filing is ingested and `ready`.")
    if live_rows:
        print(f"  (skipped {len(live_rows)} live/market-data question(s) — not retrieval-scorable: "
              f"{', '.join(r.get('qid', '?') for r in live_rows)})")
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
