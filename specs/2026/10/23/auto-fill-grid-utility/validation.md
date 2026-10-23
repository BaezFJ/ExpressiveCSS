# Validation: auto-fill grid utility

Roadmap phase: Phase 27, auto-fill grid utility. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Tests run against built bundles, so build first with `npm run build:css`. Browser tests skip an engine whose executable is missing, and a skipped engine does not count as a pass. Run suites one at a time, since parallel browser runs flake. Results were recorded on 2026-10-23 on branch `feature/2026-10-23-auto-fill-grid`.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | `tests/helpers-browser.test.js`, Chromium, Firefox and WebKit. A `.grid-auto-fill` container with `--grid-column-min: 100px`, no gap, and eight children. | Set the container's width to 250px, then 400px, then 820px, and count the distinct child `left` values each time. | 2, 4 and 8 columns. | Passed 2026-10-23 in Chromium, Firefox and WebKit, none skipped. Failed first in all three (1 column at 250px) because the class did not exist. |
| V2 | R3 | Same file. The same container with `--grid-column-min` unset (240px fallback). | Set its width to 180px. | One column. Each child's box is 180px wide and the container's `scrollWidth` equals its `clientWidth`. | Passed 2026-10-23 in all three engines. |
| V3 | R2, R4, R5 | Same file. | (a) Set `--grid-column-min: 200px` on the parent instead of the container, at 450px wide. (b) Put two children in a 450px container with `--grid-column-min: 100px`. (c) Add `.gap-3` (0.75rem, 12px) to the V1 container at 400px wide. | (a) 2 columns, so the inherited value applies. (b) Each child is 112.5px wide, a quarter of the row, rather than 225px. (c) 3 columns instead of the 4 that fit without a gap, since four columns and three gaps need 436px. | Passed 2026-10-23 in all three engines. |
| V4 | R2 | Same file, no property set, root font size 16px. | Read the computed `grid-template-columns` of a 960px container. | Four tracks of 240px. | Passed 2026-10-23 in all three engines. |
| V5 | R6 | Existing suites. | Run `node --test tests/grid.test.js`, `tests/helpers-browser.test.js` (the cases that were there before), `tests/cards-browser.test.js` and `tests/calendar-browser.test.js`, one file at a time. Confirm with `git diff` that `_cards.scss`, `_stat.scss`, `_calendar.scss` and `_mega-menu.scss` are untouched. | All pass, and the four partials are unchanged. | Passed 2026-10-23, one file at a time: grid 8, helpers-browser 25, cards-browser 4, calendar-browser 6, none skipped. The four component partials have no diff. |
| V6 | R7 | Group 2 edits. | `npm run build:skill`, then `npm run check:generated`, then `node --test tests/docs-api.test.js tests/expressivecss-skill.test.js`. Read the docs page and `llm.md`. | Generation is clean, the tests pass, and both documents cover every fact R7 lists. | Passed 2026-10-23. `check:generated` reported 84 current guides; docs-api and skill tests passed 35. The 89 regenerated skill and MCP files changed only in the contract hash. |
| V7 | R8 | All edits done. | `npm run verify`, then `npm test --prefix mcp/expressivecss`. | Both pass, including the new CSS gzip budget line in `tests/selective-builds.test.js`. | Passed 2026-10-23 after one rerun. `npm run verify` ran 2,576 tests: 2,572 passed, 3 optional evaluation-SDK tests skipped, and one failed, `firefox: a navigation rail expands on the spatial spring` (no overshoot under load). That file passed alone (24/24). The steps verify skipped after the failure (`check:generated`, `docs:build:astro`, `docs:verify`) then passed, and the MCP smoke test passed. |

The test file names in V5 and V6 come from the repository listing at the base commit. The exact budget comment wording follows the existing lines in `tests/selective-builds.test.js`.

## Manual checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V8 | R7 | Open the helpers page in the docs dev server and resize the window across the example. | The example's column count changes with the width, and the text matches the class's behavior. Hard-reload first, because `docs.css` is cached by version. | Passed 2026-10-23 on the built docs page with Playwright screenshots instead of the dev server: 2 columns in a 420px window, 5 in a 1280px window, and the short last row kept the column width. |

## Merge conditions

- V1 to V8 pass, with no browser engine skipped.
- The existing suites in V5 pass, and `npm run verify` and the MCP tests pass.
- Generated skill and MCP data are current.
- Required CI passes and review conversations are resolved.
