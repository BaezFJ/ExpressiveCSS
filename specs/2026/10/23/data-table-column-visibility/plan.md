# Plan: data table column visibility

Roadmap phase: Phase 33, data table column visibility. Branch `feature/2026-10-23-data-table-column-visibility` from `origin/master` at `d501bacf0`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. All three groups were implemented on 2026-10-23. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them.

## 1. Hide and show a column from a menu

Outcome: toggling a linked menu checkbox item hides or shows its column's header and cells, linked items apply at load and through `sync`, and an item with a bad link changes nothing.

Prerequisites: none.

- [x] Add the V1 case to `tests/data-tables-browser.test.js` and the V6 and V7 cases to `tests/data-tables.test.js`. Run `npm run build` and both files, and confirm the new cases fail and the existing ones pass.
- [x] In `src/ts/behaviors/dataTables.ts`, add the document listener for Menu's `expressive:change`, the lookup from `data-column` to a first-row header cell, and the hiding and showing of that column's cells with `headerColumns()` and `cellAt()`.
- [x] Apply the linked items in the load-time pass and in `sync(wrapper)`.
- [x] Rebuild and rerun both files until they pass. Add the reviewed JavaScript budget line.
- [x] Not planned: delete the global `display: table-cell` on `td, th`, which kept `hidden` cells showing, with a reviewed CSS budget line. Committed on its own as a fix.

Completion check: `node --test tests/data-tables-browser.test.js`, `node --test tests/data-tables.test.js` and `node --test tests/selective-builds.test.js` pass.

Covers: R1, R2, R3, R4, R5, R10, R12; V1, V6, V7, V9.

## 2. Sort, resize, sticky column and detail rows

Outcome: a hidden column works with sorting, resized widths, pinned columns and expanded detail rows.

Prerequisites: group 1.

- [x] Add the V2 to V5 cases to `tests/data-tables-browser.test.js`, rebuild, and record which fail.
- [x] Make `freeze()` skip hidden first-row cells and `fit()` sum only visible ones, and give a column shown under the fixed layout without an inline width its content width, no narrower than the minimum token.
- [x] Fix any sort, sticky column or detail row failure the cases show, in the shared code those features already use.
- [x] Rebuild, rerun the file until it passes, and update the budget lines.

Completion check: `node --test tests/data-tables-browser.test.js` passes in Chromium, Firefox and WebKit.

Covers: R6, R7, R8, R9, R12; V2, V3, V4, V5, V9.

## 3. Docs and repository checks

Outcome: the feature is documented, generated files are fresh, and the contributor checks pass.

Prerequisites: group 2.

- [x] Add a "Column visibility" subsection to the "Data table" section of `llm.md`, with a menu and table example, the load-time state, `sync`, saving and restoring the state from `expressive:change`, and the columns to leave out of the menu.
- [x] Add the same subsection and a live example to `docs/src/pages/data-table.astro`.
- [x] Add an Added entry to the Unreleased section of `CHANGELOG.md`.
- [x] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [x] Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. Rerun a failure alone before debugging it.
- [x] Record each result in validation.md.

Completion check: every check in validation.md shows a result, and none failed for a reason this change causes.

Covers: R11, R12; V8, V9, V10.
