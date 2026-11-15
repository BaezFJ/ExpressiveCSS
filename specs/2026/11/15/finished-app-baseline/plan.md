# Finished-app baseline: plan

Phase 78. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch `feature/2026-11-15-milestone-apps-that-feel-finished` at `8746e9ba0`.

## 1. Prompts and procedure

Covers R1, R2, R5, R7. Checks V1.

Prerequisites: phase 77.

- [x] Write `docs/agents/finished-app-evals.md` with the three prompts, both commands, the directory layouts, both briefs, the time limit, the confirmation, severity and counting rules, the rebuild steps for later phases, and an empty results table.
- [x] Check the prompts and the build brief for the R1 word list.

Done when V1 passes.

## 2. Build the six apps

Covers R3, R8. Checks V2.

Prerequisites: group 1 and `npm run build` at a committed HEAD.

- [x] Commit group 1 so the recorded commit holds the briefs.
- [x] For each prompt and run, make a scratch directory with a copy of `dist/` and of `skills/expressivecss` as `expressivecss/`, and run the build command there with `timeout 1800`, at most three at once.
- [x] After each build, check `git status` in the repository, hash the app files, and copy them unchanged into the evidence directory.

Done when six apps exist, or each missing one has a recorded rerun and failure.

## 3. Review and count

Covers R4, R5, R6, R7, R8. Checks V3, V4.

Prerequisites: group 2.

- [x] For each app, make a review directory with the app, its local files, a copy of `dist/` and the two skill trees; run the lint there and save its output.
- [x] Run the review command there with `--allowedTools Read Glob Grep` and save the lens block.
- [x] Confirm each labelled finding by R5 and set its severity from the SKILL.md section 5 anchors.
- [x] Write `findings.json` and fill the six baseline rows.

Done when V3 and V4 pass.

## 4. Suite

Covers R1 to R8. Checks V5.

Prerequisites: group 3.

- [x] Run `npm run verify`.

Done when V5 passes.
