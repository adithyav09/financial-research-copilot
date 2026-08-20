> Source: https://code.claude.com/docs/en/skills
> Fetched: 2026-08-16
> Publisher: code.claude.com (Anthropic / Claude Code Docs)

# Extend Claude with skills (Claude Code)

*Create, manage, and share skills to extend Claude's capabilities in Claude Code.*

Skills extend what Claude can do. Create a `SKILL.md` file with instructions, and Claude adds it to its toolkit. Claude uses skills when relevant, or you can invoke one directly with `/skill-name`.

Create a skill when you keep pasting the same instructions, checklist, or multi-step procedure into chat, or when a section of CLAUDE.md has grown into a procedure rather than a fact. Unlike CLAUDE.md content, a skill's body loads only when it's used, so long reference material costs almost nothing until you need it.

Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy`. Skills add optional features: a directory for supporting files, frontmatter to control whether you or Claude invokes them, and the ability for Claude to load them automatically when relevant. Claude Code skills follow the Agent Skills open standard (agentskills.io), extended with invocation control, subagent execution, and dynamic context injection.

## Getting started

Every skill needs a `SKILL.md` file with two parts: YAML frontmatter between `---` markers that tells Claude when to use the skill, and markdown content with the instructions Claude follows. The directory name becomes the command you type, and the `description` helps Claude decide when to load the skill automatically.

Minimal example:
```yaml
---
description: Summarizes uncommitted changes and flags anything risky. Use when the user asks what changed, wants a commit message, or asks to review their diff.
---

## Current changes

!`git diff HEAD`

## Instructions

Summarize the changes above in two or three bullet points, then list any risks...
```
The `` !`git diff HEAD` `` line uses **dynamic context injection**: Claude Code runs the command and replaces the line with its output before Claude sees the skill content.

## Where skills live

| Location | Path | Applies to |
| --- | --- | --- |
| Enterprise | managed settings | All users in your organization |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

When skills share the same name: enterprise overrides personal, personal overrides project. A local skill overrides a bundled skill with the same name. Plugin skills use a `plugin-name:skill-name` namespace.

Each skill is a directory with `SKILL.md` as the entrypoint (required); other files (templates, examples, `scripts/`) are optional. Reference these files from your `SKILL.md` so Claude knows what they contain and when to load them.

## Types of skill content

- **Reference content** adds knowledge Claude applies to current work (conventions, patterns, style guides, domain knowledge). Runs inline.
- **Task content** gives step-by-step instructions for a specific action (deployments, commits, code generation). Often invoked directly with `/skill-name`. Add `disable-model-invocation: true` to prevent Claude from triggering it automatically.

Keep the body itself concise. Once a skill loads, its content stays in context across turns, so every line is a recurring token cost. State what to do rather than narrating how or why. Keep `SKILL.md` under 500 lines; move detailed reference material to separate files.

## Frontmatter reference

All fields are optional; only `description` is recommended so Claude knows when to use the skill. Key fields:

- **`name`**: Display name shown in skill listings. Defaults to the directory name.
- **`description`**: What the skill does and when to use it. Claude uses this to decide when to apply the skill. If omitted, uses the first paragraph of markdown content. **Put the key use case first: the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing to reduce context usage.**
- **`when_to_use`**: Additional context for when Claude should invoke the skill, such as trigger phrases or example requests. Appended to `description`; counts toward the 1,536-character cap.
- **`argument-hint`**: Hint shown during autocomplete to indicate expected arguments.
- **`arguments`**: Named positional arguments for `$name` substitution.
- **`disable-model-invocation`**: Set to `true` to prevent Claude from automatically loading this skill. Use for workflows you want to trigger manually with `/name`.
- **`user-invocable`**: Set to `false` when only Claude should invoke the skill (hidden from the `/` menu). Use for background knowledge users shouldn't invoke directly.
- **`allowed-tools`**: Tools Claude can use without asking permission during the turn that invokes this skill. The grant clears when you send your next message. Accepts a space- or comma-separated string, or a YAML list.
- **`disallowed-tools`**: Tools removed from Claude's available pool while this skill is active. Use for autonomous skills that should never call certain tools (e.g. `AskUserQuestion` for a background loop).
- **`model`**: Model to use when this skill is active (applies for the rest of the current turn).
- **`effort`**: Effort level when this skill is active (`low`, `medium`, `high`, `xhigh`, `max`).
- **`context`**: Set to `fork` to run in a forked subagent context.
- **`agent`**: Which subagent type to use when `context: fork` is set.
- **`paths`**: Glob patterns that limit when this skill is auto-activated. Claude loads the skill automatically only when working with files matching the patterns.
- **`metadata`**: Free-form YAML map for your own key-value data (entitlement or catalog fields), read by your own tooling. Claude Code doesn't act on it.
- **`license`**: License covering the skill. Part of the Agent Skills spec.
- **`compatibility`**: Environment requirements for the skill (intended products or system prerequisites), per the Agent Skills spec. String up to 500 characters.

### Using skill frontmatter outside Claude Code

Claude Code accepts every field. Outside Claude Code, only the Agent Skills spec fields are allowed: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. This applies to claude.ai skill uploads, the Skills API, and packaging with `package_skill.py`. Including a non-spec field (e.g. `argument-hint`) makes packaging/upload fail with a hard error. Claude Code-only body features (dynamic context injection) don't function in claude.ai chat or through the API.

## Add supporting files

Skills can include multiple files in their directory. This keeps `SKILL.md` focused while letting Claude access detailed reference material only when needed. Reference supporting files from `SKILL.md` so Claude knows what each file contains:
```markdown
## Additional resources
- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
```
Tip: Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files.

## Control who invokes a skill

By default, both you and Claude can invoke any skill. Two frontmatter fields restrict this:
- **`disable-model-invocation: true`**: Only you can invoke. Use for workflows with side effects or that you want to control timing (`/commit`, `/deploy`, `/send-slack-message`). "You don't want Claude deciding to deploy because your code looks ready." Its description is not kept in context.
- **`user-invocable: false`**: Only Claude can invoke. Use for background knowledge that isn't actionable as a command (a `legacy-system-context` skill).

## Skill content lifecycle

When a skill is invoked, the rendered `SKILL.md` content enters the conversation as a single message and stays there for the rest of the session. This persistence applies to the skill's instructions, not its permissions: an `allowed-tools` grant clears when you send your next message. Claude Code does not re-read the skill file on later turns, so write guidance that should apply throughout a task as standing instructions rather than one-time steps. Auto-compaction carries invoked skills forward within a token budget (keeps the first 5,000 tokens of each; re-attached skills share a combined 25,000-token budget).

## Pre-approve tools for a skill (allowed-tools / least privilege)

The `allowed-tools` field grants permission for the listed tools during the turn that invokes the skill, so Claude can use them without prompting. The grant clears when you send your next message; invoking the skill again re-applies it. **It does not restrict which tools are available: every tool remains callable, and your permission settings still govern tools that are not listed.** To pre-approve tools for the whole session, add allow rules to permission settings instead.

**Workspace trust doesn't gate this field.** Claude Code applies a project skill's `allowed-tools` whenever you or Claude invoke the skill, including in a `-p` run in a folder you've never trusted. **A skill can grant itself broad tool access, so review the `allowed-tools` of skills checked into a repository before you run Claude Code there.**

Example (git commit skill):
```yaml
---
name: commit
description: Stage and commit the current changes
disable-model-invocation: true
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *)
---
```
To remove tools from Claude's available pool while a skill is active, list them in `disallowed-tools`. To block tools across all skills and prompts, add deny rules in permission settings.

## Bundled-script pre-approval pattern

Using `${CLAUDE_SKILL_DIR}` in both the `allowed-tools` rule and the skill body lets a skill run a bundled script without a permission prompt:
```yaml
---
name: render-chart
description: Render a chart from a CSV file
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)
---

Run `${CLAUDE_SKILL_DIR}/scripts/render.sh <csv-file>` to render the chart.
```
The `allowed-tools` rule then matches the exact command the skill body tells Claude to run, so the script runs without prompting.

## Run skills in a subagent

Add `context: fork` to run a skill in isolation; the skill content becomes the prompt that drives the subagent (no access to conversation history). Pick an `agent` type (`Explore`, `Plan`, `general-purpose`, or a custom subagent). Warning: `context: fork` only makes sense for skills with explicit instructions — a skill of guidelines with no task returns without meaningful output.

## Restrict Claude's skill access

Three ways to control which skills Claude can invoke:
- **Disable all skills** by denying the `Skill` tool in `/permissions`.
- **Allow specific skills**: `Skill(commit)`, `Skill(review-pr *)`.
- **Deny specific skills**: `Skill(deploy *)`.
Permission syntax: `Skill(name)` for exact match, `Skill(name *)` for prefix match with any arguments.