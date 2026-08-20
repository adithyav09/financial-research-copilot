---
type: source
title: "Agent Skills — Overview (Claude Developer Platform docs)"
authors: [Anthropic]
published: 2026-08-16?
clipped: 2026-08-16
url: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
source-type: docs
raw: "[[01-raw/agent-skills-overview]]"
status: compiled
tags: [agent-skills, progressive-disclosure, skill-security, availability, container]
---

## TL;DR
The canonical platform-docs overview of Agent Skills: filesystem folders of instructions/code/resources loaded on demand via three-level progressive disclosure, the code-execution/container requirement, the security "trusted sources" guidance, and the cross-surface availability + sharing matrix. (Merged clip covering both the concept/security section and the availability section of the same page.)

## Key claims
- "Agent Skills are modular capabilities that extend Claude's functionality. Each Skill packages instructions, metadata, and optional resources (scripts, templates) that Claude uses automatically when relevant."
- Skills are organized "like an onboarding guide you'd create for a new team member."
- "Skills are reusable, filesystem-based resources... Unlike prompts (conversation-level instructions for one-off tasks), Skills load on demand."
- "This filesystem-based architecture enables progressive disclosure: Claude loads information in stages as needed, rather than consuming context upfront."
- Level 1 (Metadata) always loaded at startup, ~100 tokens per Skill (`name` + `description` from YAML frontmatter).
- Level 2 (Instructions) loads when the Skill is triggered — the SKILL.md body, under 5k tokens.
- Level 3+ (Resources) loads as needed with no token cost until accessed; reference files load into context when read, while scripts run through bash so only their output enters context ("the script's code never loads into the context window").
- "The `description` is what Claude matches your request against when determining whether to trigger the Skill, so it must say both what the Skill does and when to use it."
- "This lightweight approach means you can install many Skills without context penalty: until a Skill is triggered, only its name and description occupy context."
- Required frontmatter is `name` and `description`; `name` max 64 chars (lowercase/numbers/hyphens, no XML tags, no reserved words "anthropic"/"claude"); `description` non-empty, max 1024 chars, no XML tags.
- "Skills run in a code execution environment where Claude has filesystem access, bash commands, and code execution capabilities."
- Claude API: "specify the relevant `skill_id` in the `container` parameter along with the code execution tool"; using Skills through the API requires the code execution tool, whose container Skills run in.
- Pre-built Agent Skill IDs are `pptx`, `xlsx`, `docx`, and `pdf`; custom Skills are created/uploaded through the Skills API (`/v1/skills` endpoints).
- "Skills on the API run in a sandboxed container with no network access and no runtime package installation."
- "Claude Code supports custom Skills. The pre-built document Skills (PowerPoint, Excel, Word, PDF) are not available in Claude Code, though the open-source Claude API skill comes bundled with it."
- Claude Code custom Skills are filesystem-based, placed in `~/.claude/skills/` (personal) or `.claude/skills/` (project); they "don't require API uploads."
- "claude.ai supports both pre-built Agent Skills and custom Skills"; custom Skills are uploaded as zip files via Settings > Features, are "individual to each user," and "cannot be centrally managed by admins."
- "Custom Skills do not sync across surfaces." Skills uploaded to claude.ai must be separately uploaded to the API; API Skills are not available on claude.ai; Claude Code Skills are separate from both.
- Sharing scope differs by surface: claude.ai = individual user only; Claude API = workspace-wide; Claude Code = personal or project (shareable through Claude Code Plugins).
- Runtime network access differs by surface: claude.ai varying; Claude API none; Claude Code full network access (same as any program on the user's computer).
- Anthropic publishes open-source Skills at github.com/anthropics/skills, including the "Claude API skill" (bundled with Claude Code).
- "Agent Skills is not covered by ZDR arrangements."
- Security: "Use Skills only from trusted sources: those you created yourself or obtained from Anthropic." A malicious Skill "can direct Claude to invoke tools or execute code in ways that don't match the Skill's stated purpose"; risks include tool misuse, data exposure, and data exfiltration; audit all bundled files; "Treat like installing software."

## Relevance to thesis
Establishes the loading mechanism (progressive disclosure) that makes bundling large financial reference material cheap until used, and the availability/container matrix that constrains how a financial-research copilot could package filing-analysis expertise (API Skills have no network access, so live EDGAR/Yahoo fetching must be a tool, not inside the sandbox). Security section is load-bearing for deploying third-party or generated Skills.

## Concepts touched
[[agent-skills]] · [[progressive-disclosure]] · [[skill-md]] · [[writing-skill-descriptions]] · [[skill-security]] · [[skills-across-surfaces]] · [[code-execution-environment]] · [[claude-code]] · [[claude-ai]] · [[claude-developer-platform]] · [[claude-code-plugins]]