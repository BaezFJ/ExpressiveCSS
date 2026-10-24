# Plan: bubble sizes on the scatter chart

Roadmap phase: Phase 35, bubble sizes on the scatter chart. Branch `feature/2026-10-24-bubble-sizes` from `origin/master` at `613543a71`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them.

## 1. Read the size column and draw each point's area

Outcome: `.scatter-chart.bubble` takes its last column as sizes, and each point's drawn area is proportional to its size, in left-to-right and right-to-left pages.

Prerequisites: none.

- [x] Add the V1 case to `tests/scatter-chart-browser.test.js` with a `.bubble` fixture. Run `npm run build` and the file, and confirm V1 fails.
- [x] Add the `_seriesTo` getter to `LineChart` and use it in `_read()`. Override it in `ScatterChart` for `.bubble`.
- [x] Read the sizes in `ScatterChart._arrange()` and draw one path per bubble with its `--size`, largest first within each series.
- [x] Add the bubble rules and `--md-comp-scatter-chart-bubble-size` to `src/sass/components/_scatter-chart.scss`, with the forced-colors opacity rule.
- [x] Rebuild and rerun until V1 passes in all three engines. Add the reviewed JavaScript and CSS budget lines.

Completion check: V1 passes in Chromium, Firefox and WebKit, the existing scatter cases still pass, and `node --test tests/selective-builds.test.js` passes.

Covers: R1, R2, R8, R10; V1, V6, V7.

## 2. Gaps, tooltip, toggle and update() with sizes

Outcome: bad sizes leave gaps, the tooltip names the size, a hidden series refits the sizes, and `update()` moves sizes as well as positions.

Prerequisites: group 1.

- [ ] Add the V2 to V5 cases and record which fail.
- [ ] Add the size header and cell text to `_fill()`, and size the cursor marker to the highlighted bubble.
- [ ] Animate stroke width beside the `d` morph in `_group()`, skipped when `pace()` gives no timing.
- [ ] Fix whatever else the cases show in `scatterChart.ts`, or in shared `LineChart` code when the fault is there, keeping other charts' behavior.
- [ ] Rebuild and rerun the scatter file, then `tests/chart-update-browser.test.js`, `tests/chart-watch-browser.test.js`, `tests/chart-legend-toggle-browser.test.js` and `tests/chart-transition-browser.test.js`, one at a time. Update the budget lines.

Completion check: V1 to V5 pass in all three engines, and the four chart files pass.

Covers: R3, R4, R5, R6, R7, R8; V2, V3, V4, V5, V6.

## 3. Docs, generated files and checks

Outcome: `.bubble` is documented, the pin and generated files are current, and CI can pass.

Prerequisites: group 2.

- [ ] Add a bubble sizes part to the "Scatter chart" section of `llm.md`, a live example to `docs/src/pages/scatter-chart.astro`, and the modifier to the scatter chart entry in `docs/src/data/component-decisions.json`.
- [ ] Add an Added entry to the Unreleased section of `CHANGELOG.md`.
- [ ] Re-pin the scatter chart's `sourceRevision` to the last commit that changes its sources.
- [ ] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [ ] Record each result in validation.md.

Completion check: `npm run check:generated` is clean, V7 passes, and every check in validation.md shows a result.

Covers: R9, R10; V7.
