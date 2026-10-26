# Size the remaining px font sizes in rem validation

Roadmap phase: [Phase 52, size the remaining px font sizes in rem](../../../../roadmap.md#phase-52-size-the-remaining-px-font-sizes-in-rem)
Branch: `fix/rem-icon-font-sizes`
Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

Every result is pending, because the feature isn't built yet. Build with `npm run build` before any test, since the tests read `dist/`. The two new test files don't exist yet, so their commands are unverified until group 1 and group 5 add them.

## Automated checks

| ID | Requirement | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R5 | Sass sources on the branch | `node --test tests/rem-font-sizes.test.js` | Passes. On the base commit it fails and lists the fifteen declarations. A px `font-size` added to any component partial other than `_chips.scss` makes it fail again. | Pending |
| V2 | R1 | Static markup for each icon in the requirements table, in Chromium, Firefox and WebKit | `node --test tests/rem-font-sizes-browser.test.js`, root set to 32px | Each icon's computed `font-size` is twice its 16px value: 48px, 40px, 36px or 64px. | Pending |
| V3 | R2 | Same page as V2 | Same command, root set to 32px | Dialog, snackbar and `header-icon-action` icon boxes measure 48 by 48. The fieldset legend icon is 36 by 36, the alert icon's line height is 40px, and the timeline badge and the map popup close button measure 64 by 64. | Pending |
| V4 | R3 | A `.timepicker-plate` with a `.timepicker-tick` in static markup | Same command at 16px and 32px roots | The tick text is 15px, then 30px. The tick box stays 40 by 40 and the plate stays 270px wide at both sizes. | Pending |
| V5 | R6 | Same page as V2 at a 16px root, and the built `dist/css/expressive.css` | Same command; the static test also reads the compiled rules | Every measured size equals its old px value at 16px. The compiled rules contain the `rem()` strings from `tests/css.js`, such as `1.5rem` for 24px and `0.9375rem` for 15px. | Pending |
| V6 | R4 | A `.file-field` with `label.button` and its hidden file input | Same command; measure the input and label, then click the label with Playwright's `filechooser` listener | The input's computed `font-size` is `rem(20px)`, its opacity is 0, its box covers the label, and the click opens a file chooser. | Pending |
| V7 | R7 | Built bundles | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line for the CSS gzip change. `CHANGELOG.md` has the entry under Unreleased. | Pending |
| V8 | R7 | All edits done, then `npm run build:skill` | `npm run check:generated` | Generated semantics, skill and MCP copies match their sources. | Pending |

## Regression checks

| ID | Requirement | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | All | `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time | All pass. A failure from a known flaky test is rerun alone and recorded in the `TASKS.md` learnings log with its rerun result. | Pending |
| V10 | R1, R2, R3 | After each of groups 2 to 4, `node --test` on the tests for the touched partials, for example `tests/alert*.test.js`, `tests/regressions.test.js` and `tests/timepicker*.test.js` | All pass, including the snackbar icon regex in `tests/regressions.test.js` and the Timepicker seconds rem test. | Pending |

## Manual checks

None. The user didn't pick the manual 200% docs check, so no visual check is claimed for this phase.

## Merge conditions

- V1 to V10 pass and their results are recorded here.
- The new browser test fails against the base commit's CSS, which shows it tests the change.
- Required CI passes, review conversations are resolved, and the branch is current with `master`.
- The roadmap marks Phase 52 complete only in a later change, after this branch merges.
