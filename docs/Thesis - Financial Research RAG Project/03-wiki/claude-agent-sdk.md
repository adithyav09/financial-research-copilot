---
type: system
title: "Claude Agent SDK"
aliases: [Claude Agent SDK, agent sdk]
status: stub
sources: ["[[src-agent-skills-in-the-agent-sdk]]"]
updated: 2026-08-20
---

Anthropic's SDK for building agents, and one of the four surfaces that support [[agent-skills|Agent Skills]] (see [[skills-across-surfaces]]). In the SDK, Skills are the same `SKILL.md` filesystem artifacts as [[claude-code|Claude Code]], discovered via `settingSources`; there is no programmatic API for registering them, unlike [[subagents]], which are defined in the `agents` option ([[src-agent-skills-in-the-agent-sdk]]). The `skills` query option controls invocation and, when set, adds the Skill tool to `allowedTools` automatically ([[src-agent-skills-in-the-agent-sdk]]).

## See also
[[skills-across-surfaces]] · [[skills-vs-other-extensibility]] · [[skill-md]]
