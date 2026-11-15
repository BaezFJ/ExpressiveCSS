# URL state guidance: plan

Phase 81. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `6f86e1629`.

## 1. `showPage`

Covers R1 to R3. Checks V1.

- [x] Add the R2 tests and watch them fail.
- [x] Add `showPage` to `src/ts/behaviors/dataTables.ts`, document it there, in `llm.md` and in `docs/src/pages/data-table.astro`, add it to `.fallowrc.json` `usedClassMembers`, add the browser case, and raise the gzip budget with a reviewed line.

Done when V1 passes.

## 2. Guidance

Covers R4, R5, R8. Checks V2.

- [x] Write the Tabs and Data table `### App behavior` subsections, the guide test, the CHANGELOG entry, then `npm run build:skill`.

Done when V2 passes.

## 3. URL state check

Covers R6. Checks V3.

- [ ] Write `scripts/finished-app-url-state.mjs`, its npm script and its browser test with two fixtures; run it on both baseline dashboards (both should fail).

Done when V3 passes.

## 4. Rebuild, review, check

Covers R7. Checks V4.

Prerequisites: groups 1 to 3, committed.

- [ ] Build `filtered-dashboard` twice, review with the baseline trees, confirm, run the script, record the run set and rows, and name the script in `docs/agents/finished-app-evals.md`.

Done when V4 passes or the R7 limit is reached and recorded.

## 5. Suite

Covers R8. Checks V5.

- [ ] `npm run verify`, `npm test --prefix mcp/expressivecss`.
