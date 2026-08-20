> Source: https://code.claude.com/docs/en/discover-plugins
> Fetched: 2026-08-16
> Publisher: code.claude.com / Claude Code Docs (Anthropic)

# Discover and install prebuilt plugins through marketplaces

"Plugins extend Claude Code with skills, agents, hooks, and MCP servers. Plugin marketplaces are catalogs that help you discover and install these extensions without building them yourself."

## How marketplaces work

"A marketplace is a catalog of plugins that someone else has created and shared." Using a marketplace is a two-step process:
1. **Add the marketplace** — registers the catalog with Claude Code so you can browse. No plugins are installed yet.
2. **Install individual plugins** — browse the catalog and install the plugins you want.

## Official Anthropic marketplace

"Claude Code adds the official Anthropic marketplace (`claude-plugins-official`) automatically the first time you start it interactively." If it can't, add it yourself with `/plugin marketplace add anthropics/claude-plugins-official`.

To browse: run `/plugin` and go to the **Discover** tab, or view the catalog at claude.com/plugins.

To install from the official marketplace: `/plugin install <name>@claude-plugins-official`. Example:
```shell
/plugin install github@claude-plugins-official
```

"`/plugin` opens an interactive panel in the terminal CLI. If Claude replies that `/plugin` isn't available in this environment, use the plugin browser in the Claude desktop app, or declare the plugin under `enabledPlugins` in `.claude/settings.json` for cloud sessions."

"The official marketplace is curated by Anthropic, and inclusion is at Anthropic's discretion. The in-app submission forms add plugins to the community marketplace, not the official one."

Official marketplace categories include: **Code intelligence** (LSP plugins per language), **External integrations** (pre-configured MCP servers: github, gitlab, atlassian, asana, linear, notion, figma, vercel, firebase, supabase, slack, sentry), **Automatic security review** (`security-guidance`), **Development workflows** (`commit-commands`, `pr-review-toolkit`, `agent-sdk-dev`, `plugin-dev`), and **Output styles**.

## Community marketplace

"The community marketplace at `anthropics/claude-plugins-community` hosts third-party plugins that have passed Anthropic's automated validation and safety screening. Each plugin is pinned to a specific commit SHA in the catalog." Add it manually:
```shell
/plugin marketplace add anthropics/claude-plugins-community
```
Then install using the `claude-community` marketplace name:
```shell
/plugin install <plugin-name>@claude-community
```

## Demo marketplace

Anthropic also maintains a demo plugins marketplace (`claude-code-plugins`) at github.com/anthropics/claude-code/tree/main/plugins. Add it manually with `/plugin marketplace add anthropics/claude-code`. The `/plugin` manager has four tabs: **Discover**, **Installed**, **Marketplaces**, **Errors**.

Install from the demo marketplace, e.g.:
```shell
/plugin install commit-commands@claude-code-plugins
```
"Plugin skills are namespaced by the plugin name, so **commit-commands** provides skills like `/commit-commands:commit`."

## Add marketplaces (sources)

`/plugin marketplace add` accepts: GitHub repositories (`owner/repo`), Git URLs (GitLab, Bitbucket, self-hosted), local paths (directories or `marketplace.json`), and remote URLs (hosted `marketplace.json`). A GitHub marketplace must contain a `.claude-plugin/marketplace.json` file.

## Install plugins

```shell
/plugin install plugin-name@marketplace-name
```
Installation scope choices:
- **User scope**: install for yourself across all projects.
- **Project scope**: install for all collaborators on this repository (adds the plugin to `.claude/settings.json`).
- **Local scope**: install for yourself in this repository only.
- **managed** scope: installed by administrators via managed settings; can't be modified.

To install without an interactive step, use the `claude plugin install` shell command (installs to user scope unless you pass `--scope`).

The `/plugin` Discover tab detail pane shows a **Context cost** estimate (tokens the plugin adds to the context window every turn), the **Last updated** date, and a **Will install** section "listing the plugin's commands, agents, skills, hooks, and MCP and LSP servers, so you can review exactly what it adds before installing."

## Manage installed plugins

`/plugin` → **Installed** tab lets you view, enable, disable, or uninstall. "The detail view shows the components the plugin contributes: commands, skills, agents, hooks, MCP servers, and LSP servers." Direct commands: `/plugin list`, `/plugin disable plugin-name@marketplace-name`, `/plugin enable ...`, `/plugin uninstall ...`, and `/reload-plugins` to apply changes without restarting.

## Team marketplaces

Team admins add marketplace configuration to `.claude/settings.json` via `extraKnownMarketplaces`:
```json
{
  "extraKnownMarketplaces": {
    "my-team-tools": {
      "source": { "source": "github", "repo": "your-org/claude-plugins" }
    }
  }
}
```

## Security

"Plugins and marketplaces are highly trusted components that can execute arbitrary code on your machine with your user privileges. Only install plugins and add marketplaces from sources you trust." "Anthropic doesn't control what MCP servers, files, or other software are included in plugins and can't verify that they work as intended."
