# Data table page size validation

Phase 70, 2026-10-27. Branch `feature/2026-10-27-data-table-page-size`, base `dd7649d024c10d00614ce115db4bbe8fcb4d2b4c`.

The agent owns executable checks and visual inspection under the user's delegation.

| ID | Requirements | Check and expected outcome | Result |
| --- | --- | --- | --- |
| V1 | R1-R5 | After building, run `node --test tests/data-tables-page.test.js tests/data-tables-filter.test.js tests/data-tables.test.js`. Add seven-record last-page changes from size 2 to 4 and 3 with exact page/status/record IDs; preserve a valid page on decrease. Verify duplicate input/change applies once, invalid controls leave state unchanged, server-filter counts stay owned, details/selection/hiding survive, empty state stays valid, wrappers isolate and script-only value changes stay silent. New behavior must fail without implementation; a clamp mutation must fail. | Passed: all 48 focused Node regressions, no skips. The two initial completion regressions failed before implementation. Removing the clamp failed three size checks; restored source and bundles pass. Logs: `/tmp/expressivecss-phase70-red.log`, `/tmp/expressivecss-phase70-mutation.log`, `/tmp/expressivecss-phase70-node.log`. |
| V2 | R1-R5 | Run `node scripts/check-browser.mjs`, then `node --test tests/data-tables-page-browser.test.js tests/data-tables-filter-browser.test.js tests/data-tables-browser.test.js tests/data-table-browser.test.js`. In Chromium, Firefox and WebKit use actual native select pointer/keyboard input, assert rendered last-page records/status/focus, and repeat through open-shadow native input and existing FormSelect composed change. Assert retained selections, detail visibility, server-filter counts and ordinary link navigation. Close leases in finally. | Pending. |
| V3 | R4-R6 | Add static native single-select and accessible-name regressions in `tests/semantics.test.js`, without component initialization. Regenerate with `npm run build:semantics` and `npm run build:skill`. Run semantics, documentation inventory, decision/guidance and selective-build tests plus `npm run check:generated`. Reviewed baselines: JS 107,683 gzip bytes, CSS 90,848. Record actual deltas. | Pending. |
| V4 | R1-R6 | Run `npm run build`, `npm run typecheck`, `node --test --test-concurrency=8`, `npm run check:generated`, `npm run docs:build:astro`, `npm run docs:verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` sequentially. This is the established contributor-equivalent verification, including built bundles and all available browser engines. | Pending. |
| V5 | R1-R3, R6 | Run `npm run test:visual -- --grep 'data-table @' --workers 2` against base `dd7649d024c10d00614ce115db4bbe8fcb4d2b4c`. Inspect each changed actual capture in compact, expanded, large and large-dark layouts. The authored size control must fit the existing table treatment, remain named and retain normal light/dark styling. Report expected visual differences separately from comparison success. | Pending. |
| V6 | R1-R6 | Independently review requirements, source, tests, docs and evidence; fix confirmed findings and perform a separate simplification pass. Verify final PR head, all required CI, unresolved conversations, clean worktree and current master before merging. Record actual merge evidence in the separate post-merge docs PR. | Pending. |

## Specification verification

Discovery used local fetched refs after Phase 69 merged. Read-only scouts `phase_history`, `table_behavior` and `phase_checks` confirmed Phase 70 eligibility, no branch/spec collision, the existing clamp pipeline and the native versus FormSelect event distinction. The worktree was clean; the new branch starts at merged master. Roadmap completion labels for earlier merged phases are stale and will be updated separately.

The specification chooses a single authored select, wrapper-authoritative state, both input/change event paths with deduplication, ignored invalid controls, no new request event and preservation of the current numeric page. Each R1-R6 requirement maps to planned work and executable checks. The three specification files, phase/branch/base and relative links were checked. Independent read-only reviewer `phase_history` approved the specification with no blocking finding. Implementation acceptance remains pending.

## Evidence limits

Physical devices, native browser zoom and spoken screen-reader output are unavailable in this environment. Automated focus, names, real input, layout and forced-color coverage do not establish spoken-output or hardware approval. No user review is claimed. The three Firefox map checks may skip when the local engine lacks WebGL2; report actual results and keep required browser CI as a merge gate.

## Increment 1

The shared handler accepts native input and FormSelect change through composed-path lookup. It validates the original select and numeric size before updating the existing wrapper attribute; the duplicate event returns without a second sync. Current page state and server-filter ownership remain intact. Build and typecheck pass. Node coverage includes disabled fieldsets/options/optgroups, invalid values, multiple and wrong controls, independent/nested wrappers, exact sorted/filtered records, empty results, retained selection and script-only ownership. No browser or merge acceptance is claimed yet.
