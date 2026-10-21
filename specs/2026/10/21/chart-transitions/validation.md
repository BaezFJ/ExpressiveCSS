# Chart transitions validation

Phase 22, chart transitions between datasets. Requirements are in [requirements.md](requirements.md) and planned work in [plan.md](plan.md).

The agent owns every check below and runs them during implementation. Results stay pending until they run.

## Automated checks

All browser checks live in `tests/chart-transition-browser.test.js` and run against the built bundles in Chromium, Firefox and WebKit. Run one file with `npm run build:js && npm run build:css && node --test tests/chart-transition-browser.test.js`. Each test emulates `reducedMotion: 'no-preference'` unless it says otherwise, and tears down its browser in `finally`.

| ID | Requirement | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1 | A `.line-chart.points` with `data-min="0" data-max="100"`, one series at 20, 20 and a second at 50, 50. Change the first series' cells to 80 and call `update()`. Pause the plot's SVG and set its time to 0, then 0.2s, then 1s. | `getBBox().y` of the first line, in the 0 to 100 viewBox, is 80 at 0 (the old shape), strictly between 20 and 80 at 0.2s, and 20 at 1s. Its line, area and points paths each carry an `<animate attributeName="d">` with `dur` 400ms and key splines `0.2, 0, 0, 1`. The unchanged second series has no `<animate>`. | pass 2026-10-21, Chromium, Firefox and WebKit: samples 80, between, 20 |
| V2 | R4 | A two-series line chart with `.toggle`: click the second legend button to hide it, then click it again. A `.stacked` line chart: add a series column and call `update()`. A line chart with a gap: fill the gap and call `update()`. Then remove a row and call `update()`. | The shown-again series' line `from` path starts at the plot bottom (y 100). The new stacked series' `from` path lies on the series below it. The filled gap's point starts at y 100. After the row is removed, the paths have one point fewer at once, with no point for the removed row. | pass 2026-10-21, three engines |
| V3 | R2, R4 | A `.column-chart` with fixed `data-min`/`data-max` and one value at 20. Change it to 80 and call `update()`. Pause the span's CSS transition at 0ms and 200ms. Repeat for a left-to-right `.bar-chart`. Add a row and check its column. | The column's computed clip-path top inset is 80% at 0ms and strictly between 20% and 80% at 200ms. The bar's right inset, which in a left-to-right bar chart is the space after the value, moves from 80% the same way. A new row's column starts collapsed at the zero line. | pass 2026-10-21, three engines |
| V4 | R5 | V1's line chart with `reducedMotion: 'reduce'`. Change the cells and call `update()`. | No `<animate>` element in the chart; the line's bounding box sits at y 20 at once. | pass 2026-10-21, three engines |
| V5 | R5 | V3's column chart with `reducedMotion: 'reduce'`. | `getAnimations({ subtree: true })` on the chart is empty and the column's clip-path top is 20%. | pass 2026-10-21, three engines |
| V6 | R3 | A `.mixed-chart` with one `column` series and one line series. Change both and call `update()`. | The column's clip-path transition and the line's `<animate>` both start from the old values. | pass 2026-10-21, three engines |
| V7 | R6 | Run the existing chart tests: `node --test tests/*chart*-browser.test.js`. | All pass, including the `update()` focus and highlight tests and the pie, radar, radial and heatmap tests. | pass 2026-10-21: 126 of 126 |
| V8 | R7 | `npm run build:skill`, then `npm run check:generated`. | Generated files match. The docs pages and `llm.md` name the transition and the reduced-motion behavior, and the unreleased changelog has the Added entry with its `Migration:` note. | pass 2026-10-21 |
| V9 | R8 | `node --test tests/selective-builds.test.js` after the reviewed budget lines are added. | Passes with the new JS and CSS gzip sizes. | blocked locally by zlib output; CI pending, see evidence |
| V10 | R6, R8 | `npm run verify`, run once near the end. The fallow pre-commit hook in the shared Git hooks directory runs at commit and checks complexity. | Passes. Browser failures in untouched code are rerun alone before debugging. | pass except V9 locally; see evidence |

## Manual checks

| ID | Requirement | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V11 | R1, R2 | The agent opens the built line and column chart docs pages in Chromium through Playwright or the preview tools, changes a table cell, calls `update()` and pauses the motion halfway. | The paused screenshot shows the marks between the old and new values; after the motion ends they sit at the new values. | pass 2026-10-21, see evidence |

## Evidence

- V1 to V6: `node --test tests/chart-transition-browser.test.js` after `npm run build:js` and `npm run build:css`, 18 of 18 tests passing across the three engines at first, 24 after the final review. Each sample pauses the motion first: `pauseAnimations()` and `setCurrentTime()` for the SVG paths, `getAnimations()` with `pause()` and `currentTime` for the column transitions.
- V7: `node --test tests/*chart*-browser.test.js`, 126 of 126, including the pie, radar, radial and heatmap tests and the `update()` focus tests.
- V8: `npm run build:skill` rebuilt the guides, whose contract hash changed with `llm.md`, and `npm run check:generated` reported every generated file current.
- V11: the agent built the docs site with `npm run docs:build:astro`, served `_site` locally and drove Chromium with Playwright. On the line and column chart pages it set alternate rows to 95 and 5, called `update()`, and paused at 200ms. The paused screenshots show the line and the columns between the old values and the new ones, and the finished screenshots show the new values. The line had two `<animate>` elements and the column chart eleven running transitions.
- V9: this machine's Node 24.21.0 zlib makes larger gzip output than the budget lines assume. A build of `origin/master` measured with the test's own `sizes()` helper is 89,762 bytes against master's 89,470 budget, so the budget test fails locally on master too. After the final review fixes HEAD measures 90,065, which is +303 over the base build. The new budget line is 89,470 + 303 = 89,773. CSS went from 84,513 to 84,511 bytes, under its budget, so it gets no new line. The CI run on the pull request decides V9.
- V10: `npm run verify` ran once. Build, typecheck and 2,345 of 2,347 tests passed. The two failures were the V9 budget test and the Codex adapter's "oversized streams" test, a known flake that passed when rerun alone. `run-s` stops at the first failing step, so the agent then ran `npm run check:generated`, `npm run docs:build:astro` and `npm run docs:verify` by hand, and all three passed.
- Final review: a Plan subagent traced R1 to R8 against `git diff 8d45c2c4` and the evidence above. Confirmed and fixed: a zero duration token froze the lines on the old shape (probed in three engines, now skipped and tested); V1 did not show the tokens were read (a test now overrides both tokens); V6 checked only the inline start property (it now samples the paused clip-path); no test covered a new stacked column (added); V1 did not show the SVG motion plays on its own (it now checks that SVG time advances before pausing); the bar and mixed docs did not mention reduced motion (added). Left as documented limits in requirements.md: overshooting easing tokens, end-scale stacks in mixed charts, and the replay after `display: none`. After the fixes, `tests/chart-transition-browser.test.js` passes 24 of 24 in the three engines.
- Code review (code-review-and-quality, 2026-10-21): three mutations were run against the built bundle and restored afterwards. Dropping the stacked line join (`below ?? this._baseY(series)`) at first left V2 green, because its lower series did not move. V2 now moves the lower series from 20 to 30 as well, and the mutation fails it in all three engines. Breaking the stacked column chain and skipping every `<animate>` each failed their tests in all three engines.
- Fallow: `npx --no-install fallow audit --base origin/master` passed with no introduced complexity or duplication after two fixes. `update()` reached cyclomatic 5 from an inline ternary, now in `startsFrom()`; `_oldInsets` reached 5, now split with `baseAt()`. The `@starting-style` block repeated in three stylesheets moved into the `chart-column-motion` mixin. The styling findings it lists are advisory selector-complexity warnings on existing selectors.

## Merge conditions

- V1 to V10 pass, and V11 is done or recorded as blocked with its cause.
- The pull request's required CI checks pass and its reviews are resolved.
- `specs/roadmap.md` stays unchanged on this branch.

## Specification verification

Checked 2026-10-21, before implementation.

- Branch `feature/2026-10-21-chart-transitions` is active, made by T3 from `origin/master` at `8d45c2c4`. `origin/master` was still at that commit after a fetch.
- All three documents name Phase 22, and their relative links resolve.
- Every requirement has a plan group and at least one check.
- A Plan subagent reviewed the three files against the constitution and the code. Confirmed and fixed: V1 and V2 lacked checks for an unchanged series, removed rows and filled gaps; V2 could not start with a series hidden; the V7 command named a missing test file; V3 did not say which bar inset moves; V11 relied on human judgment; the changelog needed a `Migration:` note under the mission's product rules; and the requirements did not say that pie, radar, radial and heatmap charts pass through `update()`. Rejected after checking: the claim that inline `--top` beats `@starting-style`, since the rule uses `!important` and a Playwright probe showed the transition in all three engines; and the claim that the repository has no pre-commit hook, since `pre-commit` is in the shared Git hooks directory.
- Discovery ran in the main agent, not in scout subagents.
