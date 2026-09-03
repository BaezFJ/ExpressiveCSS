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

ExpressiveCSS is a semantic HTML and Material Design 3 Expressive front-end framework. Use the target version's documentation as the contract; this skill organizes design and review, setup, usage, theming, runtime, accessibility, and component references.

## When to use this skill

Use this skill whenever a task involves `@expressivecss/expressive`, including:

- choosing or implementing components, navigation, feedback, forms, or adaptive layouts;
- designing, refining, hardening, or reviewing complete ExpressiveCSS surfaces and flows;
- authoring, reviewing, or repairing ExpressiveCSS HTML, JSX, templates, Sass, CSS, or JavaScript;
- installing the package, configuring themes, or initializing component behavior;
- checking ExpressiveCSS semantics, accessibility, or Material 3 conformance;
- contributing components, documentation, tests, or styles to ExpressiveCSS itself.

Do not use it for generic Material Design work in a project that does not use ExpressiveCSS.

## References that you must read

| Task | Guide | When to read it |
| --- | --- | --- |
| Install ExpressiveCSS | [expressivecss-install/SKILL.md](./expressivecss-install/SKILL.md) | When the target project does not already load the required package surfaces. |
| Design or review an interface | [expressivecss-design/SKILL.md](./expressivecss-design/SKILL.md) | Before implementing, refining, redesigning, critiquing, or auditing a surface or flow. |
| Use classes, markup, layout, or utilities | [expressivecss-usage/SKILL.md](./expressivecss-usage/SKILL.md) | Before writing ExpressiveCSS classes or component markup. |
| Use themes, tokens, or colors | [expressivecss-theming/SKILL.md](./expressivecss-theming/SKILL.md) | Before writing role colors, theme overrides, or custom component colors. |
| Use JavaScript behavior | [expressivecss-runtime/SKILL.md](./expressivecss-runtime/SKILL.md) | Before calling `AutoInit()`, `init()`, component methods, or teardown. |
| Check semantics and accessibility | [expressivecss-accessibility/SKILL.md](./expressivecss-accessibility/SKILL.md) | For every interface implementation or review. |
| Use a component | [components/](./components/) | Read every candidate component guide before choosing, then read the selected guide again while implementing it. |

## Component guides

### Structure and navigation

- [App bar](./components/app-bar.md)
- [Bottom app bar](./components/bottom-app-bar.md)
- [Navigation bar](./components/navigation-bar.md)
- [Navigation rail](./components/navigation-rail.md)
- [Navigation drawer](./components/navigation-drawer.md)
- [Panes](./components/panes.md)
- [Footer](./components/footer.md)
- [Tabs](./components/tabs.md)
- [Breadcrumbs](./components/breadcrumbs.md)
- [Pagination](./components/pagination.md)
- [Menu](./components/menu.md)
- [Scrollspy](./components/scrollspy.md)

### Actions, containment, and feedback

- [Buttons](./components/buttons.md)
- [Icon buttons](./components/icon-buttons.md)
- [Segmented buttons](./components/segmented-buttons.md)
- [Button groups](./components/button-groups.md)
- [Split button](./components/split-button.md)
- [Floating action button](./components/fab.md)
- [Cards](./components/cards.md)
- [Lists](./components/lists.md)
- [Dialogs](./components/dialogs.md)
- [Bottom sheet](./components/bottom-sheet.md)
- [Side sheet](./components/side-sheet.md)
- [Floating sheet](./components/floating-sheet.md)
- [Drag handle](./components/drag-handle.md)
- [Badges](./components/badges.md)
- [Tooltips](./components/tooltips.md)
- [Snackbar](./components/snackbar.md)
- [Banners](./components/banners.md)
- [Progress indicators](./components/progress.md)
- [Loading indicator](./components/loading-indicator.md)
- [Carousel](./components/carousel.md)
- [Lightbox](./components/lightbox.md)
- [Toolbars](./components/toolbars.md)
- [Search](./components/search.md)

### Forms

- [Fieldsets](./components/fieldsets.md)
- [Text fields](./components/text-fields.md)
- [Select](./components/select.md)
- [Checkboxes](./components/checkboxes.md)
- [Radio buttons](./components/radio-buttons.md)
- [Switches](./components/switches.md)
- [Slider](./components/slider.md)
- [Chips](./components/chips.md)
- [Autocomplete](./components/autocomplete.md)
- [Date picker](./components/date-picker.md)
- [Time picker](./components/time-picker.md)

## Component discovery protocol

Before writing ExpressiveCSS code:

1. Identify the requested function, behavior, content, and reachable window classes. Do not select from appearance or the user's exact noun alone.
2. Use the component list above and the chooser in [`m3-guidelines.md`](https://www.expressivecss.com/m3-guidelines.md) to identify every plausible candidate.
3. Read all candidate guides when the choice is ambiguous. Compare their jobs, native elements, adaptive behavior, and interaction models.
4. Select the smallest component or combination that fully matches the job. Define its next narrower layout before writing markup.
5. Read the selected component's full target-version documentation from the link in its guide.
6. Copy the documented host element, child structure, relationships, classes, and initialization mode. Apply every rule in the guide.

If the user names a component and a guide with that name exists, read that guide first. Still compare alternatives when the requested behavior does not match the named component.

## Authority by question

Identify the exact installed version from the target project's manifest and lockfile. In this repository, use `package.json` and `CHANGELOG.md`.

Use the source that owns the decision:

- **Design intent:** [`m3-guidelines.md`](https://www.expressivecss.com/m3-guidelines.md) for component choice, anatomy, placement, emphasis, and adaptive behavior.
- **Shipped contract:** [`llm.md`](https://www.expressivecss.com/llm.md) or the matching component page for elements, classes, tokens, options, methods, properties, and events.
- **Authored semantics:** the component row in [`semantics.json`](https://github.com/BaezFJ/ExpressiveCSS/blob/master/semantics.json); [`SEMANTICS.md`](https://www.expressivecss.com/SEMANTICS.md) is generated from it.
- **Runtime truth:** Sass, TypeScript, the registry, neighboring examples, and tests when contributing or resolving documentation drift.

These sources own different questions; do not use one domain to overrule another. If two sources disagree about the same question, the live Material specification wins for design intent, `semantics.json` wins for authored semantics, and the installed ExpressiveCSS version wins for shipped behavior. Report the disagreement instead of silently combining incompatible contracts.

Outside this repository, start from [llms.txt](https://www.expressivecss.com/llms.txt), [llm.md](https://www.expressivecss.com/llm.md), and [m3-guidelines.md](https://www.expressivecss.com/m3-guidelines.md). The public site describes the current release. For an older installed version, inspect the files in the installed package and the matching repository tag or commit before using current documentation. State when matching version documentation is unavailable.

## Framework contribution path

When modifying ExpressiveCSS itself, read `CLAUDE.md` and the domain-specific README before editing. Trace the affected surface through documentation, Sass or TypeScript, semantics, fixtures, and tests. Add a focused regression test, change the source of truth, regenerate derived files, then run the focused test and every applicable typecheck, suite, build, docs, semantics, and visual check.

The component guides are generated from the documentation catalogue, `llm.md`, and `semantics.json`. After any of those contracts changes, run `terminal(command="npm run build:skill", timeout=600)` and commit the generated guide updates.

For the research and rationale behind these rules, read [`docs/agents/expressivecss-skill-research.md`](https://github.com/BaezFJ/ExpressiveCSS/blob/master/docs/agents/expressivecss-skill-research.md).