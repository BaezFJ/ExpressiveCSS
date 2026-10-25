# Validation: funnel chart

Roadmap phase: [Phase 49, funnel chart](../../../../roadmap.md#phase-49-funnel-chart). Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending, since the feature is not built. Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V8 are Playwright cases in `tests/funnel-chart-browser.test.js`, run with `node --test tests/funnel-chart-browser.test.js` in Chromium, Firefox and WebKit. Each case destroys its chart and clears its timers in a `finally` block.

Fixture: a `<figure class="funnel-chart">` with the figcaption "Signup funnel" and a fixed width. Its table has the header "Step", "Visitors" and "Revenue", and four body rows: "Visited" 1000, "Signed up" 600, "Trial" 250 and "Paid" 45, each with a revenue cell. A copy sits in a `dir="rtl"` container.

V1 is the roadmap's acceptance check. V3 to V8 are the short behavior cases the user asked for, one per behavior.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | The fixture in a left-to-right page and in the right-to-left copy, started by `AutoInit()`. | Read each stage's box and the plot's box with `getBoundingClientRect()`. | There are four stages, ordered top to bottom as the table rows are. Each stage's width is within 1px of 100%, 60%, 25% and 4.5% of the plot's width. Each stage's center is within 1px of the plot's center, in both directions. | Pending |
| V2 | R3 | Three variants of the fixture: "Trial" set to "n/a", "Trial" set to 0 and "Paid" to -5, and every value set to "n/a". | Start each chart and read the stages, the labels and any page error. | The gap rows draw no stage but keep their row slot and label, and the other stages keep their V1 widths. With every value a gap, the chart draws no stages and keeps its four labels. No variant throws a page error. | Pending |
| V3 | R1, R4, R5 | The fixture, in both directions. | Read the plot's attributes, the table's visibility, the label and stage boxes, the stages' background color and any legend element. | The plot has `role="group"`, `aria-roledescription="funnel chart"` and `aria-label="Signup funnel"`. The table is still in the DOM and visually hidden. Each label sits left of the plot in the left-to-right page and right of it in the right-to-left copy, level with its stage. No legend is drawn, although the table has two value columns, and every stage has the color of `--md-comp-funnel-chart-color-1`. | Pending |
| V4 | R7 | The fixture, in both directions. | Tab to the plot, then press ArrowDown, End, Home, ArrowUp and Escape in turn, reading the tooltip after each. | Focus shows "Visited". ArrowDown moves to "Signed up", End to "Paid" and Home back to "Visited", and ArrowUp at the first row stays there. Escape hides the tooltip. The right-to-left copy uses the same keys. | Pending |
| V5 | R8 | The fixture. | Move the mouse over the middle of the third row's band, then off the plot. | The tooltip names "Trial" while the pointer is over the band, and hides once it leaves. | Pending |
| V6 | R6 | The fixture under `lang="en"`, and the V2 variant with "Trial" set to "n/a". | Highlight each row and read the tooltip text. | "Visited" shows "Visitors", "1000" and "(100%)". "Trial" shows "250 (25%)", and "Paid" shows "45 (4.5%)". Each row also shows "Revenue" and its cell text with no percentage. In the variant, "Trial" shows "n/a" with no percentage. | Pending |
| V7 | R9 | The fixture with focus on the plot and "Signed up" highlighted, once with motion allowed and once under `prefers-reduced-motion: reduce`. | Change the "Signed up" cell to 800 and call `update()`. Read the stage's animations and, after they finish, its width. | The stage ends at 0.8 of the plot's width, focus stays on the plot, and "Signed up" stays highlighted. With motion allowed, the stage has a running transition that starts at 0.6 of the width. Under reduced motion it has no transition. | Pending |
| V8 | R9 | A copy of the fixture with `data-watch`. | Change the "Trial" cell's text to 500 without calling `update()`, and wait for the redraw. | The "Trial" stage redraws at 0.5 of the plot's width. | Pending |
| V9 | R11, R12 | Plan group 4 edits. | Run `node --test tests/semantics.test.js tests/docs-astro.test.js tests/expressivecss-skill.test.js tests/expressivecss-version-resolution.test.js tests/expressivecss-component-decisions.test.js`, then `npm run build:skill` and `npm run check:generated`. Read the new `llm.md` section, the docs page and the changelog. | The semantics test flags a `.funnel-chart` that is not a `<figure>` with a `<table>`. The tests pass, and generation leaves no diff. The docs cover the table shape, gaps, the percentage, keys and tokens, and the changelog has the Added entry. | Pending |
| V10 | R13 | A fresh `npm run build`. | Run `node --test tests/selective-builds.test.js`, then read the funnel chart entry in the capability roadmap. | The test passes with reviewed JavaScript and CSS budget lines naming this change, and the entry pins a `sourceRevision`. | Pending |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V11 | R10 | Run `tests/bar-chart-browser.test.js`, `tests/pie-chart-browser.test.js`, `tests/scatter-chart-browser.test.js`, `tests/chart-update-browser.test.js`, `tests/chart-watch-browser.test.js`, `tests/chart-transition-browser.test.js` and `tests/chart-legend-toggle-browser.test.js` with `node --test`, one at a time. | All pass in all three engines. | Pending |
| V12 | R1 to R13 together | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. | All pass, including AutoInit, the cards tests and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Pending |

## Manual checks

None required. The user left manual visual and screen reader checks out of the merge conditions.

## Merge conditions

- V1 to V10 pass in Chromium, Firefox and WebKit where they run in a browser.
- V11 and V12 pass.
- The repository's required CI checks and reviews on the pull request are done.
- `npm run build:skill` ran after the last edit to `llm.md`, `CHANGELOG.md` or tests, and `npm run check:generated` is clean.
- If phase 50 or 51 merged first, this branch takes master's side of their registration entries, re-adds its own, and reruns V9 to V12.
