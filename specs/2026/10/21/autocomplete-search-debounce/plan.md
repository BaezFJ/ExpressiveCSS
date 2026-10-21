# Plan: autocomplete search debounce

Roadmap phase: Phase 13, autocomplete search debounce. Branch `feature/2026-10-21-autocomplete-search-debounce` from `origin/master` at `e67c13cc`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

## 1. Failing tests

Outcome: tests that describe the new contract fail against the current bundle, and the existing Autocomplete tests pass.

Prerequisites: none.

- [ ] Add a `describe('Autocomplete searchDelay')` block in `tests/regressions.test.js`, next to "Autocomplete search cancellation". Mock `setTimeout` with `t.mock.timers`, following `tests/carousel.test.js`, and reset it in `finally`.
- [ ] Cover the roadmap check: five changed inputs within the delay give one `onSearch` call with the full text, and none before the delay passes. Then a pause, two more characters and another pause give a second call, and the first call's signal is aborted (V1, V2).
- [ ] Cover the loading status appearing on the first input (V3), focus searching at once and cancelling a pending search (V4), blur and destroy cancelling (V5), and Escape letting the search run without opening the list (V6).
- [ ] Cover `searchDelay` of `0`, a negative number and `NaN` calling `onSearch` synchronously (V7).
- [ ] Build with `npm run build:js`, run `node --test tests/regressions.test.js`, and confirm the new cases fail because `onSearch` runs on every input, while the existing cases pass.

Completion check: only the new `searchDelay` cases fail.

Covers: R1 to R9; V1 to V7.

## 2. The option

Outcome: `searchDelay` waits for a pause, aborts superseded searches and cleans up its timer.

Prerequisites: group 1.

- [ ] In `src/ts/components/autocomplete.ts`, add `searchDelay: number` to `AutocompleteOptions` with a doc comment and `searchDelay: 0` to `_defaults`.
- [ ] Add a `_searchTimer` field next to `_openTimer`. In `_inputChangeDetection`, keep `_setStatusLoading()` where it is. For an input-triggered change with a positive finite delay, abort the running search, clear any pending timer and schedule `_search(this.el.value)`. Otherwise clear any pending timer and call `_search()` at once. Pass whether the call came from input or focus, since both handlers share the method.
- [ ] Clear `_searchTimer` in `_handleInputBlur` and in `destroy()` before the existing abort. Leave `_dismiss()` alone.
- [ ] Keep each new or changed function below cyclomatic complexity 5. Move the delay decision into a small helper if `_inputChangeDetection` reaches the limit.
- [ ] Build, then run `node --test tests/regressions.test.js`, `tests/dismissal-lifecycle.test.js`, `tests/ime-enter.test.js`, `tests/injection.test.js`, `tests/forms-generated.test.js` and `tests/chips.test.js`, one file at a time.

Completion check: V1 to V7 pass and the existing suites in V8 pass.

Covers: R1 to R10; V1 to V8.

## 3. Docs and generated guidance

Outcome: authors and agents can find and use the option.

Prerequisites: group 2.

- [ ] Add a `searchDelay` row to the options table in the Autocomplete section of `llm.md`, after `onSearch`. Add `searchDelay: 300` to the remote `fetch()` example, and narrow "Applications still own asynchronous request cancellation, stale-response ordering and error handling" to what the option does not cover.
- [ ] Make the same changes in `docs/src/pages/autocomplete.astro`.
- [ ] Add an Unreleased Added entry to `CHANGELOG.md`: Autocomplete's `searchDelay` option waits for typing to pause before calling `onSearch`, and aborts the signal of a search whose text changed. Chips reach it through `autocompleteOptions`.
- [ ] Run `npm run build:skill`, then `npm run check:generated`.

Completion check: `npm run check:generated` passes, and the docs, `llm.md` and changelog describe R1 to R9 (V9).

Covers: R11; V9.

## 4. Budget and checks

Outcome: the branch is ready for review.

Prerequisites: group 3.

- [ ] Build, read the new gzip size from the selective builds test, and add a reviewed budget line to `tests/selective-builds.test.js` (V10).
- [ ] Rerun the suites from V8 one file at a time.
- [ ] Optionally run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, which `tech-stack.md` recommends before submitting. Record what ran.
- [ ] Record each result in `validation.md`.

Completion check: V1 to V10 pass.

Covers: R12; V8, V10.
