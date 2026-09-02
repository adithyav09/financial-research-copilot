---
type: concept
title: "allowed-tools & Invocation Control"
aliases: [allowed-tools, disallowed-tools, invocation-control, least-privilege]
status: draft
sources: ["[[src-claude-code-skills]]"]
updated: 2026-08-20
---

Claude Code frontmatter fields that govern **who can invoke a Skill and what it may do while active**.

## Invocation control
- `disable-model-invocation: true` — only the user can invoke the Skill (manual `/name`), used for side-effecting workflows like `/deploy`: "You don't want Claude deciding to deploy because your code looks ready" ([[src-claude-code-skills]]).
- `user-invocable: false` — only Claude can invoke it, for background knowledge that isn't a meaningful user command ([[src-claude-code-skills]]).
- Default: both the user and Claude can invoke any Skill ([[src-claude-code-skills]]).

## allowed-tools
`allowed-tools` grants permission for the listed tools during the turn that invokes the Skill, so Claude can use them without prompting; **the grant clears when you send your next message** ([[src-claude-code-skills]]). Critically, it does **not** restrict which tools are available — every tool remains callable and your permission settings still govern unlisted tools; to pre-approve for a whole session, use permission settings instead ([[src-claude-code-skills]]).

`disallowed-tools` does the inverse: it removes tools from Claude's pool while the Skill is active (e.g. to stop a background loop from calling `AskUserQuestion`), and the restriction clears on the next message ([[src-claude-code-skills]]).

## The self-granting warning
This is the load-bearing [[skill-security|security]] caveat: "Workspace trust doesn't gate this field... A skill can grant itself broad tool access, so review the `allowed-tools` of skills checked into a repository before you run Claude Code there" ([[src-claude-code-skills]]). Using `${CLAUDE_SKILL_DIR}` in both the `allowed-tools` rule and the skill body makes the rule match the exact command, so a bundled script runs without prompting ([[src-claude-code-skills]]).

## Restricting the Skill tool itself
Claude's skill access can be restricted with permission rules: deny the `Skill` tool entirely, or use `Skill(name)` / `Skill(name *)` for exact or prefix control ([[src-claude-code-skills]]).

## Synthesis
`allowed-tools` is a **convenience grant, not a sandbox** — it removes approval friction for the invoking turn but does not confine the Skill. Real confinement comes from permission settings and from not running untrusted skills at all. For a system that already role-gates privileged operations, the least-privilege move is `disallowed-tools` + narrow, `${CLAUDE_SKILL_DIR}`-scoped grants, never a blanket allow.
Draws on: [[src-claude-code-skills]].

## See also
[[skill-security]] · [[skill-md]] · [[subagents]]