---
name: expressivecss
description: Use ExpressiveCSS for accessible Material 3 interfaces.
license: MIT
compatibility: Requires access to the target project's files or the public ExpressiveCSS documentation.
metadata:
  author: BaezFJ
  version: "0.4.0"
  homepage: https://www.expressivecss.com
  repository: https://github.com/BaezFJ/ExpressiveCSS
  platforms: linux, macos, windows
  tags: expressivecss, material-design-3, css, accessibility, components
---

# ExpressiveCSS

ExpressiveCSS is a semantic HTML and Material Design 3 Expressive front-end framework. Use the target version's documentation as the contract; this skill organizes design and review, setup, usage, theming, runtime, accessibility, and component references. The frontmatter metadata `version` is the skill workflow version, not the ExpressiveCSS framework or generated contract version.

## When to use this skill

Use this skill whenever a task involves `@expressivecss/expressive`, including:

- choosing or implementing components, navigation, feedback, forms, or adaptive layouts;
- designing, refining, hardening, or reviewing complete ExpressiveCSS surfaces and flows;
- authoring, reviewing, or repairing ExpressiveCSS HTML, JSX, templates, Sass, CSS, or JavaScript;
- installing the package, configuring themes, or initializing component behavior;
- checking ExpressiveCSS semantics, accessibility, or Material 3 conformance;
- contributing components, documentation, tests, or styles to ExpressiveCSS itself.

Do not use it for generic Material Design work in a project that does not use ExpressiveCSS.

## Staged guide routing

Start with this root guide only. A link or a path in the root context does not count as loading a guide. A guide is loaded only after its `SKILL.md` contents are actually read. Record that read in an agent or evaluator trace.

Use these stages in order:

1. **Classify.** Choose the operating mode and classify the task using only the root guide and the request.
2. **Shortlist.** Use the table below to list candidate guides. Do not read them yet.
3. **Inspect.** For component work, inspect candidate runtime ownership in the [component decision index](./references/component-decisions.md) before deciding whether to read Runtime. CSS-only and native ownership keep Runtime out; JavaScript, Auto Init, shared-runtime, or manual ownership requires it.
4. **Read.** Read only every guide in the applicable `Must read` cell, then record the actual file reads. Apply Usage and Accessibility for every interface implementation or review. Read Theming for visual or token work, Design for broader surface decisions, and Installation for setup or discovered version uncertainty. Read every plausible candidate guide during selection and every selected component guide during implementation or review. Read Runtime only for JavaScript, Auto Init, shared-runtime, or manual ownership. Record why the task widened.

Guide names in the table map to [Install](./expressivecss-install/SKILL.md), [Design](./expressivecss-design/SKILL.md), [Usage](./expressivecss-usage/SKILL.md), [Theming](./expressivecss-theming/SKILL.md), [Runtime](./expressivecss-runtime/SKILL.md), [Accessibility](./expressivecss-accessibility/SKILL.md), and [component guides](./components/).

| Task classification | Must read | Must not read by default |
| --- | --- | --- |
| Setup only | Install | Design, Usage, Theming, Runtime, Accessibility, component guides |
| CSS-only static markup | Usage, Accessibility, selected component guides | Install, Design, Theming, Runtime |
| Token-only theming | Theming | Install, Design, Usage, Runtime, Accessibility, component guides |
| Visual Critique | Design, Usage, Theming, Accessibility | Install, Runtime |
| CSS-only Audit | Design, Usage, Accessibility, selected component guides | Install, Theming, Runtime |
| JavaScript-backed Audit | Design, Usage, Runtime, Accessibility, selected component guides | Install, Theming |
| Manual initialization | Usage, Runtime, Accessibility, selected component guides | Install, Design, Theming |

If several rows apply, take the union after runtime ownership inspection. Setup only stays limited to Install. Every interface implementation or review reads Usage and Accessibility, plus every plausible candidate and selected component guide when component work is in scope. Visual or token work adds Theming. A CSS-only Audit must not read Runtime merely because its mode is Audit. A JavaScript-backed Audit must read Runtime. A Critique reads Runtime only when interaction evidence is in scope.

## Component guides

The generated [component decision index](./references/component-decisions.md) owns the complete component inventory, candidate boundaries, alternatives, adaptive notes, runtime ownership, and links to all 46 generated guides. Do not duplicate that inventory here. Read every plausible candidate guide identified by the index before choosing, then read every selected guide during implementation and review.

## Component discovery protocol

Before writing ExpressiveCSS code:

1. Identify the requested function, behavior, content, and reachable window classes. Do not select from appearance or the user's exact noun alone.
2. Read the [component decision index](./references/component-decisions.md). Compare each candidate's use when, avoid when, common alternatives, adaptive decisions, and runtime owner with the chooser in [`m3-guidelines.md`](https://www.expressivecss.com/m3-guidelines.md).
3. When selection remains uncertain, read all candidate guides. Compare their jobs, native elements, adaptive behavior, and interaction models. Treat fuzzy or name-only matches as uncertain.
4. Select the smallest component or combination that fully matches the job. Define its next narrower layout before writing markup.
5. Read the selected component's full target-version documentation from the link in its guide.
6. Copy the documented host element, child structure, relationships, classes, and initialization mode. Apply every rule in the guide.

If the user names a component and a guide with that name exists, read that guide first. Still compare alternatives when the requested behavior does not match the named component.

## Authority by question

Resolve the exact installed framework version before reading contract-dependent guidance. Use the bundled [version resolver](./scripts/resolve-version.mjs):

`terminal(command="node skills/expressivecss/scripts/resolve-version.mjs --project-root <project> --contract-version <contract-version>", timeout=120)`

The explicit contract argument is an override. The portable copy otherwise reads its generated contract manifest. Resolution precedence is framework source, installed package, lockfile, then manifest range as declaration-only evidence. Do not infer an exact installed version from a manifest range. An installed or locked version outside the direct manifest range blocks contract use. Malformed, unsupported, ambiguous, or conflicting active installation evidence makes the contract `unresolved`, even when `node_modules` contains an exact version. Report the selected candidate and every blocked diagnostic; never present current documentation as verified in that state.

- On `match`, current documentation matches the bundled contract. Use it with the generated-guide source hash.
- On `mismatch`, use the matching tag or commit and the installed package. Mark contract-dependent checks `Blocked` if matching guidance is unavailable.
- On `unresolved`, state that target-version guidance is unavailable. Do not present current documentation as verified for the target.

In this repository, also use `package.json` and `CHANGELOG.md` to identify source-tree intent.

Use the source that owns the decision:

- **Design intent:** [`m3-guidelines.md`](https://www.expressivecss.com/m3-guidelines.md) for component choice, anatomy, placement, emphasis, and adaptive behavior.
- **Shipped contract:** [`llm.md`](https://www.expressivecss.com/llm.md) or the matching component page for elements, classes, tokens, options, methods, properties, and events.
- **Authored semantics:** the component row in [`semantics.json`](https://github.com/BaezFJ/ExpressiveCSS/blob/master/semantics.json); [`SEMANTICS.md`](https://www.expressivecss.com/SEMANTICS.md) is generated from it.
- **Runtime truth:** Sass, TypeScript, the registry, neighboring examples, and tests when contributing or resolving documentation drift.

These sources own different questions; do not use one domain to overrule another. If two sources disagree about the same question, the live Material specification wins for design intent, `semantics.json` wins for authored semantics, and the installed ExpressiveCSS version wins for shipped behavior. Report the disagreement instead of silently combining incompatible contracts.

Outside this repository, start from [llms.txt](https://www.expressivecss.com/llms.txt), [llm.md](https://www.expressivecss.com/llm.md), and [m3-guidelines.md](https://www.expressivecss.com/m3-guidelines.md). The public site describes the current release. For an older installed version, inspect the files in the installed package and the matching repository tag or commit before using current documentation. State when matching version documentation is unavailable.

## Optional MCP acceleration

The Markdown workflow remains complete when the MCP server is unavailable. When the ExpressiveCSS MCP server is configured, map its tools to bounded steps:

| Tool | Use |
| --- | --- |
| `setup_expert` | Resolve setup, package-manager, and target-version facts. |
| `rules_enforcer` | Check named component and semantics rules against selected source files. |
| `component_syntax_expert` | Retrieve syntax and contract details for candidates selected through the decision index. |
| `quality_inspector` | Run static authoring checks and declared verification commands. |

An MCP pass applies only to `checksPerformed` and its named evidence sources. It does not replace rendered visual, responsive, keyboard, focus, accessibility-tree, assistive-technology, contrast, zoom, reflow, motion, or touch review. Carry `uncheckedAreas`, `coverageStatus`, and `blockedChecks` into the evidence ledger. A contract mismatch makes target-version-dependent claims `Blocked` until matching evidence is available.

## Framework contribution path

When modifying ExpressiveCSS itself, read `CLAUDE.md` and the domain-specific README before editing. Trace the affected surface through documentation, Sass or TypeScript, semantics, fixtures, and tests. Add a focused regression test, change the source of truth, regenerate derived files, then run the focused test and every applicable typecheck, suite, build, docs, semantics, and visual check.

The component guides are generated from the documentation catalogue, `llm.md`, and `semantics.json`. After any of those contracts changes, run `terminal(command="npm run build:skill", timeout=600)` and commit the generated guide updates.

For the research and rationale behind these rules, read [`docs/agents/expressivecss-skill-research.md`](https://github.com/BaezFJ/ExpressiveCSS/blob/master/docs/agents/expressivecss-skill-research.md).