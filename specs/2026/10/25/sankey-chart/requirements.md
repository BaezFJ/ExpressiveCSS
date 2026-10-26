# Sankey chart

Date: 2026-10-25
Roadmap phase: Phase 51, sankey chart
Branch: `feature/2026-10-25-sankey-chart`
Base: `origin/master` at `a9bbf77ad`, fetched 2026-10-25
Status: implemented 2026-10-25; merged as #429

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 51](../../../../roadmap.md#phase-51-sankey-chart). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked phase 51. Phases 42 to 51 are being specified in parallel threads, so this spec skips the earliest-unfinished-phase pick. The roadmap gives phase 51 no dependencies. The funnel chart (phase 49) and treemap chart (phase 50) are being specified at the same time, so this phase builds on the chart code as it is on the base commit and plans no shared chart refactor that those phases would have to wait for.

## Current behavior

These facts come from the base commit.

- No chart draws flows between nodes. Every chart in `src/ts/components/` reads its `<table>` as rows of values: `LineChart` and its subclasses `ColumnChart`, `BarChart`, `MixedChart`, `PieChart`, `RadarChart`, `RadialChart`, `HeatmapChart` and `ScatterChart`. `_org-chart.scss` styles an org chart in CSS alone, with no runtime.
- `LineChart._read()` takes the first cell of each body row as its label and each header cell from `_seriesFrom` (1) to `_seriesTo` as one series. `cellValue()` reads `data-value` before the cell text, and `numberValue()` accepts currency and percent signs, grouping commas and a typographic minus around one number. Anything else is a gap (`null`).
- `LineChart._render()` builds the plot as one tab stop with `role="group"`, `aria-roledescription` from `_type` and the figcaption as its name, then appends `_axes()`, `_draw()`, a cursor and an `aria-live="polite"` tooltip. `_guides()` adds the parts below the plot.
- Keyboard focus shows index 0 of `_count`. `_keyTarget()` maps the arrows, Home, End and Escape to an index, and Escape with nothing shown is left to a dialog or sheet around the chart. `_indexAt()` maps a pointer event to an index. Subclasses override `show()`, `_place()`, `_keyTarget()` and `_indexAt()` to number their own marks, as `HeatmapChart` numbers cells and `ScatterChart` numbers points.
- `update()` redraws from the table, keeps focus on the plot or the same legend button, keeps the highlighted index while it is below `_count`, and `morph()` animates each SVG path from its old shape unless the reader prefers reduced motion. `data-watch` or the `watch` option redraws on table changes.
- `PieChart` colors its rows from six colors through `data-series`, with a `ponytail:` note that later rows repeat them. `HeatmapChart` and `PieChart` return `false` from `_axis`, so they draw no value axis.
- Registration touches `src/ts/components/registry.ts`, `index.ts` and `src/ts/modular.ts`, the Sass index, `semantics.json`, `tests/fixtures.js`, a docs page, `docs/src/data/nav.ts` and the component decisions data. A figure-based chart also goes in `$_media-figure` in `_cards.scss`.

## Scope

A `<figure class="sankey-chart">` draws each table row as a link from a source node to a target node, as wide as its value, and follows the other charts for the source table, `update()`, `data-watch`, tooltips and keyboard focus.

### Expected behavior

- **R1.** `AutoInit()` starts `SankeyChart` on `.sankey-chart`, registered like the other charts. The `<figcaption>` and `<table>` take the same markup as a line chart, and the table stays in the page, visually hidden, as the text alternative and the no-JavaScript fallback.
- **R2.** The first column names each row's source node, the second its target node, and the third holds the flow's value, read as `cellValue()` reads cells. A node is identified by its trimmed cell text, so the same name in either column is the same node. Columns after the third are not drawn.
- **R3.** A row draws no link when its value is not a positive number, when its source or target cell is empty, when its source and target are the same node, or when its link would close a cycle with the rows before it. None of these throws, and the other links and nodes draw as if that row were absent.
- **R4.** Nodes stand in columns. A node with no incoming link is in the first column, and every other node is one column past the furthest of its sources, so each link runs from an earlier column to a later one. A node with no outgoing link stays in the column its sources give it. The columns spread across the plot from the inline start to the inline end.
- **R5.** Within a column, nodes stack in the order their names first appear in the table, reading row by row and source before target, with a gap between neighbours.
- **R6.** All nodes and links share one scale. A link's width is proportional to its value. A node's height equals the larger of its incoming and outgoing totals on that scale. The scale makes the tallest column, its nodes plus the gaps between them, fill the plot's height.
- **R7.** Each link leaves its source at the source's inline-end edge and arrives at its target's inline-start edge. A node's outgoing links stack down its edge in table order, as do its incoming links, so links on one edge never overlap.
- **R8.** In a right-to-left page, the columns run from right to left, as line chart rows do. Heights do not change.
- **R9.** Each node takes a color in node order, cycling through the chart colors as the pie chart's rows do, and shows its name beside it. Each link takes its source node's color, lighter than the node.
- **R10.** The plot stays one tab stop with `aria-roledescription="sankey chart"` and the caption as its name. Keyboard focus highlights the first drawn link. ArrowRight and ArrowDown move to the next drawn link and ArrowLeft and ArrowUp to the previous one, in table order, skipping the rows R3 leaves out. Home and End go to the first and last link, and Escape hides the highlight. The arrows do not swap in right-to-left pages, because table order is not a direction on screen.
- **R11.** A pointer over a link highlights it, and a pointer off every link hides the highlight. A touch tap does the same, and the highlight stays until the plot blurs, as in the line chart.
- **R12.** The highlighted link is marked so it stands out from the others, and the live tooltip shows the source and target names and the value cell's text, as the author wrote them.
- **R13.** `update()` redraws from the changed table, keeps focus on the plot, and keeps the highlighted index while the table still has that many drawn links. Links and nodes still in the table move from their old shapes to their new ones, without motion under `prefers-reduced-motion: reduce`. `data-watch` and the `watch` option redraw on table changes, as for every chart.
- **R14.** Markup that does not use `.sankey-chart` renders and behaves exactly as on the base commit. Any `LineChart` member made reachable for the subclass keeps its behavior for the other charts.
- **R15.** `semantics.json` has rules that `.sankey-chart` is a `<figure>` holding a `<table>` and has a `<figcaption>`, worded like the heatmap's, and `npm run build:semantics` regenerates `SEMANTICS.md`.
- **R16.** `llm.md` has a "Sankey chart" section with an example, the table shape, the rows that draw nothing, the layout rules, keys, tooltip and the CSS custom properties, and lists the chart in its AutoInit tables. The docs site has a sankey chart page in the nav, `auto-init.astro` lists it, the component decisions data and the web extensions review list it, the changelog's Unreleased section has an Added entry, and `npm run build:skill` regenerates the derived files.
- **R17.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, and the capability roadmap pins the new component to a `sourceRevision`.

### Exclusions

- Reordering nodes to reduce link crossings, as d3-sankey does. Node order follows the table (R5), so an author who wants fewer crossings sorts the table.
- Keyboard, pointer or tooltip access to nodes. Node totals show only in the table.
- Drawing cycles, self links or negative flows. R3 drops those rows.
- A `.toggle` legend, a series legend, `.axis`, `.stacked`, `.values` text on links, `.sparkline` and a `<tfoot>` total.
- Node dragging, alignment options (justify, left, right, center) and per-link colors from markup.
- A manual screen reader or visual check. The user left them out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-25

- The work splits into five task groups, one commit each, in the order of [plan.md](plan.md). The branch is the existing `feature/2026-10-25-sankey-chart`, created from `origin/master` at `a9bbf77ad`.
- `SankeyChart` subclasses `LineChart`, as `HeatmapChart` and `PieChart` do, so it inherits `update()`, `data-watch` and focus keeping. Columns 0, 1 and 2 are source, target and value. Nodes take the column of their longest path from a source, the chart mirrors in right-to-left pages, rows with a non-positive value or that close a cycle draw nothing, and there is no `.toggle` legend.
- One table row is one link. The arrows walk links in table order, and the tooltip shows source, target and value. Nodes stack in order of first appearance in the table. The user chose this over making nodes reachable too and over a crossing-reducing layout.
- The roadmap's completion check, in a browser test across Chromium, Firefox and WebKit, is the acceptance check. Short cases in the same file cover keyboard, pointer, tooltip, `update()`, `data-watch`, right-to-left and the rows R3 skips, and count as regression checks. The repository checks must pass. A manual screen reader or visual check is not a merge condition.

### Proposals for implementation

These are open to change in review.

- Reading: set `_seriesFrom` to 2 and `_seriesTo` to 3 so `LineChart._read()` keeps the value column as the one series and `labels` as the source names, and read the target names from column 1 in an override. `_axis` returns `false`.
- Layout: a pure function from the rows to nodes (name, column, order, height, top) and links (row, source, target, value, top at each end), with cycle detection by walking a target's descendants before adding a row. It is easy to unit test in jsdom and keeps `_draw()` short.
- Drawing: one SVG with `viewBox="0 0 100 100"` and `preserveAspectRatio="none"`, as the line chart uses. Nodes are rectangles drawn as paths and links are closed paths of two cubic curves between the node edges. Neither uses a stroke, so stretching the box keeps widths proportional. Node width and the gap between nodes are a fixed share of the plot, with a `ponytail:` note naming CSS tokens as the upgrade if authors ask to tune them.
- Node labels are HTML spans placed by percent, at the inline end of the node, or the inline start in the last column, so text is not stretched with the SVG.
- Colors: six node colors through `data-series` as in `PieChart`, with links at a lower opacity from a `--md-comp-sankey-chart-link-opacity` token.
- Numbering: `_count` is the number of drawn links, and index `k` is the `k`th drawn link in table order. `show()`, `_place()`, `_keyTarget()` and `_indexAt()` are overridden. `_indexAt()` uses `elementsFromPoint()` to find the link path under the pointer, which works while a touch drags, as the event target does not.
- Transitions: `morph()` moves each link from the old link with the same source and target names, and each node from the old node with the same name, so a link still pairs with its old shape when rows move. A shape with no old one appears without animating.
- Sass in `src/sass/components/_sankey-chart.scss`, with the plot height and link opacity as tokens. Label boxes follow the rem sizing rule.
- If a `LineChart` member the subclass needs is private, make it protected without changing what it does, as the heatmap and scatter commits did.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.

### Deferred

None.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work follows `src/sass/README.md`. `components/` imports from `core/`, never the reverse.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency and no layout library.

## Dependencies

- None from the roadmap. The `LineChart` features it inherits (`update()` transitions, `data-watch`) shipped in phases 22 and 23 and earlier work.
- Phases 49 and 50 add charts in parallel and touch the same registration files, Sass index, `semantics.json`, `llm.md`, the changelog, the guide counts and the budget lines. Whichever merges later rebases onto the others as a merge train. This phase does not depend on their code.
