---
type: concept
title: "Agent Skills Open Standard"
aliases: [open standard, agentskills.io]
status: draft
sources: ["[[src-claude-code-skills]]", "[[src-equipping-agents-for-the-real-world-with-agent-skills]]"]
updated: 2026-08-20
---

Agent Skills were published as an **open standard** (agentskills.io) for cross-platform portability ([[src-equipping-agents-for-the-real-world-with-agent-skills]]). Claude Code skills follow this standard, which works across multiple AI tools, and Claude Code extends it with additional features like invocation control, subagent execution, and dynamic context injection ([[src-claude-code-skills]]).

## The spec surface
The portable core is six frontmatter fields: `name`, `description`, `license`, `compatibility`, `metadata`, [[allowed-tools|`allowed-tools`]] ([[src-claude-code-skills]]). Outside Claude Code — claude.ai uploads, the Skills API, packaging with `package_skill.py` — only these six are allowed, and any other field fails packaging/upload with a hard error ([[src-claude-code-skills]]). Claude Code's extra fields (see [[skill-md]]) are therefore proprietary extensions layered on the standard.

## Synthesis
The open standard is what lets one authored [[skill-md|SKILL.md]] move between tools, but "portable" means *the six spec fields*. A skill leaning on Claude Code extensions (`context: fork`, `hooks`, dynamic injection) is portable only in its spec-compliant core — a real constraint for anyone authoring skills meant to run on both Claude Code and the API. See [[skills-across-surfaces]].
Draws on: [[src-claude-code-skills]], [[src-equipping-agents-for-the-real-world-with-agent-skills]].

## See also
[[agent-skills]] · [[skill-md]] · [[skills-across-surfaces]]