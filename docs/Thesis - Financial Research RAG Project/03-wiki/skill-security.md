---
type: concept
title: "Skill Security"
aliases: [skill security, skill-security]
status: draft
sources: ["[[src-agent-skills-overview]]", "[[src-equipping-agents-for-the-real-world-with-agent-skills]]", "[[src-claude-code-skills]]", "[[src-claude-code-discover-install-plugins-marketplaces]]"]
updated: 2026-08-20
---

Skills give Claude new capabilities through instructions **and code**, which also means a malicious Skill can direct Claude to invoke tools or execute code in ways that don't match the Skill's stated purpose ([[src-agent-skills-overview]]).

## The core guidance
"Use Skills only from trusted sources: those you created yourself or obtained from Anthropic" ([[src-agent-skills-overview]]). The blog frames it the same way: install skills only from trusted sources, and audit code dependencies, bundled resources, and instructions directing connections to external networks ([[src-equipping-agents-for-the-real-world-with-agent-skills]]).

## Risks
Audit all bundled files thoroughly; external sources are risky because fetched content may contain malicious instructions; concrete risks include **tool misuse, data exposure, and data exfiltration** ([[src-agent-skills-overview]]). The overarching mental model: "Treat like installing software" ([[src-agent-skills-overview]]).

## In Claude Code specifically
A Skill can grant itself broad tool access via [[allowed-tools]], and workspace trust does not gate that field — so review the `allowed-tools` of any skill checked into a repository before running Claude Code there ([[src-claude-code-skills]]). Distribution via [[claude-code-plugins|plugins]] and [[plugin-marketplace|marketplaces]] carries the same warning: these are highly trusted components that can execute arbitrary code with your user privileges ([[src-claude-code-discover-install-plugins-marketplaces]]).

## See also
[[allowed-tools]] · [[claude-code-plugins]] · [[plugin-marketplace]] · [[skills-across-surfaces]]