# Finished-app rubric: validation

Phase 77. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/expressivecss-skill.test.js`, then `npm run build:skill`, `npm run check:generated`, `npm run verify` and `npm test --prefix mcp/expressivecss`. The root script names are verified in `package.json`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R8, R9, R10 | Current tree. | Run `node --test tests/expressivecss-skill.test.js`. | The new test passes: the inspector names all four `finished-app:` labels, check 3 no longer holds the async-loading clause, and SKILL.md holds `finished-app:` in its anchors, its label-keeping rule and its mismatch rule. It failed once before the rubric existed. | A label is missing, the async clause is still in check 3, or SKILL.md lacks one of the three rules. | Pass (2026-11-15): seen failing first with "the inspector lacks finished-app:loading", then the whole file passed 44 of 44. |
| V2 | R1 to R7 | `fixtures/settings-a.html`; a fresh subagent briefed with `agents/quality-inspector.md` and the SKILL.md shared context block: bundled guides, browser route unavailable, the saved lint output. | Run the quality inspector lens, twice, each time in a new subagent. | In both runs, exactly one major `finished-app:submit-flow` finding (the disabled submit), one `finished-app:destructive` (delete without Undo) and one `finished-app:url-state` (the tab), and no countable `finished-app:loading` finding. | A defect has no labelled finding, a defect is counted more than once, or the page gets a loading finding it doesn't have. | Pass (2026-11-15, third round, Claude Code Explore subagents): both runs gave exactly one major `submit-flow` (line 31), one `destructive` (the remove handler, counted once for three rows) and one `url-state` (the tab strip), and called loading not applicable. Their other findings carry no rubric label (focus after removal under 2.4.3, the empty list under check 3). |
| V3 | R2 to R5, R7 | `fixtures/settings-b.html`, same briefing. | Run the quality inspector lens, twice, each time in a new subagent. | No `finished-app:` finding at major or critical. Polish findings and Blocked items (for example "Undo restores in place, needs a browser") are allowed. | The rubric flags a page that meets every rule at major or above. | Pass (2026-11-15, third round): both runs passed all four areas and gave one unlabelled major, the missing empty state. Earlier rounds failed: see "Fixture and rubric fixes while building" below. |
| V4 | R11 | After the last edit. | Run `npm run build:skill`, then `npm run check:generated`. | Both `contract.json` files carry the new `sourceHash`, and generated files match their sources. | A generated file is stale. | Pass (2026-11-15): `build:skill` changed only the contract SHA-256 line in the 100 guides, `component-guides.json` and both `contract.json` files; `check:generated` reported SEMANTICS.md and the 100 guides current. |
| V5 | R1 to R11 | Clean build. | Run `npm run verify`, then `npm test --prefix mcp/expressivecss`. | All checks pass. Known flakes pass on a lone rerun. | Any check fails on rerun. | Pass (2026-11-15): `npm run verify` exited 0 with 3,904 of 3,904 tests and `verify-site` reporting 140 pages; the MCP smoke test passed (8 tools). |

### Fixture and rubric fixes while building

- Round 1 (2026-11-15): both settings-a runs passed. Both settings-b runs failed on fixture bugs. The fixtures never called `Expressive.AutoInit()` (the bundle does not call it, per `expressivecss-install/SKILL.md`), and Undo reinserted the row at an index taken after earlier removals, so two Undos swapped Ana and Ben. Both fixtures gained the call, and settings-b now restores by a `data-order` taken at load.
- Round 2: settings-a passed twice. One settings-b run gave two major `finished-app:destructive` findings: focus lost when the focused row is removed, and a second Undo waiting behind the first snackbar. The other run called the queue polish. The rubric now says a queued Undo is polish and lost focus is a check 4 finding, and settings-b moves focus to a neighbour before removal and passes `replace: true`.
- Fixture behavior in Chromium (Playwright script in the session scratchpad, run against the built `dist/`): selecting Members writes `#members`; removing Ana focuses Ben's button; removing Ben, then Undo, leaves Ben, Chen with no snackbar left; settings-a's Save starts disabled; no console errors.

## Human checks

None. Every check above needs only an agent, files and the repository's tooling.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent), given the three spec files, the constitution and the base commit. It found 9 defects and 9 suggestions and no broken links. All were fixed in the spec: the SKILL.md rules got a literal-text test (R10), V2 counts labels with severities the inspector proposes itself (R1), the fixtures got neutral names and two runs each, sort left the URL rule because phase 81 doesn't teach it, Back joined the URL rule, the WCAG overlaps keep both IDs (R6), R6 defines the countable finding phase 78 compares, R2 says "Saving…" passes and native posts are out, the changelog's effect on both `contract.json` files and the MCP tests joined R11 and V5, static targets get `[adapt]` notes (R7), the inspector and lens descriptions are updated (R1), and the README claim was corrected.
- 2026-11-15, `/code-review high --fix --max-findings all` (built-in, forked) on the branch. Six findings, all confirmed against the source and fixed: the placeholder polish rule clashed with the floating-label `placeholder=" "` (both files now pass it); SKILL.md's anchors missed the misplaced Undo, the queued Undo and usernames; the loading polish line read as covering a kept "Save" label; the label-keeping rule covered only moves into section 4; the test's slice guard missed an absent end marker; and dropping the async clause stopped check 3 from flagging non-button controls whose request shows no progress (check 3 now keeps those, see R9). `node --test tests/expressivecss-skill.test.js` passed 44 of 44 and `npm run check:generated` reported everything current after the fixes.
