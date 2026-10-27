# Single-select filtering: plan

- Date: 2026-10-26
- Roadmap phase: Phase 63, filter single-select options
- Branch: `feature/2026-10-26-single-select-filtering`
- Base: `origin/master` at `6f74b3701af2347656aec1bae69af77396897609`
- Status: local implementation and verification complete on 2026-10-27; human review and PR gates pending

Deliver [requirements.md](requirements.md) using the [mission](../../../../mission.md#product-rules), [tech stack](../../../../tech-stack.md#framework-constraints) and [Phase 63](../../../../roadmap.md#phase-63-filter-single-select-options). Check IDs refer to [validation.md](validation.md). The user confirmed these three ordered task groups and subsequently invoked incremental implementation. Checked tasks record implementation progress; merge readiness still depends on validation.

## 1. Implement searchable single-select behavior with focused tests

Outcome: an opted-in grouped select filters through a separate popup search field and submits the chosen native option value.

Prerequisites: the confirmed base and requirements; no roadmap dependency. Read `src/ts/README.md`, `src/sass/README.md` and `SECURITY.md` before implementation. Use the existing test setup and browser leasing patterns.

- [x] Extend `src/ts/components/select.ts` with the opt-in option, i18n strings, separate search and listbox, literal matching, disabled/group handling and native selection behavior. Preserve default, multiple and TreeSelect paths. Cover R1 through R4 with V1 through V3.
- [x] Implement the R5 keyboard and focus contract. Keep text editing separate from Menu navigation and nonmatches out of focus lookup. Reuse Menu placement and dismissal; inspect all callers before any necessary edit to `src/ts/components/menu.ts`. Cover R5 and R7 with V4 and V7.
- [x] Complete reset, refresh, validation, disable, callback and cleanup behavior in the shared FormSelect implementation. Add focused Node coverage in a new `tests/select-search.test.js` and real-input coverage in `tests/select-search-browser.test.js`, using existing fixtures where useful. Cover R6 with V5 and R7 with V7.
- [x] Reuse existing styles and add only needed select-scoped rules in `src/sass/components/forms/_select.scss`. Cover scrolling, names, RTL, translated strings and text scaling. Add focused injection and accessibility assertions. Cover R4 and R8 with V3, V6 and V8.

Completion check: V1 through V6 pass for the new behavior and V7 passes for affected shared paths. The grouped-filter-and-submit regression fails against the base and passes with the change. All browsers, components and timers close in `finally`. Both new test files exist and follow the existing Node and browser-runner naming conventions.

## 2. Document the contract and regenerate guidance

Outcome: people and agents receive the same searchable-select contract and its exclusions.

Prerequisites: group 1 fixes the implemented API, roles and keys. Delivers R9 and documents R1 through R8. Validated by V9.

- [x] Add the live grouped single-select search example, options, keyboard/focus rules, native-value behavior and exclusions to `docs/src/pages/select.astro`. Document script initialization and `data-form-select-options`.
- [x] Update the Select section of `llm.md`, the Unreleased changelog, and the existing `select` record in `docs/src/data/component-decisions.json` where its support or recorded evidence changes. Do not add another inventory or claim manual checks ran.
- [x] Review `semantics.json` for any required author-markup change and extend its static tests only if necessary. Keep search roles runtime-owned; static checks must not initialize components.
- [x] Run `npm run build:semantics` and `npm run build:skill`, then `npm run check:generated`. Update source-review pins or browser evidence only through their established workflow and only for work actually reviewed or executed.

Completion check: V9 passes, the docs example uses the implemented API and the correct popup roles, and generated guides agree with source. Docs builds and static checks remain separate from browser approval.

## 3. Verify compatibility, size and merge readiness

Outcome: the feature has measured bundle cost, passing regressions and reviewable acceptance evidence.

Prerequisites: groups 1 and 2. Delivers final verification of R1 through R9 through V7 through V10 and the complete requirement matrix.

- [x] Measure minified JS and CSS gzip sizes against the confirmed base with equivalent builds. Record and review the deltas in `tests/selective-builds.test.js`.
- [x] Run focused search, default/multiple select, TreeSelect and affected Menu/Autocomplete regressions. Verify keyboard, popup placement and shadow roots in Chromium, Firefox and WebKit.
- [x] Run contributor verification, the explicit browser suite, MCP smoke tests, isolated package consumers and the visual comparison. Record the Firefox WebGL2 skips and the intended Select-page image differences.
- [x] Reconcile R/V coverage and record evidence, including the legacy constructor type regression and byte-identical runtime assets after its fix. Commit the completed local work without publishing.
- [ ] Before merge, obtain BaezFJ's visual approval, perform the remaining required manual review, and verify PR CI, conversations and branch freshness. No PR is opened by this task.

Completion check: V1 through V10 pass where required, all in-scope requirements have evidence, bundle changes have review, and the merge conditions in `validation.md` hold. Local evidence is recorded in `validation.md`. Human review and PR checks remain future merge gates; the roadmap completion state stays unchanged.
