# Lint transition all: validation

Phase 85. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 to R5 | MCP dependencies installed with `npm ci --prefix mcp/expressivecss`. | `npm test --prefix mcp/expressivecss`, before and after the rule. | It fails before the rule and passes after: every flag case reports `transition-all`, no pass case does, the `raw-color-in-component-style` cases hold, the CLI file gets two findings at lines 1 and 2 and exit 1 and its listed-properties copy exit 0, and each backtracking input finishes under 250ms. | A pass case such as `allow-discrete`, `--transition: all`, `all: unset` or `{ transition: x, all: y }` is flagged, a flag case such as `transition:all` or a `<style>` block is missed, the CLI reports the wrong count or location, or an input backtracks. | Before the rule, the CLI case failed (exit 0, "No issues in 1 file(s)."). After it, the smoke passed: all flag and pass cases held, the CLI reported `transition.html:1:11` and `transition.html:2:16` with exit 1 and the listed copy exit 0. Backtracking inputs took 0.6 ms, 24 ms and 0.1 ms. Passed 2026-11-15. |
| V2 | R6 | After group 2. | Read the README paragraph, the `lint.mjs` header and the CHANGELOG entry; run the CLI on the README. | The README names the check and says a stylesheet can be passed; the header lists the checks; the CHANGELOG says CI may now fail; the README gets no `transition-all` finding. | A text is missing or the README trips its own rule. | README, `lint.mjs` header and CHANGELOG entry read. `expressivecss-lint` on the MCP README, CHANGELOG and `lint.mjs` gave no `transition-all` finding; its one finding is the existing `legacy-material-icons` mention in CHANGELOG line 48. Smoke passed again after the docs. Passed 2026-11-15. |
| V3 | R7 | Clean build. | `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pass. `npm run verify` at `9152527e1`: 3,944 of 3,945. The one failure, phase 83's WebKit busy-button test, also failed in phase 84's run: it read the spinner's opacity after a slow `setContent` had already passed the 300ms delay. The test now reads the computed `animation-delay` and passes in all three engines. After the Codex fix, `check:generated`, the docs build, `docs:verify`, `npm test --prefix mcp/expressivecss` (smoke test included) and `npm run verify:packages` pass. |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Three blocking defects, all addressed: `raw-color-in-component-style` is an existing non-legacy rule, so the new case table covers it too; whitespace after the colon overlapping the value gap was quadratic in a prototype (163ms at a 500-character gap, 639ms at 2,000), so R2 forbids the overlap and R4 times that input; the claim that the lint skips Markdown held only for the hook. Also adopted: R5 checks two locations, one in a `<style>` block; pass cases that couldn't fail were replaced (`--transition: all 1s`, `all: unset`, `data-x="all"`); `all` is defined as not next to a word character, `-`, `.` or `$` and not followed by a colon, which clears `var(--all)`, `theme.all` and a JS object key; the message no longer claims paint cost; the severity row states what `rules_enforcer` and `quality_inspector` do with `medium`; the `lint.mjs` header and a README worded so it doesn't trip the rule join R6; V2 drops `check:generated`, which reads none of these files; the external stylesheet consequence and the Tailwind `transition-all` class are recorded. Not changed: the mission non-goal row, which the reviewer found weak but backed by the roadmap.
- 2026-11-15, code review (`code-review high --fix`), 6 findings. Fixed: an object key `all :` with a spaced colon was flagged. Rejected: `$transition: all` and `@transition: all` are flagged on purpose, because the variable holds a transition on all; a shorthand key `{ transition: x, all }` or a TypeScript `transition: All` is rare and R2 requires case-insensitive matching; prose and comment false positives are accepted in Risks; a value after a `${...}` interpolation isn't read because R2 stops at `{`; multi-line snippets come from snippet code shared by every regex rule.
- 2026-11-15, `code-review-and-quality`, 3 findings, all fixed: quoted keys (`{"transition": "all 1s"}`) are flagged; `$all`, `@all` and `x.transition: all` have pass cases, and `@all` no longer matches.
- 2026-11-15, Codex review (`codex review --base ee38347c0`), one P2, fixed: `all` inside a comment after the value (`transition: opacity 200ms /* all states */`) was flagged. The value now stops at `/`, with a pass case. Codex also said the full smoke run stopped at an unchanged CLI assertion in its sandbox; the same suite passes here.
