# Validation: timepicker time range

Roadmap phase: [Phase 17, timepicker time range](../../../../roadmap.md#phase-17-timepicker-time-range). Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending, since nothing is built yet. Tests run against built bundles, so build first with `npm run build:js` and `npm run build:css`. A browser test skips an engine whose executable is missing, and a skipped engine does not count as a pass. Run suites one at a time, because parallel browser runs flake. In a fresh worktree, run `npm ci` first; a symlinked `node_modules` fails unrelated tests.

Unless a row says otherwise, the range is `minTime: '09:00'`, `maxTime: '17:30'`.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R3, R4, R7, R10 | `tests/timepicker-time-range-browser.test.js`: a `.field` input with the range, `autoSubmit: false`, once with `twelveHour: false` and once with `true`, in Chromium, Firefox and WebKit. | Click the 08 and 18 ticks (8 AM and 6 PM on the 12-hour clock). Then step the hour field down from 09 and up from 17, and type 08 and 18. Then choose 17 and 30 on the dial and press Ok. | The ticks and steps leave the time unchanged, typed 08 and 18 are refused, and no `select` event fires for the refused clicks. The input reads `17:30` on the 24-hour clock and `05:30 PM` on the 12-hour clock. The 08 and 18 ticks have `is-disabled` and a lower computed opacity than the 12 tick. | Pending |
| V2 | R1 | jsdom in `tests/timepicker-time-range.test.js`, `console.warn` stubbed. | Init with no bounds, with `minTime: '09:00'` only, with `maxTime: '17:30'` only, and with `minTime: '18:00', maxTime: '09:00'`. | No bounds and reversed bounds allow every hour and minute, and only the reversed pair warns, once. A single bound refuses times on its side only. | Pending |
| V3 | R2 | Same file. | Init `minTime: '09:00:30', maxTime: '17:29:45'` with and without `showSeconds`, at 09:00 and at 17:29. | Without seconds, 09:00 clamps to 09:01 and 17:29 is the last minute. With seconds, 09:00:30 and 17:29:45 are the first and last allowed times. | Pending |
| V4 | R3 | Same file, 24-hour and 12-hour. | Press Up at 17, Down at 09, Up in the minutes at 17:30, Down in the minutes at 17:00, and Page Up at 15. Repeat Up at 12:59 in the minutes. On the 12-hour clock, press Up at 11 AM. | 17, 09, 30 and 00 stay put, and Page Up at 15 stops at 17. (Down at 09:00 wraps to 09:59, because every minute of hour 9 is allowed.) 12:59 wraps to 12:00 as today. On the 12-hour clock, 11 AM steps to 12 PM. | Pending |
| V5 | R4 | Same file. | Type `08`, `18` and `17` in the hour field with minutes at 45, and `45` in the minutes at 17. On the 12-hour clock, type `8` in AM and `6` in PM. | 08, 18, 8 AM and 6 PM are refused and focus out restores the last value. 17 is accepted and the minutes read 30. 45 at 17 is refused. | Pending |
| V6 | R5 | Same file. | Read the fields' `aria-valuemin` and `aria-valuemax` at 09:00, at 12:00 and at 17:00, with seconds, and in PM on the 12-hour clock. | Hours read 9 to 17 on the 24-hour clock. Minutes read 0 to 59 at 09 and 12, and 0 to 30 at 17. Seconds read 0 to 0 at 17:30 and 0 to 59 otherwise. In PM, hours read 1 to 12; in AM, 9 to 11. | Pending |
| V7 | R8 | Same file, `Date` mocked to 20:00. | Open with the input holding `08:00`, then empty with `defaultTime: 'now'`, then holding `12:15`. | The fields read 09:00, then 17:30, then 12:15. The input value does not change until `done()`. | Pending |
| V8 | R8 | Same file. | At 16:45, step the hour up, type 17, and choose 17 on the dial with a pointer. | Each time the minutes read 30. | Pending |
| V9 | R10 | Same file. | Set 17:30 on a 24-hour picker, a 12-hour picker and a 12-hour `type="time"` picker and call `done()`. | The inputs read `17:30`, `05:30 PM` and `17:30`. | Pending |
| V10 | R9 | Same file, 12-hour, `minTime: '13:00', maxTime: '17:00'`. | Open the picker, then call the AM/PM handler with the AM button. | The AM button has `disabled`, the PM button does not, and the time stays in PM. With 09:00 to 17:30, neither button is disabled, and switching 05:00 PM to AM clamps it to 09:00 AM. | Pending |
| V11 | R6 | Same file. | Read the ticks' classes in the hours view, then in the minutes view at 17 and at 12, and on the 12-hour clock in AM and PM. | On the 24-hour clock, ticks 00 to 08 and 18 to 23 have `is-disabled`. At 17, minute ticks 35 to 55 have it; at 12, none do. On the 12-hour clock in PM, ticks 6 to 11 have it; in AM, ticks 12 and 1 to 8 have it. | Pending |
| V12 | R7 | Same file, `autoSubmit: true`, a `select` listener. | Press and release a pointer over 18 in the hours view, then over 45 in the minutes view at 17. | The hours view stays, the minutes view stays, no `select` fires, and the input is not written. | Pending |
| V13 | R6 | Built `dist/css/expressive.css`. | In the jsdom file, read the rules for `.timepicker-tick.is-disabled`. | A rule sets the disabled opacity and removes the hover background, and a `forced-colors: active` rule sets `GrayText`. | Pending |
| V14 | R11 | Existing suites, one file at a time. | Run `tests/timepicker-seconds.test.js`, `tests/timepicker-seconds-browser.test.js`, `tests/regressions.test.js`, `tests/keyboard-focus.test.js`, `tests/hot-paths.test.js`, `tests/ime-enter.test.js`, `tests/picker-locale.test.js`, `tests/selection-events.test.js`, `tests/teardown.test.js`, `tests/modal-picker-browser.test.js` and `tests/docked-picker-browser.test.js`. | All pass with no edits to their cases. | Pending |
| V15 | R12, R13 | Group 4 edits and a fresh build. | `npm run build:skill`, then `npm run check:generated`. `node --test tests/docs-api.test.js tests/expressivecss-skill.test.js tests/expressivecss-component-decisions.test.js tests/selective-builds.test.js`. Run the fallow audit with `--gate-marker pre-commit`. Read the docs page, `llm.md` and the changelog against R12. | Generation is clean, the tests pass with reviewed JavaScript and CSS budget lines, the fallow verdict is not `fail`, and the docs cover every R12 item. | Pending |
| V16 | R1 to R13 | All changes in place. | `npm run verify`, then `npm ci --prefix mcp/expressivecss` and `npm test --prefix mcp/expressivecss`. | Both pass. A browser failure in untouched code passes when rerun alone. | Pending |

The fallow `--gate-marker` flag comes from the Phase 16 validation and has not been rerun for this spec.

## Merge conditions

- V1 to V16 pass, with all three engines run for V1.
- The fallow pre-commit gate passes.
- The repository's required CI checks pass and the pull request is reviewed.
