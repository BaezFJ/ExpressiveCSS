# Validation: bubble sizes on the scatter chart

Roadmap phase: Phase 35, bubble sizes on the scatter chart. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check below on 2026-10-24 on branch `feature/2026-10-24-bubble-sizes`. All 12 cases in `tests/scatter-chart-browser.test.js` pass in all three engines, 36 runs in total. Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V5 are Playwright cases added to `tests/scatter-chart-browser.test.js`, run with `node --test tests/scatter-chart-browser.test.js` in Chromium, Firefox and WebKit. Each case destroys its chart and clears its timers in a `finally` block.

Fixture: a `<figure class="scatter-chart bubble axis">` with a figcaption and a fixed size. Its table has the header "Country", "GDP per person", "Life expectancy", "Healthy years" and "Population", and four body rows with distinct populations, the largest four times the smallest. A copy sits in a `dir="rtl"` container.

V1 is the acceptance check from the roadmap. V2 to V5 are the short regression cases the user asked for, one per behavior.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | The fixture in a left-to-right page and in the right-to-left copy, started by `AutoInit()`. | Read each drawn point's rendered diameter and centre, and the legend items. | Each series has four points. Each point's area divided by its row's population is the same for every point, within 2%, and the largest population's point is 48px across. Centres keep their scatter chart positions, mirrored in the right-to-left copy. The legend lists the two y series and not "Population". Seen failing before group 1. | Passed 2026-10-24 in Chromium, Firefox and WebKit, in both directions. Seen failing before group 1: the population column was drawn as a third series. |
| V2 | R3, R7 | The fixture with one size cell set to "n/a" and another to "0". | Start the chart, count points, then Tab to the plot and press End. | Both rows draw no points in either series, no error is thrown, and End reaches the last drawn point, skipping those rows. | Passed 2026-10-24 in all three engines, with no page error. It already passed after group 1, which blanks those rows through the existing gap path. |
| V3 | R4 | The fixture. | Tab to the plot and read the tooltip. | The tooltip holds the row label, "GDP per person" with its cell text, the series name with its cell text, and "Population" with the population cell text as written. | Passed 2026-10-24 in all three engines. Seen failing before group 2. The case also checks that the marker is 28px across around Chile's 24px bubble. |
| V4 | R5 | The fixture with `.toggle`, and the largest population on a row whose only y value is "Healthy years". | Click the "Healthy years" legend button. | The remaining points resize so that the largest shown population is 48px across, and their areas stay proportional within 2%. | Passed 2026-10-24 in all three engines. Before the click, Mexico is 48 × √½ px across beside Japan. It already passed after group 1, because the size scale fits the drawn points. |
| V5 | R6 | The fixture with focus on the plot, then a copy with `data-watch`. | Change one population cell and call `update()`. Repeat under `prefers-reduced-motion: reduce`. Then change a population cell on the `data-watch` copy without calling `update()`. | After `update()`, the changed point ends at its new size, focus stays on the plot, and the point has an animation from its old size. Under reduced motion it has none. The `data-watch` copy redraws the changed point at its new size. | Passed 2026-10-24 in all three engines. Seen failing before group 2. Only Chile's two bubbles animate, with `--scatter-chart-size` keyframes 0.5 to 1. |

A review on 2026-10-24 ran five source mutations. Dropping the square root and drawing zero sizes already failed V1 and V2. Three passed until the review added assertions: reversed bubble draw order (now V1), a wrong animation duration (now V5, which expects the 400ms medium4 token) and the size header keeping a swatch (now V3).

## Regression checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V6 | R7, R8 | Rerun the existing cases in `tests/scatter-chart-browser.test.js`, then the four chart files named in plan group 2, one at a time. | All pass unchanged, so scatter charts without `.bubble` and the other charts behave as on the base commit. A failure in a file this change does not touch is rerun alone before anyone debugs it. | Passed 2026-10-24. The scatter file's earlier cases and the four chart files passed (12, 21, 9 and 24 cases). `npm run verify` ran 2,677 tests: 2,675 passed, and WebKit confetti and Firefox Lightbox reduced motion failed under load in files this change does not touch. Both passed when rerun alone, and the steps after the tests (`check:generated`, `docs:build:astro`, `docs:verify` with 122 pages) passed. The MCP smoke test also passed. |
| V7 | R9, R10 | After plan group 3, run `node --test tests/selective-builds.test.js`, `npm run build:skill` and `npm run check:generated`, and read the new docs. | The budget test passes with reviewed JavaScript and CSS lines naming this change, generation is clean, the `sourceRevision` pin names the last commit that changes the scatter chart's sources, and `llm.md`, the docs page, the decisions entry and the changelog cover `.bubble`. | Passed 2026-10-24. JavaScript went from 91,241 to 91,624 gzip bytes and CSS from 86,100 to 86,183, in two reviewed lines each. `sourceRevision` is `613543a71`, and the decisions test passes with the three changed source hashes and a new browser check entry for V1. `build:skill` wrote 85 guides and `check:generated` is clean. |

## Manual checks

None required. The user left manual visual, forced-colors and screen reader checks out of the merge conditions.

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit, and was seen failing before the change. Met locally on 2026-10-24.
- V2 to V5 pass in all three engines. Met locally on 2026-10-24.
- V6 and V7 pass, and `npm run build:skill` ran after the last edit. Met locally on 2026-10-24.
- The repository's required CI checks and review pass on the pull request. Pending: no pull request is open.
