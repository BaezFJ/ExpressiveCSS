# Autocomplete disabled choices: plan

- Date: 2026-10-27
- Roadmap phase: Phase 65, autocomplete disabled choices
- Branch: `feature/2026-10-27-autocomplete-disabled-choices`
- Base: `origin/master` at `c8cf5a94306a83df874c49db9540c17abd1b1078`
- Status: groups 1 and 2 done, group 3 done locally on 2026-10-27; PR gates pending

Deliver [requirements.md](requirements.md) within the [mission](../../../../mission.md#product-rules), the [tech stack](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 65](../../../../roadmap.md#phase-65-autocomplete-disabled-choices). Check IDs refer to [validation.md](validation.md). The user confirmed these three groups on 2026-10-27.

## 1. Disabled entries with tests

Outcome: an entry with `disabled: true` shows in the results, dimmed, and no pointer, keyboard or script path selects or deselects it.

Prerequisites: the base commit. Read `src/ts/README.md` and `src/sass/README.md`.

- [x] Write the V1 roadmap regression in `tests/regressions.test.js` first and confirm it fails on the base. Covers R3 with V1.
- [x] In `src/ts/components/autocomplete.ts`, add `disabled?: boolean` to `AutocompleteData`. In `_createMenuItem()`, set `aria-disabled="true"` and disable the multi-select checkbox. Covers R1 and R2 with V2.
- [x] Refuse disabled entries once in `selectOption()`, which pointer, Enter and script all reach. Covers R3 with V1.
- [x] Narrow `_options()` to enabled rows, so arrow movement and Enter skip disabled ones. Covers R4 with V3 and V5.
- [x] Count enabled entries in the results announcement, and treat disabled matches as existing values in `_createText()`. Covers R5 and R7 with V3.
- [x] Confirm that the `selected` option, `setMenuItems(items, selected)`, a value present at setup, and single-mode text edits behave as R6 states. Covers R6 with V4.
- [x] Add `tests/autocomplete-disabled-browser.test.js` (new file) for V5. Add an Autocomplete-scoped rule in `src/sass/components/forms/_input-fields.scss` only if the `menu[id]` disabled styles do not reach the rows. Covers R2, R4 and R8 with V5. The styles reached the rows, but their `pointer-events: none` let a press fall through to the list, which took focus from the field. The rows now take the pointer, and the handler that cancels presses on the no-results row cancels them too.
- [x] Run the existing Autocomplete, Chips and Menu suites. Covers R8 with V6.

Completion check: V1 through V6 pass. V1 fails on the base and passes on the branch. Components, timers and browsers close in `finally` blocks.

## 2. Docs and generated guidance

Outcome: people and agents read the same contract for disabled entries.

Prerequisites: group 1 has fixed the behavior.

- [x] Add `disabled` to the `data` list in the Autocomplete section of `llm.md`, and describe the keyboard skip, the count and locked selections.
- [x] Add a live example with a disabled entry to `docs/src/pages/autocomplete.astro`, and update its data description. The example's setup in `docs/static/docs.js` shares a table with the multi-select example, which keeps the page script under the complexity gate.
- [x] Add an `[Unreleased]` entry to `CHANGELOG.md`. Update the `autocomplete` record in `docs/src/data/component-decisions.json` only if its recorded support changes. Leave `semantics.json` unchanged. Autocomplete has no record of its own there, so nothing changed.
- [x] Run `npm run build:semantics`, `npm run build:skill` and `npm run check:generated`. Run `build:skill` again after the last edit to any hashed source.

Completion check: V7 passes, and the docs example uses the implemented API. Covers R9.

## 3. Size, regressions and merge readiness

Outcome: the change has a reviewed bundle cost and passes the checks the user chose.

Prerequisites: groups 1 and 2.

- [x] Measure JS and CSS gzip sizes against the base with the same build, and record them in the budget lines of `tests/selective-builds.test.js`. Covers R9 with V8. The budget test fails on any growth, so this landed with the group 1 browser commit.
- [x] Run the V5 browser suite in Chromium, Firefox and WebKit, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one suite at a time. Covers V5 and V8.
- [x] Record results in `validation.md`, including any skipped engine or flaky rerun.
- [ ] Before merge, confirm PR CI, review conversations and branch freshness.

Completion check: V1 through V8 pass, and the merge conditions in `validation.md` hold. The roadmap completion state stays unchanged.
