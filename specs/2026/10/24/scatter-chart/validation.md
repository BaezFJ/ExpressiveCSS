# Validation: scatter chart

Roadmap phase: Phase 34, scatter chart. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending, because the feature is not built. Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake. `tests/scatter-chart-browser.test.js` does not exist yet; its command follows the other chart browser files and has not been run.

## Automated checks

V1 to V7 are Playwright cases in `tests/scatter-chart-browser.test.js`, run with `node --test tests/scatter-chart-browser.test.js` in Chromium, Firefox and WebKit. Each case destroys its chart and clears its timers in a `finally` block.

Fixture: a `<figure class="scatter-chart axis">` with a figcaption and a fixed size. Its table has the header "Car", "Weight (kg)", "City" and "Highway", and four body rows with distinct weights and two numeric mpg columns. A copy sits in a `dir="rtl"` container.

V1 is the acceptance check from the roadmap. V2 to V7 are the short regression cases the user asked for, one per behavior.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R5 | The fixture in a left-to-right page and in the right-to-left copy, started by `AutoInit()`. | Read each series' point positions from the drawn SVG, converted to page pixels, and the plot's box. | Each series has exactly four points, one per row. Each point's centre is within 1px of the place its x and y values give on the chart's scales, measured from the plot's inline-start and bottom edges. In the right-to-left copy the x positions mirror the left-to-right ones. Seen failing before group 1. | Pending |
| V2 | R3 | The fixture with one x cell set to "n/a" and one "Highway" cell emptied. | Start the chart and count points. | The row with no x draws no point in either series. The emptied cell's row draws its "City" point only. No error is thrown, and the other points keep their V1 positions. | Pending |
| V3 | R4 | The fixture once without fixed ends, once with `data-x-min="0" data-x-max="2500" data-min="0" data-max="60"`. | Read both axes' tick labels and their positions. | Without fixed ends, both axes start and end on a round step outside the data, and the x labels sit below the plot at their values' inline positions. With the attributes, the scale ends are exactly 0, 2500, 0 and 60. A "%" or currency sign in a column's cell text repeats on its axis labels. | Pending |
| V4 | R7, R9 | The fixture. | Tab to the plot, then press ArrowRight, End, Home, ArrowLeft and Escape in turn, reading the tooltip after each. | Focus shows the first row's "City" point. ArrowRight moves to the first row's "Highway" point, End to the last row's last point, Home back to the first. ArrowLeft at the first point stays there. Escape hides the tooltip and marker. The tooltip text holds the row label, "Weight (kg)" with its cell text, and the series name with its cell text, and the plot has `aria-roledescription="scatter chart"`. | Pending |
| V5 | R8, R9 | The fixture. | Move the mouse to 2px from the third row's "Highway" point. | That point is highlighted, its marker shows at its position, and the tooltip names it. | Pending |
| V6 | R10 | The fixture with focus on the plot and the second point highlighted, then a copy with `data-watch`. | Change one y cell and call `update()`. Then on the `data-watch` copy, change an x cell's text without calling `update()`. | After `update()`, the point ends at its new value's position, focus stays on the plot, and the second point stays highlighted. The point path has an animation from the old position, and none under `prefers-reduced-motion: reduce`. The `data-watch` copy redraws the changed point after the edit. | Pending |
| V7 | R6 | The fixture with `.toggle`. | Click the "Highway" legend button, then the "City" button. | After the first click the "Highway" points are gone, its button has `aria-pressed="false"`, and the y axis refits to the "City" values. The "City" button then has `aria-disabled="true"`, and clicking it hides nothing. | Pending |
| V8 | R12, R13 | Plan group 5 edits. | Run `node --test tests/semantics.test.js`, `npm run build:skill`, then `npm run check:generated`. Read the new llm.md section, the docs page and the changelog. | The semantics test flags a `.scatter-chart` that is not a `<figure>` with a `<table>`. Generation is clean. Both docs cover the table shape, gaps, both scales and their attributes, keys, tooltip and tokens, and the changelog has the Added entry. | Pending |
| V9 | R14 | A fresh `npm run build`. | `node --test tests/selective-builds.test.js`, then read the capability roadmap entry. | The test passes with reviewed JavaScript and CSS budget lines naming this change, and the scatter chart entry pins a `sourceRevision`. | Pending |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V10 | R11, and R1 to R14 together | Run the four existing chart files named in plan group 4, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. | All pass, including every other chart's browser tests, AutoInit and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Pending |

## Manual checks

None required. The user left manual screen reader and visual checks out of the merge conditions.

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit, and was seen failing before the change.
- V2 to V7 pass in all three engines.
- V8 and V9 pass, and `npm run build:skill` ran after the last edit.
- V10 passes.
- The repository's required CI checks and review pass on the pull request.
