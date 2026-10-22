# Validation: charts that follow their table

Roadmap phase: Phase 23, charts that follow their table. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent owns every check below under the user's delegation of 2026-10-21. Tests run against built bundles, so build first with `npm run build:js`. Run browser suites one at a time, since parallel runs flake. Results were recorded on 2026-10-21.

## Automated checks

V1 to V8 are cases in the new `tests/chart-watch-browser.test.js`. Against the bundle built before the change, the five cases that need watching failed in Chromium and the unwatched and `destroy()` cases passed. Run them in Chromium, Firefox and WebKit with `node --test tests/chart-watch-browser.test.js`. Each case counts redraws by wrapping the instance's `update()`; V1 and V3 also check whether the plot node was replaced. After a change, the test settles with a frame and then a timeout (`requestAnimationFrame` followed by `setTimeout`), so the observer callback, a microtask, and the frame's `ResizeObserver` delivery for label thinning have both run before it counts redraws.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R2, R3 | A `.line-chart` with `data-watch` and three rows, started by `AutoInit()`. | In one synchronous run, change the second cell's text and append a row. Settle. | `update()` ran once. The plot node was replaced, the labels list the new row, and `show(1)` reads the new value. | Passed 2026-10-21 in Chromium, Firefox and WebKit. |
| V2 | R3 | The V1 chart. | Change a cell, settle, add a row, settle. | Two redraws, one per batch. | Passed 2026-10-21 in all three engines. |
| V3 | R2 | A `.line-chart` without `data-watch` or the option. | Change a cell and add a row, settle. | No redraw: the plot node is the same one and the labels are unchanged. | Passed 2026-10-21 in all three engines. Before the change it also passed, as expected. |
| V4 | R3 | The V1 chart, and a watching `.heatmap-chart`. | On the line chart, set a cell's `data-value`, settle; add a class to a header cell, settle; change a text node's `data` directly, settle. On the heatmap, set a header cell's `data-label`, settle. | Three redraws of the line chart, with the new value and the header class in the drawing, and one of the heatmap. | Passed 2026-10-21 in all three engines. |
| V5 | R4 | A watching chart, and a watching figure that starts with a caption and no table. | Replace the first chart's `<table>` with a new one, settle; edit a cell in the new table, settle; edit the detached old table, settle. Append a table to the second figure, settle. | The first chart redraws twice and the second redraw shows the edited value; the old table's edit does nothing. The second figure draws a plot from its new table. | Passed 2026-10-21 in all three engines. |
| V6 | R6 | A watching chart. | Call `destroy()`, then change a cell and settle. | No redraw, no plot in the figure, no page error. | Passed 2026-10-21 in all three engines, with no page errors. |
| V7 | R5 | A watching chart with a `.toggle` legend, its plot focused, and a watching chart in a 120px container with 24 long row labels, so label thinning runs. | Move the highlighted row with the arrow keys; click a legend toggle; replace the caption; edit a cell and call `update()` in the same run. Settle after each. On the narrow chart, settle twice after start, then edit a cell and settle twice. | Arrow keys and caption: no redraw. An edit while the plot is focused: one redraw, focus on the new plot, the same row. Toggle click: one redraw (its own `update()` call) and no follow-up. Edit plus manual `update()`: one redraw. Narrow chart: labels are thinned, no redraw at start, and exactly one for the edit. | Passed 2026-10-21 in all three engines. With the record filter removed, so the callback redraws on any record, this case failed in Chromium at the caption step. Label thinning only sets attributes, which the figure's `{ childList: true }` observation never sees. After the final review the case was corrected: it focuses the `.toggle` chart's plot directly, since Tab from the button reached another chart, and asserts the arrows moved its row. It now also checks that a watched redraw keeps focus on the new plot and the highlighted row, and it starts the narrow chart again inside the counted run so a single redraw from its first thinning would count. |
| V8 | R1, R7 | A `.heatmap-chart` scrolled sideways and a `.pie-chart`, each started with `init(el, { watch: true })` and no attribute. | Edit a cell in each, settle. | Each redrew once. The heatmap keeps its scroll position. | Passed 2026-10-21 in all three engines. |
| V9 | R2, R5, R7 | Existing chart browser tests. | Run `chart-update`, `chart-legend-toggle`, `chart-axis`, `line-chart`, `column-chart`, `bar-chart`, `mixed-chart`, `pie-chart`, `heatmap-chart`, `radar-chart` and `radial-chart` browser tests one file at a time. | All pass. | Passed 2026-10-21, one file at a time in all three engines, with no failures. `tests/cards.test.js`, the only jsdom suite that loads chart markup, passed 20 of 20. |
| V10 | R9 | Plan group 4 edits. | `npm run build:skill`, then `npm run check:generated`. Read the chart sections of `llm.md`, the chart docs pages, the chart class comments and the changelog; `grep` them for "call `update()`". | Generation is clean. The line chart docs describe `data-watch` and `watch`, that the attribute is read at start, and that every chart type takes them. The options table lists `watch`. Each other place that says to call `update()` names `data-watch`. The changelog has the Added entry. | Passed 2026-10-21. `build:skill` rewrote the contract hash in all 84 guides and the MCP copies; the guides carry no runtime text, so nothing else changed there. Eight `llm.md` chart sections, eight docs pages and eight class comments now name `data-watch`. The class comments first named only `watch`; the final review caught it and they were fixed. |
| V11 | R10 | A fresh build. | `node --test tests/selective-builds.test.js`. | Passes with reviewed budget lines naming this change and its gzip bytes. | Passed 2026-10-21: JavaScript 89,671 gzip bytes (+201) on the base commit. After rebasing onto `origin/master` at `76781860`, which added Autocomplete `allowCreate` and the tooltip shared delay, the bundle measured 90,053 gzip bytes (+207 over that base), and the budget line records that. CSS did not change. |
| V12 | R8 | The final diff. | `git diff origin/master -- src/ts/components/lineChart.ts` and `npx --no-install fallow audit --base origin/master --format json`. | `update()` gains exactly one line. No introduced fallow finding blocks the commit. | Passed 2026-10-21. `update()` gains only `this._watch();`. The fallow pre-commit audit returned `pass`. |
| V13 | all | The final tree. | `npm run verify` once, then `npm test --prefix mcp/expressivecss`. | Both pass. A browser failure in untouched code is rerun alone before it counts. | Passed 2026-10-21 after reruns. The first `npm run verify` ran 2,350 tests: 2,339 passed, 10 failed and 1 was cancelled. Four generator and version tests failed for a cause of this change: `CHANGELOG.md` and the budget test were edited after `build:skill`, so the contract hash was stale. Rerunning `build:skill` fixed it and `check:generated` passed. The other failures were in untouched code (WebKit confetti, Firefox keypad and critical flows, Chromium sheet spring, the docker runner, the codex adapter and the evaluation runner) and ran while `npm ci --prefix mcp/expressivecss` loaded the machine. Rerun alone, every failed file passed; the codex adapter needed a second run, as its flake note predicts. `verify` stops at the test step, so `docs:build:astro` and `docs:verify` ran separately and passed (121 pages). `npm test --prefix mcp/expressivecss` first failed its static inspection time limit while `verify` ran, then passed alone. `npm run verify:packages` passed. |

## Manual checks

None are required for merge. The agent ran one on 2026-10-21: it served the built site from `_site`, opened `line-chart.html` in Chromium with Playwright, and clicked the revenue card's six-month button. The chart, which has `data-watch` and no `update()` call in its script, went from 12 labels to 6 and replaced its plot, with no page errors.

## Merge conditions

- V1 to V13 pass.
- The repository's required CI checks pass and the pull request is reviewed.
- The changelog lists the watch under Added.

## Specification verification

Checked 2026-10-21, before implementation.

- Branch `feature/2026-10-21-chart-table-sync` is active, from `origin/master` at `8d45c2c4`. `git status` showed a clean tree before the spec, so the three spec files are the only changes.
- All three documents name Phase 23. The links to the mission, tech stack and roadmap resolve, including the `#phase-23-charts-that-follow-their-table` anchor.
- Every `R` ID has planned work and at least one `V` check.
- A `Plan` subagent reviewed the spec against the constitution and the chart source, without the agent's reasoning. It confirmed that no chart code writes to the table, that `disconnect()` empties the record queue, and that the `lineChart.ts` capability pins were already stale. It found no scope problems. Its findings, each checked against the source and fixed in the spec:
  - Label thinning sets `data-thinned` on a direct child of the figure from a `ResizeObserver`, after `update()` returns, and a one-frame wait samples before that callback. The spec now pins the figure's observe options to `{ childList: true }`, adds a narrow-chart case to V7, and settles with a frame plus a timeout.
  - The loop guard depended on where one line sits in `update()`, which Phase 22 is also changing. The callback now ignores figure records that do not add or remove a table.
  - The heatmap reads `data-label` on header cells, so it joins the attribute filter.
  - "Per task" was wrong: delivery is per microtask checkpoint. The wording now says one synchronous run.
  - A chart that gains a table had no check, and a removed table leaves the last drawing. V5 now covers the first; the second is an exclusion.
  - Docs for the other seven chart types and their class comments also say to call `update()`. R9 now covers them.

## Final review

On 2026-10-21 a `Plan` subagent reviewed the uncommitted diff against `8d45c2c4` and the spec, without the agent's reasoning. It traced R1 to R8 and R10 to code and evidence, found no change outside Phase 23, and found no bug in the observer's lifecycle, loop guard, missing-table handling or subclass calls. Its findings, each checked against the source:

- Fixed: the class comments named `watch` but not `data-watch`, which R9 asks for.
- Fixed: V7's arrow keys moved a different chart, because Tab from the button reached `#watched` first. The case now focuses the `.toggle` plot and also checks focus through a watched redraw.
- Fixed: V7's narrow chart was counted after its first thinning, so it could only catch a repeating loop. It now starts again inside the counted run.
- Fixed: V7 credited the record filter with stopping label-thinning redraws; the observe options do that. The intro claimed every case checks the plot node, and V10 and V13 had wrong counts.
- Fixed: the docs and changelog now list the heatmap's `data-label`, name the caption among figure changes that need `update()`, and say edits on either side of an `await` redraw twice.
- Recorded as known limits in [requirements.md](requirements.md#known-limits): live tooltip refills, the table-wide `class` filter, edits made during `update()`, and a pie or radial total that disappears with a removed table.

After the fixes, `tests/chart-watch-browser.test.js` passed 7 of 7 in Chromium, Firefox and WebKit, and `build:skill` and `check:generated` passed.

## Code review

On 2026-10-21 the agent reviewed the diff on five axes and found no bug. It mutated the watch four ways in Chromium and restored the file after each run; every mutation failed a named case. Removing `_watch()` from `update()` failed the replaced-table case and the manual-update case. Removing the disconnect in `destroy()` failed the destroy case. Dropping `data-label` or `characterData` failed the attribute and text-node case. A second reviewer on another model (`ecc:typescript-reviewer`, Sonnet) read the diff and returned no findings, with one nit it advised against acting on: a throw inside `update()` would skip the reconnect.
