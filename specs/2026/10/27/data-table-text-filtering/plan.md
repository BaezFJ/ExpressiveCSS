# Data table text filtering plan

Phase 67, 2026-10-27. Branch `feature/2026-10-27-data-table-text-filtering`, base `db981aa4f83d0d2ee63e5877c1238cc698b2045e`.

The user delegated requirements and verification through feature-spec-auto. Implement these groups sequentially using incremental-implementation, then review, fix findings, simplify, open the PR and merge only after required checks and conversations pass.

## 1. Filter records and synchronize selection

Prerequisite: specification review passes.

- [x] Add focused regression coverage in `tests/data-tables-filter.test.js`.
- [x] Extend `src/ts/behaviors/dataTables.ts` through its existing delegated input and sync paths. Reuse header indexing and record/detail grouping, and keep framework-owned row hiding separate from author hiding.
- [x] Verify filtering, explicit columns, record groups, clearing, hidden/disabled rows, retained selections, replacement records, nested tables and opt-in behavior.

Delivers R1 through R4. Completion check V1, then commit the tested increment.

## 2. Prove browser and authoring contracts

Prerequisite: group 1 passes.

- [x] Add count output and its tests; verify native search focus and visible records/details in Chromium, Firefox and WebKit.
- [x] Update `docs/src/pages/data-table.astro`, `llm.md`, `CHANGELOG.md` and `semantics.json` with the verified markup, selection scope and result announcement contract.
- [x] Regenerate semantics and skill/MCP guidance through the owned generators.

Delivers R5 and the guidance portion of R6. Completion checks V2 and V3, then commit the tested increment.

## 3. Validate and prepare merge

Prerequisite: groups 1 and 2 pass.

- [x] Record measured gzip delta in `tests/selective-builds.test.js`.
- [x] Run the required checks, review the diff independently and fix confirmed issues. Perform the separate code-simplification pass without unrelated refactors.
- [ ] Record actual results in `validation.md`, open a focused PR, monitor required CI and reviews, fix issues, and merge only when green and current with master.

Delivers R6. Completion checks V4 through V6. Do not publish a package.
