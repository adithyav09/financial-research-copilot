---
type: technique
title: "SKILL.md"
aliases: [SKILL.md, skill-frontmatter, skill-content-lifecycle, dynamic-context-injection]
status: draft
sources: ["[[src-claude-code-skills]]", "[[src-agent-skills-overview]]", "[[src-equipping-agents-for-the-real-world-with-agent-skills]]"]
updated: 2026-08-20
---

A Skill is a directory whose required entrypoint is a **`SKILL.md`** file; other files (templates, scripts, reference docs) are optional and should be referenced from SKILL.md so Claude knows what they contain and when to load them ([[src-claude-code-skills]]). The file begins with YAML frontmatter and a markdown body ([[src-equipping-agents-for-the-real-world-with-agent-skills]]).

## Required frontmatter
Across surfaces, the required fields are `name` and `description` ([[src-agent-skills-overview]]):
- `name` — max 64 characters, lowercase letters/numbers/hyphens only, no XML tags, and cannot contain the reserved words "anthropic" or "claude" ([[src-agent-skills-overview]]).
- `description` — non-empty, max 1024 characters, no XML tags; it must say both what the Skill does and when to use it ([[src-agent-skills-overview]]). See [[writing-skill-descriptions]].

In Claude Code all fields are technically optional — only `description` is recommended; if omitted, Claude uses the first paragraph of markdown content ([[src-claude-code-skills]]). The `name` field there is a display name defaulting to the directory name, and the command you type comes from the **directory name**, not `name` (except for plugin skills) ([[src-claude-code-skills]]).

## The Agent Skills spec fields
Outside Claude Code, only six spec frontmatter fields are allowed — `name`, `description`, `license`, `compatibility`, `metadata`, [[allowed-tools|`allowed-tools`]] — and any other field fails packaging/upload with a hard error ([[src-claude-code-skills]]).

## Claude Code extension fields
Claude Code extends the spec with: `when_to_use`, `argument-hint`, `arguments`, `disallowed-tools`, `disable-model-invocation`, `user-invocable`, `model`, `effort`, `context` (`fork`), `agent`, `background`, `hooks`, `paths`, `shell` ([[src-claude-code-skills]]). Note the combined `description` + `when_to_use` text is truncated at 1,536 characters in the skill listing to reduce context usage, so the key use case must come first ([[src-claude-code-skills]]).

## Content lifecycle
When invoked, the rendered SKILL.md content enters the conversation as a **single message and stays there for the rest of the session**; Claude Code does not re-read the file on later turns, and the [[allowed-tools]] grant (unlike the content) clears on the next message ([[src-claude-code-skills]]). Because loaded content is a recurring per-turn token cost, keep SKILL.md under 500 lines and move detail to separate files ([[src-claude-code-skills]]) — see [[skill-authoring-best-practices]].

## Dynamic context injection
A Claude Code-only body feature: `` !`<command>` `` injects command output into the skill at load time; it does not function in claude.ai chat or through the API ([[src-claude-code-skills]]).

## See also
[[agent-skills]] · [[writing-skill-descriptions]] · [[allowed-tools]] · [[progressive-disclosure]] · [[skill-storage-and-precedence]]