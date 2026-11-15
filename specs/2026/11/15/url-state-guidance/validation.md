# URL state guidance: validation

Phase 81. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 to R3 | Built bundle. | `node --test tests/data-tables-page.test.js` and the docs coverage tests. | The new `showPage` tests pass after failing first; coverage passes. | A case misbehaves, an event fires, a server-owned table changes, or the method is undocumented. | Pending |
| V2 | R4, R5, R8 | After group 2. | `node --test tests/expressivecss-skill.test.js`, `npm run check:generated`, semantics and docs-api tests. | The guides carry both App behavior sections under their caps; everything passes. | A section is missing, over its cap, or a check fails. | Pending |
| V3 | R6 | Two fixtures and the two baseline dashboards. | Run the browser test, then the script on both baseline dashboards. | The URL-keeping fixture passes and the other fails; both baseline dashboards fail. | A fixture gives the wrong result or a baseline dashboard passes. | Pending |
| V4 | R7 | Two rebuilt `filtered-dashboard` apps. | Build, review, confirm, run the script. | Both rebuilds pass the script; counts are recorded; the run set is committed. | A rebuild fails the script after the allowed revisions, or a run set is missing. | Pending |
| V5 | R8 | Clean build. | `npm run verify`, `npm test --prefix mcp/expressivecss`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pending |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record
