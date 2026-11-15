# Anchored heading offset: validation

Phase 84. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | Built CSS. | Run the browser test once per engine with `EXPRESSIVECSS_TEST_BROWSER`. | It fails before the change and passes after: the heading's top is at or below the bar's bottom for a small and a `.medium` bar, at the top without a bar, and a scrollspy section keeps its offset. | The heading sits under the bar, a page without a bar moves, or the scrollspy offset changes. | Pending |
| V2 | R3 | After group 2. | Skill, docs, tokens and selective-builds tests, `npm run check:generated`. | All pass with the new budget line. | A check fails. | Pending |
| V3 | R4 | Six rebuilds. | Build, review, run each prompt's script. | The run set and six rows are committed; script results and counts are recorded. | A run set or row is missing. | Pending |
| V4 | R5 | Clean build. | `npm run verify`, `npm test --prefix mcp/expressivecss`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pending |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record
