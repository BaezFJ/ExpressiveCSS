# Lint paste blocking: plan

Phase 87. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch after phase 86.

## 1. Rule

Covers R1 to R5. Checks V1.

- [x] Add the R3 cases to the non-legacy table, the backtracking inputs and the CLI case to `mcp/expressivecss/smoke.mjs`, run `npm test --prefix mcp/expressivecss` and watch it fail on the missing rule.
- [x] Append `paste-blocked` to the regex list in `mcp/expressivecss/server.js`, with statements that can't start with whitespace, bounded repeats, and the attribute name matched in any case without regex modifiers (Node 22 lacks them). Add its ID to the backtracking loop's rule filter. Add no export and no function.

## 2. Docs

Covers R6. Checks V2.

- [x] Name the check in the lint paragraph of `mcp/expressivecss/README.md` and in the Unreleased entry of `mcp/expressivecss/CHANGELOG.md`.
- [x] Commit groups 1 and 2, so the branch lint in group 3 has a commit to name.

## 3. Lint-stage rerun

Prerequisite: phase 84's framework-stage rows are recorded. Covers R7, R8. Checks V3, V4.

- [ ] Build each prompt twice under the procedure in `docs/agents/finished-app-evals.md`, review with the baseline skill trees and the baseline lint, and run `npm run eval:finished-app-undo`, `eval:finished-app-url` and `eval:finished-app-submit` on the matching builds, with no verify run alongside.
- [ ] Copy the apps into `docs/agents/evidence/finished-app/2026-11-15-lint-stage/`, then run `node mcp/expressivecss/lint.mjs` from the repository root over them and the baseline apps, save `branch-lint.txt`, and check each new-rule hit against the source.
- [ ] Write `findings.json` with the provenance fields, the hash comparison with the framework stage and the branch lint record; add the six rows, the lint stage notes with the milestone summary, the Records entry and the sentence in "Comparing with the baseline".

## 4. Suite

Covers R9. Checks V5.

- [ ] `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time, on the final commit.
