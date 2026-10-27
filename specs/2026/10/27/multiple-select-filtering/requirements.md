# Multiple-select filtering: requirements

- Date: 2026-10-27
- Roadmap phase: Phase 64, filter multiple-select options
- Branch: `feature/2026-10-27-multiple-select-filtering`
- Base: `origin/master` at `165ce2c04e03d738503898ca7eb5a34f565d668f`
- Status: implemented and verified locally on 2026-10-27; PR and merge gates pending

This feature follows the [mission's product rules](../../../../mission.md#product-rules) and [component scope](../../../../mission.md#agreed-scope), the [technical constraints](../../../../tech-stack.md#framework-constraints) and [testing requirements](../../../../tech-stack.md#framework-testing), and [roadmap Phase 64](../../../../roadmap.md#phase-64-filter-multiple-select-options). Work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Why this phase is next

Phase 64 depends only on Phase 63, which merged in #452 and is the base commit. The roadmap still lists Phases 59 through 63 without completion lines, but the base contains their merged implementations (#448 through #452). Phase 64 is the earliest phase whose dependency is met. Updating the roadmap's completion lines is outside this specification.

## Current behavior

These facts describe the base commit, from reading `src/ts/components/select.ts`, `src/sass/components/forms/_select.scss`, `tests/select-search.test.js`, `llm.md` and `docs/src/pages/select.astro`.

- `FormSelect` has a `searchable` option, default `false`. `_canSearch()` enables it only when the instance is a plain `FormSelect` and `isMultiple` is false. A multiple select with `searchable: true` gets no search field, and `tests/select-search.test.js` asserts that.
- In searchable mode, `menuEl` becomes a `div` with `role="dialog"` and class `select-search-popup`, holding a search input, a `role="status"` element and an inner `menu` with `role="listbox"`. `_buildSearch()` removes `aria-multiselectable` from `menuEl` and does not set it on the inner listbox.
- A plain multiple select builds rows with a checkbox for each enabled option, adds `multiple-select-menu` to `menuEl`, and sets `aria-multiselectable="true"` on it. Choosing a row toggles the native option, fires one `change` when the selected values change, and keeps the popup open. The trigger shows the selected options' text joined with commas.
- The stylesheet draws a check mark on selected rows only for `menu[role="listbox"]:not(.multiple-select-menu)`. If the inner search listbox lacks that class, a multiple select's selected rows would get the single-select check mark next to their checkboxes.
- Filtering, the search keyboard contract, close clearing the query, reset, refresh and teardown already exist for single-select search. Search is documented in `llm.md` and the select docs page as single-select only.
- Phase 63 is listed under `[Unreleased]` in `CHANGELOG.md`. No published release has the `searchable` option, so no released page relies on a multiple select ignoring it.

## Confirmed scope and decisions

The user confirmed these on 2026-10-27:

- Work splits into three task groups, as in Phase 63: behavior with tests, then docs and generated guidance, then size and merge checks.
- The existing `searchable: true` option enables search on a multiple select. There is no new option.
- The popup stays open after each pick. The inner listbox is multi-selectable. Closing clears the query. Options that the query hides stay selected and stay listed in the trigger.
- After a pick, the query stays and focus stays on the picked row, so a person can pick several matches in a row. The user chose this over clearing the query or returning focus to search, because it matches the APG multi-select listbox and keeps the person's place.
- Merge requires the roadmap regression test, keyboard tests in all three engines, and contributor verification with MCP smoke, package and gzip budget checks. The user did not select a visual approval gate for this phase.

The detailed rules below come from the inspected code and from Phase 63's contract. They are specification decisions, not separate interview answers.

## Requirements

### R1. Enable search on a multiple select

`searchable: true` enables search on an enhanced `FormSelect` that has `multiple`, through `FormSelect.init()` and through `data-form-select-options`. Single-select search keeps its Phase 63 behavior. TreeSelect and `browser-default` selects still ignore the option, and `searchable` still defaults to `false`. No new option, component, registry entry or data attribute is added.

### R2. Filter with the Phase 63 rules

Matching, group hiding, disabled matches and the no-results status follow Phase 63's R2 and R4 without change: a literal, case-insensitive substring of trimmed option text, with empty groups hidden and disabled matches visible but unavailable. Filtering never changes native selection, checkbox state or option order, and never dispatches `change`.

### R3. Selections the query hides

A selected option that the query hides stays selected in the native select, stays listed in the trigger text, and is submitted with the form. Clearing or changing the query shows it again with its checkbox checked and `aria-selected="true"`. No result count or hidden-selection summary is added.

### R4. Picking a result

Pointer, Enter or Space on an enabled visible result toggles that option through the existing selection path. Each pick that changes the selected values fires exactly one bubbling native `change`. The popup stays open, the query stays as typed, and focus stays on the picked row. Clicking the row's checkbox and clicking the row's text toggle the option once, with the checkbox matching native state. Disabled rows remain inert. Enter in the search field picks nothing and does not submit the form.

### R5. Roles and names

In searchable multiple mode the inner listbox has `aria-multiselectable="true"` and carries the `multiple-select-menu` class, so the multiple-select row styles apply and the single-select check mark does not. The outer popup keeps `role="dialog"` with no `aria-multiselectable`. Every visible row keeps `aria-selected` in step with its native option. The trigger keeps `role="combobox"`, `aria-haspopup="dialog"` and the Phase 63 naming rules. A plain multiple select without search keeps its current roles and markup.

### R6. Keyboard and focus

The Phase 63 keyboard contract applies unchanged: opening focuses the empty search field, arrows move between search and results without wrapping, Home and End reach the first and last focusable result, Tab and Shift+Tab move between search and results and then close, and Escape closes and focuses the trigger. Because a pick does not close the popup, the person leaves only through Escape, Tab, Shift+Tab from search or an outside click. Each of those clears the query, keeps every selection and leaves no keyboard trap. `menuOptions.autoFocus: false` still stops the popup from taking focus on open.

### R7. Lifecycle and forms

An uncanceled form reset closes the popup, clears the query and restores every option's default selection, including options the query hid. A canceled reset changes nothing. `refresh()` while open reapplies the current query and keeps focus on a surviving focusable row, otherwise on search. Disabling and refreshing closes the popup. `destroy()` and reinitialization leave no search field, listener or extra Menu instance. Native validation of a required multiple select still describes the trigger. Open shadow roots work as in Phase 63.

### R8. Shared code and styles

Change only the FormSelect paths that exclude multiple selects from search, and move the multiple-select class and attribute to the inner listbox. Single search, plain multiple, TreeSelect, Menu and Autocomplete behavior stays the same. Add select-scoped Sass only if checkbox rows need it inside the search popup, using `rem()` for text and control boxes, shared tokens, a visible focus ring in forced colors, and the existing reduced-motion rule. Add no runtime dependency. New functions stay below cyclomatic complexity 5.

### R9. Guidance and delivery evidence

Update `llm.md`, the select docs page and the changelog entry so search covers multiple selects and names TreeSelect search as Phase 75. Add a live multiple-select search example to the docs page. Update the `select` record in `docs/src/data/component-decisions.json` only where its recorded support changes. Change `semantics.json` only if an author-markup rule changes. Regenerate with `npm run build:semantics` and `npm run build:skill`. Record measured JS and CSS gzip sizes in the reviewed budget lines of `tests/selective-builds.test.js`.

## Exclusions and dependencies

- TreeSelect search is Phase 75, and TreeSelect multiple selection is Phase 76.
- Select-all for matches, chips or tags in the trigger, a result count, a hidden-selection summary, remote search, fuzzy matching and a clear button are excluded.
- Roadmap completion edits, pushes, PRs, merges and releases are outside this specification.

Phase 64 depends on Phase 63, which is in the base. No interview decision is open.
