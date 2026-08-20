---
type: system
title: "Claude Code"
aliases: [Claude Code, bundled-skills]
status: stub
sources: ["[[src-claude-code-skills]]"]
updated: 2026-08-20
---

Anthropic's agentic coding CLI, and one of the four surfaces where [[agent-skills|Agent Skills]] run (see [[skills-across-surfaces]]). Its Skills are filesystem-based, follow the [[agent-skills-open-standard]], and are extended with invocation control, subagent execution, and dynamic context injection ([[src-claude-code-skills]]). Claude Code ships **bundled skills** — e.g. `/doctor`, `/code-review`, `/debug`, `/loop`, `/verify`, `/claude-api` — which are prompt-based (they instruct Claude and let it orchestrate), unlike most built-in commands which execute fixed logic directly ([[src-claude-code-skills]]).

## See also
[[skill-storage-and-precedence]] · [[allowed-tools]] · [[claude-code-plugins]] · [[skills-across-surfaces]]
