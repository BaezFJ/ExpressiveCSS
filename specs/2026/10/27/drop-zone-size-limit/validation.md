# Drop-zone size limit validation

Phase 73, 2026-10-27. Branch `feature/2026-10-27-drop-zone-size-limit`, base `caae9ab049576b73df0e2874d3e1751c067130da`.

The agent owns executable checks and visual inspection under the user's delegation.

| ID | Requirements | Observable check | Result |
| --- | --- | --- | --- |
| V1 | R1-R5 | After building, run `node --test tests/drop-zone-validation.test.js tests/forms-validate.test.js tests/forms-generated.test.js`. Use actual byte-sized Files for 0, 1023, 1024 and 1025 bytes at a 1024-byte limit. Check exact-limit acceptance, whole selection retained, size-only and combined type-first behavior, malformed/unsafe/blank/zero hints, messages/native validity, application ownership, descriptions, no list, disabled/required, reset/cancellation/external forms/shadow, independent zones, changed constraints, deduplication, snapshot mutation, reentry and silent validation. Require red cases before implementation. Mutate > to >=, require failure and restore/rebuild/rerun. | Pending. |
| V2 | R1-R5 | Run `node scripts/check-browser.mjs`, then `node --test tests/drop-zone-validation-browser.test.js tests/drop-zone-browser.test.js tests/error-summary-browser.test.js tests/rem-font-sizes-browser.test.js`. In Chromium/Firefox/WebKit, click the native browse target, supply differently sized valid-extension chooser files, verify retained native FileList, real status/focus/descriptions, blocked submit-button submission, exact-limit recovery and reset/shadow/application ownership. Extend the Chromium native Input.dispatchDragEvent case with real temporary files and trusted drop/input/change assertions. Distinguish Firefox/WebKit shared file-change-boundary evidence from OS drop. Cleanup browsers/files in finally. | Pending. |
| V3 | R3, R6 | Extend static feedback fixtures without initialization. Run build:semantics/build:skill and semantics/docs/decision/skill/selective-build checks, followed by check:generated. Preserve the old rule id. Record JS/CSS gzip deltas from 109246/90893 and verify public compatibility through existing consumers. | Pending. |
| V4 | R1-R6 | Sequential contributor-equivalent checks: `npm run build`, `npm run typecheck`, `node --test --test-concurrency=8`, `npm run check:generated`, `npm run docs:build:astro`, `npm run docs:verify`, `npm test --prefix mcp/expressivecss`, `npm run verify:packages`. Keep all required remote CI. | Pending. |
| V5 | R3, R6 | Run `VISUAL_BASE=caae9ab049576b73df0e2874d3e1751c067130da npm run test:visual -- --grep 'drop-zone @' --workers 2`. Inspect changed compact/expanded/large/large-dark actuals and dark base; record intended differences. Capture invalid size feedback in light/dark and inspect text/focus. No physical/spoken approval implied. | Pending. |
| V6 | R1-R6 | Independently review requirement/source/evidence coverage, fix findings, complete separate simplification, and verify exact PR head, green required/all checks, conversations, current master and clean worktree before merge. Save actual merge proof in the separate completion docs. | Pending. |

## Discovery and specification verification

Read-only scouts phase_history, phase72_behavior and phase_checks confirmed Phase 73 eligibility, no matching branch/spec collision and the shared Forms extension points. Local refs include Phase 72's merged implementation at the base. Its PR #461 merged at 15:21:14 UTC on 2026-10-27; all seventeen checks passed on head be7b261e55111254fdeb8104e04be144b482ccb4 and security review found no issues. The default checkout was fast-forwarded and the watch stopped. Current roadmap labels lag by the separate post-merge documentation policy.

The graph list_projects and check_index_coverage calls failed with Transport closed. Graft CLI and graphify-out/graph.json are absent. Direct source/local-ref inspection supplies the evidence; no index was built or installed. Initial worktree was clean on the completed Phase 72 branch. Parent and scouts inspected shared Forms validation/reporting/reset, relevant tests and authoring contracts. New size constraints must participate in deduplication; size-only validation must not enable accept matching.

Agent decisions are recorded in requirements.md: independent data-max-size, trimmed positive decimal safe-integer bytes, equality accepted, invalid/nonpositive hints inactive, type-first single failure, data-error-size localization and the existing rejection event with reason:size. No implementation acceptance is claimed. Independent specification review by phase_history approved the phase/base/scope/links and R1-R6 plan/check coverage with no blocker. Parent verification confirms the active branch, three documents, relative links and phase identifiers. Only these specification files were added; implementation acceptance remains pending.

## Evidence limits

Physical OS picker/drop input, devices, native zoom and spoken output are unavailable. Chooser.setFiles after a native browse trigger does not prove physical picker interaction. A synthetic drop does not assign files; Chromium protocol native-drop observations must be recorded separately. Firefox map tests may skip when WebGL2 is absent. Metadata checks do not replace server validation. Required project checks and external review gates remain in force.


## Increment 1 evidence

Five new size-validation regressions failed against the Phase 72 bundle before implementation. The shared Forms pipeline now recognizes size-only opt-ins, parses trimmed positive decimal safe-integer bytes, accepts exact-limit files and rejects complete selections with an oversized file while retaining every File. Type matching stays gated on data-validate-types; type-first failure and separate data-error-size/fallback text preserve the type contract. Shared ownership preserves application validity and required-empty behavior.

JS build, typecheck and all 50 focused Node checks pass, including all 45 prior checks. No new public export, listener, ownership map or reset mechanism was added. Logs are `/tmp/expressivecss-phase73-{size-red,size-build,size-typecheck,size-node}.log`. Constraint-aware deduplication, size-specific delivery/reset/browser/static/style checks and final verification remain pending.


## Increment 2 evidence

The changed-limit rejection regression failed before extending deduplication. Metadata now records the type opt-in, raw accept and parsed effective byte limit independently from event arrays. Unchanged native pairs and equivalent decimal limits deduplicate; a changed effective limit or type flag can report again. Size reentry and cancellation/external-form/newer-selection reset cases pass, as does disabled application-validity preservation. Existing error selectors now include size-only opt-ins, using the same tokens and focus styling.

The pre-commit complexity gate initially rejected the new parser and size-failure helper at complexity five. Separating size-message formatting and removing a redundant positive comparison after decimal-only parsing keeps each new helper below the gate. Rebuild/typecheck and all 50 increment-1 checks passed after that correction; commit d2304a34e records the slice. No gate was bypassed.

JS/CSS builds, typecheck and all 54 focused Node checks pass. Mutating file.size > limit to >= fails the exact-limit regression; restoration returns all 54 checks to green and preserves the minified bundle SHA-256. Logs are `/tmp/expressivecss-phase73-{delivery-red,delivery-build,delivery-css,delivery-typecheck,delivery-node,mutation-build,mutation,restored-build,restored-node}.log`. Native browser delivery/style and static/docs guidance remain for increment 3.


## Increment 3 evidence

All 32 affected browser checks pass in Chromium, Firefox and WebKit, with no skips. New cases click the native browse target, supply exact-limit/oversized files through the chooser and verify native FileList retention, visible localized size feedback, descriptions/focus, the error border, blocked native submission and exact-limit recovery. Shared shadow/canceled-reset/application-validity and external-form reset cases now run for both type and size constraints. Chromium protocol drop uses actual 4/8-byte temporary PDF files, records trusted drop/input/change, retains both files, reports one size rejection and blocks native submission. Firefox/WebKit evidence remains the shared file-change boundary rather than OS drop. All pages and temporary files are cleaned up in finally.

The new static size-only feedback fixture failed before extending the existing live-status selector; its public rule id remains unchanged. Docs now provide a size-only live example and combined markup, strict byte parsing/boundaries, localized message and event precedence, refresh/recovery and server-validation guidance. Semantics, skill and MCP data were regenerated from sources. All 120 guidance/static/docs/decision/skill checks and six selective-build checks pass, as does check:generated. Reviewed sizes are JavaScript 109,451 gzip bytes (+205) and CSS 90,904 (+11) against Phase 72. Logs are `/tmp/expressivecss-phase73-{browser-capability,browser,semantics-red,semantics-build,skill-build,guidance,sizes,generated-check}.log`. Visual inspection, full contributor checks, independent final review and PR gates remain pending.
