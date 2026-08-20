> Source: https://code.claude.com/docs/en/agent-sdk/skills (redirected from platform.claude.com/docs/en/agent-sdk/skills)
> Fetched: 2026-08-16
> Publisher: code.claude.com / Claude Agent SDK Docs (Anthropic)

# Extend agents with skills (Claude Agent SDK)

"Agent Skills extend Claude with specialized capabilities that Claude invokes when relevant. Skills are packaged as `SKILL.md` files containing instructions, descriptions, and optional supporting resources."

## How skills work with the Agent SDK

When using the Claude Agent SDK, skills are:
- **Defined as filesystem artifacts**: you create each skill as a `SKILL.md` file in its own directory, such as `.claude/skills/<name>/SKILL.md`.
- **Loaded from filesystem**: "the SDK loads skills from the filesystem locations governed by `settingSources` (TypeScript) or `setting_sources` (Python)."
- **Automatically discovered**: "once filesystem settings load, the SDK discovers skill metadata at startup from user and project directories, and loads the full content when Claude invokes the skill."
- **Model-invoked**: Claude autonomously chooses when to use them.
- **User-invoked**: "you dispatch a skill directly by sending `/<name>` in a prompt."
- **Scoped via the `skills` option**: "discovered skills are enabled by default. Pass a list of skill names, `"all"`, or `[]` to control which skills Claude can invoke."

"Unlike subagents, which you can define in the `agents` option, you create skills as files on disk. The SDK doesn't provide a programmatic API for registering them."

"Skills are discovered through the filesystem setting sources. With default `query()` options, the SDK loads user and project sources, so skills in `~/.claude/skills/`, `<cwd>/.claude/skills/`, and `.claude/skills/` in any parent directory of `<cwd>` up to the repository root are available. If you set `settingSources` explicitly, include `'user'` or `'project'` to keep skill discovery, or use the `plugins` option to load skills from a specific path."

## Use skills with the Agent SDK

"Set the `skills` option on `query()` to control which skills Claude can invoke in the session. When omitted, discovered skills are enabled and the Skill tool is available, matching CLI behavior. Pass `"all"` to let Claude invoke every discovered skill, a list of skill names to allow only those, or `[]` to let Claude invoke none."

```python
options = ClaudeAgentOptions(skills=["pdf", "docx"])
```
```typescript
const options = { skills: ["pdf", "docx"] };
```

"When you set `skills`, the SDK adds the Skill tool to `allowedTools` automatically. If you also pass an explicit `tools` list, include `"Skill"` in that list so Claude can invoke skills."

Example enabling all discovered skills and pre-approving common tools:
```python
options = ClaudeAgentOptions(
    cwd=os.getcwd(),  # .claude/skills/ here or in a parent directory
    setting_sources=["user", "project"],  # Load skills from filesystem
    skills="all",  # Let Claude invoke every discovered skill
    allowed_tools=["Read", "Write", "Bash"],
)
```

## Commands in Agent SDK sessions

"A command is anything you run by sending `/<name>` in a prompt." Entries on the command surface:
- **Built-in commands**: execute logic coded into the Claude Code process the SDK runs, e.g. `/compact`.
- **Bundled skills**: prompt artifacts included with Claude Code, e.g. `/code-review`.
- **Your skills**: prompt artifacts you author, each a directory holding a `SKILL.md` file.
- **Custom command files**: an older artifact form, flat Markdown files in `.claude/commands/`. "Skills are their recommended successor."

The `system/init` message lists available commands in its `slash_commands` field and loaded user-invocable skills in its `skills` array. "Sessions that configure MCP servers can also expose MCP prompts as commands."

## Choose a discovery level

- **Project skills**: `.claude/skills/`, available only in the current project.
- **Personal skills**: `~/.claude/skills/`, available across all your projects.

"If you have existing custom command files in `.claude/commands/`, they keep working. A command file at `.claude/commands/deploy.md` creates `/deploy` and works the same way as a skill at `.claude/skills/deploy/SKILL.md` would."

## Pre-approve tools for skills

"For project and personal skills, the `allowed-tools` frontmatter field applies only when you use the Claude Code CLI directly. In SDK sessions, manage tool approval for these skills through the `allowedTools` option (`allowed_tools` in Python) in your query configuration."

## Related resources noted by the page
- Subagents in the SDK: "similar filesystem-based agents with programmatic options."
- Agent Skills overview: conceptual overview, benefits, and architecture.