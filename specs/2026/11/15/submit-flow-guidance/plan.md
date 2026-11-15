# Submit flow guidance: plan

Phase 82. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `6334b1811`.

## 1. Guidance

Covers R1 to R4, R7. Checks V1.

- [x] Add the R4 test and watch it fail.
- [x] Write the Text Inputs and Fieldsets `### App behavior` subsections, fix the three examples in `llm.md` and `docs/src/pages/text-inputs.astro`, add the CHANGELOG entry, run `npm run build:skill`.

Done when V1 passes.

## 2. Submit check

Covers R5. Checks V2.

- [ ] Write `scripts/finished-app-submit-empty.mjs`, its npm script and its browser test; run it on the four baseline and phase 79 `settings-form` apps.

Done when V2 passes.

## 3. Stage rerun

Covers R6. Checks V3.

Prerequisites: groups 1 and 2, committed.

- [ ] Build all three prompts twice, review with the baseline trees, confirm, run each prompt's script, record `2026-11-15-guidance-stage` and six rows, add the Submit check section to the evals doc.

Done when V3 passes.

## 4. Suite

Covers R7. Checks V4.

- [ ] `npm run verify`, `npm test --prefix mcp/expressivecss`.
