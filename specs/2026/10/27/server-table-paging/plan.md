# Server-owned table paging plan

Phase 71, 2026-10-27. Branch `feature/2026-10-27-server-table-paging`, base `8ed6a0f4d5416ff62ae9ab84df1decbf988e3675`.

Use feature-spec-auto, incremental-implementation, code-review-and-quality with fixes, code-simplification, then babysit-pr. Verification is delegated. Do not start Phase 72 before this phase merges.

## 1. Accept server page state without reslicing records

Prerequisite: independent specification review passes.

- [x] Add `tests/data-tables-server-page.test.js` with initial page-two state, authoritative totals, record/detail visibility and silent replacement. Prove the new behavior fails first.
- [x] Extend the shared `src/ts/behaviors/dataTables.ts` state model and add the validated silent `setPage` API, server-owned synchronization and null reset. Keep public exports and existing initialization intact.
- [x] Cover numeric validation, immutable inputs, zero/shrinking totals, excess supplied rows, author hiding, selection and independent local compatibility. Build/typecheck and run focused Node regressions.

Delivers R1, R3 and R5. Completion check V1. Commit the verified increment.

## 2. Request pages and sizes before local defaults

Prerequisite: group 1 passes.

- [x] Route existing page/size controls through cancelable `expressive:page` with valid requested state. Preserve local defaults, retain accepted server state, and prevent stale reentrant defaults.
- [x] Handle native input and FormSelect composed change without a duplicate request from native noncomposed change. Cover canceled/deferred sizes, boundaries, disabled controls, explicit composed script events and nested wrappers.
- [x] Test synchronous and asynchronous application responses, newer nested requests and authoritative setter calls inside dispatch. Reject a newly added condition mutation, restore source and rerun affected checks.

Delivers R2-R5. Completion checks V1-V2. Commit the verified increment.

## 3. Verify browser input and authoring guidance

Prerequisite: groups 1 and 2 pass.

- [x] Add `tests/data-tables-server-page-browser.test.js` for actual page-button pointer/keyboard input, native size changes, shadow roots and FormSelect. Assert no local slicing, state/control updates, selection/count preservation and ordinary link navigation; teardown in finally.
- [x] Add the server paging section through the existing catalogue in `docs/src/pages/data-table.astro`; update the API/event reference in `llm.md` and `CHANGELOG.md`. Reuse existing semantics without component initialization and verify the new public declaration in the existing isolated consumer path.
- [x] Regenerate semantics/skill/MCP guidance, run relevant docs/static checks, measure JS/CSS gzip deltas and update reviewed budgets in `tests/selective-builds.test.js`.

Delivers R1-R6. Completion checks V2-V3. Commit the verified increment.

## 4. Review, simplify and merge

Prerequisite: groups 1-3 pass.

- [x] Run contributor-equivalent checks sequentially, including the full suite, generated data, docs/site verification, MCP smoke and isolated packages. Record failures and unavailable checks accurately.
- [x] Compare the data-table docs against the merged base in compact, expanded, large and large-dark layouts; inspect changed captures and distinguish expected differences from a no-difference pass.
- [ ] Obtain independent final review mapping R1-R6 to source and evidence. Fix findings, perform a separate simplification pass, then open and monitor the PR. Merge only after required CI, conversations, clean worktree and current-master gates pass.

Delivers R6. Completion checks V4-V6. Preserve the separate post-merge roadmap/evidence documentation step.

Local implementation, contributor verification, visual inspection, independent final review and separate simplification are complete. The remaining combined task is PR monitoring and green merge. Completion labels and merge evidence remain for the separate post-merge documentation PR.
