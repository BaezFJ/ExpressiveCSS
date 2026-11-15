# Finished-app rubric: validation

Phase 77. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/expressivecss-skill.test.js`, then `npm run build:skill`, `npm run check:generated`, `npm run verify` and `npm test --prefix mcp/expressivecss`. The root script names are verified in `package.json`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R8, R9, R10 | Current tree. | Run `node --test tests/expressivecss-skill.test.js`. | The new test passes: the inspector names all four `finished-app:` labels, check 3 no longer holds the async-loading clause, and SKILL.md holds `finished-app:` in its anchors, its label-keeping rule and its mismatch rule. It failed once before the rubric existed. | A label is missing, the async clause is still in check 3, or SKILL.md lacks one of the three rules. | Pending |
| V2 | R1 to R7 | `fixtures/settings-a.html`; a fresh subagent briefed with `agents/quality-inspector.md` and the SKILL.md shared context block: bundled guides, browser route unavailable, the saved lint output. | Run the quality inspector lens, twice, each time in a new subagent. | In both runs, exactly one major `finished-app:submit-flow` finding (the disabled submit), one `finished-app:destructive` (delete without Undo) and one `finished-app:url-state` (the tab), and no countable `finished-app:loading` finding. | A defect has no labelled finding, a defect is counted more than once, or the page gets a loading finding it doesn't have. | Pending |
| V3 | R2 to R5, R7 | `fixtures/settings-b.html`, same briefing. | Run the quality inspector lens, twice, each time in a new subagent. | No `finished-app:` finding at major or critical. Polish findings and Blocked items (for example "Undo restores in place, needs a browser") are allowed. | The rubric flags a page that meets every rule at major or above. | Pending |
| V4 | R11 | After the last edit. | Run `npm run build:skill`, then `npm run check:generated`. | Both `contract.json` files carry the new `sourceHash`, and generated files match their sources. | A generated file is stale. | Pending |
| V5 | R1 to R11 | Clean build. | Run `npm run verify`, then `npm test --prefix mcp/expressivecss`. | All checks pass. Known flakes pass on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

None. Every check above needs only an agent, files and the repository's tooling.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent), given the three spec files, the constitution and the base commit. It found 9 defects and 9 suggestions and no broken links. All were fixed in the spec: the SKILL.md rules got a literal-text test (R10), V2 counts labels with severities the inspector proposes itself (R1), the fixtures got neutral names and two runs each, sort left the URL rule because phase 81 doesn't teach it, Back joined the URL rule, the WCAG overlaps keep both IDs (R6), R6 defines the countable finding phase 78 compares, R2 says "Saving…" passes and native posts are out, the changelog's effect on both `contract.json` files and the MCP tests joined R11 and V5, static targets get `[adapt]` notes (R7), the inspector and lens descriptions are updated (R1), and the README claim was corrected.
