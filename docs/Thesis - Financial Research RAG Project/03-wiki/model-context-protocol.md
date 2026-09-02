---
type: concept
title: "Model Context Protocol (MCP)"
aliases: [MCP, model-context-protocol]
status: stub
sources: ["[[src-equipping-agents-for-the-real-world-with-agent-skills]]", "[[src-claude-code-discover-install-plugins-marketplaces]]", "[[src-skill-authoring-best-practices]]"]
updated: 2026-08-20
---

An open protocol for connecting agents to external tools and data sources. In the [[agent-skills|Agent Skills]] world it is **complementary, not competing**: Skills complement MCP servers by teaching agents the more complex workflows that involve those external tools and software ([[src-equipping-agents-for-the-real-world-with-agent-skills]]) — MCP connects the tool, a Skill teaches the procedure. MCP servers can be bundled and distributed inside [[claude-code-plugins|plugins]] ([[src-claude-code-discover-install-plugins-marketplaces]]), and skill authors must reference MCP tools by fully qualified `ServerName:tool_name` names ([[src-skill-authoring-best-practices]]).

## See also
[[skills-vs-other-extensibility]] · [[claude-code-plugins]]