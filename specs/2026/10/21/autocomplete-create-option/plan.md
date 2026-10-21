# Plan: autocomplete create option

Roadmap phase: Phase 14, autocomplete create option. Branch `feature/2026-10-21-autocomplete-create-option` from `origin/master` at `8d45c2c4`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed. The fallow pre-commit gate runs the tests, so group 1's failing tests can share a commit with group 2 or 3, as Phase 13 did.

Implemented 2026-10-21. Group 1's tests went into the commits for groups 2 and 3, each with its own gzip budget line from group 5, so every commit passes the pre-commit gate. Group 4 also updated the events table on the AutoInit docs page; see the decisions added in [requirements.md](requirements.md#agent-decisions-within-the-confirmed-design).

## 1. Failing tests

Outcome: tests that describe the new contract fail against the current bundle, and the existing Autocomplete and Chips tests pass.

Prerequisites: none.

- [x] Add a `describe('Autocomplete allowCreate')` block in `tests/regressions.test.js`, after "Autocomplete searchDelay".
- [x] Cover the roadmap check: with `allowCreate` and data `Apple`, `Banana`, type `kiwi`, arrow to the row, press Enter, and receive `onCreate('kiwi', instance)` and `expressive:create` with `{ text: 'kiwi' }` (V1).
- [x] Cover the row's presence: an exact match such as `apple`, or ` Apple ` with an `onSearch` that trims, shows no row, a partial match `app` shows the row last, and the option off, empty text or text below `minLength` show none (V2, V3).
- [x] Cover the row's markup, its text with `allowUnsafeHTML` and a markup-like value, and `aria-activedescendant` (V4).
- [x] Cover a click on the row (V5), an unchanged selection with no `change` or `expressive:autocomplete` and no search on refocus, in single and multi-select (V6), the announcement (V7), and a row after an asynchronous `setMenuItems()` that changes with the text (V8).
- [x] Add Chips cases in `tests/chips.test.js`: choosing the row adds a chip and clears the input, with `autocompleteOnly` off and on, `limit` and duplicates are respected, the page's `onCreate` still runs, and Enter on free text in an `autocompleteOnly` field adds nothing (V10, V11).
- [x] Build with `npm run build:js`, run `node --test tests/regressions.test.js` and `node --test tests/chips.test.js`, and confirm only the new cases fail.

Completion check: only the new `allowCreate` and Chips create cases fail.

Covers: R1 to R8, R10, R11; V1 to V8, V10, V11.

## 2. Autocomplete row and event

Outcome: Autocomplete offers the create row and reports a choice of it.

Prerequisites: group 1.

- [x] In `src/ts/components/autocomplete.ts`, add `allowCreate` and `onCreate` to `AutocompleteOptions` with doc comments, and to `_defaults`. Add `create` to the `i18n` type and defaults.
- [x] Add a helper that returns the trimmed text to offer, or nothing when the option is off, the text is below `minLength`, or a rendered suggestion matches it exactly, case-insensitively.
- [x] Add a `_createRow(text)` method next to `_createMenuItem` that builds the `li` from R4, with its label set through `textContent`. Append it at the end of `_renderMenu()` when the helper returns text.
- [x] Add one helper for a chosen row. It calls a new `_create()` for a row with `data-create` and `selectOption()` otherwise. Use it in the Enter branch of `_handleInputKeydown` and in the `onItemClick` wrapper in `_setupMenu()`.
- [x] In `_create()`, set `oldVal` to the field's lowercased value, close the list, and call `this._notify('create', this.options.onCreate, { args: [text, this], detail: { text } })`.
- [x] Keep each new or changed function below cyclomatic complexity 5.
- [x] Build, then run `node --test tests/regressions.test.js`.

Completion check: V1 to V8 pass.

Covers: R1 to R8; V1 to V8.

## 3. Chips

Outcome: Chips turns a chosen create row into a chip.

Prerequisites: group 2.

- [x] In `_setupAutocomplete()` in `src/ts/components/chips.ts`, keep the page's `autocompleteOptions.onCreate`, then set a wrapper that returns if the instance is gone, calls `addChip({ id: text })`, clears and focuses the input, and calls the page's callback.
- [x] Leave `_handleInputKeydown` and `_handleInputPaste` alone, so `autocompleteOnly` still blocks Enter and paste.
- [x] Build, then run `node --test tests/chips.test.js`.

Completion check: V10 and V11 pass.

Covers: R10, R11; V10, V11.

## 4. Docs and generated guidance

Outcome: authors and agents can find and use the option.

Prerequisites: group 3.

- [x] In the Autocomplete section of `llm.md`, add `allowCreate` and `onCreate` rows to the options table, add `create` where the `i18n` strings are described, and add a short example of a tagging field. Add `expressive:create` with `{ text }` to the events table.
- [x] In the Chips section of `llm.md`, say that a create row adds a chip, also in an `autocompleteOnly` field.
- [x] Make the same changes in `docs/src/pages/autocomplete.astro` and `docs/src/pages/chips.astro`.
- [x] Add an Unreleased Added entry to `CHANGELOG.md`: Autocomplete's `allowCreate` option offers an "Add" row for text that matches no suggestion, and choosing it fires `onCreate` and `expressive:create`. Chips adds the text as a chip.
- [x] Run `npm run build:skill`, then `npm run check:generated`.

Completion check: `npm run check:generated` passes, and the docs, `llm.md` and changelog describe R1 to R11 (V12).

Covers: R12; V12.

## 5. Budget and checks

Outcome: the branch is ready for review.

Prerequisites: group 4.

- [x] Build, read the new gzip size from the selective builds test, and add a reviewed budget line to `tests/selective-builds.test.js` (V13).
- [x] Rerun the suites from V9 one file at a time.
- [x] Optionally run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, which `tech-stack.md` recommends before submitting. Record what ran.
- [x] Record each result in `validation.md`.

Completion check: V1 to V14 pass. V14 was added in review.

Covers: R9, R13; V9, V13.
