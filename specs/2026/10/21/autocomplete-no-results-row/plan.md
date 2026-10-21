# Plan: autocomplete visible no-results row

Roadmap phase: Phase 15, autocomplete visible no-results row. Branch `feature/2026-10-21-autocomplete-no-results-row` from `origin/master` at `8d45c2c4`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

Implemented 2026-10-21. Groups 1 and 2 went into one commit, so every commit passes its tests. Group 1's pending-search case also checks that the row shows once the empty result arrives, so it failed against the old bundle along with the others; only the `minLength` part is a pure regression guard.

## 1. Failing tests

Outcome: tests that describe the row fail against the current bundle, and the existing Autocomplete tests pass.

Prerequisites: none.

- [x] Add a browser scenario to `tests/expressivecss-web-accessibility-browser.test.js`, which runs in Chromium, Firefox and WebKit. Type text with no match and see the row and its styles; press ArrowDown and Enter and see no active option and no selection; click the row and see nothing selected, the list open and focus in the field; type a match and see the row gone (V1, V2, V3).
- [x] Add jsdom cases to `tests/regressions.test.js` for the row's attributes, a custom `i18n.noResults`, `allowUnsafeHTML`, a pending search, `minLength`, and the multi-select fallback (V4, V5, V6).
- [x] Build with `npm run build:js` and `npm run build:css`, run both files, and confirm the new cases fail. The `minLength` case and the pending-search case pass on the current bundle too, since it never draws the row; they guard against regressions.

Completion check: only the new cases fail, apart from the two regression guards.

Covers: R1 to R6; V1 to V6.

## 2. The row

Outcome: the list shows the row when a search leaves no suggestions, and nothing can choose it.

Prerequisites: group 1.

- [x] In `src/ts/components/autocomplete.ts`, add a `_noResults` flag. `setMenuItems()` sets it from the result count, and `_inputChangeDetection()` clears it when the text changes.
- [x] In `_renderMenu()`, append the row first when the flag is set. Build it in a small helper.
- [x] In `_handleInputKeydown`, count, index and scroll `li[role="option"]` rows instead of every `li` and `container.children`.
- [x] Add one handler for `mousedown` and `click`, registered in the capture phase on the list in `_setupEventHandlers()` and removed in `_removeEventHandlers()`. It cancels and stops the event when the target is in the row.
- [x] In `src/sass/components/forms/_input-fields.scss`, style `.autocomplete-content > li.autocomplete-no-results` at menu row height, with Menu's insets and label type, `cursor: default` and the supporting text color.
- [x] Added during the final review: clear the flag in `_handleInput` before `open()`, and close the list in Chips' Enter handler (R11, V11).
- [x] Build, then run the V1 to V6 files and the V7 suites one file at a time.

Completion check: V1 to V7 pass.

Covers: R1 to R8; V1 to V7.

## 3. Docs and generated guidance

Outcome: authors and agents know the row exists and where its text comes from.

Prerequisites: group 2.

- [x] Add a sentence to the `i18n` paragraph in the Autocomplete section of `llm.md` and in `docs/src/pages/autocomplete.astro`: `i18n.noResults` is also the text of a visible row that is not an option.
- [x] Add an Unreleased entry to `CHANGELOG.md`.
- [x] Run `npm run build:skill`, then `npm run check:generated`.

Completion check: V8 passes.

Covers: R9; V8.

## 4. Budget and checks

Outcome: the branch is ready for review.

Prerequisites: group 3.

- [x] Build, measure the gzip sizes of `dist/js/expressive.min.js` and `dist/css/expressive.min.css` the way `tests/selective-builds.test.js` does, add reviewed budget lines, and run `fallow audit` against `origin/master` (V9).
- [x] Check the row by eye in a browser screenshot (V10).
- [x] Run `npm run verify` once, then `npm test --prefix mcp/expressivecss` and `npm run verify:packages`.
- [x] Record each result in `validation.md`.

Completion check: V1 to V10 pass or carry a recorded blocker.

Covers: R7, R8, R10; V7, V9, V10.
