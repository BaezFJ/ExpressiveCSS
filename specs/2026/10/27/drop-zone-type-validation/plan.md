# Drop-zone type validation plan

Phase 72, 2026-10-27. Branch `feature/2026-10-27-drop-zone-type-validation`, base `cd7a3c1e262f217a05f337bfab4c8935fdc8f8d5`.

Use feature-spec-auto, incremental-implementation, code-review-and-quality with fixes, code-simplification and babysit-pr. Verification is delegated. Begin Phase 73 only after this phase merges.

## 1. Validate complete native file choices

Prerequisite: independent specification review passes.

- [x] Add failing focused cases in tests/drop-zone-validation.test.js for opt-in extension/MIME matching, empty MIME, malformed hints, mixed selections, no optional list, native validity and safe filenames.
- [x] Implement shared validation in src/ts/behaviors/forms.ts and connect silent Forms.validateField without changing unmarked fields or native FileList. Preserve application custom validity ownership.
- [x] Build/typecheck and run focused Forms/drop-zone checks for R1-R2 and R5. Commit the verified slice.

Completion check V1. Keep new helpers below cyclomatic complexity five.

## 2. Deliver feedback, events and reset recovery

Prerequisite: group 1 passes.

- [x] Add composed native-input handling while retaining existing change paths. Deduplicate rejection reports for native input/change, snapshot event details before dispatch and cover reentrant selection updates.
- [x] Reuse Forms description helpers for zone-level authored feedback and implement deferred cancellation-aware reset cleanup, including handled shadow forms. Add minimal token-based error styling in src/sass/components/forms/_drop-zone.scss.
- [x] Cover valid/empty/reset/opt-out recovery, application validity, canceled reset, descriptions, independent zones and event contracts. Mutate a new condition, require regression failure, restore source and rerun affected checks. Commit the verified slice.

Delivers R2-R5. Completion checks V1-V2.

## 3. Verify browser behavior and authoring guidance

Prerequisite: groups 1 and 2 pass.

- [ ] Add tests/drop-zone-validation-browser.test.js for actual browse trigger/chooser input, native form prevention, recovery, shadow roots and shared file-change parity across Chromium, Firefox and WebKit. Probe Chromium protocol drag delivery and record its actual capability; tear down all pages and temporary files in finally.
- [ ] Add an authored validation example through the existing sections catalogue in docs/src/pages/drop-zone.astro. Update llm.md and CHANGELOG.md, add only the required static feedback contract in semantics.json/tests/semantics.test.js, and regenerate derived guidance.
- [ ] Run affected Forms/error-summary/drop-zone/browser/static/docs checks and selective-build budgets. Record actual JS/CSS deltas from merged baselines 108,250 and 90,848 gzip bytes. Commit the verified slice.

Delivers R1-R6. Completion checks V2-V3.

## 4. Review, simplify and merge

Prerequisite: groups 1-3 pass.

- [ ] Run contributor-equivalent checks sequentially against built bundles, including the full suite, generated data, docs/site verification, MCP smoke and both clean package consumers. Record failures and unavailable evidence accurately.
- [ ] Compare drop-zone docs against the merged base in compact, expanded, large and large-dark layouts, and inspect actual invalid-feedback captures in light/dark layouts. Disclose intended differences rather than claiming a zero-diff pass.
- [ ] Obtain independent R1-R6 implementation/evidence review, fix findings, perform a separate simplification pass, then open/watch the PR and merge only after exact-head CI/conversation/current-master/clean-worktree gates pass.

Delivers R6. Completion checks V4-V6. Preserve the separate post-merge roadmap/evidence documentation step.
