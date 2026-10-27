# Data table text filtering validation

Phase 67, 2026-10-27. Branch `feature/2026-10-27-data-table-text-filtering`, base `db981aa4f83d0d2ee63e5877c1238cc698b2045e`.

The agent owns executable checks. Test results below remain pending until run. Specification review and implementation acceptance are separate.

| Check | Requirements | Action and expected result | Result |
| --- | --- | --- | --- |
| V1 | R1-R4 | Build JS, then run `node --test tests/data-tables-filter.test.js tests/data-tables.test.js`. Assert explicit/grouped columns, case/whitespace, data-value, multi-body detail groups, clear/no match, author-hidden rows, disabled fieldsets, view-scoped select-all, retained selections, sorting, replacement records, nested tables and unmarked controls. Mutate a new condition and prove the regression fails, then restore. | Passed. 23 focused Node tests, including 11 new cases. Nine of the initial ten tests failed on the base. Inverting the empty-query condition failed the new regressions; source was restored and all 23 passed. |
| V2 | R1-R5 | Build CSS/JS and run the filtering browser tests with Chromium, Firefox and WebKit. Assert keyboard input, focus retention, rendered record/detail visibility, count status, selection and shadow roots. Close browser contexts in finally. | Passed. All 57 focused table browser checks passed, including six new filtering cases across Chromium, Firefox and WebKit, with no skips. |
| V3 | R5-R6 | Run `npm run build:semantics`, `npm run build:skill`, `npm run check:generated`, and semantics tests. Check documented examples use named inputs and authored polite status output. | Passed. Generation and generated checks passed. Static semantics passed in the full run, including native-label regressions, authored examples and rendered documentation. |
| V4 | R6 | Measure minified JS gzip using the size test's normalization and run `node --test tests/selective-builds.test.js`. Record actual delta and retain CSS budget unless CSS changes. | Passed. JS 106,962 gzip bytes, +382 over base. CSS 90,789, +9 for the filter-state selector. All six selective-build tests passed. |
| V5 | R6 | Run `npm run verify`, `node scripts/check-browser.mjs`, `npm test --prefix mcp/expressivecss`, and `npm run verify:packages` sequentially. The full `node --test` run inside verify includes the browser suite; confirm installed engines separately and do not repeat unchanged passing browser tests. Record failures and unavailable platform capabilities explicitly. | Completed with a recorded full-run timeout. The failing unchanged test passed alone; the remaining verify steps, MCP smoke, engine availability and both isolated packages passed. Three unrelated Firefox WebGL2 cases were unavailable. See the contributor run below. |
| V6 | R1-R6 | Independent final review traces each requirement to code and recorded evidence. Apply code-review-and-quality and code-simplification. PR must have passing required CI, resolved conversations and current master before merge. | Pending |

## Specification verification

Initial worktree status was clean on `t3/complete-roadmap-phases`. Local HEAD and master refs matched the remote at the base SHA. Required constitution files exist. Phase 67 has no dependencies or existing spec collision. The agent inspected the shared behavior, existing tests and contribution rules. Code graph indexes were absent for this checkout; direct source reads supplied the evidence. Branch, document links and R1-R6 coverage were verified. An independent read-only reviewer checked scope, source claims, phase eligibility, base and requirement-to-work/check coverage and found no blocking issues. Implementation acceptance remains pending.

## Evidence limits

The only stylesheet change hides rows carrying the reserved filter-state attribute. Behavior and count output will receive real-browser checks. Native browser zoom, real devices and assistive-technology speech output are not established by automated browser tests. Run the focused data-table visual comparison and inspect its captures. The user delegated verification through feature-spec-auto; record agent inspection without claiming that the user personally reviewed screenshots.

## Implementation decisions

Filter state uses a dedicated row attribute and one stylesheet rule, keeping author `hidden` attributes independent even when changed during a query. The static name heuristic needed native `labels` support to accept correctly labelled search inputs; the shared rule engine now reads that platform property, with positive and negative regression coverage. No runtime dependency or new table component was added.

## Contributor run

`npm run verify` built and typechecked successfully. Its full Node/browser run reported 3,363 tests, 3,359 passed, one failed and three skipped in 191 seconds. The failure was the unchanged Codex adapter oversized-stream test, which hit its 3,000 ms deadline. Its isolated rerun passed in 1,372 ms without a code change. The three skips were Firefox map cases because WebGL2 is unavailable; all three engines ran the table checks. `node scripts/check-browser.mjs` passed. The remaining generated, Astro build and site verification steps passed when run explicitly after the suite stopped. MCP smoke tests passed. Both isolated package consumers passed, including the packaged MCP smoke test. Visual results remain pending.
