# Bubble sizes on the scatter chart

Date: 2026-10-24
Roadmap phase: Phase 35, bubble sizes on the scatter chart
Branch: `feature/2026-10-24-bubble-sizes`
Base: `origin/master` at `613543a71`, fetched 2026-10-24
Status: implemented 2026-10-24; merged as #418

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 35](../../../../roadmap.md#phase-35-bubble-sizes-on-the-scatter-chart). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 25 to 34 merged by 2026-10-24 as #406 to #411 and #413 to #416, and #417 marked them complete in the roadmap the same day. Phase 35 is the first unfinished phase. Its one dependency, Phase 34, merged as #416 (`613543a71`), and its [spec](../scatter-chart/) lists bubble sizes as an exclusion left to this phase.

## Current behavior

These facts come from the base commit.

- `ScatterChart` in `src/ts/components/scatterChart.ts` extends `LineChart`. The first header cell heads the row labels, column 1 holds each row's x value, and `_seriesFrom` returns 2, so `LineChart._read()` makes every later column a y series with `header.slice(from)`. Nothing ends the series before the last column.
- `_arrange()` reads the x values into `_xs` and blanks the values of rows without one. `_layout()` builds one `Mark` (row, series, x and y in percent) per drawn point, row by row and within a row by series.
- `_draw()` makes one `<g class="scatter-chart-series">` per series holding one `<path class="scatter-chart-points">`, with each point a `M x,y h0` subpath. The Sass gives that path `stroke-width: var(--md-comp-scatter-chart-point-size)` (8px), round caps and `vector-effect: non-scaling-stroke`, so every point in a series is the same size in pixels.
- On `update()`, `morph()` adds an SVG `<animate>` on the path's `d` from the old points to the new ones, matched by row and series column, unless `pace()` returns no timing under reduced motion. Nothing else on a point animates.
- The tooltip shows the row label, the x header with the x cell text, and the series name with the y cell text. `_indexAt()` picks the point whose centre is nearest the pointer, and the arrow keys, Home and End step through `_marks` in table order.
- A `.toggle` legend hides a series and refits both scales over the points still shown.
- The `scatter-chart` rule in `semantics.json` checks for a `<figure>` with a `<table>` and a `<figcaption>`, and says nothing about modifiers.

## Scope

With `.bubble`, the scatter chart sizes each point by a value from the table, so its area is proportional to that value.

### Expected behavior

- **R1.** On a `<figure class="scatter-chart bubble">`, the last header cell names the size column and that column leaves the series list: it draws no points of its own, has no legend item and takes no series color. The columns between the x column and the last one are the y series, as in a scatter chart without `.bubble`.
- **R2.** Each drawn point's area is proportional to its row's size value, read as `cellValue()` reads cells. Every point in a row takes that row's size. The largest size among the drawn points gets the largest diameter, and the others scale by the square root of their share of it.
- **R3.** A row whose size cell is not a positive number draws no points, as a row without an x value draws none. It does not stretch either scale and is skipped by the keyboard. Nothing throws.
- **R4.** The tooltip for a point adds the size column's header and the row's size cell text, as the author wrote them, after the series name and its y cell text.
- **R5.** When a `.toggle` legend hides a series, the size scale refits over the points still shown, as the x and y scales already do.
- **R6.** `update()` redraws from the changed table. Each point moves from its old position and size to the new ones, and without motion under `prefers-reduced-motion: reduce`. `data-watch` and the `watch` option redraw on table changes, as they do today.
- **R7.** Keyboard and pointer behavior keep their scatter chart rules: the arrows step through drawn points in table order, and the pointer picks the point whose centre is nearest.
- **R8.** A scatter chart without `.bubble` renders and behaves exactly as on the base commit, and so does every other chart. Any `LineChart` member changed for this keeps its behavior for the other charts.
- **R9.** `llm.md`'s "Scatter chart" section and the docs page `docs/src/pages/scatter-chart.astro` describe `.bubble`, the size column, gaps, the tooltip and the size token, with a live example. The component decisions entry lists the modifier, the changelog's Unreleased section has an Added entry, and `npm run build:skill` regenerates the derived files.
- **R10.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, and the `sourceRevision` pin in `docs/src/data/component-decisions.json` names a commit on `master` that holds every capability-linked file. A squash merge drops branch commits, and the decisions test requires the pin to be an ancestor of `HEAD`, so the pin is `613543a71`, the Phase 34 merge, rather than a branch commit. #417 set `master` to the same pin.

### Exclusions

- A size per series. Every point in a row shares the row's size, a limit the user accepted with the last-column rule.
- Marking the size column with a `data-size` attribute or any column other than the last.
- A size legend or size scale labels.
- Sizes that are not proportional to area, such as a minimum diameter for small values or sizing by radius.
- Hit testing against a bubble's drawn edge. The pointer keeps choosing by nearest centre, so inside a large bubble it can pick a smaller bubble whose centre is nearer.
- A new `semantics.json` rule. The modifier changes no markup roles, and the existing figure and caption rules still apply.
- Manual visual, forced-colors and screen reader checks. The user left them out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-24

- A `.bubble` modifier on `.scatter-chart` makes the last column the size column for every point in its row. The user chose this over a `data-size` attribute on a header cell and over y and size column pairs per series. It matches the `.axis` and `.toggle` modifiers, keeps several y series, and reads a table of label, x, y and size columns as the roadmap's "third numeric column".
- The work splits into three groups, as in Phase 34: sizes and the acceptance test, then the inherited behaviors, then docs and checks.
- The merge conditions are the area browser test and short regression cases, one per behavior. Manual checks are not merge conditions. Running the full local suite (`npm run verify`, MCP tests, `verify:packages`) was not chosen as a merge condition, so the repository's required CI checks stand in for it.

### Proposals for implementation

These are open to change in review.

- Ending the series: add a protected `_seriesTo` getter to `LineChart` that returns the header length, and use it in `_read()` as `header.slice(from, this._seriesTo)`. `ScatterChart` returns one less with `.bubble`. Other charts keep the same series.
- Reading sizes: read the size column in `_arrange()` beside `_xs`, into a `_sizes` array, and blank the values of rows whose size is not positive, so R3 reuses the existing gap path.
- Drawing: with `.bubble`, each point gets its own zero-length round-cap path in its series group, with an inline `--scatter-chart-size` custom property holding the square root of its share of the largest size, from 0 to 1. The Sass registers that property as a number with `@property` and sets `stroke-width: calc(var(--md-comp-scatter-chart-bubble-size) * var(--scatter-chart-size))`. Points keep their pixel sizing under the plot's `preserveAspectRatio="none"` scaling.
- A new token, `--md-comp-scatter-chart-bubble-size`, sets the largest diameter, 48px by default. Bubbles are not text- or icon-holding boxes, so they stay in pixels under the rem sizing rule.
- Overlap: draw each series' bubbles largest first, so smaller ones stay visible on top, and give bubbles a fixed partial stroke opacity. Forced colors keep them opaque. The draw order does not change `_marks` or the keyboard order.
- Size transitions: with timing from `pace()`, animate each resized bubble's `--scatter-chart-size` from its old value to the new one with the Web Animations API, alongside the `d` morph and with the same duration and easing. SVG animation cannot reach a stroke width that CSS computes from a token. Points still match old ones by row and series column.
- The cursor marker grows to the highlighted bubble's diameter plus its border, so it outlines the bubble instead of covering its centre.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.

### Deferred

None.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work follows `src/sass/README.md`. `components/` imports from `core/`, never the reverse.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency.

## Dependencies

- Phase 34, scatter chart, merged as #416. This phase builds on its table shape, `_marks`, the point paths and the update morph.
- No later roadmap phase depends on this one.
