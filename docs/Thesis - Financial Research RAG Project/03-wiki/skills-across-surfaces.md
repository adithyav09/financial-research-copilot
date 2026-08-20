---
type: concept
title: "Skills Across Surfaces"
aliases: [skills-availability, availability matrix, pre-built-skills, code-execution-tool, code-execution-environment, container-sandbox]
status: draft
sources: ["[[src-agent-skills-overview]]", "[[src-agent-skills-in-the-agent-sdk]]", "[[src-equipping-agents-for-the-real-world-with-agent-skills]]"]
updated: 2026-08-20
---

[[agent-skills|Agent Skills]] are supported across [[claude-ai]], [[claude-code]], the [[claude-agent-sdk]], and the [[claude-developer-platform]] ([[src-equipping-agents-for-the-real-world-with-agent-skills]]) — but the runtime, sharing scope, and network access differ by surface.

## The execution environment
Skills run in a code execution environment where Claude has filesystem access, bash commands, and code execution capabilities ([[src-agent-skills-overview]]). This is why [[progressive-disclosure]] works: a script runs through bash and only its output enters context.

## Per-surface differences
- **claude.ai** — supports pre-built and custom Skills; custom Skills are uploaded as zip files via Settings > Features, are individual to each user, and cannot be centrally managed by admins; network access varies ([[src-agent-skills-overview]]).
- **Claude API / [[claude-developer-platform|Developer Platform]]** — using Skills requires the **code execution tool**, whose container the Skills run in; you specify the relevant `skill_id` in the `container` parameter. Skills run in a **sandboxed container with no network access and no runtime package installation**. Pre-built Agent Skill IDs are `pptx`, `xlsx`, `docx`, `pdf`; custom Skills go through the Skills API (`/v1/skills`) ([[src-agent-skills-overview]]).
- **Claude Code** — supports custom, filesystem-based Skills (`~/.claude/skills/`, `.claude/skills/`) with **full network access** (same as any program on your computer); the pre-built document Skills are not available, though the open-source Claude API skill is bundled ([[src-agent-skills-overview]]).
- **Claude Agent SDK** — Skills are filesystem artifacts discovered via `settingSources`; there is no programmatic registration API (unlike subagents). The `skills` option controls invocation (`"all"`, a name list, or `[]`), and setting it adds the Skill tool to `allowedTools` automatically ([[src-agent-skills-in-the-agent-sdk]]).

## No cross-surface sync
"Custom Skills do not sync across surfaces" — a Skill uploaded to claude.ai must be separately uploaded to the API, API Skills aren't available on claude.ai, and Claude Code Skills are separate from both ([[src-agent-skills-overview]]). Sharing scope: claude.ai = individual user; Claude API = workspace-wide; Claude Code = personal or project (shareable via [[claude-code-plugins|plugins]]) ([[src-agent-skills-overview]]). Anthropic publishes open-source Skills at github.com/anthropics/skills ([[src-agent-skills-overview]]). Note: Agent Skills is not covered by ZDR arrangements ([[src-agent-skills-overview]]).

## Synthesis
The network split is the decision-driver for a data-fetching app: **API Skills cannot reach the network**, so live EDGAR/Yahoo fetching must be a tool call outside the sandbox, whereas a Claude Code Skill can fetch directly. A single SKILL.md library is portable across surfaces, but its *capabilities* are not uniform — design the skill to degrade gracefully where the sandbox has no network.
Draws on: [[src-agent-skills-overview]], [[src-agent-skills-in-the-agent-sdk]].

## See also
[[agent-skills]] · [[progressive-disclosure]] · [[claude-developer-platform]] · [[claude-agent-sdk]] · [[skill-storage-and-precedence]]