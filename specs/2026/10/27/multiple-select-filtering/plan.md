# Multiple-select filtering: plan

- Date: 2026-10-27
- Roadmap phase: Phase 64, filter multiple-select options
- Branch: `feature/2026-10-27-multiple-select-filtering`
- Base: `origin/master` at `165ce2c04e03d738503898ca7eb5a34f565d668f`
- Status: specified; no task started

Deliver [requirements.md](requirements.md) within the [mission](../../../../mission.md#product-rules), the [tech stack](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 64](../../../../roadmap.md#phase-64-filter-multiple-select-options). Check IDs refer to [validation.md](validation.md). The user confirmed these three groups on 2026-10-27.

## 1. Searchable multiple-select behavior with tests

Outcome: an opted-in multiple select filters through the popup search field, and the form submits every chosen value, including values the current query hides.

Prerequisites: the base commit. Read `src/ts/README.md` and `src/sass/README.md`, and the Phase 63 spec in `specs/2026/10/26/single-select-filtering/`.

- [ ] In `src/ts/components/select.ts`, let `_canSearch()` accept multiple selects while still excluding TreeSelect. In `_buildSearch()`, put `aria-multiselectable` and `multiple-select-menu` on the inner listbox instead of dropping them. Covers R1 and R5 with V1 and V3.
- [ ] Check that a pick keeps the popup open, the query unchanged and focus on the row, and that checkbox clicks, row clicks, Enter and Space each toggle once. Fix only what the search path breaks. Covers R3 and R4 with V2 and V4.
- [ ] Confirm reset, refresh, disable, validation and teardown with hidden selected options. Covers R6 and R7 with V4 and V5.
- [ ] Replace the `tests/select-search.test.js` case that expects multiple selects to ignore `searchable`. Add multiple-select cases to `tests/select-search.test.js` and `tests/select-search-browser.test.js`, including the roadmap regression. Run single search, plain multiple, TreeSelect, Menu and Autocomplete tests. Covers R8 with V6.
- [ ] Add select-scoped rules in `src/sass/components/forms/_select.scss` only if checkbox rows look or focus wrong inside the search popup. Covers R8 with V3.

Completion check: V1 through V6 pass. The V2 regression fails on the base and passes on the branch. Components, timers and browsers close in `finally` blocks.

## 2. Docs and generated guidance

Outcome: people and agents read the same contract for multiple-select search.

Prerequisites: group 1 has fixed the behavior and roles.

- [ ] Add a live multiple-select search example to `docs/src/pages/select.astro`, update the options table, and change the text that limits search to single selects.
- [ ] Update the Select section of `llm.md` and the Phase 63 changelog entry under `[Unreleased]`. Update the `select` record in `docs/src/data/component-decisions.json` only if its recorded support changes.
- [ ] Review `semantics.json` and leave it unchanged unless an author-markup rule changes.
- [ ] Run `npm run build:semantics`, `npm run build:skill` and `npm run check:generated`. Run `build:skill` again after the last edit to any hashed source.

Completion check: V7 passes, and the docs example uses the implemented API.

## 3. Size, regressions and merge readiness

Outcome: the change has a reviewed bundle cost and passes the checks the user chose.

Prerequisites: groups 1 and 2.

- [ ] Measure JS and CSS gzip sizes against the base with the same build, and record them in the budget lines of `tests/selective-builds.test.js`.
- [ ] Run the V4 browser suite in Chromium, Firefox and WebKit, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one suite at a time.
- [ ] Record results in `validation.md`, including any skipped engine or flaky rerun.
- [ ] Before merge, confirm PR CI, review conversations and branch freshness.

Completion check: V1 through V8 pass, and the merge conditions in `validation.md` hold. The roadmap completion state stays unchanged.
