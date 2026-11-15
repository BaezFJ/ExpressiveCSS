# Button loading state: validation

Phase 83. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R5 | Built bundle. | `EXPRESSIVECSS_TEST_BROWSER=<engine> node --test tests/busy-buttons-browser.test.js` for each engine, and `node --test tests/shadow-delegation.test.js tests/keypad*.test.js`. | The test passes after failing first: name kept, busy reported, indicator shown, no press or implicit submit reaches a handler while busy, and both do after. | A press reaches a handler while busy, the name changes, nothing reaches a handler afterwards, the unguarded page blocks the click, or an engine is skipped. | Pending |
| V2 | R3, R4 | After group 2. | `node --test tests/expressivecss-skill.test.js tests/docs-coverage.test.js tests/docs-api.test.js tests/semantics.test.js`, `npm run check:generated`. | All pass; the buttons App behavior names `aria-busy`; the export is documented. | A check fails or the export is undocumented. | Pending |
| V3 | R6 | After group 2. | `node --test tests/selective-builds.test.js`. | Passes with the raised JS and CSS budget lines. | A budget is exceeded. | Pending |
| V4 | R6 | Clean build. | `npm run verify`, `npm test --prefix mcp/expressivecss`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pending |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V5 | R1, R2 | A screen reader (VoiceOver, NVDA or JAWS) | Focus a busy Save button and press it. | It announces "Save" and a busy state, and nothing happens on the press. | No | Pending |

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). It confirmed `aria-busy` and a document capture-phase guard and found three blocking defects, all addressed: the show delay ships as a CSS token since the guard needs the attribute at once; the indicator is limited to `#{$_shaped}` buttons, leaving circle, extended, fixed-slot and other components' `::after` buttons alone; and forced colors must keep the indicator visible. Also addressed: the keypad's `requestSubmit()` skips a busy default button; "reports busy" uses Chromium's accessibility tree and records Firefox and WebKit as attribute only; R3 sets `aria-busy` before any `await`, keeps an announcement and gets a byte cap; the plan adds `javascript.astro`, `BEHAVIOR_CONTRACTS`, the README side effects, token declarations, an unguarded control page, a shadow-root case, per-engine runs and the migration note; the menu-close side effect is listed.
