# Charts that follow their table

Date: 2026-10-21
Roadmap phase: Phase 23, charts that follow their table
Branch: `feature/2026-10-21-chart-table-sync`
Base: `origin/master` at `8d45c2c4`, the commit T3 created this worktree from on 2026-10-21; rebased onto `76781860` before the pull request
Status: implemented and locally verified 2026-10-21; CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 23](../../../../roadmap.md#phase-23-charts-that-follow-their-table). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user assigned Phase 23 directly on 2026-10-21 and asked to skip the earliest-unfinished-phase rule, because sibling threads are building Phases 14 to 24 in parallel. The roadmap gives Phase 23 no dependency. Phase 22, chart transitions between datasets, is being built at the same time in the same `update()` code, so this phase keeps its change to `update()` to one line.

## Current behavior

These facts come from `src/ts/components/lineChart.ts` and its subclasses at the base commit.

- Every chart class (column, bar, mixed, pie, heatmap, radar and radial) extends `LineChart`. The constructor reads the `:scope > table` once through `_read()`, draws the plot, labels and legend as siblings of the table, and adds the pointer and key listeners.
- `update()` returns early once `destroy()` has run. Otherwise it rebuilds the generated nodes from the table, moves focus to the new plot or legend button, removes the old nodes and re-highlights the row. `HeatmapChart.update()` wraps it to keep the scroll position.
- `_read()` takes the data from the table's header row, body rows, each cell's text or `data-value`, and each header cell's `class`. Pie and radial charts also read the `<tfoot>` row, and the heatmap reads `data-label` on header cells. Without a table, `_read()` returns before clearing the last data, so `update()` redraws what it last read.
- Nothing in the chart code writes to the table. The chart adds its generated nodes as direct children of the figure in `_render()`, and removes them in `update()` and `destroy()`. `show()` changes the cursor and tooltip inside the plot. Label thinning runs in a `ResizeObserver` callback, after `update()` returns, and sets `data-thinned` on the labels list, a direct child of the figure, and `data-skip` on its items.
- The docs and `llm.md` tell authors to call `update()` after changing the table. The revenue card example on the line chart page does this after swapping rows.
- Chart options are `min` and `max`, each overridden by a `data-` attribute on the figure. Other behavior switches on markup, such as `.toggle`. The data table's `data-sort` is a precedent for a data attribute that turns on framework behavior with no visual change.

A page that streams or edits chart data has to find the instance and call `update()` after each change.

## Decisions made under delegation

The user delegated planning, requirements and validation to the agent on 2026-10-21 and asked for questions only about blockers. These choices come from the project evidence above. The user has not reviewed them.

- Opt-in name: a `watch` option, default `false`, and a `data-watch` attribute on the figure, which turns watching on whatever the option says. The attribute keeps the mission's rule that markup can configure components without page script. The option matches `min` and `max`, which also have both forms. `watch` follows the roadmap's wording ("watches its table"). `live` was rejected because it reads as `aria-live`, and `autoUpdate` because the name would not say what triggers the update.
- Batching: one `MutationObserver` per watching chart calls `this.update()` from its callback, so a subclass override such as the heatmap's runs. The browser delivers every mutation queued before the next microtask checkpoint in one callback, so the edits a script makes in one synchronous run redraw the chart once. Edits split across an `await` are separate batches. The platform already batches, so no `requestAnimationFrame` or timer is added; a timer would need its own teardown.
- What is watched: the table's subtree with `{ subtree: true, childList: true, characterData: true, attributeFilter: ['data-value', 'class', 'data-label'] }`, the attributes the charts read; and the figure with `{ childList: true }` only, no subtree and no attributes. The callback ignores a figure record unless it adds or removes a `<table>`, so the chart's own generated nodes, label thinning and a changed caption never redraw it, whenever they happen.
- Reconnecting: `update()` ends by reconnecting the observer. `disconnect()` drops the records already queued, so a page that edits the table and then calls `update()` by hand in the same run gets one redraw. Reconnecting also moves the observer to a replaced table. The record filter above does not depend on where this line sits, so a later change to `update()`, such as Phase 22's, cannot turn the watch into a loop.
- Teardown: `destroy()` disconnects the observer. `update()` already does nothing after `destroy()`.
- Scope of the observer: `data-min`, `data-max`, `data-other-label`, the caption and the chart's classes belong to the figure, not the table data, and stay outside the watch. Authors still call `update()` after changing them.
- The attribute is read once, when the chart starts. Any `data-watch` value turns watching on, `data-watch="false"` included, as with other boolean data attributes.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | `LineChartOptions` has a `watch` option, a boolean with default `false` and a doc comment. Every chart class takes it, since they share `LineChart`'s options. |
| R2 | A chart watches its table when `watch` is `true` or the figure has a `data-watch` attribute when the chart starts. Without either, the chart observes nothing and behaves exactly as it does at the base commit. |
| R3 | A watching chart calls `update()` once for each batch of table changes made in one synchronous run of script: added, removed or replaced rows or cells, changed cell text, and changed `data-value`, `class` or `data-label` attributes inside the table. Page script does not call `update()`. |
| R4 | A watching chart that starts without a table and gains one, or whose table is replaced, watches the new table and draws from it. |
| R5 | A watching chart does not redraw for changes outside its data: the generated nodes `update()` adds and removes, the cursor and tooltip `show()` fills, label thinning on a narrow chart, and a non-table child of the figure such as the caption. A `.toggle` legend click redraws once, through its own `update()` call. A page that edits the table and calls `update()` in the same run gets one redraw. |
| R6 | `destroy()` stops the watch. A table change after `destroy()` does not redraw and throws nothing. |
| R7 | Subclasses keep their own `update()` behavior when the watch triggers it, such as the heatmap keeping its scroll position. |
| R8 | The change to `update()` is one added line, so it merges cleanly with Phase 22's work on the same method. New and changed functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |
| R9 | Docs and generated guidance describe the opt-in. The Line chart section of `llm.md` and `docs/src/pages/line-chart.astro` describe `data-watch` and the `watch` option, including that the attribute is read at start. The options table on the docs page lists `watch`. Every other chart's `llm.md` section and docs page, and every chart class comment, that says to call `update()` after changing the table also names `data-watch`. The unreleased changelog lists it under Added. `npm run build:skill` regenerates the derived files and `npm run check:generated` passes. |
| R10 | The bundle size change is recorded in reviewed gzip budget lines in `tests/selective-builds.test.js`. |

## Exclusions

- Watching figure attributes or classes, such as `data-min`, `.stacked` or the caption.
- Clearing the drawing when the table is removed. `update()` keeps the last data it read, as it does today. A pie or radial chart loses its `<tfoot>` total in that case, since `_total()` reads the table again.

## Known limits

Found in the final review on 2026-10-21 and left as they are. Each one already applies to a manual `update()`; the watch makes it automatic.

- A redraw refills the polite live tooltip for the highlighted row, so a focused screen reader user on a chart that changes every second hears that row each time.
- The `class` filter covers the whole table, though the charts read classes only from header cells. A page that toggles classes on body rows redraws the chart each time.
- `update()` ends by dropping queued records. A table edit made by a page listener that runs during `update()`, such as a `focusin` handler on the figure, is not drawn until the next change.
- Animating the redraw. Phase 22 owns transitions.
- Changing `semantics.json`. `data-watch` adds no role, name or state, so no markup rule changes.
- Re-pinning the capability review hashes for `lineChart.ts` in `docs/src/data/component-decisions.json`. The pinned hash (`6fdb7471…`) already differs from the base file (`b2c32092…`), so those entries were stale before this change and stay as they are.
- Editing `specs/roadmap.md`. A separate docs PR marks the phase after merge.

## Constraints and dependencies

- Put the observer in `LineChart`, the shared base, so every chart type gets it without subclass changes.
- Use the native `MutationObserver`. Add no dependency and no `core/` helper for one caller.
- Tests run against built bundles. Build before testing, and close browsers and destroy instances in `finally` blocks.
- Phase 22 edits the same `update()` method in parallel. Expect a merge with it after either PR lands.
