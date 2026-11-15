# Finished-app rubric: plan

Phase 77. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch `feature/2026-11-15-milestone-apps-that-feel-finished` from `origin/master` at `d38f43d8e`.

Groups run in order. Build before any test run, since tests read `dist/`. Don't run two test suites at once.

## 1. Fixture pages

Covers R2 to R5. Checks V2, V3.

Prerequisites: none.

- [x] Write `fixtures/settings-a.html`: a settings page with link Tabs (Profile, Members) and no code that writes the URL, a profile form whose submit button stays `disabled` until both fields are valid, and a members list whose delete buttons remove the row with no Undo and no confirmation. Everything else meets the rubric: the form posts natively with `required` fields and inline `.validate` error text, fields carry `name`, `type`, `autocomplete` and `spellcheck="false"` on the email. No comment or name describes a defect.
- [x] Write `fixtures/settings-b.html`: the same page with the three defects fixed. Submit stays enabled, delete removes the row and shows a Snackbar with an Undo action that reinserts the row at its old index, and the page writes the tab with `history.replaceState` on `expressive:change`.
- [x] Run the lint on both fixtures from a temp directory (`node mcp/expressivecss/lint.mjs`) and keep the output for the briefings.

Done when both files exist and the lint output for each is saved.

## 2. Rubric in the inspector and the orchestrator

Covers R1 to R10. Checks V1.

Prerequisites: none.

- [x] Add the R10 test to `tests/expressivecss-skill.test.js` and watch it fail against the current files.
- [x] Add check 5, "Finished-app behavior", to `skills/expressivecss-review/agents/quality-inspector.md` with the four labelled areas and their proposed severities (R1 to R5), the counting rule (R6) and the evidence rule (R7). Update the opening line.
- [x] Remove the async-loading clause from check 3 (R9) and note the rubric label in the Return format.
- [x] Add the rubric anchors, the label-keeping rule, the mismatch rule and the lens line to `skills/expressivecss-review/SKILL.md` (R1, R8).
- [x] Run the test and see it pass.

Done when `node --test tests/expressivecss-skill.test.js` passes.

## 3. Review the fixtures with the new rubric

Covers R1 to R7. Checks V2, V3.

Prerequisites: groups 1 and 2.

- [x] Run the quality inspector lens twice on `fixtures/settings-a.html`, each in a fresh subagent briefed with the agent file path and the SKILL.md shared context block (bundled guides, browser route unavailable, the saved lint output).
- [x] Run it twice on `fixtures/settings-b.html` the same way.
- [x] Record the model and the labelled findings of each run in `validation.md`. If a run misses a defect or flags the clean page, fix the rubric wording and rerun all four.

Done when V2 and V3 pass.

## 4. Changelog, generated files and the suite

Covers R11. Checks V4, V5.

Prerequisites: groups 2 and 3.

- [x] Add the Unreleased CHANGELOG entry.
- [x] Run `npm run build:skill` after the last edit and commit the regenerated `contract.json` files.
- [x] Run `npm run verify`, then `npm test --prefix mcp/expressivecss`.

Done when V4 and V5 pass.
