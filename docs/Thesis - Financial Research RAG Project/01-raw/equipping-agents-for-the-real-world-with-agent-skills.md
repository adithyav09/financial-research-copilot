> Source: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
> Fetched: 2026-08-16
> Publisher: Anthropic (Engineering blog)

# Equipping agents for the real world with Agent Skills

Written by Barry Zhang, Keith Lazuka, and Mahesh Murag. Published October 16, 2025.
(An update on the post notes Agent Skills were published as an open standard for cross-platform portability on December 18, 2025.)

> NOTE: The following is a faithful extract/summary of the engineering post captured at fetch time, preserving its verbatim key phrases in quotation marks.

## What Agent Skills are

Agent Skills are "organized folders of instructions, scripts, and resources that agents can discover and load dynamically to perform better at specific tasks." They function as composable capabilities that transform general-purpose agents into specialized ones. The core structure requires a `SKILL.md` file containing YAML metadata (name and description) plus optional additional files and executable code.

Skills "extend Claude's capabilities by packaging expertise into composable resources, transforming general-purpose agents into specialized agents that fit specific needs." "Building a skill for an agent is like putting together an onboarding guide for a new hire."

## Why they were created

Skills address a fundamental challenge: "Claude is powerful, but real work requires procedural knowledge and organizational context." As agents grew more capable through features like Claude Code, there emerged a need for "more composable, scalable, and portable ways to equip them with domain-specific expertise" rather than building "fragmented, custom-designed agents for each use case."

The post frames the shift as: as model capabilities improve, we can now build general-purpose agents that interact with full-fledged computing environments, which led to the creation of Agent Skills.

## Progressive disclosure

Skills implement a three-tier disclosure model. The metadata provides initial context about when to use a skill. If relevant, Claude loads the full `SKILL.md`. Additional linked files represent the third level, loaded "only as needed" based on specific scenarios. This design means "the amount of context that can be bundled into a skill is effectively unbounded."

## Code execution and filesystem

Skills can include executable code as tools. The PDF skill example demonstrates this: "Claude can run this script without loading either the script or the PDF into context." Skills operate within agent environments with "local code execution and filesystems," allowing deterministic operations to complement token-based reasoning.

## Relationship to Model Context Protocol (MCP)

The post explores how Skills can "complement Model Context Protocol (MCP) servers by teaching agents more complex workflows that involve external tools and software." Skills and MCP are positioned as complementary approaches, not competitors.

## Availability / distribution

Skills are directory-based, making them "simple" in format and structure. They bundle instructions, scripts, and resources together. They are "supported today across Claude.ai, Claude Code, the Claude Agent SDK, and the Claude Developer Platform."

Authors close by describing themselves as people "who all really like folders."
