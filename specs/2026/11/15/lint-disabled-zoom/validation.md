# Lint disabled zoom: validation

Phase 86. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 to R5 | MCP dependencies installed with `npm ci --prefix mcp/expressivecss`. | `npm test --prefix mcp/expressivecss`, before and after the rule. | It fails before the rule and passes after: every flag case reports `viewport-zoom-disabled`, no pass case does, the two-setting tag gives one finding at line 2 with `[high]`, the single-setting files one each, the standard viewport file exit 0, and each backtracking input finishes under 250ms. | `maximum-scale=1.5`, `maximum-scale=10`, `initial-scale=1.0`, `user-scalable=1` or a description tag is flagged, `maximum-scale=1.0`, `user-scalable=false`, `content` before `name` or the multi-line tag is missed, a tag reports twice or at the wrong line, or an input backtracks. | Before the rule, the CLI case failed (exit 0, "No issues in 1 file(s)."). After it, the smoke passed: every flag and pass case held, the two-setting tag gave only `viewport.html:2:3 viewport-zoom-disabled [high]` with exit 1, the single-setting files one finding each, and the standard viewport exit 0. Each backtracking input took about 1 ms, and so did a copy of the pattern with every cap removed, because each gap stops at `<`, `>` or the closing quote. `npm run verify:packages` passed. Passed 2026-11-15. |
| V2 | R6 | After group 2. | Read the README paragraph and the CHANGELOG entry. | Both name the check. | Either text is missing. | README lint paragraph, `lint.mjs` header and the CHANGELOG Unreleased entry read; all three name the check, and the CHANGELOG entry now covers both phase 85 and phase 86 findings. `npm run check:generated` passed. Passed 2026-11-15. |
| V3 | R7 | Clean build. | `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pass. `npm run verify` at `825f64aa8`: 3,945 of 3,945. After the Codex fixes, which change only the MCP rule and smoke cases, `npm test --prefix mcp/expressivecss` (smoke test included), `check:generated` and `npm run verify:packages` pass at `4d3096bfb`. |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Three blocking defects, all addressed: R4's backtracking inputs couldn't fail, so it adds an unclosed tag that repeats `content=` (1,410ms unbounded in the reviewer's prototype) and puts the new ID in the loop's rule filter; "once per tag" and the location had no check, so R5 lints the two-setting tag and asserts `file:2:<col>` and `[high]`; the threshold row cited a reviewer check of capped zoom that doesn't exist, so it now says a cap between 1 and 2 goes unreported. Also adopted: `user-scalable` flags every value Chromium reads as off, as recalled (recorded as unverified against browser source); `data-name` is excluded; the comment, override, JSX and unquoted cases are recorded; R3 gains multi-line, `;`, `.5`, `0`, `1.00` and uppercase cases; V2 drops `check:generated`; V3 and the plan share one order. Kept: the threshold at 1 or below, which follows the roadmap's wording; the reviewer suggested below 2 as an option for the user.
- 2026-11-15, code review (`code-review high --fix`), 7 findings. Fixed: `maximum-scale=no` and `yes` (Chromium reads 0 and 1); `user-scalable=yes;` and `device-width;` count as off, because Chromium's parser (`html_meta_element.cc`, checked on main) doesn't split on `;`; the README paragraph is rewrapped. Rejected at the time: a later duplicate key overriding an earlier one and number forms like `1e1` are rare; the jsdom rewrite reverses the spec's regex decision. The `name=viewport` text inside another attribute was fixed after Codex raised it again.
- 2026-11-15, `code-review-and-quality`, 5 findings, all fixed: any `maximum-scale` but a device keyword, a negative number or a number above 1 is flagged, including `false` and an empty value; a bare `user-scalable` or `maximum-scale` with no value is flagged; pass cases cover `user-scalable=-1` and `device-height`; the README says the check flags a tag that tries to stop zoom.
- 2026-11-15, Codex review (`codex review --base 83b982730`), two P2, both fixed: the rule now steps over whole attributes, so `name=viewport` inside a description's content can't pass for the name, and the value must be exactly `viewport`; a leading `+` counts as a number, so `maximum-scale=+2` and `user-scalable=+1` pass. Adversarial inputs (200,000 attributes, a million spaces) stay under 5ms.
