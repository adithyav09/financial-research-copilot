"""
Unit tests for the baseline retrieval-eval scoring (evals/retrieval_eval.py).

These cover the pure metric logic (hit / recall@k / MRR against expected-source
anchors) with no DB, embeddings, or network — the live retrieval path is exercised
separately via `python -m evals.retrieval_eval`.
"""
from evals.retrieval_eval import aggregate, match_sources, partition_rows, score_row


class TestScoreRow:
    def test_hit_at_rank_one(self):
        chunks = ["Apple reports Greater China and Rest of Asia Pacific segments."]
        s = score_row(chunks, ["greater china", "rest of asia pacific"], k=5)
        assert s["hit"] == 1.0
        assert s["recall_at_k"] == 1.0            # both anchors in one chunk
        assert s["reciprocal_rank"] == 1.0        # first relevant chunk is rank 1
        assert s["first_relevant_rank"] == 1
        assert s["sources_missed"] == []

    def test_complete_miss(self):
        s = score_row(["totally unrelated text about weather"], ["greater china"], k=5)
        assert s == {
            "hit": 0.0, "recall_at_k": 0.0, "reciprocal_rank": 0.0,
            "first_relevant_rank": None, "sources_found": [],
            "sources_missed": ["greater china"],
        }

    def test_partial_recall(self):
        # only one of two anchors present -> recall 0.5, still a hit
        chunks = ["iPhone net sales grew this year."]
        s = score_row(chunks, ["wearables, home and accessories", "iphone"], k=5)
        assert s["hit"] == 1.0
        assert s["recall_at_k"] == 0.5
        assert s["sources_found"] == ["iphone"]
        assert s["sources_missed"] == ["wearables, home and accessories"]

    def test_mrr_reflects_first_relevant_rank(self):
        # anchor only in the 3rd chunk -> reciprocal rank 1/3
        chunks = ["noise", "more noise", "here is the app store discussion"]
        s = score_row(chunks, ["app store"], k=5)
        assert s["first_relevant_rank"] == 3
        assert round(s["reciprocal_rank"], 4) == round(1 / 3, 4)

    def test_k_truncation_excludes_late_hits(self):
        # relevant chunk sits at position 4 but k=3 -> not counted
        chunks = ["a", "b", "c", "carbon neutral commitment"]
        assert score_row(chunks, ["carbon neutral"], k=3)["hit"] == 0.0
        assert score_row(chunks, ["carbon neutral"], k=4)["hit"] == 1.0

    def test_case_insensitive_match(self):
        s = score_row(["LIQUIDITY and Marketable Securities"], ["liquidity", "marketable securities"], k=5)
        assert s["recall_at_k"] == 1.0

    def test_empty_retrieval_is_a_miss(self):
        s = score_row([], ["anything"], k=5)
        assert s["hit"] == 0.0 and s["reciprocal_rank"] == 0.0


class TestMatchSources:
    def test_records_first_rank_only(self):
        chunks = ["dividend policy", "more on the dividend and repurchase program"]
        found = match_sources(chunks, ["dividend", "repurchase"], k=5)
        assert found["dividend"] == 1      # first occurrence wins
        assert found["repurchase"] == 2


class TestPartitionRows:
    def test_route_defaults_to_filing(self):
        # rows without a `route` key are treated as filing (back-compat)
        rows = [{"qid": "a"}, {"qid": "b"}]
        filing, live = partition_rows(rows)
        assert len(filing) == 2 and live == []

    def test_live_rows_separated(self):
        rows = [
            {"qid": "f1", "route": "filing"},
            {"qid": "m1", "route": "live"},
            {"qid": "f2"},                       # default filing
            {"qid": "m2", "route": "live"},
        ]
        filing, live = partition_rows(rows)
        assert [r["qid"] for r in filing] == ["f1", "f2"]
        assert [r["qid"] for r in live] == ["m1", "m2"]


class TestAggregate:
    def test_means_and_counts(self):
        rows = [
            {"hit": 1.0, "recall_at_k": 1.0, "reciprocal_rank": 1.0},
            {"hit": 1.0, "recall_at_k": 0.5, "reciprocal_rank": 0.5},
            {"hit": 0.0, "recall_at_k": 0.0, "reciprocal_rank": 0.0},
        ]
        agg = aggregate(rows, k=5, n_no_context=1)
        assert agg["hit_rate"] == round(2 / 3, 4)
        assert agg["recall_at_k"] == round(1.5 / 3, 4)
        assert agg["mrr"] == round(1.5 / 3, 4)
        assert agg["k"] == 5 and agg["n_questions"] == 3 and agg["n_no_context"] == 1

    def test_empty_is_zero_not_crash(self):
        agg = aggregate([], k=5, n_no_context=0)
        assert agg["hit_rate"] == 0.0 and agg["n_questions"] == 0
