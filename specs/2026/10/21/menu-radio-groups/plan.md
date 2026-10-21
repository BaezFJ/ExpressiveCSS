# Plan: menu radio groups

Roadmap phase: Phase 12, menu radio groups. Branch `feature/2026-10-21-menu-radio-groups` from `origin/master` at `02f5e3fc`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

## 1. Failing tests

Outcome: tests that describe the new contract fail against the current bundle, and the existing menu tests pass.

Prerequisites: none.

- [ ] Add `tests/menu-radio-browser.test.js`, following the engine loop in `tests/menu-checkbox-browser.test.js`. Cover the roadmap check with two named groups in one menu: arrow keys across the group boundary, Space in one group, a click in the other, and Enter (V1).
- [ ] In the same file, cover Home, End, type-ahead and initial focus reaching group rows, the wrapper `li` never taking focus, and a group row matching a direct row's size and selected style (V2).
- [ ] Add jsdom cases to `tests/menu.test.js` for the check order, event detail and an already checked item (V3, V4).
- [ ] Add jsdom cases for disabled radio items, ungrouped radio items, plain and checkbox rows inside a group, and `closeOnClick: false` (V5).
- [ ] Add a jsdom case for a Menu of `[data-theme-set]` radio items with the Theme behavior running (V6).
- [ ] Add jsdom cases for a group in a submenu and in a Menubar menu (V7).
- [ ] Build, run `npm test` and the new browser file, and confirm the new cases fail for the expected reason while the existing menu tests pass.

Completion check: the new cases fail on unreachable group rows, unchanged `aria-checked` or the menu closing; nothing else fails.

Covers: R1 to R10; V1 to V7.

## 2. Group markup

Outcome: rows inside a group are set up, reachable and styled like direct rows. Nothing checks yet.

Prerequisites: group 1.

- [ ] Add one helper in `src/ts/components/menu.ts` that returns a list's rows: its direct `li` rows plus the rows of each `:scope > li > ul[role="group"]`, in document order, without the wrapper `li`.
- [ ] Use it in `_moveFocus()`, `_focusInitialItem()`, `_focusFocusedItem()`, type-ahead and the Space/Enter fallback that reads `focusedIndex`. Base `focusedIndex` on that row list, or replace the index with the focused row, so `_focusRow()` and the readers agree.
- [ ] In `_makeMenuFocusable()`, keep the wrapper `li` out of the tab order. In `_setupAccessibility()`, give group rows the same role and `aria-disabled` setup as direct rows.
- [ ] In `src/sass/components/_menu.scss`, reset the group `ul` (no list style, margin or padding) and apply the row rules to `> li > ul[role="group"] > li` as well as `> li`. Keep sizes in `rem()`.
- [ ] Build, then run the V2 cases and the existing menu, menubar, context menu and mega menu suites one file at a time.

Completion check: V2 passes in Chromium, Firefox and WebKit, and the existing suites still pass (V8).

Covers: R1 to R3, R10; V2, V7, V8.

## 3. Radio check

Outcome: radio items check within their group, report the change, and close as agreed.

Prerequisites: group 2.

- [ ] Extend `_toggleChecked()` so a `menuitemradio` row that is not checked sets `aria-checked="true"`, sets `"false"` on the other radio rows of its group, and returns `true`. An already checked radio row returns `null`. Find the group with a small helper: the nearest `[role="group"]` inside the menu, or else the direct radio rows of the row's `menu`.
- [ ] Keep the menu open after Space on a radio row. Space and click share the `click()` path today, so mark a Space activation in `_handleMenuKeydown()` and have `_closesOnClick()` skip the close for that radio row. Click and Enter keep closing under `closeOnClick`.
- [ ] Keep `_activateItem()` order: check, then `select`, then `change` with `{ item, checked: true }`. Keep each new helper below cyclomatic complexity 5.
- [ ] Build, then run `npm test`, the new browser file and `tests/menu-checkbox-browser.test.js`.

Completion check: V1 and V3 to V7 pass, V1 in all three engines, and the existing menu, menubar, context menu, mega menu, menu field and components tests pass (V8).

Covers: R4 to R10; V1, V3 to V8.

## 4. Docs and generated guidance

Outcome: authors and agents read the new contract and the change note.

Prerequisites: group 3.

- [ ] Update the selection section of `docs/src/pages/menu.astro`: the group markup, the framework checking radio items, Space keeping the menu open, click and Enter closing it, and the event. Add a two-group example.
- [ ] Update the Menu section of `llm.md` the same way, drop "Keep radio items in sync yourself", and extend the Menu entry in the `expressive:change` row of the events table to radio items.
- [ ] Add an Unreleased entry to `CHANGELOG.md`: Menu checks radio items, Space on a radio item keeps the menu open, and page code that syncs radio items can go.
- [ ] Add the group-name forbid rule to the `menu` entry of `semantics.json`, then run `npm run build:semantics`.
- [ ] Run `npm run build:skill`, then `npm run check:generated`.

Completion check: `npm run check:generated` passes, and the docs, `llm.md`, changelog and semantics rule describe R1 to R8 (V9).

Covers: R11; V9.

## 5. Budget and checks

Outcome: the branch is ready for review.

Prerequisites: group 4.

- [ ] Build, read the new gzip sizes from the selective builds test, and add reviewed budget lines to `tests/selective-builds.test.js` (V10).
- [ ] Rerun the menu suites from V8 one file at a time.
- [ ] Optionally run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, which `tech-stack.md` recommends before submitting. Record what ran.
- [ ] Record each result, failure or skipped engine in `validation.md`.

Completion check: V1 to V10 pass, with any flaky rerun noted.

Covers: R12; V8, V10.
