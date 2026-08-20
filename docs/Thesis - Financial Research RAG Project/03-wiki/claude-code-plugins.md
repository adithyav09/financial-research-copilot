---
type: concept
title: "Claude Code Plugins"
aliases: [plugins, plugin, claude-code-plugins]
status: draft
sources: ["[[src-claude-code-discover-install-plugins-marketplaces]]", "[[src-claude-code-skills]]", "[[src-agent-skills-overview]]"]
updated: 2026-08-20
---

**Plugins** extend Claude Code with skills, agents, hooks, and MCP servers ([[src-claude-code-discover-install-plugins-marketplaces]]) — the packaging unit that bundles multiple extensibility mechanisms together. Adding a `.claude-plugin/plugin.json` to a skill folder makes it load as a plugin, so it can bundle [[subagents|agents]], [[hooks]], and [[model-context-protocol|MCP]] servers ([[src-claude-code-skills]]).

Plugin skills are namespaced by the plugin name, so a `commit-commands` plugin provides skills like `/commit-commands:commit` ([[src-claude-code-discover-install-plugins-marketplaces]]); this namespacing is why plugin skills can't conflict with personal/project skills (see [[skill-storage-and-precedence]]).

Plugins are distributed through [[plugin-marketplace|marketplaces]] ([[src-claude-code-discover-install-plugins-marketplaces]]) and are how a Claude Code Skill is shared beyond one machine ([[src-agent-skills-overview]]).

## Trust
Plugins "are highly trusted components that can execute arbitrary code on your machine with your user privileges. Only install plugins and add marketplaces from sources you trust" ([[src-claude-code-discover-install-plugins-marketplaces]]) — see [[skill-security]].

## See also
[[plugin-marketplace]] · [[agent-skills]] · [[skill-storage-and-precedence]] · [[skills-vs-other-extensibility]]