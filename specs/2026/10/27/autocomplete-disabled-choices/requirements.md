# Autocomplete disabled choices: requirements

- Date: 2026-10-27
- Roadmap phase: Phase 65, autocomplete disabled choices
- Branch: `feature/2026-10-27-autocomplete-disabled-choices`
- Base: `origin/master` at `c8cf5a94306a83df874c49db9540c17abd1b1078`
- Status: specified; implementation not started

This feature follows the [mission's product rules](../../../../mission.md#product-rules) and [component scope](../../../../mission.md#agreed-scope), the [technical constraints](../../../../tech-stack.md#framework-constraints) and [testing requirements](../../../../tech-stack.md#framework-testing), and [roadmap Phase 65](../../../../roadmap.md#phase-65-autocomplete-disabled-choices). Work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Why this phase is next

Phases 59 through 64 merged in #448 through #453, and the base commit contains them. The roadmap still lists those phases without completion lines; updating it is outside this specification. Phase 65 has no dependencies, and Phase 66 (autocomplete option groups) depends on it.

## Current behavior

These facts describe the base commit, from reading `src/ts/components/autocomplete.ts`, `src/ts/components/menu.ts`, `src/sass/components/_menu.scss`, `src/sass/components/forms/_input-fields.scss`, the Autocomplete section of `llm.md` and `docs/src/pages/autocomplete.astro`.

- `AutocompleteData` has `id`, `text`, `image` and `description`. There is no way to mark an entry unavailable. An app that wants one has to leave it out of the results.
- Each entry renders as an `li` with `role="option"`, `aria-selected` and `data-id` inside the `menu` container, which has `role="listbox"` and an `id`. In multi-select mode the row holds a checkbox.
- A person or script selects an entry through three paths. A pointer click goes through Menu's `onItemClick` to `_choose()`. Enter on the active row calls `_choose()`. `_choose()` and script both end in `selectOption(id)`, which toggles in multi mode or selects and closes in single mode, then fires `change` and `expressive:autocomplete`.
- Up and Down move `activeIndex` over `_options()`, which returns every `li[role="option"]`, including the `allowCreate` "Add" row. They stop at the first and last row. The input's `aria-activedescendant` follows the active row.
- Menu's `_handleMenuClick` already ignores clicks on a row matching `.disabled, [aria-disabled="true"]`. The `menu[id]` row styles in `_menu.scss` give such rows `pointer-events: none` and opacity 0.38.
- The live region announces `i18n.results(count)` from `menuItems.length`, or `i18n.noResults` when the count is 0. In multi mode the field shows the number of selected entries.
- The `selected` option and `setMenuItems(items, selected)` set the selection directly. A value already in the input at setup goes through `selectOption()`.
- Chips can host an Autocomplete and adds a chip from its `onAutocomplete` callback.
- AutoInit treats Autocomplete's `data` as script-only, so no markup attribute supplies entries.

## Confirmed scope and decisions

The user confirmed these on 2026-10-27:

- Work splits into three task groups, as in Phases 63 and 64: behavior with tests, then docs and generated guidance, then size and merge checks.
- An entry opts in with `disabled: true` and stays visible in the results.
- Up and Down skip disabled rows, matching FormSelect and Menu. The user accepted that screen reader users will not land on a disabled row.
- The announced result count includes only entries a person can choose, which matches the rule Phase 66 sets for groups.
- A disabled entry that is already selected stays selected, and the person cannot remove it through the list.
- Merge requires the roadmap regression test, browser keyboard tests in Chromium, Firefox and WebKit, and the contributor checks with MCP tests, package checks and a gzip budget line. The user did not select a manual screen reader pass.

The rules below that the interview did not cover come from the inspected code. They are specification proposals, and implementation may revise them only with a recorded reason.

## Requirements

### R1. Mark an entry disabled

`AutocompleteData` gains an optional `disabled` boolean. Only `disabled: true` disables an entry; a missing or false value keeps current behavior. The default `onSearch` still returns disabled entries that match, and a custom `onSearch` decides for itself. `data` stays script-only for AutoInit. No new component option, data attribute or registry entry is added.

### R2. Render disabled rows

A disabled entry's row keeps `role="option"` and gains `aria-disabled="true"`. Its `aria-selected` still reports its real selection state. In multi mode its checkbox is disabled and checked when the entry is selected. The existing `menu[id]` disabled row styles apply, so the row is dimmed and ignores the pointer. If they do not reach Autocomplete rows, add an Autocomplete-scoped rule in `_input-fields.scss`. A dimmed row stays distinguishable in forced colors.

### R3. Selection paths refuse a disabled entry

A pointer click, Enter, and `selectOption(id)` leave a disabled entry's selection unchanged, in single and multi mode. Nothing fires: no native `change`, no `onAutocomplete` call and no `expressive:autocomplete` event. The list stays open, the field text stays as typed, and focus stays in the input. In multi mode this also means a selected disabled entry cannot be unchecked. The refusal lives in the shared selection path, so Chips and any other host inherit it.

### R4. Keyboard skips disabled rows

Up and Down move only between enabled rows, including the "Add" row, and stop at the first and last enabled row. `aria-activedescendant` never names a disabled row. When every visible row is disabled, the arrow keys set no active row and Enter chooses nothing.

### R5. Result count counts choices

The results announcement counts enabled entries only. When results exist but all are disabled, the live region announces `i18n.noResults`. The visible no-results row still appears only when the result list is empty. In multi mode the selected count on the field includes selected disabled entries.

### R6. Selection set by the app

The `selected` option and the `selected` argument of `setMenuItems()` may name disabled entries. Those entries render selected and disabled. This is how an app shows a locked choice. A value already in the input at setup still goes through `selectOption()`, so a value naming a disabled entry is not selected. In single mode, editing the field text still clears the selection, disabled or not, because the text field is the control.

### R7. Create row and disabled matches

With `allowCreate`, the "Add" row stays hidden when the trimmed text matches a disabled entry's `text`, or its `id` when it has no `text`. The value exists, so offering to create it again would duplicate it.

### R8. Shared code and styles

Change only Autocomplete, plus Menu only if its existing disabled handling misses an Autocomplete path. Single and multi Autocomplete without disabled entries, `allowCreate`, `searchDelay`, the no-results row, Chips, Menu and FormSelect keep their current behavior. Add no runtime dependency. New functions stay below cyclomatic complexity 5.

### R9. Guidance and delivery evidence

Document `disabled` in the `data` list in `llm.md` and on the Autocomplete docs page, with a live example that includes a disabled entry. Add an `[Unreleased]` entry to `CHANGELOG.md`. Update the `autocomplete` record in `docs/src/data/component-decisions.json` only if its recorded support changes. Leave `semantics.json` unchanged, because no author-markup rule changes. Regenerate with `npm run build:semantics` and `npm run build:skill`. Record measured JS and CSS gzip sizes in the reviewed budget lines of `tests/selective-builds.test.js`.

## Exclusions and dependencies

- Option groups and their headings are Phase 66.
- Disabling the whole field, per-entry tooltips explaining why an entry is unavailable, and a reason text in the data are excluded.
- Reaching disabled rows with the keyboard is excluded by the user's choice. If a later phase needs it, it must also change Phase 66's count rule.
- Roadmap completion edits, pushes, PRs, merges and releases are outside this specification.
