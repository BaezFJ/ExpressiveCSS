# Server-owned table filtering plan

Phase 68, 2026-10-27. Branch `feature/2026-10-27-server-table-filtering`, base `b2bff6ec0649a69f7cee3427edc1ef379fa8853b`.

The user delegated decisions and validation. Use incremental-implementation for each group, then code-review-and-quality, fixes, code-simplification and babysit-pr. Do not start Phase 69 until this phase merges.

## 1. Implement cancelable filtering and silent server synchronization

Prerequisite: specification review passes.

- [x] Extend `tests/data-tables-filter.test.js` with request flags/detail, default local behavior, cancellation and synchronous replacement plus sync.
- [x] Extend the shared behavior in `src/ts/behaviors/dataTables.ts`, using `Utils.emit` and private per-wrapper ownership. Preserve silent sync and existing record/detail visibility logic.
- [x] Cover asynchronous replacement, app count ownership, previous filter state, author hiding, enabled visible selection, independent wrappers and returning to local filtering. Prove a new condition's mutation fails the regression.

Delivers R1-R5. Completion check V1; commit the tested increment.

## 2. Verify browser behavior and document the contract

Prerequisite: group 1 passes.

- [ ] Extend the existing filtering browser fixture for real input, application replacement, focus, server counts, visible record groups and open shadow-root requests in Chromium, Firefox and WebKit.
- [ ] Update `llm.md` event and filtering sections, `docs/src/pages/data-table.astro` and `CHANGELOG.md`. Explain synchronous cancellation, app-owned operations and silent synchronization.
- [ ] Regenerate guidance through `npm run build:skill`, and check generated data. Existing static markup rules stay unchanged.

Delivers R1, R3-R6. Completion checks V2 and V3; commit the tested increment.

## 3. Review, simplify and prepare a green merge

Prerequisite: groups 1 and 2 pass.

- [ ] Measure bundle gzip sizes and update the reviewed JavaScript budget in `tests/selective-builds.test.js`.
- [ ] Run required contributor, browser, MCP and package checks. Record actual results and limitations in validation.
- [ ] Obtain independent final review, fix confirmed findings and perform the separate simplification pass. Open and monitor the PR, fix issues and merge only with passing required CI, resolved conversations and current master.

Delivers R6. Completion checks V4-V6. Package publication is excluded. Record the merged phase in the separate post-merge roadmap documentation work.
