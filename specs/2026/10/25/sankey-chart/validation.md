# Validation: sankey chart

Roadmap phase: Phase 51, sankey chart. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

Every result is pending, because the feature is not built yet. Browser cases live in `tests/sankey-chart-browser.test.js` and run in Chromium, Firefox and WebKit after `npm run build`. Run one browser suite at a time.

Unless a case says otherwise, the fixture is a `.sankey-chart` figure with a caption and this table, in table order:

| Source | Target | Value |
| --- | --- | --- |
| Solar | Grid | 30 |
| Wind | Grid | 50 |
| Grid | Homes | 60 |
| Grid | Industry | 20 |
| Wind | Storage | 10 |

Grid's incoming total is 80 and its outgoing total 80. Wind's outgoing total is 60.

## Acceptance checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R4, R5, R6, R7 | The fixture, started by `AutoInit()`. | Measure each link's thickness in pixels at both ends and each node's height in pixels, from the rendered geometry. | Each link's thickness divided by its value is the same for every link, within one pixel, at both ends. Each node's height equals the larger of its incoming and outgoing totals on that scale. Solar and Wind are in the first column, Grid and Storage in the second, Homes and Industry in the third, from the inline start. Solar sits above Wind, and Homes above Industry. Links on one node edge do not overlap. The tallest column fills the plot's height. This is the roadmap's completion check. It must be seen failing before the change. | Pending |
| V2 | R3 | The fixture plus rows Homes to Grid 5 (a cycle), Grid to Grid 5 (a self link), Solar to Homes with value `-4`, Solar to Homes with value `n/a`, and a row with an empty target. | Load the page and read the drawn links and node heights. | No error is thrown. The chart draws the same five links and the same node heights as V1. | Pending |
| V3 | R8, R9 | The fixture, and a copy inside `dir="rtl"`. | Read each node's label, color and position, and each link's color. | Every node shows its name beside it, on the side away from the plot's edge in the last column. Nodes take colors in node order, and each link has its source's `data-series`. In the right-to-left copy, the first column is at the right and every height matches the left-to-right copy. | Pending |
| V4 | R10, R12 | The fixture with V2's skipped rows inserted after its third row, Grid to Homes, so Homes to Grid still closes the cycle. | Tab to the plot, press ArrowRight three times, then End, Home, ArrowLeft and Escape. | The plot has `aria-roledescription="sankey chart"` and the caption as its name. Focus shows the first link, Solar to Grid. Each ArrowRight moves to the next drawn link in table order, skipping the inserted rows. End shows Wind to Storage and Home Solar to Grid. ArrowLeft stays on the first link. Escape hides the tooltip. Each shown link is marked active, and the tooltip names its source, its target and its value text. | Pending |
| V5 | R11, R12 | The fixture. | Move the pointer over the Wind to Grid link, then over an empty part of the plot. Tap a link with a touch pointer. | The Wind to Grid link is marked and the tooltip names it. Off every link, the tooltip hides. The tap shows the tapped link, and it stays shown until the plot blurs. | Pending |
| V6 | R13 | The fixture, focused with the second link shown, and a copy with `data-watch`. | Change Wind to Grid from 50 to 70 and call `update()`. Make the same edit in the `data-watch` copy. Repeat with `prefers-reduced-motion: reduce`. | Link widths and node heights match V1's rule for the new values. Focus stays on the plot and the second link stays shown. The changed link and nodes have an animation from their old shapes, and none under reduced motion. The `data-watch` copy redraws without a call. | Pending |
| V7 | R15, R16 | Plan group 5 edits. | Run `node --test tests/semantics.test.js`, `npm run build:skill`, then `npm run check:generated`. Read the new `llm.md` section, the docs page, the AutoInit tables and the changelog. | The semantics test flags a `.sankey-chart` that is not a `<figure>` with a `<table>`, and one without a `<figcaption>`. Generation is clean. The docs cover the table shape, the rows that draw nothing, the layout rules, keys, tooltip and tokens, and the changelog has the Added entry. | Pending |
| V8 | R16 | A fresh `npm run build` and `npm run build:skill`. | Run `node --test tests/docs-astro.test.js tests/expressivecss-skill.test.js tests/expressivecss-version-resolution.test.js tests/expressivecss-component-decisions.test.js`. | All pass with the raised guide counts and reading budget, and the docs list the chart in the nav and the AutoInit table. | Pending |
| V9 | R17 | A fresh `npm run build`. | Run `node --test tests/selective-builds.test.js`, then read the capability roadmap entry. | The test passes with reviewed JavaScript and CSS budget lines naming this change, and the sankey chart entry pins a `sourceRevision` that `git merge-base --is-ancestor` accepts at HEAD. | Pending |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V10 | R14, and R1 to R17 together | Run `tests/chart-update-browser.test.js`, `tests/chart-watch-browser.test.js`, `tests/chart-transition-browser.test.js` and the other chart browser files, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. | All pass, including every other chart's browser tests, AutoInit and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Pending |

V2 to V6 are short behavior cases, one per behavior, and count as regression checks for the inherited chart behavior. They are not a full matrix.

## Manual checks

None required. The user left manual screen reader and visual checks out of the merge conditions.

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit, and was seen failing before the change.
- V2 to V6 pass in all three engines.
- V7 to V9 pass, and `npm run build:skill` ran after the last edit.
- V10 passes.
- The repository's required CI checks and review pass on the pull request.
