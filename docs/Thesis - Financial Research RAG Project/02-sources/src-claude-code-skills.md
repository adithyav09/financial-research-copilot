---
type: source
title: "Extend Claude with skills (Claude Code docs)"
authors: [Anthropic]
published: 2026-08-16?
clipped: 2026-08-16
url: https://code.claude.com/docs/en/skills
source-type: docs
raw: "[[01-raw/claude-code-skills]]"
status: compiled
tags: [agent-skills, claude-code, allowed-tools, frontmatter, invocation-control, positioning]
---

## TL;DR
The Claude Code reference for authoring/managing Skills: when to make one, positioning against CLAUDE.md / slash commands / subagents / hooks, the full SKILL.md frontmatter field list, storage locations + precedence, invocation control, the `allowed-tools`/`disallowed-tools` grant model, content lifecycle, and the open-standard relationship. (Merged clip covering the mechanics, positioning, and frontmatter/allowed-tools sections of the same page.)

## Key claims
- "Skills extend what Claude can do. Create a `SKILL.md` file with instructions, and Claude adds it to its toolkit. Claude uses skills when relevant, or you can invoke one directly with `/skill-name`."
- "Create a skill when you keep pasting the same instructions, checklist, or multi-step procedure into chat, or when a section of CLAUDE.md has grown into a procedure rather than a fact."
- "Unlike CLAUDE.md content, a skill's body loads only when it's used, so long reference material costs almost nothing until you need it."
- "Custom commands have been merged into skills." `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way; if a skill and a command share a name, the skill takes precedence.
- Skills add over plain commands: a directory for supporting files, frontmatter to control who invokes them, and the ability for Claude to load them automatically.
- "Claude Code skills follow the Agent Skills open standard (agentskills.io), which works across multiple AI tools. Claude Code extends the standard with additional features like invocation control, subagent execution, and dynamic context injection."
- Bundled skills (e.g. `/doctor`, `/code-review`, `/debug`, `/loop`, `/claude-api`, `/verify`) are prompt-based (they instruct Claude and let it orchestrate); most built-in commands instead execute fixed logic directly. Claude invokes some bundled skills automatically; others (including `/verify`) run only when invoked.
- Storage locations determine who can use a skill: Enterprise (managed settings) > Personal `~/.claude/skills/<name>/SKILL.md` > Project `.claude/skills/<name>/SKILL.md`; a local skill overrides a bundled skill of the same name; plugin skills use a `plugin-name:skill-name` namespace so they can't conflict.
- Project skills load from `.claude/skills/` in the start directory and every parent up to the repo root, and from nested `.claude/skills/` below the working directory.
- Each skill is a directory with `SKILL.md` as the required entrypoint; other files (templates, scripts, reference docs) are optional and should be referenced from SKILL.md "so Claude knows what they contain and when to load them."
- "All fields are optional. Only `description` is recommended so Claude knows when to use the skill." If `description` is omitted, Claude uses the first paragraph of markdown content.
- `name` is a display name defaulting to the directory name; the command you type comes from the directory name, not `name` (except for plugin skills).
- "Put the key use case first: the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing to reduce context usage." `when_to_use` supplies extra trigger phrases appended to `description`, counting toward the cap.
- Claude Code frontmatter fields include: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `allowed-tools`, `disallowed-tools`, `disable-model-invocation`, `user-invocable`, `model`, `effort`, `context` (`fork`), `agent`, `background`, `hooks`, `paths`, `shell`, `metadata`, `license`, `compatibility`.
- Invocation control: `disable-model-invocation: true` = only the user can invoke (manual `/name`, for side-effecting workflows like `/deploy` — "You don't want Claude deciding to deploy because your code looks ready"); `user-invocable: false` = only Claude can invoke (background knowledge). Default: both can invoke.
- `allowed-tools` "grants permission for the listed tools during the turn that invokes the skill, so Claude can use them without prompting... The grant clears when you send your next message." "It does not restrict which tools are available"; to pre-approve for a whole session use permission settings instead.
- `disallowed-tools` removes tools from Claude's pool while the skill is active (e.g. stop a background loop from calling `AskUserQuestion`); clears on the next message.
- Security: "Workspace trust doesn't gate this field... A skill can grant itself broad tool access, so review the `allowed-tools` of skills checked into a repository before you run Claude Code there."
- `${CLAUDE_SKILL_DIR}` used in both the `allowed-tools` rule and the skill body makes the rule match the exact command, so a bundled script runs without prompting.
- `context: fork` runs a skill in an isolated subagent whose prompt is the skill content (no conversation history); "only makes sense for skills with explicit instructions." A subagent with a `skills` field preloads skills as reference material.
- On hooks: "use hooks to enforce behavior deterministically"; a skill's `hooks` frontmatter registers hooks "when the skill is invoked" that keep running for the rest of the session.
- Dynamic context injection (`` !`<command>` `` in the body) is Claude Code-only and "does not function in claude.ai chat or through the API."
- Content lifecycle: "When you or Claude invoke a skill, the rendered SKILL.md content enters the conversation as a single message and stays there for the rest of the session"; Claude Code does not re-read the file on later turns; the `allowed-tools` grant (unlike the content) clears on the next message. Keep SKILL.md under 500 lines; move reference material to separate files.
- Add a `.claude-plugin/plugin.json` to a skill folder and it loads as a plugin, so it can bundle agents, hooks, and MCP servers.
- Outside Claude Code, only the six Agent Skills spec frontmatter fields are allowed: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`; a non-spec field fails packaging/upload with a hard error.
- Claude's skill access can be restricted with permission rules: deny the `Skill` tool entirely, or `Skill(name)` / `Skill(name *)` for exact/prefix control.

## Relevance to thesis
The operational layer for least-privilege, on-demand skill design in a Claude Code-based copilot: where domain skills live (project `.claude/skills/` checked into the repo vs. personal), how invocation control gates side-effecting steps like ingestion, and how `allowed-tools`/`context: fork` shape an agentic workflow without widening the attack surface.

## Concepts touched
[[agent-skills]] · [[skill-md]] · [[allowed-tools]] · [[skill-storage-and-precedence]] · [[skill-security]] · [[skills-vs-other-extensibility]] · [[claude-md-memory]] · [[slash-commands]] · [[subagents]] · [[hooks]] · [[agent-skills-open-standard]] · [[claude-code-plugins]] · [[claude-code]]