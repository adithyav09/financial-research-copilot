"""
Deterministic guards on the gold evaluation datasets (no model calls, no cost).

Keeps the retrieval-metric gold set (retrieval_qa.jsonl) and the answer-behavior
gold set (eval_behaviors.jsonl) well-formed and covering the required evaluation
categories, so the offline eval + manual review stay meaningful over time. Running
the actual RAG evaluation (retrieval hit@k / RAGAS) needs embeddings + ingested
data and is intentionally NOT done here (cost-gated).
"""
import json
from pathlib import Path

DATASETS = Path(__file__).resolve().parents[1].parent / "evals" / "datasets"


def _load(name):
    rows = []
    for line in (DATASETS / name).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            rows.append(json.loads(line))
    return rows


class TestRetrievalGold:
    def test_wellformed(self):
        rows = _load("retrieval_qa.jsonl")
        assert len(rows) >= 10
        for r in rows:
            assert r["qid"] and r["ticker"] and r["question"].strip()
            if r.get("route", "filing") == "filing":
                assert r["expected_sources"], f"{r['qid']} filing row needs anchors"

    def test_covers_retrieval_categories(self):
        cats = {r.get("category") for r in _load("retrieval_qa.jsonl")}
        # direct factual, multi-chunk/section, numerical/metric
        assert {"business-segments", "risk-factors", "financial-statements-xbrl"} <= cats


class TestBehaviorGold:
    def test_wellformed(self):
        rows = _load("eval_behaviors.jsonl")
        for r in rows:
            assert r["qid"] and r["question"].strip() and r["expected_behavior"].strip()

    def test_covers_behavior_categories(self):
        cats = {r.get("category") for r in _load("eval_behaviors.jsonl")}
        required = {"no-answer", "uncertainty", "adversarial-injection", "citation-grounding", "tenant-isolation"}
        assert required <= cats, f"missing gold categories: {required - cats}"
