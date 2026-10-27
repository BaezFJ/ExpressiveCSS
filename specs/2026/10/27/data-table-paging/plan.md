# Data table paging plan

Phase 69, 2026-10-27. Branch `feature/2026-10-27-data-table-paging`, base `963198f89c37d2a5312c9a353d91dc94973b937f`.

Use feature-spec-auto and incremental-implementation, then code-review-and-quality, fixes, code-simplification and babysit-pr. The user delegated decisions and verification. Do not start Phase 70 before this phase merges.

## 1. Page record groups through the shared behavior

Prerequisite: independent specification review passes.

- [x] Add `tests/data-tables-page.test.js` with fixed-size paging, pipeline order, group visibility, retained selections, counts and silent sync. Prove new regressions fail before implementation.
- [x] Extend `src/ts/behaviors/dataTables.ts` with private page state, authored button handling, paging before selection sync and page reset after accepted local filter/sort. Clear page markers before filtering.
- [x] Extend the existing hiding rule in `src/sass/components/_data-table.scss` for page-owned row state. Test invalid/removed sizes, boundary controls, nested requests, independent wrappers, server-filter counts and record changes. Reject a condition mutation and restore it.

Delivers R1-R5. Completion check V1. Build and test the increment, then commit.

## 2. Verify native browser behavior and authoring guidance

Prerequisite: group 1 passes.

- [x] Add `tests/data-tables-page-browser.test.js` with real pointer and keyboard activation, focus, rendered detail visibility, filtering/sorting/selection and open shadow roots in all three engines. Verify ordinary pagination links still navigate.
- [x] Add source rules in `semantics.json` and static regressions in `tests/semantics.test.js`. Update `llm.md`, `docs/src/pages/data-table.astro` through its existing section catalogue, and `CHANGELOG.md`.
- [x] Run `npm run build:semantics` and `npm run build:skill`. Check generated guidance and browser results. The final visual comparison is in group 3.

Delivers R1-R6. Completion checks V2-V3. Commit the verified increment.

## 3. Review, simplify and merge

Prerequisite: groups 1 and 2 pass.

- [x] Measure JS/CSS gzip deltas and update reviewed budgets in `tests/selective-builds.test.js`.
- [x] Run contributor-equivalent checks sequentially, including full browser coverage, generated data, docs build/verification, MCP smoke and isolated packages. Record limitations and every failed check or rerun.
- [ ] Obtain independent final review against R1-R6, fix confirmed findings and run a separate simplification pass. Open and monitor the PR; fix issues and merge only when required CI passes, review conversations are resolved and the branch includes current master.

Delivers R6. Completion checks V4-V6. Publication is excluded. Preserve the separate post-merge roadmap documentation step.
