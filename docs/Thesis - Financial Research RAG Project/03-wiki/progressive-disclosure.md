---
type: concept
title: "Progressive Disclosure"
aliases: [three-level loading, context-window-management, context-engineering]
status: draft
sources: ["[[src-agent-skills-overview]]", "[[src-equipping-agents-for-the-real-world-with-agent-skills]]", "[[src-skill-authoring-best-practices]]"]
updated: 2026-08-20
---

**Progressive disclosure** is the core design principle of [[agent-skills|Agent Skills]]: Claude loads information in stages as needed rather than consuming context upfront ([[src-agent-skills-overview]]). It works because agents with a filesystem and code-execution tools don't need to read the entirety of a skill into their context window ([[src-equipping-agents-for-the-real-world-with-agent-skills]]).

## The three levels
- **Level 1 — Metadata.** Always loaded at startup, ~100 tokens per Skill: the `name` and `description` from YAML frontmatter, injected into the system prompt ([[src-agent-skills-overview]]).
- **Level 2 — Instructions.** The [[skill-md|SKILL.md]] body, loaded only when the Skill is triggered; kept under ~5k tokens ([[src-agent-skills-overview]]).
- **Level 3+ — Resources.** Bundled reference files and scripts, loaded as needed with no token cost until accessed ([[src-agent-skills-overview]]).

At startup only the metadata of all Skills is pre-loaded; Claude reads SKILL.md only when the Skill becomes relevant and reads additional files only as needed ([[src-skill-authoring-best-practices]]).

## Why it matters
"Until a Skill is triggered, only its name and description occupy context," so you can install many Skills without a context penalty ([[src-agent-skills-overview]]). Reference files load into context when read, but **scripts run through bash so only their output enters context — the script code itself never loads** ([[src-agent-skills-overview]]); token generation is far more expensive than simply running an algorithm ([[src-equipping-agents-for-the-real-world-with-agent-skills]]). This makes the context that can be bundled into a skill "effectively unbounded" ([[src-equipping-agents-for-the-real-world-with-agent-skills]]).

## See also
[[agent-skills]] · [[skill-md]] · [[skill-authoring-best-practices]] · [[skills-across-surfaces]]