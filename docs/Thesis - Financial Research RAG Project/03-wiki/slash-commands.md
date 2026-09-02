---
type: concept
title: "Slash Commands"
aliases: [slash command, slash-commands, custom commands]
status: stub
sources: ["[[src-claude-code-skills]]"]
updated: 2026-08-20
---

User-invoked `/name` commands in [[claude-code|Claude Code]]. **Custom commands have been merged into [[agent-skills|skills]]**: a file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way, and if the two share a name the skill takes precedence ([[src-claude-code-skills]]). Skills are the recommended successor, adding a directory for supporting files, invocation-control frontmatter, and automatic model loading over a plain command ([[src-claude-code-skills]]).

## See also
[[skills-vs-other-extensibility]] · [[allowed-tools]]