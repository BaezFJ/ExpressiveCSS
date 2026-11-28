# Plan: move non-M3 components into `@expressivecss/extras`

Branch `refactor/extract-additional-components`. Approved at Gate 1 on 2026-11-27.

## Decisions

- **Reference list:** the 38 components in the m3.material.io sitemap (`/components/*`). If a page documents a component on that list, it stays in core. Foundations, panes and scaffold (M3 canonical layouts) and scroll area also stay in core.
- **Exceptions kept in core** (not M3, but common): data table (with the `DataTables` behavior), breadcrumbs, pagination, avatar, alert, accordion. Status bar also stays, because the core `.scaffold` places it.
- **Package:** `extras/` publishes `@expressivecss/extras`. Its peer dependency is `@expressivecss/expressive` `^0.21.0`. It is versioned and tagged on its own (`extras-vX.Y.Z`), as the MCP server is.
- **Migration:** a hard move in 0.21.0. The CHANGELOG migration note says to install `@expressivecss/extras` and load its CSS and JS after core.
- **Docs:** the same site. Moved pages go to a new "Additional components" nav group, and their routes do not change. Those pages load the extras CSS and JS too.
- **Skill:** a new `skills/expressivecss-extras/` covers the moved components. The `expressivecss` skill covers core only.

## Pages that move (docs page id)

back-to-top, aura, message, message_scroller, pull-to-refresh, swipe-actions, show_more, stat, description_list, kpi, countdown, line-chart, column-chart, bar-chart, pie-chart, heatmap-chart, radar-chart, radial-chart, mixed-chart, scatter-chart, funnel-chart, sankey-chart, treemap-chart, timeline, calendar, org-chart, popover, hover_card, tour, loading_overlay, skeleton, empty_state, image_compare, marquee, confetti, particles, media (lightbox), map, command_palette, input_mask, currency_input, rich_text_editor, drop_zone, tree_select, cascader, transfer_list, rating, color-swatches, color-picker, keypad, questionnaire, stepper, mega_menu, menubar, scrollspy (with table_of_contents), tree, footer.

Behaviors that move: `Tour`, `TransferList`, `ImageCompare`, and `Sortable` unless a core module imports it.

## Architecture

- **Core extension API.**
  - A new `@expressivecss/expressive/core` ESM subpath (`dist/js/core.mjs`) exports `Component`, `Utils`, the `FormControl` helpers, `Spring` and the other helpers extras import. It is built in the same code-split ESM build as `expressive` and `modular`, so the modules are the same instances.
  - The IIFE global exposes the same namespace as `Expressive.core`.
- **`AutoInit.register(name, entry)`** adds an entry to the AutoInit table. AutoInit, including `{ watch: true }`, then starts and destroys it like a built-in.
- **Extras source:**
  - TypeScript lives in `extras/src/ts/`, with `index.ts` (side effects: register and Init behaviors) and `modular.ts`.
  - Sass lives in `extras/src/sass/`, with `extras.scss`, `components/_index.scss` and `abstracts/_charts.scss` (the chart mixins taken out of core).
- **Extras imports core.** TypeScript uses `@expressivecss/expressive/core`, which is external in every extras build. The IIFE build maps it to `globalThis.Expressive.core`. Sass uses `@use "abstracts" as *` through a load path to core's `src/sass`.
- **Build output** goes to `extras/dist/`: `js/extras.mjs` with chunks, `js/extras.js` and `js/extras.min.js` (IIFE global `ExpressiveExtras`), `css/extras.css` and `.min.css`, and types. The root `npm run build` builds it. Extras ships no CommonJS, because a separate CJS bundle cannot share core's state.
- **Tests** stay in `tests/`. Helpers load the extras bundle after core.

## Phases (each ends green and committed)

1. **Infrastructure:**
   - the core subpath, the IIFE `core`, `AutoInit.register`
   - the extras skeleton and its build
   - test helpers, the empty "Additional components" nav group, and docs layout assets
   - generator and verify-site support for the group, and `verify-packages` for extras
2. **CSS-only components move:** the moved pages that have no TypeScript.
3. **Charts move**, along with the chart mixins and the chart names in `_cards.scss`.
4. **Interactive components and behaviors move.**
5. **Form extras move.**
6. **Skill, MCP and guidelines:**
   - `skills/expressivecss-extras`
   - generator split, MCP data, `llm.md`
   - section 10 of `m3-guidelines.md` and its "Not shipped" note
7. **Release:**
   - `release.mjs`, the CI and release workflows, `RELEASING.md`
   - the 0.21.0 bump and the CHANGELOG migration note

## Out of scope

- `expressive-build` (the CLI) selecting extras styles and chunks. Extras CSS is included whole for now.
- CommonJS output for extras.
