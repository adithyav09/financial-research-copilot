---
type: concept
title: "Skills vs. Other Extensibility Mechanisms"
aliases: [skills vs slash commands, extensibility comparison, which extensibility mechanism]
status: draft
sources: ["[[src-claude-code-skills]]", "[[src-equipping-agents-for-the-real-world-with-agent-skills]]", "[[src-agent-skills-in-the-agent-sdk]]"]
updated: 2026-08-20
---

How [[agent-skills|Agent Skills]] relate to the other ways of extending Claude Code.

## vs. [[claude-md-memory|CLAUDE.md memory]]
CLAUDE.md content is always loaded; a skill's body loads only when it's used, so long reference material costs almost nothing until needed ([[src-claude-code-skills]]). Rule of thumb: **CLAUDE.md for always-true facts, a Skill for an on-demand procedure** — "create a skill when a section of CLAUDE.md has grown into a procedure rather than a fact" ([[src-claude-code-skills]]).

## vs. [[slash-commands|slash commands]]
Custom commands have been **merged into** skills: `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way, and if a skill and a command share a name the skill takes precedence ([[src-claude-code-skills]]). Skills add a directory for supporting files, frontmatter for invocation control, and automatic loading ([[src-claude-code-skills]]).

## vs. [[subagents]]
Skills and subagents combine two ways: a skill with `context: fork` runs in an isolated subagent (skill content becomes the prompt, no conversation history), and a subagent with a `skills` field preloads skills as reference material ([[src-claude-code-skills]]). In the [[claude-agent-sdk|Agent SDK]], subagents are defined programmatically in the `agents` option while skills are filesystem artifacts with no registration API ([[src-agent-skills-in-the-agent-sdk]]).

## vs. [[hooks]]
Use hooks to enforce behavior **deterministically**; a skill's `hooks` frontmatter registers hooks when the skill is invoked that keep running for the rest of the session ([[src-claude-code-skills]]). Skills instruct a model (probabilistic); hooks execute fixed logic (deterministic).

## vs. [[model-context-protocol|MCP]]
Skills **complement** MCP servers by teaching agents the more complex workflows that involve external tools and software ([[src-equipping-agents-for-the-real-world-with-agent-skills]]) — MCP connects tools; skills teach the procedure for using them.

## Synthesis: which to reach for
- Standing fact the agent must always know → [[claude-md-memory|CLAUDE.md]].
- Repeatable procedure loaded on demand → **Skill**.
- A user-triggered command → Skill (with `disable-model-invocation` for side-effecting ones).
- Isolated deep work on its own context → subagent (or a `context: fork` skill).
- Non-negotiable, must-happen-every-time enforcement → [[hooks]].
- Connecting an external tool/data source → [[model-context-protocol|MCP]] server.
Draws on: [[src-claude-code-skills]], [[src-equipping-agents-for-the-real-world-with-agent-skills]], [[src-agent-skills-in-the-agent-sdk]].

## See also
[[agent-skills]] · [[claude-code-plugins]] · [[skills-across-surfaces]]