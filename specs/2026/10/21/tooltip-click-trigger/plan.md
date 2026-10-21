# Plan: tooltip click trigger

Roadmap phase: Phase 19, tooltip click trigger. Branch `feature/2026-10-21-tooltip-click-trigger` from `origin/master` at `8d45c2c4`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

Implemented 2026-10-21. The work went into one change, with the gzip budget line from group 4, so the commit passes `npm test`.

## 1. Failing tests

Outcome: tests that describe the new contract fail against the current bundle, and the existing Tooltip tests pass.

Prerequisites: none.

- [x] Add jsdom cases to `tests/tooltip.test.js` with mocked `setTimeout`: the default (V1), click toggling at once with long delays set (V2), hover and focus ignored (V3), outside and inside clicks, `open()` from a page button's click, and listener removal (V4), Escape (V5), blur to another element and blur to nothing (V6), and a trigger in an open and a closed shadow root (V7).
- [x] Add `tests/tooltip-click-browser.test.js`, following `tests/tooltip-touch-browser.test.js`, for Chromium, Firefox and WebKit: a real mouse click opens and closes, hover does not open, Enter and Space toggle, Escape and a click elsewhere close, Tab to the next control closes, and a touch press neither long-presses nor swallows the click (V8, V9).
- [x] Build with `npm run build:js`, run both files, and confirm the new cases fail while the existing cases pass.

Completion check: only the new click-mode cases fail.

Covers: R1 to R9; V1 to V9.

## 2. The option

Outcome: `openOnClick` toggles the tooltip on click and turns hover, focus and the long press off.

Prerequisites: group 1.

- [x] In `src/ts/components/tooltip.ts`, add `openOnClick: boolean` to `TooltipOptions` with a doc comment, and `openOnClick: false` to `_defaults`.
- [x] Move the long press's open-at-once steps (`open()`, clear the enter timer, `_animateIn()`) and Escape's close-at-once steps (`close()`, clear the exit timer, `_animateOut()`) into two small helpers, and call them from the long press, Escape and the new toggle. The long press keeps setting `isHovered` and `_touchShown` itself.
- [x] In `_handleClick`, toggle on `_shown` in click mode, before the long-press swallow path, which stays unchanged for the default mode. Add a capturing `click` listener on the tooltip element that marks its clicks. In `open()`, in click mode, add a bubble-phase document `click` listener after a 0 ms timer; it closes the tooltip at once on an unmarked click outside the trigger and the tooltip. Clear the timer and remove the listener in `close()` and `destroy()`.
- [x] Return early in click mode from the mouse enter and leave handlers, the focus handler, and the `pointerdown`, `pointerup` and `pointercancel` handlers. `pointerenter` keeps recording the touch. In `_handleBlur`, in click mode, close at once when focus moves to an element outside, and stay open when the blur has no new focus target.
- [x] Keep each new or changed function below cyclomatic complexity 5.
- [x] Build, then run `tests/tooltip.test.js`, `tests/keyboard-focus.test.js`, `tests/tooltip-click-browser.test.js`, `tests/tooltip-touch-browser.test.js` and `tests/tooltip-shadow-browser.test.js`, one file at a time.

Completion check: V1 to V10 pass.

Covers: R1 to R9; V1 to V10.

## 3. Docs and generated guidance

Outcome: authors and agents can find and use the option.

Prerequisites: group 2.

- [x] Add an `openOnClick` row to the options table in the Tooltips section of `llm.md` and in `docs/src/pages/tooltips.astro`, saying that keyboard use needs a button trigger. Add a sentence on click mode and touch to the touch paragraph in both, and say in the `open()` method text that a click tooltip also closes on an outside click.
- [x] Add an Unreleased Added entry to `CHANGELOG.md`.
- [x] Run `npm run build:skill`, then `npm run check:generated`.

Completion check: `npm run check:generated` passes, and the docs, `llm.md` and changelog describe R1 to R9 (V11).

Covers: R10; V11.

## 4. Budget and checks

Outcome: the branch is ready for review.

Prerequisites: group 3.

- [x] Build, read the new gzip size from the selective builds test, and add a reviewed budget line to `tests/selective-builds.test.js` (V12).
- [x] Rerun the suites from V10 one file at a time.
- [x] Run `npm run verify` once, then `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, and record what ran.
- [x] Record each result in `validation.md`.

Completion check: V1 to V12 pass.

Covers: R2, R11; V10, V12.
