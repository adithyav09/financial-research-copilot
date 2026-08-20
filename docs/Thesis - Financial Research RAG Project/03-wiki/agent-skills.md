---
type: concept
title: "Agent Skills"
aliases: [Skills, Agent Skill, model-invoked-skills, skill-composability, onboarding-guide-analogy]
status: draft
sources: ["[[src-equipping-agents-for-the-real-world-with-agent-skills]]", "[[src-agent-skills-overview]]", "[[src-claude-code-skills]]"]
updated: 2026-08-20
---

**Agent Skills** are organized folders of instructions, scripts, and resources that agents discover and load dynamically to perform better at specific tasks ([[src-equipping-agents-for-the-real-world-with-agent-skills]]). Each Skill packages instructions, metadata, and optional resources (scripts, templates) that Claude uses automatically when relevant ([[src-agent-skills-overview]]). They transform general-purpose agents into specialized ones by packaging expertise into composable resources ([[src-equipping-agents-for-the-real-world-with-agent-skills]]).

The guiding analogy: "building a skill for an agent is like putting together an onboarding guide for a new hire" ([[src-equipping-agents-for-the-real-world-with-agent-skills]]).

## Format
At minimum a Skill is a directory containing a [[skill-md|SKILL.md]] file whose YAML frontmatter specifies `name` and `description`; complex Skills bundle additional files (e.g. `reference.md`, `forms.md`) referenced from the core document ([[src-equipping-agents-for-the-real-world-with-agent-skills]]). It is "a simple concept with a correspondingly simple format" ([[src-equipping-agents-for-the-real-world-with-agent-skills]]).

## How they load
Skills are **model-invoked**: only the metadata is preloaded, and Claude reads the full SKILL.md, then bundled files, only as a task requires — the [[progressive-disclosure]] mechanism that makes the bundled context "effectively unbounded" ([[src-equipping-agents-for-the-real-world-with-agent-skills]]). Unlike prompts (conversation-level instructions for one-off tasks), Skills load on demand ([[src-agent-skills-overview]]).

## Positioning
Skills **complement** [[model-context-protocol|MCP]] servers by teaching agents more complex workflows that involve external tools and software ([[src-equipping-agents-for-the-real-world-with-agent-skills]]) — see [[skills-vs-other-extensibility]] for how they relate to slash commands, subagents, hooks, and CLAUDE.md. They are supported across [[claude-ai]], [[claude-code]], the [[claude-agent-sdk]], and the [[claude-developer-platform]] ([[src-equipping-agents-for-the-real-world-with-agent-skills]]); see [[skills-across-surfaces]]. Agent Skills were later published as an [[agent-skills-open-standard|open standard]] for cross-platform portability ([[src-equipping-agents-for-the-real-world-with-agent-skills]]).

## Synthesis
Skills are best read as a **context-engineering** unit: rather than growing an ever-larger system prompt, domain expertise is filed on disk and paged into context only when relevant. That framing connects every other article here — [[progressive-disclosure]] is the mechanism, [[writing-skill-descriptions]] is what makes discovery work, [[skill-authoring-best-practices]] is how to keep the loaded body cheap, and [[skill-security]] is the cost of letting folders carry executable instructions.
Draws on: [[src-equipping-agents-for-the-real-world-with-agent-skills]], [[src-agent-skills-overview]].

## See also
[[skill-md]] · [[progressive-disclosure]] · [[skills-vs-other-extensibility]] · [[skills-across-surfaces]] · [[skill-authoring-best-practices]]