# Validation: data table column visibility

Roadmap phase: Phase 33, data table column visibility. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check below on 2026-10-23 on branch `feature/2026-10-23-data-table-column-visibility`. Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake. The test file names exist on the base commit; the commands follow the ones phase 32 ran.

## Automated checks

V1 to V5 are Playwright cases in `tests/data-tables-browser.test.js`, run with `node --test tests/data-tables-browser.test.js` in Chromium, Firefox and WebKit. V6 and V7 are jsdom cases in `tests/data-tables.test.js`, run with `node --test tests/data-tables.test.js`. Each case tears down its menu and listeners in a `finally` block. All 39 cases in the browser file and all 12 in the jsdom file pass. A review on 2026-10-24 added a 40th browser case, a toggle and table inside a shadow root, after a mutation that looked the id up in `document` survived. It is a browser case because jsdom's `:scope` matches nothing inside a shadow tree. The second table has its own items, which V4 and V5 set from script and apply with `sync`, and V5 uses a third, plain table with an expanded detail row.

Fixture: a page with an initialized Menu whose trigger sits in a `.data-table-actions` bar. The menu has `menuitemcheckbox` items with `data-column` for the "Status", "Region" and "Total" header cells, all `aria-checked="true"`. The `.data-table` has `data-sort` and a fixed inline size, and its table has a checkbox column, a row header "Account", then "Status", "Region", a numeric "Total" with a resize handle, and "Owner". One row has an expanded detail row. A second copy of the table has `.sticky-column`.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | The first table in each engine. | Uncheck the "Region" item from the menu, then check it again. | After unchecking, the "Region" header and every body and footer cell of that column are hidden, and the other columns' cells are visible. After checking, all of them show again. Seen failing before the change. | Passed 2026-10-23 in Chromium, Firefox and WebKit. Seen failing before group 1: the item unchecked at load left its column showing. The case also finds no Region column header in the accessibility tree while it is hidden. |
| V2 | R6 | The first table, with "Region" hidden. | Press the "Total" sort button, then check "Region" again. | Rows are ordered by "Total", and `aria-sort` sits on "Total". Each shown "Region" cell is in the same row as before the sort. | Passed 2026-10-23 in all three engines. It passed before group 2 too; sorting needed no change. |
| V3 | R7 | The first table. | Drag the "Total" handle 60px wider. Read every column's width. Uncheck "Status", then check it. | Hiding and showing "Status" leaves every other column's width unchanged within 1px. While "Status" is hidden, the table's width equals the sum of the visible columns within 1px. "Status" returns at its width from before it hid, within 1px. | Passed 2026-10-23 in all three engines, with Owner, hidden since load, shown last: it came back at 61px and the other columns kept their widths. Seen failing before group 2: the first column measured 42.8px against 34px once Status hid. |
| V4 | R8 | The `.sticky-column` copy, scrolled sideways to its end. | Uncheck "Region", then scroll sideways to the end again. | The checkbox cell and the "Account" cell stay pinned at the wrapper's inline-start edge, and the "Account" cell's inline-start edge meets the checkbox cell's inline-end edge within 1px. | Passed 2026-10-23 in all three engines, with the column hidden through `sync`. No code change was needed. |
| V5 | R9 | The first table, with its detail row expanded. | Uncheck "Status". | The detail row is visible, and its cell spans the table's visible width within 1px. | Passed 2026-10-23 in all three engines. No code change was needed. |
| V6 | R3, R10 | jsdom: the fixture with the "Owner" item at `aria-checked="false"` before the behavior starts, and a second table and menu inserted after load. | Start the behavior. Then insert the second table with one unchecked item, and call `DataTables.sync(wrapper)` on it. | The "Owner" column is hidden at load. The second table's linked column is hidden after `sync`. No data table event fires for either. Non-blocking. | Passed 2026-10-23 for `sync`, which hid and then showed the column. The load-time state is checked in the browser by V1, because jsdom starts the behavior once when `setup.js` loads. The case does not listen for events; `sync` has no emit call. |
| V7 | R2, R4, R5 | jsdom: items naming a missing id, a `<div>`, a header cell spanning two columns, and a second-row header of a grouped header. A body row with a cell spanning two columns. A cell the author hid with `hidden`. | Toggle each item, then hide and show the column that holds the spanning and author-hidden cells. | The four items toggle `aria-checked` and change no table, and nothing throws. The spanning cell stays visible. The author-hidden cell stays hidden after the column shows again. A table with no linked items has no attribute the change added. Non-blocking. | Passed 2026-10-23 in two jsdom cases, including a footer row and a cell spanning the two hidden columns. |
| V8 | R11 | Plan group 3 edits. | Run `npm run build:skill`, then `npm run check:generated`. Read the new llm.md subsection, the docs page and the changelog. | Generation is clean. Both docs cover the `data-column` link, load-time state, `sync`, saving and restoring the state, and the columns to leave out. The changelog has the Added entry. Non-blocking, except that CI's generated-file check blocks. | Passed 2026-10-23: `build:skill` then `check:generated` clean. llm.md has a "Column visibility" subsection and a line under row selection that `sync` applies the toggles. The docs page has the section with a live example, and the changelog has the Added entry and a Fixed entry for the CSS change. |
| V9 | R12 | A fresh `npm run build`. | `node --test tests/selective-builds.test.js`. | The test passes with a reviewed JavaScript budget line naming this change, and a CSS line if the stylesheet changed. Non-blocking, except that CI runs this test. | Passed 2026-10-23: JavaScript 90,069 gzip bytes (+332 over 89,737, in two lines) and CSS 85,480 (-6 from 85,486, one line). |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V10 | R1 to R12 | Run `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time. | All pass, including the existing data table, sorting, select-all, sticky column, column resize and menu checkbox tests, and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Passed 2026-10-23 with no reruns: `npm run verify` ran 2,636 tests and all passed, followed by `check:generated`, `docs:build:astro` and `docs:verify`. The MCP smoke test and `npm run verify:packages` (`@expressivecss/mcp-server@0.4.1`) passed. |

## Manual checks

None required. The user left manual visual and screen reader checks out of the merge conditions.

## Merge conditions

- V1 to V5 pass in Chromium, Firefox and WebKit, and V1 was seen failing before the change. Met locally on 2026-10-23.
- V6 to V9 have run and their results are recorded. Met locally on 2026-10-23. A failure there does not block merge, but it gets a note in the pull request. CI's generated-file and budget checks still block on their own.
- V10 passes, and `npm run build:skill` ran after the last edit. Met locally on 2026-10-23.
- The repository's required CI checks and review pass on the pull request. Pending: no pull request is open.
