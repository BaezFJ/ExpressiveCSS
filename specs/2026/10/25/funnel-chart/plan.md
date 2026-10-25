# Plan: funnel chart

Roadmap phase: [Phase 49, funnel chart](../../../../roadmap.md#phase-49-funnel-chart). Branch `feature/2026-10-25-funnel-chart` from `origin/master` at `a9bbf77ad`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. No group edits shared chart code beyond making a `LineChart` member protected.

## 1. Register the chart and size its stages

Outcome: `.funnel-chart` starts from AutoInit and draws one centered stage per row, sized from the first value column, in left-to-right and right-to-left pages.

Prerequisites: none.

- [ ] Add the `semantics.json` rule first, since the semantics roster test fails for a registered component without one, and run `npm run build:semantics`.
- [ ] Add `tests/funnel-chart-browser.test.js` with the V1 and V2 cases, following `tests/scatter-chart-browser.test.js`. Run `npm run build` and the file, and confirm both fail.
- [ ] Add `src/ts/components/funnelChart.ts` with `FunnelChart extends LineChart`: `_type`, `_horizontal`, `_axis`, `_points`, and `_draw()` for the stages. Make any `LineChart` member it needs protected without changing its behavior.
- [ ] Register it in `src/ts/components/registry.ts`, `index.ts` and `src/ts/modular.ts`. Add the AutoInit fixture to `tests/fixtures.js` and raise `AUTO_INIT_FIXTURES.length` in `tests/autoinit.test.js`.
- [ ] Add `src/sass/components/_funnel-chart.scss`, forward it from `src/sass/components/_index.scss`, and add `.funnel-chart` to `$_media-figure` in `_cards.scss` and to the regexes in `tests/cards.test.js`.
- [ ] Rebuild and rerun until V1 and V2 pass. Add the reviewed JavaScript and CSS budget lines.

Completion check: `node --test tests/funnel-chart-browser.test.js` passes V1 and V2 in Chromium, Firefox and WebKit, and `node --test tests/selective-builds.test.js tests/autoinit.test.js tests/cards.test.js tests/semantics.test.js` passes.

Covers: R1, R2, R3, R11, R13; V1, V2, V10.

## 2. Labels, tooltip, keyboard and pointer

Outcome: each row's label sits beside its stage, every row is reachable from the plot's tab stop and by pointer, and the tooltip gives each stage's percentage of the first.

Prerequisites: group 1.

- [ ] Add the V3 to V6 cases and confirm the new ones fail.
- [ ] Override `_guides()` to drop the legend, `show()` to append the percentage, and `_place()` to put the tooltip beside the highlighted row.
- [ ] Lay out the label column at the inline start in the Sass, as the bar chart does.
- [ ] Rebuild, rerun the file, and update the budget lines.

Completion check: V1 to V6 pass in all three engines.

Covers: R4, R5, R6, R7, R8; V3, V4, V5, V6.

## 3. update() and data-watch

Outcome: stages change width on `update()`, without motion when the reader prefers less, and redraw under `data-watch`.

Prerequisites: group 2.

- [ ] Add the V7 and V8 cases and record which fail.
- [ ] Write each stage's `--from-width` from `_before` in `_draw()`, and add the `@starting-style` motion rule under `prefers-reduced-motion: no-preference`.
- [ ] Rebuild, rerun the funnel file, then `tests/chart-update-browser.test.js`, `tests/chart-watch-browser.test.js` and `tests/chart-transition-browser.test.js`, one at a time.

Completion check: V1 to V8 pass in all three engines, and the three shared chart files pass.

Covers: R9, R10; V7, V8, V11.

## 4. Guidance, docs and pins

Outcome: authors and agents can find and use the funnel chart from `llm.md`, the docs site, the skill and the MCP server.

Prerequisites: group 3, so the documented behavior matches the code.

- [ ] Write the "Funnel chart" section in `llm.md` and add the component to its two AutoInit tables.
- [ ] Add `docs/src/pages/funnel-chart.astro`, its entry in `docs/src/data/nav.ts`, and its row in `docs/src/pages/auto-init.astro`.
- [ ] Add the component decision record to `docs/src/data/component-decisions.json`, the hand-written entry in `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`, and the capability roadmap pin with its `sourceRevision`.
- [ ] Add the Added entry under Unreleased in `CHANGELOG.md`.
- [ ] Raise the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the basic-button reading budget if it grows.
- [ ] Run `npm run build:skill` last, then `npm run check:generated`.

Completion check: V9 and V10 pass.

Covers: R11, R12, R13; V9, V10.

## 5. Regression and merge checks

Outcome: the change passes every required check, and no other chart changed behavior.

Prerequisites: groups 1 to 4.

- [ ] Run the V11 chart files one at a time, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, as V12 lists.
- [ ] Rerun any failure in a file this change does not touch alone before debugging it.
- [ ] Record each result in [validation.md](validation.md).

Completion check: V11 and V12 pass, and every merge condition in validation.md holds.

Covers: R10, and R1 to R13 together; V11, V12.
