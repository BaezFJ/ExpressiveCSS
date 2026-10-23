# Plan: data table column resize

Roadmap phase: Phase 32, data table column resize. Branch `feature/2026-10-23-data-table-column-resize` from `origin/master` at `ddc223f6d`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them.

## 1. Pointer drag, width model and event

Outcome: dragging a handle resizes its column, the other columns keep their widths, one `expressive:resize` fires per drag, and the handle never sorts.

Prerequisites: none.

- [ ] Add cases to `tests/data-tables-browser.test.js` for V1, V3 and V4 in Chromium, Firefox and WebKit. Run `npm run build` and the file, and confirm the new cases fail and the existing ones pass.
- [ ] In `src/sass/components/_data-table.scss`, add the min width token to the token list and header comment, place the handle at the header cell's inline-end edge, and exclude `.drag-handle` from the `th > button` sort rules.
- [ ] In `src/ts/behaviors/dataTables.ts`, exclude the handle from the sort click selector, add the pointer drag, the width model, `width()` and `setWidth()`, and emit `resize` when a drag ends with a changed width.
- [ ] Rebuild and rerun the file until it passes. Add the reviewed CSS and JavaScript budget lines.

Completion check: `node --test tests/data-tables-browser.test.js` and `node --test tests/selective-builds.test.js` pass.

Covers: R1, R2, R5, R6, R7, R8, R9, R10, R11, R13; V1, V3, V4, V7, V8, V11.

## 2. Keyboard and click stepping

Outcome: arrows, Shift, Home, End, click, Enter and Space resize the column, mirrored in right-to-left pages, with one event per changed width.

Prerequisites: group 1.

- [ ] Add V2, V5 and V6 cases to the same file and confirm they fail.
- [ ] Add the keydown and click handlers to `dataTables.ts`, with the PaneResize step sizes and the drag guard on click.
- [ ] Rebuild, rerun the file until it passes, and update the budget lines.

Completion check: `node --test tests/data-tables-browser.test.js` passes.

Covers: R3, R4, R5, R6, R13; V2, V5, V6, V11.

## 3. Docs, semantics and repository checks

Outcome: the feature is documented and has a semantics rule, generated files are fresh, and the contributor checks pass.

Prerequisites: group 2.

- [ ] Add a "Column resize" subsection to the "Data table" section of `llm.md` with an example, add the token, and add `expressive:resize` to the events table. Cover saving and restoring widths and the checkbox column limit.
- [ ] Add the same subsection and a live example to `docs/src/pages/data-table.astro`.
- [ ] Add the `data-table-resize-handle-is-named` rule to `semantics.json`, run `npm run build:semantics`, and check it against a named and an unnamed handle.
- [ ] Add an Added entry to the Unreleased section of `CHANGELOG.md`.
- [ ] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [ ] Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. Rerun a failure alone before debugging it.
- [ ] Record each result in validation.md.

Completion check: every check in validation.md shows a result, and none failed for a reason this change causes.

Covers: R12, R13; V9, V10, V11, V12.
