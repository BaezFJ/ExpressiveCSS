# Plan: charts that follow their table

Roadmap phase: Phase 23, charts that follow their table. Branch `feature/2026-10-21-chart-table-sync` from `origin/master` at `8d45c2c4`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

Groups 1 to 4 were implemented and checked on 2026-10-21. The code, tests, docs and budget go into one commit, so every commit passes `npm test`.

## 1. Failing browser test

Outcome: a new browser test describes the watch contract and fails against the current bundle.

Prerequisites: none.

- [x] Add `tests/chart-watch-browser.test.js`, modelled on `tests/chart-update-browser.test.js`, so it does not collide with Phase 22's edits to that file. Count redraws by wrapping the instance's `update()` and by checking that the plot node was replaced.
- [x] Cover the roadmap check: edit a cell and add a row in one run, and the chart redraws once with the new data (V1). Then cover two batches (V2), the unwatched default (V3), attribute and text-node changes (V4), a gained and a replaced table (V5), `destroy()` (V6), changes outside the data, a narrow chart and a manual `update()` in the same run (V7), and the `watch` option with a heatmap and a pie chart (V8). Settle each change with a frame and a timeout, so label thinning's `ResizeObserver` has run before a no-redraw assertion.
- [x] Build with `npm run build:js` and run the file in Chromium only with `EXPRESSIVECSS_TEST_BROWSER=chromium node --test tests/chart-watch-browser.test.js`. Confirm the watch cases fail and the unwatched case passes.

Completion check: only the cases that need watching fail.

Covers: R1 to R7; V1 to V8.

## 2. The watch

Outcome: a watching chart redraws once per batch of table changes and stops on `destroy()`.

Prerequisites: group 1.

- [x] In `src/ts/components/lineChart.ts`, add `watch: boolean` with a doc comment to `LineChartOptions` and `watch: false` to `_defaults`.
- [x] Add a module helper that tells whether records touched the data: a record whose target is not the figure, or one that adds or removes a `<table>`.
- [x] Add a `_tableWatch: MutationObserver | null = null` field. In the constructor, create it when `options.watch` is true or the figure has `data-watch`, with a callback that calls `this.update()` (a dynamic call, so subclass overrides run) when the helper says the data changed, then call `_watch()`.
- [x] Add `_watch()`: return without an observer; otherwise disconnect, observe the figure with `{ childList: true }`, and, when there is a `:scope > table`, observe it with `{ subtree: true, childList: true, characterData: true, attributeFilter: ['data-value', 'class', 'data-label'] }`.
- [x] Add `this._watch()` as the last line of `update()`, and disconnect the observer in `destroy()`.
- [x] Update the doc comments of `LineChart` and every subclass that say to call `update()` after changing the table.
- [x] Build, then run `tests/chart-watch-browser.test.js` in all three engines, one engine at a time if a run flakes.

Completion check: V1 to V8 pass in Chromium, Firefox and WebKit.

Covers: R1 to R8; V1 to V8, V12.

## 3. Regression checks

Outcome: existing chart behavior is unchanged.

Prerequisites: group 2.

- [x] Run the existing chart browser tests one file at a time: `chart-update`, `chart-legend-toggle`, `line-chart`, `column-chart`, `bar-chart`, `mixed-chart`, `pie-chart`, `heatmap-chart`, `radar-chart`, `radial-chart` and `chart-axis`.
- [x] Run the jsdom suites that load chart markup (`node --test` on files that grep finds referencing chart classes).

Completion check: V9 passes.

Covers: R2, R5, R7; V9.

## 4. Docs, generated guidance and budget

Outcome: authors and agents can find the opt-in, and the bundle growth is reviewed.

Prerequisites: group 2.

- [x] In the Line chart section of `llm.md`, add the watch to the `update()` bullet: `data-watch` or the `watch` option redraws on table changes, once per synchronous run of edits, read at start, and every chart type takes it; `update()` stays for pages that do not opt in and for figure attribute changes. In the other chart sections, add `data-watch` to the sentence that says to call `update()`.
- [x] In `docs/src/pages/line-chart.astro`, describe `data-watch` in the cards section, switch the revenue card example to `data-watch` and drop its `update()` call, mention the watch in the JavaScript section, and add a `watch` row to the options table. On the other chart docs pages, add `data-watch` where they say to call `update()`.
- [x] Add an Unreleased Added entry to `CHANGELOG.md`.
- [x] Run `npm run build:skill`, then `npm run check:generated`.
- [x] Build, run `node --test tests/selective-builds.test.js`, and add the reviewed gzip budget lines it asks for.

Completion check: V10 and V11 pass.

Covers: R9, R10; V10, V11.

## 5. Final checks

Prerequisites: groups 1 to 4.

- [x] Run the fallow audit against `origin/master` and confirm no introduced finding blocks (V12).
- [x] Run `npm run verify` once, then `npm test --prefix mcp/expressivecss` (V13).
- [ ] Record results in [validation.md](validation.md) and have an independent reviewer trace each `R` ID to code and evidence.

Covers: R8; V12, V13.
