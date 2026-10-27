# Drop-zone count limit plan

Phase 74, 2026-10-27. Branch `feature/2026-10-27-drop-zone-count-limit`, base `c427ab5311373e09b90d6c44a7595f22b72f5ed6`.

Use feature-spec-auto, incremental-implementation, code-review-and-quality with fixes, code-simplification and babysit-pr. Verification is delegated. Begin Phase 75 only after this phase merges.

## 1. Enforce count limits through shared file validation

Prerequisite: independent specification review passes.

- [x] Add failing count-only boundary/parser/whole-selection tests in tests/drop-zone-validation.test.js, including duplicate names, no list, author-owned multiple, localized/fallback text, type > size > count and application validity.
- [x] Extend FileFailure/FILE_RULES in src/ts/behaviors/forms.ts. Reuse the decimal parser with an attribute parameter; add count failure and a small named precedence helper while retaining shared validity ownership, feedback, reset and silent public validation.
- [x] Build/typecheck, run focused Forms/drop-zone checks for R1-R3/R5 and commit the verified slice. Keep new functions below complexity five.

Completion check V1. No separate component, listener or error map.

## 2. Preserve count delivery, snapshots and recovery

Prerequisite: group 1 passes.

- [x] Add failing changed-count/native-pair/event-array-mutation/reentry checks; include the effective count limit in the existing selection snapshot and preserve independent event arrays with all chosen files rejected for count.
- [x] Extend count opt-out/required/disabled/reset/cancellation/external-form/newer-selection/isolation cases. Read Sass architecture before extending shared error selectors; retain existing tokens and focus.
- [x] Mutate count > limit to >=, require the exact-limit regression to fail, restore/rebuild/rerun focused checks and commit the verified slice.

Delivers R2-R5. Completion checks V1-V2.

## 3. Verify native interactions and authoring guidance

Prerequisite: groups 1-2 pass.

- [x] Extend tests/drop-zone-validation-browser.test.js with actual count browse/chooser/native submit prevention/exact-count recovery in all three engines. Add count to shadow/external-reset and trusted Chromium protocol-drop scenarios, retaining finally cleanup.
- [x] Update docs/src/pages/drop-zone.astro, llm.md and CHANGELOG.md. Extend the existing static feedback selector and tests/semantics.test.js without changing its id or initializing components, then regenerate semantics/skill/MCP guidance.
- [x] Run affected browser/static/docs/decision/skill/selective checks, record actual bundle deltas and commit the verified slice.

Delivers R1-R6. Completion checks V2-V3.

## 4. Review, simplify and merge

Prerequisite: groups 1-3 pass.

- [x] Run contributor-equivalent checks sequentially against built bundles, including the full suite, generated data, Astro/site, MCP and both isolated packages; record failures/skips accurately.
- [x] Compare all four drop-zone docs layouts against the merged base and inspect count-error light/dark captures with readable real text, retained files and keyboard focus.
- [ ] Obtain independent R1-R6 source/evidence review, fix findings, perform a separate simplification pass, open/watch the PR and merge only after exact-head CI/conversation/current-master/clean-worktree gates pass.

Delivers R6. Completion checks V4-V6. Preserve separate post-merge roadmap/evidence documentation.

CI repair: preserve an already focused search result when opening completes. The timed modal/shadow regression, source guard, changelog, size budget and generated fingerprints pass focused checks; final contributor revalidation and independent review are pending.
