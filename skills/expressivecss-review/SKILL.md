---
name: expressivecss-review
description: Orchestrated ExpressiveCSS UI review. Runs five specialist subagents (Creative Director, Page Architect, Component Syntax Expert, Quality Inspector, Rules Enforcer) over a page, component, template, screenshot, or pasted markup, verifies their findings, and returns one scored report with ranked fixes. Use whenever someone asks to review, audit, grade, critique, or check an interface, page, layout, or component built with ExpressiveCSS or @expressivecss/expressive, including "is this markup right", "score this page", "what's wrong with this layout", or a screenshot of an ExpressiveCSS app, even if they don't say "orchestrated". Not for building new UI or for reviewing the framework's own Sass and TypeScript source.
license: MIT
compatibility: Needs the sibling expressivecss skill for guides and the version resolver. Subagents need an agent-spawning tool; without one, run the five lenses in sequence.
metadata:
  author: BaezFJ
  version: "0.1.0"
  tags: expressivecss, review, audit, subagents, material-design-3
---

# ExpressiveCSS orchestrated review

You are the orchestrator. You do not review the interface yourself. You collect shared evidence once, hand each of five specialists a brief, check what they bring back, and write one report. The specialists exist so each lens gets a full context window and its own guides; your job is to keep them from overlapping, keep them honest, and turn their output into a short list of fixes a developer can act on.

The framework knowledge lives in the sibling skill at `../expressivecss/` (call it `<base>`). Its guides, component references, `semantics.json` rule IDs, and version resolver are the source of truth. This skill adds only the orchestration.

## 1. Pin the target

Work out what is under review and write it down in one line before anything else:

- **Files or a route in a project.** Note the project root and the exact files. For a route, find the files that render it.
- **Pasted markup.** Save it to a fresh temp directory (for example `/tmp/expressivecss-review-<id>/input.html`) so the lint can read it. Lint only inspects files inside its working directory, so run it from that directory.
- **Screenshot.** Read the image. Source-level checks (markup, lint, lifecycle) have no evidence, so those lenses report from what is visible and mark the rest Blocked. Ask for the markup only if the user wants a source-level review.
- **Template** from `<base>/assets/templates/`. Treat it like a file.

If the scope is a whole app, pick the pages the user named. If they named none, ask which ones, because five agents over an entire codebase gives a shallow review of everything.

## 2. Collect shared evidence once

Run these yourself and pass the output to every specialist. Running them once keeps the agents from repeating the same commands and from disagreeing about the facts.

1. **Version and guidance source.** Run `node <base>/scripts/resolve-version.mjs --project-root <project>` and apply the base skill's "Authority by question and version" rules before you brief anyone, because the bundled guides and the lint describe the current contract and an older app can be valid under its own. Decide one guidance source and pass it to every specialist:
   - `match` with `bundledContractSafe: true`: the bundled guides.
   - `mismatch`, or a match that is not bundle-safe: the installed package's sources (`node_modules/@expressivecss/expressive`) or the matching tag. If neither is available, contract-dependent checks (class names, markup structure, rule IDs, retired names, asset layout) are Blocked, and the specialists report only version-independent issues such as invalid HTML nesting, WCAG failures, and literal colors.
   - `unresolved` with no version evidence at all, as with pasted markup, a screenshot, or a project that never declares ExpressiveCSS (`unresolved: no project`): review against the bundled guides, but label contract findings "against current ExpressiveCSS <bundled version>" so the user can discount them if they run an older release.
   - `unresolved` with blocking diagnostics, such as conflicting installed and lockfile versions, malformed metadata, or an unsupported range: the app has a version, but nobody knows which one. Report the resolver's diagnostics, block contract-dependent checks as in the mismatch case, and do not fall back to the bundled guides.
2. **Static lint.** From the project root (or the temp directory), run `npx --package @expressivecss/mcp-server expressivecss-lint <files>`. Inside the ExpressiveCSS repository, `node mcp/expressivecss/lint.mjs <files>` is the same check. If an `expressivecss-mcp` server is connected, `rules_enforcer` gives the same result. Exit 1 means findings, not failure. If the command cannot run, record it as Blocked with the error. The lint checks the current contract, so on a `mismatch` pass its output to specialists as leads to confirm against the matching sources, not as findings.
3. **Browser route.** If a browser or preview tool is available and the target can be served, note the tool and URL. Otherwise write `unavailable: source evidence only`. Do not claim rendered, contrast, or responsive results without it.

## 3. Brief the five specialists

Spawn all five in one message so they run in parallel, and run them in the foreground (with the Agent tool, `run_in_background: false`). In some harnesses a background subagent's result goes to the top-level session instead of to you, so an orchestrator that backgrounds its specialists can wait forever for results that never arrive. Foreground calls in one message still run concurrently and return their findings straight to you.

Each brief is the matching file from `agents/` plus the shared context block below. The subagent does not see this skill, so either paste the agent file into the prompt or give its absolute path and tell the subagent to read it first.

Skip a lens only when the target cannot exercise it at all, such as Page Architect for a ten-line fragment with no layout. Write "Not applicable: <reason>" in that section instead of spawning an agent for nothing.

- [agents/creative-director.md](agents/creative-director.md): tokens, light and dark parity, glass.
- [agents/page-architect.md](agents/page-architect.md): window classes, grid, spacing, hierarchy, reading order.
- [agents/component-syntax-expert.md](agents/component-syntax-expert.md): component markup, nesting, relationships.
- [agents/quality-inspector.md](agents/quality-inspector.md): lifecycle, assets and fonts, states, WCAG 2.2.
- [agents/rules-enforcer.md](agents/rules-enforcer.md): lint results, hardcoded values, overrides, legacy names.

Shared context block, appended to every brief:

```text
Base skill: <absolute path to skills/expressivecss>
Framework: ExpressiveCSS <version>, resolver status <status>
Guidance source: <bundled guides | installed sources at <path> | tag <tag> | none: contract checks Blocked>
Target: <files, URL, screenshot path, or temp file>; out of scope: everything else
Browser route: <tool and URL, or "unavailable: source evidence only">
Planned use: <what the user will build from the target, or "none stated">. Tag gaps that only matter for that use as [adapt]; they are advice, not defects.
Lint output (already run, do not rerun):
<paste the full lint output, or "Blocked: <error>">
Read-only. Do not edit files.
```

Without an agent-spawning tool, work through the five briefs yourself, one at a time, and keep each lens's notes separate until synthesis. Do the same for any specialist whose spawn fails (a concurrency limit, for example), and say in the notes which lenses ran without a subagent.

## 4. Check what comes back

A specialist's finding is a lead until you confirm it. Open the cited file and line (or look at the screenshot region) and make sure the evidence says what the agent claims for every finding you plan to call critical, and for every claim, at any severity, that something does not exist: an undefined class, an invented token, a missing option, a retired name. Each specialist reads only its own guides, so anything outside them looks missing to it, and the fix for a false "this doesn't exist" deletes working code. Search the framework source and the base guides (`grep -rn '<name>' <framework src> <base>`) before you report one. Drop findings you cannot confirm, or move them to polish with "unconfirmed".

Then merge. Give each root cause one home, so the same issue never appears in three sections and inflates the deduction. Pick the home in this order:

1. A WCAG A or AA failure goes to Quality Inspector (section 4), even when the fix is deleting an override or rewriting markup. `*:focus { outline: none }`, an unnamed control, a hand-rolled select a keyboard cannot reach, and text a literal color makes unreadable all land there.
2. Otherwise the finding goes to the lens whose change fixes it. A hardcoded `#fff` card background that still reads fine goes under Rules Enforcer when the fix is "use the token", and a broken `data-target` goes under Component Syntax Expert.

Another section can mention the effect in a few words ("the white card also breaks dark mode, see section 5") without a second bullet.

## 5. Score

Score what the target is, not what the user plans to make of it. If the user says a template will become an inbox, gaps that only matter for that inbox (missing states for async mail, a navigation shell the template never had) go in the report as "Before you adapt it" notes and cost nothing. The same file should get the same score however the request was worded.

Each of the five sections starts at 20 points. Subtract that section's confirmed, deduplicated findings from its own 20 and stop at 0. The master score is the sum of the five. A section with no findings, or one marked Not applicable, keeps its 20.

- Critical (breaks a component, a theme, accessibility, or the framework contract): 8 points.
- Major (wrong but working: a missing state, a misused variant): 3 points.
- Polish: 1 point, at most 3 points per section.

Then apply the critical cap. With one or two confirmed critical findings, the master score is at most 69. With three or more, it is at most 49. Sections with nothing to review keep their 20 points and a section's floor can absorb extra criticals, so without this cap a short fragment with three broken controls could still score in the 70s. A broken control should never sit behind a passing-looking number. When the cap lowers the score, write the uncapped sum next to it, for example "49/100 (capped from 71: 3 critical findings)".

Per-section caps keep one disastrous area from zeroing the whole page, so two broken pages still get different scores and the section scores show where the damage is. Two defects that one edit fixes count once.

Specialists propose a severity; you set the final one from these anchors, so the same defect gets the same severity on every run. Lint severities do not decide it. When a finding matches no anchor, pick the closest one and keep to it.

- Critical: a certain WCAG A or AA failure, such as a control with no accessible name (a `for` that points nowhere, an icon-only button without `aria-label`), focus indicators removed, or a control the keyboard cannot reach.
- Critical: interactive content nested in interactive content (`<a><button>`).
- Critical: a component that cannot initialize or work, such as a menu trigger without `.menu-trigger`, a `data-target` that matches no `id`, or a tab `href` with no panel.
- Critical: a literal color or override that makes text unreadable in one scheme.
- Major: an estimated WCAG failure that needs a browser to confirm, such as contrast read from token tones. It becomes critical once measured.
- Target size (WCAG 2.5.8): critical only when a browser measured the target under 24 by 24 CSS pixels and none of the exceptions in `<base>/expressivecss-accessibility/references/web-checks.md#target-sizes` applies (spacing, equivalent control, inline, user-agent control, essential). A size read from CSS without a measurement is major. Inline links and small controls with enough spacing are not findings.
- Major: a theme switch that is silently ignored (`theme` on `<body>`, glass set on the surface itself) or a token written invalidly (`rgba(var(--md-sys-color-*))`) while the text stays readable.
- Major: two persistent navigation patterns at one width, grid spans over 12, skipped heading levels, or a missing loading, empty, or error state for content that loads.
- Major: markup that misses a documented component slot, so the component's styling for it never applies (a list row's `<p>` wrapped in a `<div>` loses the supporting-text style).
- Major: a literal color that still looks right, `!important` against framework rules, a retired class that still renders, or a landmark without a name (lint `nav-needs-label`).
- Polish: a markup gap the runtime fills at initialization, such as lint `tabs-marks-current` when Tabs sets `aria-current` itself.
- Polish: off-scale inline spacing or type size, redundant classes, duplicate font stylesheets, a render-blocking script.
- No cost: anything unconfirmed. List it under "Not checked" instead.
- No cost: a defect in the framework's own CSS or docs that the target inherits unchanged, such as a component's built-in selected state. The target cannot fix it without an override. Mention it in one line under the section's polish notes as "Framework note:" so it can be reported upstream.

Blocked checks do not cost points, but name them under the score so a high number on a screenshot-only review is not read as a clean bill. The rubric is fixed so two reviews of the same page get comparable scores; if your instinct disagrees with the arithmetic, explain why in one sentence rather than adjusting the number.

## 6. Write the report

Return the report as your reply, not as a file. Use this format exactly. Do not use tables. Keep the section emojis; they are part of the requested format. Each bullet names the location (`file:line`, selector, or screen region), what is wrong, and the fix in a few words. When a list has nothing confirmed, write "None found" and say what was checked, so an empty list reads as a result and not an omission. Cite `semantics.json` rule IDs and lint IDs where they apply. Section 5 has a single list, so start each of its bullets with `[critical]`, `[major]`, or `[polish]`.

```markdown
# ExpressiveCSS Orchestrated UI Review Report

### 📊 Master Framework Score: <score>/100
[One or two sentences on framework compliance, code health, and design fidelity.]
Sections: Theme <n>, Layout <n>, Markup <n>, Lifecycle <n>, Rules <n> (out of 20 each)
Not checked: [Blocked areas and why, or "nothing blocked"]

### 🎨 1. Theme & Token Synthesis ([Creative Director])
Section score: <n>/20
* Critical Token Issues:
  * [finding]
* Major Issues:
  * [finding]
* Polish Notes:
  * [finding, then any "Before you adapt it:" notes]

### 📐 2. Layout & Grid Synthesis ([Page Architect])
Section score: <n>/20
* Critical Layout Issues:
  * [finding]
* Major Issues:
  * [finding]
* Polish Notes:
  * [finding, then any "Before you adapt it:" notes]

### 🧩 3. Markup & Semantics Synthesis ([Component Syntax Expert])
Section score: <n>/20
* Critical Markup Issues:
  * [finding]
* Major Issues:
  * [finding]
* Polish Notes:
  * [finding, then any "Before you adapt it:" notes]

### ⚙️ 4. Lifecycle & Quality Synthesis ([Quality Inspector])
Section score: <n>/20
* Critical Lifecycle/QA Issues:
  * [finding]
* Major Issues:
  * [finding]
* Polish Notes:
  * [finding, then any "Before you adapt it:" notes]

### ⚠️ 5. Anti-Pattern & Rule Violations ([Rules Enforcer])
Section score: <n>/20
* Direct Framework Violations:
  * [critical|major|polish] [finding]

### 🚀 Top 3 Orchestrated Engineering Priorities
1. [Highest-impact fix, with location and the change to make]
2. [...]
3. [...]
```

Rank the priorities by impact on users first (broken interaction, inaccessible controls, unreadable theme), then by how many findings one fix clears. A priority that clears several findings in one change, such as "replace the hand-rolled select with the documented select markup", beats three single-line fixes.
