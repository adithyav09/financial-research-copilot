---
type: technique
title: "Writing Skill Descriptions"
aliases: [skill-description-field, skill-description, skill-discovery, skill-naming-conventions]
status: draft
sources: ["[[src-skill-authoring-best-practices]]", "[[src-agent-skills-overview]]", "[[src-claude-code-skills]]"]
updated: 2026-08-20
---

The `description` is the single most important field for a Skill because it is **what Claude matches your request against when deciding whether to trigger the Skill** ([[src-agent-skills-overview]]). It is injected into the system prompt and is what Claude uses to choose the right Skill from potentially 100+ available Skills ([[src-skill-authoring-best-practices]]).

## Rules for an effective description
- Say **both** what the Skill does **and** when to use it ([[src-agent-skills-overview]]).
- **Always write in third person** — the description is injected into the system prompt, and inconsistent point-of-view can cause discovery problems ([[src-skill-authoring-best-practices]]).
- Be specific and include key terms — both the function and specific triggers/contexts, e.g. "Use when working with PDF files or when the user mentions PDFs, forms, or document extraction" ([[src-skill-authoring-best-practices]]).
- Respect the limit: non-empty, max 1024 characters, no XML tags ([[src-agent-skills-overview]]). In Claude Code the combined `description` + `when_to_use` is truncated at 1,536 characters in the listing, so put the key use case first ([[src-claude-code-skills]]).

## Naming
Consider gerund form (verb + -ing) for Skill names — `processing-pdfs`, `analyzing-spreadsheets` — and avoid vague names like `helper`, `utils`, `tools` ([[src-skill-authoring-best-practices]]). The `name` itself is constrained to ≤64 chars, lowercase/numbers/hyphens (see [[skill-md]]).

## See also
[[skill-md]] · [[skill-authoring-best-practices]] · [[progressive-disclosure]]