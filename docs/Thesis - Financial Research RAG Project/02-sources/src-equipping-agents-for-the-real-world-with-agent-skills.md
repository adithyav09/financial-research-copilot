---
type: source
title: "Equipping agents for the real world with Agent Skills"
authors: [Barry Zhang, Keith Lazuka, Mahesh Murag]
published: 2025-10-16
clipped: 2026-08-16
url: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
source-type: article
raw: "[[01-raw/equipping-agents-for-the-real-world-with-agent-skills]]"
status: compiled
tags: [agent-skills, claude, positioning, mcp, progressive-disclosure]
---

## TL;DR
Anthropic's launch blog post (Oct 16, 2025) introducing Agent Skills as portable folders of instructions, scripts, and resources that agents load dynamically, positioned as complementary to MCP and supported across all Claude surfaces.

## Key claims
- Agent Skills are "organized folders of instructions, scripts, and resources that agents can discover and load dynamically to perform better at specific tasks."
- A Skill's core structure requires a `SKILL.md` file containing YAML metadata (name and description) plus optional additional files and executable code.
- Skills "extend Claude's capabilities by packaging expertise into composable resources, transforming general-purpose agents into specialized agents that fit specific needs."
- "Building a skill for an agent is like putting together an onboarding guide for a new hire."
- Skills use progressive disclosure across three tiers (metadata → full SKILL.md → additional linked files loaded "only as needed"), which makes "the amount of context that can be bundled into a skill effectively unbounded."
- Skills can include executable code that Claude runs "without loading either the script or the PDF into context," operating within agent environments that have "local code execution and filesystems."
- Skills "complement Model Context Protocol (MCP) servers by teaching agents more complex workflows that involve external tools and software."
- Skills are "supported today across Claude.ai, Claude Code, the Claude Agent SDK, and the Claude Developer Platform."
- The post was written by Barry Zhang, Keith Lazuka, and Mahesh Murag and published October 16, 2025; an update notes Agent Skills were published as an open standard for cross-platform portability on December 18, 2025.

## Relevance to thesis
Establishes the canonical positioning of Agent Skills — the primary packaging/distribution mechanism a financial-research RAG copilot would use to bundle SEC-filing procedures, XBRL workflows, and domain conventions as portable capabilities rather than hard-coded prompts. The MCP-complementarity framing matters for a system that already fetches external data (EDGAR, Yahoo Finance) via tools/services.

## Concepts touched
[[agent-skills]] · [[skill-md]] · [[progressive-disclosure]] · [[model-context-protocol]] · [[code-execution-environment]] · [[agent-skills-open-standard]] · [[claude-code]] · [[claude-agent-sdk]] · [[claude-developer-platform]] · [[claude-ai]]