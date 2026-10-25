# Plan: sankey chart

Roadmap phase: Phase 51, sankey chart. Branch `feature/2026-10-25-sankey-chart` from `origin/master` at `a9bbf77ad`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them.

## 1. Register the chart and lay out nodes and links

Outcome: `.sankey-chart` starts from AutoInit, reads source, target and value, and draws nodes and links on one scale, with the rows R3 names left out.

Prerequisites: none.

- [x] Add `tests/sankey-chart-browser.test.js` with the V1 and V2 cases, following `tests/scatter-chart-browser.test.js`. Run `npm run build` and the file, and confirm both fail.
- [x] Add the `sankey-chart` rules to `semantics.json` and run `npm run build:semantics`, because the semantics roster test fails for a registered component without a row.
- [x] Add `src/ts/components/sankeyChart.ts` with `SankeyChart extends LineChart`: `_type`, `_axis`, `_seriesFrom`, `_seriesTo`, the `_read()` override for targets, the layout function and `_draw()` for node and link paths.
- [x] Register it in `src/ts/components/registry.ts`, `index.ts` and `src/ts/modular.ts`, add the AutoInit fixture to `tests/fixtures.js`, and raise the fixture count in `tests/autoinit.test.js`.
- [x] Add `src/sass/components/_sankey-chart.scss`, forward it from `src/sass/components/_index.scss`, and add the class to `$_media-figure` in `_cards.scss` and the regexes in `tests/cards.test.js`.
- [x] Rebuild and rerun until V1 and V2 pass. Add the reviewed JavaScript and CSS budget lines.

Completion check: `node --test tests/sankey-chart-browser.test.js` passes V1 and V2 in Chromium, Firefox and WebKit, and `node --test tests/selective-builds.test.js tests/autoinit.test.js tests/semantics.test.js tests/cards.test.js` passes.

Covers: R1, R2, R3, R4, R5, R6, R7, R15, R17; V1, V2, V9.

## 2. Node labels, colors and right-to-left

Outcome: each node shows its name on the correct side, nodes and links take their colors, and the chart mirrors in a right-to-left page.

Prerequisites: group 1.

- [ ] Add the V3 case and confirm it fails.
- [ ] Draw the labels as HTML spans placed by percent, set `data-series` on nodes and links, and mirror the columns when `_reversed` is set.
- [ ] Add the label placement, colors and link opacity token to the Sass.
- [ ] Rebuild, rerun the file, and update the budget lines.

Completion check: V1 to V3 pass in all three engines.

Covers: R8, R9, R17; V3, V9.

## 3. Keyboard, pointer and tooltip

Outcome: every drawn link is reachable from the plot's tab stop and by pointer, and the tooltip names it.

Prerequisites: group 1.

- [ ] Add the V4 and V5 cases and confirm they fail.
- [ ] Override `_count`, `show()`, `_place()`, `_keyTarget()` and `_indexAt()` with the link numbering from the requirements' proposals, and mark the active link.
- [ ] Rebuild and rerun until they pass.

Completion check: V1 to V5 pass in all three engines.

Covers: R10, R11, R12; V4, V5.

## 4. update() and data-watch

Outcome: links and nodes move on `update()`, and the chart redraws under `data-watch`.

Prerequisites: groups 2 and 3.

- [ ] Add the V6 case and record what fails.
- [ ] Fix what it shows in `sankeyChart.ts`, or in the shared `LineChart` code when the fault is there, keeping the other charts' behavior.
- [ ] Rebuild, rerun the sankey file, then `tests/chart-update-browser.test.js`, `tests/chart-watch-browser.test.js` and `tests/chart-transition-browser.test.js`, one at a time.

Completion check: V1 to V6 pass in all three engines, and the three existing chart files pass.

Covers: R13, R14; V6, V10.

## 5. Docs, generated files and repository checks

Outcome: the chart has docs, generated files are fresh, and the contributor checks pass.

Prerequisites: group 4.

- [ ] Add the "Sankey chart" section to `llm.md` and the chart to its two AutoInit tables, `docs/src/pages/sankey-chart.astro` with live examples, the nav entry in `docs/src/data/nav.ts`, the row in `docs/src/pages/auto-init.astro`, the entry in `docs/src/data/component-decisions.json` with its `sourceRevision` pin, and the hand-written entry in `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`.
- [ ] Raise the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the basic-button reading budget.
- [ ] Add an Added entry to the Unreleased section of `CHANGELOG.md`.
- [ ] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [ ] Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. Rerun a failure alone before debugging it.
- [ ] Record each result in validation.md.

Completion check: every check in validation.md shows a result, and none failed for a reason this change caused.

Covers: R14, R15, R16, R17; V7, V8, V9, V10.
