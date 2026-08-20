# Documentation

This folder holds two different kinds of documentation. They follow different rules — don't mix them.

## 1. Project docs (canonical)

Plain GitHub-flavored Markdown, relative links, versioned with the code. These are the source of truth for how to build, run, and use the system.

| Doc | Purpose |
|-----|---------|
| [architecture.md](architecture.md) | System design and data flow (human-facing; agent-facing detail lives in [`../CLAUDE.md`](../CLAUDE.md)) |
| [api.md](api.md) | Full API reference |
| [deployment.md](deployment.md) | Local, Docker, and production setup |
| [product-guidelines.md](product-guidelines.md) | Canonical scope & governance — check any feature idea against its hard boundaries |

Related canonical files at the repo root: [`../README.md`](../README.md) (overview + quickstart), [`../CLAUDE.md`](../CLAUDE.md) (agent/dev guide), [`../CONTRIBUTING.md`](../CONTRIBUTING.md), [`../CHANGELOG.md`](../CHANGELOG.md).

## 2. Research vault (Obsidian)

The `Thesis - Financial Research RAG Project/` folder is an **Obsidian vault** — a research/thesis knowledge base, not project documentation. Open that folder *as a vault* in Obsidian; browsing its files individually on GitHub won't show the backlink graph.

It has its own operating rules in the vault's `AGENTS.md` and uses Obsidian `[[wikilinks]]` and provenance conventions. It is for literature, analysis, and thesis material — **not** for how to build or run the code.

## Convention (both layers)

- **Two layers, one-way dependency.** Project docs never depend on the vault; a vault note may reference project docs.
- **Keep the link vocabularies separate.** Project docs use relative-path Markdown links; `[[wikilinks]]` appear only inside the vault.
- **One job per doc.** Cross-link instead of duplicating.