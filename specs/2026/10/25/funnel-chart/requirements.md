# Funnel chart

Date: 2026-10-25
Roadmap phase: Phase 49, funnel chart
Branch: `feature/2026-10-25-funnel-chart`
Base: `origin/master` at `a9bbf77ad`, fetched 2026-10-25
Status: implemented 2026-10-25; merged as #431

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 49](../../../../roadmap.md#phase-49-funnel-chart). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked phase 49. Phases 42 to 51 are being specified in parallel threads, so this spec skips the usual pick of the earliest unfinished phase. Phase 49 has no dependencies. The treemap (phase 50) and sankey (phase 51) charts are specified at the same time, so this spec plans no shared chart refactor that they would depend on.

## Current behavior

These facts come from the base commit.

- No chart draws a funnel. Every chart in `src/ts/components/` extends `LineChart`: `ColumnChart`, `BarChart`, `MixedChart`, `PieChart`, `RadarChart`, `RadialChart`, `HeatmapChart` and `ScatterChart`.
- `LineChart._read()` takes the first cell of each body row as its label and each later header cell as one series. `cellValue()` reads `data-value` before the cell text, and `numberValue()` accepts currency and percent signs, grouping commas and a typographic minus around one number. Anything else is a gap (`null`).
- `LineChart` exposes protected hooks for subclasses: `_type`, `_horizontal`, `_axis`, `_points`, `_count`, `_draw()`, `_guides()`, `_place()`, `_indexAt()` and `_keyTarget()`. With `_horizontal` true, rows run down the plot, ArrowDown and ArrowUp move between them in both directions, and the pointer picks the row band under it by its vertical position.
- The plot is one tab stop with `role="group"`, `aria-roledescription` from the chart type and the figcaption as its name. Keyboard focus shows row 0, Home, End and Escape move or hide the highlighted row, and an `aria-live="polite"` tooltip names the row and each series' cell text.
- `update()` redraws from the table, keeps focus and the highlighted index, and fills `_before` with the old series so marks can move from their old values. `data-watch` or the `watch` option redraws on table changes.
- `BarChart` draws rows as bands with the row label at the inline start, in a grid whose label column is at most 40% of the width. Its bars are full-width spans clipped to their value, and `chart-column-motion` moves the clip from `--from-top` and `--from-bottom` with `@starting-style`, unless the reader prefers reduced motion.
- `PieChart` reads only the first value column for its marks, shows further columns in the tooltip, and appends a share of the whole to the tooltip's value text through `numberFormat()` with `style: 'percent'`: whole percentages, with one decimal below 10%.
- `ScatterChart` (phase 34) is the most recent chart and shows where a new component is registered: `registry.ts`, `index.ts`, `src/ts/modular.ts`, the Sass index, `semantics.json`, `tests/fixtures.js`, the `$_media-figure` list in `_cards.scss` and its regexes in `tests/cards.test.js`, a docs page, `docs/src/data/nav.ts`, `docs/src/pages/auto-init.astro`, the component decisions data, the hand-written `web-extensions-review.md` entry, and the guide counts in the skill tests.

## Scope

A `<figure class="funnel-chart">` draws each table row as a stage whose width follows its value, centered and stacked top to bottom in table order. It follows the other charts for the source table, tooltip, keyboard focus, `update()` and `data-watch`.

### Expected behavior

- **R1.** `AutoInit()` starts `FunnelChart` on `.funnel-chart`, registered like the other charts. The `<figcaption>` and `<table>` take the same markup as a bar chart, and the table stays in the page, visually hidden, as the text alternative and the no-JavaScript fallback.
- **R2.** Each body row draws one stage from its first value column, in table order from the top of the plot down. A stage's width is its value divided by the largest value in that column, times the plot's width, so the largest stage fills the plot. Each stage is centered on the plot's middle, in left-to-right and right-to-left pages alike.
- **R3.** A row whose first value cell is not a number, or is zero or negative, draws no stage but keeps its place and its label. Such rows do not count toward the largest value. A table whose value cells hold no number at all draws no chart, so the table stays visible, as for every chart; one whose numbers are all zero or below draws the plot with no stages. None of these throw.
- **R4.** Each row's label sits beside its stage at the inline start, as bar chart labels do, so it moves to the right side in a right-to-left page.
- **R5.** Every stage takes the first series color, `--md-comp-funnel-chart-color-1`. The chart shows no legend, even with more than one value column.
- **R6.** The live tooltip shows the row label, the first value column's header and cell text, and after that text the stage's value as a percentage of the first row's value, such as "(25%)". The percentage uses `numberFormat()` with the page's language, in whole percentages with one decimal below 10%, as the pie chart's share does. It is left out when the row draws no stage or the first row's value is not positive. A cell that is not a number is left out of the tooltip, as in every chart. Each further value column adds its header and cell text without a percentage.
- **R7.** The plot stays one tab stop with `aria-roledescription="funnel chart"` and the caption as its name. Keyboard focus highlights the first row. ArrowDown moves to the next row and ArrowUp to the previous one in both directions, Home and End go to the first and last row, and Escape hides the highlight. Rows R3 leaves without a stage stay reachable, so the tooltip still reports their other cells.
- **R8.** A pointer over the plot highlights the row whose band is under it. A touch tap does the same, and the highlight stays until the plot blurs, as in the other charts.
- **R9.** `update()` redraws from the changed table, keeps focus on the plot and keeps the highlighted index while the table still has that row. Each stage changes from its old width to its new one, and a stage new to the chart grows from zero width. Under `prefers-reduced-motion: reduce` the stages take their new widths without motion. `data-watch` and the `watch` option redraw on table changes, as for every chart.
- **R10.** Markup that does not use `.funnel-chart` renders and behaves exactly as on the base commit. Any `LineChart` member made reachable for the subclass keeps its behavior for the other charts.
- **R11.** `semantics.json` has a rule that `.funnel-chart` is a `<figure>` holding a `<table>`, worded like the scatter chart's, and `npm run build:semantics` regenerates `SEMANTICS.md`.
- **R12.** `llm.md` has a "Funnel chart" section with an example, the table shape, gaps, the percentage in the tooltip, keys and the CSS custom properties, and its two AutoInit tables list the component. The docs site has a funnel chart page in the nav and in `auto-init.astro`, the component decisions data lists it, `web-extensions-review.md` has its entry, `_cards.scss` and `tests/cards.test.js` exclude it from card media figures, the changelog's Unreleased section has an Added entry, and `npm run build:skill` regenerates the derived files.
- **R13.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, and the capability roadmap pins the new component to a `sourceRevision`.

### Exclusions

- Tapered or trapezoid stages, and a color per row. The user chose plain centered bars in one color.
- A horizontal funnel, where stages run along the inline axis.
- Percentages of the previous stage, step conversion rates, and `.values` text drawn on the stages.
- A legend, `.toggle`, `.stacked`, `.axis`, `.sparkline`, `data-min`, `data-max`, `data-other` and a `<tfoot>` total.
- Sorting the rows. Stages follow table order even when a later value is larger.
- Shared chart refactors, such as a common base for single-column charts. Phases 50 and 51 run in parallel and must not depend on this phase.
- Manual visual and screen reader checks. The user left them out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-25

- `FunnelChart` subclasses `LineChart`, as `PieChart` and `ScatterChart` do, with its own `_draw()`. It inherits `update()`, `data-watch`, the tooltip and the keyboard handling, and touches no shared chart code beyond making a member protected. The user chose this over subclassing `BarChart` and over a `.bar-chart.funnel` modifier.
- Stages are centered rounded rectangles in one color, sized from the first value column, with row labels beside them. The tooltip adds each stage's percentage of the first stage, and further columns show only in the tooltip. The user chose this over tapered stages with row colors, and over a tooltip with cell text only.
- The merge checks are the roadmap's width acceptance test in Chromium, Firefox and WebKit, one short case each for keyboard, pointer, tooltip text, `update()` and `data-watch` in the same file, and the regression suites: the related chart browser files one at a time, then `npm run verify`, the MCP tests and `npm run verify:packages`.

### Changed during implementation

- An all-gap table draws no chart rather than empty rows, because `LineChart` renders nothing for a table without numbers and the visible table is the better fallback. R3 and V2 say so.
- The tooltip leaves a gap cell out, as `LineChart.show()` does for every chart, instead of reporting "n/a". R6, R7 and V6 say so.

### Proposals for implementation

These were the plan; the code follows them unless noted above.

- Read with the inherited `_read()`. Set `_horizontal` to true so rows run down the plot and the inherited keys and pointer hit testing apply, `_axis` to false and `_points` to false. Override `_guides()` to return the row labels without the legend.
- Draw each stage as an HTML `<span>` in a `funnel-chart-stages` container with `aria-hidden="true"`, one row element per table row. Set the span's `--width` custom property to its percentage and size it with `inline-size: calc(var(--width) * 1%)` and `margin-inline: auto`, so the acceptance test can read each stage's box width directly.
- On `update()`, write `--from-width` from `_before`, and let a `funnel-chart-motion` rule start the width there with `@starting-style` under `prefers-reduced-motion: no-preference`, as `chart-column-motion` does for columns. A funnel has a handful of rows, so transitioning `inline-size` costs little layout.
- Override `show()` to append the percentage to the first value's tooltip text, as `PieChart.show()` appends its share, and `_place()` to put the tooltip beside the highlighted row.
- Sass in `src/sass/components/_funnel-chart.scss`, using the `chart("funnel-chart")` mixin and the bar chart's grid with a label column. Tokens: `--md-comp-funnel-chart-row-height` (`rem(40px)`), `--md-comp-funnel-chart-stage-height` (60% of the row) and `--md-comp-funnel-chart-shape` (extra-small corner). Boxes that hold text follow the rem sizing rule.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work follows `src/sass/README.md`. `components/` imports from `core/`, never the reverse.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency. `Intl.NumberFormat` through `numberFormat()` formats the percentage.

## Dependencies

- None from the roadmap. The `LineChart` behavior it inherits (`update()`, `data-watch`, tooltip and keyboard) shipped in phases 22 and 23 and earlier work.
- Phases 50 and 51 add charts to the same registration lists, guide counts, changelog and capability roadmap. Those edits conflict as text when the branches merge. Whichever merges later takes master's side and re-adds its own entries, then runs `npm run build:skill`. No code in this phase depends on theirs, or theirs on this one.
