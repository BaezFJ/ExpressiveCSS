---
name: expressivecss
description: Build, refine, review, install, theme, and debug ExpressiveCSS interfaces. Use for @expressivecss/expressive markup, components, accessibility, runtime lifecycle, performance, and framework contributions. Exclude generic Material Design or CSS work in projects without ExpressiveCSS.
license: MIT
compatibility: Requires access to the target project's files or the public ExpressiveCSS documentation.
metadata:
  author: BaezFJ
  version: "0.7.0"
  homepage: https://www.expressivecss.com
  repository: https://github.com/BaezFJ/ExpressiveCSS
  platforms: linux, macos, windows
  tags: expressivecss, material-design-3, css, accessibility, components
---

# ExpressiveCSS

ExpressiveCSS implements Material Design 3 Expressive with semantic HTML. Metadata `version` identifies this workflow; the contract manifest identifies the framework.

## Staged guide routing

Start here. Classify the task and runtime ownership before reading support guides. Record actual reads; a link does not count as loaded guidance.

Guide names map to [Install](./expressivecss-install/SKILL.md), [Design](./expressivecss-design/SKILL.md), [Usage](./expressivecss-usage/SKILL.md), [Theming](./expressivecss-theming/SKILL.md), [Runtime](./expressivecss-runtime/SKILL.md), [Accessibility](./expressivecss-accessibility/SKILL.md), and [component guides](./components/).

| Task classification | Must read | Must not read by default |
| --- | --- | --- |
| Setup only | Install | Design, Usage, Theming, Runtime, Accessibility, component guides |
| CSS-only static markup | Usage, Accessibility, selected component guides | Install, Design, Theming, Runtime |
| Token-only theming | Theming | Install, Design, Usage, Runtime, Accessibility, component guides |
| Visual Critique | Design, Usage, Theming, Accessibility | Install, Runtime |
| CSS-only Audit | Design, Usage, Accessibility, selected component guides | Install, Theming, Runtime |
| JavaScript-backed Audit | Design, Usage, Runtime, Accessibility, selected component guides | Install, Theming |
| Manual initialization with markup changes | Usage, Runtime, Accessibility, selected component guides | Install, Design, Theming |
| Narrow runtime lifecycle repair | Runtime, selected component guides | Install, Design, Usage, Theming, Accessibility |
| New surface, Refine, or Redesign | Design, Usage, Theming, Accessibility, selected component guides | Install |

Combine overlapping routes. Interface implementation and review require Usage and Accessibility; add them to narrow lifecycle work when markup or accessibility behavior changes. Add Theming for visual/token work and Install for setup/version uncertainty. Inspect runtime ownership in the decision index: JavaScript, Auto Init, shared-runtime, and manual ownership require Runtime; CSS-only and native ownership do not. Critiques need Runtime when interaction evidence is in scope. Record why a route widens.

## Component guides

The generated [component decision index](./references/component-decisions.md) owns the complete component inventory, use/avoid boundaries, alternatives, runtime ownership, and guide links. Detailed adaptive decisions and Material links live in each component guide.

Selected guides distinguish Google components, patterns, related guidance, and web extensions. Their dated evidence and support boundaries do not establish full specification parity or browser conformance.

## Component discovery protocol

1. Identify the user's job, behavior, content, and reachable window classes. Read the index entry for the named or likely component.
2. Compare use when, avoid when, alternatives, and runtime ownership. For an unambiguous component, read only its selected guide. When selection remains uncertain, read all plausible candidate guides before choosing; names and appearance alone do not prove fit.
3. Apply the selected guide's adaptive decisions and define the next narrower layout. Choose the smallest component or combination that fully meets the job.
4. Copy the documented host, children, relationships, classes, and initialization mode. Apply the guide's semantic rules.
5. Read full target-version documentation only for missing contract details, conflicts, or version uncertainty. Matching bundled guidance suffices for the syntax and rules it covers.

## Authority by question and version

Resolve the exact installed framework version once per task before contract-dependent work. Repeat only after dependency evidence changes. Run the bundled [version resolver](./scripts/resolve-version.mjs) using its path relative to this skill's location, not the consuming repository:

```sh
node "<skill-directory>/scripts/resolve-version.mjs" --project-root "<project>"
```

The resolver reads the bundled contract manifest; `--contract-version` overrides its comparison version. Evidence precedence: framework source, installed package, lockfile, then declaration-only manifest range. A range is not an installed version. Conflicting, malformed, ambiguous, or unsupported installation evidence remains unresolved; report the candidate and blocked diagnostics.

- On `match`, use bundled matching guidance only when `bundledContractSafe` is true. Otherwise use installed sources or a matching tag. A bundled match does not verify the public website's version; `currentDocsSafe` requires independent site provenance.
- On `mismatch`, inspect the installed package and matching tag or commit. Mark only dependent checks `Blocked` if matching guidance is unavailable.
- On `unresolved`, state that target-version guidance is unavailable. Continue independent work without claiming verified contract conformance.

Use the source that owns the question, at the resolved version:

- **Design intent:** [Material guidance](https://www.expressivecss.com/m3-guidelines.md) for component choice and adaptive behavior; the live Material specification resolves design disagreements.
- **Shipped contract:** [API reference](https://www.expressivecss.com/llm.md) and component pages for elements, classes, tokens, options, methods, and events. Installed source wins on shipped behavior.
- **Authored semantics:** [semantics.json](https://github.com/BaezFJ/ExpressiveCSS/blob/master/semantics.json); [SEMANTICS.md](https://www.expressivecss.com/SEMANTICS.md) is generated from it.
- **Runtime truth:** Sass, TypeScript, registry, neighboring examples, and tests when contributing or resolving drift.

Public-site and master-branch links are discovery pointers, not proof of the target version. For an older installed version use installed sources and a matching repository tag or commit. Report disagreements instead of combining incompatible contracts.

## Browser evidence

Before browser-dependent claims, probe one available route by loading the target. Prefer supplied project/browser tooling; a listed connector is not proof it works. Reuse a working route. After a permission, connection, or launch failure, stop retrying it until capability changes; continue independent source work. A bad selector can be corrected without changing routes.

Separate source findings, browser observations, and unavailable checks. Reference actual tool output or captures. Quote observed errors without guessing codes or causes. A compound command's status does not prove each subcommand passed. Keep verification proportional to the task; source checks do not establish browser conformance.

## Optional MCP acceleration

MCP is optional; the Markdown workflow stands alone.

| Tool | Use |
| --- | --- |
| `setup_expert` | Resolve setup and target-version facts. |
| `rules_enforcer` | Check selected source files against component and semantics rules. |
| `component_syntax_expert` | Retrieve candidate syntax and contract details. |
| `quality_inspector` | Run static checks and declared verification commands. |

An MCP pass covers only `checksPerformed` and named sources. It does not establish browser, visual, or accessibility conformance. Report `uncheckedAreas`, `coverageStatus`, and `blockedChecks`. Contract mismatch blocks dependent claims until matching evidence exists.

## Framework contribution path

Read the repository's contributor instructions, `CLAUDE.md`, and relevant domain README before editing. Trace callers and the owning documentation, Sass or TypeScript, semantics, fixtures, and tests. Preserve exports, markup compatibility, accessibility, upstream references, and license notices. Fix the shared source, add a focused regression check, and run the applicable contributor, browser, and MCP/package checks.

The catalogue owns page inventory; `llm.md` and `semantics.json` own generated component contracts. Run `npm run build:semantics` and `npm run build:skill` after changing their sources; never edit generated copies by hand. Do not publish as part of ordinary contribution work.

[Research and rationale](https://github.com/BaezFJ/ExpressiveCSS/blob/master/docs/agents/expressivecss-skill-research.md) explain workflow decisions.
