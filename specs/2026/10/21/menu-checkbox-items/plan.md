# Plan: menu checkbox items

Roadmap phase: Phase 11, menu checkbox items. Branch `feature/2026-10-21-menu-checkbox-items` from `origin/master` at `182d9af6`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

## 1. Failing tests

Outcome: tests that describe the new contract fail against the current bundle, and the regression tests pass.

Prerequisites: none.

- [ ] Add a browser test file, such as `tests/menu-checkbox-browser.test.js`, following the engine loop in `tests/menu-keys-placement-browser.test.js`. Cover the roadmap check: Space twice and one click on a checkbox item, `aria-checked` after each, the menu still open, and one `expressive:change` per toggle (V1).
- [ ] In the same file, cover Enter: it toggles, fires one event, closes the menu and returns focus to the trigger (V2).
- [ ] Add jsdom cases to `tests/menu.test.js` for the missing `aria-checked` value, the callback and event order, and the event detail (V3).
- [ ] Add jsdom cases for disabled checkbox items, plain and radio items, and `closeOnClick: false` with Enter (V4, V5).
- [ ] Add a case for a checkbox item in a submenu and one in a Menubar menu (V6).
- [ ] Run `npm test` and the new browser file; confirm the new cases fail for the expected reason and the existing menu tests pass.

Completion check: new cases fail on the missing toggle or the menu closing; nothing else fails.

Covers: R1 to R6; V1 to V6.

## 2. Toggle in `menu.ts`

Outcome: checkbox items toggle, stay open on click and Space, close on Enter, and report each change.

Prerequisites: group 1.

- [ ] In `_handleMenuClick()`, after the disabled and submenu guards, flip `aria-checked` on a `menuitemcheckbox` row before the existing `select` notification, then notify `change` with `{ item, checked }`. Keep each new helper below cyclomatic complexity 5.
- [ ] Keep the menu open after a click on a checkbox item. The document click handler reads the target recorded in `_menuClickTargets`; skip the `closeOnClick` close for a checkbox row.
- [ ] In `_handleMenuKeydown()`, after Enter activates a checkbox row, close the menu when `closeOnClick` is true. Space keeps the click path only.
- [ ] Run `npm test` and the browser file from group 1.

Completion check: every group 1 test passes in Chromium, Firefox and WebKit, and the existing menu, menubar, context menu, Select and Autocomplete tests pass (V7).

Covers: R1 to R6; V1 to V7.

## 3. Docs and generated guidance

Outcome: authors and agents read the new contract and the migration note.

Prerequisites: group 2.

- [ ] Update the selection section of `docs/src/pages/menu.astro`: the framework toggles `aria-checked` on `menuitemcheckbox` items, click and Space keep the menu open, Enter closes it. Add a small checkbox example if the section has none.
- [ ] Update the Menu section of `llm.md` the same way, and add Menu with `{ item, checked }` to the `expressive:change` rows of the events table.
- [ ] Add an Unreleased entry and migration note to `CHANGELOG.md`: remove page code that flips `aria-checked` on checkbox menu items.
- [ ] Check `semantics.json` for a menu rule that contradicts the new behavior. Edit it and run `npm run build:semantics` only if one does.
- [ ] Run `npm run build:skill`, then `npm run check:generated`.

Completion check: `npm run check:generated` passes, and the docs, `llm.md` and changelog describe R1 to R4 (V8).

Covers: R7; V8.

## 4. Budget and contributor checks

Outcome: the branch is ready for review.

Prerequisites: group 3.

- [ ] Build, read the new gzip size from the selective builds test, and add a reviewed budget line to `tests/selective-builds.test.js` (V9).
- [ ] Run `npm run verify` (V10).
- [ ] Run `npm test --prefix mcp/expressivecss`, since the generated skill and MCP copies changed (V11).
- [ ] Run `npm run verify:packages` (V12).
- [ ] Record each result, failure or skipped engine in `validation.md`.

Completion check: V1 to V12 pass, with any flaky rerun noted.

Covers: R8; V9 to V12.
