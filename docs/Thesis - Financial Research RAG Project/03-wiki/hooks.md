---
type: concept
title: "Hooks"
aliases: [hook, hooks]
status: stub
sources: ["[[src-claude-code-skills]]", "[[src-claude-code-discover-install-plugins-marketplaces]]"]
updated: 2026-08-20
---

Deterministic enforcement points in [[claude-code|Claude Code]]. Use hooks to **enforce behavior deterministically**, in contrast to a skill, which instructs a model probabilistically ([[src-claude-code-skills]]). A skill's `hooks` frontmatter registers hooks when the skill is invoked, and they keep running for the rest of the session ([[src-claude-code-skills]]). Hooks can also be bundled and distributed inside [[claude-code-plugins|plugins]] ([[src-claude-code-discover-install-plugins-marketplaces]]).

## See also
[[skills-vs-other-extensibility]] · [[claude-code-plugins]]