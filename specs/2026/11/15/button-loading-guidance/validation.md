# Button loading guidance: validation

Phase 79. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, `npm run build:skill`, `node --test tests/expressivecss-skill.test.js`, `npm run check:generated`, the build and review commands in `docs/agents/finished-app-evals.md`, `npm run verify`, `npm test --prefix mcp/expressivecss`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R4 | Current tree. | Run `node --test tests/expressivecss-skill.test.js`. | The new test passes after failing before the change; the budget test passes with its new line. | The guide lacks the section or a required phrase, "App behavior" shows under "Also documented", or the budget fails. | Pass (2026-11-15): seen failing first ("✖ the buttons guide carries the App behavior subsection"), then 45 of 45 passed; the budget test passed at 51,939 bytes with its new line, and at 51,947 after the review wording. |
| V2 | R1 | After group 1, before group 2 (the generator is not a contract input, so no hash changes). | Run `npm run build:skill` and `git diff --stat skills mcp`. | No generated file changes. | Any generated file changes before any section has the subsection. | Pass (2026-11-15): after the generator change, `npm run build:skill` left `git status --short skills mcp` empty. |
| V3 | R1, R3 | After group 2. | Diff `skills/expressivecss/components/buttons.md` against its group 1 version. | The only changes are the contract hash and the new `#### App behavior` block between Syntax and Rules; Contract and Syntax are byte-identical. | Contract or Syntax changed, the block is missing or misplaced, or it ends with `---`. | Pass (2026-11-15): the buttons guide diff is the contract hash line plus the `#### App behavior` block between Syntax and Rules; the R4 test asserts Contract and Syntax are unchanged and the block holds no `---`. The subsection is 1,470 bytes, 1,477 after the review wording. |
| V4 | R5, R6 | The two rebuilt `settings-form` apps. | Build, review and confirm under the procedure. | Each run's record lists which R2 elements it implements, and each run has zero countable `finished-app:loading` findings; every run set and its rows are committed. | A run keeps a countable loading finding inside the guidance's scope after the allowed revisions, or a run set is missing. | Pass (2026-11-15, run set `2026-11-15-phase-79`, builds from `180d83a89`, reviews with the baseline trees): both runs implement all seven R2 elements by a source search, load cleanly in Chromium, and score 0 for loading; run 1 has one confirmed submit-flow count (an invalid phone `pattern`), run 2 has none. No revision was needed. |
| V5 | R7 | Clean build. | `npm run verify`, `npm test --prefix mcp/expressivecss`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pass (2026-11-15, at `9d351ecb4`): `npm run verify` passed 3,905 of 3,905 with `verify-site` reporting 140 pages, and the MCP smoke test passed (8 tools, aggregate response budgets). |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Nine defects and several suggestions, all addressed: V2 now expects no generated change, since the generator isn't a contract input; R4 asserts order, key values and Contract/Syntax stability; R3 and a new exclusion say the MCP tools don't return the section; the guard moved to the `submit` handler after `preventDefault()`, with a `finally` that clears the pending state; the indicator keeps its enforced role and name while the words go in one persistent region or a Snackbar; the generator cuts the subsection out before building the other parts and strips the trailing `---` and relative links; `tests/semantics.test.js` and the guide-wide link test joined the readers; R6 revises only for findings inside the guidance's scope, commits every run set, and each run records which R2 elements it implements; the subsection is capped at 1.5 KB; and the limitation of the completion check is stated.
- 2026-11-15, `/code-review high --fix --max-findings all` (built-in, forked) on `7aa6623b5..HEAD`. Ten findings, all confirmed. Fixed by the review: `splitAppBehavior` takes fenced code whole, so a `#` or `---` line in an example can't end the subsection, and strips relative links only outside code, through shared `mapProse` and `stripRelativeLinks` helpers. Fixed by me: `finally` now cancels the indicator's timer and waits out its 500ms before clearing; the indicator's space is reserved with `visibility: hidden` so the button doesn't move; `generatedGuides` throws when an App behavior heading doesn't render in a guide (seen firing on a mis-leveled heading, then passing); the CHANGELOG says the subsection sits one level below the component heading; the test's slice ends at the next `\n#### `; the plan describes the cut. Generated output was byte-identical across the generator fix. The guidance wording changed after the phase 79 runs; both runs already implemented the timer handling, and the change is recorded here rather than rerun. Not done: unit tests for `splitAppBehavior`, since the generator runs on import; the build-time heading check stands in for them.
