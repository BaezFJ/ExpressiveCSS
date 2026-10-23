# Validation: data table sticky first column

Roadmap phase: Phase 31, data table sticky first column. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending, since the feature is not built. Tests run against built bundles, so run `npm run build:css` (or `npm run build`) first. Run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V6 are Playwright cases in `tests/data-table-browser.test.js`, run in Chromium, Firefox and WebKit with `node --test tests/data-table-browser.test.js`. Each should be seen failing against the bundle built before the change.

Fixture: a page with `dir="ltr"` and again with `dir="rtl"`. A `.data-table` wrapper with the modifier, a fixed inline size (for example 400px) and a `max-block-size`, around a table with a caption, a checkbox header and body column, a `th scope="row"` name column, at least six other columns and enough rows to scroll vertically. A second table under the modifier has no checkbox column. A third table without the modifier has the checkbox column.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1 | The table without a checkbox column, in each engine and direction. | Scroll the wrapper sideways to its far end. Read the bounding rect of the wrapper's padding box and of the first cell in the header row, a body row and the footer row. | Each first cell's inline-start edge equals the wrapper's inline-start inner edge (left in LTR, right in RTL), within 1px. A cell in the third column has moved by the scroll distance. | Pending |
| V2 | R2 | The table with a checkbox column, in each engine and direction. | Scroll sideways to the far end. Read the rects of the checkbox cell and the name cell in the header and a body row. | The checkbox cell sits at the inline-start inner edge, and the name cell's inline-start edge meets the checkbox cell's inline-end edge within 1px. The checkbox cell's inline size equals the token's computed value. | Pending |
| V3 | R3 | The table with a checkbox column, scrolled sideways and down so the header row overlaps body rows. | Call `document.elementFromPoint` at the center of the corner name header cell, at a point inside a scrolled header cell, and at a point inside a pinned body cell just below the header row. | The corner point hits the pinned header cell (or its content). The scrolled-header point hits a header cell, not a body cell. The pinned-body point hits the pinned body cell, not a scrolled body cell under it. | Pending |
| V4 | R4 | The table with a checkbox column, scrolled sideways so a scrolled cell lies under the pinned name cell. | Call `elementFromPoint` inside the pinned name cell over that spot, and read the pinned cell's computed background. | The hit is the pinned cell or its content, and its computed background color is opaque (alpha 1). | Pending |
| V5 | R4 | The same table with one row's checkbox checked. Hover the pointer over a different row. | Read the computed background of the pinned cells and of a scrolled cell in the selected row and in the hovered row. Compare the pinned cell in the selected row with a probe element painted `--md-comp-data-table-selected-container-color`. | The selected row's pinned cells show the selected color. The hovered row's pinned cells differ from an idle row's pinned cells and show the hover state layer over the container color. | Pending |
| V6 | R5, R6 | All three tables. | Read the computed `border-inline-end` of the last pinned cell in each row of the first two tables, and the checkbox cell's inline size, `position` and `z-index` of header cells in the table without the modifier. | Last pinned cells have a 1px solid border in the outline color. In the table without the modifier, cells are not pinned, header cells keep `z-index: 1`, and the checkbox cell has the same inline size as on the base commit. | Pending |
| V7 | R8 | A fresh `npm run build`. | `node --test tests/selective-builds.test.js`. | The test passes with a reviewed CSS budget line naming this change and its gzip bytes. JavaScript size is unchanged. | Pending |
| V8 | R7 | Plan group 2 edits. | `npm run build:skill`, then `npm run check:generated` and `node --test tests/semantics.test.js`. Read the new subsections in `llm.md` and the docs page, and the changelog entry. | Generation is clean and the semantics checks pass on the new examples. Both docs name the modifier, the checkbox pairing, the token and the `colspan` limit. The changelog has the Added entry. | Pending |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | R1 to R8 | Run `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time. | All pass, including the existing data table, data tables behavior and sortable tests, and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Pending |

## Manual checks

None. The user left a manual visual check out of the merge conditions.

## Merge conditions

- V1 to V9 pass, and V1 to V5 were seen failing before the change.
- `npm run build:skill` ran after the last edit, and `npm run check:generated` is clean.
- The repository's required CI checks and review pass on the pull request.
