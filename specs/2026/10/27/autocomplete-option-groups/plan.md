# Autocomplete option groups: plan

- Date: 2026-10-27
- Roadmap phase: Phase 66, autocomplete option groups
- Branch: `feature/2026-10-27-autocomplete-option-groups`
- Base: `origin/master` at `db981aa4f83d0d2ee63e5877c1238cc698b2045e`
- Status: groups 1 and 2 done, group 3 done locally on 2026-10-27; PR gates pending

Deliver [requirements.md](requirements.md) within the [mission](../../../../mission.md#product-rules), the [tech stack](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 66](../../../../roadmap.md#phase-66-autocomplete-option-groups). Check IDs refer to [validation.md](validation.md). The user confirmed these three groups on 2026-10-27.

## 1. Grouped results with tests

Outcome: entries with a `group` render under labelled headings, and the keyboard, pointer, script and count treat only option rows as choices.

Prerequisites: the base commit. Read `src/ts/README.md` and `src/sass/README.md`.

- [x] Write the V1 roadmap regression in `tests/regressions.test.js` first and confirm it fails on the base. Covers R4 and R5 with V1.
- [x] In `src/ts/components/autocomplete.ts`, add `group?: string` to `AutocompleteData`. Covers R1 with V2.
- [x] In `_renderMenu()`, append each entry through a small helper that creates a group's `li[role="none"] > ul[role="group"]` and its heading at the group's first appearance and reuses it afterwards. Keep the no-results row first and the "Add" row last. Covers R2 and R7 with V2 and V4.
- [x] Find the row to update in `_toggleOption()` anywhere in the container, not only among its direct children. Covers R6 with V3.
- [x] Add the heading to the `_handleInertRowPress` selector. Covers R3 with V3 and V5.
- [x] Style the heading in `.autocomplete-content` in `src/sass/components/forms/_input-fields.scss`, reusing Menu's label tokens, and check forced colors. Covers R3 with V5. FormSelect's `menu[role="listbox"] > li` rule lays the group wrapper out as flex, which shrank the group to its widest row, so the group list takes `flex: 1 1 auto`. The heading also carries Menu's `label` class, which keeps Menu's hover and pressed layers off it.
- [x] Confirm that `_options()` and `_resultsMessage()` need no change, and that ungrouped results render the base DOM. Covers R4, R5 and R8 with V1, V2 and V6. Neither needed a change.
- [x] Add `tests/autocomplete-groups-browser.test.js` (new file) for V5. Covers R3, R4 and R6 with V5.
- [x] Run the existing Autocomplete, Chips, Menu and FormSelect suites. Covers R8 with V6.

Completion check: V1 through V6 pass. V1 fails on the base and passes on the branch. Components, timers and browsers close in `finally` blocks.

## 2. Docs and generated guidance

Outcome: people and agents read the same contract for grouped results.

Prerequisites: group 1 has fixed the behavior.

- [x] Add `group` to the `data` list in the Autocomplete section of `llm.md`, and describe first-appearance order, the keyboard path across headings and the count.
- [x] Add a live example with grouped results to `docs/src/pages/autocomplete.astro`, with its setup in `docs/static/docs.js`. The setup joins the table that the multi-select and disabled examples share, with `isMultiSelect: false`.
- [x] Add an `[Unreleased]` entry to `CHANGELOG.md`. Update the `autocomplete` record in `docs/src/data/component-decisions.json` only if its recorded support changes. Leave `semantics.json` unchanged. The record's documented support names single and multi select only, so it stayed as it was.
- [x] Run `npm run build:semantics`, `npm run build:skill` and `npm run check:generated`. Run `build:skill` again after the last edit to any hashed source.

Completion check: V7 passes, and the docs example uses the implemented API. Covers R9.

## 3. Size, regressions and merge readiness

Outcome: the change has a reviewed bundle cost and passes the checks the user chose.

Prerequisites: groups 1 and 2.

- [x] Measure JS and CSS gzip sizes against a build of the base, and record them in the budget lines of `tests/selective-builds.test.js`. Covers R9 with V8.
- [x] Run the V5 browser suite in Chromium, Firefox and WebKit, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one suite at a time. Covers V5 and V8.
- [x] Record results in `validation.md`, including any skipped engine or flaky rerun.
- [ ] Before merge, confirm PR CI, review conversations and branch freshness.

Completion check: V1 through V8 pass, and the merge conditions in `validation.md` hold. The roadmap completion state stays unchanged.
