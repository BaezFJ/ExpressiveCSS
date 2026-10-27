# Server-owned table paging validation

Phase 71, 2026-10-27. Branch `feature/2026-10-27-server-table-paging`, base `8ed6a0f4d5416ff62ae9ab84df1decbf988e3675`.

The agent owns executable checks and visual inspection under the user's delegation.

| ID | Requirements | Check and expected outcome | Result |
| --- | --- | --- | --- |
| V1 | R1-R5 | After building, run `node --test tests/data-tables-server-page.test.js tests/data-tables-page.test.js tests/data-tables-filter.test.js tests/data-tables.test.js`. Start with page two, size two, total seven and two supplied rows; require status `2 / 4` with all supplied records visible. Cover strict numeric validation, frozen state, excess rows, zero/shrinking totals, silent sync/responses, native event-pair deduplication, canceled/default requests, reentry, server filter/sort ownership, details/selection/hiding and null reset. New behavior must fail before implementation; reject a new-condition mutation. | Pending. |
| V2 | R1-R5 | Run `node scripts/check-browser.mjs`, then `node --test tests/data-tables-server-page-browser.test.js tests/data-tables-page-browser.test.js tests/data-tables-filter-browser.test.js tests/data-tables-browser.test.js tests/data-table-browser.test.js`. In Chromium, Firefox and WebKit use real page-button pointer/keyboard input, native select events and FormSelect's composed change in an open shadow root. Assert initial and response records remain unsliced, accepted controls reflect server total, cancellation preserves the view, native size pairs request once, counts/selection/focus stay correct and ordinary links navigate. Close every lease and component in finally. | Pending. |
| V3 | R1, R6 | Reuse authored button/select/status semantics and run their static fixtures without initialization. Regenerate `npm run build:semantics` and `npm run build:skill`. Run semantics/docs/decision/skill tests, selective-build checks and `npm run check:generated`. Verify setPage's public declaration with the repository's package consumer checks. Reviewed baselines: JS 107,786 gzip bytes; CSS 90,848. Record actual deltas. | Pending. |
| V4 | R1-R6 | Run `npm run build`, `npm run typecheck`, `node --test --test-concurrency=8`, `npm run check:generated`, `npm run docs:build:astro`, `npm run docs:verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` sequentially. This is the established contributor-equivalent verification, against built bundles and all available engines. | Pending. |
| V5 | R3, R6 | Run `VISUAL_BASE=8ed6a0f4d5416ff62ae9ab84df1decbf988e3675 npm run test:visual -- --grep 'data-table @' --workers 2`. Inspect every changed actual compact, expanded, large and large-dark capture. New guidance must fit the existing docs treatment; disclose expected screenshot differences rather than reporting a zero-difference pass. | Pending. |
| V6 | R1-R6 | Independent final review traces each requirement to code, tests and actual evidence, checking scope and unsupported claims. Fix findings and perform a separate simplification pass. Verify exact PR head, required CI, conversations, clean worktree and current master before merging. Record actual merge proof in the separate post-merge documentation PR. | Pending. |

## Specification verification

Discovery used local fetched refs after Phase 70 merged. Read-only scouts `phase_history`, `table_behavior` and `phase_checks` confirmed Phase 71 eligibility, base, no matching branch/spec/API/attribute collision, current record-group paging, separate filter/sort events and the native size-event duplicate risk. The worktree was clean before branch creation. Roadmap completion labels for merged phases remain stale and will be updated separately.

The specification chooses atomic application state, request-before-default events, server records that remain application-owned, strict numeric boundaries, explicit null reset, native composed-input/FormSelect-change delivery and request identity protection. Each R1-R6 maps to ordered implementation and executable checks. The branch, base, three specification files, relative links and requirement/task/check coverage were verified. Independent read-only reviewer `phase_history` approved the specification with no blocking finding. Implementation acceptance remains pending.

## Evidence limits

Physical devices, native zoom and spoken screen-reader output are unavailable. Firefox's OS-popup option pointer path is not exposed to Playwright; native event/keyboard coverage and its supported inline single-select pointer presentation do not establish OS-popup approval. Report the actual exercised presentations. Local Firefox map checks may skip without WebGL2; retain required browser CI as a merge gate. Static semantics and automated interaction checks do not establish comprehensive accessibility approval, and no personal user review is claimed.

## Increment 1 evidence

The initial two setter tests failed before implementation because `setPage` was absent. The shared implementation now accepts copied validated server state, preserves supplied record groups, uses application totals, and restores local paging with null. JS build and typecheck passed. All 54 focused Node checks passed, including invalid state/no-mutation checks, frozen/copied inputs, excess records, zero/shrinking totals, hiding, selection and local reset. Logs are `/tmp/expressivecss-phase71-{red,build-js,typecheck,state}.log`. Request delivery remains for increment 2.
