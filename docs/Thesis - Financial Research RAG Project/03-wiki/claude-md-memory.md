---
type: concept
title: "CLAUDE.md Memory"
aliases: [CLAUDE.md, memory, claude-md-memory]
status: stub
sources: ["[[src-claude-code-skills]]"]
updated: 2026-08-20
---

The always-loaded project/user instruction file in [[claude-code|Claude Code]]. Its content is loaded on every turn, whereas a [[skill-md|skill]] body loads only when used — so long reference material is cheap as a skill and expensive in CLAUDE.md ([[src-claude-code-skills]]). The guidance: keep **facts** in CLAUDE.md, and move a section into a skill once it has "grown into a procedure rather than a fact" ([[src-claude-code-skills]]).

## See also
[[skills-vs-other-extensibility]] · [[agent-skills]] · [[progressive-disclosure]]