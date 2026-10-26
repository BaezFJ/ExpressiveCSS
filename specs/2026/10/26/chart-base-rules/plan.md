# Share chart base rules across chart types plan

Date: 2026-10-26
Roadmap phase: [Phase 58, share chart base rules across chart types](../../../../roadmap.md#phase-58-share-chart-base-rules-across-chart-types)
Branch: `fix/chart-base-rules`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: completed as a measurement-only result; final contributor verification pending

Read [requirements.md](requirements.md) and [validation.md](validation.md) before implementation. No prerequisite phase blocks this work. The user confirmed these three groups on 2026-10-26. The size experiment ran before expanding browser fixtures, following the incremental-implementation skill's risk-first strategy. The 855-byte saving selected the documented fallback. Unchecked candidate-only tasks below are inapplicable, not unfinished implementation.

## 1. Establish the baseline and regression checks

Outcome: reproducible baseline sizes and checks for the chart contracts this refactor could break.

Prerequisites: the confirmed base, Node 24, locked dependencies and access to all three browser engines. Covers R1, R2, R3 and R4 through V1, V2, V3 and V4.

- [x] Build the unmodified base with `npm run build`. Record the actual full minified CSS gzip size using `sizes()` from `tests/fixtures/selective-builds.mjs`, the source revision, Node version and lockfile identity in `validation.md`. Preserve the base stylesheet for browser comparisons outside tracked source.
- [x] Trace all twelve `chart()` calls and their overrides. Separate identical declarations from rules that read chart-specific variables. Record the selector specificity and cascade behavior that must stay unchanged, including the existing toggle rules and public `chart($name)` behavior.
- [ ] Extend `tests/selective-builds.test.js` with single-chart compile cases for all twelve partials, a no-chart case, reversed representative selection orders and an existing custom-name mixin call. Check shared-rule coverage and selector structure without pinning insignificant formatting.
- [ ] Extend `tests/fixtures/selective-builds.mjs` and `tests/selective-builds-browser.test.js` with chart consumers and focused interactions. Adapt the current tabs/forms-specific assertions so each fixture tests its own contract. Reuse markup and cleanup patterns from the existing chart tests.

Completion check: V1 has a measured baseline, and V2 to V4 define observable assertions. Compatibility checks pass on the base where applicable; the shared-emission assertion distinguishes repeated base rules from the candidate. Record any unavailable setup as blocked, not passed.

## 2. Share the base rules and measure the saving

Outcome: one shared implementation that meets the measured size requirement, or a recorded decision to retain the existing CSS.

Prerequisite: group 1. Delivers R1, R2, R3 and R4 through V1, V2, V3, V4 and V8.

- [x] Introduce the smallest private mixin and write-once guard in `src/sass/abstracts/_mixins.scss`, reusing the `_chart-toggle` pattern. Group chart-class selectors with single-class `:is()` arguments. Include radial in the twelve built-in chart types.
- [ ] Keep chart-specific declarations and effective overrides in their current roles. Preserve public mixin calls, component isolation and emission order. Adjust caller partials or private export handling only where the inspected implementation requires it.
- [x] Rebuild and run the selector and selective compile checks. Compare base and candidate full minified CSS gzip bytes with the same toolchain and compression settings. Record the candidate revision or diff identity and delta in `validation.md`.
- [x] Apply the 1,024-byte decision. If it passes, proceed with the retained candidate. If it fails, restore only this attempt's production Sass edits, verify that production CSS matches the baseline, and record the measurement and reason in this spec and `docs/development-notes.md`. Remove candidate-only assertions that require an abandoned implementation.

Completion check: either the saving is at least 1,024 bytes and V1 to V3 pass, or V8 confirms a documented result with no production CSS change. The latter outcome ends the refactor; do not broaden scope to manufacture a saving.

## 3. Verify compatibility and prepare the change for review

Outcome: documented acceptance evidence for the retained refactor, or a reviewable measurement-only result.

Prerequisite: group 2's size decision. Delivers R2, R3, R4 and R5 through V4, V5, V6, V7 and V8.

- [ ] For a retained candidate, compare full versus selective chart builds in Chromium, Firefox and WebKit. Compare against the preserved base CSS as well, since full/selective equality alone can hide a shared regression. Cover the states and environments in V4; fix only regressions introduced by this work.
- [ ] Run the existing chart suites and selective-build checks sequentially. Record failures, focused reruns and skips. Complete V5 and resolve any browser behavior failures.
- [ ] Update the CSS gzip budget and Unreleased CHANGELOG for a retained candidate. Update affected documentation and regenerate through `npm run build:semantics` and `npm run build:skill` when their inputs change. Review any capability provenance affected by the shared Sass file under the established source-review procedure.
- [ ] Run contributor verification, browser checks, MCP tests and package verification as specified in V6. Complete the visual comparison and obtain BaezFJ's review in V7 before merge. For a measurement-only result, complete V8 and applicable repository checks without claiming a shipped optimization.
- [ ] Fill in validation evidence and the final size decision. Confirm that the diff contains only this phase's work and that required CI, reviews and branch freshness satisfy the merge conditions. Leave roadmap completion unchanged in this specification task.

Completion check: every applicable validation result is recorded and passes; any unmet condition blocks merge. Specification alone does not complete any task above or authorize implementation, commits, publication or a pull request.

## Execution record

1. Group 1 completed the baseline build and existing selective-build suite. An isolated assertion-based probe compiled all twelve standalone chart selections, a custom chart name, empty selection, inert abstracts and default/full equality. The baseline artifact was preserved. Permanent fixture expansion stopped at the size decision.
2. Group 2 evaluated the private write-once candidate under the same locked toolchain. It compiled and passed the probe, but saved only 855 gzip bytes. The candidate Sass was restored. Its patch, source and measurement artifacts remain ignored under `.cache/chart-base-rules/`.
3. Group 3 verified a byte-for-byte match between restored production CSS and the baseline, and records the result here and in development notes. Full contributor verification is pending. Candidate browser parity, visual review, generated-data changes, CHANGELOG changes and a lower budget are inapplicable because no production code changes remain.

The original specification is committed as `cbc17bffc`. The experiment itself will not be committed. Roadmap completion remains unchanged.
