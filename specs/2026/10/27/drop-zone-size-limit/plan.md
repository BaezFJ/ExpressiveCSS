# Drop-zone size limit plan

Phase 73, 2026-10-27. Branch `feature/2026-10-27-drop-zone-size-limit`, base `caae9ab049576b73df0e2874d3e1751c067130da`.

Use feature-spec-auto, incremental-implementation, code-review-and-quality with fixes, code-simplification and babysit-pr. Validation is delegated. Begin Phase 74 only after this phase merges.

## 1. Enforce per-file byte limits through shared validation

Prerequisite: independent specification review passes.

- [x] Add failing size-only byte-boundary/malformed-limit/whole-selection checks in tests/drop-zone-validation.test.js, including application validity and combined type-first precedence.
- [x] Generalize only the shared Forms eligibility/failure result in src/ts/behaviors/forms.ts. Reuse the existing ownership map, native validity, feedback, reset and public silent validation paths; add strict positive decimal byte parsing and localized size messages.
- [x] Build/typecheck, run focused Forms/drop-zone checks for R1-R3/R5 and commit the verified slice. Keep new helpers within the complexity gate.

Completion check V1. No separate component, listener or error map.

## 2. Report and recover size failures consistently

Prerequisite: group 1 passes.

- [x] Extend rejection snapshots/reason and deduplication for effective type/size constraints, with failing native-pair, changed-limit, event-mutation and reentrant-selection checks.
- [x] Extend size-only accessibility/reset/disabled/external-form/shadow/isolation cases. Read Sass architecture before extending existing error selectors for the new opt-in.
- [x] Mutate the size comparison from > to >=, require the exact-limit regression to fail, restore and rerun built-bundle checks. Commit the verified slice.

Delivers R2-R5. Completion checks V1-V2.

## 3. Verify native interactions and authoring guidance

Prerequisite: groups 1-2 pass.

- [ ] Extend tests/drop-zone-validation-browser.test.js with actual browse triggers/chooser byte boundaries/native submit prevention in all three engines and native Chromium protocol size-drop delivery with real temporary files. Cover shared shadow/reset/event recovery; cleanup in finally.
- [ ] Update docs/src/pages/drop-zone.astro, llm.md and CHANGELOG.md; extend the existing semantics rule/static fixtures for size-only feedback, preserving its id. Regenerate semantics/skill/MCP guidance.
- [ ] Run affected browser/static/docs/decision/skill/selective checks, record measured JS/CSS deltas and commit the verified slice.

Delivers R1-R6. Completion checks V2-V3.

## 4. Review, simplify and merge

Prerequisite: groups 1-3 pass.

- [ ] Run contributor-equivalent checks sequentially, including full built-bundle tests, generated data, docs/site, MCP and both isolated package consumers. Record failures/skips accurately.
- [ ] Compare all four drop-zone docs layouts against the merged base and inspect actual invalid-size feedback in light/dark, preserving readable status and focus.
- [ ] Obtain independent R1-R6 source/evidence review, fix findings, complete a separate simplification pass, open/watch the PR, and merge after all exact-head CI/conversation/current-master/clean-worktree gates pass.

Delivers R6. Completion checks V4-V6. Preserve separate post-merge roadmap/evidence documentation.
