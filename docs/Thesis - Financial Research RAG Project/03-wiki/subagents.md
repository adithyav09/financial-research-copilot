---
type: concept
title: "Subagents"
aliases: [subagent, subagents, skill-subagents]
status: stub
sources: ["[[src-claude-code-skills]]", "[[src-agent-skills-in-the-agent-sdk]]"]
updated: 2026-08-20
---

Isolated agent instances with their own context. Skills and subagents combine two ways: a skill with `context: fork` runs in a subagent whose prompt is the skill content and which has no access to conversation history, and a subagent with a `skills` field preloads skills as reference material ([[src-claude-code-skills]]). `context: fork` "only makes sense for skills with explicit instructions," since a pure-guideline skill returns no meaningful output ([[src-claude-code-skills]]). In the [[claude-agent-sdk|Agent SDK]], subagents are defined programmatically in the `agents` option, unlike filesystem-based skills ([[src-agent-skills-in-the-agent-sdk]]).

## See also
[[skills-vs-other-extensibility]] · [[allowed-tools]] · [[claude-code-plugins]]