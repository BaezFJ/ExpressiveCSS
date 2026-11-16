# Scroll area drag and track press: plan

Phase 100: drag the thumb and page from the track. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Base `df7ba6d3b`.

Build before testing, and run one test suite at a time. Run `npm ci` in the worktree first if `node_modules` is a symlink. New cases go in `tests/scroll-area.test.js` (jsdom) and `tests/scroll-area-bar-browser.test.js` (browser).

## 1. Pointer target

Outcome: the bar takes pointer input and keeps focus, the selection and the wheel as they were. Prerequisites: none. Covers R1, R2, R3. Checks V1, V6.

- [x] Add the pointer-target cases: the bundle and computed styles (V1), and focus, selection, right button and wheel (V6). Change the phase 99 click-through assertion to expect the click to stay on the bar, and rename that test and the jsdom test titled "decorative". Watch V1 and the changed assertion fail.
- [x] In `src/sass/utilities/_scroll-area.scss`, remove `pointer-events: none` from the bar rule and add `touch-action: none`. Add `user-select: none` with its `-webkit-` form only if V6 shows an engine selecting text despite the cancelled press.
- [x] In `src/ts/components/scrollArea.ts`, add the bar's press listener with `this._events.signal`. It ignores a press that isn't the primary button of the primary pointer or that has Ctrl held, and it cancels the press so focus and the selection stay. V6 decides whether an engine needs `mousedown` cancelled as well as `pointerdown`.

Completion check: V1 and V6 pass in Chromium, Firefox and WebKit.

## 2. Thumb drag

Outcome: dragging the thumb scrolls the document in proportion and survives leaving the bar and the window. Prerequisites: group 1. Covers R4, R5, R6, R7, R8, R9, R11, R14. Checks V2, V4, V5, V7, V10, V11.

- [x] Add the jsdom drag cases (V2) and the browser cases (V4, V5, V7, V10, V11), and watch V2, V4, V5, V7 and V10 fail.
- [x] On a press inside the thumb's block range, computed from the live scroll metrics and not from an element box, capture the pointer on the bar and record the scroll position, `clientY` and the ratio. Do nothing when the travel is zero.
- [x] On `pointermove`, end the drag if the bar has no box (`getClientRects()` is empty; `offsetParent` is always null for a fixed element), otherwise call `scrollTo({ top, behavior: 'instant' })` on the instance's window. If V10 shows an engine withholding moves from a hidden or inert bar, also end the drag from the signal that engine gives, such as the lost capture or the measurement that sets `hidden`, and record it in validation.md.
- [x] End the drag on `pointerup`, `pointercancel` and `lostpointercapture`, and in `destroy()`.
- [x] Keep each function below complexity 5: one helper for the press, one for the move, one for the end.

Completion check: the drag half of the roadmap's check passes in all three engines (V4). On a page three windows tall, dragging the thumb through half of its travel leaves `scrollY` at half of the scrollable distance.

## 3. Track press

Outcome: a press on the track scrolls one window toward the press, once. Prerequisites: group 1. Covers R10, R11. Checks V3, V8.

- [x] Add the jsdom track cases (V3) and the browser cases (V8), and watch them fail.
- [x] On a press outside the thumb's block range, compare `clientY` with that range and call `scrollBy({ top: ±clientHeight })` on the instance's window, with no `behavior`.
- [x] Add no timer. A held press and a move during it do nothing.

Completion check: the track half of the roadmap's check passes in all three engines (V8). A press below the thumb moves `scrollY` by the window's height.

## 4. Edge clearance

Outcome: the app bar's trailing action and the two fixed controls are usable and 6px clear of the bar, and nothing changes on a page without it. Prerequisites: group 1. Covers R1, R12, R13. Checks V9.

- [x] Add the clearance cases (V9) with the app bar markup `docs/src/pages/navbar.astro` documents, placed as a child of `<body>` (the test file's `setup()` nests its extra markup in `#content`), and watch the trailing-button and 12px-distance cases fail.
- [x] In `src/sass/utilities/_scroll-area.scss`, set `--scroll-area-bar-clearance` on `html.scroll-area.custom:has(> .scroll-area-bar)` inside the existing `@media screen and (forced-colors: none) and (not (pointer: coarse))` block.
- [x] In `src/sass/components/_navbar.scss`, give `:root > body > header > #{$_bar}` and `:root > body > .scaffold > header > #{$_bar}` the declaration `padding-inline-end: var(--scroll-area-bar-clearance, 4px)`, placed after the existing `padding-inline: 4px` rule, beside `$_page-bar`, because the two selectors tie on specificity and the later one wins.
- [x] In `_back-to-top.scss` and `_fab-menu.scss`, leave the existing `inset-inline-end` and add `max(<offset property>, var(--scroll-area-bar-clearance, 0px))` under `html.scroll-area.custom:has(> .scroll-area-bar)`.
- [x] Confirm the app bar and back-to-top tests still pass unchanged.

Completion check: V9 passes in all three engines, in `ltr` and `rtl`.

## 5. Docs and records

Outcome: every reader in R16 agrees with the code. Prerequisites: groups 2, 3 and 4. Covers R15, R16. Checks V12.

- [x] Update `docs/src/pages/scroll-area.astro`, the scroll area section of `llm.md` and `skills/expressivecss/expressivecss-usage/references/helpers.md`: the drag, the track press without repeat, focus and selection, `--scroll-area-bar-clearance` with the new fixed-control guidance, and that the bar takes the press over edge content.
- [x] Add the clearance sentence to `docs/src/pages/navbar.astro`, `docs/src/pages/back-to-top.astro`, `docs/src/pages/floating-action-button.astro` and their sections of `llm.md`.
- [x] Reword the `semantics.json` note and run `npm run build:semantics`. Reword the class comment in `scrollArea.ts`.
- [x] Extend the Unreleased `ScrollArea` entry in `CHANGELOG.md`.
- [x] Measure the JS and CSS gzip sizes against a clean build of `df7ba6d3b` and add reviewed budget lines to `tests/selective-builds.test.js`.
- [x] In `docs/src/data/component-decisions.json`, re-pin `_back-to-top.scss`, whose pin matches its file at the base. Leave the pins for `_scroll-area.scss`, `_navbar.scss` and `_fab-menu.scss`, which already differed at the base, and leave `sourceRevision`.
- [x] Run `npm run build:skill` last.

Completion check: `npm run check:generated` and the docs-coverage, docs-astro, skill, semantics, selective-builds and component-decisions tests pass.

## 6. Suite

Outcome: the repository's required local checks pass on the phase's last commit. Prerequisites: group 5. Covers R17. Checks V13.

- [ ] `npm run verify`, with a long timeout.
- [ ] `npm test --prefix mcp/expressivecss`, after `npm ci --prefix mcp/expressivecss`.
- [ ] Rerun alone any failing test the phase doesn't touch before treating it as a failure, then run the verify steps the failure skipped.
- [ ] Record each result in [validation.md](validation.md) from the run's last line.

Completion check: both commands pass, or each failure is in a test the phase doesn't touch and passes alone.
