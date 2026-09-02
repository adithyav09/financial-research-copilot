# INGEST — raw material → source notes

**Goal:** turn everything sitting in `00-inbox/` (and any un-summarized files in `01-raw/`) into one provenance-complete source note per source in `02-sources/`. Do **not** touch the wiki here — that is COMPILE's job.

Read `../AGENTS.md` first. Obey the prime directives, especially: raw is immutable, dates are absolute.

## Procedure

1. **Inventory.** List every file in `00-inbox/` and any file in `01-raw/` with no matching `src-*` note in `02-sources/`. Report the count before starting.

2. **For each source, place the raw.** If it came in via `00-inbox/`, move the verbatim material to `01-raw/` (keep it byte-for-byte; only rename to a clean slug). Download referenced images into `assets/` and rewrite links to `![[assets/...]]` so the note is self-contained offline.

3. **Write the source note** `02-sources/src-<slug>.md` using the template in `AGENTS.md`. Requirements:
   - Fill **all** frontmatter fields you can determine; leave a field blank rather than guessing. If you infer a value (e.g. publication date from context), mark it `?`.
   - `## Key claims` must be **atomic and verbatim-checkable** against the raw — these are the sentences the wiki will cite, so extract, don't paraphrase into vagueness.
   - `## Relevance to thesis` connects it to financial-research RAG explicitly.
   - `## Concepts touched` lists the wiki concepts this source will feed, as `[[links]]` (they may not exist yet — that's fine, COMPILE creates them).
   - Set `status: summarized`.

4. **Do not synthesize.** No cross-source claims, no "this contradicts X." Capture only what THIS source says. Connections happen in COMPILE.

5. **Update indexes.**
   - Append a row to `05-indexes/sources-log.md`.
   - If the source raises an obvious open question, add it to `05-indexes/open-questions.md`.

6. **Empty the inbox.** Every item in `00-inbox/` is either turned into a source note or, if out of scope, moved to a `00-inbox/rejected/` folder with a one-line reason. The inbox ends empty.

## Done when
- `00-inbox/` is empty.
- Every new/changed source has a `status: summarized` note with complete provenance.
- `sources-log.md` reflects reality.

Report: N sources ingested, M rejected (with reasons), and any sources whose provenance you could not fully establish.