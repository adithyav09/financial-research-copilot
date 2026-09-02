> Source: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
> Fetched: 2026-08-16
> Publisher: docs.claude.com (Anthropic / Claude Platform Docs)

# Agent Skills (Overview)

*Agent Skills are modular capabilities that extend Claude's functionality. Each Skill packages instructions, metadata, and optional resources (scripts, templates) that Claude uses automatically when relevant.*

## Why use Skills

Skills are reusable, filesystem-based resources that give Claude domain-specific expertise: workflows, context, and best practices that turn a general-purpose agent into a specialist. Unlike prompts (conversation-level instructions for one-off tasks), Skills load on demand, so you don't have to repeat the same guidance across conversations. Key benefits: specialize Claude, reduce repetition (create once, use automatically), compose capabilities.

## How Skills work

Skills use Claude's VM environment. Claude operates in a virtual machine with filesystem access, allowing Skills to exist as directories containing instructions, executable code, and reference materials, organized like an onboarding guide you'd create for a new team member. This filesystem-based architecture enables **progressive disclosure**: Claude loads information in stages as needed, rather than consuming context upfront.

Skills can contain three types of content, each loaded at a different time:

### Level 1: Metadata (always loaded)
The Skill's YAML frontmatter provides discovery information (`name` + `description`). Claude loads this metadata at startup and includes it in the system prompt. The `description` is what Claude matches your request against when determining whether to trigger the Skill, so it must say both what the Skill does and when to use it. This lightweight approach means you can install many Skills without context penalty: until a Skill is triggered, only its name and description occupy context.

### Level 2: Instructions (loaded when triggered)
The main body of SKILL.md contains procedural knowledge: workflows, best practices, and guidance. When you request something that matches a Skill's description, Claude reads SKILL.md from the filesystem using bash. Only then does this content enter the context window.

### Level 3: Resources and code (loaded as needed)
Skills can bundle additional materials: additional markdown files (FORMS.md, REFERENCE.md), executable scripts (fill_form.py, validate.py) that Claude runs using bash providing deterministic operations without loading their code into context, and reference materials such as database schemas, API documentation, templates, or examples. Claude accesses these files only when referenced.

**Progressive disclosure token cost table:**

| Level | When loaded | Token cost | Content |
| --- | --- | --- | --- |
| Level 1: Metadata | Always (at startup) | ~100 tokens per Skill | `name` and `description` from YAML frontmatter |
| Level 2: Instructions | When Skill is triggered | Under 5k tokens | SKILL.md body with instructions and guidance |
| Level 3+: Resources | As needed | None until accessed | Bundled files. Reference files load into context when read. Scripts run through bash, and only their output enters context |

### The Skills architecture

Skills run in a code execution environment where Claude has filesystem access, bash commands, and code execution capabilities. When a Skill is triggered, Claude uses bash to read SKILL.md; if those instructions reference other files, Claude reads those too; when instructions mention executable scripts, Claude runs them through bash and receives only the output (the script code itself never enters context). What this enables: on-demand file access, efficient script execution, no practical limit on bundled content.

Example loading sequence for a `pdf-processing` Skill: (1) Startup — system prompt includes the name+description; (2) User request "Extract the text from this PDF and summarize it"; (3) Claude invokes `bash: cat pdf-processing/SKILL.md`; (4) Claude determines form filling is not needed, so FORMS.md is not read; (5) Claude executes using instructions from SKILL.md.

## Where Skills work

Skills are available across Claude's agent products: Claude API (specify `skill_id` in the `container` parameter with the code execution tool; beta header `skills-2025-10-02`; pre-built skill_ids `pptx`, `xlsx`, `docx`, `pdf`; custom via `/v1/skills` endpoints), Claude Code (filesystem-based; place in `~/.claude/skills/` personal or `.claude/skills/` project; no API uploads), and claude.ai (upload as zip through Settings > Features).

## Skill structure

Every Skill requires a `SKILL.md` file with YAML frontmatter:
```markdown
---
name: your-skill-name
description: Brief description of what this Skill does and when to use it
---

# Your Skill Name

## Instructions
[Clear, step-by-step guidance for Claude to follow]

## Examples
[Concrete examples of using this Skill]
```
Required fields: `name` and `description`.
- `name`: Maximum 64 characters; only lowercase letters, numbers, hyphens; no XML tags; cannot contain reserved words "anthropic", "claude".
- `description`: Must be non-empty; Maximum 1024 characters; no XML tags. Must include both what the Skill does and when Claude should use it.

## Security considerations

Use Skills only from trusted sources: those you created yourself or obtained from Anthropic. Skills give Claude new capabilities through instructions and code, which also means a malicious Skill can direct Claude to invoke tools or execute code in ways that don't match the Skill's stated purpose.

If you must use a Skill from an untrusted or unknown source, exercise extreme caution and thoroughly audit it before use. Depending on what access Claude has when executing the Skill, malicious Skills could lead to data exfiltration, unauthorized system access, or other security risks.

Key security considerations:
- **Audit thoroughly:** Review all files bundled in the Skill (SKILL.md, scripts, images, other resources). Look for unusual patterns such as unexpected network calls, file access patterns, or operations that don't match the Skill's stated purpose.
- **External sources are risky:** Skills that fetch data from external URLs pose particular risk, as fetched content may contain malicious instructions. Even trustworthy Skills can be compromised if their external dependencies change over time.
- **Tool misuse:** Malicious Skills can invoke tools (file operations, bash commands, code execution) in harmful ways.
- **Data exposure:** Skills with access to sensitive data could be designed to leak information to external systems.
- **Treat like installing software:** Be especially careful when integrating Skills into production systems with access to sensitive data or critical operations.

## Available Skills

Pre-built Agent Skills: PowerPoint (pptx), Excel (xlsx), Word (docx), PDF (pdf). Open-source Skills published in the anthropics/skills repository, including the Claude API skill (bundled with Claude Code).

## Limitations and constraints

- **Custom Skills do not sync across surfaces.** Skills uploaded to one surface are not automatically available on others.
- **Sharing scope:** claude.ai (individual user only), Claude API (workspace-wide), Claude Code (personal or project-based; can also be shared through Claude Code Plugins).
- **Runtime environment constraints:** claude.ai (varying network access per settings); Claude API (no network access, no runtime package installation, pre-configured dependencies only); Claude Code (full network access, global package installation discouraged).

## Data retention
Agent Skills is not covered by ZDR arrangements. Skill definitions and execution data are retained according to Anthropic's standard data retention policy.