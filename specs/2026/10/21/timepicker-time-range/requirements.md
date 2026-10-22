# Timepicker time range

Date: 2026-10-21
Roadmap phase: Phase 17, timepicker time range
Branch: `feature/2026-10-21-timepicker-time-range`
Base: `origin/master` at `f153b3e049af0c179f8650eb4cff4123e07c13dd`
Status: specified, waiting for review. Not implemented.

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 17](../../../../roadmap.md#phase-17-timepicker-time-range). The work order is in [plan.md](plan.md) and the acceptance checks are in [validation.md](validation.md).

## Phase selection

Phase 17 is the earliest unfinished phase. Its dependency, Phase 16 (timepicker seconds), merged before this base. The only other open phase is Phase 21. No branch or worktree for Phase 17 existed on 2026-10-21.

## Current behavior

These facts come from `src/ts/components/timepicker.ts` at the base commit.

- Every hour and minute is selectable. `_range()` returns a fixed range per field: hours 1 to 12 or 0 to 23, minutes and seconds 0 to 59. `_setupVariables()` writes it once to `aria-valuemin` and `aria-valuemax`.
- `_step()` moves a field by one (Up, Down) or five (Page Up, Page Down). Minutes and seconds wrap without carrying. `_stepHours()` steps hours round the day, so on a 12-hour clock passing 12 switches AM and PM.
- `_inputFromTextField()` accepts a typed whole number when `_fieldValue()` finds it inside `_range()`, and ignores anything else. The format helpers restore the field on focus out.
- `setHand()` turns a pointer position into an hour or minute and writes it to the field with no check. `_handleDocumentClickEnd()` then moves from hours to minutes, fires `select`, and under `autoSubmit` calls `done()` after a minute.
- `_updateTimeFromInput()` reads the input value, or `defaultTime`, through `readTime()`, which returns the 24-hour hour, minute and second and accepts `'now'` and a written AM or PM.
- The dial ticks are plain `div.timepicker-tick` elements, built once by `_buildHoursView()` and `_buildMinutesView()` through `_placeTick()`. They take pointer input only; the spin buttons are the keyboard and screen reader path.
- The AM/PM buttons are built in `_clockSetup()` on a 12-hour clock and set `amOrPm` with no check.

A page that accepts times only during opening hours has to check the value itself after the picker writes it. The picker still offers every time.

## Scope

In scope: the `minTime` and `maxTime` options, and their effect on the fields, typed values, the dial, the AM/PM buttons and the value read when the picker opens. Also the docs, `llm.md`, the changelog, the generated skill and MCP copies, and the gzip budget.

Out of scope:

- Ranges that cross midnight, such as 22:00 to 06:00. The interview chose same-day ranges only.
- Reading the `min` and `max` attributes of a `type="time"` input. The interview left them out. The docs advise authors to set them as well, so the browser validates the value.
- Setting `min`, `max` or `step` on the input. Static attributes belong to the author under the product rules.
- A step option, such as 15-minute slots, and lists of disabled times.

## Confirmed decisions

From the interview on 2026-10-21:

- The options are `minTime` and `maxTime`, 24-hour `'HH:MM'` or `'HH:MM:SS'` strings read by the existing `readTime()`.
- An hour stays enabled when any minute of it is in range. With 09:00 to 17:30, hour 17 is enabled and its minutes stop at 30.
- `minTime` must be before `maxTime`. Overnight ranges are excluded.
- Out-of-range ticks are styled as disabled, and the hand does not land on them.
- Stepping moves to the next allowed value and does not wrap past a bound.
- A typed value out of range is refused.
- A value outside the range when the picker opens clamps to the nearest bound. So does a minute or second that an hour change leaves out of range.
- A refused dial pick fires no `select` event.
- The work splits into four groups: range check, fields, dial, then docs and budget.

## Proposed decisions

These fill gaps the interview did not cover. Each follows the code or an existing convention. Review them before implementation.

- Both options default to `null`, meaning no bound. Either one alone bounds one end of the day. Any value `defaultTime` accepts works, because both go through `readTime()`.
- A `minTime` after `maxTime` logs one `console.warn` and the picker ignores both. The message follows the registry's wording, for example `Timepicker ignored minTime and maxTime: minTime is after maxTime.` Equal bounds allow one time.
- Without `showSeconds`, the picker writes whole minutes, so bounds compare at minute precision: the first allowed minute is `minTime` rounded up, and the last is `maxTime` rounded down. With `showSeconds`, bounds compare to the second.
- During a drag, the hand stays on the last allowed value it passed, and the device does not vibrate for a refused value. A release over a disabled value is refused. The view does not switch, `select` does not fire, `autoSubmit` does not write, and the fields keep the last allowed value.
- A tick gets the class `is-disabled`, the name the Datepicker uses for disabled days. It is drawn at the Material 3 disabled opacity and in `GrayText` under forced colors. The ticks stay out of the tab order as they are today.
- On a 12-hour clock, an AM or PM button gets the `disabled` attribute when no time in that half of the day is allowed. Switching the period clamps the time into range.
- On a 12-hour clock, the hour field's `aria-valuemin` and `aria-valuemax` give the lowest and highest allowed display number in the current period. With 09:00 to 17:30 in PM, the allowed hours are 12 and 1 to 5, so the field reads 1 to 12.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | `minTime` and `maxTime` options, both `null` by default, take a 24-hour `'HH:MM'` or `'HH:MM:SS'` string read by `readTime()`. Either alone bounds one end of the day. A `minTime` after `maxTime` logs one warning and is ignored with `maxTime`. |
| R2 | A time is allowed when it falls between the bounds, inclusive. An hour is enabled when any minute of it is allowed, and a minute when any second of it is allowed. Without `showSeconds`, bounds compare at minute precision: `minTime` rounds up and `maxTime` rounds down to a whole minute. |
| R3 | Up, Down, Page Up and Page Down in a field move to the allowed value one or five steps away. When every value of the field is allowed, the field wraps as it does today. Otherwise it stops at its last allowed value. With 09:00 to 17:30, Up at 17 stays at 17, Down at 09 stays at 09, and Up in the minutes at 17:30 stays at 30. On a 12-hour clock, hours step through the day and switch AM and PM as today, within the range. |
| R4 | A typed hour, minute or second that is not allowed is refused, as invalid text is today: the field keeps its last valid value and shows it on focus out. With 09:00 to 17:30, typing 08 or 18 in the hour field (8 AM or 6 PM on a 12-hour clock) is refused. Typing 17 with minutes at 45 is accepted, and the minutes clamp to 30. |
| R5 | Each field's `aria-valuemin` and `aria-valuemax` give its lowest and highest allowed value, and update whenever the hour, minute or period changes. |
| R6 | Dial ticks for values that are not allowed have the class `is-disabled`. They are drawn at the disabled opacity and in `GrayText` under forced colors. The minute ticks follow the current hour, and on a 12-hour clock the hour ticks follow the current period. |
| R7 | The hand does not land on a disabled value. A release over a disabled value changes no view, fires no `select` event and writes nothing under `autoSubmit`. With 09:00 to 17:30, clicking the 08 or 18 tick leaves the time unchanged, and choosing 17 then 30 by dial is accepted. |
| R8 | When the picker opens, a value from the input or `defaultTime` outside the range clamps to the nearest bound. After any hour or period change, a minute or second left out of range clamps to the nearest allowed value. |
| R9 | On a 12-hour clock, an AM or PM button with no allowed time in its half of the day is `disabled`. |
| R10 | `done()` keeps its formats: `HH:MM` or `HH:MM:SS`, AM or PM on a 12-hour text input, 24-hour in a `type="time"` input. With 09:00 to 17:30, 17:30 writes `17:30`, `05:30 PM` on a 12-hour clock, and `17:30` in a `type="time"` input. |
| R11 | Without `minTime` and `maxTime`, the Timepicker behaves as before and every existing Timepicker test passes unchanged. |
| R12 | The Timepicker docs page and the Time Picker section of `llm.md` document `minTime`, `maxTime`, the minute-precision rule, clamping, the disabled ticks and AM/PM buttons, and the advice to also set `min` and `max` on a `type="time"` input. The docs page has a live 09:00 to 17:30 example. The unreleased changelog lists the options under Added. `npm run build:skill` regenerates the skill and MCP copies, and `npm run check:generated` passes. |
| R13 | Reviewed gzip budget lines in `tests/selective-builds.test.js` record the JavaScript and CSS growth. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- Make `_range()` depend on the other fields and the bounds, as the Phase 16 spec noted, and route `_fieldValue()`, `_step()`, `_stepHours()` and `setHand()` through it. Add no second path per field.
- Reuse `readTime()` for the bounds. Compare times as seconds since midnight.
- Keep key handlers wrapped in `Utils.ignoringComposition`.
- Size any new text-holding box in `rem()`. Borders and gaps stay in pixels.
- Read [the Sass architecture](../../../../../src/sass/README.md) before the tick styles and [the TypeScript conventions](../../../../../src/ts/README.md) before the component change.
- Depends on Phase 16 for `seconds`, `_units()`, `_unitOf()` and `readTime()`. Nothing depends on this phase.

## Open decisions

None blocks the work. The proposed decisions above wait for review and can change before group 1 starts.
