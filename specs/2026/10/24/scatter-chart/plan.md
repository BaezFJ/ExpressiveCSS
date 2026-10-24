# Plan: scatter chart

Roadmap phase: Phase 34, scatter chart. Branch `feature/2026-10-24-scatter-chart` from `origin/master` at `733d58c98`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them.

## 1. Register the chart and place its points

Outcome: `.scatter-chart` starts from AutoInit, reads the shared x column and the y series, and draws one point per value at the right place on both scales, in left-to-right and right-to-left pages.

Prerequisites: none.

- [ ] Add `tests/scatter-chart-browser.test.js` with the V1 and V2 cases, following `tests/heatmap-chart-browser.test.js`. Run `npm run build` and the file, and confirm both fail.
- [ ] Add `src/ts/components/scatterChart.ts` with `ScatterChart extends LineChart`: `_type`, the `_read()` override for x and y, the x scale with `data-x-min`, `data-x-max`, `xMin` and `xMax`, and `_draw()` for the point paths. Make any `LineChart` member it needs protected without changing its behavior.
- [ ] Register it in `src/ts/components/registry.ts`, `index.ts` and `src/ts/modular.ts`, and add the AutoInit fixture to `tests/fixtures.js`.
- [ ] Add `src/sass/components/_scatter-chart.scss` and forward it from `src/sass/components/_index.scss`.
- [ ] Rebuild and rerun until V1 and V2 pass. Add the reviewed JavaScript and CSS budget lines.

Completion check: `node --test tests/scatter-chart-browser.test.js` passes V1 and V2 in Chromium, Firefox and WebKit, and `node --test tests/selective-builds.test.js tests/autoinit.test.js` passes.

Covers: R1, R2, R3, R5, R14; V1, V2, V9.

## 2. Axes and fixed scale ends

Outcome: with `.axis`, both scales show round ticks with their columns' signs, and the data attributes fix either end.

Prerequisites: group 1.

- [ ] Add the V3 case and confirm it fails.
- [ ] Override `_axes()` to add the x axis list below the plot, and add the vertical grid lines and label placement to the Sass.
- [ ] Rebuild, rerun the file, and update the budget lines.

Completion check: V1 to V3 pass in all three engines.

Covers: R4, R14; V3, V9.

## 3. Keyboard, pointer and tooltip

Outcome: every point is reachable from the plot's tab stop and by pointer, and the tooltip names the point.

Prerequisites: group 1.

- [ ] Add the V4 and V5 cases and confirm they fail.
- [ ] Override `_count`, `show()`, `_indexAt()` and `_keyTarget()` with the point numbering from the requirements' proposals, and draw the active point marker in the cursor.
- [ ] Rebuild and rerun until they pass.

Completion check: V1 to V5 pass in all three engines.

Covers: R7, R8, R9; V4, V5.

## 4. update(), data-watch and the toggle legend

Outcome: the inherited behaviors work for points: they move on `update()`, redraw under `data-watch`, and hide by series from a `.toggle` legend.

Prerequisites: groups 2 and 3.

- [ ] Add the V6 and V7 cases and record which fail.
- [ ] Fix what they show in `scatterChart.ts`, or in the shared `LineChart` code when the fault is there, keeping the other charts' behavior.
- [ ] Rebuild, rerun the scatter file, then the existing chart files `tests/chart-update-browser.test.js`, `tests/chart-watch-browser.test.js`, `tests/chart-legend-toggle-browser.test.js` and `tests/chart-transition-browser.test.js`, one at a time.

Completion check: V1 to V7 pass in all three engines, and the four existing chart files pass.

Covers: R6, R10, R11; V6, V7, V10.

## 5. Semantics, docs and repository checks

Outcome: the chart has a markup rule and docs, generated files are fresh, and the contributor checks pass.

Prerequisites: group 4.

- [ ] Add the `scatter-chart` rule to `semantics.json` and run `npm run build:semantics`.
- [ ] Add the "Scatter chart" section to `llm.md`, `docs/src/pages/scatter-chart.astro` with live examples, the nav entry in `docs/src/data/nav.ts`, the entry in `docs/src/data/component-decisions.json`, and the capability roadmap entry with its `sourceRevision` pin.
- [ ] Add an Added entry to the Unreleased section of `CHANGELOG.md`.
- [ ] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [ ] Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. Rerun a failure alone before debugging it.
- [ ] Record each result in validation.md.

Completion check: every check in validation.md shows a result, and none failed for a reason this change causes.

Covers: R11, R12, R13, R14; V8, V9, V10.
