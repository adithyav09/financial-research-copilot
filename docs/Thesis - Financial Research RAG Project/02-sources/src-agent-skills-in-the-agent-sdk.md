---
type: source
title: "Extend agents with skills — Claude Agent SDK Docs"
authors: [Anthropic]
published:
clipped: 2026-08-16
url: https://code.claude.com/docs/en/agent-sdk/skills
source-type: docs
raw: "[[01-raw/agent-skills-in-the-agent-sdk]]"
status: compiled
tags: [agent-skills, claude-agent-sdk, availability, slash-commands, subagents]
---

## TL;DR
The Claude Agent SDK docs page showing that Skills in the SDK are filesystem-based (no programmatic registration API), discovered via `settingSources`, and scoped with the `skills` option — the same SKILL.md artifacts as Claude Code.

## Key claims
- "Skills are packaged as `SKILL.md` files containing instructions, descriptions, and optional supporting resources."
- In the Agent SDK skills are "Defined as filesystem artifacts," "Loaded from filesystem" locations governed by `settingSources`/`setting_sources`, "Automatically discovered" at startup, "Model-invoked," and "User-invoked" by sending `/<name>`.
- "Unlike subagents, which you can define in the `agents` option, you create skills as files on disk. The SDK doesn't provide a programmatic API for registering them."
- With default `query()` options the SDK loads user and project sources, making skills in `~/.claude/skills/`, `<cwd>/.claude/skills/`, and parent `.claude/skills/` directories up to the repo root available.
- The `skills` option controls invocation: `"all"` enables every discovered skill, a name list allows only those, `[]` allows none; when omitted, discovered skills are enabled and the Skill tool is available, "matching CLI behavior."
- "When you set `skills`, the SDK adds the Skill tool to `allowedTools` automatically."
- A command in an SDK session is "anything you run by sending `/<name>` in a prompt," spanning built-in commands, bundled skills, your authored skills, and older `.claude/commands/` files; "Skills are their recommended successor."
- The `system/init` message exposes a `skills` array (user-invocable skills loaded) and a `slash_commands` field (available commands).
- "Sessions that configure MCP servers can also expose MCP prompts as commands."
- For project and personal skills in SDK sessions, tool approval is managed via the `allowedTools`/`allowed_tools` query option rather than the `allowed-tools` frontmatter field, which "applies only when you use the Claude Code CLI directly."

## Relevance to thesis
Confirms that a financial-research RAG copilot built on the Claude Agent SDK inherits the identical filesystem SKILL.md model as Claude Code — the same skills can drive both an interactive CLI and a programmatic/headless backend agent, which matters for the thesis's argument about portability of a single skill library across deployment surfaces.

## Concepts touched
[[agent-skills]] · [[skill-md]] · [[claude-agent-sdk]] · [[slash-commands]] · [[subagents]] · [[model-context-protocol]] · [[claude-code]]