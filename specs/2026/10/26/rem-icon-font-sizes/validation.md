# Size the remaining px font sizes in rem validation

Roadmap phase: [Phase 52, size the remaining px font sizes in rem](../../../../roadmap.md#phase-52-size-the-remaining-px-font-sizes-in-rem)
Branch: `fix/rem-icon-font-sizes`
Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

Results were recorded on 2026-10-26 against the branch build. Build with `npm run build` before any test, since the tests read `dist/`. 

## Automated checks

| ID | Requirement | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R5 | Sass sources on the branch | `node --test tests/rem-font-sizes.test.js` | Passes. On the base commit it fails and lists the fifteen declarations. A px `font-size` added to any component partial other than `_chips.scss` makes it fail again. | Passed 2026-10-26. Failed first with the fifteen declarations listed. A `font: 20px sans-serif;` mutation in `_tree.scss` also fails it. |
| V2 | R1 | Static markup for each icon in the requirements table, in Chromium, Firefox and WebKit | `node --test tests/rem-font-sizes-browser.test.js`, root set to 32px | Each icon's computed `font-size` is twice its 16px value: 48px, 40px, 36px or 64px. | Passed in Chromium, Firefox and WebKit. Failed in all three against the base CSS. |
| V3 | R2 | Same page as V2 | Same command, root set to 32px | Dialog, snackbar and `header-icon-action` icon boxes measure 48 by 48. The fieldset legend icon is 36 by 36, the alert icon's line height is 40px, and the timeline badge and the map popup close button measure 64 by 64. | Passed in all three engines. |
| V4 | R3 | A `.timepicker-plate` with a `.timepicker-tick` in static markup | Same command at 16px and 32px roots | The tick text is 15px, then 30px. The tick box stays 40 by 40 and the plate stays 270px wide at both sizes. | Passed in all three engines. |
| V5 | R6 | Same page as V2 at a 16px root, and the built `dist/css/expressive.css` | Same command at a 16px root, and the side sheet assertion in `tests/regressions.test.js` | Every measured size equals its old px value at 16px. The compiled side sheet header icon rule has `font-size: 1.5rem`. | Passed in all three engines; `tests/regressions.test.js` passes with `1.5rem`. |
| V6 | R4 | A `.file-field` with `label.button` and its hidden file input | Same command; measure the input and label, then click the label with Playwright's `filechooser` listener | The input's computed `font-size` is `rem(20px)`, its opacity is 0, its box covers the label, and the click opens a file chooser. | Passed in all three engines. |
| V7 | R7 | Built bundles | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line for the CSS gzip change. `CHANGELOG.md` has the entry under Unreleased. | Passed. CSS gzip 90,074 bytes (+26 over 90,048). |
| V11 | R8 | Same page as V2 | Same command at 16px and 32px roots | The timeline row's start padding is 48px, then 80px. Its `::after` line starts 36px, then 68px, from the top and sits at 15.5px, then 31.5px. The map popup content's end padding is 44px, then 76px. Two time-only events with leading icons keep at least 8px between their badges. | Passed in all three engines. The badge check failed at 32px in all three engines without the `min-block-size`. |
| V8 | R7 | All edits done, then `npm run build:skill` | `npm run check:generated` | Generated semantics, skill and MCP copies match their sources. | Passed after the capability re-pin and `npm run build:skill`. |

## Regression checks

| ID | Requirement | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | All | `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time | All pass. A failure from a known flaky test is rerun alone and recorded in the `TASKS.md` learnings log with its rerun result. | Passed. `npm run verify` ran 3,196 tests with 2 failures, Chromium swipe actions touchcancel and Chromium tablist in a closed dialog; both passed when rerun alone. The skipped steps `check:generated`, `docs:build:astro` and `docs:verify` then passed. MCP tests and `verify:packages` passed. After the review fixes, `npm run verify` ran 3,196 tests with 1 failure, Firefox Lightbox reduced motion, which passed when rerun alone; the skipped steps then passed. |
| V10 | R1, R2, R3 | After each of groups 2 to 4, `node --test` on the tests for the touched partials, for example `tests/alert*.test.js`, `tests/regressions.test.js` and `tests/timepicker*.test.js` | All pass, including the snackbar icon regex in `tests/regressions.test.js` and the Timepicker seconds rem test. | Passed after each group: 204, 178 and 218 tests. Group 2 updated the side sheet assertion in `tests/regressions.test.js` from 24px to `1.5rem`. |

## Manual checks

None. The user didn't pick the manual 200% docs check, so no visual check is claimed for this phase.

## Merge conditions

- V1 to V11 pass and their results are recorded here.
- The new browser test fails against the base commit's CSS, which shows it tests the change.
- Required CI passes, review conversations are resolved, and the branch is current with `master`.
- The roadmap marks Phase 52 complete only in a later change, after this branch merges.
