# Tree-select filtering plan

Phase 75, 2026-10-27. Branch `feature/2026-10-27-tree-select-filtering`, base `37246fefc2e781f11cac784ee37b9d68776e0180` from origin/master.

Use feature-spec-auto, incremental-implementation, code-review-and-quality with fixes, code-simplification and babysit-pr. Agent verification is delegated. Begin Phase 76 only after this phase merges.

## 1. Reuse search controls with tree semantics

Prerequisite: independent specification review passes.

- [x] Add failing opt-in/default/AutoInit/accessible-structure/teardown checks, replacing the obsolete TreeSelect-ignores-search expectation in tests/select-search.test.js.
- [x] Add narrow FormSelect hooks in src/ts/components/select.ts for actual result-list/filter/navigation consumers. Reuse its search control, names, localization, lifecycle and focus guard. Let TreeSelect provide its existing tree, single-select opt-in and tree-aware navigation; preserve default/flat behavior.
- [x] Build/typecheck and run focused tree/select/form/selection checks for R1/R4-R7; commit a verified slice. Keep new functions below complexity five.

Completion checks V1-V2; no new component, option or Menu implementation.

## 2. Filter hierarchy and restore expansion

Prerequisite: group 1 passes.

- [x] Add failing leaf/ancestor/matching/hidden-navigation/native-value and exact expansion-baseline tests in tests/tree-select.test.js, including multiple queries, temporary toggles and refresh.
- [x] Implement leaf/path filtering and one pre-query expansion snapshot in treeSelect.ts. Fix own-hidden navigation/child entry/sibling opening/activation and search-click handling in shared tree paths; preserve disabled and default behavior.
- [x] Complete refresh/reset/cancellation/focus fallback/isolation regressions. Mutate restoration to leave filter-expanded branches open, require its regression to fail, restore/build/rerun and commit.

Delivers R2-R4/R6-R7. Completion checks V1-V2.

## 3. Verify interaction and authoring guidance

Prerequisite: groups 1-2 pass.

- [x] Read Sass architecture before extending existing search/tree result scrolling and hidden selectors in src/sass/components/forms/_select.scss. Add real-keyboard, pointer, submission, RTL, composition, modal/shadow, reset/refresh/autoFocus and constrained enlarged/forced-colors tests in tests/tree-select-browser.test.js; retain all flat-search regressions.
- [x] Update docs/src/pages/tree-select.astro, docs/src/pages/select.astro, llm.md, CHANGELOG.md and the existing tree decision record in docs/src/data/component-decisions.json where supported. Preserve author semantics; regenerate semantics/skill/MCP guidance from source.
- [x] Run affected browser/guidance/static/selective/generated checks, measure reviewed JS/CSS budgets and commit the verified slice.

Delivers R1-R8. Completion checks V2-V3.

## 4. Review, simplify and merge

Prerequisite: groups 1-3 pass.

- [x] Complete independent source/evidence review against R1-R8, fix confirmed findings and run a separate code-simplification pass. Rerun affected checks after any change.
- [x] Run full contributor-equivalent build/typecheck/tests/generated/Astro/site checks, MCP and isolated packages sequentially. Inspect tree-select/select compact/expanded/large/large-dark comparisons and live search light/dark/forced-color focus evidence; state limits honestly.
- [x] Open/push/link/watch the PR, fix CI/review issues, verify exact head/all-required checks/conversations/current master/clean worktree and merge. Record actual merge proof in the separate completion documentation PR.

Completion checks V4-V6. No package publication.

## Post-merge completion record

[PR #464](https://github.com/BaezFJ/ExpressiveCSS/pull/464) merged on 2026-10-27T18:45:03Z as `9e5686eb6d512d6c7fe0d4382a2eef6830b43a47`. The exact final head `e84189bfbc0e74991ca1bfa92cf2933bf1368f1e` has all 17 checks successful and no unresolved review threads, with hasNextPage false. The final delivery task is complete. See the [current-source requirement audit](../roadmap-completion/audit.md) and [primary merge evidence](../roadmap-completion/merge-evidence.json).
