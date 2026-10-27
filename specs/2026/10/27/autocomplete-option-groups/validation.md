# Autocomplete option groups: validation

- Date: 2026-10-27
- Roadmap phase: Phase 66, autocomplete option groups
- Branch: `feature/2026-10-27-autocomplete-option-groups`
- Base: `origin/master` at `db981aa4f83d0d2ee63e5877c1238cc698b2045e`
- Status: V1 through V8 passed locally on 2026-10-27; PR merge conditions pending

These checks validate [requirements.md](requirements.md) and [plan.md](plan.md) against the [mission's success criteria](../../../../mission.md#success-criteria), the [testing constraints](../../../../tech-stack.md#framework-testing) and the [Phase 66 completion check](../../../../roadmap.md#phase-66-autocomplete-option-groups). The user chose the merge checks on 2026-10-27.

## Setup

Use the Node version in `.nvmrc` and run `npm ci`, plus `npm ci --prefix mcp/expressivecss` in a worktree. Tests read the built bundles, so run `npm run build` before any direct `node --test` command. Run one suite at a time, because parallel browser runs flake. A missing engine blocks a required check; it does not count as a pass.

`tests/regressions.test.js` and `tests/selective-builds.test.js` exist at the base. `tests/autocomplete-groups-browser.test.js` is new. The commands below ran on 2026-10-27.

## Requirement coverage

| Requirement | Plan group | Checks | Result |
| --- | --- | --- | --- |
| R1, `group` field | 1, 2 | V2, V7 | Passed locally |
| R2, labelled groups | 1 | V2 | Passed locally |
| R3, heading appearance and pointer | 1 | V3, V5 | Passed locally |
| R4, keyboard crosses headings | 1 | V1, V5 | Passed locally |
| R5, result count | 1 | V1 | Passed locally |
| R6, selection in groups | 1 | V3, V5 | Passed locally |
| R7, rows outside groups | 1 | V4 | Passed locally |
| R8, shared code and styles | 1, 3 | V2, V6, V8 | Passed locally |
| R9, guidance and evidence | 2, 3 | V7, V8 | Passed locally |

## Automated checks

### V1. Roadmap regression: the keyboard crosses a heading and the count names only choices

Setup: a single-select Autocomplete whose results are, in order, "Apple" and "Pear" in group "Fruit", then "Carrot" and a disabled "Leek" in group "Vegetables".

Action: in `tests/regressions.test.js`, type to open the list and read the live region. Press Down until the active row stops moving, recording `aria-activedescendant` after each press, then press Enter.

Expected: the announcement reports 3 results. The active row moves Apple, Pear, Carrot and stops there, crossing the "Vegetables" heading in one press. `aria-activedescendant` always names an `li[role="option"]`, never a heading or the disabled row. Enter selects Carrot. The test fails on the base and passes on the branch.

### V2. Grouped DOM and first-appearance order

Setup: results ordered ungrouped "All", "Apple" in "Fruit", "Carrot" in "Vegetables", "Pear" in "Fruit". A second Autocomplete with `allowUnsafeHTML: true` and a group named `<b>Bold</b>`. A third with no `group` on any entry.

Action: open each list and inspect the container in `tests/regressions.test.js`.

Expected: the first listbox holds "All" as a direct option, then a "Fruit" group with Apple and Pear, then a "Vegetables" group with Carrot. Each group is `li[role="none"] > ul[role="group"]`, whose `aria-labelledby` names a heading `li[role="presentation"]` inside it with the group text. Grouped option rows keep `role`, `aria-selected` and `data-id`. The second heading's text is the literal `<b>Bold</b>`, with no `b` element. The third listbox has the same structure as on the base, with no `role="none"` wrappers.

### V3. Selection paths and heading presses in Node

Setup: the V1 data in single mode and in multi mode, counting native `change` events, `onAutocomplete` calls and `expressive:autocomplete` events.

Action: click a grouped row, choose one with Enter, and call `selectOption(id)` for a grouped entry. In multi mode, toggle a grouped entry on and off. Dispatch a click on a heading.

Expected: each selection path selects the grouped entry once, with one `change`. In multi mode the row's `aria-selected` and checkbox follow each toggle without a re-render. The heading click changes nothing, fires nothing and is canceled. The disabled "Leek" stays unselectable through every path.

### V4. Rows outside groups

Setup: one grouped Autocomplete with `allowCreate`, one whose search returns no results, and a multi-select with grouped entries in `selected` and a search that returns nothing.

Action: type text that matches no entry exactly, then text that matches nothing, then open the multi-select with empty results.

Expected: the "Add" row is the last direct child of the listbox, outside every group. The no-results row is the first direct child. The selected entries shown for empty results render inside their groups.

### V5. Keyboard and pointer in three engines

Setup: the V1 data on a page in single and multi mode, with real Playwright input in Chromium, Firefox and WebKit.

Action: run `tests/autocomplete-groups-browser.test.js`. Type to open each list, press Down across a group boundary, press Enter, click a grouped row and click a heading. Read the heading's computed color and cursor. In Chromium, repeat the heading check with forced colors emulated.

Expected: Down moves from the last row of one group to the first row of the next in every engine, and Enter selects that row. Clicking a grouped row selects it. Clicking a heading keeps the list open, keeps focus in the input and changes nothing. The heading has no hover layer, uses a default cursor and stays visible in forced colors.

### V6. Regressions in related components

Setup: the base suites.

Action: `npm test`, which builds and runs every Node suite, including the Autocomplete cases in `tests/regressions.test.js`, `tests/chips.test.js`, `tests/selection-events.test.js` and `tests/keyboard-focus.test.js`. Then run `tests/autocomplete-disabled-browser.test.js`.

Expected: all pass. Autocomplete without groups, disabled entries, `allowCreate`, `searchDelay`, the no-results row, Chips with an Autocomplete, Menu and FormSelect behave as on the base.

### V7. Docs and generated guidance

Setup: group 2 edits.

Action: `npm run build:semantics`, `npm run build:skill`, then `npm run check:generated`.

Expected: generated files match their sources. `llm.md` and the docs page document `group`, first-appearance order, the keyboard path and the count. `semantics.json` is unchanged.

### V8. Contributor checks and size

Setup: groups 1 and 2 complete.

Action: record the measured gzip sizes in `tests/selective-builds.test.js`, then run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time.

Expected: all pass, and the budget lines name this change with its measured JS and CSS sizes and deltas.

## Results on 2026-10-27

- V1 to V4: the 6 new cases in `tests/regressions.test.js` pass. Run against the base Autocomplete source, 5 of them fail, V1 included. The selection case passes on the base, because the base has no nested rows for `_toggleOption()` to miss. It stays as a guard.
- V5: 12 of 12 pass in Chromium, Firefox and WebKit, with nothing skipped. A screenshot showed grouped rows narrower than the list: FormSelect's `menu[role="listbox"] > li` rule makes the group wrapper flex, which shrank the group to its widest row. The group list now takes `flex: 1 1 auto`, and the V5 heading case checks that a grouped row spans the list.
- V6: 224 of 224 pass across `tests/regressions.test.js`, `tests/chips.test.js`, `tests/selection-events.test.js`, `tests/keyboard-focus.test.js` and `tests/autocomplete-disabled-browser.test.js`. Another 224 of 224 pass across the Menu and FormSelect suites: `tests/menu.test.js`, `tests/menu-checkbox-browser.test.js`, `tests/menu-radio-browser.test.js`, `tests/menu-field-browser.test.js`, `tests/select-search.test.js` and `tests/select-search-browser.test.js`.
- V7: `npm run check:generated` passes. Regeneration changed only the contract hash in the skill guides and MCP data. The `autocomplete` record in `component-decisions.json` stayed unchanged, because its documented support names single and multi select only.
- V8: measured against a build of the base, JS gzip is 106,724 bytes (+144) and CSS gzip is 90,826 bytes (+46), both recorded as reviewed budget lines. `npm run verify` ran 3,363 tests, and 3,362 passed. The failure was the Firefox case "Lightbox reports opened and closed when reduced motion cuts a transition short" in `tests/expressivecss-web-accessibility-browser.test.js`, a Lightbox test this branch does not touch. It passed rerun alone. The steps the failure skipped (`check:generated`, `docs:build:astro`, `docs:verify`) then passed. `npm test --prefix mcp/expressivecss` and `npm run verify:packages` passed.

## Manual checks

None required. The user did not select a manual screen reader pass, so no result may claim that a screen reader announces group names.

## Merge conditions

- V1 through V8 pass, with results recorded in this file, including any skipped engine or flaky rerun.
- Affected regression suites pass.
- PR CI passes, review conversations are resolved, and the branch is current with `master`.
