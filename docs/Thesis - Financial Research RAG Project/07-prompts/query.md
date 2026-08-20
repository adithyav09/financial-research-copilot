# QUERY — question → cited output, filed back in

**Goal:** answer a research question by navigating the wiki, produce an output artifact in `04-outputs/`, and (when it adds durable value) file the result back into the KB so exploration compounds.

Read `../AGENTS.md` first. Navigation is structural: start from indexes, follow links. Do not invent facts the wiki doesn't support.

## Procedure

1. **Orient.** Read `05-indexes/_MOC.md` and `05-indexes/wiki-index.md`. Identify the articles relevant to the question. Follow their `[[links]]` and `sources:` outward until you have the relevant neighborhood — not the whole vault.

2. **Answer from the KB, grounded.** Build the answer from cited wiki claims. Carry the citations through: every claim in the output links back to the `[[src-...]]` (or wiki article) it came from. 
   - If the wiki **can't** support part of the answer, say so explicitly and add it to `05-indexes/open-questions.md`. Do **not** paper over gaps with model priors. Optionally run a web search to fill the gap — but anything you pull in must be captured as a new source via INGEST, not smuggled straight into the output.

3. **Choose the output format** to fit the question and write it to `04-outputs/<date>-<slug>.<ext>`:
   - Prose/report → markdown (`.md`).
   - Slides → Marp markdown (`---` separators, `marp: true` frontmatter).
   - Figure/chart → a script in `04-outputs/` that emits a PNG into `assets/`, plus the `![[assets/...png]]` embed. Prefer reproducible scripts over pasted numbers.
   - Comparison → a markdown table.

4. **File back in (when durable).** If the output is a reusable synthesis (a comparison, a literature map, a definition the wiki lacked), promote it:
   - Turn it into or fold it into a `03-wiki/` article via the COMPILE rules (labelled `## Synthesis`, naming sources), **or**
   - Leave it in `04-outputs/` and link it from the relevant wiki article's `## See also`.
   - Update the indexes accordingly.
   One-off answers can stay in `04-outputs/` unfiled.

## Done when
- The output exists in `04-outputs/`, fully cited, gaps flagged.
- Any new external facts were captured as sources, not free-floating.
- Durable results are filed back and indexed.

Report: where the output landed, what was filed back, and what open questions the query exposed.