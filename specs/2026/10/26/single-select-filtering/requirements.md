# Single-select filtering: requirements

- Date: 2026-10-26
- Roadmap phase: Phase 63, filter single-select options
- Branch: `feature/2026-10-26-single-select-filtering`
- Base: `origin/master` at `6f74b3701af2347656aec1bae69af77396897609`
- Status: implemented and locally verified on 2026-10-27; merge review pending

This feature follows the [mission's product rules](../../../../mission.md#product-rules) and [component scope](../../../../mission.md#agreed-scope), the [technical constraints](../../../../tech-stack.md#framework-constraints) and [testing requirements](../../../../tech-stack.md#framework-testing), and [roadmap Phase 63](../../../../roadmap.md#phase-63-filter-single-select-options). Work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Why this phase is next

Phase 63 has no dependencies. Phases 1 through 58 are recorded complete. The roadmap still describes Phases 59 through 62 as unfinished, but the confirmed base contains their merged implementations: row and column gaps in #448, responsive child sizing in #449, self-alignment in #450, and visual ordering in #451. Inspection of the spacing and helper Sass confirms the new rules. This selection uses implementation evidence rather than treating an existing specification as completion. Updating those roadmap entries is outside this specification.

## Current behavior

These facts describe the confirmed base, not the proposed implementation.

- [FormSelect](../../../../../src/ts/components/select.ts) hides the native select, retains it for form values, and generates a read-only text trigger with a listbox popup. Its options are `classes` and `menuOptions`; there is no filtering option. It builds option rows and labelled optgroups from native options and updates native selection through its existing selection path.
- [Menu](../../../../../src/ts/components/menu.ts) owns popup placement, manual popovers, dismissal and row navigation. Its key handler processes Space, Home, End and printable characters. Its row lookup uses tab stops, so hiding a row alone does not establish that keyboard navigation will skip it.
- `refresh()` rebuilds FormSelect's generated rows while retaining the Menu instance. Reset and native change handling synchronize the displayed value. `destroy()` restores the original select, labels and tab index.
- [TreeSelect](../../../../../src/ts/components/treeSelect.ts) subclasses FormSelect and replaces option building and focus behavior. A FormSelect search change must explicitly exclude that subclass. Native `browser-default` selects bypass enhancement.
- The [select documentation](../../../../../docs/src/pages/select.astro), `llm.md` and existing component, form, lifecycle and browser tests describe the current behavior. AutoInit already reads `data-form-select-options`; no new component registration is needed.

## Confirmed scope and decisions

The user confirmed all three interview groups on 2026-10-26. The work is Phase 63 from the base above, divided into behavior and tests, documentation and generated guidance, then compatibility, size and merge checks. Search is a separate labelled field inside the popup. The existing trigger continues to show the selected option and remains read-only.

The confirmed matching policy is a case-insensitive substring of option text. Empty groups disappear, disabled matches remain unavailable, no-results feedback is accessible, and closing clears the query. The native select owns the submitted value. The user accepted the validation and merge checklist in `validation.md`.

The API names and detailed focus rules below are specification design decisions based on the inspected implementation. They define the implemented contract. The user subsequently authorized implementation through the incremental-implementation skill.

## Requirements

### R1. Opt-in single-select search

Add `searchable: boolean` to `FormSelectOptions`, defaulting to `false`. Authors enable it through `FormSelect.init(select, { searchable: true })` or the existing `data-form-select-options='{"searchable":true}'` AutoInit path. No separate component, registry entry or data attribute is needed. The option takes effect only for an enhanced, non-tree, single select. Ignore it for `multiple`, TreeSelect and `browser-default`, preserving their existing behavior for this phase.

### R2. Literal option-text filtering

On input, compare the query and each option's trimmed `textContent` after `toLowerCase()`. Trim the query's leading and trailing whitespace, preserve internal whitespace, and use literal substring matching. Do not search option values, group labels or image URLs, interpret a regular expression, fold accents or change option order. An empty query shows all eligible rows. Filter only generated rows; do not remove, disable or rewrite native options.

A disabled option or an option in a disabled optgroup may remain visible when it matches, but cannot receive selection or keyboard focus. Hide an optgroup heading when none of its option rows match. Hidden rows and headings take no keyboard focus, have no active reference and are absent from the exposed result list. A visible disabled match is still a result; the no-results state means zero matching option rows, not zero enabled rows.

### R3. Preserve native selection and submission

Typing, clearing, dismissing and producing no matches do not change selection or dispatch `change`. A selected option can disappear from the filtered list without losing its native selection or changing the trigger's displayed value. Choosing an enabled visible option uses the existing native selection path, closes the popup, updates the trigger and fires exactly one bubbling native `change` when the selected value changes. Choosing the already-selected option fires none. Duplicate option values do not confuse row identity, and event dispatch retains the existing value-based comparison. Search text has no `name` and never enters form data. Enter in the search field does not submit the surrounding form or implicitly choose a result.

### R4. Separate, named controls in the popup

Keep the existing read-only trigger, with the selected option's text. For searchable mode, its controlled popup is a named nonmodal `dialog` containing a labelled search input and a separately named `listbox`. Set the trigger's `aria-haspopup="dialog"`, `aria-controls` and expanded state to describe that popup. Keep ordinary selects' listbox contract unchanged. The search input and status are outside the listbox and never become options or Menu rows. The popup is not a native modal dialog and must not make the page inert.

The popup and listbox inherit the field's accessible name, including authored `aria-label` or `aria-labelledby`. Add `i18n.searchLabel`, default `Search options`, and `i18n.noResults`, default `No results`, using the existing partial-i18n merge convention. The search field has an accessible label independent of its placeholder. Render the empty-state message as nonselectable text in a polite status region. Clear that message when matches return. Use text nodes for labels, query-dependent messages and option text. Every generated ID reference resolves within the control's document or shadow root; clear stale active references when filtering or closing.

### R5. Keyboard, editing and focus

With the default `menuOptions.autoFocus`, opening from the trigger by pointer, Enter, Space or either vertical arrow focuses the empty search input. Typing, pasting, Space, Home, End, horizontal arrows and composition retain native text-editing behavior in that input. Menu typeahead must not process those search-input events. Filtering follows input changes without moving focus from the search field; composition must not cause selection or popup dismissal.

ArrowDown in the search moves focus to the first enabled visible option, and ArrowUp moves to the last. If none exists, focus stays in search. On result rows, ArrowDown and ArrowUp move among enabled visible options without wrapping; ArrowUp from the first returns to search. Home and End select the first and last focusable result. Enter and Space choose the focused enabled result. From the search, Tab moves to the first focusable result when one exists; Shift+Tab from a result returns to search. Tab from a result, or Tab from search with no enabled result, closes the popup and moves to the next control after the trigger. Shift+Tab from search closes and focuses the trigger. The popup has no keyboard trap.

Escape from search or results closes without changing selection and returns focus to the trigger. Pointer selection also returns focus to the trigger. Outside dismissal leaves focus on the outside target. Every close clears the query and restores the unfiltered generated list before the next opening. Respect `menuOptions.autoFocus: false` by not taking focus on open; the search remains reachable through normal keyboard traversal. Preserve user open/close callbacks and their existing invocation behavior.

### R6. Lifecycle and form synchronization

An uncanceled form reset closes the popup, clears its query and status, restores the default native selection, and synchronizes the trigger. A canceled reset leaves selection and query unchanged. `refresh()` rereads option text, disabled state and membership, reapplies the current query when open, and preserves search focus and caret if search had focus. Preserve focus on a surviving visible enabled option; otherwise return focus to search. Refreshing while closed leaves an empty query. Disabling the select or its fieldset and refreshing closes the popup and prevents reopening until enabled and refreshed. Native validation still reports the select's validity and describes the visible trigger.

`destroy()` and reinitialization remove the search input, status, popup/listbox, listeners and timers, restore author DOM and leave no extra Menu instance. Keep the existing `refresh()` API rather than adding an observer. Cover open shadow roots and Menu's existing placement in a native dialog. Cleanup in tests belongs in `finally` blocks.

### R7. Keep shared behavior compatible

Implement in FormSelect and reuse Menu for placement and dismissal. Prefer select-owned event handling and existing extension points. Change shared Menu logic only when the searchable popup requires it, and cover affected ordinary Menu and Autocomplete paths with regression tests. Preserve exports, non-searchable markup, multiple selection, TreeSelect, native form ownership and supported bundle formats. Add no runtime dependency. Follow the TypeScript conventions and keep new functions below cyclomatic complexity 5.

### R8. Style the new controls within existing contracts

Reuse existing field and menu styles before adding select-scoped rules in the select Sass partial. Keep search and empty feedback visible when the result list scrolls, with no clipped focus ring. Text and control boxes scale with `rem()`, typography and colors use shared tokens, and keyboard focus remains visible in forced colors. RTL and long translated labels must fit the popup. Preserve reduced-motion behavior and native popup placement in all three browser engines.

### R9. Publish accurate guidance and delivery evidence

Update the select docs with a live grouped example and the complete keyboard contract, `llm.md` with options and limitations, the changelog, and the existing select component decision record where its support or evidence changes. State that multiple and tree search belong to later phases. Modify `semantics.json` only if this feature needs an author-markup rule; generated runtime roles are not author prerequisites. Regenerate committed guidance from its sources with `npm run build:semantics` and `npm run build:skill`. Preserve historical evidence and leave unverified claims explicit. Record measured JS and CSS gzip sizes and deltas in reviewed budget lines in `tests/selective-builds.test.js`.

## Exclusions and dependencies

- Multiple-select search is Phase 64. TreeSelect search is Phase 75. This phase creates neither behavior, nor helpers or configuration solely for those phases.
- Remote search, option creation, fuzzy/accent-insensitive matching, highlighting, virtualization, a clear button, result-count announcements and a new selection event are excluded.
- Automatic mutation watching, replacement of Menu, a new component inventory, framework bindings and runtime dependencies are excluded.
- Roadmap completion edits, pushes, PRs, merges and releases are outside this local implementation request.

Phase 63 has no roadmap prerequisite. Its implementation needs the existing native-form and Menu behavior described above. No interview decision remains unresolved. Local implementation and automated checks are complete. The execution record in `validation.md` identifies the remaining human review and PR merge gates.
