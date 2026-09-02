---
type: index
title: "Open Questions"
updated: 2026-08-30
---

# Open Questions

The vault's "known unknowns" — gaps, unresolved conflicts, and article candidates. Fed by every verb; doubles as the thesis's research backlog.

## Resolved / done
- ✅ **Financial-RAG papers ingested & compiled** (2026-08-20). All 6 arXiv papers → source notes → 11 wiki articles under [[financial-document-qa]]. See follow-ups below for the withdrawn-source caveat.
- ✅ **Measurement layer built** (2026-08-30). Arize tracing + a RAGAS/LLM-judge eval harness on the reference implementation; first baseline published to Arize. Wrote [[rag-evaluation]], [[llm-observability-tracing]], and the [[rag-eval-and-observability-buildlog]] output; source [[src-observability-eval-implementation]].
- ✅ **Arize management-API 404 root-caused** (2026-08-30). Not an auth/access issue — the account is on Arize's GCP cluster served via generic `api.arize.com`, not the SDK/CLI default `api.us-east-1b.arize.com`. Recorded in [[llm-observability-tracing]].

## Unresolved conflicts
- **"Claude Developer Platform" vs "Claude API".** The engineering blog names the API surface "Claude Developer Platform" ([[src-equipping-agents-for-the-real-world-with-agent-skills]]); the platform docs call it "Claude API" ([[src-agent-skills-overview]]). Merged into [[claude-developer-platform]] with both as aliases; confirm the canonical current name and pick one. → resolve by checking the live docs nav.

## Gaps to research
- **Reranking A/B (now the empirically-motivated next build).** The first eval baseline shows high recall (0.92) + low precision (0.34) — the signature [[reranking]] targets. Add a cross-encoder rerank stage, re-run `make eval`, publish beside the baseline in Arize, and report the precision/correctness delta. → turns the corpus's strongest reported win ([[src-financial-rag-reranking]]) into a local measured result.
- **Golden-set reference quality.** `factual_correctness` (0.41) is depressed by terse reference answers; expand them before treating that number as real ([[src-observability-eval-implementation]]). → author fuller ground-truth answers, spot-check against the live 10-K.
- **Vault domain mismatch.** `AGENTS.md` declares the domain as *financial-research / RAG* only, but the vault now holds two compiled topics (that domain **plus** Claude Code Skills). Decide: broaden the domain statement, split into a second vault, or treat Skills as a methods chapter of the thesis. → user decision.
- **Withdrawn source in the finance wiki.** `src-agentic-financial-rag-finagent` (arXiv:2605.05409, FinAgent-RAG) was **withdrawn by its authors**; its numbers (FinQA 76.81% / ConvFinQA 78.46% / TAT-QA 74.96%) are cited as *unverified* in [[agentic-rag]], [[program-of-thought]], and [[financial-qa-benchmarks]]. → re-source these from a non-withdrawn paper or drop the numbers before thesis use.
- **Skill evaluation depth.** The best-practices guide asserts eval-driven development but the sources give no worked metric/benchmark for skill quality. → search for empirical skill-evaluation studies.

## Article candidates
- **`code-execution-tool`** — currently an alias of [[skills-across-surfaces]]; referenced enough (API container, progressive disclosure, sandbox) that it may deserve its own article. → promote if a 3rd source elaborates it.
- **`context-engineering`** — currently an alias of [[progressive-disclosure]]; a broader concept that may warrant its own hub as the wiki grows.
- **`skill-versioning`** — mentioned via `license`/`compatibility`/`metadata` fields but never fully documented in the sources. → gather a source, then promote.

## Verification follow-ups (for LINT)
- The engineering-blog clips originally came through a summarizing reader; load-bearing blog claims (launch date, "supported across 4 surfaces", open standard) were cross-checked against the docs clips during COMPILE. A clean verbatim re-pull would further harden [[agent-skills]] and [[agent-skills-open-standard]].