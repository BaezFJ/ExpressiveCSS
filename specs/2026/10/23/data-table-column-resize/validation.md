# Validation: data table column resize

Roadmap phase: Phase 32, data table column resize. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check below on 2026-10-23 on branch `feature/2026-10-23-data-table-column-resize`. Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V8 are Playwright cases in `tests/data-tables-browser.test.js`, run with `node --test tests/data-tables-browser.test.js` in Chromium, Firefox and WebKit. Against the bundle built before each group's change, V1, V3 and V7 failed in all three engines (no `setWidth`, and a handle click sorted the column), and V2, V5 and V6 failed after group 1. V4 passed before the change because nothing resized, so it was tightened to also assert that the pinned column grew. All 27 cases in the file pass.

Fixture: a page with `dir="ltr"`, and for V5 again with `dir="rtl"`. A `.data-table` wrapper with `data-sort` and a fixed inline size (for example 600px), around a table whose header has a sortable "Customer" column with a handle, a "Status" column with a handle, a numeric "Total" column with a handle, and one column without a handle. A second table has `.sticky-column`, a checkbox column and a handle on its name column.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R2, R6, R8 | The first table in each engine; listen for `expressive:resize` and `expressive:sort` on the wrapper. | Drag the "Status" handle 60px toward the inline-end side and release. | "Status" is 60px wider, within 1px. Every other column's width is unchanged within 1px. Exactly one `expressive:resize` fired, with the "Status" header, its column index and the new width. Seen failing before the change. | Passed 2026-10-23 in Chromium, Firefox and WebKit. Seen failing before group 1. |
| V2 | R3, R6 | The same table; focus the "Status" handle. | Press ArrowRight, then Shift+ArrowRight. | The column widens by 16px, then by 64px, within 1px. One `expressive:resize` fired per press. Seen failing before the change. | Passed 2026-10-23 in all three engines. Seen failing before group 2. |
| V3 | R9 | The same table. | Click the "Customer" handle, drag it, and press Enter on it. | The row order, every `aria-sort` attribute and the header's arrow are unchanged, and no `expressive:sort` fired. The handle's computed style has no sort arrow `::after` content. | Passed 2026-10-23 in all three engines. Seen failing before group 1: the handle click sorted the column. |
| V4 | R10 | The `.sticky-column` table, scrolled sideways to its end. | Drag the name column's handle 60px wider, then scroll sideways to the end again. | The checkbox cell and the name cell are still pinned at the wrapper's inline-start edge, and the name cell's inline-start edge meets the checkbox cell's inline-end edge within 1px. | Passed 2026-10-23 in all three engines, with the added check that the name column grew by 60px. |
| V5 | R2, R3 | The first table under `dir="rtl"`. | Press ArrowLeft on the "Status" handle, then drag the handle 60px to the left. | Both actions widen the column, by 16px and 60px within 1px. Non-blocking. | Passed 2026-10-23 in all three engines. |
| V6 | R4, R5 | The first table; focus the "Status" handle. | Press Home, then ArrowLeft. Then click the handle three times, and press Space once. | Home sets the token's minimum (48px by default) and fires one event; ArrowLeft at the minimum changes nothing and fires none. The clicks step to the middle width, the wide width (the wrapper's inner width), then back to the minimum, and Space steps to the middle again. The click that ends a V1 drag does not step. Non-blocking. | Passed 2026-10-23 in all three engines. V1 also covers the drag-ending click: the width after a drag equals the drag distance. |
| V7 | R7 | The first table. | Call `Expressive.DataTables.setWidth(header, 30)`, then `setWidth(header, 200)`, and read `DataTables.width(header)` after each. | The width is the minimum, then 200, within 1px, and no `expressive:resize` fired. Non-blocking. | Passed 2026-10-23 in all three engines. |
| V8 | R1, R11 | The first table, and a copy with no handles. | Read the column widths of the copy and compare them with the same table on the base commit. Read the handle's computed `cursor` and position, and its outline when focused. | The copy without handles matches the base commit within 1px. The handle's cursor is `col-resize`, it sits at the cell's inline-end edge, and focus draws a visible outline. Non-blocking. | Passed 2026-10-23 in all three engines, except the comparison with the base commit's widths, which was not run. The test checks that a table without handles has no inline style and the automatic layout, and the V6 case checks the focus outline. |
| V9 | R12 | Plan group 3 edits. | Run `node --test tests/semantics.test.js`, and check the rules against a named and an unnamed handle. | A rule flags the unnamed handle only, and the docs examples pass. | Passed 2026-10-23. A probe through `scripts/semantics-rules.mjs` flagged the unnamed handle with the existing `drag-handle-button-is-named` rule and passed the named one, so no new rule was added. `tests/semantics.test.js` passed with the new examples. |
| V10 | R12 | Plan group 3 edits. | Run `npm run build:skill`, then `npm run check:generated`. Read the new llm.md subsection, the events table, the docs page and the changelog. | Generation is clean. Both docs cover the handle, keys, click steps, token, event, script methods, saving widths and the checkbox column limit. The changelog has the Added entry. | Passed 2026-10-23: `build:skill` then `check:generated` clean. llm.md, the docs page, the drag handle docs (now four places that wire the handle) and the changelog are updated. |
| V11 | R13 | A fresh `npm run build`. | `node --test tests/selective-builds.test.js`. | The test passes with reviewed CSS and JavaScript budget lines naming this change. | Passed 2026-10-23: JavaScript 89,737 gzip bytes (+583 over 89,154, in two lines) and CSS 85,486 (+86 over 85,400, in two lines). |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V12 | R1 to R13 | Run `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time. | All pass, including the existing data table, data tables behavior, sticky column and pane resize tests, and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Passed 2026-10-23 on the final tree: `npm run verify` ran 2,621 tests and all passed, followed by `check:generated`, `docs:build:astro` and `docs:verify`. The MCP smoke test and `npm run verify:packages` (`@expressivecss/mcp-server@0.4.1`) passed. An earlier `verify` run failed one test, `tests/drag-handle.test.js`, whose selector filter took the sort rules' `:not(.drag-handle)` for a handle style; the filter was fixed and the full run repeated. |

## Manual checks

None required. The user left manual visual and screen reader checks out of the merge conditions. The agent took one Chromium screenshot of a regular and a dense table with handles. It showed the sort button's end overlapping the handle's 24px hit area in a numeric column, so resizable header cells now take at least 24px of end padding. The cost is that a numeric header's text ends 8px short of its values. No screen reader was used.

## Merge conditions

- V1, V2, V3 and V4 pass, and V1 and V2 were seen failing before the change. Met locally on 2026-10-23.
- V9 to V12 pass, `npm run build:skill` ran after the last edit, and `npm run check:generated` is clean. Met locally on 2026-10-23.
- V5 to V8 have run and their results are recorded. Met locally on 2026-10-23. A failure there does not block merge, but it gets a note in the pull request.
- The repository's required CI checks and review pass on the pull request. Pending: no pull request is open.
