# COMPILE — source notes → linked wiki

**Goal:** fold every `status: summarized` source note into `03-wiki/`, merging (never clobbering), then mark those sources `compiled`. This is the hardest verb — the vault's integrity lives or dies here.

Read `../AGENTS.md` first. The relevant directives: additive/idempotent merge, no silent overwrite on conflict, stubs for missing links, sourced-vs-derived is explicit.

## Procedure

1. **Select work.** Find all `02-sources/src-*` notes with `status: summarized`. If none, **stop — this is a no-op** (idempotency check). Report "nothing to compile."

2. **For each source, per concept it touches:**

   a. **Locate the target article.** Search `03-wiki/` and `05-indexes/wiki-index.md` for an existing article (check `aliases`, not just filename). 

   b. **If it exists → MERGE, don't rewrite.**
      - Add each new *cited* claim as its own sentence with `([[src-...]])`. Leave existing correct, cited prose untouched.
      - Append the source to the article's `sources:` frontmatter list.
      - **Conflict check:** if a new claim contradicts an existing one, do NOT replace it. Insert a `> [!conflict]` callout naming both sources, and add a line to `open-questions.md`. Never pick a winner.
      - Bump `updated:` to today's date. Promote `status` (stub→draft) only if the article now has real cited substance.

   c. **If it doesn't exist → CREATE.** New `03-wiki/<slug>.md` from the template. Pick the right `type`. If the source only mentions it in passing, create a `status: stub` (one cited sentence) rather than a padded article.

3. **Resolve dangling links.** For every `[[concept]]` you referenced that has no file, create a `status: stub` article so the graph has no broken links. A stub = frontmatter + one cited sentence + `## See also`.

4. **Synthesis (optional, deliberate).** If a source genuinely connects to existing material, you may add/extend a `## Synthesis` block — clearly labelled, naming every source it draws on. Synthesis is never a bare fact and never carries an inline `([[src]])` as if it were sourced. When in doubt, leave it for QUERY/LINT to surface as an article candidate instead.

5. **Close out.** Set each processed source note to `status: compiled`.

6. **Update indexes.**
   - `05-indexes/wiki-index.md` — add/update a row per touched article (status, #sources, updated).
   - `05-indexes/_MOC.md` — if a new concept hub emerged, link it from the map.
   - `05-indexes/open-questions.md` — log conflicts and any "this article is now big enough to split" notes.

## Idempotency guarantee
Running COMPILE twice in a row must produce zero changes the second time. If it doesn't, you overwrote instead of merged — investigate.

## Done when
- No `status: summarized` sources remain.
- No dangling `[[links]]`.
- Every wiki claim is cited or inside a labelled Synthesis block.
- Indexes reflect reality.

Report: articles created, articles merged-into, stubs made, conflicts logged.