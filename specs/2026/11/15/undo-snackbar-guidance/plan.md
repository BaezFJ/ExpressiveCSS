# Undo snackbar guidance: plan

Phase 80. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `9bc7bcb67`.

## 1. Guidance

Covers R1 to R4, R7. Checks V1, V2.

- [ ] Add the R4 test and watch it fail.
- [ ] Write the Snackbar and Lists `### App behavior` subsections and the Dialogs example change in `llm.md`.
- [ ] Add the CHANGELOG entry, run `npm run build:skill` and the skill, semantics and docs-api tests.

Done when V1 and V2 pass.

## 2. Rebuild, review and browser check

Covers R5, R6. Checks V3.

Prerequisites: group 1, committed.

- [ ] Write `scripts/finished-app-delete-undo.mjs` and try it on the two baseline apps (both should fail on the confirmation dialog).
- [ ] Build `destructive-list` twice from HEAD, review both with the baseline trees, confirm, and run the script on each.
- [ ] Name the script in `docs/agents/finished-app-evals.md`.
- [ ] Record `docs/agents/evidence/finished-app/2026-11-15-phase-80/` and two rows.

Done when V3 passes or the R6 limit is reached and recorded.

## 3. Suite

Covers R7. Checks V4.

- [ ] Run `npm run verify` and `npm test --prefix mcp/expressivecss`.

Done when V4 passes.
