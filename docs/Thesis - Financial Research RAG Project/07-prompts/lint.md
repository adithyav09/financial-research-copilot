# LINT — health-check the vault

**Goal:** keep the KB's integrity high as it grows. This is the pass that catches drift: uncited claims, stale indexes, orphans, duplicates, and conflicts — and it surfaces new article candidates and gaps worth researching. Run it periodically, and after any large INGEST/COMPILE.

Read `../AGENTS.md` first. LINT enforces the prime directives; it does not invent content.

## Checks (report each as a list of offenders, don't auto-fix destructively)

1. **Uncited claims.** Any factual sentence in `03-wiki/` not followed by `([[src-...]])` and not inside a labelled `## Synthesis` block. → flag for citation or demotion to Synthesis.

2. **Provenance breaks.** 
   - Wiki `sources:` entries pointing at source notes that don't exist.
   - Source notes still `status: summarized` (never compiled) — INGEST/COMPILE backlog.
   - `01-raw/` files with no `02-sources/` note (un-ingested raw).

3. **Unsupported-by-source claims.** Spot-check high-stakes wiki claims against the `## Key claims` of the source they cite. If the source no longer supports the claim, flag it — this is the "claim drifted from its source" check and the most valuable one.

4. **Dangling & orphan links.** Broken `[[links]]` (should be zero after COMPILE) and articles with no inbound links from any index or article (orphans — either link them from `_MOC.md` or question why they exist).

5. **Duplicates.** Two articles describing the same concept under different slugs/aliases → propose a merge (don't auto-merge; list them for the human).

6. **Stale indexes.** `wiki-index.md` / `sources-log.md` rows that don't match the files on disk (missing, extra, wrong status/count). → regenerate the index rows to match reality (this one you MAY fix directly, since indexes are derived).

7. **Open conflicts.** Unresolved `> [!conflict]` callouts still open in `open-questions.md`.

## Generative outputs (the useful half)

8. **Article candidates.** Concepts referenced 3+ times across the wiki with only a stub or no article → propose promoting them.

9. **Missing connections.** Pairs of articles that clearly relate but don't link each other → propose backlinks.

10. **Gaps to research.** Open questions where a targeted web search + INGEST would materially strengthen the thesis → list them, prioritized.

## Done when
- A LINT report is written to `04-outputs/<date>-lint-report.md`.
- Index staleness (check 6) is fixed in place.
- Everything else is listed for human/agent follow-up, with the top 3 highest-value fixes called out.

Report: counts per check, the fixes you made to indexes, and the 3 highest-value follow-ups.