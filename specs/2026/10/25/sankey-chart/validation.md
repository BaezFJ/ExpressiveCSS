# Validation: sankey chart

Roadmap phase: Phase 51, sankey chart. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

Results were recorded on 2026-10-25. Browser cases live in `tests/sankey-chart-browser.test.js` and run in Chromium, Firefox and WebKit after `npm run build`. Run one browser suite at a time.

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
| V1 | R1, R2, R4, R5, R6, R7 | The fixture, started by `AutoInit()`. | Measure each link's thickness in pixels at both ends and each node's height in pixels, from the rendered geometry. | Each link's thickness divided by its value is the same for every link, within one pixel, at both ends. Each node's height equals the larger of its incoming and outgoing totals on that scale. Solar and Wind are in the first column, Grid and Storage in the second, Homes and Industry in the third, from the inline start. Solar sits above Wind, and Homes above Industry. Links on one node edge do not overlap. The tallest column fills the plot's height. This is the roadmap's completion check. It must be seen failing before the change. | Passed 2026-10-25 in all three engines. Seen failing before group 1: no chart drew. A review on 2026-10-25 added a check that each link's ends lie on its nodes' edges, after a mutation that stacked incoming links below outgoing ones passed every case. With the check, that mutation fails 12 cases. |
| V2 | R3 | The fixture plus rows Homes to Grid 5 (a cycle), Grid to Grid 5 (a self link), Solar to Homes with value `-4`, Solar to Homes with value `n/a`, and a row with an empty target. | Load the page and read the drawn links and node heights. | No error is thrown. The chart draws the same five links and the same node heights as V1. | Passed 2026-10-25 in all three engines with no page error. Seen failing before group 1. Node heights match V1's within 0.5px, since the two charts sit at different heights in the page and their pixel edges round differently. |
| V3 | R8, R9 | The fixture, and a copy inside `dir="rtl"`. | Read each node's label, color and position, and each link's color. | Every node shows its name beside it, on the side away from the plot's edge in the last column. Nodes take colors in node order, and each link has its source's `data-series`. In the right-to-left copy, the first column is at the right and every height matches the left-to-right copy. | Passed 2026-10-25 in all three engines. Seen failing before group 2: no names were drawn. A name sits within 16px of its node and level with it within 1px, and the right-to-left copy also passes V1's layout checks mirrored. |
| V4 | R10, R12 | The fixture with V2's skipped rows inserted after its third row, Grid to Homes, so Homes to Grid still closes the cycle. | Tab to the plot, press ArrowRight three times, then End, Home, ArrowLeft and Escape. | The plot has `aria-roledescription="sankey chart"` and the caption as its name. Focus shows the first link, Solar to Grid. Each ArrowRight moves to the next drawn link in table order, skipping the inserted rows. End shows Wind to Storage and Home Solar to Grid. ArrowLeft stays on the first link. Escape hides the tooltip. Each shown link is marked active, and the tooltip names its source, its target and its value text. | Passed 2026-10-25 in all three engines. Seen failing before group 3, when the inherited row numbering showed table rows. The skipped rows sit after Grid to Homes, and the tooltip reads, for example, "Source Wind Target Grid Value 50". |
| V5 | R11, R12 | The fixture. | Move the pointer over the Wind to Grid link, then over an empty part of the plot. Tap a link with a touch pointer. | The Wind to Grid link is marked and the tooltip names it. Off every link, the tooltip hides. The tap shows the tapped link, and it stays shown until the plot blurs. | Passed 2026-10-25 in all three engines. Seen failing before group 3. The off-link point is the gap between Solar and Wind just past their edge. The tap is a dispatched touch `pointerdown` and `pointerleave`. |
| V6 | R13 | The fixture, focused with the second link shown, and a copy with `data-watch`. | Change Wind to Grid from 50 to 70 and call `update()`. Make the same edit in the `data-watch` copy. Repeat with `prefers-reduced-motion: reduce`. | Link widths and node heights match V1's rule for the new values. Focus stays on the plot and the second link stays shown. The changed link and nodes have an animation from their old shapes, and none under reduced motion. The `data-watch` copy redraws without a call. | Passed 2026-10-25 in all three engines. Before group 4, focus, the kept link, reduced motion and `data-watch` already passed, inherited from `LineChart`, and only the motion failed. Shapes match their old ones by source and target names for links and by name for nodes. The scale changes, so every link and node gets an `<animate>` from its old path data. |
| V7 | R15, R16 | Plan group 5 edits. | Run `node --test tests/semantics.test.js`, `npm run build:skill`, then `npm run check:generated`. Read the new `llm.md` section, the docs page, the AutoInit tables and the changelog. | The semantics test flags a `.sankey-chart` that is not a `<figure>` with a `<table>`, and one without a `<figcaption>`. Generation is clean. The docs cover the table shape, the rows that draw nothing, the layout rules, keys, tooltip and tokens, and the changelog has the Added entry. | Passed 2026-10-25. The semantics test (32 cases), `npm run build:skill` and `npm run check:generated` are clean, with 90 component guides. `llm.md`, the docs page, both AutoInit tables, `auto-init.astro` and the changelog cover the chart. |
| V8 | R16 | A fresh `npm run build` and `npm run build:skill`. | Run `node --test tests/docs-astro.test.js tests/expressivecss-skill.test.js tests/expressivecss-version-resolution.test.js tests/expressivecss-component-decisions.test.js`. | All pass with the raised guide counts and reading budget, and the docs list the chart in the nav and the AutoInit table. | Passed 2026-10-25: `docs-astro` (25), `expressivecss-skill` (33), `expressivecss-version-resolution` (42) and `expressivecss-component-decisions` (15). The guide counts went from 89 to 90 and the basic-button reading budget to 46,563 bytes (+282). |
| V9 | R17 | A fresh `npm run build`. | Run `node --test tests/selective-builds.test.js`, then read the capability roadmap entry. | The test passes with reviewed JavaScript and CSS budget lines naming this change, and the sankey chart entry pins a `sourceRevision` that `git merge-base --is-ancestor` accepts at HEAD. | Passed 2026-10-25. JavaScript went from 95,306 to 96,640 gzip bytes (+1,334) in five reviewed lines, and CSS from 86,844 to 87,385 (+541) in four. The decision record pins the four sources at their current hashes, and `sourceRevision` names `5003a2f06`, the commit that merged `origin/master` (#427) into the branch, since it is the first to track both the sankey and loading overlay files. Re-pin it to the squash merge commit after merging. |

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V10 | R14, and R1 to R17 together | Run `tests/chart-update-browser.test.js`, `tests/chart-watch-browser.test.js`, `tests/chart-transition-browser.test.js` and the other chart browser files, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. | All pass, including every other chart's browser tests, AutoInit and the MCP smoke test, which `verify` skips. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Passed 2026-10-25. The chart update (12), watch (21) and transition (24) files passed alone. Two `npm run verify` runs found two faults this change caused, both fixed: `var(--x)` and `var(--y)` without a declaration or fallback (`tests/tokens.test.js`), and the gzip budget after renaming them. Every other failure was a timeout in a file this change does not touch (defer-render, sheet spring, expanding card, data table, keypad, swipe actions, codex adapter, docker runner), and each passed alone. The steps `verify` skipped after `test:run` then passed: `check:generated`, `docs:build:astro` and `docs:verify` (127 pages). `npm test --prefix mcp/expressivecss` passed. `npm run verify:packages` failed twice on the packaged smoke test's 5-second inspection limit while the load average was 117 on 32 cores. The same file lints in 0.34s here. Once the load fell below 24, `npm run verify:packages` passed (`@expressivecss/mcp-server@0.4.1`). |

V2 to V6 are short behavior cases, one per behavior, and count as regression checks for the inherited chart behavior. They are not a full matrix.

## Manual checks

None required. The user left manual screen reader and visual checks out of the merge conditions.

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit, and was seen failing before the change. Met locally on 2026-10-25.
- V2 to V6 pass in all three engines. Met locally on 2026-10-25.
- V7 to V9 pass, and `npm run build:skill` ran after the last edit. Met locally on 2026-10-25.
- V10 passes. Met locally on 2026-10-25.
- The repository's required CI checks and review pass on the pull request. Pending: no pull request is open.
