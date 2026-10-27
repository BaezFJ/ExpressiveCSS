# Data table text filtering validation

Phase 67, 2026-10-27. Branch `feature/2026-10-27-data-table-text-filtering`, base `db981aa4f83d0d2ee63e5877c1238cc698b2045e`.

The agent owns executable checks. Test results below remain pending until run. Specification review and implementation acceptance are separate.

| Check | Requirements | Action and expected result | Result |
| --- | --- | --- | --- |
| V1 | R1-R4 | Build JS, then run `node --test tests/data-tables-filter.test.js tests/data-tables.test.js`. Assert explicit/grouped columns, case/whitespace, data-value, multi-body detail groups, clear/no match, author-hidden rows, disabled fieldsets, view-scoped select-all, retained selections, sorting, replacement records, nested tables and unmarked controls. Mutate a new condition and prove the regression fails, then restore. | Pending |
| V2 | R1-R5 | Build CSS/JS and run the filtering browser tests with Chromium, Firefox and WebKit. Assert keyboard input, focus retention, rendered record/detail visibility, count status, selection and shadow roots. Close browser contexts in finally. | Pending |
| V3 | R5-R6 | Run `npm run build:semantics`, `npm run build:skill`, `npm run check:generated`, and semantics tests. Check documented examples use named inputs and authored polite status output. | Pending |
| V4 | R6 | Measure minified JS gzip using the size test's normalization and run `node --test tests/selective-builds.test.js`. Record actual delta and retain CSS budget unless CSS changes. | Pending |
| V5 | R6 | Run `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss`, and `npm run verify:packages` sequentially. Every required check passes without hiding failures or missing-engine skips. | Pending |
| V6 | R1-R6 | Independent final review traces each requirement to code and recorded evidence. Apply code-review-and-quality and code-simplification. PR must have passing required CI, resolved conversations and current master before merge. | Pending |

## Specification verification

Initial worktree status was clean on `t3/complete-roadmap-phases`. Local HEAD and master refs matched the remote at the base SHA. Required constitution files exist. Phase 67 has no dependencies or existing spec collision. The agent inspected the shared behavior, existing tests and contribution rules. Code graph indexes were absent for this checkout; direct source reads supplied the evidence. Branch, document links and R1-R6 coverage were verified. An independent read-only reviewer checked scope, source claims, phase eligibility, base and requirement-to-work/check coverage and found no blocking issues. Implementation acceptance remains pending.

## Evidence limits

No stylesheet design change is planned. Behavior and count output will receive real-browser checks. Native browser zoom, real devices and assistive-technology speech output are not established by automated browser tests. If implementation changes stylesheet design, run the required visual comparison and preserve the maintainer's visual-review requirement.
