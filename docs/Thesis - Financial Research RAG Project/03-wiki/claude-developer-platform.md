---
type: system
title: "Claude Developer Platform"
aliases: [claude-api, Claude API, Claude Developer Platform, Skills API]
status: stub
sources: ["[[src-agent-skills-overview]]", "[[src-equipping-agents-for-the-real-world-with-agent-skills]]"]
updated: 2026-08-20
---

Anthropic's API surface, and one of the four places [[agent-skills|Agent Skills]] run (see [[skills-across-surfaces]]). Using Skills here requires the **code execution tool**, whose sandboxed container the Skills run in; you pass the `skill_id` in the `container` parameter, and the container has **no network access and no runtime package installation** ([[src-agent-skills-overview]]). Pre-built Skill IDs are `pptx`, `xlsx`, `docx`, `pdf`; custom Skills are managed through the Skills API (`/v1/skills`) ([[src-agent-skills-overview]]).

> [!conflict] Naming
> The engineering blog calls this surface the "Claude Developer Platform" ([[src-equipping-agents-for-the-real-world-with-agent-skills]]); the platform docs refer to the "Claude API" ([[src-agent-skills-overview]]). Treated here as one product with both names as aliases. Logged in [[open-questions]].

## See also
[[skills-across-surfaces]] · [[claude-ai]] · [[claude-agent-sdk]]
