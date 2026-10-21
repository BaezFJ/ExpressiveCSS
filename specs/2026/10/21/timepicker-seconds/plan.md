# Plan: timepicker seconds

Roadmap phase: Phase 16, timepicker seconds. Branch `feature/2026-10-21-timepicker-seconds` from `origin/master` at `8d45c2c4`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state where `npm test` passes, so each can be committed.

## 1. Seconds field and stepping

Outcome: `showSeconds` adds a seconds spin button that steps, accepts typed values and formats on focus out. Nothing writes seconds yet.

Prerequisites: none.

- [x] Add jsdom cases for the field's presence, attributes, name, tab order and absence without the option (V3), stepping and wrapping that leaves the rest alone (V4), and typed, invalid and emptied values (V5). Build and confirm they fail because there is no seconds field.
- [x] In `src/ts/components/timepicker.ts`, add `showSeconds`, `i18n.seconds` and the `seconds` property. Add the seconds divider and field to the template, and remove them in `_insertHTMLIntoDOM()` when the option is off.
- [x] Turn the hours-or-minutes branches in `_setupVariables()`, `_range()`, `_step()` and `_inputFromTextField()` into one per-field lookup, so seconds take the same path. Only hours and minutes move the hand.
- [x] Add `formatSeconds()` with the focus out listener, and call it from Enter.
- [x] Build and run the new cases plus `tests/regressions.test.js`, `tests/keyboard-focus.test.js` and `tests/hot-paths.test.js`.

Completion check: V3 to V5 pass, and the existing Timepicker jsdom tests pass.

Covers: R1 to R3; V3 to V5.

## 2. Writing and reading seconds

Outcome: the input gets `HH:MM:SS`, and opening the picker reads seconds back.

Prerequisites: group 1.

- [x] Add jsdom cases for `done()` in both clocks and a `type="time"` input (V6), reading values, `defaultTime` and `'now'` (V7), Enter commits from the seconds field (V8) and the unchanged output without the option (V9). Build and confirm the new ones fail.
- [x] Append seconds in `done()` and `_inputValue()` when the option is on.
- [x] Move the parsing in `_updateTimeFromInput()` into a small function that finds AM or PM in the whole value and reads hours, minutes and seconds, including the current second for `'now'`. Add a case for `02:30:45 PM` without the option (V14).
- [x] Add `tests/timepicker-seconds-browser.test.js` with the roadmap check in Chromium, Firefox and WebKit (V1).
- [x] Build and run the jsdom files and the new browser file.

Completion check: V1 and V6 to V9 pass, V1 in all three engines.

Covers: R4 to R6, R8, R11; V1, V6 to V9, V14.

## 3. Layout

Outcome: three fields and AM/PM fit in every display.

Prerequisites: group 1.

- [x] In `src/sass/components/_timepicker.scss`, narrow the field wrappers, digits and dividers when the digital clock holds a seconds field, with sizes in `rem()`. Leave the two-field layout as it is.
- [x] Add the layout case to the browser file: inline, docked and modal, narrow and expanded widths, 12-hour and 24-hour (V2). Add the static `rem` check to the jsdom file (V13).
- [x] Take screenshots of the 12-hour inline picker at both widths and look at them.
- [x] Build and run the browser file, `tests/modal-picker-browser.test.js` and `tests/docked-picker-browser.test.js`.

Completion check: V2 passes in all three engines, the screenshots show no clipped digits, and the existing picker browser tests pass (V9).

Covers: R7, R8; V2, V9, V13.

## 4. Docs, generated guidance and budget

Outcome: authors and agents can find the option, and the size change is reviewed.

Prerequisites: groups 2 and 3.

- [ ] Document `showSeconds`, `i18n.seconds`, `seconds`, the value format in `done()` and `time`, the `step="1"` advice and the field-only dial in `docs/src/pages/timepicker.astro` and the Timepicker section of `llm.md`. Add a seconds example to the docs page, and start it from `docs/static/docs.js` through a table with the 24-hour example.
- [ ] Add the changelog entries: the option under Unreleased, Added, and the AM/PM reading fix under Fixed.
- [ ] Run `npm run build:skill` and `npm run check:generated`.
- [ ] Add reviewed JavaScript and CSS budget lines to `tests/selective-builds.test.js`, and update a `docs/src/data/component-decisions.json` source pin only where `tests/expressivecss-component-decisions.test.js` fails on a pin that matched at the base commit.
- [ ] Run `node --test tests/selective-builds.test.js`, the docs and skill tests, and the fallow audit on the new functions.

Completion check: V10 and V11 pass.

Covers: R9, R10; V10, V11.

## 5. Final checks

Outcome: the phase is verified as a whole.

Prerequisites: groups 1 to 4.

- [ ] Run `npm run verify` once. Rerun any browser failure in untouched code alone before debugging it.
- [ ] Run `npm ci --prefix mcp/expressivecss`, then `npm test --prefix mcp/expressivecss`.
- [ ] Record results in [validation.md](validation.md) and have an independent reviewer trace each `R` ID to code and evidence.

Completion check: V12 passes, and every result in validation.md comes from a run.

Covers: R1 to R11; V12.
