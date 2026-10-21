# Validation: autocomplete create option

Roadmap phase: Phase 14, autocomplete create option. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Tests run against built bundles, so build first with `npm run build:js`. Run suites one at a time, since parallel runs flake. Results were recorded on 2026-10-21 on branch `feature/2026-10-21-autocomplete-create-option`. Against the bundle built before the change, the eight cases that need the row failed and the rest passed, since a list without a row also satisfies them.

## Automated checks

V1 to V8 are new jsdom cases in `tests/regressions.test.js`, run with `node --test tests/regressions.test.js`. V10 and V11 are new cases in `tests/chips.test.js`, run with `node --test tests/chips.test.js`. The default `onSearch` filters `data`, so most cases need no custom search.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R5 | Autocomplete with `allowCreate: true`, data `Apple` and `Banana`, an `onCreate` that records its arguments, and an `expressive:create` listener. The field is focused. | Type `kiwi`, press ArrowDown until the create row is active, press Enter. | The last option reads `Add "kiwi"`. `onCreate` ran once with `'kiwi'` and the instance, then the event fired once with `{ text: 'kiwi' }`. The list is closed. | Passed 2026-10-21. |
| V2 | R2, R3 | The V1 instance, and a second one whose `onSearch` trims the text before filtering `data`. The default search keeps whitespace, so ` Apple ` matches nothing there. | In the V1 instance, type `apple`, then `app`. In the second, type ` Apple `. | No create row for `apple` or ` Apple `, since `Apple` is rendered and matches the trimmed text. For `app`, the options are `Apple` and then `Add "app"`. | Passed 2026-10-21. |
| V3 | R3, R9 | Instances with `allowCreate` off, and with `allowCreate` on and `minLength: 3`. | Type `kiwi` in the first. Type spaces only, then `ki`, then `  ki  `, in the second. | No create row in any case. | Passed 2026-10-21. |
| V4 | R4 | The V1 instance, and one with `allowUnsafeHTML: true`. | Type `<b>kiwi</b>` and arrow to the row in each. | The row has `role="option"`, `aria-selected="false"`, the class `autocomplete-create`, `data-create` and no `data-id`. Its label is the literal text with no `<b>` element. The input's `aria-activedescendant` is the row's id. | Passed 2026-10-21. The case checks `aria-activedescendant` in V1. |
| V5 | R5 | The V1 instance. | Type `kiwi` and click the create row. | `onCreate` and the event fire once with `kiwi`. `selectOption` did not run. | Passed 2026-10-21. |
| V6 | R6 | A single-select and a multi-select V1-style instance, each with `change` and `expressive:autocomplete` listeners and an `onSearch` counter. | Choose the create row for `kiwi` with Enter, then fire `focus` on the field without leaving it. | `selectedValues` is unchanged, no `change` or `expressive:autocomplete` fired, the field still reads `kiwi`, and `onSearch` did not run on refocus. | Passed 2026-10-21 in both modes. |
| V7 | R7 | The V1 instance. | Type `kiwi`, then `ban`. | The announcer reads `i18n.noResults` for `kiwi` and `1 result available.` for `ban`, so the create row is not counted. | Passed 2026-10-21. |
| V8 | R8 | Autocomplete with `allowCreate` and an `onSearch` that stores `text` and calls `setMenuItems()` later. | Type `pe`, then call `setMenuItems([{ id: 'pear' }])`. Type `pea`, then `pear`, resolving each search. | After the first results the list holds `pear` and `Add "pe"`. For `pea` the row reads `Add "pea"`. For `pear` there is no row. | Passed 2026-10-21. |
| V9 | R9 | Existing suites. | Run `tests/regressions.test.js`, `tests/selection-events.test.js`, `tests/injection.test.js`, `tests/dismissal-lifecycle.test.js`, `tests/ime-enter.test.js`, `tests/forms-generated.test.js` and `tests/chips.test.js`, one file at a time with `node --test`. | All pass. | Passed 2026-10-21, one file at a time: regressions 140, selection events 15, injection 14, dismissal lifecycle 10, IME 10, generated forms 24, chips 26. `tests/chips-form.test.js` also passed, 17. |
| V10 | R10 | Chips with `allowUserInput`, `autocompleteOptions: { data: [{ id: 'Apple' }], allowCreate: true, onCreate }`, in two variants: `autocompleteOnly` off and on. | Type `kiwi` and choose the create row by keyboard. Then set `limit: 1` on a fresh instance with one chip and choose the row again. Choose the row for a text that is already a chip. | A chip `kiwi` is added, the input is empty and focused, and the page's `onCreate` ran with `kiwi`, in both variants. At the limit or for a duplicate, no chip is added. | Passed 2026-10-21. |
| V11 | R11 | The `autocompleteOnly` variant from V10. | Type `kiwi`, leave the list without an active row and press Enter. Paste `a, b`. | No chip is added by Enter, and the paste stays text in the input. | Passed 2026-10-21. |
| V12 | R12 | Plan group 4 edits. | `npm run build:skill`, then `npm run check:generated`. Read the Autocomplete options and events tables in `llm.md` and the docs page, the Chips docs and the changelog. | Generation is clean. The tables list `allowCreate`, `onCreate`, `i18n.create` and `expressive:create`. The Chips docs describe the row with `autocompleteOnly`. The changelog has the Added entry. | Passed 2026-10-21. Every guide's contract hash changed with `llm.md`; only the Autocomplete and Chips guides changed otherwise. The docs, skill, semantics and version suites passed. |
| V14 | R5, R6 | V1-style instances, one with an `onSearch` that returns nothing and one with `searchDelay: 20`. Added in review, after mutation checks showed four lines no case covered. | Leave an `Add "kiwi"` row on screen, type `kiwis` and choose the row. Choose the row after late results, then fire `focus`. Choose the row while a delayed search waits. Press the row with a mouse and click it. | The stale row creates `kiwi`. Refocusing starts no search. The waiting search never runs and the list stays closed. Focus returns to the field. | Passed 2026-10-21. Removing the minLength check, the `oldVal` line, the pending-search cancel, the refocus or the stored row text each fails a case. |
| V13 | R13 | A fresh build. | `node --test tests/selective-builds.test.js`. | The test passes with a reviewed budget line naming this change and its gzip bytes for JavaScript. | Passed 2026-10-21: JavaScript 89,760 gzip bytes, in two reviewed lines: +240 for Autocomplete and +50 for Chips. The review fix added a third line: 89,762 (+2). CSS did not change. |

## Recommended, not required for merge

`tech-stack.md` asks for `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting. The user did not choose them as merge conditions on 2026-10-21. All three passed on 2026-10-21: `npm run verify` ran 2,343 tests with none failing and 3 skipped (the optional evaluation browser tests), the MCP smoke test passed, and `verify:packages` verified the isolated MCP package. The MCP commands first needed `npm ci --prefix mcp/expressivecss` in this worktree.

## Manual checks

None are required for merge. These are useful but optional:

- The keyboard flow in Chromium, Firefox and WebKit on the docs Autocomplete page. The user chose not to require a three-engine browser test.
- A screen reader pass that hears the create row's label when arrowing to it.

## Merge conditions

- V1 to V14 pass.
- The existing Autocomplete and Chips tests pass (V9).
- The fallow pre-commit gate passes on the new and changed functions.
- The repository's required CI checks pass and the pull request is reviewed.
- The changelog lists `allowCreate` under Added.
