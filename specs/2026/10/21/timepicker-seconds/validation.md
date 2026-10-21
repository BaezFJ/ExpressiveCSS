# Validation: timepicker seconds

Roadmap phase: Phase 16, timepicker seconds. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent owns every check below and runs them on branch `feature/2026-10-21-timepicker-seconds`. Tests run against built bundles, so build first with `npm run build:js` and `npm run build:css`. Browser tests skip an engine whose executable is missing; a skipped engine does not count as a pass. Run suites one at a time, since parallel browser runs flake.

## Specification review

Done 2026-10-21 before implementation.

- The agent checked that all three documents name Phase 16, that the links and anchors resolve, and that every R ID has a plan group and a V check.
- An independent read-only reviewer (Claude Code `Plan` subagent) got the three files, the constitution and the base commit. Confirmed findings, fixed in the spec: `time` stays 12-hour on a 12-hour `type="time"` picker (V6 expected the wrong value); the AM/PM reading fix had no ID, check or changelog entry (now R11, V14); Tab order, `rem` sizing and the unchanged two-field size had no check (V1, V13, V2); the MCP tests need `npm ci --prefix mcp/expressivecss`; the dial's minute choice under `autoSubmit` was undecided (now recorded in requirements). The reviewer also noted that `_range()` returns a fixed range per field; requirements now say Phase 17 has to make it depend on the other fields.
- The reviewer listed the merge condition as unreachable by the agent. The user asked for a pull request in the same run, so the agent can satisfy every condition except the human merge.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R4, R5 | `tests/timepicker-seconds-browser.test.js`: a `.field` input with `showSeconds: true`, `autoSubmit: false`, once with `twelveHour: true` and once with `false`, in Chromium, Firefox and WebKit. | Open with Enter, type 14 (or 02) in Hours, press Tab, type 30, press Tab, type 45, and press Enter in the seconds field. On the 12-hour clock, choose PM first. | Tab moves Hours, Minutes, Seconds, then to AM on the 12-hour clock. The input reads `02:30:45 PM` on the 12-hour clock and `14:30:45` on the 24-hour clock. | Passed 2026-10-21 in Chromium, Firefox and WebKit, none skipped. The first run failed in Chromium only: before the group 3 styles, the three fields overflowed and Chromium dropped the first typed digit of each field. It passed once the layout fit. |
| V2 | R7 | The same file. 12-hour and 24-hour pickers with `showSeconds`, inline, docked and modal, at a 360px and a 1280px wide viewport. | Measure each field's `scrollWidth` against its `clientWidth`, and each field and the AM/PM column against the picker container's box. | No field scrolls its digits, and every field and the AM/PM column sit inside the container. A picker without the option keeps its 64px digits and 0.8rem padding, which the seconds rules would change. | Passed 2026-10-21 in Chromium, Firefox and WebKit, none skipped. The two-field check reads the digits' 64px size and 0.8rem padding; the first draft compared wrapper widths to 110.4px, which flex already shrinks on master. |
| V3 | R1 | jsdom in `tests/timepicker-seconds.test.js`. | Init with and without `showSeconds`, and with `i18n: { seconds: 'Segundos' }`. | With the option, the third field is a spin button from 0 to 59 named `Seconds` (or `Segundos`), after the minute field in document order and before the AM/PM column. Without it, there is no `.timepicker-input-seconds` and only one divider. | Passed 2026-10-21. Failed before group 1 for the expected reason, no seconds field. |
| V4 | R2 | Same file, seconds at 58 and hand on the minutes. | Press Up twice, Down, Page Up, Page Down in the seconds field, with a 12-hour picker at 11 PM. | The field reads 59, 00, 59, 04, 59. Hours, minutes, AM/PM, `currentView` and the hand's `x2` and `y2` stay the same. | Passed 2026-10-21. Failed before group 1, no seconds field. |
| V5 | R3 | Same file, with `Date` mocked. | Type `7`, then `75`, then `4x`, then leave the field; empty it and leave it; empty it and press Enter. | `7` sets seconds to 7 and focus out shows `07`. `75` and `4x` leave seconds at 7, and focus out shows `07`. An emptied field shows the mocked current second. | Passed 2026-10-21, also with `-1` and `1.5`. Failed before group 1, no seconds field. |
| V6 | R5 | Same file. | Set 14:30:45 on a 24-hour picker, a 12-hour picker and a 12-hour `type="time"` picker and call `done()`. Then, under `autoSubmit`, set seconds to 45 and choose a minute on the dial with a pointer. | The inputs read `14:30:45`, `02:30:45 PM` and `14:30:45`. `time` reads `14:30:45`, `02:30:45` and `02:30:45`. The dial choice writes the time with `:45`. | Passed 2026-10-21. Written after the change, not run against the old bundle. |
| V7 | R6 | Same file, with `Date` mocked. | Open pickers whose input holds `02:30:45 PM`, `14:30`, or nothing with `defaultTime: '14:30:45'` or `'now'`. | The fields read 02, 30, 45 with PM; 14, 30, 00; 14, 30, 45; and the mocked time with its second. | Passed 2026-10-21. Written after the change. |
| V8 | R4 | Same file, `autoSubmit` true and false. | Type seconds and press Enter in the seconds field. | The input gets the time with those seconds, Enter's default is prevented, and one `change` event fires. | Passed 2026-10-21 for both settings. Written after the change. |
| V9 | R8 | Existing suites. | Run `tests/regressions.test.js`, `tests/keyboard-focus.test.js`, `tests/hot-paths.test.js`, `tests/ime-enter.test.js`, `tests/picker-locale.test.js`, `tests/modal-picker-browser.test.js` and `tests/docked-picker-browser.test.js`, one file at a time. Also run `tests/selection-events.test.js` and `tests/teardown.test.js`. In the new jsdom file, check a picker without the option writes `14:30`, reads `14:30:45` as 14:30, and still sends `select` with `(hour, minute)`. | All pass. | Passed 2026-10-21, one file at a time: regressions 130, keyboard-focus 10, hot-paths 22, ime-enter 10, picker-locale 12, selection-events 15, teardown 19, modal-picker-browser 6 and docked-picker-browser 9 (three engines, none skipped). The no-option jsdom case passed too. |
| V10 | R9 | Plan group 4 edits. | `npm run build:skill`, then `npm run check:generated`. Run `node --test tests/docs-api.test.js tests/expressivecss-skill.test.js tests/expressivecss-component-decisions.test.js`. Read the docs page, `llm.md` and the changelog. | Generation is clean, the tests pass, and the docs cover every R9 item. | Passed 2026-10-21. `check:generated` reported 84 current guides. docs-api 2, skill 33 and component decisions 15 passed. The skill and MCP copies changed only in their contract hash, apart from `time-picker.md`; no capability pin needed updating. |
| V13 | R7 | The built CSS. | In the new jsdom file, read the rules for the seconds layout from `dist/css/expressive.css`. | Every width, font size and inline padding in them is in `rem`. | Passed 2026-10-21. |
| V14 | R11 | jsdom, without `showSeconds`, 12-hour. | Open a picker whose input holds `02:30:45 PM`. | The fields read 02 and 30 with PM. | Passed 2026-10-21. Written after the change. |
| V11 | R10 | A fresh build. | `node --test tests/selective-builds.test.js`; the fallow audit with `--gate-marker pre-commit`. | The budget test passes with reviewed JavaScript and CSS lines for this change. The fallow verdict is not `fail`. | Passed 2026-10-21: JavaScript 89,797 gzip bytes (+327) and CSS 84,584 (+71). Fallow verdict `pass` with no introduced findings, after replacing two range comparisons in `_fieldValue` with a clamp and an `:is()` list with `> *` (the first audit flagged both). |
| V12 | R1 to R11 | All changes in place. | `npm run verify`, then `npm ci --prefix mcp/expressivecss` and `npm test --prefix mcp/expressivecss`. | Both pass. A browser failure in untouched code passes when rerun alone. | Passed 2026-10-21. `npm run verify` ran 2,347 tests: 2,346 passed and `oversized streams and guide sets stop within the operator limits` in `tests/expressivecss-codex-adapter.test.js` timed out (Codex exceeded 3000ms) under parallel load from other worktrees. It passed alone (14 of 14). Because `run-s` stopped there, `check:generated`, `docs:build:astro` and `docs:verify` ran separately and passed (121 pages). The MCP smoke test first stopped on the static inspection time limit under the same load, then passed alone. |

## Final review

An independent read-only reviewer (Claude Code `Plan` subagent) traced R1 to R11 to the diff from `8d45c2c4`, the tests and this file, on 2026-10-21. It found no correctness bug and no change outside Phase 16. Confirmed findings, fixed:

- V1 did not press Tab out of the seconds field. It now checks that Tab reaches AM on the 12-hour clock.
- V5's emptied-field Enter case would have passed without Enter formatting the field. The field now holds 30 before it is emptied, and the test checks it shows the current second after Enter.
- The V2 and V13 expected results named measurements the tests do not take; the wording now matches the tests.
- The docs still said Enter in "either" of the hour and minute fields commits, `defaultTime` took only `'HH:MM'`, and `seconds` existed only with a field. R11 and its changelog entry described only a period after the seconds, while the code reads one anywhere, such as `2 PM`. All updated.

Left as is: a fractional or out-of-range part such as `14:30:45.5` or `:99` passes through as it does for minutes on master; fractions are out of scope.

After the fixes, `tests/timepicker-seconds.test.js` (12) and `tests/timepicker-seconds-browser.test.js` (6, three engines, none skipped) passed again, and `npm run build:skill` and `npm run check:generated` were clean. The fallow hook then flagged the V1 test body at cyclomatic 9, so its steps moved into three helpers; the browser file passed again in all three engines and the audit verdict was `pass`.

## Manual checks

- Look at screenshots of the 12-hour inline picker with seconds at 360px and 1280px. Digits are whole, the dividers line up, and the AM/PM buttons are not squeezed. The agent takes and reads the screenshots. Done 2026-10-21 in Chromium: the first shots showed the colons at the old 4rem size, sitting high. The seconds layout now centers them at the digits' size, and the second shots show whole digits and AM/PM buttons at full size. The focused hour field's digits sit slightly lower than the others, as they do without seconds.

## Merge conditions

- V1 to V14 pass, with all three engines run for V1 and V2.
- The fallow pre-commit gate passes.
- The repository's required CI checks pass and the pull request is reviewed. The agent opens and watches the pull request under separate user instructions (`babysit-pr`); the merge itself is the user's.
