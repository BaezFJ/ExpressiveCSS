# Data table text filtering validation

Phase 67, 2026-10-27. Branch `feature/2026-10-27-data-table-text-filtering`, base `db981aa4f83d0d2ee63e5877c1238cc698b2045e`.

The agent owns executable checks. Test results below remain pending until run. Specification review and implementation acceptance are separate.

| Check | Requirements | Action and expected result | Result |
| --- | --- | --- | --- |
| V1 | R1-R4 | Build JS, then run `node --test tests/data-tables-filter.test.js tests/data-tables.test.js`. Assert explicit/grouped columns, case/whitespace, data-value, multi-body detail groups, clear/no match, author-hidden rows, disabled fieldsets, view-scoped select-all, retained selections, sorting, replacement records, nested tables and unmarked controls. Mutate a new condition and prove the regression fails, then restore. | Passed. 23 focused Node tests, including 11 new cases. Nine of the initial ten tests failed on the base. Inverting the empty-query condition failed the new regressions; source was restored and all 23 passed. |
| V2 | R1-R5 | Build CSS/JS and run the filtering browser tests with Chromium, Firefox and WebKit. Assert keyboard input, focus retention, rendered record/detail visibility, count status, selection and shadow roots. Close browser contexts in finally. | Passed. All 57 focused table browser checks passed, including six new filtering cases across Chromium, Firefox and WebKit, with no skips. |
| V3 | R5-R6 | Run `npm run build:semantics`, `npm run build:skill`, `npm run check:generated`, and semantics tests. Check documented examples use named inputs and authored polite status output. | Passed. Generation and generated checks passed. Static semantics passed in the full run, including native-label regressions, authored examples and rendered documentation. |
| V4 | R6 | Measure minified JS gzip using the size test's normalization and run `node --test tests/selective-builds.test.js`. Record actual delta and retain CSS budget unless CSS changes. | Passed. Initial JS 106,962 gzip bytes, +382 over base. After the review fix, JS is 106,967, +387 over base, and the updated gzip check passed in the final full run. CSS 90,789, +9 for the filter-state selector. All six selective-build tests passed. |
| V5 | R6 | Run `npm run verify`, `node scripts/check-browser.mjs`, `npm test --prefix mcp/expressivecss`, and `npm run verify:packages` sequentially. The full `node --test` run inside verify includes the browser suite; confirm installed engines separately and do not repeat unchanged passing browser tests. Record failures and unavailable platform capabilities explicitly. | Completed with the full-run failures and their passing reruns recorded below. The final build, typecheck, table regressions, generated data, documentation, MCP smoke and isolated packages passed. Three unrelated Firefox WebGL2 cases were unavailable. |
| V6 | R1-R6 | Independent final review traces each requirement to code and recorded evidence. Apply code-review-and-quality and code-simplification. PR must have passing required CI, resolved conversations and current master before merge. | Local review passed. Both confirmed findings were fixed and rechecked independently; the simplification pass found no further justified change. Required CI and merge remain pending. |

## Specification verification

Initial worktree status was clean on `t3/complete-roadmap-phases`. Local HEAD and master refs matched the remote at the base SHA. Required constitution files exist. Phase 67 has no dependencies or existing spec collision. The agent inspected the shared behavior, existing tests and contribution rules. Code graph indexes were absent for this checkout; direct source reads supplied the evidence. Branch, document links and R1-R6 coverage were verified. An independent read-only reviewer checked scope, source claims, phase eligibility, base and requirement-to-work/check coverage and found no blocking issues. Implementation acceptance remains pending.

## Evidence limits

The only stylesheet change hides rows carrying the reserved filter-state attribute. Behavior and count output will receive real-browser checks. Native browser zoom, real devices and assistive-technology speech output are not established by automated browser tests. Run the focused data-table visual comparison and inspect its captures. The user delegated verification through feature-spec-auto; record agent inspection without claiming that the user personally reviewed screenshots.

## Implementation decisions

Filter state uses a dedicated row attribute and one stylesheet rule, keeping author `hidden` attributes independent even when changed during a query. The static name heuristic needed native `labels` support to accept correctly labelled search inputs; the shared rule engine now reads that platform property, with positive and negative regression coverage. No runtime dependency or new table component was added.

## Contributor run

`npm run verify` built and typechecked successfully. Its full Node/browser run reported 3,363 tests, 3,359 passed, one failed and three skipped in 191 seconds. The failure was the unchanged Codex adapter oversized-stream test, which hit its 3,000 ms deadline. Its isolated rerun passed in 1,372 ms without a code change. The three skips were Firefox map cases because WebGL2 is unavailable; all three engines ran the table checks. `node scripts/check-browser.mjs` passed. The remaining generated, Astro build and site verification steps passed when run explicitly after the suite stopped. MCP smoke tests passed. Both isolated package consumers passed, including the packaged MCP smoke test. Visual results remain pending.

## Code review and simplification

An independent read-only review traced R1-R6 to source, tests and evidence. It found two required fixes: per-record layout reads mixed with hiding writes, and filtering prose placed under the bulk-actions heading. Both were fixed and the reviewer confirmed them. Filtering now clears markers, reads record visibility, then writes group visibility in batches. The reference has separate Text filtering and Bulk actions sections. The table decision record now describes shared-runtime ownership and current support; upstream and capability-review pins remain unchanged.

The post-fix build and typecheck passed. All 29 focused logic and filtering-browser tests passed with no skips. Generated guidance was refreshed. The code-simplification pass found no further justified change after the batching fix removed repeated array reconstruction and used the existing grouping helpers. No new dependency or table component abstraction was added. The final contributor checks are running with eight test files at a time to reduce contention; coverage and assertions are unchanged.

## Visual comparison

`npm run test:visual -- --grep 'data-table @' --workers 2` captured base and head for compact, expanded, large and large-dark. All four comparisons reported differences from the new Text filtering documentation section, its table example, the selection wording and the contents link. The agent inspected all four actual captures under the user's delegated verification. The new field, count and table remain within their container; existing table examples retain their layout. This is an inspected intentional difference, not a passing no-difference comparison or a claim of personal user review. The first invocation used an anchored grep that matched no full Playwright titles; it produced no valid comparison and was replaced by the command above.

Local report: `visual/report/index.html`. Expected, actual and diff PNGs are under `visual/results/pages-data-table-*`. These reports are ignored and are not committed.

## Final local results

The post-review build and typecheck passed. The full `node --test --test-concurrency=8` run reported 3,363 tests, 3,359 passed, one failed and the same three Firefox WebGL2 skips. All table cases and the previously timed-out Codex adapter test passed in this run. The only failure was the shared basic-button reading budget: correcting DataTables from css-only to shared-runtime added six bytes to the decision index. The table's use-when wording was shortened without changing that budget. The reading path is now 49,776 bytes against the unchanged 49,778-byte limit.

After that guidance-only fix, all 48 skill and component-decision tests passed with zero skips. Generated checks, the Astro build, site verification, MCP smoke and both isolated package consumers passed again. No runtime or stylesheet change followed the post-review full run. The first aggregate run's timeout and the second aggregate run's budget failure remain reported rather than being described as clean aggregate passes.

The shared implementation, source guidance, generated copies, tests and evidence match R1-R6. Final diff whitespace checks passed. Origin master was fetched before submission and remains at the specified base. Roadmap status labels remain unchanged. Local implementation and feasible verification are complete; required PR checks and merge remain pending.
