# Undo snackbar guidance: validation

Phase 80. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 to R4, R8 | Current tree. | `node --test tests/expressivecss-skill.test.js`. | The new test passes after failing first. | A key term is missing, or Syntax or Contract changed. | Pending |
| V2 | R3, R7 | After group 1. | `npm run build:skill`, `npm run check:generated`, `node --test tests/semantics.test.js tests/docs-api.test.js`; measure both subsections. | Generated files current; examples pass; Snackbar App behavior under 2 KB, Lists under 1 KB (asserted in the R4 test). | Any check fails or a subsection is over its cap. | Pending |
| V3 | R5, R6 | Two rebuilt `destructive-list` apps. | Run the script on the two baseline apps first, then build, review, confirm and run it on each rebuild. | The script fails both baseline apps on their confirmation dialog, and passes both rebuilds; the second sequence and the destructive count are recorded; the run set is committed. | The script passes a baseline app, or a rebuild fails the gate after the allowed revisions, or a run set is missing. | Pending |
| V4 | R7 | Clean build. | `npm run verify`, `npm test --prefix mcp/expressivecss`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pending |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Three defects and several suggestions, all addressed: the destructive count is recorded but the browser script gates, since the count can't fail on its own; the script has a committed home, a role-and-name design, a dialog and 500ms removal check, a 2-second recheck and a second two-delete sequence, and must fail both baseline apps first; commit on close is the rule; R1 adds the flag-first order, no `displayLength`, `pagehide` with `keepalive`, commit-failure restore and `replace: true` on every snackbar; R2 adds the double-click guard, restore by id or data model, the empty-state action as focus target and hiding the empty state on Undo; R8 changes the Dialogs example both baseline apps copied; byte caps moved into the test.
