# Autocomplete option groups: requirements

- Date: 2026-10-27
- Roadmap phase: Phase 66, autocomplete option groups
- Branch: `feature/2026-10-27-autocomplete-option-groups`
- Base: `origin/master` at `db981aa4f83d0d2ee63e5877c1238cc698b2045e`
- Status: specified; implementation not started

This feature follows the [mission's product rules](../../../../mission.md#product-rules) and [component scope](../../../../mission.md#agreed-scope), the [technical constraints](../../../../tech-stack.md#framework-constraints) and [testing requirements](../../../../tech-stack.md#framework-testing), and [roadmap Phase 66](../../../../roadmap.md#phase-66-autocomplete-option-groups). Work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Why this phase is next

Phases 59 through 65 merged in #448 through #454, and the base commit contains them. The roadmap still lists those phases without completion lines; updating it is outside this specification. Phase 66 depends only on Phase 65 (autocomplete disabled choices), which merged in #454. Its [spec](../autocomplete-disabled-choices/requirements.md) set the rule that the announced count includes only entries a person can choose, and this phase keeps it.

## Current behavior

These facts describe the base commit, from reading `src/ts/components/autocomplete.ts`, `src/ts/components/menu.ts`, `src/ts/components/select.ts`, `src/sass/components/_menu.scss`, `src/sass/components/forms/_select.scss`, `src/sass/components/forms/_input-fields.scss` and the Autocomplete section of `llm.md`.

- `AutocompleteData` has `id`, `text`, `image`, `description` and `disabled`. It has no group field, so an app cannot label sets of results.
- `_renderMenu()` appends every entry as a direct `li[role="option"]` child of the `menu` container, which has `role="listbox"` and an `id`. It puts the no-results row first and the `allowCreate` "Add" row last. When the result list is empty, it shows the selected entries instead.
- `_options()` returns every `li[role="option"]` in the container that is not `aria-disabled="true"`, in document order. Up and Down move `activeIndex` over that list and stop at its ends. The input's `aria-activedescendant` follows the active row.
- A pointer click reaches `_choose()` through Menu's `onItemClick`. Menu's `_handleMenuClick` passes the nearest `li` of any click, so a click on a non-option row would reach `_choose()` too. `_handleInertRowPress` cancels presses on the no-results row and on disabled rows at the capture phase, which keeps focus in the input.
- In multi mode, `_toggleOption()` finds the row to update among `this.container.children`. It would not find a row nested deeper.
- `_resultsMessage()` counts entries in `menuItems` that are not disabled.
- Menu already supports a nested row level: its `ROWS` selector and the `$_rows` Sass selector cover `:scope > li > ul[role="group"] > li`. Its `.label` heading styles reach direct `li` children only.
- FormSelect renders an `optgroup` as a flat `li.optgroup` with `role="group"` and `aria-owns`. Its `_select.scss` rules for `menu[role="listbox"] li.optgroup` match any listbox `menu`, including Autocomplete's.
- AutoInit treats Autocomplete's `data` as script-only, so no markup attribute supplies entries.

## Confirmed scope and decisions

The user confirmed these on 2026-10-27:

- Work splits into three task groups, as in Phases 63 through 65: behavior with tests, then docs and generated guidance, then size and merge checks.
- An entry names its group with an optional `group` string. Entries gather under their group in order of the group's first appearance. A `groupBy` option and nested group data were rejected.
- Groups render in the nested shape from the ARIA Authoring Practices grouped listbox: an `li` with `role="none"` holding a `ul` with `role="group"`, labelled by a heading inside it. FormSelect's flat `aria-owns` shape was rejected because screen reader support for `aria-owns` is weaker.
- Merge requires the roadmap regression test, browser keyboard tests in Chromium, Firefox and WebKit, and the contributor checks with MCP tests, package checks and a gzip budget line. The user did not select a manual screen reader pass.

The rules below that the interview did not cover come from the inspected code. They are specification proposals, and implementation may revise them only with a recorded reason.

## Requirements

### R1. Name an entry's group

`AutocompleteData` gains an optional `group` string. An entry with a missing or empty `group` is ungrouped and renders as it does today. The default `onSearch` filters on `id` and `text` as before and keeps each match's `group`. A custom `onSearch` passes groups through `setMenuItems()`. `data` stays script-only for AutoInit. No new component option, data attribute or registry entry is added.

### R2. Render labelled groups

Rendering walks the results in order. An ungrouped entry is appended to the listbox as a direct row. The first entry of a group creates, at that position, an `li` with `role="none"` holding a `ul` with `role="group"` and `aria-labelledby`. The `ul` starts with a heading `li` that has `role="presentation"`, a unique `id` and the group name as its text. Later entries of that group are appended to that `ul`, wherever they appear in the results. Entries compare groups by exact string.

Option rows inside a group keep every attribute they have today: `role="option"`, `aria-selected`, `aria-disabled`, `data-id`, the multi-select checkbox, image and description. The heading's text is set as text, never as HTML, including with `allowUnsafeHTML`. Results without any `group` produce the same DOM as the base.

### R3. Heading appearance and pointer

A heading looks like a Menu group label: on-surface-variant text in the label type role, with no hover or pressed layer and a default cursor. It stays readable in forced colors. A press or click on a heading selects nothing, fires no event, keeps the list open and keeps focus in the input, as a press on the no-results row does today.

### R4. Keyboard crosses headings

Up and Down move through the option rows in document order, across group boundaries, skipping headings and disabled rows. They stop at the first and last enabled row, as today. `aria-activedescendant` only ever names an option row. Enter chooses the active row.

### R5. Result count counts choices

The announced result count includes only enabled entries. Headings never count, and a group whose entries are all disabled adds nothing. When results exist but none is enabled, the live region announces `i18n.noResults`, as Phase 65 set.

### R6. Selection in groups

A click, Enter and `selectOption(id)` select a grouped entry exactly as they select an ungrouped one, in single and multi mode, with the same `change`, `onAutocomplete` and `expressive:autocomplete` behavior. In multi mode, toggling a grouped entry updates its row's `aria-selected` and checkbox in place. A disabled entry inside a group stays unselectable, as Phase 65 set.

### R7. Rows outside groups

The no-results row stays first and the "Add" row stays last, both as direct children of the listbox and outside any group. When the results are empty and the selected entries are shown instead, they render in their groups by the same rules.

### R8. Shared code and styles

Change Autocomplete and add Autocomplete-scoped styles in `_input-fields.scss`. Change Menu only if its existing nested-row handling misses an Autocomplete path, and record why. Autocomplete without groups, disabled entries, `allowCreate`, `searchDelay`, the no-results row, Chips with an Autocomplete, Menu and FormSelect keep their current behavior. Add no runtime dependency. New functions stay below cyclomatic complexity 5.

### R9. Guidance and delivery evidence

Document `group` in the `data` list in `llm.md` and on the Autocomplete docs page, with a live example of grouped results. Describe the first-appearance order, the keyboard path and the count. Add an `[Unreleased]` entry to `CHANGELOG.md`. Update the `autocomplete` record in `docs/src/data/component-decisions.json` only if its recorded support changes. Leave `semantics.json` unchanged, because no author-markup rule changes. Regenerate with `npm run build:semantics` and `npm run build:skill`. Record measured JS and CSS gzip sizes in the reviewed budget lines of `tests/selective-builds.test.js`.

## Exclusions and dependencies

- Sticky group headings, scrolling a heading into view with its first row, collapsible groups and group-level selection are excluded.
- Sorting results by group is the app's choice. The component never reorders entries beyond gathering each group at its first appearance.
- A manual screen reader pass is not required, so no result may claim that a screen reader announces group names.
- Depends on Phase 65 for disabled entries and the count rule. Roadmap completion edits, pushes, PRs, merges and releases are outside this specification.
