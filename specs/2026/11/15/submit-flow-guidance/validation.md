# Submit flow guidance: validation

Phase 82. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 to R4, R7 | After group 1. | `node --test tests/expressivecss-skill.test.js`, `npm run check:generated`, semantics and docs-api tests. | The new test passes after failing first; everything passes. | A term is missing, a cap is exceeded, the Syntax lacks `name` or `autocomplete`, or a check fails. | Pass (2026-11-15): seen failing first ("text-fields App behavior sits between Syntax and Rules"), then the skill tests passed (49 of 49 after the later clause); `check:generated`, semantics and docs-api passed; the Text Inputs section is about 1.5 KB. |
| V2 | R5 | Four fixtures; the baseline and phase 79 `settings-form` apps with a built `dist/`. | Run the browser test, then the script on the four apps. | Two passing fixtures pass and two failing fixtures fail with their reasons; the four apps' results are committed. | A fixture gives the wrong result, or the four results aren't recorded. | Pass (2026-11-15): the four fixtures gave their expected results (two pass, two fail with "submit is disabled before submission" and "focus is not on the first invalid field"); the first run on the old apps exposed a script bug (a `<fieldset>` matched `:invalid`), and after the fix all four old `settings-form` apps pass, committed as `submit-check-baseline.jsonl`. |
| V3 | R6 | Six rebuilt apps. | Build, review, confirm, run each prompt's script. | Both `settings-form` rebuilds pass the submit check; the other scripts' results and every count are recorded; the run set is committed. | A `settings-form` rebuild fails the submit check, or a run set or row is missing. | Pass (2026-11-15, run set `2026-11-15-guidance-stage`, builds from `8c5313123`): both `settings-form` rebuilds pass the submit check; both `destructive-list` rebuilds pass the delete-and-Undo check once its tooltip bug was fixed (run 1 first failed on a focus tooltip's text; `undo-check-fixed.jsonl`), and both `filtered-dashboard` rebuilds pass the URL check. Counts: 2 in total (submit flow 1 in `destructive-list` run 2, URL state 1 in `filtered-dashboard` run 2), against 10 at baseline. |
| V4 | R7 | Clean build. | `npm run verify`, `npm test --prefix mcp/expressivecss`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pass (2026-11-15, at `f929c3e74`): `npm run verify` passed 3,925 of 3,925 and the MCP smoke test passed. |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Three defects and several suggestions, all addressed: the error summary focuses itself and marks no field, so it left the guidance and is recorded as a framework follow-up; native validation shows only one bubble and `.validate` runs on change, so the pattern is `novalidate` plus `Forms.validateField` and focus on the first `aria-invalid` field; the prompt marks nothing required, so the guidance says to mark required fields and the script fails with a reason if none becomes invalid; the form-level text moved to Text Inputs (every form reads it) with a Fieldsets pointer; R3 fixes the label-above placeholder, the email example and the docs page; R2 adds the `type="number"` caution; the script clicks Save, checks a disabled submit before clicking, uses `form.elements`, defines empty, guards navigation, and has four fixtures; R6 adds the Submit check section, the old-app results, the rule for a failed rebuild and the comparison; R4 lists its terms.
