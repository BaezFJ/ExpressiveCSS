# Plan: tooltip shared delay

Roadmap phase: Phase 18, tooltip shared delay. Branch `feature/2026-10-21-tooltip-shared-delay` from `origin/master` at `8d45c2c4`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

Implemented 2026-10-21. The window lives in `close()` and `_setEnterDelayTimeout`; no handler changed. The docs page has no Initialization prose on touch, so the shared-delay sentence went into its runtime paragraph beside the touch text.

## 1. Failing tests

Outcome: tests that describe the shared delay fail against the current bundle, and the existing Tooltip tests pass.

Prerequisites: none.

- [x] Add jsdom cases to `tests/tooltip.test.js` with two triggers, `enterDelay: 500` and `t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now })`, reset in `finally`. Give each case a mocked start time later than real time and later than the previous case, so a window recorded by another case never reaches it. Cover R1 to R5 as V1 to V5 describe.
- [x] Add a three-engine Playwright test, `tests/tooltip-shared-delay-browser.test.js`, that moves a real mouse across two toolbar buttons (V6), following `tests/tooltip-touch-browser.test.js`.
- [x] Build with `npm run build`, run `node --test tests/tooltip.test.js`, and confirm the new skip cases fail while the existing cases pass.

Completion check: only the new cases that expect a skipped delay fail.

Covers: R1 to R5; V1 to V6.

## 2. Shared state in Tooltip

Outcome: a tooltip opened while another is closing, or within 300 ms after it hid, shows without its `enterDelay`.

Prerequisites: group 1.

- [x] In `src/ts/components/tooltip.ts`, add a 300 ms window constant next to `LONG_PRESS`, and two module timestamps for the start and end of the window, both starting at `-Infinity`.
- [x] In `close()`, when the tooltip is showing (`_shown`), set the start to `Date.now()` and the end to `Date.now() + exitDelay + 300`.
- [x] In `_setEnterDelayTimeout`, use a delay of `0` while `Date.now()` is between the start and the end; otherwise use `enterDelay`.
- [x] Update the `enterDelay` JSDoc.
- [x] Keep each changed function below cyclomatic complexity 5. Leave the hover, focus, touch and click handlers alone.
- [x] Build, then run `tests/tooltip.test.js` and the new browser test.

Completion check: V1 to V6 pass.

Covers: R1 to R5; V1 to V6.

## 3. Regressions, docs and generated guidance

Outcome: existing tooltip behavior holds, and authors and agents can read about the shared delay.

Prerequisites: group 2.

- [x] Run the existing tooltip-related suites one file at a time (V7).
- [x] Add a sentence on the shared delay to the Initialization paragraph and the `enterDelay` option row in the Tooltips section of `llm.md`, and to the matching paragraph and row in `docs/src/pages/tooltips.astro`.
- [x] Add an Unreleased Changed entry to `CHANGELOG.md` with the migration note.
- [x] Run `npm run build:skill`, then `npm run check:generated` and `npm test --prefix mcp/expressivecss` (V8).

Completion check: V7 and V8 pass.

Covers: R6, R7; V7, V8.

## 4. Budget and checks

Outcome: the branch is ready for review.

Prerequisites: group 3.

- [x] Run `npx fallow audit --base 8d45c2c4 --quiet` for the complexity gate (V10).
- [x] Build, read the new gzip size from `tests/selective-builds.test.js`, and add a reviewed budget line (V9).
- [x] Run `npm run verify` once, and rerun alone any browser test that fails outside the tooltip code before debugging it.
- [x] Record each result in `validation.md`.

Completion check: V1 to V10 pass.

Covers: R8; V9, V10.
