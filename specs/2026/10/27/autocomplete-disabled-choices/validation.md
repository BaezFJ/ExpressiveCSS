# Autocomplete disabled choices: validation

- Date: 2026-10-27
- Roadmap phase: Phase 65, autocomplete disabled choices
- Branch: `feature/2026-10-27-autocomplete-disabled-choices`
- Base: `origin/master` at `c8cf5a94306a83df874c49db9540c17abd1b1078`
- Status: all checks pending; the feature is not built

These checks validate [requirements.md](requirements.md) and [plan.md](plan.md) against the [mission's success criteria](../../../../mission.md#success-criteria), the [testing constraints](../../../../tech-stack.md#framework-testing) and the [Phase 65 completion check](../../../../roadmap.md#phase-65-autocomplete-disabled-choices). The user chose the merge checks on 2026-10-27.

## Setup

Use the Node version in `.nvmrc` and run `npm ci`, plus `npm ci --prefix mcp/expressivecss` in a worktree. Tests read the built bundles, so run `npm run build` before any direct `node --test` command. Run one suite at a time, because parallel browser runs flake. A missing engine blocks a required check; it does not count as a pass.

`tests/regressions.test.js` and `tests/selective-builds.test.js` exist at the base. `tests/autocomplete-disabled-browser.test.js` is new. The commands come from `CONTRIBUTING.md` and earlier phases' validation and have not been run for this phase.

## Requirement coverage

| Requirement | Plan group | Checks | Result |
| --- | --- | --- | --- |
| R1, `disabled` field | 1, 2 | V2, V7 | Pending |
| R2, disabled rows | 1 | V2, V5 | Pending |
| R3, selection paths refuse | 1 | V1, V5 | Pending |
| R4, keyboard skip | 1 | V3, V5 | Pending |
| R5, result count | 1 | V3 | Pending |
| R6, selection set by the app | 1 | V4 | Pending |
| R7, create row | 1 | V3 | Pending |
| R8, shared code and styles | 1, 3 | V5, V6, V8 | Pending |
| R9, guidance and evidence | 2, 3 | V7, V8 | Pending |

## Automated checks

### V1. Roadmap regression: no path selects a disabled entry

Setup: a single-select and a multi-select Autocomplete, each with an enabled entry, a disabled entry, and a disabled entry preselected through `selected` in the multi-select. Count native `change` events, `onAutocomplete` calls and `expressive:autocomplete` events.

Action: in `tests/regressions.test.js`, open each list, then try a click on the disabled row, Down until the disabled row would be active followed by Enter, and `selectOption(id)` for the disabled entry. In the multi-select, also try each path on the preselected disabled entry.

Expected: `selectedValues` is unchanged after every attempt, and no event or callback fires. The list stays open and the field text is unchanged. Selecting the enabled entry still works and fires one `change`. The test fails on the base and passes on the branch.

### V2. Disabled rows render as unavailable

Setup: the V1 data.

Action: open each list and inspect the rows in `tests/regressions.test.js`.

Expected: the disabled row has `role="option"` and `aria-disabled="true"`. Its `aria-selected` is `"true"` only for the preselected entry. In multi mode its checkbox is disabled, and checked only when selected. Enabled rows have no `aria-disabled`.

### V3. Keyboard, count and create row in Node

Setup: results ordered enabled, disabled, enabled, disabled. A second list where every result is disabled. A third Autocomplete with `allowCreate` and a disabled entry whose text is "Archived".

Action: press Down and Up through the first list. Type into the second list and read the live region. Type "archived" into the third.

Expected: the active row moves between the two enabled rows only, and `aria-activedescendant` never names a disabled row. The first announcement reports 2 results. The all-disabled list shows its rows, announces `i18n.noResults` and shows no visible no-results row, and Down sets no active row, so Enter chooses nothing. The third list shows no "Add" row.

### V4. Selection set by the app

Setup: a multi-select with a disabled entry in `selected`, a single-select whose input holds a disabled entry's text at setup, and a single-select with a disabled entry selected through `setMenuItems(items, [id])`.

Action: initialize each, then edit the single-select field's text.

Expected: the multi-select shows the disabled entry selected and counts it in the field's selected count. The input value naming a disabled entry selects nothing. `setMenuItems` selects the disabled entry and fires one `change`. Editing the single-select text clears its selection as it does today.

### V5. Keyboard and pointer in three engines

Setup: the V1 single and multi Autocompletes on a page, with real Playwright input in Chromium, Firefox and WebKit.

Action: run `tests/autocomplete-disabled-browser.test.js`. Type to open each list, press Down repeatedly, press Enter, click the disabled row, and read the disabled row's computed opacity. In Chromium, repeat the row check with forced colors emulated.

Expected: Down and Up skip the disabled row in every engine, and Enter selects only an enabled row. A click on the disabled row changes nothing, keeps the list open and keeps focus in the input. The disabled row is dimmed, and stays visibly different from enabled rows in forced colors.

### V6. Regressions in related components

Setup: the base suites.

Action: `npm test`, which builds and runs every Node suite, including the Autocomplete cases in `tests/regressions.test.js`, `tests/chips.test.js`, `tests/selection-events.test.js` and `tests/keyboard-focus.test.js`.

Expected: all pass. Autocomplete without disabled entries, `allowCreate`, `searchDelay`, the no-results row, Chips with an Autocomplete, Menu and FormSelect behave as on the base.

### V7. Docs and generated guidance

Setup: group 2 edits.

Action: `npm run build:semantics`, `npm run build:skill`, then `npm run check:generated`.

Expected: generated files match their sources. `llm.md` and the docs page document `disabled`, the keyboard skip, the count and locked selections. `semantics.json` is unchanged.

### V8. Contributor checks and size

Setup: groups 1 and 2 complete.

Action: record the measured gzip sizes in `tests/selective-builds.test.js`, then run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time.

Expected: all pass, and the budget lines name this change with its measured JS and CSS sizes and deltas.

## Manual checks

None required. The user did not select a manual screen reader pass, so no result may claim that a screen reader announces disabled rows.

## Merge conditions

- V1 through V8 pass, with results recorded in this file, including any skipped engine or flaky rerun.
- Affected regression suites pass.
- PR CI passes, review conversations are resolved, and the branch is current with `master`.
