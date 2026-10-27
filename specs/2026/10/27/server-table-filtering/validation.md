# Server-owned table filtering validation

Phase 68, 2026-10-27. Branch `feature/2026-10-27-server-table-filtering`, base `b2bff6ec0649a69f7cee3427edc1ef379fa8853b`.

The agent owns the checks. Specification verification is separate from pending implementation acceptance. Do not infer a pass from source inspection alone.

| Check | Requirements | Action and expected result | Result |
| --- | --- | --- | --- |
| V1 | R1-R5 | Build JS, then run `node --test tests/data-tables-filter.test.js tests/data-tables.test.js`. Assert exact event flags/detail and delivery, unchanged default local filtering, canceled current-view preservation, app-owned counts, synchronous replacement and sync during dispatch, asynchronous replacement, silent sync, author hiding/details, scoped selection, wrapper isolation, resumed local filtering and independent sort cancellation. Include an empty query and unmarked controls. A new condition mutation must fail a regression and then be restored. | Passed. All 29 focused tests pass after the JS build; typecheck passes. The first three regressions failed before implementation. Inverting private server ownership failed the regression suite, then was restored and rebuilt. Logs: `/tmp/expressivecss-phase68-red.log`, `/tmp/expressivecss-phase68-mutation.log`, `/tmp/expressivecss-phase68-node.log`. |
| V2 | R1-R5 | Build CSS/JS, then run `node --test tests/data-tables-filter-browser.test.js tests/data-tables-browser.test.js`. In Chromium, Firefox and WebKit, use real input and application replacements. Assert rendered record/detail visibility, query/focus retention, custom count, selection and composed request delivery from an open shadow root. Close browser leases in finally. | Passed. Browser engine preflight passes. All 54 focused checks pass across Chromium, Firefox and WebKit, including six new server-filter cases. Log: `/tmp/expressivecss-phase68-browser.log`. |
| V3 | R6 | Run `npm run build:skill`, `npm run check:generated` and relevant static semantics/guidance checks. Verify that docs distinguish framework events from app fetching and that programmatic sync stays silent. Existing markup rules and exports remain unchanged. | Passed. Guidance generation and generated checks pass; all 74 focused skill, decision and benchmark checks pass. No markup rules or exports changed. Log: `/tmp/expressivecss-phase68-guidance.log`. |
| V4 | R6 | Measure normalized minified gzip sizes and run `node --test tests/selective-builds.test.js`. Review the measured JavaScript delta from the base's 107,136 bytes. CSS stays at 90,834 bytes unless a justified stylesheet change is made. | Measured JavaScript 107,218 gzip bytes, +82; CSS 90,834, unchanged. Reviewed budget updated. Selective-build suite pending. |
| V5 | R6 | Run the contributor build, typecheck, full Node/browser suite, generated checks, Astro build and site verification, plus `npm test --prefix mcp/expressivecss` and `npm run verify:packages` sequentially. Use the same checks as `npm run verify`; a bounded Node test-file concurrency is allowed without changing coverage. Confirm installed engines with `node scripts/check-browser.mjs`. Record every failure, rerun and unavailable capability. | Pending |
| V6 | R1-R6 | Independent final review maps requirements to source, tests and evidence, checks scope and compatibility, and challenges unsupported pass claims. Apply code-review-and-quality and code-simplification. Merge requires passing required CI, resolved conversations and current master. | Pending |

## Specification verification

Initial worktree status was clean. Phase 67 is merged in local master history as PR #456 at the base SHA, and its source is present. The default checkout was fast-forwarded after merge. Read-only scouts found the shared filtering behavior, silent sync, existing cancelable sort pattern and focused fixtures. They identified synchronous sync during cancellation as a required edge case. Branch/spec collision checks were refreshed after merge and found none. Constitution files and source links exist. Independent read-only reviewer `phase_history` approved the specification, checked R1-R6 against groups and V1-V6, and found no blocking ambiguity, omitted acceptance, source contradiction or link error. Implementation acceptance remains pending.

## Evidence limits

Application replacements are simulated in tests; this does not verify a real server, network failures or application response ordering. No new visual design is planned. Existing controls and authoring rules remain in use. Browser checks do not establish physical-device behavior, native zoom or spoken screen-reader output. Any documentation screenshot comparison is advisory and must be inspected rather than described as a no-difference pass when content changes.

## Implementation notes

The first commit attempt failed the complexity gate because `_filter` reached six branches. The count write now has its own small method that returns for server ownership; filtering and count ownership remain explicit. After this change, all 29 focused checks and typecheck pass and the commit hook accepts the increment. No hook was bypassed.
