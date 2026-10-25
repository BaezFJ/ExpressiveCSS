# Validation: treemap chart

Roadmap phase: Phase 50, treemap chart. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake. Every result below is pending, because the feature is not built yet.

## Automated checks

V1 to V6 are Playwright cases in a new file, `tests/treemap-chart-browser.test.js`, run with `node --test tests/treemap-chart-browser.test.js` in Chromium, Firefox and WebKit. The command follows the scatter chart's and has not run, because the file does not exist yet. Each case destroys its chart and clears its timers in a `finally` block.

Fixture: a `<figure class="treemap-chart">` with a figcaption and a fixed width. Its table has the header "Team" and "Budget", and six body rows with distinct values, two of them equal, from large to small, in an order that is not sorted. A copy sits in a `dir="rtl"` container.

Measurement: each rectangle's box from `getBoundingClientRect()`, relative to the plot's box. Pixel tolerances allow for the browser rounding each edge.

V1 is the acceptance check from the roadmap. V2 to V6 are the short regression cases the user asked for, one per behavior.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R4 | The fixture in a left-to-right page and in the right-to-left copy, started by `AutoInit()`. | Read every rectangle's box and the plot's box. | There are six rectangles. Each one's area is within one pixel of its edges, that is width plus height square pixels, of the plot's area times its value over the sum. The areas sum to the plot's area within 1%, no two rectangles overlap by more than 1 square pixel, and every one lies inside the plot. The largest value's rectangle touches the plot's top inline-start corner, and of the two equal values the earlier row comes first. The right-to-left copy mirrors the left-to-right boxes across the vertical middle within 1px. Seen failing before group 1. | Pending |
| V2 | R3 | The fixture with one value set to 0, one to -5 and one to "n/a". | Start the chart, count rectangles and read their boxes. | Three rectangles remain, one per positive row. Their areas follow V1's rule against the sum of the three positive values. No page error is thrown. | Pending |
| V3 | R5, R6 | The fixture, plus a row whose value is a tiny share of the sum. | Read each rectangle's `data-series`, computed border width and color, and check its text with `checkVisibility()`. | Rectangles take `data-series` 1 to 6 in table order. Each has a border of the gap token's width, its box keeps V1's area, and its background stops inside the border. The largest rectangle's name and cell text are visible and inside its box. The tiny row's text is not visible. | Pending |
| V4 | R7, R9 | The fixture with the first table row's value set to 0. | Tab to the plot, then press ArrowRight, End, Home, ArrowLeft and Escape in turn, reading the tooltip and outline after each. | The plot has `aria-roledescription="treemap chart"` and the caption as its name. Focus shows the second row, the first with a rectangle. ArrowRight moves to the next row in table order, End to the last, Home back to the second row, and ArrowLeft there stays put. Escape hides the tooltip and outline. The tooltip holds the row label, "Budget" with the cell text, and the share as a percentage. The same keys in the right-to-left copy move the same way. | Pending |
| V5 | R8, R9 | The fixture. | Move the mouse to the middle of the third row's rectangle, then off the plot. | The third row's rectangle is outlined and the tooltip names it, sitting inside the plot. Leaving the plot hides both. | Pending |
| V6 | R10 | The fixture with focus on the plot and the second row highlighted, then a copy with `data-watch`. | Double one value and call `update()`. Then on the `data-watch` copy, change a cell's text without calling `update()`. | After `update()`, the areas follow V1's rule for the new values, focus stays on the plot, the second row stays highlighted, and no rectangle has an animation. The `data-watch` copy redraws with the changed value's new area. | Pending |
| V7 | R5 | Plan group 2 edits. | Run `node --test tests/forced-colors.test.js`. | The test finds a `forced-colors: active` rule that gives treemap rectangles a border in a system color. This is a static check of the stylesheet; it does not render the chart in forced colors. | Pending |
| V8 | R12, R13 | Plan group 4 edits. | Run `node --test tests/semantics.test.js`, `npm run build:skill`, then `npm run check:generated`. Read the new `llm.md` section, the docs page and the changelog. | The semantics test flags a `.treemap-chart` that is not a `<figure>` with a `<table>`, and one with no `<figcaption>`. Generation is clean. Both docs cover the table shape, gaps, layout, text fitting, keys, tooltip and tokens, and the changelog has the Added entry. | Pending |
| V9 | R14 | A fresh `npm run build`. | `node --test tests/selective-builds.test.js tests/cards.test.js`, then read the capability roadmap entry. | Both pass, the budget test with reviewed JavaScript and CSS lines naming this change. The treemap entry pins a `sourceRevision` that is an ancestor of the branch head. | Pending |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V10 | R11, and R1 to R14 together | Run `tests/chart-update-browser.test.js`, `tests/chart-watch-browser.test.js` and `tests/pie-chart-browser.test.js`, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. | All pass, including every other chart's browser tests, AutoInit and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Pending |

## Manual checks

None required. The user left manual screen reader and visual checks out of the merge conditions.

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit, and was seen failing before the change.
- V2 to V6 pass in all three engines.
- V7, V8 and V9 pass, and `npm run build:skill` ran after the last edit.
- V10 passes.
- The repository's required CI checks and review pass on the pull request.
