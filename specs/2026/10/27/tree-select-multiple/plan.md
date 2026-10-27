# Tree-select multiple selection plan

Phase 76, 2026-10-27. Branch `feature/2026-10-27-tree-select-multiple`, base `9e5686eb6d512d6c7fe0d4382a2eef6830b43a47`.

Use feature-spec-auto, incremental-implementation, independent code-review-and-quality with fixes, separate code-simplification and babysit-pr. The main agent writes; scouts/reviewers are read-only. Begin implementation after specification review. Keep roadmap completion records for a separate post-merge docs PR.

## 1. Prove native multiple leaf ownership

Prerequisite: independent specification review passes.

- [x] Add failing multiple-tree structure, two-leaf FormData, empty/branch-only defaults and branch-normalization regressions in tests/tree-select.test.js. Cover duplicate-valued leaves, change counts, disabled leaves and branch nonpropagation.
- [x] Reuse shared native toggling in src/ts/components/treeSelect.ts, name multiple state on the actual tree and normalize branches before inherited trigger synchronization. Keep the implicit single-select fallback single-only. Add no checkbox or parallel selection model.
- [x] Build/typecheck and run focused tree/select/form/selection checks for R1-R3/R5/R7. Mutate the shared toggle to behave as single selection, require the two-leaf submission regression to fail, restore/rebuild/compare bundle hash and rerun. Commit the verified slice.

Completion V1-V2; all new functions stay below complexity five.

## 2. Integrate search and lifecycle

Prerequisite: group 1 passes.

- [x] Enable existing search for multiple trees; replace the obsolete multiple-search exclusion with positive tree regressions while retaining browser-default exclusion.
- [x] Cover hidden selections across queries, branch-baseline restoration, refresh/caret/focus/removed or changed branches, native/canceled reset, required/disabled recovery, own shadow roots and instance isolation. Fix only shared owning paths where evidence requires it.
- [x] Run focused Node checks and real pointer/keyboard multi-toggle/submission/search tests in tests/tree-select-multiple-browser.test.js, alongside tests/tree-select-browser.test.js, retaining flat-search regressions. Check all R4/R6/R7 behavior with teardown in finally; commit a verified slice.

Completion V1-V3. No new search option, popup implementation or mode-switching support.

## 3. Publish authoring contracts and verify rendering

Prerequisite: groups 1-2 pass.

- [x] Update semantics.json, its static tests, docs/src/pages/tree-select.astro, stale shared Select guidance, llm.md, CHANGELOG.md and the existing tree decision. Regenerate build:semantics/build:skill outputs; preserve unrelated rules and historical review pins.
- [x] Run guidance/static/selective/generated checks; review JS/CSS gzip. Check actual named tree state and distinct selected/focus paint in constrained enlarged/RTL/forced-colors/reduced-motion cases. Read Sass architecture before any justified style fix.
- [x] Inspect compact/expanded/large/large-dark tree/select comparisons and live multiple light/dark selection/focus states. Record intended docs differences and unavailable capabilities; commit the verified slice.

Completion V3-V5; delivers R5/R8 without claiming static or emulated evidence as physical accessibility approval.

## 4. Review, simplify and merge

Prerequisite: groups 1-3 pass.

- [x] Independently trace R1-R8 to source and evidence, fix confirmed findings and complete a separate code-simplification pass. Rerun affected checks after changes.
- [x] Run all contributor-equivalent, MCP and isolated-package checks sequentially, then independent final evidence review. Record exact commands, results, failures and limits.
- [ ] Push/open/link/watch the PR. Fix CI/review issues; verify exact head, all and required checks, conversations, current master and clean worktrees before merge. Record merge proof and remaining completion audit in the separate docs PR.

Completion V4-V6. No release or publication.
