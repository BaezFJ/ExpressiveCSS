# Tooltip shared delay

Date: 2026-10-21
Roadmap phase: Phase 18, tooltip shared delay
Branch: `feature/2026-10-21-tooltip-shared-delay`
Base: `origin/master` at `8d45c2c4af6b6ccf0be918a4b2f325fae3978fb0`
Status: implemented and locally verified 2026-10-21; CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 18](../../../../roadmap.md#phase-18-tooltip-shared-delay). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Delegation and phase choice

The user ran this phase through `feature-spec-auto` and named Phase 18 directly, because several roadmap phases are being built in parallel. Earlier unfinished phases were not considered. Phase 18 has no dependency. The user delegated the plan, requirements and validation choices to the agent and asked to be consulted only on blockers. No user answered an interview, and no user has reviewed this spec.

Phase 19, the tooltip click trigger, is being built at the same time in `src/ts/components/tooltip.ts`. This phase keeps its change away from the event handlers that Phase 19 is likely to touch.

## Current behavior

These facts come from `src/ts/components/tooltip.ts` at the base commit.

- Each Tooltip instance waits its own `enterDelay` (default `0`) before showing. `open()` calls `_setEnterDelayTimeout`, which schedules `_animateIn` after `options.enterDelay` milliseconds. Hover (`_handleMouseEnter`), keyboard focus (`_handleFocus`) and the public `open()` all go through it.
- `close()` schedules `_animateOut` after `exitDelay` (default `200`), so a tooltip stays visible for that long after the pointer leaves.
- `_animate(show)` calls `_reportShown(show)`, which tracks whether the tooltip is visible in `_shown` and fires `expressive:open` and `expressive:close` once per change.
- A touch long press shows the tooltip at once, without `enterDelay`.
- No state is shared between instances. In a toolbar of buttons with `enterDelay: 500`, moving from one button to the next waits half a second each time, even though the reader has already shown they want tooltips.

## Decisions

The roadmap fixes the behavior: after one tooltip closes, another opened within a short window shows at once without its `enterDelay`. It leaves the window length and its configuration open. The agent made these choices under delegation; the user can overturn any of them in review.

- **Window length: 300 ms after the closing tooltip's `exitDelay` ends.** Radix's `Tooltip.Provider` skips the delay for `skipDelayDuration`, default 300 ms, after a tooltip closes ([Radix tooltip docs](https://www.radix-ui.com/primitives/docs/components/tooltip)). MUI keeps a shorter `enterNextDelay` for 800 ms after a tooltip starts closing (`hystersisTimer` in [Tooltip.js](https://github.com/mui/material-ui/blob/master/packages/mui-material/src/Tooltip/Tooltip.js)). ExpressiveCSS counts the 300 ms from the end of the closing tooltip's `exitDelay`, when its fade-out starts. The docs say so, rather than "after it hid", because the fade itself takes `outDuration`. With the default `exitDelay` of 200 ms, the reader has about half a second from leaving one trigger to reaching the next, between the two references.
- **A closing tooltip opens the window.** The window starts when `close()` runs on a tooltip that is showing and lasts through its `exitDelay` plus 300 ms. Moving quickly between adjacent buttons reaches the next one while the first is still visible, so that case is covered too. A tooltip that stays open, through focus, `open()` or a touch linger, does not change other tooltips' delays until it closes, which matches the roadmap's "after one tooltip closes".
- **The tooltip's own close counts too.** Re-hovering the same trigger inside the window shows it at once, as Radix does. Telling instances apart would add state without a use case.
- **Two module timestamps, no registry of instances.** `close()` records when the window starts and when it ends. A close inside an open window only extends its end, so a tooltip with a short `exitDelay` cannot cut short the window of one with a long `exitDelay` that is still closing. A tooltip opens without delay only while the clock is between the two. A clock earlier than the start, after a backward jump of the system clock, is outside the window. No instance is held in module state, so a destroyed tooltip, or a trigger removed without `destroy()`, cannot hold the window open.
- **Known limit.** A tooltip closed and reopened during its own `exitDelay`, by a re-hover or `open()`, leaves the window set until it ends, although that tooltip is open again. Another tooltip opened by focus or `open()` in that time skips its delay. With a mouse this has no effect, since reaching another trigger closes the first.
- **Not configurable.** The window is a module constant next to `LONG_PRESS` and `TOUCH_LINGER`, which are also fixed. It is shared by every instance, so a per-instance option would raise the question of whose value wins, and no project evidence asks for another length. An option can be added later without breaking anything.
- **On by default, with a changelog note.** The skip only changes pages that set `enterDelay` above `0`, and there it only shortens a wait. The mission allows a behavior change that ships with a migration note, so the changelog entry says what changed and that `enterDelay` still applies to the first tooltip.
- **Every delayed open takes part.** Hover, keyboard focus and `open()` share `_setEnterDelayTimeout`, so all three skip the delay inside the window. Splitting them would add branches without a use case. Phase 19's click trigger goes through `open()` as well, so a click-opened tooltip that closes opens the window the same way.
- **The clock is `Date.now()`.** `node:test` mock timers can advance `Date` together with `setTimeout`, which keeps the jsdom tests deterministic. The bundle imported by `tests/setup.js` reads Node's global `Date`, so the mock reaches it. `performance.now()` stays where the touch code already uses it.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | When a tooltip opens within 300 ms after a closing tooltip's `exitDelay` ended, the tooltip itself included, it shows without waiting its `enterDelay`. The show still runs from a timer with no delay, as `enterDelay: 0` does today, so `inDuration` and the `expressive:open` event behave as before. |
| R2 | When a tooltip opens while another tooltip is in its `exitDelay` after `close()`, it shows without waiting its `enterDelay`, even if a tooltip with a shorter `exitDelay` closed after it. |
| R3 | When a tooltip opens after the window, it waits its full `enterDelay`, as today. A tooltip that is open and not closing does not shorten other tooltips' delays. |
| R4 | Only a tooltip that was showing opens the window. A tooltip closed while it was still waiting its `enterDelay` does not shorten the next one's wait. |
| R5 | `destroy()` without `close()` leaves the window as it was. No Tooltip instance is kept in module state. |
| R6 | `exitDelay`, the touch long press and linger, Escape dismissal and the `open`/`close` events keep their current behavior. With `enterDelay: 0` nothing changes. The existing Tooltip test files pass unchanged. |
| R7 | Docs and generated guidance describe the behavior. The Tooltips Initialization text and the `enterDelay` option row in `llm.md` and `docs/src/pages/tooltips.astro`, and the `enterDelay` JSDoc in `tooltip.ts`, say that a tooltip opened while a tooltip is closing, or within 300 ms after that one's `exitDelay` ends, appears without `enterDelay`. The unreleased changelog lists it under Changed with the migration note. `npm run build:skill` regenerates the derived files, `npm run check:generated` passes, and the MCP tests pass. |
| R8 | The bundle size change is recorded in a reviewed gzip budget line in `tests/selective-builds.test.js`. New or changed functions stay below cyclomatic complexity 5 for the fallow gate. |

## Constraints and dependencies

- Keep the change inside `close()` and `_setEnterDelayTimeout`, plus two module timestamps and a constant. Do not touch the hover, focus, touch or click handlers, which Phase 19 is changing.
- Add no option, no dependency and no helper in `core/` for one caller.
- The window is a runtime behavior, not markup, so `semantics.json` does not change.
- Tests run against built bundles. Build before testing, and tear down instances and mocked timers in `finally` blocks.

## Out of scope

- Closing the previous tooltip at once when the next one shows. The previous tooltip still hides after its own `exitDelay`.
- A configurable window, a per-instance opt-out, or a separate "next" delay like MUI's `enterNextDelay`.
- Grouping tooltips, for example per toolbar. The window is shared by every Tooltip instance in the bundle.
- Letting a tooltip that stays open shorten other tooltips' delays.
- CSS-only tooltips, which have no runtime.
- Phase 19's click trigger, roadmap edits, release and publication.

## Open decisions

None. The decisions above stand unless the user changes them in review.
