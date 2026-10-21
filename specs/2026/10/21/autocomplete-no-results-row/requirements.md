# Autocomplete visible no-results row

Date: 2026-10-21
Roadmap phase: Phase 15, autocomplete visible no-results row
Branch: `feature/2026-10-21-autocomplete-no-results-row`
Base: `origin/master` at `8d45c2c4`, rebased onto `774b0d27` (Phase 14 merged) before the pull request
Status: specified 2026-10-21; implementation and validation follow in the same run

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 15](../../../../roadmap.md#phase-15-autocomplete-visible-no-results-row). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user assigned Phase 15 directly on 2026-10-21 and asked to skip the earliest-unfinished-phase rule, because several roadmap phases are being built in parallel. Phase 15 has no dependency. Phase 14, the autocomplete create option, was in progress on `feature/2026-10-21-autocomplete-create-option` and edits the same file, so this change stayed narrow. Phase 14 merged as `774b0d27` before this branch was pushed, and the branch was rebased onto it.

## Current behavior

These facts come from `src/ts/components/autocomplete.ts` and `src/sass/components/_menu.scss` at the base commit.

- `setMenuItems()` stores the results and calls `open()`, which calls `_renderMenu()` once the text reaches `minLength`. `_renderMenu()` renders one `<li role="option" data-id>` per entry in `menuItems`.
- When `menuItems` is empty, `_renderMenu()` assigns `selectedValues` to `menuItems` and renders those instead. With nothing selected, the list renders no rows at all.
- The live region announces `i18n.noResults` (`No results.`) when a search returns nothing. Nothing on screen says so: the list is an empty surface, so sighted users get no answer.
- `_handleInputKeydown` counts and indexes every `li` in the list for the arrow keys and Enter, and scrolls `container.children[activeIndex]`.
- Menu ignores a click on a row only when it is disabled. The suggestion list is a `menu[id]`, so it takes Menu's row styles: a bare `<span>` in an `<li>` gets the 44dp item layout and label type.

## Decisions under delegation

The user delegated planning and requirements to the agent on 2026-10-21. The roadmap lists no open questions for Phase 15. These choices come from the project evidence above and from Phase 14's spec, which leaves the no-results state to this phase and keeps `i18n.noResults` as the announcement.

- The row's text is `i18n.noResults`, the string the live region already reads. No new `i18n` key: the roadmap asks that sighted users see what screen reader users hear, and one string keeps the two in step.
- The row is `<li class="autocomplete-no-results" role="none" aria-hidden="true">No results.</li>`, with no `id`, `data-id` or `tabindex`. A listbox may only own options and groups, and screen readers already hear the live region, so the row is hidden from assistive technology. `role="none"` is the menu's existing marker for a row that is not an item: `$_item` and `$_enabled` in `_menu.scss` skip it, so it gets no hover layer and no item corners, while the bare `<span>` keeps the 44dp row layout.
- The row shows while the last search returned no suggestions. `setMenuItems()` records an empty result, and a text change that starts a new search clears the record. Testing `menuItems` alone would show the row while the first search of a page with remote data is still loading, since `data` defaults to `[]` and `open()` renders before the search returns.
- The row goes first in the list. In a multi-select with chosen entries, the fallback still shows those entries below the row.
- The arrow keys and Enter work on `li[role="option"]` rows only, so the row can never become active. This keeps working once Phase 14 adds its create row as an option.
- A press on the row keeps focus in the field and never reaches Menu. Two capture listeners on the list, for `mousedown` and `click`, cancel the event when its target is in the row. Without them the press moves focus to the `<menu>`, which nothing returns to the field, and Menu fires `select` for the row.
- The text sits directly in the `li`, which `_input-fields.scss` lays out at menu row height with Menu's insets, label type and supporting text color. Added during the final review: the first build used a bare `<span>`, but Menu's span rule sets `cursor: pointer` at a specificity a component rule should not try to beat.
- Added during the final review: Chips closes the list when Enter adds the typed text as a chip. Chips clears the field without an input event, so the list stayed open and read "No results." under an empty field.
- Added during the final review: `_handleInput` clears the record before it calls `open()`. Otherwise typing after Escape reopened the list with the previous answer while the new search loaded.
- Phase 14 adds an "Add 'x'" row after the suggestions. With both phases merged, a search with no match shows "No results." first and the create row after it. That matches Phase 14's choice to keep announcing `i18n.noResults` while its row is present.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | When a search at or above `minLength` leaves no suggestions, the open list shows one `li.autocomplete-no-results` row whose text is `i18n.noResults`, before any other row. The text goes in as text, also when `allowUnsafeHTML` is true. |
| R2 | The row has `role="none"` and `aria-hidden="true"`, and no `id`, `data-id` or `tabindex`. The live region keeps announcing `i18n.noResults` as it does today. |
| R3 | Arrow keys never make the row active and never point `aria-activedescendant` at it. Enter with no active option selects nothing. A click on the row selects nothing, fires no `change`, `expressive:autocomplete` or Menu `select`, leaves the list open, and leaves focus in the field. |
| R4 | The row leaves the list when a search returns at least one suggestion. It is absent below `minLength`, and while a search started by a text change has not returned. |
| R5 | In a multi-select with chosen entries, a search with no matches shows the row first and the chosen entries after it. Arrow keys and Enter reach those entries as they do today. |
| R6 | A custom `i18n.noResults` string is the row's text. |
| R7 | Existing behavior stays for lists with suggestions: the Autocomplete, selection events, injection, dismissal lifecycle, IME, generated forms and Chips tests pass unchanged. |
| R8 | The row is styled in `.autocomplete-content` in `src/sass/components/forms/_input-fields.scss`: menu row height, default cursor and the menu's supporting text color. It gets no hover layer. |
| R11 | In Chips, Enter that adds the typed text as a chip closes the Autocomplete list. |
| R9 | Docs and generated guidance describe the row next to `i18n.noResults` in `llm.md` and `docs/src/pages/autocomplete.astro`. The unreleased changelog lists it. `npm run build:skill` regenerates the derived files and `npm run check:generated` passes. |
| R10 | The bundle size changes are recorded in reviewed gzip budget lines in `tests/selective-builds.test.js` for JavaScript and CSS. New functions stay below cyclomatic complexity 5, and `fallow audit` against `origin/master` passes. |

## Constraints and dependencies

- Change `_renderMenu()`, `setMenuItems()`, `_inputChangeDetection()`, the option lookups in `_handleInputKeydown` and the list listeners, plus one line in Chips' Enter handler (R11). Add no option, no new `i18n` key and no dependency.
- The row is runtime markup, not authored markup, so `semantics.json` does not change.
- Tests run against built bundles. Build before testing, and destroy instances in `finally` blocks.
- Phase 14 touches the same functions. Expect conflicts in `_handleInputKeydown` and `_renderMenu()` and resolve them so both rows work.

## Out of scope

- A row for the loading state, or hiding stale rows while a search runs. A row already on screen stays there while the next search loads, as stale suggestions do today.
- The announcement `open()` makes when it re-renders the multi-select fallback, which counts the chosen entries.
- Changing the multi-select fallback.
- A new `i18n` key or an option to turn the row off.
- Other Chips changes. Chips gets the row through its Autocomplete.
- Roadmap edits, release and publication.

## Open decisions

None. The decisions above stand unless the user changes them in review.
