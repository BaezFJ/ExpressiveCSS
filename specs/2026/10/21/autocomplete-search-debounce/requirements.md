# Autocomplete search debounce

Date: 2026-10-21
Roadmap phase: Phase 13, autocomplete search debounce
Branch: `feature/2026-10-21-autocomplete-search-debounce`
Base: `origin/master` at `e67c13ccc466d6fa5e9fc924d753f7319b9cc099`, fetched 2026-10-21
Status: specified, not implemented

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 13](../../../../roadmap.md#phase-13-autocomplete-search-debounce). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase eligibility

Phases 1 through 10 are marked completed in the roadmap. Phase 11, menu checkbox items, merged in #376, and Phase 12, menu radio groups, merged in #377 as `e67c13cc`. The roadmap does not mark either one completed yet, and this workflow leaves the roadmap unchanged. Phase 13 is the first unfinished phase and has no dependency.

## Current behavior

These facts come from `src/ts/components/autocomplete.ts` at the base commit.

- `_handleInput` and `_handleInputFocus` both call `_inputChangeDetection(value)`. When the lowercased text differs from `oldVal`, it calls `_setStatusLoading()`, which shows the three-dot indicator and announces `i18n.loading`, and then `_search(this.el.value)`.
- `_search()` aborts the previous `AbortController`, creates a new one, and calls `onSearch(text, this, signal)` synchronously. Every input event that changes the text therefore runs one search, so a remote `onSearch` fetches once per key.
- `destroy()` aborts the last search. `_handleInputBlur` sets `_left`, closes the list and resets `oldVal` to `null`, so the next focus searches again.
- `setMenuItems()` does not open the list once `_left` is set, which happens on blur, on Escape and before the field is first focused.
- Chips builds its Autocomplete from `autocompleteOptions` (`src/ts/components/chips.ts`), so any new Autocomplete option reaches Chips without a Chips change.
- The Autocomplete section of `llm.md` and `docs/src/pages/autocomplete.astro` document the `AbortSignal` and say that pages own request cancellation and stale-response ordering. Neither offers a way to wait for typing to pause.

A page that fetches suggestions has to write its own timer around `onSearch` today, and it has to track that timer through blur and destroy on its own.

## Decisions from the interview

The user answered on 2026-10-21.

- Plan: four task groups, tests first. Branch from freshly fetched `origin/master`.
- Option: `searchDelay`, in milliseconds, default `0`. The default keeps today's per-input search, so existing pages behave the same, as the mission's product rules ask. The name follows Tooltip's `enterDelay`.
- Scope: only searches started by typing wait. A search on focus runs at once. Blur and destroy cancel a pending search. Escape lets it run, and its results update the list without opening it.
- Validation: jsdom timing tests, plus docs, generated files and a reviewed gzip budget. The user did not choose a Chips passthrough test or a three-engine browser test as merge conditions.

### Agent decisions within the confirmed design

These are proposals made while writing the spec. The user can overturn any of them in review.

- The loading indicator and the `i18n.loading` announcement appear on the first changed input, not when the delayed search starts, so the field shows that a search is pending.
- A text change aborts the running search's signal at once, before the delay starts. Its response is for text the field no longer holds. With `searchDelay: 0` the abort and the new search happen together, as today.
- A value that is not a positive finite number, such as `0`, a negative number or `NaN`, means no delay.
- The delayed search reads the field's text when the timer fires, not the text from the first key of the burst.
- No Chips change. Chips users set `autocompleteOptions: { searchDelay }`.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Autocomplete accepts a `searchDelay` option, a number of milliseconds, with default `0`. It appears in `AutocompleteOptions` with a doc comment and in `_defaults`. |
| R2 | With `searchDelay` at its default, or at any value that is not a positive finite number, an input event that changes the search text calls `onSearch` synchronously, exactly as it does today. |
| R3 | With a positive `searchDelay`, an input event that changes the search text starts a timer, restarting it if one is pending. `onSearch` runs once when `searchDelay` milliseconds pass with no further text change, with the field's text at that moment and a fresh `AbortSignal`. |
| R4 | With a positive `searchDelay`, a text change aborts the signal of the search that is running, at the moment of the change. Each superseded search's signal is aborted exactly once, and the newest search's signal stays live until the next change, blur cancel or destroy. |
| R5 | The loading indicator and the `i18n.loading` announcement appear on the input event that changes the text, as today, whether or not the search waits. |
| R6 | A search started by focus, through `_handleInputFocus`, runs at once whatever `searchDelay` is, and cancels any pending delayed search. |
| R7 | Blur cancels a pending delayed search: `onSearch` is not called for it. The next focus searches at once, as R6 and the existing `oldVal` reset describe. |
| R8 | `destroy()` cancels a pending delayed search and aborts the last running search. No `onSearch` call happens after `destroy()`. |
| R9 | Escape does not cancel a pending delayed search. When it runs, `setMenuItems` updates the list without opening it, as `_left` already ensures. |
| R10 | Existing behavior stays when `searchDelay` is `0`: the search cancellation, delayed results, dismissal lifecycle, IME, injection and generated forms tests pass unchanged. |
| R11 | Docs and generated guidance describe the option. The options tables in the Autocomplete section of `llm.md` and in `docs/src/pages/autocomplete.astro` list `searchDelay` with its type, default and behavior. The remote search example uses it. The text saying pages own request cancellation is narrowed to error handling and ordering beyond the delay. The unreleased changelog lists the option under Added. `npm run build:skill` regenerates the derived files and `npm run check:generated` passes. |
| R12 | The bundle size change is recorded in a reviewed gzip budget line in `tests/selective-builds.test.js`. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- Keep `_search()` as the only place that calls `onSearch`, and keep the existing abort chain. Add one timer field next to `_openTimer` and clear it wherever `destroy()` and blur already clean up.
- Use `setTimeout` directly, as `open()` and Tooltip do. Add no dependencies and no debounce helper in `core/` for one caller.
- `searchDelay` is a runtime option, not markup, so `semantics.json` does not change.
- Tests run against built bundles. Build before testing, and tear instances and mocked timers down in `finally` blocks.

## Out of scope

- A default delay other than `0`.
- A minimum interval between searches (throttle), or a maximum wait during continuous typing.
- Delaying `setMenuItems`, `open()` or any path other than the input-triggered search.
- Hiding the stale results while a delayed search is pending. Arrow keys during the pause still open the previous results, as they do today while a slow `onSearch` is running.
- Chips changes, and a Chips passthrough test.
- A three-engine browser test.
- Roadmap edits, release and publication.

## Open decisions

None. The agent decisions above stand unless the user changes them in review.
