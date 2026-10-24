# Scatter chart

Date: 2026-10-24
Roadmap phase: Phase 34, scatter chart
Branch: `feature/2026-10-24-scatter-chart`
Base: `origin/master` at `733d58c98`, fetched 2026-10-24
Status: implemented 2026-10-24; merged as #416

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 34](../../../../roadmap.md#phase-34-scatter-chart). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 25 to 33 merged by 2026-10-24 as #406 to #411 and #413 to #415, although the roadmap does not yet mark them complete. Phase 34 is the first unfinished phase and has no dependencies. Phase 35, bubble sizes, depends on it.

## Current behavior

These facts come from the base commit.

- No chart plots one measure against another. Every chart in `src/ts/components/` reads its `<table>` as rows of a category axis: `LineChart` places row `i` in the middle of an equal band (`_x(index)`), and `ColumnChart`, `BarChart`, `MixedChart`, `PieChart`, `RadarChart`, `RadialChart` and `HeatmapChart` all extend `LineChart`.
- `LineChart._read()` takes the first cell of each body row as its label and each later header cell as one series. `cellValue()` reads `data-value` before the cell text, and `numberValue()` accepts currency and percent signs, grouping commas and a typographic minus around one number. Anything else is a gap (`null`).
- `LineChart._scale()` pads the data range by 10%, `data-min` and `data-max` (or the `min` and `max` options) fix the y ends, and with `.axis` `_fit()` widens unfixed ends to a round step from `niceStep()` and lists the ticks. Only a y value axis exists; the x side shows row labels.
- The plot is one tab stop with `role="group"`, `aria-roledescription` from the chart type and the figcaption as its name. Keyboard focus shows row 0; the arrow keys, Home, End and Escape move or hide the highlighted row, and an `aria-live="polite"` tooltip names the row and each series' cell text. The pointer picks the row under it.
- `update()` redraws from the table, keeps focus and the highlighted index, and morphs each SVG path from its old shape unless the reader prefers reduced motion. `data-watch` or the `watch` option redraws on table changes. A `.toggle` legend hides and shows series and refits the scale, and never hides the last series with data.
- `.points` draws a line chart's values as round caps on zero-length paths, so CSS sizes the dots in pixels under the plot's `preserveAspectRatio="none"` scaling.
- `HeatmapChart` shows the subclass pattern: it overrides `_type`, `_axis`, `_count`, `show()` and the drawing, and its commit made a few `LineChart` members reachable from a subclass. Registration touches `src/ts/components/registry.ts`, `index.ts` and `src/ts/modular.ts`, the Sass index, `semantics.json`, `tests/fixtures.js`, a docs page, `docs/src/data/nav.ts` and the component decisions data.

## Scope

A `<figure class="scatter-chart">` plots each table row as a point from two numeric columns, and follows the other charts for the source table, `update()`, `data-watch`, legend toggling, tooltips and keyboard focus.

### Expected behavior

- **R1.** `AutoInit()` starts `ScatterChart` on `.scatter-chart`, registered like the other charts. The `<figcaption>` and `<table>` take the same markup as a line chart, and the table stays in the page, visually hidden, as the text alternative and the no-JavaScript fallback.
- **R2.** The first header cell heads the row labels. The second column holds each row's x value, and its header names the x axis. Each later column is one y series, named by its header cell. Each body row draws one point per series at its x and y value, read as `cellValue()` reads cells.
- **R3.** A row whose x cell is not a number draws no points. A y cell that is not a number draws no point for that series in that row. Neither throws, and the other points stay where their values put them.
- **R4.** Both scales fit the points shown, with the line chart's 10% padding. `data-min` and `data-max`, or the `min` and `max` options, fix the y ends. `data-x-min` and `data-x-max`, or new `xMin` and `xMax` options, fix the x ends. With `.axis`, both scales widen unfixed ends to a round step and label their ticks: y labels at the inline start as today, x labels below the plot, each repeating its column's currency or percent signs as the y axis does.
- **R5.** x grows toward the inline end, so in a right-to-left page it runs leftward, as line chart rows do. y grows upward in both directions.
- **R6.** Each series takes its `data-series` color by column, more than one series shows the legend, and a `.toggle` legend hides and shows a series' points and refits both scales. The last series with data cannot be hidden.
- **R7.** The plot stays one tab stop with `aria-roledescription="scatter chart"` and the caption as its name. Keyboard focus highlights the first point. ArrowRight and ArrowDown move to the next point and ArrowLeft and ArrowUp to the previous one, in table order: row by row, and within a row by series column, skipping points R3 leaves out. Home and End go to the first and last point, and Escape hides the highlight.
- **R8.** A pointer over the plot highlights the point nearest to it on screen. A touch tap does the same, and the highlight stays until the plot blurs, as in the line chart.
- **R9.** The highlighted point gets a visible marker, and the live tooltip shows the row label, the x header with the x cell text, and the series name with the y cell text, as the author wrote them.
- **R10.** `update()` redraws from the changed table, keeps focus on the plot or the same legend button, and keeps the highlighted index while the table still has it. Points move from their old positions to their new ones, and without motion under `prefers-reduced-motion: reduce`. `data-watch` and the `watch` option redraw on table changes, as for every chart.
- **R11.** Markup that does not use `.scatter-chart` renders and behaves exactly as on the base commit. Any `LineChart` member made reachable for the subclass keeps its behavior for the other charts.
- **R12.** `semantics.json` has a rule that `.scatter-chart` is a `<figure>` holding a `<table>`, worded like the heatmap's, and `npm run build:semantics` regenerates `SEMANTICS.md`.
- **R13.** `llm.md` has a "Scatter chart" section with an example, the table shape, gaps, both scales and their attributes, keys, tooltip and the CSS custom properties. The docs site has a scatter chart page in the nav, the component decisions data lists it, the changelog's Unreleased section has an Added entry, and `npm run build:skill` regenerates the derived files.
- **R14.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, and the capability roadmap pins the new component to a `sourceRevision`.

### Exclusions

- Bubble sizes from a third value column. That is phase 35.
- A separate x column per series, or a long-format series name column. Series that need different x values put them in separate rows with empty cells.
- Lines or trend lines between points, `.stacked`, `.straight`, `.values` text on points, `.sparkline` and a `<tfoot>` total.
- Logarithmic or time scales, zoom and pan.
- A tab stop per point. The plot keeps the single tab stop every chart has, and the roadmap's "one focusable point per row" is read as every point being reachable by keyboard from it.
- A manual screen reader or visual check. The user left them out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-24

- `ScatterChart` subclasses `LineChart`, as `HeatmapChart` does, so it inherits `update()`, `data-watch`, the `.toggle` legend and focus keeping. The user chose this over a standalone component and over a numeric x mode inside `LineChart`. This answers the roadmap's open question of how much line chart code it reuses.
- The table uses one shared x column, the first value column, and each later column is a y series. The user chose this over a column pair per series and over a series name column.
- The point placement browser test, the roadmap's completion check, is the acceptance check. Keyboard, pointer, tooltip, `update()`, `data-watch` and toggle behavior stay in scope, each covered by one short case in the same browser test file. Those cases count as regression checks, not a full matrix.

### Proposals for implementation

These are open to change in review.

- Reading: override `_read()` to take column 1 as x, keep the `Series` records for the later columns with `column` numbering unchanged so legend toggling and colors work, and store the x values, text and affix on the chart. The y scale reuses `_scale()`; the x scale reuses `_fit()` and the same padding.
- Drawing: one SVG group per series with the line chart's zero-length round-cap paths, one subpath per point, so CSS sizes points in pixels and `morph()` can move them on `update()`. Point order inside the path follows the table, so the morph pairs each row with itself.
- Point numbering: `_count` is the number of drawn points, and an index maps to a row and series. `show()`, `_indexAt()` and `_keyTarget()` are overridden; `_keyTarget()` keeps the line chart's Escape rule. The arrows do not swap in right-to-left pages, because table order is not a direction on screen.
- Hit testing: nearest point by pixel distance from the plot's bounding box, with no radius limit, as the line chart picks a row anywhere on the plot.
- The x axis is an `<ol>` like `_valueAxis()`, with each label placed by an inline-start custom property, and `.axis` draws vertical grid lines at its ticks.
- Sass in `src/sass/components/_scatter-chart.scss`, with `--md-comp-scatter-chart-point-size` and the line chart's series color tokens. Point and marker boxes follow the rem sizing rule.
- If a `LineChart` member the subclass needs is private, make it protected without changing what it does, as the heatmap commit did.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work follows `src/sass/README.md`. `components/` imports from `core/`, never the reverse.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency. `Intl.NumberFormat` through `numberFormat()` formats the axis labels.

## Dependencies

- None from the roadmap. The `LineChart` features it inherits (`update()` transitions, `data-watch`, `.toggle`) shipped in phases 22 and 23 and earlier work.
- Phase 35, bubble sizes, builds on R2's table shape and the point drawing.
