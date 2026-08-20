---
type: source
title: "Skill authoring best practices"
authors: [Anthropic]
published: 2026-08-16?
clipped: 2026-08-16
url: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
source-type: docs
raw: "[[01-raw/skill-authoring-best-practices]]"
status: compiled
tags: [agent-skills, skill-authoring, prompt-engineering, context-engineering]
---

## TL;DR
Anthropic's canonical guide to writing effective Agent Skills: keep SKILL.md concise and under 500 lines, write a discoverable third-person `description`, use progressive disclosure into bundled files, match "degrees of freedom" to task fragility, and drive iteration with evaluations built before documentation.

## Key claims
- "At startup, only the metadata (name and description) from all Skills is pre-loaded. Claude reads SKILL.md only when the Skill becomes relevant, and reads additional files only as needed."
- The SKILL.md `name` field: maximum 64 characters, lowercase letters/numbers/hyphens only, no XML tags, cannot contain reserved words "anthropic" or "claude".
- The SKILL.md `description` field: non-empty, maximum 1,024 characters, no XML tags, and should describe both what the Skill does and when to use it.
- "Always write in third person" in the description; "The description is injected into the system prompt, and inconsistent point-of-view can cause discovery problems."
- "The description is critical for skill selection: Claude uses it to choose the right Skill from potentially 100+ available Skills."
- Descriptions should "Be specific and include key terms" — both what the Skill does and specific triggers/contexts for when to use it (e.g. "Use when working with PDF files or when the user mentions PDFs, forms, or document extraction").
- Consider using gerund form (verb + -ing) for Skill names: `processing-pdfs`, `analyzing-spreadsheets`. Avoid vague names like `helper`, `utils`, `tools`.
- "Keep SKILL.md body under 500 lines for optimal performance"; split content into separate files when approaching this limit.
- "Keep references one level deep from SKILL.md" — Claude may only partially read (e.g. `head -100`) files reached through nested references, resulting in incomplete information.
- For reference files longer than 100 lines, include a table of contents at the top so Claude sees the full scope even when previewing with partial reads.
- Set appropriate "degrees of freedom": high freedom (text instructions) when multiple approaches are valid; low freedom (specific scripts, few parameters) when operations are fragile, e.g. "Run exactly this script... Do not modify the command or add additional flags."
- "Create evaluations BEFORE writing extensive documentation. This ensures your Skill solves real problems rather than documenting imagined ones."
- Recommended evaluation-driven development: identify gaps by running Claude without a Skill, create three test scenarios, establish a baseline, write minimal instructions, iterate.
- Develop Skills iteratively using two Claude instances: "Claude A" helps design/refine the Skill; "Claude B" (a fresh instance) tests it in real tasks; bring observed gaps back to Claude A.
- "Claude models understand the Skill format and structure natively — you don't need special system prompts or a 'writing skills' skill to get Claude to help create Skills."
- Utility scripts are preferred over generated code: "More reliable than generated code, save tokens... save time... ensure consistency."
- Make execution intent explicit: whether Claude should execute a script ("Run analyze_form.py to extract fields") or read it as reference ("See analyze_form.py for the field extraction algorithm").
- "Solve, don't defer": scripts should handle error conditions explicitly rather than failing and letting Claude figure it out; avoid "voodoo constants" (Ousterhout's law).
- The "plan-validate-execute" pattern creates verifiable intermediate outputs (e.g. a validated `changes.json`) to catch errors before applying batch or destructive changes.
- Anti-patterns: Windows-style backslash paths (always use forward slashes), and offering too many options instead of a default with an escape hatch.
- Avoid time-sensitive information; put deprecated guidance in a collapsed "Old patterns" section. Use consistent terminology throughout.
- MCP tools must be referenced by fully qualified name `ServerName:tool_name` to avoid "tool not found" errors.
- "Test your Skill with all the models you plan to use it with"; the checklist calls for at least three evaluations and testing with Haiku, Sonnet, and Opus.

## Relevance to thesis
A financial-research RAG assistant like this project's is a prime candidate for packaging its retrieval/analysis workflows as Agent Skills (e.g. filing-ingestion, XBRL trend analysis, live-vs-filing routing). This guide governs how such Skills should be written so the LLM reliably discovers and applies them — directly informing any "skillification" of the copilot's domain procedures and the token-budget discipline the project already cares about.

## Concepts touched
[[agent-skills]] · [[skill-authoring]] · [[skill-md]] · [[skill-description-field]] · [[skill-discovery]] · [[progressive-disclosure]] · [[degrees-of-freedom]] · [[evaluation-driven-development]] · [[iterative-skill-development]] · [[bundled-scripts]] · [[reference-files]] · [[skill-naming-conventions]] · [[skill-anti-patterns]] · [[context-window-management]] · [[mcp-tool-references]]
