---
name: expressivecss-extras
description: "Builds and reviews @expressivecss/extras components, which sit outside the Material 3 set: charts, dashboard KPI and stat tiles, timeline, calendar, command palette, rich text editor, map, tour, popover, skeleton, stepper, tree, rating, color picker and input masks. Use with the expressivecss skill."
license: MIT
metadata:
  author: BaezFJ
  version: "0.1.0"
  homepage: https://www.expressivecss.com
  repository: https://github.com/BaezFJ/ExpressiveCSS
  platforms: linux, macos, windows
  tags: expressivecss, extras, charts, components, accessibility
---

# ExpressiveCSS extras

`@expressivecss/extras` holds the ExpressiveCSS components that are not on Material 3 Expressive's component list: charts, data display, chat surfaces, overlays, effects, maps and advanced form inputs. It builds on `@expressivecss/expressive` (core) and needs the same minor version. Core keeps every Material 3 component plus data table, breadcrumbs, pagination, avatar, alert, accordion and status bar.

This skill adds component guides and a charts guide only. The sibling `expressivecss` skill (`../expressivecss/SKILL.md`) still owns the workflow: version resolution, design rules, Usage, Theming, Runtime, Accessibility and the static checks. Read its routing first and apply its Material 3 rules to every extras component; an extra never replaces a Material component that does the same job.

## Install and load order

```sh
npm i @expressivecss/expressive @expressivecss/extras
```

Load core first, then extras, for both CSS and JavaScript:

```html
<link rel="stylesheet" href="node_modules/@expressivecss/expressive/dist/css/expressive.min.css">
<link rel="stylesheet" href="node_modules/@expressivecss/extras/dist/css/extras.min.css">

<script src="node_modules/@expressivecss/expressive/dist/js/expressive.min.js"></script>
<script src="node_modules/@expressivecss/extras/dist/js/extras.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => Expressive.AutoInit());
</script>
```

- The IIFE bundle exposes its classes as `ExpressiveExtras` (for example `ExpressiveExtras.LineChart`) and throws if core's script has not loaded.
- With a bundler, import core then extras: `import '@expressivecss/expressive/css'; import '@expressivecss/extras/css';` and `import { AutoInit } from '@expressivecss/expressive'; import { LineChart } from '@expressivecss/extras';`. Importing `@expressivecss/extras` registers its components with core.
- `@expressivecss/extras/modular` has no side effects; initialize each component yourself, as with core's modular entry.
- Sass: put core's `src/sass` on the load path, compile `@expressivecss/extras/scss` (`src/sass/extras.scss`), and load core's CSS first.
- Core `AutoInit()`, including `{ watch: true }`, starts and destroys extras components once extras is loaded. Do not call both `AutoInit()` and `init()` on one element.

When a project uses an extras class but lacks the package or loads it before core, report that first; the markup cannot work without it.

## Component routing

The generated [component decision index](./references/component-decisions.md) owns the inventory, selection boundaries, alternatives and runtime ownership. The [API index](./references/api-index.md) maps extras exports and Sass partials to guides. Each `components/<slug>.md` guide holds the syntax, options, methods and `semantics.json` rule IDs. Open the guide by slug when the user names the component; otherwise search the index for the job's terms.

| Need | Guides |
| --- | --- |
| Charts and sparklines | [charts sub-skill](./expressivecss-charts/SKILL.md) first, then `line-chart`, `column-chart`, `bar-chart`, `pie-chart`, `heatmap-chart`, `radar-chart`, `radial-chart`, `mixed-chart`, `scatter-chart`, `funnel-chart`, `sankey-chart`, `treemap-chart` |
| Key figures and records | `stat`, `kpi`, `description-list`, `countdown`, `timeline`, `calendar`, `org-chart` |
| Site and app navigation | `footer`, `stepper`, `mega-menu`, `menubar`, `tree`, `scrollspy` (with table of contents), `back-to-top` |
| Chat and touch | `message`, `message-scroller`, `pull-to-refresh`, `swipe-actions`, `show-more` |
| Overlays and loading | `popover`, `hover-card`, `tour`, `loading-overlay`, `skeleton`, `empty-state` |
| Media and effects | `lightbox`, `image-compare`, `marquee`, `aura`, `confetti`, `particles`, `map` |
| Commands and advanced input | `command-palette`, `input-mask`, `currency-input`, `rich-text-editor`, `drop-zone`, `tree-select`, `cascader`, `transfer-list`, `rating`, `color-swatches`, `color-picker`, `keypad`, `questionnaire` |

For a whole dashboard or reporting page, use the core skill's Dashboard guide; it composes these charts and tiles with core cards, tables and navigation.

`map` (MapLibre) and `rich-text-editor` (Tiptap) are `manual`: create them from script as their guides show. Support gaps live in the [capability roadmap](./references/capability-roadmap.md); read only the component's section.

## Rules that still apply

- Choose the Material 3 component first with the core skill's design rules. Use an extra only for a job no core component covers.
- Use color roles, sentence case, native HTML, accessible names and the 48 dp target recommendation, as for core.
- Pin extras to the same minor version as core. Resolve the installed core version with the core skill's resolver; the guides' contract line names the core contract they were generated from.
- Run the core skill's static checks on every markup file you touch.
