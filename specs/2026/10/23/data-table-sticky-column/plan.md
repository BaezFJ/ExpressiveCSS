# Plan: data table sticky first column

Roadmap phase: Phase 31, data table sticky first column. Branch `feature/2026-10-23-data-table-sticky-column` from `origin/master` at `7233e5714`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed. The CSS budget line goes into whichever group first changes `dist/css/expressive.css`, because `tests/selective-builds.test.js` fails without it.

## 1. Pinned column and geometry test

Outcome: the modifier pins the first column, and the name cell after a checkbox cell, at the wrapper's inline-start edge in all three engines, with the corner header cell on top.

Prerequisites: none.

- [x] Add a case to `tests/data-table-browser.test.js` inside the `for (const [name, engine, test] of engines)` loop. Build a table wider than its wrapper, with a checkbox column, a `th scope="row"` name column and enough other columns to scroll, under the modifier. Cover V1 to V3 and V6.
- [x] Run `npm run build:css` and `node --test tests/data-table-browser.test.js`. Confirm the new case fails and the existing cases pass.
- [x] Measure the checkbox cell's rendered width on the base commit in each engine, and pick the token default from it.
- [x] In `src/sass/components/_data-table.scss`, add `--md-comp-data-table-checkbox-column-width` to the token list and the header comment, then add the modifier block: sticky first cells, the paired cell after a checkbox cell, the fixed checkbox width, the stacking order and the inline-end divider.
- [x] Rebuild and rerun the file until it passes. Add the reviewed CSS budget line and raise the bound to the measured size.

Completion check: `node --test tests/data-table-browser.test.js` and `node --test tests/selective-builds.test.js` pass.

Covers: R1, R2, R3, R5, R6, R8; V1, V2, V3, V6, V7.

## 2. Row states on pinned cells, and docs

Outcome: pinned cells are opaque and follow their row's hover and selected state, and the docs teach the modifier.

Prerequisites: group 1.

- [x] Add the V4 and V5 cases to the same test file and confirm they fail.
- [x] Give pinned cells the container color with the row's state layered on top, through a private custom property set by the existing hover and selected row rules.
- [x] Rebuild, rerun the file until it passes, and update the budget line.
- [x] Add a "Sticky first column" subsection to the "Data table" section of `llm.md`, with an example that has a checkbox column, and add the token to its token table. Mention the `colspan` limit and the checkbox width token.
- [x] Add the same subsection and a live example to `docs/src/pages/data-table.astro`.
- [x] Add an Added entry to the Unreleased section of `CHANGELOG.md`.

Completion check: `node --test tests/data-table-browser.test.js` passes, and `node --test tests/semantics.test.js` passes on the new examples.

Covers: R4, R7; V4, V5, V8.

## 3. Budget and repository checks

Outcome: the change has a reviewed size, fresh generated files and passing contributor checks.

Prerequisites: group 2.

- [ ] Run `npm run build`, then `node --test tests/selective-builds.test.js`, and confirm the budget line matches the final size.
- [ ] Run `npm run build:skill` as the last generation step, then `npm run check:generated`.
- [ ] Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. Rerun a failure alone before debugging it.
- [ ] Record each result in validation.md.

Completion check: every check in validation.md shows a result, and none failed for a reason this change causes.

Covers: R8; V7, V8, V9.
