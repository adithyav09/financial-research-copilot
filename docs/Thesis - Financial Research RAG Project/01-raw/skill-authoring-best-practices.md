> Source: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
> Fetched: 2026-08-16
> Publisher: docs.claude.com (Anthropic / Claude Platform Docs)

# Skill authoring best practices

*Learn how to write effective Skills that Claude can discover and use successfully.*

Good Skills are concise, well-structured, and tested with real usage. This guide provides practical authoring decisions to help you write Skills that Claude can discover and use effectively.

## Core principles

### Concise is key

The context window is a public good. Your Skill shares the context window with everything else Claude needs to know, including: the system prompt, conversation history, other Skills' metadata, and your actual request.

Not every token in your Skill has an immediate cost. At startup, only the metadata (name and description) from all Skills is pre-loaded. Claude reads SKILL.md only when the Skill becomes relevant, and reads additional files only as needed. However, being concise in SKILL.md still matters: once Claude loads it, every token competes with conversation history and other context.

**Default assumption: Claude is already very smart.** Only add context Claude doesn't already have. Challenge each piece of information:
- "Does Claude really need this explanation?"
- "Can I assume Claude knows this?"
- "Does this paragraph justify its token cost?"

Good example: Concise (~50 tokens) — just show the pdfplumber code. Bad example: Too verbose (~150 tokens) — explaining what a PDF is and why to install a library. The concise version assumes Claude already has information about PDFs and how libraries work.

### Set appropriate degrees of freedom

Match the level of specificity to the task's fragility and variability.

- **High freedom** (text-based instructions): use when multiple approaches are valid, decisions depend on context, heuristics guide the approach. Example: a code-review process described as general steps.
- **Medium freedom** (pseudocode or scripts with parameters): use when a preferred pattern exists, some variation is acceptable, configuration affects behavior.
- **Low freedom** (specific scripts, few or no parameters): use when operations are fragile and error-prone, consistency is critical, a specific sequence must be followed. Example: "Run exactly this script: `python scripts/migrate.py --verify --backup`. Do not modify the command or add additional flags."

**Analogy:** Think of Claude as a robot exploring a path. Narrow bridge with cliffs on both sides → only one safe way forward, provide specific guardrails and exact instructions (low freedom), e.g. database migrations. Open field with no hazards → many paths lead to success, give general direction and trust Claude (high freedom), e.g. code reviews.

### Test with all models you plan to use

Skills act as additions to models, so effectiveness depends on the underlying model. Test your Skill with all the models you plan to use it with. Claude Haiku (fast, economical): Does the Skill provide enough guidance? Claude Sonnet (balanced): Is the Skill clear and efficient? Claude Opus (powerful reasoning): Does the Skill avoid over-explaining? What works perfectly for Opus might need more detail for Haiku.

## Skill structure

**YAML Frontmatter:** The SKILL.md frontmatter requires two fields.

`name`:
- Maximum 64 characters
- Must contain only lowercase letters, numbers, and hyphens
- Cannot contain XML tags
- Cannot contain reserved words: "anthropic", "claude"

`description`:
- Must be non-empty
- Maximum 1,024 characters
- Cannot contain XML tags
- Should describe what the Skill does and when to use it

### Naming conventions

Use consistent naming patterns. Consider using **gerund form** (verb + -ing) for Skill names, as this clearly describes the activity or capability the Skill provides.

Good naming examples (gerund form): `processing-pdfs`, `analyzing-spreadsheets`, `managing-databases`, `testing-code`, `writing-documentation`. Acceptable alternatives: noun phrases (`pdf-processing`), action-oriented (`process-pdfs`). Avoid: vague names (`helper`, `utils`, `tools`), overly generic (`documents`, `data`, `files`), reserved words (`anthropic-helper`, `claude-tools`), inconsistent patterns.

### Writing effective descriptions

The `description` field enables Skill discovery and should include both what the Skill does and when to use it.

**Always write in third person.** The description is injected into the system prompt, and inconsistent point-of-view can cause discovery problems.
- Good: "Processes Excel files and generates reports"
- Avoid: "I can help you process Excel files"
- Avoid: "You can use this to process Excel files"

**Be specific and include key terms.** Include both what the Skill does and specific triggers/contexts for when to use it. Each Skill has exactly one description field. The description is critical for skill selection: Claude uses it to choose the right Skill from potentially 100+ available Skills. Your description must provide enough detail for Claude to know when to select this Skill, while the rest of SKILL.md provides the implementation details.

Effective example (PDF Processing skill):
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```
Avoid vague descriptions like: `Helps with documents`, `Processes data`, `Does stuff with files`.

### Progressive disclosure patterns

SKILL.md serves as an overview that points Claude to detailed materials as needed, like a table of contents in an onboarding guide.

Practical guidance:
- Keep SKILL.md body under 500 lines for optimal performance
- Split content into separate files when approaching this limit

**Pattern 1: High-level guide with references** — SKILL.md has a Quick start plus links: "Form filling: See FORMS.md", "API reference: See REFERENCE.md", "Examples: See EXAMPLES.md". Claude loads those only when needed.

**Pattern 2: Domain-specific organization** — for Skills with multiple domains, organize content by domain to avoid loading irrelevant context. When a user asks about sales metrics, Claude only needs to read sales-related schemas, not finance or marketing data.

**Pattern 3: Conditional details** — show basic content, link to advanced content. Claude reads REDLINING.md or OOXML.md only when the user needs those features.

**Avoid deeply nested references.** Claude may partially read files when they're referenced from other referenced files. When encountering nested references, Claude might use commands like `head -100` to preview content rather than reading entire files, resulting in incomplete information. **Keep references one level deep from SKILL.md.** All reference files should link directly from SKILL.md.

**Structure longer reference files with table of contents.** For reference files longer than 100 lines, include a table of contents at the top. This ensures Claude can see the full scope of available information even when previewing with partial reads.

## Workflows and feedback loops

**Use workflows for complex tasks.** Break complex operations into clear, sequential steps. For particularly complex workflows, provide a checklist that Claude can copy into its response and check off as it progresses. Works for analysis tasks (research synthesis) and code tasks (PDF form filling).

**Implement feedback loops.** Common pattern: Run validator → fix errors → repeat. This pattern greatly improves output quality. The "validator" can be a script or a reference document like STYLE_GUIDE.md.

## Content guidelines

**Avoid time-sensitive information.** Don't include information that will become outdated (e.g. "before August 2025, use the old API"). Instead use a collapsed "Old patterns" section that provides historical context without cluttering the main content.

**Use consistent terminology.** Choose one term and use it throughout the Skill (always "API endpoint", always "field", always "extract"). Consistency helps Claude parse and follow instructions.

## Common patterns

- **Template pattern:** Provide templates for output format. Match strictness to needs ("ALWAYS use this exact template structure" vs "a sensible default format, but use your best judgment").
- **Examples pattern:** For Skills where output quality depends on seeing examples, provide input/output pairs just like in regular prompting.
- **Conditional workflow pattern:** Guide Claude through decision points ("Creating new content? → Creation workflow. Editing existing content? → Editing workflow"). Tip: if workflows become large, push them into separate files.

## Evaluation and iteration

**Build evaluations first.** Create evaluations BEFORE writing extensive documentation. This ensures your Skill solves real problems rather than documenting imagined ones. Evaluation-driven development:
1. Identify gaps: Run Claude on representative tasks without a Skill. Document failures.
2. Create evaluations: Build three scenarios that test these gaps.
3. Establish baseline: Measure Claude's performance without the Skill.
4. Write minimal instructions: Create just enough content to address the gaps and pass evaluations.
5. Iterate: Execute evaluations, compare against baseline, refine.

Evaluations are your source of truth for measuring Skill effectiveness. There is not currently a built-in way to run these evaluations; users create their own evaluation system.

**Develop Skills iteratively with Claude.** Work with one instance of Claude ("Claude A") to create a Skill that is used by other instances ("Claude B"). Claude A helps you design and refine instructions, while Claude B tests them in real tasks. Claude models understand the Skill format and structure natively — you don't need special system prompts or a "writing skills" skill to get Claude to help create Skills. When Claude B struggles or misses something, return to Claude A with specifics. Claude A might suggest using stronger language such as "MUST filter" instead of "always filter".

**Observe how Claude navigates Skills.** Watch for: unexpected exploration paths, missed connections (failing to follow references), overreliance on certain sections, ignored content. The `name` and `description` in your Skill's metadata are particularly critical.

## Anti-patterns to avoid

- **Avoid Windows-style paths.** Always use forward slashes (`scripts/helper.py`), even on Windows. Unix-style paths work across all platforms.
- **Avoid offering too many options.** Don't present multiple approaches unless necessary. Provide a default with an escape hatch instead of listing pypdf/pdfplumber/PyMuPDF/pdf2image.

## Advanced: Skills with executable code

- **Solve, don't defer.** When writing scripts for Skills, handle error conditions rather than deferring to Claude. Handle FileNotFoundError/PermissionError explicitly instead of just failing.
- Configuration parameters should be justified and documented to avoid "voodoo constants" (Ousterhout's law). No magic numbers like `TIMEOUT = 47  # Why 47?`.
- **Provide utility scripts.** Even if Claude could write a script, pre-made scripts are more reliable than generated code, save tokens (no need to include code in context), save time, and ensure consistency.
- **Important distinction:** Make clear whether Claude should *execute the script* ("Run analyze_form.py to extract fields") or *read it as reference* ("See analyze_form.py for the field extraction algorithm"). For most utility scripts, execution is preferred because it's more reliable and efficient.
- **Create verifiable intermediate outputs.** The "plan-validate-execute" pattern catches errors early: Claude first creates a plan in a structured format, then validates that plan with a script before executing it. Use for batch operations, destructive changes, complex validation rules, high-stakes operations.
- **Package dependencies.** Skills run in the code execution environment with platform-specific limitations. claude.ai can install packages from npm and PyPI; Claude API has no network access and no runtime package installation. List required packages in your SKILL.md.

### Runtime environment

Skills run in a code execution environment with filesystem access, bash commands, and code execution capabilities. How Claude accesses Skills:
1. **Metadata pre-loaded:** At startup, name and description from all Skills' YAML frontmatter are loaded into the system prompt.
2. **Files read on-demand:** Claude uses bash Read tools to access SKILL.md and other files when needed.
3. **Scripts executed efficiently:** Utility scripts can be executed through bash without loading their full contents into context. Only the script's output consumes tokens.
4. **No context penalty for large files:** Reference files don't consume context tokens until actually read.

### MCP tool references

If your Skill uses MCP (Model Context Protocol) tools, always use fully qualified tool names to avoid "tool not found" errors. Format: `ServerName:tool_name` (e.g. `BigQuery:bigquery_schema`, `GitHub:create_issue`). Without the server prefix, Claude may fail to locate the tool, especially when multiple MCP servers are available.

### Avoid assuming tools are installed

Don't assume packages are available. Be explicit about dependencies ("Install required package: `pip install pypdf`").

## Technical notes

### YAML frontmatter requirements
- `name`: Maximum 64 characters, lowercase letters/numbers/hyphens only, no XML tags, no reserved words
- `description`: Maximum 1,024 characters, non-empty, no XML tags

### Token budgets
Keep SKILL.md body under 500 lines for optimal performance. If your content exceeds this, split it into separate files using progressive disclosure patterns.

## Checklist for effective Skills

**Core quality:** Description is specific and includes key terms · Description includes both what the Skill does and when to use it · SKILL.md body is under 500 lines · Additional details in separate files · No time-sensitive information · Consistent terminology · Concrete examples · File references one level deep · Progressive disclosure used appropriately · Workflows have clear steps.

**Code and scripts:** Scripts solve rather than defer · Explicit error handling · No voodoo constants · Required packages listed and verified · Clear script documentation · No Windows-style paths · Validation/verification steps for critical operations · Feedback loops for quality-critical tasks.

**Testing:** At least three evaluations created · Tested with Haiku, Sonnet, and Opus · Tested with real usage scenarios · Team feedback incorporated.
