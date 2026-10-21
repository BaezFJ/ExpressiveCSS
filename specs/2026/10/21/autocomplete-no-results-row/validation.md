# Validation: autocomplete visible no-results row

Roadmap phase: Phase 15, autocomplete visible no-results row. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent owns every check below. Tests run against built bundles, so build first with `npm run build:js` and `npm run build:css`. Run suites one at a time, since parallel runs flake.

## Specification verification

Checked 2026-10-21, before implementation. The branch is `feature/2026-10-21-autocomplete-no-results-row` at `8d45c2c4` with a clean tree, so every change on it comes from this phase. All three documents name Phase 15, and the links to `mission.md`, `tech-stack.md` and `roadmap.md` resolve. Each of R1 to R10 has a plan group and a V check.

A `Plan` subagent reviewed the three files, the constitution and the code without seeing the agent's reasoning. Its findings, checked against the source and fixed in the spec:

- High: testing `menuItems` alone would show the row while the first remote search loads, because `data` defaults to `[]` and `open()` renders before the search returns. The row now follows a flag that `setMenuItems()` sets and a text change clears, and V5 covers a pending search.
- High: with `pointer-events: none`, a click lands on the `<menu>`, which takes focus, and nothing returns it to the field. The row now keeps pointer events, and capture listeners cancel `mousedown` and `click` on it.
- Medium: a color on the `li` would not reach the span, whose own rule sets `color` from `--md-comp-menu-item-label-text-color`. The row now sets that property, and V1 checks the computed color.
- Medium: the fallow complexity rule applies to new functions, and nothing commits during this run, so V9 runs `fallow audit` directly. `_handleInputKeydown` only changes selectors.
- Low: gzip sizes are measured separately, V6 now presses Enter, V1 checks the cursor and the hover background, the `minLength` case is marked as a regression guard, and the pairing with Phase 14's create row is recorded as a decision.

The reviewer confirmed the other claims about current code: the fallback, the `li` indexing in the keydown handler, Menu's disabled-only click guard, the span row layout and the live region.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R4, R8 | Browser scenario in `tests/expressivecss-web-accessibility-browser.test.js`, all three engines. Autocomplete with `apple` and `apricot`. | Focus, type `z`. Hover the row. Then select all and type `a`. | After `z`, the list is visible and holds one `li.autocomplete-no-results` reading `No results.`, with `role="none"` and `aria-hidden="true"`, and the live region reads `No results.`. The row's cursor is `default`, its text color equals the menu's supporting text color, and its background stays transparent under the pointer. After `a`, the row is gone and two options show. | Passed 2026-10-21 in Chromium, Firefox and WebKit (`EXPRESSIVECSS_TEST_BROWSER=<engine> node --test --test-name-pattern=autocomplete`). It failed before the change: no row existed. |
| V2 | R3 | The V1 page, showing the row. | Press ArrowDown, then Enter. | The input has no `aria-activedescendant`, no row is `.active`, the value stays `z`, and no `change` fires. | Passed 2026-10-21 in all three engines. Enter commits the text, so Chromium fires its own native `change`; the scenario checks that `expressive:autocomplete` and `expressive:select` did not fire, and the jsdom case checks that `selectedValues` stays empty. |
| V3 | R3 | The V1 page, showing the row, with listeners for `change`, `expressive:autocomplete` and `expressive:select`. | Click the row with `locator.click()`. | No event fires, the list stays open and the input stays focused. | Passed 2026-10-21 in all three engines. |
| V4 | R1, R2, R6 | jsdom in `tests/regressions.test.js`. Instances with a custom `i18n.noResults`, and with `allowUnsafeHTML: true` and `i18n.noResults: '<b>none</b>'`. | Call `setMenuItems([])` on a focused field with text. | The row's text is the custom string. With `allowUnsafeHTML`, the text is literal and no `<b>` exists. The row has no `id`, `data-id` or `tabindex`. | Passed 2026-10-21, `node --test tests/regressions.test.js`: 135 passed. All five new cases failed against the bundle built before the change. |
| V5 | R4 | jsdom. One instance with `minLength: 3`, and one whose `onSearch` never calls `setMenuItems`, after an earlier empty result. | Type two characters into the first. Let the second's first search return nothing, press Escape, then type a changed text. | No row below `minLength`. The second shows the row after the empty result and none while the new search is pending. | Passed 2026-10-21. Changed in the final review to type after Escape; that step failed with the `_handleInput` clear removed. |
| V6 | R5 | jsdom, multi-select with `selected: ['apple']`. | Search for text with no match, press ArrowDown, then Enter. | The row comes first, then the `apple` option. ArrowDown makes `apple` active, and Enter deselects it. | Passed 2026-10-21. |
| V7 | R7 | Existing suites. | Run `tests/regressions.test.js`, `tests/selection-events.test.js`, `tests/dismissal-lifecycle.test.js`, `tests/ime-enter.test.js`, `tests/injection.test.js`, `tests/forms-generated.test.js`, `tests/chips.test.js` and the Autocomplete scenarios in `tests/expressivecss-web-accessibility-browser.test.js`, one file at a time with `node --test`. | All pass. | Passed 2026-10-21, one file at a time: regressions 135, selection events 15, dismissal lifecycle 10, IME 10, injection 14, generated forms 24, chips 22, chips form 17, keyboard focus 10, and the four Autocomplete browser scenarios in each engine. `npm run verify` then ran 2,337 tests: 2,331 passed, 3 skipped (optional evaluation browser tests), 3 failed. The three failures are known load flakes outside this change (docker runner SIGINT, Codex adapter oversized streams, WebKit sheet spring-back), and each passed when rerun alone. |
| V8 | R9 | Plan group 3 edits. | `npm run build:skill`, then `npm run check:generated`. Read the `i18n` paragraphs and the changelog. | Generation is clean, and both docs and the changelog mention the row. | Passed 2026-10-21. `check:generated` reported 84 current guides. Every guide under `skills/` and `mcp/` changed only its contract hash, which follows `llm.md`. `npm run test:skill` passed 247. |
| V9 | R10 | A fresh build. | Measure gzip sizes, then `node --test tests/selective-builds.test.js` and `npx fallow audit --base origin/master`. | Budget lines name this change and its gzip bytes. The test and the audit pass. | Passed 2026-10-21. After the final-review fixes: JavaScript 89,625 gzip bytes (+155), CSS 84,585 (+72), with reviewed lines; the budget test passed 4. `fallow audit --base origin/master` reported no issues in the changed files. |
| V11 | R11 | jsdom in `tests/chips.test.js`: Chips with `autocompleteOptions.data`. | Type `kiwi`, see the row, press Enter, wait a tick. | A `kiwi` chip is added and the Autocomplete menu is closed. | Passed 2026-10-21, chips 23. It failed with the Chips line removed. |

## Manual checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V10 | R1, R8 | Open a page with the built CSS and JS in Chromium through Playwright, type text with no match, and take a screenshot. | The row reads `No results.` in the muted supporting color, at menu row height. | Passed 2026-10-21, Chromium screenshot through Playwright with the pointer on the row: "No results." in the muted color at row height, no hover layer. A screenshot does not show the cursor; V1 checks it. Its text sits at Menu's 16dp inset, while Autocomplete's option rows use their own 5px inline padding, so a multi-select fallback shows the two insets one above the other. |

A screen reader pass is useful but not required: the row is hidden from assistive technology, and the existing announcement is already covered by the "autocomplete announces results" scenario.

## Merge conditions

- V1 to V11 pass.
- `npm run verify` passes, apart from known flakes rerun alone.
- The fallow pre-commit gate passes.
- The repository's required CI checks pass and the pull request is reviewed.

## Final review

A `Plan` subagent reviewed `git diff 8d45c2c4` and the spec on 2026-10-21, after every check above had run. It traced R1 to R10 to code and evidence and found nothing outside Phase 15. Its findings, each checked against the source:

- Medium, fixed: typing after Escape called `open()` before the text change cleared the no-results record, so the list reopened with the old answer while the new search loaded. `_handleInput` now clears it first, and V5 types after Escape instead of calling `open()`.
- Medium, fixed: Menu's bare-span rule gave the row's span `cursor: pointer`, and V1 read the cursor of the `li`. The text now sits in the `li` itself.
- Low, fixed: Chips cleared the field on Enter without closing the list, which then read "No results." under an empty field. R11 and V11 cover the fix.
- Low, fixed: the budget lines were uncommitted, and `llm.md` claimed the row never shows while a search loads. The commits were regrouped and the sentence removed.
- Nit, fixed: the press handler checks `e.target instanceof Element`.
- Wording, fixed: V8 described the generated changes wrongly, and V10 claimed a cursor check that a screenshot cannot make.

After the fixes, the regressions, Chips, Chips form, selection events, dismissal lifecycle, IME, injection and keyboard focus suites, the Chips form browser suite and the Autocomplete browser scenarios in all three engines passed again, one file at a time. `fallow audit --base origin/master` reported no issues in 100 changed files.

## Code review and package checks

The agent reviewed `git diff origin/master...HEAD` on 2026-10-21 for correctness, readability, architecture, security and performance, and found nothing to change. Two mutations confirmed the tests catch regressions: removing `stopPropagation` from the press handler failed one case, and counting every `li` again in the keydown handler failed two.

`npm run verify:packages` passed and ran the MCP smoke test. `npm test --prefix mcp/expressivecss` first failed on a static-inspection time limit at a load average near 100 from parallel runs on this machine. It passed when rerun at a load average of 27.

## After rebasing onto Phase 14

Phase 14 merged to `master` as `774b0d27` before this branch was pushed, so the branch was rebased onto it on 2026-10-21. `autocomplete.ts` merged without conflicts: Phase 14's Enter and arrow-key code already went through the `_options()` list, which includes its "Add" row because that row is an option. The tests, changelog and docs conflicts kept both phases' additions. The generated skill and MCP files took `master`'s side and were regenerated with `npm run build:skill`.

A new jsdom case checks the combined list: with `allowCreate`, a search for `kiwi` shows the no-results row first and the "Add" row after it, and ArrowDown makes the "Add" row active. The JavaScript budget line was re-measured on top of Phase 14: 89,895 gzip bytes (+133). CSS stayed at 84,585 (+72).

After the rebase these passed, one file at a time: regressions 150, Chips 27, Chips form 17, selection events 15, dismissal lifecycle 10, IME 10, injection 14, keyboard focus 10, generated forms 24, selective builds 4, docs API 2, skill 33, the Chips form browser suite 9, and the four Autocomplete browser scenarios in each engine. `check:generated` passed. The full `npm run verify` ran before the rebase; CI runs it on the rebased branch.

With Phase 14's `if (createText)` and this phase's `if (this._noResults)`, `_renderMenu` reached cyclomatic complexity 5, and the fallow pre-commit gate stopped the commit. Its `for` loop became a spread `map` over the entries, which brings it back to 4 and renders the same rows. The gate then passed, and regressions 150, Chips 27, selection events 15, injection 14 and selective builds 4 passed again.
