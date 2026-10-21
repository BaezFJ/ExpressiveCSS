# Validation: autocomplete create option

Roadmap phase: Phase 14, autocomplete create option. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Tests run against built bundles, so build first with `npm run build:js`. Run suites one at a time, since parallel runs flake. Every result is pending until the feature is built.

## Automated checks

V1 to V8 are new jsdom cases in `tests/regressions.test.js`, run with `node --test tests/regressions.test.js`. V10 and V11 are new cases in `tests/chips.test.js`, run with `node --test tests/chips.test.js`. The default `onSearch` filters `data`, so most cases need no custom search.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R5 | Autocomplete with `allowCreate: true`, data `Apple` and `Banana`, an `onCreate` that records its arguments, and an `expressive:create` listener. The field is focused. | Type `kiwi`, press ArrowDown until the create row is active, press Enter. | The last option reads `Add "kiwi"`. `onCreate` ran once with `'kiwi'` and the instance, then the event fired once with `{ text: 'kiwi' }`. The list is closed. | Pending |
| V2 | R2, R3 | The V1 instance, and a second one whose `onSearch` trims the text before filtering `data`. The default search keeps whitespace, so ` Apple ` matches nothing there. | In the V1 instance, type `apple`, then `app`. In the second, type ` Apple `. | No create row for `apple` or ` Apple `, since `Apple` is rendered and matches the trimmed text. For `app`, the options are `Apple` and then `Add "app"`. | Pending |
| V3 | R3, R9 | Instances with `allowCreate` off, and with `allowCreate` on and `minLength: 3`. | Type `kiwi` in the first. Type spaces only, then `ki`, in the second. | No create row in any case. | Pending |
| V4 | R4 | The V1 instance, and one with `allowUnsafeHTML: true`. | Type `<b>kiwi</b>` and arrow to the row in each. | The row has `role="option"`, `aria-selected="false"`, the class `autocomplete-create`, `data-create` and no `data-id`. Its label is the literal text with no `<b>` element. The input's `aria-activedescendant` is the row's id. | Pending |
| V5 | R5 | The V1 instance. | Type `kiwi` and click the create row. | `onCreate` and the event fire once with `kiwi`. `selectOption` did not run. | Pending |
| V6 | R6 | A single-select and a multi-select V1-style instance, each with `change` and `expressive:autocomplete` listeners and an `onSearch` counter. | Choose the create row for `kiwi`, blur, then focus the field. | `selectedValues` is unchanged, no `change` or `expressive:autocomplete` fired, the field still reads `kiwi`, and `onSearch` did not run on refocus. | Pending |
| V7 | R7 | The V1 instance. | Type `kiwi`, then `ban`. | The announcer reads `i18n.noResults` for `kiwi` and `1 result available.` for `ban`, so the create row is not counted. | Pending |
| V8 | R8 | Autocomplete with `allowCreate` and an `onSearch` that stores `text` and calls `setMenuItems()` later. | Type `pe`, then call `setMenuItems([{ id: 'pear' }])`. Type `pea`, then `pear`, resolving each search. | After the first results the list holds `pear` and `Add "pe"`. For `pea` the row reads `Add "pea"`. For `pear` there is no row. | Pending |
| V9 | R9 | Existing suites. | Run `tests/regressions.test.js`, `tests/selection-events.test.js`, `tests/injection.test.js`, `tests/dismissal-lifecycle.test.js`, `tests/ime-enter.test.js`, `tests/forms-generated.test.js` and `tests/chips.test.js`, one file at a time with `node --test`. | All pass. | Pending |
| V10 | R10 | Chips with `allowUserInput`, `autocompleteOptions: { data: [{ id: 'Apple' }], allowCreate: true, onCreate }`, in two variants: `autocompleteOnly` off and on. | Type `kiwi` and choose the create row by keyboard. Then set `limit: 1` on a fresh instance with one chip and choose the row again. Choose the row for a text that is already a chip. | A chip `kiwi` is added, the input is empty and focused, and the page's `onCreate` ran with `kiwi`, in both variants. At the limit or for a duplicate, no chip is added. | Pending |
| V11 | R11 | The `autocompleteOnly` variant from V10. | Type `kiwi`, leave the list without an active row and press Enter. Paste `a, b`. | No chip is added by Enter, and the paste stays text in the input. | Pending |
| V12 | R12 | Plan group 4 edits. | `npm run build:skill`, then `npm run check:generated`. Read the Autocomplete options and events tables in `llm.md` and the docs page, the Chips docs and the changelog. | Generation is clean. The tables list `allowCreate`, `onCreate`, `i18n.create` and `expressive:create`. The Chips docs describe the row with `autocompleteOnly`. The changelog has the Added entry. | Pending |
| V13 | R13 | A fresh build. | `node --test tests/selective-builds.test.js`. | The test passes with a reviewed budget line naming this change and its gzip bytes for JavaScript. | Pending |

## Recommended, not required for merge

`tech-stack.md` asks for `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting. The user did not choose them as merge conditions on 2026-10-21. The MCP commands may first need `npm ci --prefix mcp/expressivecss` in a worktree.

## Manual checks

None are required for merge. These are useful but optional:

- The keyboard flow in Chromium, Firefox and WebKit on the docs Autocomplete page. The user chose not to require a three-engine browser test.
- A screen reader pass that hears the create row's label when arrowing to it.

## Merge conditions

- V1 to V13 pass.
- The existing Autocomplete and Chips tests pass (V9).
- The fallow pre-commit gate passes on the new and changed functions.
- The repository's required CI checks pass and the pull request is reviewed.
- The changelog lists `allowCreate` under Added.
