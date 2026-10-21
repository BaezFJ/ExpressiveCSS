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
| V1 | R1, R4, R5 | `tests/timepicker-seconds-browser.test.js`: a `.field` input with `showSeconds: true`, `autoSubmit: false`, once with `twelveHour: true` and once with `false`, in Chromium, Firefox and WebKit. | Open with Enter, type 14 (or 02) in Hours, press Tab, type 30, press Tab, type 45, and press Enter in the seconds field. On the 12-hour clock, choose PM first. | Tab moves Hours, Minutes, Seconds in that order. The input reads `02:30:45 PM` on the 12-hour clock and `14:30:45` on the 24-hour clock. | Pending |
| V2 | R7 | The same file. 12-hour and 24-hour pickers with `showSeconds`, inline, docked and modal, at a 360px and a 1280px wide viewport. | Measure each field's `scrollWidth` against its `clientWidth`, and each field and the AM/PM column against the picker container's box. | No field scrolls its digits, and every field and the AM/PM column sit inside the container. A picker without the option keeps its field wrappers at `6.9rem` wide. | Pending |
| V3 | R1 | jsdom in `tests/timepicker-seconds.test.js`. | Init with and without `showSeconds`, and with `i18n: { seconds: 'Segundos' }`. | With the option, the third field is a spin button from 0 to 59 named `Seconds` (or `Segundos`), after the minute field in document order and before the AM/PM column. Without it, there is no `.timepicker-input-seconds` and only one divider. | Pending |
| V4 | R2 | Same file, seconds at 58 and hand on the minutes. | Press Up twice, Down, Page Up, Page Down in the seconds field, with a 12-hour picker at 11 PM. | The field reads 59, 00, 59, 04, 59. Hours, minutes, AM/PM, `currentView` and the hand's `x2` and `y2` stay the same. | Pending |
| V5 | R3 | Same file, with `Date` mocked. | Type `7`, then `75`, then `4x`, then leave the field; empty it and leave it; empty it and press Enter. | `7` sets seconds to 7 and focus out shows `07`. `75` and `4x` leave seconds at 7, and focus out shows `07`. An emptied field shows the mocked current second. | Pending |
| V6 | R5 | Same file. | Set 14:30:45 on a 24-hour picker, a 12-hour picker and a 12-hour `type="time"` picker and call `done()`. Then, under `autoSubmit`, set seconds to 45 and choose a minute on the dial with a pointer. | The inputs read `14:30:45`, `02:30:45 PM` and `14:30:45`. `time` reads `14:30:45`, `02:30:45` and `02:30:45`. The dial choice writes the time with `:45`. | Pending |
| V7 | R6 | Same file, with `Date` mocked. | Open pickers whose input holds `02:30:45 PM`, `14:30`, or nothing with `defaultTime: '14:30:45'` or `'now'`. | The fields read 02, 30, 45 with PM; 14, 30, 00; 14, 30, 45; and the mocked time with its second. | Pending |
| V8 | R4 | Same file, `autoSubmit` true and false. | Type seconds and press Enter in the seconds field. | The input gets the time with those seconds, Enter's default is prevented, and one `change` event fires. | Pending |
| V9 | R8 | Existing suites. | Run `tests/regressions.test.js`, `tests/keyboard-focus.test.js`, `tests/hot-paths.test.js`, `tests/ime-enter.test.js`, `tests/picker-locale.test.js`, `tests/modal-picker-browser.test.js` and `tests/docked-picker-browser.test.js`, one file at a time. Also run `tests/selection-events.test.js` and `tests/teardown.test.js`. In the new jsdom file, check a picker without the option writes `14:30`, reads `14:30:45` as 14:30, and still sends `select` with `(hour, minute)`. | All pass. | Pending |
| V10 | R9 | Plan group 4 edits. | `npm run build:skill`, then `npm run check:generated`. Run `node --test tests/docs-api.test.js tests/expressivecss-skill.test.js tests/expressivecss-component-decisions.test.js`. Read the docs page, `llm.md` and the changelog. | Generation is clean, the tests pass, and the docs cover every R9 item. | Pending |
| V13 | R7 | The built CSS. | In the new jsdom file, read the rules for the seconds layout from `dist/css/expressive.css`. | Every width, height and font size in them is in `rem`. | Pending |
| V14 | R11 | jsdom, without `showSeconds`, 12-hour. | Open a picker whose input holds `02:30:45 PM`. | The fields read 02 and 30 with PM. | Pending |
| V11 | R10 | A fresh build. | `node --test tests/selective-builds.test.js`; the fallow audit with `--gate-marker pre-commit`. | The budget test passes with reviewed JavaScript and CSS lines for this change. The fallow verdict is not `fail`. | Pending |
| V12 | R1 to R11 | All changes in place. | `npm run verify`, then `npm ci --prefix mcp/expressivecss` and `npm test --prefix mcp/expressivecss`. | Both pass. A browser failure in untouched code passes when rerun alone. | Pending |

## Manual checks

- Look at screenshots of the 12-hour inline picker with seconds at 360px and 1280px. Digits are whole, the dividers line up, and the AM/PM buttons are not squeezed. The agent takes and reads the screenshots. Pending.

## Merge conditions

- V1 to V14 pass, with all three engines run for V1 and V2.
- The fallow pre-commit gate passes.
- The repository's required CI checks pass and the pull request is reviewed. The agent opens and watches the pull request under separate user instructions (`babysit-pr`); the merge itself is the user's.
