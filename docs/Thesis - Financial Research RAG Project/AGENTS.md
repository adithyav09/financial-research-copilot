# AGENTS.md — Vault Operating Manual

This vault is an **LLM-maintained knowledge base**. An agent does almost all writing here; a human rarely edits notes directly. This file is the contract every agent reads before touching anything.

## What this KB is about

The research domain for a thesis on **financial-research / retrieval-augmented-generation (RAG) systems**: the literature, techniques, competing products, benchmarks, datasets, and open problems in building LLM systems that answer questions over financial documents (SEC filings, market data, XBRL, etc.). Everything in here exists to feed thesis writing — so **provenance and factual integrity outrank fluency**. A well-cited stub beats a beautiful uncited paragraph.

## The pipeline

Raw sources are collected, an agent *compiles* them into a linked wiki, the wiki is *queried* to produce outputs, and outputs are *filed back in* so exploration compounds. Four verbs, one per prompt in `07-prompts/`:

```
00-inbox     triage queue — anything dumped here, unplaced. Agent empties it during INGEST.
01-raw       verbatim source material (clipped articles, PDFs, code, notes). Never edited.
02-sources   one summary note per source, with full provenance. Written by INGEST.
03-wiki      concept/technique/system articles, backlinked. Written/merged by COMPILE.
04-outputs   query results (reports, slides, figures). Written by QUERY, may be filed back.
05-indexes   navigation layer the agent reads FIRST. Kept current by every verb.
07-prompts   the four operating procedures: ingest · compile · query · lint.
assets       images and binaries referenced by notes (e.g. ![[assets/foo.png]]).
```

Navigation is **structural, not semantic** — no embeddings. The agent finds things by reading `05-indexes/` and following `[[wikilinks]]`. This is why the indexes must never go stale (see LINT).

## Prime directives (invariants — never violate)

1. **Every claim traces to a source.** A factual statement in `03-wiki` must be followed by an inline `([[source-note]])` citation, *or* live inside a marked `## Synthesis` block that lists the sources it triangulates. No citation = not allowed. LINT flags violations.
2. **Sourced vs. derived is explicit.** Facts come from `02-sources`. Synthesis (the agent's own connections) is labelled as such and still names its inputs. Never let a synthesis harden into an uncited "fact."
3. **Never silently overwrite on conflict.** If a new source contradicts an existing wiki claim, do **not** replace it. Insert a `> [!conflict]` callout naming both sources and log the disagreement in `05-indexes/open-questions.md`. The human resolves conflicts.
4. **Compile is idempotent and additive.** Re-running COMPILE with no new sources must be a no-op. Merge new claims into existing articles; do not rewrite prose that is already correct and cited.
5. **No dangling links, but stubs are fine.** When you reference a concept that has no article yet, create a `status: stub` article for it rather than leaving a broken `[[link]]`. A stub is a promise, not an error.
6. **Raw is immutable.** Never edit anything in `01-raw/`. Corrections happen in source notes or wiki articles.
7. **Dates are absolute.** Write real dates (`2026-08-16`), never "today"/"last week".

## Naming & frontmatter conventions

**Filenames** are human-readable kebab-case slugs (Obsidian resolves `[[Title]]` and `[[slug]]`). Prefix source notes with `src-`.

### Source note — `02-sources/src-<slug>.md`
```markdown
---
type: source
title: "Dense Passage Retrieval for Open-Domain QA"
authors: [Karpukhin, et al.]
published: 2020-04-10
clipped: 2026-08-16
url: https://arxiv.org/abs/2004.04906
source-type: paper        # paper | article | repo | dataset | docs | video | note
raw: "[[01-raw/dpr-2020.pdf]]"   # verbatim copy, if stored
status: summarized        # summarized -> compiled
tags: [retrieval, dense-embeddings]
---

## TL;DR
Two-sentence gist.

## Key claims
- Claim, stated so a wiki article can cite it verbatim.
- Each claim is atomic and checkable against `raw`.

## Relevance to thesis
Why this matters for financial-research RAG specifically.

## Concepts touched
[[dense-retrieval]] · [[open-domain-qa]] · [[negative-sampling]]
```

### Wiki article — `03-wiki/<slug>.md`
```markdown
---
type: concept          # concept | technique | system | benchmark | dataset | paper | org | person
title: "Dense Retrieval"
aliases: [dense passage retrieval, DPR]
status: draft          # stub | draft | reviewed
sources: ["[[src-dpr-2020]]"]   # every source this article draws on
updated: 2026-08-16
---

Definition sentence with citation ([[src-dpr-2020]]).

## Details
Cited claims, each with its `([[src-...]])`.

## Synthesis
Agent's own connections. Names its inputs; not treated as fact.
Draws on: [[src-dpr-2020]], [[src-...]].

## See also
[[sparse-retrieval]] · [[hybrid-search]]
```

Callout for conflicts (directive #3):
```markdown
> [!conflict] Sources disagree
> [[src-a]] reports X; [[src-b]] reports Y. Logged in open-questions.
```

## The index layer (`05-indexes/`)

Read these first, keep them current:
- `_MOC.md` — Map of Content: the front door; links the major concept hubs.
- `sources-log.md` — table of every source (title, type, date, status).
- `wiki-index.md` — table of every wiki article (title, type, status, #sources, updated).
- `open-questions.md` — running list of gaps, conflicts, and article candidates. LINT feeds this; it doubles as the thesis's "known unknowns" list.

## Running an operation

Point an agent at the relevant procedure and let it work top to bottom:
- Ingest new material → `07-prompts/ingest.md`
- Fold sources into the wiki → `07-prompts/compile.md`
- Answer a question / produce an output → `07-prompts/query.md`
- Health-check the vault → `07-prompts/lint.md`

Every verb ends by updating the affected index files. That is not optional.