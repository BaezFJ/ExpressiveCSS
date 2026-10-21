# Timepicker seconds

Date: 2026-10-21
Roadmap phase: Phase 16, timepicker seconds
Branch: `feature/2026-10-21-timepicker-seconds`
Base: `origin/master` at `8d45c2c4af6b6ccf0be918a4b2f325fae3978fb0`, the commit T3 created the worktree from on 2026-10-21
Status: specified 2026-10-21; implementation and validation follow in the same run

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 16](../../../../roadmap.md#phase-16-timepicker-seconds). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user assigned Phase 16 to this run on 2026-10-21. Other agents work Phases 14, 15 and 18 to 24 at the same time, so this run skipped the usual "earliest unfinished phase" selection. Phase 16 has no dependency. Phase 17, the time range, depends on it and starts after this phase merges.

## Delegation

The user invoked `feature-spec-auto`, which hands planning, requirements and validation to the agent and replaces the feature-spec interview. No user answered questions for this spec, and no user has reviewed it. The decisions below come from project evidence, and each one says which.

## Current behavior

These facts come from the source at the base commit.

- `src/ts/components/timepicker.ts` keeps `hours` and `minutes` on the instance. The digital display has two text fields, `.timepicker-input-hours` and `.timepicker-input-minutes`, separated by a `:` divider, then an AM/PM column that gets its buttons on a 12-hour clock.
- `_setupVariables()` makes both fields spin buttons: `role="spinbutton"`, `aria-valuemin` and `aria-valuemax` from `_range()`, and `aria-label` from `i18n.hours` and `i18n.minutes`.
- `_handleDigitalKeydown()` steps the focused field through `_step()`: Up and Down by one, Page Up and Page Down by five, wrapping. Enter formats both fields and commits. `_inputFromTextField()` accepts a typed whole number in range, and `formatHours()` and `formatMinutes()` restore or default the field on focus out. An emptied minute field takes the current minute.
- `_updateTimeFromInput()` splits the input value on `:` and looks for AM or PM only in the second part, so `02:30:45 PM` reads as 02:30 AM today. Any third part is ignored.
- `done()` writes `HH:MM`, plus ` AM` or ` PM` on a 12-hour clock, or 24-hour `HH:MM` into a `type="time"` input. `time` holds the clock's `HH:MM` without the period, so on a 12-hour clock it stays 12-hour even when a `type="time"` input gets the 24-hour value.
- Under `autoSubmit`, choosing a minute on the dial writes the input (`_handleDocumentClickEnd()`).
- The dial has an hours view and a minutes view. Focusing a field shows its view, and the dial takes pointer input only. The docs say the spin buttons give the keyboard and screen readers the same values.
- `src/sass/components/_timepicker.scss` sizes each field wrapper at `6.9rem` with `4rem` digits in a container capped at `325px`. A third field at that size does not fit.

A page that needs seconds today has to give up the Timepicker or write its own field.

## Decisions under delegation

### Dial: field only, no seconds view

The roadmap left open whether the dial gets a seconds view. The seconds field gets no dial view. Evidence:

- Material 3's time picker spec, which this framework follows, shows hours and minutes only. Its dial has no seconds face, so a seconds view would be a design the framework invents.
- The platform control the Timepicker writes to, `<input type="time" step="1">`, shows seconds as one more field segment.
- The roadmap's completion check sets and reads seconds through the fields only.
- The Timepicker docs already treat the spin buttons as the full keyboard and screen reader path, with the dial as a pointer shortcut. A seconds field gives every user a way to set seconds.
- A third view would need another view state, transition, tick set and `showView` value, all bundle size that the field does not need. Without a seconds view, Phase 17 has to bound seconds only in the field and in typed values.

Focusing the seconds field leaves the dial on its current view and does not move the hand.

### Other choices

- The option is `showSeconds`, a Boolean that defaults to `false`. The name follows `showClearBtn` in the same component. Off by default, existing pages write the same values as before, as the mission's product rules require.
- The new accessible name is `i18n.seconds`, default `'Seconds'`, following `i18n.hours` and `i18n.minutes`.
- An emptied seconds field takes the current second, as an emptied minute field takes the current minute.
- The `select` event and `onSelect` keep their `(hour, minute)` arguments and `{ hours, minutes }` detail. The dial chooses hours and minutes only. The seconds are on the instance as `seconds`.
- With `showSeconds`, a value read without seconds, such as `14:30` or `defaultTime: '14:30'`, reads as zero seconds. `'now'` reads the current second.
- AM or PM is found anywhere in the value, so `02:30:45 PM` reads as PM. This also fixes the current misreading of such a value when `showSeconds` is off, which the changelog lists under Fixed.
- Under `autoSubmit`, choosing a minute on the dial still writes the input, with the seconds the field shows. Moving focus to the seconds field instead would leave a pointer-only user with no way to commit, because `autoSubmit` has no Ok button.
- Value parsing moves into one small function that turns text into hours, minutes, seconds and a period. Phase 17 can read `minTime` and `maxTime` with it.
- A `type="time"` input that should hold seconds needs `step="1"` or another step under 60 in the author's markup. Without it, the browser flags the value as a step mismatch. The step is a static attribute, which belongs to the author under the mission's product rules, so the Timepicker does not set it. The docs say so.
- The seconds field steps with the same table as the other fields, and its range comes from `_range()`, which runs on every step and typed value. Phase 17 still has to make that range depend on the other fields and refresh `aria-valuemin` and `aria-valuemax` when they change; this phase does not.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | `showSeconds: true` adds a seconds field after the minute field, with its own `:` divider. It is a spin button: `role="spinbutton"`, `aria-valuemin="0"`, `aria-valuemax="59"` and `aria-label` from `i18n.seconds`, default `'Seconds'`. Tab moves from minutes to seconds, then to the AM/PM buttons. Without the option there is no seconds field, divider or label. |
| R2 | In the seconds field, Up and Down step by one, Page Up and Page Down by five, wrapping between 59 and 00. Stepping seconds leaves hours, minutes, AM/PM, the dial view and the hand unchanged. |
| R3 | Typing a whole number from 0 to 59 in the seconds field sets the seconds. Any other text is ignored, and focus out restores the field to the last valid value with two digits. An emptied field takes the current second on focus out or Enter. |
| R4 | Enter in the seconds field commits the time, as Enter in the hour or minute field does, under both `autoSubmit` settings. |
| R5 | With `showSeconds`, `done()` writes `HH:MM:SS`: 24-hour on a 24-hour clock, with ` AM` or ` PM` on a 12-hour clock, and always 24-hour into a `type="time"` input. `time` gains `:SS` and otherwise keeps its current form. Choosing a minute on the dial under `autoSubmit` writes the seconds the field shows. The roadmap's check holds: 14:30:45 set through the fields reads back as `14:30:45` on a 24-hour clock and `02:30:45 PM` on a 12-hour clock. |
| R6 | With `showSeconds`, opening the picker reads seconds from the input's value, or from `defaultTime` when the input is empty. A value without seconds reads as `00`, and `'now'` reads the current second. AM or PM anywhere in the value sets the period. |
| R7 | The three fields and the AM/PM column fit inside the picker without clipping their digits, in the default layout and the wide layout from the `expanded` breakpoint, inline, docked and in the modal dialog. Field boxes are sized in `rem()`. |
| R8 | Without `showSeconds`, the Timepicker writes `HH:MM` exactly as before and reads values as before apart from R11, the two fields keep their sizes, and every existing Timepicker test passes. |
| R9 | The Timepicker docs page and the Timepicker section of `llm.md` document `showSeconds`, `i18n.seconds`, the `seconds` property, the `HH:MM:SS` value in `done()` and the `time` property, the `step="1"` advice for `type="time"` inputs and the field-only dial. The docs page has a live seconds example. The unreleased changelog lists the option under Added and R11 under Fixed. `npm run build:skill` regenerates the skill and MCP copies, and `npm run check:generated` passes. |
| R10 | The bundle growth is recorded in reviewed gzip budget lines in `tests/selective-builds.test.js`, for JavaScript and for CSS. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |
| R11 | With or without `showSeconds`, a value with AM or PM after its seconds, such as `02:30:45 PM`, reads with that period. Today it reads as AM. |

## Constraints and dependencies

- Extend the existing field paths (`_range()`, `_step()`, `_inputFromTextField()`, the format helpers and `_handleDigitalKeydown()`) instead of adding a second path for seconds.
- Keep key handlers wrapped in `Utils.ignoringComposition`.
- Read the [Sass architecture](../../../../../src/sass/README.md) before changing `_timepicker.scss`. Text-holding boxes use `rem()`; borders and gaps stay in pixels.
- Tests run against built bundles. Build before testing, and tear instances down in `finally` blocks.
- `docs/static/docs.js` starts docs examples inside one large `DOMContentLoaded` handler that is already over the fallow limit. Start the new example through a table, not another `if`.

## Out of scope

- A seconds view on the dial.
- `minTime`, `maxTime` and any other range limit (Phase 17).
- Reading the input's `step` attribute to turn seconds on, and setting `step` on the input.
- Fractions of a second, and a seconds step other than one and five.
- Carrying a wrap from seconds into minutes.
- Seconds in the `select` event or `onSelect`.
- Roadmap edits, release and publication.

## Open decisions

None. The decisions above stand unless the user changes them in review.
