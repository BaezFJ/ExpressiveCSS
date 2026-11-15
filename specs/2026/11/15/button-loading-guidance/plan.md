# Button loading guidance: plan

Phase 79. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch `feature/2026-11-15-milestone-apps-that-feel-finished` at `7aa6623b5`.

## 1. The App behavior channel

Covers R1, R4. Checks V1, V2.

Prerequisites: none.

- [x] Add the R4 test and watch it fail.
- [x] Render `### App behavior` in `renderGuide` (`scripts/gen-expressivecss-skill.mjs`) and add it to the headings that "Also documented" skips.

Done when `npm run build:skill` leaves every existing guide unchanged except the contract hash.

## 2. Button guidance

Covers R2, R3, R4. Checks V1, V3.

Prerequisites: group 1.

- [x] Write the Buttons `### App behavior` subsection in `llm.md` after `### Disabled`.
- [x] Add the CHANGELOG entry, run `npm run build:skill`, raise the reading budget with a reviewed line.
- [x] Run the skill tests until they pass.

Done when V1 and V3 pass.

## 3. Rebuild and review

Covers R5, R6. Checks V4.

Prerequisites: group 2, committed.

- [ ] Build `settings-form` twice from the committed HEAD under the procedure, review both with the baseline trees and lint, confirm, and record `docs/agents/evidence/finished-app/2026-11-15-phase-79/` and two rows.
- [ ] If a run scores a loading finding, revise the guidance and repeat, as R6 allows.

Done when V4 passes or the R6 limit is reached and recorded.

## 4. Suite

Covers R7. Checks V5.

Prerequisites: groups 1 to 3.

- [ ] Run `npm run build:skill` after the last edit, then `npm run verify` and `npm test --prefix mcp/expressivecss`.

Done when V5 passes.
