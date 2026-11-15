# Anchored heading offset: validation

Phase 84. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | Built CSS. | Run the browser test once per engine with `EXPRESSIVECSS_TEST_BROWSER`. | It fails before the change and passes after: the heading's top is at or below the bar's bottom for small, `.medium` and `.large` bars (with and without a subtitle) and a collapsed `.large` bar; at the top without a bar, with only a demo bar, or with the token set to 0; dialog and pane headings get no offset, and a scrollspy target keeps its own. | The heading sits under the bar, a page without a bar moves, or the scrollspy offset changes. | Pass. Failed in Chromium before the change (heading top 0, bar bottom 64); passes in Chromium, Firefox and WebKit at the phase's final commit. |
| V2 | R3 | After group 2. | Skill, docs, tokens and selective-builds tests, `npm run check:generated`. | All pass with the new budget line. | A check fails. | Pending |
| V3 | R4 | Six rebuilds. | Build, review, run each prompt's script. | The run set and six rows are committed; script results and counts are recorded. | A run set or row is missing. | Pending |
| V4 | R5 | Clean build. | `npm run verify`, `npm test --prefix mcp/expressivecss`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pending |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Five defects, all addressed: subtitle heights are medium 136 and large 152, keyed on `hgroup > p`; a collapsed flexible bar falls back to the small offset; the root rule is scoped to `body > header` so demos in articles, cards and dialogs don't count; values use `rem()` so a larger font keeps up; the docs name the wrapping small bar as a case to override. Also adopted: the token is `--md-comp-top-app-bar-anchor-offset` so the tokens test covers it; headings in dialogs are left out; the migration note covers an existing `scroll-padding-top`; the docs page is `navbar.astro`; V1 gains the large-with-subtitle, demo-only and dialog cases.
