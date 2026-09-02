---
type: concept
title: "Skill Storage & Precedence"
aliases: [skill-discovery-locations, skill storage, skill precedence]
status: draft
sources: ["[[src-claude-code-skills]]", "[[src-agent-skills-overview]]"]
updated: 2026-08-20
---

Where a [[skill-md|SKILL.md]] lives determines who can use it and which copy wins on a name conflict (Claude Code).

## Locations
- **Enterprise** — managed settings, all org users.
- **Personal** — `~/.claude/skills/<name>/SKILL.md`, available across all your projects.
- **Project** — `.claude/skills/<name>/SKILL.md`, this project only.
- **Plugin** — `<plugin>/skills/<name>/SKILL.md`, wherever the plugin is enabled.

([[src-claude-code-skills]])

## Precedence
Enterprise overrides personal, and personal overrides project; a local skill overrides a bundled skill of the same name; plugin skills use a `plugin-name:skill-name` namespace so they can't conflict with other levels ([[src-claude-code-skills]]).

## Path resolution
Project skills load from `.claude/skills/` in the start directory and every parent directory up to the repository root, and also from nested `.claude/skills/` directories below the working directory ([[src-claude-code-skills]]). These filesystem locations require no API uploads ([[src-agent-skills-overview]]).

## See also
[[skill-md]] · [[claude-code-plugins]] · [[skills-across-surfaces]] · [[claude-code]]