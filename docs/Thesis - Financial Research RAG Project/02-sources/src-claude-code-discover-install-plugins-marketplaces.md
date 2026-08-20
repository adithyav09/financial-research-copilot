---
type: source
title: "Discover and install prebuilt plugins through marketplaces — Claude Code Docs"
authors: [Anthropic]
published:
clipped: 2026-08-16
url: https://code.claude.com/docs/en/discover-plugins
source-type: docs
raw: "[[01-raw/claude-code-discover-install-plugins-marketplaces]]"
status: compiled
tags: [plugins, marketplace, distribution, claude-code, mcp, hooks, subagents]
---

## TL;DR
The Claude Code docs page on how skills (and agents, hooks, MCP servers) are packaged as plugins and distributed through marketplaces — the official, community, and demo marketplaces, and the `/plugin` install/scoping model.

## Key claims
- "Plugins extend Claude Code with skills, agents, hooks, and MCP servers."
- "Plugin marketplaces are catalogs that help you discover and install these extensions without building them yourself."
- Using a marketplace is two steps: add the marketplace (registers the catalog, installs nothing) then install individual plugins.
- "Claude Code adds the official Anthropic marketplace (`claude-plugins-official`) automatically the first time you start it interactively."
- Install from the official marketplace with `/plugin install <name>@claude-plugins-official` (e.g. `/plugin install github@claude-plugins-official`).
- "The official marketplace is curated by Anthropic, and inclusion is at Anthropic's discretion."
- The community marketplace `anthropics/claude-plugins-community` "hosts third-party plugins that have passed Anthropic's automated validation and safety screening"; each plugin "is pinned to a specific commit SHA in the catalog"; it is added manually and installed with `@claude-community`.
- Anthropic also maintains a demo marketplace `claude-code-plugins` (github.com/anthropics/claude-code/tree/main/plugins), added with `/plugin marketplace add anthropics/claude-code`.
- "Plugin skills are namespaced by the plugin name, so commit-commands provides skills like `/commit-commands:commit`."
- The official marketplace's External integrations plugins "bundle pre-configured MCP servers" (github, gitlab, atlassian, asana, linear, notion, figma, vercel, firebase, supabase, slack, sentry).
- Marketplaces can be added from GitHub repos (`owner/repo`), Git URLs, local paths, and remote `marketplace.json` URLs; a GitHub marketplace must contain a `.claude-plugin/marketplace.json`.
- Install scopes are User, Project (adds the plugin to `.claude/settings.json`), Local, and admin-set managed scope.
- The `/plugin` Discover detail pane shows a Context cost estimate and a "Will install" section "listing the plugin's commands, agents, skills, hooks, and MCP and LSP servers."
- "Plugins and marketplaces are highly trusted components that can execute arbitrary code on your machine with your user privileges. Only install plugins and add marketplaces from sources you trust."
- Team admins can auto-install marketplaces via `extraKnownMarketplaces` in `.claude/settings.json`.

## Relevance to thesis
Documents the distribution layer for the thesis's ecosystem discussion: a financial-research copilot's skills, its EDGAR/market-data MCP servers, review agents, and enforcement hooks can all be shipped as a single installable plugin through a (possibly private/team) marketplace — the packaging story that turns one-off RAG tooling into a distributable product.

## Concepts touched
[[claude-code-plugins]] · [[plugin-marketplace]] · [[agent-skills]] · [[model-context-protocol]] · [[hooks]] · [[subagents]] · [[slash-commands]] · [[claude-code]]