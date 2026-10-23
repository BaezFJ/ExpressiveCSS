# Validation: data table sticky first column

Roadmap phase: Phase 31, data table sticky first column. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check below on 2026-10-23 on branch `feature/2026-10-23-data-table-sticky-column`. Tests run against built bundles, so run `npm run build:css` (or `npm run build`) first. Run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V6 are Playwright cases in `tests/data-table-browser.test.js`, run in Chromium, Firefox and WebKit with `node --test tests/data-table-browser.test.js`. Against the bundle built before the change, V1 failed in all three engines (the first header cell sat 801px off the scrollport edge). After plan group 1, V4 failed in all three engines on a transparent pinned cell (`rgba(0, 0, 0, 0)`). The V5 pixels are 1×1 screenshots decoded through a canvas in the page, compared with a tolerance of 2 per channel, because two scrolled cells of one row already differ by 1 in some engines.

Fixture: a page with `dir="ltr"` and again with `dir="rtl"`. A `.data-table` wrapper with the modifier, a fixed inline size (for example 400px) and a `max-block-size`, around a table with a caption, a checkbox header and body column, a `th scope="row"` name column, at least six other columns and enough rows to scroll vertically. A second table under the modifier has no checkbox column. A third table without the modifier has the checkbox column.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1 | The table without a checkbox column, in each engine and direction. | Scroll the wrapper sideways to its far end. Read the bounding rect of the wrapper's padding box and of the first cell in the header row, a body row and the footer row. | Each first cell's inline-start edge equals the wrapper's inline-start inner edge (left in LTR, right in RTL), within 1px. A cell in the third column has moved by the scroll distance. | Passed 2026-10-23 in Chromium, Firefox and WebKit, LTR and RTL. |
| V2 | R2 | The table with a checkbox column, in each engine and direction. | Scroll sideways to the far end. Read the rects of the checkbox cell and the name cell in the header and a body row. | The checkbox cell sits at the inline-start inner edge, and the name cell's inline-start edge meets the checkbox cell's inline-end edge within 1px. The checkbox cell's inline size equals the token's computed value. | Passed 2026-10-23 in all three engines and both directions, including a row with an empty first cell and the footer. The token default is 34px, the checkbox cell's width on the base commit in every engine. |
| V3 | R3 | The table with a checkbox column, scrolled sideways and down so the header row overlaps body rows. | Call `document.elementFromPoint` at the center of the corner name header cell, at a point inside a scrolled header cell, and at a point inside a pinned body cell just below the header row. | The corner point hits the pinned header cell (or its content). The scrolled-header point hits a header cell, not a body cell. The pinned-body point hits the pinned body cell, not a scrolled body cell under it. | Passed 2026-10-23 in all three engines and both directions. Mutation caught: with the corner cells at `z-index: 1`, the corner check fails. |
| V4 | R4 | The table with a checkbox column, scrolled sideways so a scrolled cell lies under the pinned name cell. | Call `elementFromPoint` inside the pinned name cell over that spot, and read the pinned cell's computed background. | The hit is the pinned cell or its content, and its computed background color is opaque (alpha 1). | Passed 2026-10-23 in all three engines. Computed colors are `oklch()`, so the check rejects any alpha part rather than matching `rgb(`. |
| V5 | R4 | The same table with one row's checkbox checked. Hover the pointer over a different row. | Read the computed background of the pinned cells and of a scrolled cell in the selected row and in the hovered row. Compare the pinned cell in the selected row with a probe element painted `--md-comp-data-table-selected-container-color`. | The selected row's pinned cells show the selected color. The hovered row's pinned cells differ from an idle row's pinned cells and show the hover state layer over the container color. | Passed 2026-10-23 in all three engines and both directions. Mutation caught: a plain container fill with no row layer leaves the selected row's pinned cell 27 off. |
| V6 | R5, R6 | All three tables. | Read the computed `border-inline-end` of the last pinned cell in each row of the first two tables, and the checkbox cell's inline size, `position` and `z-index` of header cells in the table without the modifier. | Last pinned cells have a 1px solid border in the outline color. In the table without the modifier, cells are not pinned, header cells keep `z-index: 1`, and the checkbox cell has the same inline size as on the base commit. | Passed 2026-10-23 in all three engines and both directions. |
| V7 | R8 | A fresh `npm run build`. | `node --test tests/selective-builds.test.js`. | The test passes with a reviewed CSS budget line naming this change and its gzip bytes. JavaScript size is unchanged. | Passed 2026-10-23: CSS 85,400 gzip bytes (+168 from 85,232). JavaScript unchanged. |
| V8 | R7 | Plan group 2 edits. | `npm run build:skill`, then `npm run check:generated` and `node --test tests/semantics.test.js`. Read the new subsections in `llm.md` and the docs page, and the changelog entry. | Generation is clean and the semantics checks pass on the new examples. Both docs name the modifier, the checkbox pairing, the token and the `colspan` limit. The changelog has the Added entry. | Passed 2026-10-23: `check:generated` clean, `tests/semantics.test.js` passed with the new examples. |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | R1 to R8 | Run `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time. | All pass, including the existing data table, data tables behavior and sortable tests, and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Passed 2026-10-23 with no reruns. `npm run verify` ran 2,600 tests and all passed, followed by `check:generated`, `docs:build:astro` and `docs:verify`. The MCP smoke test and `npm run verify:packages` (`@expressivecss/mcp-server@0.4.1`) passed. |

## Manual checks

None. The user left a manual visual check out of the merge conditions.

## Merge conditions

- V1 to V9 pass, and V1 to V5 were seen failing before the change. Met locally on 2026-10-23.
- `npm run build:skill` ran after the last edit, and `npm run check:generated` is clean.
- The repository's required CI checks and review pass on the pull request. Pending: no pull request is open.
