---
type: technique
title: "Skill Authoring Best Practices"
aliases: [skill-authoring, degrees-of-freedom, evaluation-driven-development, iterative-skill-development, skill-anti-patterns, bundled-scripts, skill-bundled-resources, reference-files, mcp-tool-references]
status: draft
sources: ["[[src-skill-authoring-best-practices]]", "[[src-equipping-agents-for-the-real-world-with-agent-skills]]"]
updated: 2026-08-20
---

Anthropic's canonical guidance for writing effective [[agent-skills|Agent Skills]].

## Keep the body lean
Keep the SKILL.md body under 500 lines for optimal performance and split content into separate files when approaching the limit ([[src-skill-authoring-best-practices]]). Keep references **one level deep** from SKILL.md — Claude may only partially read (e.g. `head -100`) files reached through nested references, causing incomplete information ([[src-skill-authoring-best-practices]]). For reference files longer than 100 lines, put a table of contents at the top so Claude sees the full scope even when previewing ([[src-skill-authoring-best-practices]]). This is [[progressive-disclosure]] applied at authoring time.

## Degrees of freedom
Match the Skill's freedom to the task's fragility: high freedom (text instructions) when multiple approaches are valid; low freedom (specific scripts, few parameters) when operations are fragile — e.g. "Run exactly this script... Do not modify the command or add additional flags" ([[src-skill-authoring-best-practices]]).

## Scripts over generated code
Utility scripts are preferred over generated code because they are more reliable, save tokens, save time, and ensure consistency ([[src-skill-authoring-best-practices]]). Bundled executable scripts let Claude run operations without loading the script into context ([[src-equipping-agents-for-the-real-world-with-agent-skills]]). Make execution intent explicit — whether Claude should **run** a script ("Run analyze_form.py to extract fields") or **read** it as reference ("See analyze_form.py for the algorithm") ([[src-skill-authoring-best-practices]]). Scripts should "solve, don't defer" — handle error conditions explicitly rather than failing and letting Claude figure it out, and avoid "voodoo constants" ([[src-skill-authoring-best-practices]]). The **plan-validate-execute** pattern creates verifiable intermediate outputs (e.g. a validated `changes.json`) to catch errors before applying batch or destructive changes ([[src-skill-authoring-best-practices]]).

## Evaluation-driven development
"Create evaluations BEFORE writing extensive documentation" so the Skill solves real problems rather than documenting imagined ones ([[src-skill-authoring-best-practices]]). The recommended loop: run Claude without the Skill to find gaps, create three test scenarios, establish a baseline, write minimal instructions, iterate ([[src-skill-authoring-best-practices]]). Iterate with two instances — "Claude A" refines the Skill, a fresh "Claude B" tests it, and observed gaps go back to A ([[src-skill-authoring-best-practices]]). Claude models understand the Skill format natively, so no special "writing skills" skill is needed ([[src-skill-authoring-best-practices]]). Test with all models you plan to use — the checklist calls for ≥3 evaluations across Haiku, Sonnet, and Opus ([[src-skill-authoring-best-practices]]).

## Anti-patterns
Avoid Windows-style backslash paths (always use forward slashes); avoid offering too many options instead of a default with an escape hatch; avoid time-sensitive information (put deprecated guidance in a collapsed "Old patterns" section); use consistent terminology ([[src-skill-authoring-best-practices]]). Reference [[model-context-protocol|MCP]] tools by fully qualified name `ServerName:tool_name` to avoid "tool not found" errors ([[src-skill-authoring-best-practices]]).

## See also
[[writing-skill-descriptions]] · [[skill-md]] · [[progressive-disclosure]] · [[allowed-tools]]