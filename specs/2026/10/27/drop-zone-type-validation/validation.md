# Drop-zone type validation validation

Phase 72, 2026-10-27. Branch `feature/2026-10-27-drop-zone-type-validation`, base `cd7a3c1e262f217a05f337bfab4c8935fdc8f8d5`.

The agent owns executable checks and visual inspection under the user's delegation.

| ID | Requirements | Observable check | Result |
| --- | --- | --- | --- |
| V1 | R1-R5 | After building, run `node --test tests/drop-zone-validation.test.js tests/forms-validate.test.js tests/forms-generated.test.js`. Unsupported browse/drop-boundary files must share custom validity, reject a mixed selection as a whole and preserve the native files. Cover extension/MIME/wildcard alternatives, empty MIME/accept, malformed hints, opt-out, disabled fields, no optional list, safe names, pre-existing application validity surviving invalid/valid/empty/reset and replacement of a framework message, empty/required, reset/canceled reset, reentry, event flags/details/deduplication and silent script validation. Require red tests before implementation and failure of a new-condition mutation, then restore and rerun. | Pending. |
| V2 | R1-R5 | Run `node scripts/check-browser.mjs`, then `node --test tests/drop-zone-validation-browser.test.js tests/drop-zone-browser.test.js tests/error-summary-browser.test.js tests/rem-font-sizes-browser.test.js`. In all three engines, click the native browse target and supply chooser files, check shared native selection events and actual submit prevention, accessible descriptions/visible text, recovery, shadow reset and unchanged legacy zones. Use a real submit button/requestSubmit, not synthetic submit/form.submit. Probe native Chromium protocol drop delivery with actual temporary files; distinguish it from assigned FileList + input/change in other engines. Cleanup in finally. | Pending. |
| V3 | R3, R6 | Add static markup fixtures without initialization. Regenerate `npm run build:semantics` and `npm run build:skill`. Run semantics/docs/decision/skill and selective-build checks, then `npm run check:generated`. Verify public compatibility through existing package consumers. Reviewed gzip baselines JS 108,250; CSS 90,848. | Pending. |
| V4 | R1-R6 | Sequential contributor-equivalent checks: `npm run build`, `npm run typecheck`, `node --test --test-concurrency=8`, `npm run check:generated`, `npm run docs:build:astro`, `npm run docs:verify`, `npm test --prefix mcp/expressivecss`, `npm run verify:packages`. Retain all required CI. | Pending. |
| V5 | R3, R6 | Run `VISUAL_BASE=cd7a3c1e262f217a05f337bfab4c8935fdc8f8d5 npm run test:visual -- --grep 'drop-zone @' --workers 2`. Inspect every changed compact/expanded/large/large-dark actual, plus invalid feedback in light/dark browser captures. Check readable error text and preserved focus outline; no physical-device or spoken-output approval is implied. | Pending. |
| V6 | R1-R6 | Independently map every requirement to source and actual evidence, resolve findings, perform a separate simplification pass, and verify exact PR head, green required checks, conversations, current master and clean worktree before merge. Record actual merge proof in separate completion docs. | Pending. |

## Specification discovery

Read-only scouts phase_history, phase_checks and phase72_behavior confirmed Phase 72 eligibility, no branch/spec collision, the shared Forms file path, current optional-list behavior, existing error-summary/native-validity integration, shadow-event gap and cancellation-sensitive reset ordering. Discovery uses local refs fetched after Phase 71 merged. Roadmap labels for merged phases remain stale by the chosen post-merge documentation policy.

Codebase-memory list_projects and coverage calls failed with Transport closed. Graft CLI and graphify-out/graph.json are absent. Source/ref inspection supplies the evidence; no index was built or installed. The initial worktree was clean on the completed Phase 71 branch before creating this branch from merged origin/master.

The HTML Standard was consulted for accept token categories, its picker-hint scope and server-validation responsibility. Native-drop evidence will follow the [Chromium Input protocol](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchDragEvent) when supported. [Playwright's file chooser API](https://playwright.dev/docs/api/class-filechooser) supplies automated selections after an actual browse trigger; it is not physical picker evidence.

Independent specification review remains pending. No implementation acceptance result is claimed.

## Evidence limits

Physical OS picker/drop input, devices, native zoom and spoken screen-reader output are unavailable. Synthetic drop does not prove native file assignment. Record Chromium protocol-drop observations separately from cross-engine file-change-boundary tests. Firefox map checks may skip without WebGL2. File metadata validation does not inspect bytes or replace server validation.

Independent specification review by phase_history identified conflicting native-validity ownership wording. R2/R3/R5 now define application-message precedence and type feedback separately; V1 explicitly checks app-error survival across rejection, recovery, clearing and reset. Independent recheck remains pending.

Independent recheck by phase_history approved the corrected specification with no remaining blocker. Branch/base, the three documents, relative links and R1-R6 work/check coverage pass specification verification. Implementation acceptance remains pending.

## Increment 1 evidence

The initial three matching/native-validity checks failed before implementation. Silent Forms.validateField now checks marked drop-zone file inputs, supports the specified extensions/MIME/media wildcard alternatives, rejects complete mixed selections and leaves the supplied files untouched. Validation works without a list; existing safe text-based listing retains every filename. Valid/empty/opt-out recovery clears owned custom validity, while pre-existing and replacement application messages survive. Disabled inputs/fieldsets remain inactive and required-empty native invalidity remains effective.

JS build and typecheck passed. All 33 focused Node checks passed, including six new file-validation cases and existing Forms/generated-control checks. One disabled-fieldset fixture initially removed its input before looking it up; retaining that input while reparenting corrected the fixture. The audit passes with existing Forms complexity/dependency/styling advisories; no new function exceeds the configured gate. Logs are `/tmp/expressivecss-phase72-{red,build-js,typecheck,node,audit}.log`. Native event delivery, feedback/reset handling, browser evidence, docs and final checks remain pending.
