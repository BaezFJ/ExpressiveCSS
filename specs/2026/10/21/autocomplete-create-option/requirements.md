# Autocomplete create option

Date: 2026-10-21
Roadmap phase: Phase 14, autocomplete create option
Branch: `feature/2026-10-21-autocomplete-create-option`
Base: `origin/master` at `8d45c2c4af6b6ccf0be918a4b2f325fae3978fb0`, fetched 2026-10-21
Status: implemented and locally verified 2026-10-21; required CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 14](../../../../roadmap.md#phase-14-autocomplete-create-option). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase eligibility

The roadmap marks Phases 1 through 13 completed. Phase 14 is the first unfinished phase and has no dependency.

## Current behavior

These facts come from `src/ts/components/autocomplete.ts` and `src/ts/components/chips.ts` at the base commit.

- `onSearch` receives the text and calls `setMenuItems()`. `open()` and `_renderMenu()` render one `<li role="option" data-id>` per entry in `menuItems`. When `menuItems` is empty, `_renderMenu()` shows `selectedValues` instead.
- Enter on the active row calls `selectOption(li.getAttribute('data-id'))` in `_handleInputKeydown`. A click reaches the same call through the `menuOptions.onItemClick` wrapper in `_setupMenu()`. `selectOption()` ignores an id that matches no entry in `menuItems`.
- `selectOption()` fires a native `change` and `expressive:autocomplete` with `{ values }` through `_triggerChanged()`.
- Autocomplete has no way to offer the typed text as a new value. A page that wants one has to put a fake entry into `setMenuItems()` and tell it apart in `onAutocomplete`.
- Chips sets its own `autocompleteOptions.onAutocomplete`, which adds a chip from the chosen entry, clears the input and focuses it. With `autocompleteOnly`, Enter on typed text adds no chip, and a paste stays text.

Tagging fields, where a person picks known tags or makes a new one, have no built-in path today.

## Decisions from the interview

The user answered on 2026-10-21.

- Plan: five task groups, tests first. Branch from freshly fetched `origin/master`.
- Option: `allowCreate`, a boolean with default `false`, so existing pages behave the same, as the mission's product rules ask.
- Row text: a new `i18n.create` function, default `` (text) => `Add "${text}"` ``.
- When the row shows: the option is on, the trimmed text is at least `minLength` long, and no rendered suggestion's `text` or `id` equals it, compared case-insensitively. The row is the last option.
- Choosing the row fires an `onCreate(text, autocomplete)` callback and an `expressive:create` event with `{ text }`, then closes the list. The selection does not change. The page adds the new item.
- Chips adds a chip from the row with or without `autocompleteOnly`. In an `autocompleteOnly` field, Enter on free text still adds nothing, and the row becomes the one deliberate way to add a new value. react-select's Creatable works the same way.
- Validation: Autocomplete and Chips jsdom tests, plus docs, generated files and a reviewed gzip budget. The user did not choose a three-engine browser test as a merge condition.

### Agent decisions within the confirmed design

These are proposals made while writing the spec. The user can overturn any of them in review.

- `text` in the callback and event is the field's value with surrounding whitespace trimmed, in the case the person typed it.
- The row is an `<li role="option" aria-selected="false">` with the class `autocomplete-create` and a `data-create` attribute instead of `data-id`, so no entry id can collide with it. Its label is set as text, even with `allowUnsafeHTML`, because it holds what the person typed.
- Arrow keys reach the row like any other option, and `aria-activedescendant` points at it.
- The results announcement counts suggestions only. A search with no matches still announces `i18n.noResults` while the row is present. Phase 15 owns how a no-results state looks and sounds.
- After the row is chosen, the field keeps the typed text and `oldVal` is set to it, so refocusing does not search again. A page that wants the new entry selected calls `setMenuItems(items, [id], false)`.
- Multi-select behaves the same: the list closes and `selectedValues` does not change.
- Added during implementation: Chips passes Autocomplete a copy of `autocompleteOptions` with its own `onCreate`, so a second Chips given the same options object does not wrap the first one's wrapper.
- Added during implementation: the events table on the AutoInit docs page (`docs/src/pages/auto-init.astro`) also lists `expressive:create`.
- Chips wraps `onCreate`. It adds `{ id: text }` through `addChip()`, so `limit` and duplicate checks apply, clears the input and focuses it, as its `onAutocomplete` does. It then calls an `onCreate` the page passed in `autocompleteOptions`. Today Chips replaces the page's `onAutocomplete` outright; this spec does not change that.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Autocomplete accepts `allowCreate`, a boolean with default `false`, and `onCreate`, a callback with default `null`. Both appear in `AutocompleteOptions` with doc comments and in `_defaults`. `i18n` gains `create: (text: string) => string`, default `` (text) => `Add "${text}"` ``, merged like the other `i18n` strings. |
| R2 | With `allowCreate` on, a rendered list ends in one create row when the trimmed field text is at least `minLength` long and no rendered suggestion's `text`, or `id` when it has no `text`, equals that text case-insensitively. The row's label is `i18n.create(text)`. |
| R3 | No create row appears when `allowCreate` is off, when the trimmed text is empty or shorter than `minLength`, or when a suggestion matches exactly. A partial match, such as `app` with the suggestion `Apple`, still shows the row after `Apple`. |
| R4 | The row is an `<li role="option" aria-selected="false" class="autocomplete-create" data-create>` with no `data-id`. Its label goes in as text, also when `allowUnsafeHTML` is true. Arrow keys make it active and point `aria-activedescendant` at it, like any other option. |
| R5 | Enter on the active create row, or a click on it, calls `onCreate(text, autocomplete)` and then fires `expressive:create` on the input with `detail: { text }`, through `_notify`. `text` is the trimmed field value. The list closes. |
| R6 | Choosing the create row leaves `selectedValues` unchanged and fires no `change` and no `expressive:autocomplete`. The field keeps its text, and a focus that returns to it before it is left does not start a search. Blur still resets the search text, so a focus after blur searches, as it does today. This holds for single and multi-select. |
| R7 | The results announcement counts suggestions only, so the create row does not change `i18n.results` or `i18n.noResults`. |
| R8 | The row follows the list. It appears after `setMenuItems()` renders results for the current text, also results from an asynchronous `onSearch`, and it disappears or changes when the text changes. |
| R9 | Existing behavior stays when `allowCreate` is off: the Autocomplete, selection events, injection, dismissal lifecycle, IME, generated forms and Chips tests pass unchanged. |
| R10 | Chips sets `autocompleteOptions.onCreate`. Choosing the row adds a chip `{ id: text }` through `addChip()`, so `limit` and duplicate checks apply, clears the input and focuses it, whether `autocompleteOnly` is on or off. It then calls the `onCreate` the page passed in `autocompleteOptions`, if any. Chips does not turn `allowCreate` on by itself. |
| R11 | With `autocompleteOnly` on, Enter on typed text that is not a chosen row still adds no chip, and a paste still stays text. |
| R12 | Docs and generated guidance describe the feature. The Autocomplete options tables in `llm.md` and `docs/src/pages/autocomplete.astro` list `allowCreate`, `onCreate` and `i18n.create`. The events table in `llm.md` lists `expressive:create` with `{ text }`. The Chips docs in `llm.md` and `docs/src/pages/chips.astro` say how the row works with `autocompleteOnly`. The unreleased changelog lists the option under Added. `npm run build:skill` regenerates the derived files and `npm run check:generated` passes. |
| R13 | The bundle size change is recorded in a reviewed gzip budget line in `tests/selective-builds.test.js`. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- Route both the Enter path and the click path through one helper that checks for `data-create`, so the create row never reaches `selectOption()`.
- Build the row in its own small method next to `_createMenuItem`, and call it from `_renderMenu()` only. Keep the exact-match check in a helper so each function stays below complexity 5.
- `allowCreate` is a runtime option, not markup, so `semantics.json` does not change.
- The row needs no new CSS for this phase. It uses the list's existing option styles.
- Tests run against built bundles. Build before testing, and tear instances down in `finally` blocks.

## Out of scope

- A visible "No results" row. Phase 15 covers it.
- Selecting or adding the created value inside Autocomplete.
- An icon on the create row, or styles for it.
- Changing the results announcement to mention the create row.
- Trimming the text in the default `onSearch`. It keeps whitespace, so ` Apple ` finds no suggestions there and gets an `Add "Apple"` row.
- Chips changes beyond R10 and R11, including keeping the page's `onAutocomplete`.
- A three-engine browser test.
- Roadmap edits, release and publication.

## Open decisions

None. The agent decisions above stand unless the user changes them in review.
