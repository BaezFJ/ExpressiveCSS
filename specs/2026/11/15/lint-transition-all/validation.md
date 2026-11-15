# Lint transition all: validation

Phase 85. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 to R5 | MCP dependencies installed with `npm ci --prefix mcp/expressivecss`. | `npm test --prefix mcp/expressivecss`, before and after the rule. | It fails before the rule and passes after: every flag case reports `transition-all`, no pass case does, the `raw-color-in-component-style` cases hold, the CLI file gets two findings at lines 1 and 2 and exit 1 and its listed-properties copy exit 0, and each backtracking input finishes under 250ms. | A pass case such as `allow-discrete`, `--transition: all`, `all: unset` or `{ transition: x, all: y }` is flagged, a flag case such as `transition:all` or a `<style>` block is missed, the CLI reports the wrong count or location, or an input backtracks. | Pending |
| V2 | R6 | After group 2. | Read the README paragraph, the `lint.mjs` header and the CHANGELOG entry; run the CLI on the README. | The README names the check and says a stylesheet can be passed; the header lists the checks; the CHANGELOG says CI may now fail; the README gets no `transition-all` finding. | A text is missing or the README trips its own rule. | Pending |
| V3 | R7 | Clean build. | `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pending |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Three blocking defects, all addressed: `raw-color-in-component-style` is an existing non-legacy rule, so the new case table covers it too; whitespace after the colon overlapping the value gap was quadratic in a prototype (163ms at a 500-character gap, 639ms at 2,000), so R2 forbids the overlap and R4 times that input; the claim that the lint skips Markdown held only for the hook. Also adopted: R5 checks two locations, one in a `<style>` block; pass cases that couldn't fail were replaced (`--transition: all 1s`, `all: unset`, `data-x="all"`); `all` is defined as not next to a word character, `-`, `.` or `$` and not followed by a colon, which clears `var(--all)`, `theme.all` and a JS object key; the message no longer claims paint cost; the severity row states what `rules_enforcer` and `quality_inspector` do with `medium`; the `lint.mjs` header and a README worded so it doesn't trip the rule join R6; V2 drops `check:generated`, which reads none of these files; the external stylesheet consequence and the Tailwind `transition-all` class are recorded. Not changed: the mission non-goal row, which the reviewer found weak but backed by the roadmap.
