---
type: concept
title: "Plugin Marketplaces"
aliases: [plugin marketplace, plugin-marketplace, marketplace]
status: draft
sources: ["[[src-claude-code-discover-install-plugins-marketplaces]]"]
updated: 2026-08-20
---

**Plugin marketplaces** are catalogs that help you discover and install [[claude-code-plugins|plugins]] without building them yourself ([[src-claude-code-discover-install-plugins-marketplaces]]). Using one is two steps: add the marketplace (registers the catalog, installs nothing), then install individual plugins ([[src-claude-code-discover-install-plugins-marketplaces]]).

## The three Anthropic marketplaces
- **Official** — `claude-plugins-official`, added automatically the first time you start Claude Code interactively; curated by Anthropic, inclusion at Anthropic's discretion. Install with `/plugin install <name>@claude-plugins-official` ([[src-claude-code-discover-install-plugins-marketplaces]]).
- **Community** — `anthropics/claude-plugins-community`, hosts third-party plugins that passed Anthropic's automated validation and safety screening; each plugin is pinned to a specific commit SHA; added manually, installed with `@claude-community` ([[src-claude-code-discover-install-plugins-marketplaces]]).
- **Demo** — `claude-code-plugins`, added with `/plugin marketplace add anthropics/claude-code` ([[src-claude-code-discover-install-plugins-marketplaces]]).

## Sources, scopes, and cost
Marketplaces can be added from GitHub repos (`owner/repo`), Git URLs, local paths, and remote `marketplace.json` URLs; a GitHub marketplace must contain `.claude-plugin/marketplace.json` ([[src-claude-code-discover-install-plugins-marketplaces]]). Install scopes are User, Project (adds the plugin to `.claude/settings.json`), Local, and admin-set managed scope; team admins can auto-install marketplaces via `extraKnownMarketplaces` ([[src-claude-code-discover-install-plugins-marketplaces]]). The `/plugin` Discover pane shows a **Context cost estimate** and a "Will install" list of the plugin's commands, agents, skills, hooks, and MCP/LSP servers ([[src-claude-code-discover-install-plugins-marketplaces]]). The official marketplace's External-integrations plugins bundle pre-configured MCP servers (github, gitlab, atlassian, asana, linear, notion, figma, vercel, firebase, supabase, slack, sentry) ([[src-claude-code-discover-install-plugins-marketplaces]]).

## See also
[[claude-code-plugins]] · [[skill-security]] · [[model-context-protocol]]