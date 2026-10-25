# Plan: treemap chart

Roadmap phase: Phase 50, treemap chart. Branch `feature/2026-10-25-treemap-chart` from `origin/master` at `a9bbf77ad`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. All four were implemented on 2026-10-25: group 1 as `681f26b4c`, group 2 as `dbd35c5c1`, group 3 as `0d087229b`, and group 4 in the commit that records these results. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. The `semantics.json` row goes into group 1, because the semantics roster test fails for a registered component without one.

## 1. Register the chart and lay out the rectangles

Outcome: `.treemap-chart` starts from AutoInit, reads the first value column, and draws one rectangle per positive row with areas proportional to the values, covering the plot, in left-to-right and right-to-left pages.

Prerequisites: none.

- [x] Add `tests/treemap-chart-browser.test.js` with the V1 and V2 cases, following `tests/pie-chart-browser.test.js` and `tests/scatter-chart-browser.test.js`. Run `npm run build` and the file, and confirm both fail.
- [x] Add `src/ts/components/treemapChart.ts` with `TreemapChart extends LineChart`: `_type`, `_axis` and `_points` overrides, the `squarify()` helper, and `_draw()` placing one element per drawn row. Make any `LineChart` member it needs protected without changing its behavior.
- [x] Register it in `src/ts/components/registry.ts`, `src/ts/index.ts` and `src/ts/modular.ts`. Add the AutoInit fixture to `tests/fixtures.js` and raise `AUTO_INIT_FIXTURES.length` in `tests/autoinit.test.js` (38 on the base commit).
- [x] Add the `treemap-chart` rules to `semantics.json`, worded like `pie-chart`'s, and run `npm run build:semantics`.
- [x] Add `src/sass/components/_treemap-chart.scss` with `@include chart("treemap-chart")` and the rectangle placement, forward it from `src/sass/components/_index.scss`, and add `.treemap-chart` to `$_media-figure` in `_cards.scss` and the regexes in `tests/cards.test.js`.
- [x] Rebuild and rerun until V1 and V2 pass. Add the reviewed JavaScript and CSS budget lines.

Completion check: `node --test tests/treemap-chart-browser.test.js` passes V1 and V2 in Chromium, Firefox and WebKit, and `node --test tests/selective-builds.test.js tests/autoinit.test.js tests/semantics.test.js tests/cards.test.js` passes.

Covers: R1, R2, R3, R4, R12, R14; V1, V2, V9.

## 2. Colors, gaps and text in the rectangles

Outcome: rectangles take the six colors, a visible gap separates them without changing their boxes, each shows its name and cell text when they fit, and forced colors keep their edges.

Prerequisites: group 1.

- [x] Add the V3 case and confirm it fails.
- [x] Set `data-series` on each rectangle and write its name and cell text in it from `_draw()`.
- [x] Add the color and on-color tokens, the gap border, the container query that hides text in small rectangles, and a `forced-colors: active` block to `_treemap-chart.scss`.
- [x] Add a treemap rectangle entry to the drawn-mark table in `tests/forced-colors.test.js`, beside the column and bar chart tracks. It names `.treemap-chart-box::before`, which draws the fill.
- [x] Rebuild, rerun the file and `tests/forced-colors.test.js`, and update the budget lines.

Completion check: V1 to V3 and V7 pass, V3 in all three engines.

Covers: R5, R6, R14; V3, V7, V9.

## 3. Keyboard, pointer, tooltip and update()

Outcome: every drawn rectangle is reachable from the plot's tab stop and by pointer, the tooltip names it with its share, and `update()` and `data-watch` redraw in place.

Prerequisites: group 1.

- [x] Add the V4, V5 and V6 cases and confirm they fail.
- [x] Override `show()`, `_place()`, `_indexAt()` and `_keyTarget()` so they skip rows without a rectangle, add the share to the tooltip, and outline the highlighted rectangle.
- [x] Rebuild and rerun until they pass, then run `tests/chart-update-browser.test.js` and `tests/chart-watch-browser.test.js` one at a time.

Completion check: V1 to V6 pass in all three engines, and the two existing chart files pass.

Covers: R7, R8, R9, R10, R11; V4, V5, V6, V10.

## 4. Docs, generated files and repository checks

Outcome: the chart has docs and decision data, generated files are fresh, and the contributor checks pass.

Prerequisites: groups 2 and 3.

- [x] Add the "Treemap chart" section to `llm.md` and the chart to both AutoInit tables there and in `docs/src/pages/auto-init.astro`.
- [x] Add `docs/src/pages/treemap-chart.astro` with live examples, the nav entry in `docs/src/data/nav.ts`, the entry in `docs/src/data/component-decisions.json` with its `sourceRevision` pin, and the hand-written entry in `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`.
- [x] Raise the guide counts and the basic-button reading budget in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`.
- [x] Add an Added entry to the Unreleased section of `CHANGELOG.md`.
- [x] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [x] Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. Rerun a failure alone before debugging it.
- [x] Record each result in validation.md.

Completion check: every check in validation.md shows a result, and none failed for a reason this change causes.

Covers: R11, R12, R13, R14; V8, V9, V10.
