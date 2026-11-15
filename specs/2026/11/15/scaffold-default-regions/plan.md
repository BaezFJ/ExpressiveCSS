# Scaffold default regions: plan

Roadmap [phase 88](../../../../roadmap.md#phase-88-lay-out-the-scaffolds-default-regions). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch `feature/2026-11-15-milestone-scaffold-app-shells` from `origin/master` at `017408139`.

Groups run in order. Build before every test run, since tests read `dist/`. Don't run two test suites at once.

## 1. Semantics row first

Covers R12. Checks V10.

Prerequisites: none.

- [ ] Add the `scaffold` row to `semantics.json` with the three R12 rules and a note naming the component.
- [ ] Add `tests/scaffold.test.js` running the V10 fixtures through the semantics rule runner. Watch it fail once before the row exists.
- [ ] Run `npm run build:semantics`.

Done when the semantics tests pass and each bad fixture is flagged by its own rule.

## 2. Regions, scrolling and readers

Covers R1 to R11, R15, R16. Checks V1 to V9, V15, V16.

Prerequisites: group 1, since the roster test fails for a partial without a row.

- [ ] Create `src/sass/components/_scaffold.scss` with `@use "../abstracts" as *` and a header comment for the anatomy, the region classes, the rail, app bar and toolbar overrides and the excluded limits. `@forward` it from `src/sass/components/_index.scss`.
- [ ] Write the grid (R1), the child and region-class placement (R2), the pane scroller (R3), the rail override (R4), the toolbar placement (R5), the app bar timeline (R8) and the print rule (R10). Scope every selector under `.scaffold` (R11).
- [ ] Add `tests/scaffold-browser.test.js` covering V1 to V9, V15 and V16 in Chromium, Firefox and WebKit (V16 in Chromium), with the V8 fill assertions only where `CSS.supports('timeline-scope', '--a')` and a hard assertion that Chromium supports it.
- [ ] Watch V3 and V4 fail once with the pane scroller and the rail override edited out, then restore them.

Done when V1 to V9, V15 and V16 pass in all three engines.

## 3. Docs and records

Covers R13, R14. Checks V11, V12, V14.

Prerequisites: group 2.

- [ ] Add `docs/src/pages/scaffold.astro` with every R13 example. The live demo bounds its height and uses `.scaffold-pane` instead of `main`.
- [ ] Add the `scaffold` entry to `docs/src/data/nav.ts` after Panes with `styles: ["components/scaffold"]`.
- [ ] Add the Scaffold section to `llm.md`.
- [ ] Add the `scaffold` record to `docs/src/data/component-decisions.json` in catalogue order.
- [ ] Add the Scaffold entry to `layout-material-review.md`, and update `scaffold.md` to map each region to the scaffold.
- [ ] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `remaining.length` in `tests/expressivecss-component-decisions.test.js`, and the reading budget if it grows.
- [ ] Add the Unreleased entry to `CHANGELOG.md`.

Done when V11 and V12 pass.

## 4. Budget, generation and full checks

Covers R14. Checks V13, V17.

Prerequisites: group 3.

- [ ] Commit groups 1 to 3, then pin `sourceRevision` to that branch commit. The milestone pull request's merge needs a follow-up re-pin to its squash commit.
- [ ] Measure the full and selective CSS gzip size against the merge-base build with the sourceMappingURL comment stripped, and add the budget line to `tests/selective-builds.test.js`.
- [ ] Run `npm run build:skill` after the last source edit.
- [ ] Run V17: `npm run verify`, `npm test --prefix mcp/expressivecss`, the MCP smoke test and `npm run verify:packages`. Rerun a known flake alone before debugging it.
- [ ] Record each V result in validation.md.
- [ ] Copy the human checks into the milestone pull request body.

Done when every agent-run check passes and `git status` shows only intended files.
