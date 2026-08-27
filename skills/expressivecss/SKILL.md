---
name: expressivecss
description: Use ExpressiveCSS components, styling, and accessibility.
license: MIT
compatibility: Requires access to the target project's files or the public ExpressiveCSS documentation.
metadata:
  author: BaezFJ
  version: "0.1.0"
  homepage: https://www.expressivecss.com
  repository: https://github.com/BaezFJ/ExpressiveCSS
  platforms: linux, macos, windows
  tags: expressivecss, material-design-3, css, accessibility, components
---

# ExpressiveCSS

Build and review interfaces with ExpressiveCSS as a semantic HTML and Material Design 3 framework. Retrieve the exact component contract before writing markup; this skill defines the process and the framework documentation defines the current API.

## When to use

Use this skill when a task involves `@expressivecss/expressive`, including:

- choosing components, navigation, actions, feedback, or adaptive layouts;
- authoring or reviewing ExpressiveCSS markup;
- using design tokens, themes, Sass, grid, or utilities;
- initializing, configuring, or destroying JavaScript components;
- checking accessibility, HTML semantics, keyboard behavior, or Material 3 conformance;
- contributing components, styles, documentation, or tests to ExpressiveCSS itself.

Use general web or Material Design guidance instead when the target does not use ExpressiveCSS.

## Source hierarchy

Look up the target version before changing markup. A consuming project's manifest and lockfile identify the installed version; this repository's `package.json` and `CHANGELOG.md` identify the checked-out version.

Resolve decisions in this order:

1. **Design intent:** read [`m3-guidelines.md`](../../m3-guidelines.md) for component choice, anatomy, placement, emphasis, and adaptive behavior.
2. **Shipped contract:** read [`llm.md`](../../llm.md) or the matching page under `docs/src/pages/` for exact elements, classes, children, tokens, options, methods, and events.
3. **Authored semantics:** read the component row in [`semantics.json`](../../semantics.json). [`SEMANTICS.md`](../../SEMANTICS.md) is generated from it.
4. **Runtime truth:** when contributing or resolving drift, inspect the Sass or TypeScript definition, `src/ts/components/registry.ts`, neighboring examples, and tests.

Outside this repository, use the matching installed package documentation when available. Otherwise consult:

- `https://www.expressivecss.com/m3-guidelines.md`
- `https://www.expressivecss.com/llm.md`
- `https://www.expressivecss.com/llms.txt`
- `https://www.expressivecss.com/llms-full.txt`

Material Design wins on design intent. The target ExpressiveCSS version wins on what ships. Record and report any disagreement rather than silently combining incompatible contracts.

## Quick start

Install the published package with `npm install @expressivecss/expressive`. In an ES module application, load the stylesheet and initialize registry components after their markup exists:

```js
import '@expressivecss/expressive/css';
import { AutoInit } from '@expressivecss/expressive';

AutoInit();
```

For Sass, use `@use "@expressivecss/expressive/src/sass/expressive";`. For a browser IIFE build, load the compiled CSS and JavaScript and call `Expressive.AutoInit()` after `DOMContentLoaded`. Copy the complete setup for the target version from `llm.md`; it includes the viewport and external font assets.

## Procedure

### 1. Establish the boundary

Identify the ExpressiveCSS version, target screens, supported browsers, existing bundler, and available verification commands. Determine whether the task changes a consumer application or the framework itself.

**Complete when:** the exact framework version and verification seam are known.

### 2. Choose the component before coding

Start from the user's job and window size class. Read the relevant chooser and component sections in `m3-guidelines.md`. Select one component per job, one persistent peer-navigation pattern at each width, one feedback surface per event, and at most one high-emphasis action per region.

Define behavior at the next narrower window class before writing markup.

**Complete when:** every major region has a named component and an adaptive rule.

### 3. Retrieve the exact component contract

Read the matching `llm.md` section or component page, then its `semantics.json` row. Copy the documented host element, required children, classes, ID and `data-target` relationships, authored ARIA, and initialization mode. Do not infer a contract from appearance or from Materialize-era knowledge.

Two distinctions are load-bearing:

- `.loading-indicator` is a shipped CSS component for short waits; it is not the same contract as determinate or long-running `.progress`.
- `.icon-button` is the Material 3 icon-button component with its own token and size ladder. `.button.circle` is the older round common-button form and uses common-button geometry.

**Complete when:** every framework class, attribute, relationship, and API in the proposed change is backed by the target version.

### 4. Author semantic HTML

Begin with the documented native element: `button`, linked `a`, `article`, `nav`, `dialog`, `input`, `select`, `progress`, `label`, or `fieldset`. The DOM should remain meaningful without CSS.

Authors own static semantics: element choice, landmarks, labels, decoration, and the presence of state attributes. The framework owns dynamic state values such as changing `aria-expanded`, `aria-current`, and `aria-selected` where the component contract says it does.

Use `<nav>` only for destinations and label every navigation landmark. Use buttons for commands and real links for navigation. Prefer native `<dialog>` and native form controls over recreated widgets.

**Complete when:** the markup satisfies every rule in the component's `semantics.json` row.

### 5. Apply styles and layout

Load the compiled CSS or Sass entry point once. Load Material Symbols and the chosen text fonts separately; ExpressiveCSS does not ship font files.

Use the framework in this order:

1. documented component variant;
2. grid or layout primitive;
3. single-purpose utility;
4. app-specific custom CSS.

Theme through `theme="light"`, `theme="dark"`, `theme="auto"`, or OS-following default behavior. Consume live `--md-sys-color-*` roles and pair containers with their `on-*` foreground roles. Use `--md-source` when runtime seed-color theming is intended. For translucent role colors, use `color-mix(in oklab, var(--md-sys-color-primary) 6%, transparent)` rather than `rgba(var(--token), alpha)`.

Respect the framework cascade: `tokens`, `base`, `components`, then `utilities`. Ordinary unlayered application CSS outranks normal declarations in those layers.

**Complete when:** custom CSS expresses application-specific design rather than recreating a component, token, utility, or breakpoint.

### 6. Wire runtime behavior once

Create markup before initialization. Use either `AutoInit()` or a component's `init()` on an element, never both. Add `.no-autoinit` when manually initializing a registry component with options. Importing the JavaScript bundle installs shared behavior but does not call `AutoInit()`.

Use the documented lifecycle:

- `ComponentName.init(elementOrCollection, options)`
- `ComponentName.getInstance(element)`
- `instance.destroy()`

Destroy instances when removing mounted components or tearing down a view. Keep generated overlays in the originating shadow root and do not overwrite CSS-owned `transform`, `opacity`, `display`, or overflow state.

**Complete when:** initialization runs once after markup exists and teardown leaves no owned listener, timer, generated node, or instance behind.

### 7. Run the accessibility pass

Check more than the generated semantics contract:

- every control has an accessible name;
- decorative Material Symbol ligatures use `aria-hidden="true"`;
- icon-only controls use `aria-label` and a tooltip when no visible text explains them;
- all functionality works from the keyboard and focus remains visible;
- dialogs receive and contain focus appropriately, close on Escape, and return focus;
- text and non-text contrast pass in light and dark themes;
- targets meet the framework's 48 by 48 dp guidance;
- reduced-motion behavior removes nonessential motion;
- hidden subtrees contain no focusable descendants.

Do not add a composite ARIA role that ExpressiveCSS withholds or rejects. A role promises a keyboard model; use WAI-ARIA APG to verify promised behavior, not to replace the framework's documented semantics.

**Complete when:** names, roles, states, keyboard operation, focus, contrast, targets, and motion have explicit evidence.

### 8. Verify every reachable layout and state

ExpressiveCSS window classes are:

| Class | Width | Grid prefix |
| --- | --- | --- |
| Compact | below 600 px | `.s` |
| Medium | 600–839 px | `.m` |
| Expanded | 840–1199 px | `.l` |
| Large | 1200–1599 px | `.xl` |
| Extra-large | 1600 px and above | `.xxl` |

Test immediately below and above every layout switch the feature reaches. Check one-pane Compact behavior, persistent navigation exclusivity, light and dark themes, OS-following mode, reduced motion, long content, zoom/reflow, and right-to-left layout where relevant. Confirm there are no console errors, missing fonts, duplicate instances, stale state, or broken ID relationships.

**Complete when:** every requested state and reachable boundary has been exercised with real output.

## Framework contribution path

When modifying ExpressiveCSS itself:

1. Read `CLAUDE.md` and the domain-specific README before editing.
2. Trace a class or API through docs, Sass or TypeScript, semantics, fixtures, and tests.
3. Add a focused regression test that is red on the reported defect.
4. Make the smallest source-of-truth change; regenerate derived files rather than editing them.
5. Run the focused test, then `npm run typecheck`, `npm run test`, and `npm run build`.
6. Run `npm run docs:build` for documentation or site changes, `npm run build:semantics` after changing `semantics.json`, and `npm run test:visual` for visual changes.

Tests use built bundles. `npm run test` rebuilds JavaScript and CSS before the jsdom suite; `npm run test:run` alone can test stale output. jsdom has no layout engine, so geometry-dependent tests must stub measurements and browser-level visual/accessibility checks remain separate.

## Guardrails

- Emit ExpressiveCSS names, not Materialize-era surfaces such as `M`, `.btn`, `.card-content`, `.nav-wrapper`, `.brand-logo`, `.modal`, `.lever`, or `.filled-in`.
- Use live role tokens rather than hard-coded brand colors or `-light` / `-dark` backing tokens.
- Keep one initialization owner per element.
- Keep one persistent peer-navigation pattern visible at each width.
- Use dialogs for blocking decisions, snackbars for ignorable status, and inline errors for form validation.
- Let switches apply immediately; use checkboxes when a later Save action is required.
- Keep Compact list-detail experiences to one active pane.
- Preserve shadow-root token anchors and portal locality.
- Treat exact-version documentation and source as authoritative over cached examples, including this skill.

## Verification checklist

- [ ] Exact ExpressiveCSS version identified
- [ ] Relevant design, implementation, and semantics contracts read
- [ ] Every framework class and API backed by the target version
- [ ] Native element and required child/ID relationships preserved
- [ ] One component per job and one persistent navigation pattern
- [ ] Live Material roles used; no hard-coded role colors
- [ ] Interactive components initialized once and destroyed cleanly
- [ ] Accessible names, roles, keyboard behavior, focus, contrast, targets, and motion checked
- [ ] Reachable window boundaries and themes exercised
- [ ] Relevant focused tests, typecheck, suite, build, docs, and visual checks pass

For the research and rationale behind these rules, read [`docs/agents/expressivecss-skill-research.md`](../../docs/agents/expressivecss-skill-research.md).
