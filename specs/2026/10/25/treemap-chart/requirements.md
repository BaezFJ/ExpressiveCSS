# Treemap chart

Date: 2026-10-25
Roadmap phase: Phase 50, treemap chart
Branch: `feature/2026-10-25-treemap-chart`
Base: `origin/master` at `a9bbf77ad`
Status: specified 2026-10-25; not implemented

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 50](../../../../roadmap.md#phase-50-treemap-chart). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked phase 50. Phases 42 to 51 are being specified in parallel threads, so this spec skips the earliest-unfinished-phase rule and covers phase 50 only. The roadmap gives it no dependencies.

## Current behavior

These facts come from the base commit.

- No chart shows parts of a whole as areas. `PieChart` shows them as slices, and the other charts in `src/ts/components/` (`LineChart`, `ColumnChart`, `BarChart`, `MixedChart`, `RadarChart`, `RadialChart`, `HeatmapChart`, `ScatterChart`) all extend `LineChart`.
- `PieChart` is the closest model. It overrides `_type`, `_axis`, `_points`, `_read()`, `show()`, `_place()`, `_guides()`, `_indexAt()` and `_draw()`. It reads the first value column, clamps each value at zero, draws no slice for a zero, negative or non-numeric cell, and colors drawn slices from six `--md-comp-pie-chart-color-*` tokens in table order. Its tooltip adds the row's share of the whole as a percentage in the page's `lang`.
- `LineChart._read()` takes the first cell of each body row as its label and each later header cell as a series. `cellValue()` reads `data-value` before the cell text, and `numberValue()` accepts currency and percent signs, grouping commas and a typographic minus around one number.
- The plot is one tab stop with `role="group"`, `aria-roledescription` from `_type` and the figcaption as its name. Keyboard focus shows row 0. `_keyTarget()` maps the arrows, Home, End and Escape through `_arrows`, which swaps left and right in a right-to-left chart unless the chart is circular or horizontal. The live tooltip shows the row label, then each series name with its cell text.
- `update()` redraws from the table, keeps focus and the highlighted index, and lets subclasses that read `_before` animate. `PieChart` does not animate. `data-watch` or the `watch` option redraws on table changes.
- `HeatmapChart` draws its marks as HTML elements placed with custom properties, and keeps its own cell list for `show()`. `ScatterChart` overrides `_count` and `_keyTarget()` for marks that are not rows.
- The `chart()` mixin in `src/sass/abstracts/_mixins.scss` writes the plot, cursor, tooltip, labels and legend styles and the `--md-comp-<name>-height` token (240px), and hides the table once the plot exists. `_cards.scss` lists every chart class in `$_media-figure`.

## Scope

A `<figure class="treemap-chart">` draws each table row as a rectangle whose area follows its value, filling the plot. It follows the pie chart for the table, colors, tooltip, `update()` and `data-watch`, and the other charts for keyboard focus.

### Expected behavior

- **R1.** `AutoInit()` starts `TreemapChart` on `.treemap-chart`, registered like the other charts. The `<figcaption>` and `<table>` take the same markup as a pie chart, and the table stays in the page, visually hidden, as the text alternative and the no-JavaScript fallback.
- **R2.** The first header cell heads the row labels and the first value column holds the values, read as `cellValue()` reads cells. Each row with a positive value draws one rectangle. Its area divided by the plot's area equals its value divided by the sum of the positive values. The rectangles lie inside the plot, do not overlap, and together cover it.
- **R3.** A row whose value is zero, negative or not a number draws no rectangle and adds nothing to the sum. Nothing throws, and the other rectangles keep the areas R2 gives them. Further value columns draw nothing and add lines to the tooltip, as in the pie chart.
- **R4.** The layout is squarified. Rows are placed from the largest value to the smallest, equal values in table order, and each strip of rectangles is chosen to keep them close to square for the plot's shape. The largest rectangle starts at the plot's top inline-start corner, so a right-to-left page mirrors the layout across the vertical middle.
- **R5.** Each drawn rectangle takes one of six colors in table order through `data-series`, set by `--md-comp-treemap-chart-color-1` to `-6` with matching on-colors for its text. A gap set by `--md-comp-treemap-chart-gap` separates neighbors and is drawn inside each rectangle's box, so the boxes still cover the plot as R2 says. Under `forced-colors: active` every rectangle keeps a visible edge in a system color.
- **R6.** A rectangle shows its row name and its cell text, as the author wrote it, in its on-color, when both fit inside it. A rectangle too small to hold them shows neither. Text never spills past its rectangle.
- **R7.** The plot stays one tab stop with `aria-roledescription="treemap chart"` and the caption as its name. Keyboard focus highlights the first row that has a rectangle. ArrowRight and ArrowDown move to the next such row and ArrowLeft and ArrowUp to the previous one, in table order, without wrapping and without swapping in right-to-left pages, because table order is not a direction on screen. Home and End go to the first and last drawn row, and Escape hides the highlight.
- **R8.** A pointer over the plot highlights the rectangle under it. A touch tap does the same, and the highlight stays until the plot blurs, as in the other charts. Leaving the plot hides it.
- **R9.** The highlighted rectangle gets a visible outline. The live tooltip shows the row label, the value column's header with the cell text and the row's share of the whole, as the pie chart writes shares, and a line for each further value column. It sits beside the rectangle inside the plot.
- **R10.** `update()` redraws from the changed table, keeps focus on the plot, and keeps the highlighted row while the table still has it and it still has a rectangle. Rectangles take their new places without animation, as the pie chart's slices do. `data-watch` and the `watch` option redraw on table changes.
- **R11.** Markup that does not use `.treemap-chart` renders and behaves exactly as on the base commit. Any `LineChart` member made reachable for the subclass keeps its behavior for the other charts.
- **R12.** `semantics.json` has rules that `.treemap-chart` is a `<figure>` holding a `<table>` and has a `<figcaption>`, worded like the pie chart's, and `npm run build:semantics` regenerates `SEMANTICS.md`.
- **R13.** `llm.md` has a "Treemap chart" section with an example, the table shape, gaps, layout, text fitting, keys, tooltip and tokens. The docs site has a treemap chart page in the nav, both AutoInit tables in `llm.md` and `docs/src/pages/auto-init.astro` list it, the component decisions data and the web extensions review list it, the changelog's Unreleased section has an Added entry, and `npm run build:skill` regenerates the derived files.
- **R14.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, the capability roadmap pins the new component to a `sourceRevision`, and `$_media-figure` in `_cards.scss` excludes `.treemap-chart` like the other charts.

### Exclusions

- Nested treemaps: a parent column, group regions or a second keyboard level.
- Other layouts, such as slice-and-dice or ordered strips that follow table order.
- Pie chart extras: `data-other` grouping, a row legend, a `<tfoot>` total, `.donut`, `.values`, `.labels` and `.sparkline`. Colors repeat after six rows, so a legend could not tell rectangles apart, and the tooltip names each one.
- `.axis`, the `min` and `max` options, and any value scale.
- Animated movement on `update()`.
- Zoom, drill-down and pan.
- Shared chart refactors. Phases 49 (funnel) and 51 (sankey) are specified in parallel and must not depend on this phase's code.
- A manual screen reader or visual check. The user left them out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-25

- Squarified layout with flat rows, one value column. The user chose it over ordered strips in table order, which keep position but give thin rectangles, and over one parent level, which needs a second table shape and keyboard level and does not fit one session.
- Zero, negative and non-numeric rows draw nothing, as in the pie chart, and the keyboard follows table order.
- `TreemapChart` subclasses `LineChart` the way `PieChart` does, with no shared chart refactor.
- Four task groups: layout and the area check, then colors and text, then interaction and `update()`, then docs and repository checks.
- Merge needs the roadmap's area check, short regression cases for each behavior, and the repository checks. No manual checks.

### Proposals for implementation

These are open to change in review.

- Drawing: one absolutely placed HTML element per drawn row inside a `treemap-chart-boxes` container, with its left, top, width and height as percentages of the plot, as `HeatmapChart` places its cells. HTML holds wrapped text more easily than SVG.
- Layout: a pure `squarify(values, width, height)` helper in `treemapChart.ts` that returns fractions of the plot, fed the plot's aspect ratio from the figure's width and `--md-comp-treemap-chart-height` at draw time. A later resize keeps the percentages, so areas stay proportional while the shapes drift from square. That is a known ceiling worth a `ponytail:` comment, upgraded by redrawing from a `ResizeObserver` if narrow screens need it.
- Gap: a transparent border of `--md-comp-treemap-chart-gap` on each rectangle with `background-clip: padding-box`, so its box is its layout area. Rectangles touching the plot's edge keep the border too, which keeps every area exact.
- Text fitting: each rectangle is a size container, and a container query hides its text below a minimum width and height in `rem()`. No script measures text.
- Colors: the treemap partial defines its own six color and on-color tokens with the pie chart's values, including its `color-mix()` for colors 5 and 6, instead of sharing a pie token.
- Row numbering: `_count` stays the number of rows, and `show()`, `_indexAt()` and `_keyTarget()` skip rows without a rectangle. `_place()` puts the tooltip beside the rectangle and opens it back over the plot past the middle, as the pie chart does.
- Share text: a small percent formatter in the treemap, written like the pie chart's private `_share()`, rather than making the pie's helper shared.
- If a `LineChart` member the subclass needs is private, make it protected without changing what it does.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work follows `src/sass/README.md`. `components/` imports from `core/`, never the reverse.
- Text-holding boxes are sized in `rem()`; borders and gaps stay in pixels.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency. `Intl.NumberFormat` through `numberFormat()` formats shares.

## Dependencies

- None from the roadmap. The `LineChart` behavior it inherits (`update()`, `data-watch`, the single tab stop) already shipped.
- Phases 49 and 51 add charts in parallel and edit the same shared lists: the AutoInit fixture count, `$_media-figure`, `tests/cards.test.js`, the guide counts in the skill tests, the budget lines and the capability `sourceRevision`. Whichever branch merges second rebases and resolves those counts.
