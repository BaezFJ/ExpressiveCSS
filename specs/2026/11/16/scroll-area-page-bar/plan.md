# Scroll area page bar: plan

Phase 99: draw a custom vertical bar for the page. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Base `644c91760`.

Build before testing, and run one test suite at a time. Run `npm ci` in the worktree first if `node_modules` is a symlink.

## 1. Semantics row and component shell

Outcome: `ScrollArea` exists, is exported, and draws nothing yet. Prerequisites: none. Covers R1, R12, R14. Checks V1, V2.

- [x] Add the scroll area row to `semantics.json` and run `npm run build:semantics`.
- [x] Add `tests/scroll-area.test.js` (jsdom) with the structure, non-root, double-init, destroy and AutoInit cases, and watch it fail.
- [x] Write `src/ts/components/scrollArea.ts`: the class, the bar and thumb elements, `destroy()`. Export it from `components/index.ts`.
- [x] Register it in `components/registry.ts` with the selector `.scroll-area.custom`, and make `AutoInit` claim `<html>` for this entry only when its context is the document's body.
- [x] Add the `tests/fixtures.js` entry and move `AUTO_INIT_FIXTURES.length`.

Completion check: `node --test tests/scroll-area.test.js tests/autoinit.test.js tests/semantics.test.js` passes after `npm run build`.

## 2. Bar styles and the native bar

Outcome: the bar is placed and themed, and the native bar hides only while the bar element exists. Prerequisites: group 1. Covers R2, R3, R4, R11, R13. Checks V3, V4, V8, V9.

- [x] Add `tests/scroll-area-bar-browser.test.js` with the placement, native-bar, no-runtime, forced-colors, coarse-pointer, print and fixed-control cases, and watch the native-bar and fixed-control cases fail.
- [x] Add `--expressive-z-scroll-area: 999` and its place in the order comment to `src/sass/tokens/_stacking.scss`, and add `scroll-area` between `modal-rail` and `sheet` in the order list of the stacking test in `tests/tokens.test.js`.
- [x] Add the bar, thumb and native-bar rules to `src/sass/utilities/_scroll-area.scss`, with the forced-colors, coarse-pointer, print and modal-dialog rules.
- [x] Add the drawn bar's line to `tests/forced-colors.test.js`.

Completion check: the new browser test's group 2 cases pass in Chromium, Firefox and WebKit, and the three tests in `tests/scroll-area-browser.test.js` still pass.

## 3. Thumb length and position

Outcome: the thumb's length and position follow the document in both paths. Prerequisites: group 2. Covers R5, R6, R7, R8, R9, R10. Checks V2, V5, V6, V7.

- [x] Add the geometry, growth, shrink, unscrollable, `overflow: hidden` and reduced-motion cases to the browser test, and the two-path listener cases to the jsdom test, and watch them fail.
- [x] Measure in one private method: length with the 48px floor, the `hidden` attribute, and the custom properties the styles read, each with a `var()` fallback.
- [x] Observe `<html>` and `<body>` with one `ResizeObserver`, listen for the window's `resize`, measure once at init, and add the public `refresh()`.
- [x] Add the scroll-timeline keyframes under `@supports (animation-timeline: scroll())`, and the passive, frame-coalesced `scroll` listener where `CSS.supports` is false.

Completion check: the geometry half of the roadmap's check passes in all three engines (V5): a page three windows tall shows a thumb a third of the track's length, and after scrolling to the end the thumb touches the track's end. The forced-colors half is V8, from group 2.

## 4. Docs and records

Outcome: every reader in R15 agrees with the code. Prerequisites: group 3. Covers R15. Checks V10.

- [x] Document the modifier in `docs/src/pages/scroll-area.astro` with a live example, and add `exports: ["ScrollArea"]` in `docs/src/data/nav.ts`.
- [x] Update `llm.md` (the scroll area section and both AutoInit tables), `docs/src/pages/auto-init.astro` and `skills/expressivecss/expressivecss-usage/references/helpers.md`.
- [x] Add the CHANGELOG entry.
- [x] Measure the CSS and JS gzip sizes against the merge base `644c91760` and add reviewed budget lines to `tests/selective-builds.test.js`.
- [x] Re-pin the two scroll area capability pins in `docs/src/data/component-decisions.json` if they matched at the base, and pin any `sourceRevision` to a branch commit that holds the new files.
- [x] Move any hardcoded skill counts the generator's output changes, then run `npm run build:skill` last.

Completion check: `npm run check:generated` and the docs-coverage, skill, tokens, selective-builds and component-decisions tests pass.

## 5. Suite

Outcome: the repository's required local checks pass on the phase's last commit. Prerequisites: group 4. Covers R16. Checks V11.

- [x] `npm run verify`, with a long timeout.
- [x] `npm test --prefix mcp/expressivecss`, after `npm ci --prefix mcp/expressivecss`.
- [x] Rerun alone any failing test the phase doesn't touch before treating it as a failure, then run the verify steps the failure skipped.
- [x] Record each result in [validation.md](validation.md) from the run's last line.

Completion check: both commands pass, or each failure is in a test the phase doesn't touch and passes alone.
