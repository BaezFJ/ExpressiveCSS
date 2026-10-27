# Data table page size plan

Phase 70, 2026-10-27. Branch `feature/2026-10-27-data-table-page-size`, base `dd7649d024c10d00614ce115db4bbe8fcb4d2b4c`.

Use feature-spec-auto, then incremental-implementation, code-review-and-quality and fixes, code-simplification, and babysit-pr. Verification is delegated. Do not begin Phase 71 before this phase merges.

## 1. Apply authored sizes through shared paging

Prerequisite: independent specification review passes.

- [x] Extend `tests/data-tables-page.test.js` with the last-page completion check and native input/change delivery. Prove new regressions fail before implementation.
- [x] Extend `src/ts/behaviors/dataTables.ts` with the marked select's shared event handling, safe-integer validation and duplicate-event guard. Reuse existing page clamping; preserve `_pages` and server-filter ownership.
- [x] Cover invalid/disabled controls, unavailable options, wrapper isolation, empty/filter/sort/detail/selection behavior and silent script ownership. Reject a clamp mutation, restore it and rerun affected checks.

Delivers R1-R5. Completion check V1. Build/typecheck and run focused Node regressions, then commit the verified increment.

## 2. Verify real controls and authoring guidance

Prerequisite: group 1 passes.

- [ ] Extend `tests/data-tables-page-browser.test.js` for native pointer/keyboard operation, focus, last-page clamping, a real native select in an open shadow root, and existing FormSelect's composed event path in all three engines. Preserve ordinary links and teardown in finally.
- [ ] Add source rules in `semantics.json` and static regressions in `tests/semantics.test.js`. Update the existing Local paging section of `docs/src/pages/data-table.astro`, `llm.md` and `CHANGELOG.md`.
- [ ] Run `npm run build:semantics` and `npm run build:skill`, check guidance and browser coverage, measure JS/CSS gzip sizes and update the reviewed budgets in `tests/selective-builds.test.js`.

Delivers R1-R6. Completion checks V2-V3. Commit the verified increment.

## 3. Review, simplify and merge

Prerequisite: groups 1 and 2 pass.

- [ ] Run the contributor-equivalent checks sequentially, including the full suite, generated data, docs build/verification, MCP smoke and isolated packages. Record failures and unavailable checks.
- [ ] Run the data-table visual comparison against the merged Phase 69 base and inspect every changed viewport; distinguish intended changes from a no-difference pass.
- [ ] Obtain independent final review mapping R1-R6 to source and validation evidence. Fix findings, apply a separate simplification pass, then open and monitor the PR. Merge only after required CI passes, conversations are resolved and the branch includes current master.

Delivers R6. Completion checks V4-V6. Preserve the separate post-merge roadmap/evidence documentation step; package publication is excluded.
