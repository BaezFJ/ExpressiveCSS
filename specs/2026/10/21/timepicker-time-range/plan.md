# Plan: timepicker time range

Roadmap phase: [Phase 17, timepicker time range](../../../../roadmap.md#phase-17-timepicker-time-range). Branch `feature/2026-10-21-timepicker-time-range` from `origin/master` at `f153b3e0`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each ends with `npm test` passing, so each can be committed on its own.

## 1. Range options and the shared check

Outcome: the picker knows which times are allowed, clamps the time it opens with, and writes only allowed times. The fields and dial do not enforce the range yet.

Prerequisites: none.

- [ ] Add jsdom cases to a new `tests/timepicker-time-range.test.js` for option defaults, a single bound and reversed bounds (V2), minute precision (V3), clamping on open (V7) and `done()` output (V9). Build and confirm they fail.
- [ ] In `src/ts/components/timepicker.ts`, add `minTime` and `maxTime` to `TimepickerOptions` and `_defaults`. Read them once with `readTime()` into seconds since midnight, round them to whole minutes without `showSeconds`, and warn and drop them when `minTime` is after `maxTime`.
- [ ] Make `_range(unit)` return the lowest and highest allowed value of a field given the other fields and the period, with small helpers to stay below complexity 5.
- [ ] Add one clamp helper that moves the time to the nearest allowed value, and call it at the end of `_updateTimeFromInput()`.
- [ ] Build and run the new file plus `tests/timepicker-seconds.test.js` and `tests/regressions.test.js`.

Completion check: V2, V3, V7 and V9 pass, and the existing Timepicker jsdom tests pass.

Covers: R1, R2, R8 (on open), R10, R11; V2, V3, V7, V9.

## 2. Fields and AM/PM buttons

Outcome: stepping, typing and the AM/PM buttons keep the time in range, and the spin buttons announce the allowed range.

Prerequisites: group 1.

- [ ] Add jsdom cases for stepping (V4), typing (V5), `aria-valuemin` and `aria-valuemax` (V6), clamping after an hour change (V8) and the AM/PM buttons (V10). Build and confirm they fail.
- [ ] Change `_step()` and `_stepHours()` to stop at the allowed bound, and to keep today's wrap when the whole field is allowed.
- [ ] `_fieldValue()` already checks `_range()`; make the 12-hour hour check compare the day hour for the current period.
- [ ] After any hour or period change, clamp the time and refresh every field's `aria-valuemin` and `aria-valuemax` through one helper, also called from `_setupVariables()`.
- [ ] Set `disabled` on an AM or PM button with no allowed time in its half, and clamp the time in `_handleAmPmInteraction()`.
- [ ] Build and run the new file, `tests/timepicker-seconds.test.js`, `tests/keyboard-focus.test.js`, `tests/ime-enter.test.js` and `tests/hot-paths.test.js`, one at a time.

Completion check: V4 to V6, V8 and V10 pass, and the files listed pass.

Covers: R3 to R5, R8, R9; V4 to V6, V8, V10.

## 3. Dial

Outcome: disabled ticks look disabled, and the hand refuses them.

Prerequisites: group 2.

- [ ] Add jsdom cases for the tick classes (V11) and a refused pointer pick (V12), and a static check of the built CSS (V13). Add `tests/timepicker-time-range-browser.test.js` with the roadmap check (V1). Build and confirm they fail.
- [ ] Toggle `is-disabled` on the ticks from one helper, called when the dial is built, when the view shows, and after an hour or period change.
- [ ] In `setHand()`, ignore a value outside `_range()`, so the hand and field keep the last allowed value and the device does not vibrate.
- [ ] In `_handleDocumentClickEnd()`, refuse a release over a disabled value: no view switch, no `select`, no `autoSubmit` write.
- [ ] In `src/sass/components/_timepicker.scss`, style `.timepicker-tick.is-disabled` in the on-surface color at 38%, with no hover state, and in `GrayText` under forced colors.
- [ ] Build and run the new jsdom and browser files, then `tests/docked-picker-browser.test.js` and `tests/modal-picker-browser.test.js`.

Completion check: V1 and V11 to V13 pass, V1 in Chromium, Firefox and WebKit.

Covers: R6, R7; V1, V11 to V13.

## 4. Docs, generated guidance, budget and final checks

Outcome: the options are documented, generated copies are current, the budget is reviewed, and the full checks pass.

Prerequisites: group 3.

- [ ] Document R12's items in `docs/src/pages/timepicker.astro` and the Time Picker section of `llm.md`. Add a live 09:00 to 17:30 example, started from `docs/static/docs.js` the way the seconds example is.
- [ ] Add the options to the unreleased Added section of `CHANGELOG.md`.
- [ ] Add reviewed JavaScript and CSS budget lines to `tests/selective-builds.test.js`. Update a `docs/src/data/component-decisions.json` source pin only where `tests/expressivecss-component-decisions.test.js` fails on a pin that matched at the base commit.
- [ ] Run `npm run build:skill` after the last edit to any source the contract hash covers, then V14 to V16.

Completion check: V14 to V16 pass and every merge condition in validation.md except review and merge is met.

Covers: R11 to R13; V14 to V16.
