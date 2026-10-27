# Plan: responsive child sizing

Date: 2026-10-26
Roadmap phase: [Phase 60, responsive child sizing](../../../../roadmap.md#phase-60-responsive-child-sizing)
Branch: `feature/2026-10-26-responsive-child-sizing`
Base: `origin/master` at `a43a5a6a0466d867539e80a97bafd7236f048c04`
Original specification base: `3b9703956823c9c445a0835067915a0e322152a5`
Status: implementation and local checks complete, human visual approval and PR CI pending

The three groups run in order. Requirements are in [requirements.md](requirements.md); acceptance checks are in [validation.md](validation.md). Keep the roadmap unfinished while the merge review remains pending.

## 1. Sass and regression checks

Outcome: the existing child sizing helpers and both resets work at every window-size breakpoint, with current markup retaining its behavior.

Prerequisites: the confirmed interview; no earlier roadmap phase is required.

- [x] Add the three existing sizing helpers and `.flex-initial` and `.shrink-1` to the existing generation pattern in `src/sass/utilities/_helpers.scss`. Remove duplicate standalone definitions. Preserve the relative order of existing flex shorthands and shrink overrides, normal importance and the final ascending breakpoint loop.
- [x] Extend `tests/helpers-browser.test.js` using its `engines` loop. Cover all five helper families just below and at every breakpoint, later-prefix precedence, reversed class attribute order, row and column geometry, and fixed siblings. Retain existing nested sizing checks and close each browser in `finally`.
- [x] Add base-combination and consumer-override checks, including `flex-1 shrink-0`, `flex-1 flex-none`, prefixed shorthand resets and shrink-only resets. Assert computed longhands as well as geometry so tests detect a rule that exists but loses in the cascade.
- [x] Extend `tests/selective-builds.test.js` with a focused helpers-only Sass compile check for base and prefixed forms, and their absence when helpers are excluded. Reuse the installed Sass API and existing compile configuration.

Completion check: after `npm run build`, `node --test tests/helpers-browser.test.js` passes in Chromium, Firefox and WebKit with the new cases executed, and the focused selective-build checks pass. Run suites sequentially. Record the actual commands and results in validation during implementation.

Covers R1, R2, R3, R4 and R5 through V1, V2, V3 and V4.

## 2. Docs and generated guidance

Outcome: the docs and agent guidance name the same classes and explain the reset behavior.

Prerequisites: group 1 establishes the tested declarations and cascade.

- [x] Update the Flex and Window-size prefixes sections in `docs/src/pages/helpers.astro` and `llm.md`. Add reset rows and a base-to-prefixed child example beside a fixed sibling, with a short explanation of minimum sizes and shorthand resets.
- [x] Update the corresponding sections in `skills/expressivecss/expressivecss-usage/references/helpers.md`, which is a maintained source. Extend the existing helper assertions in `tests/expressivecss-skill.test.js` to cover the documented class names and prefix contract.
- [x] Add an Unreleased entry to `CHANGELOG.md`. Keep descriptions limited to Phase 60's five sizing families.
- [x] Run `npm run build:skill`, then `npm run check:generated`. Review the resulting generated diff; make corrections in the sources and regenerate.

Completion check: V5 passes, the docs agree on the five families and breakpoint values, and generated data has no drift. The rendered example remains subject to V8 in group 3.

Covers R6 and the generated-data portion of R7 through V5 and V6.

## 3. Gzip budget and merge checks

Outcome: the implementation has measured bundle costs and complete acceptance evidence for review.

Prerequisites: groups 1 and 2; browser engines and contributor/package tooling available.

- [x] Measure the full minified CSS gzip size using the existing budget test's normalization. Compare with the implementation branch's merge base, add a reviewed size/delta line in `tests/selective-builds.test.js`, and adjust the budget only to the reviewed measured value. Do not invent a size in this specification.
- [x] Rebuild and run the focused browser, helper-guidance and selective-build checks, followed by `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one suite at a time. Install MCP dependencies with `npm ci --prefix mcp/expressivecss` when needed. Regenerate guidance again if covered sources change.
- [x] Run the established visual comparison and inspect the responsive helper example below and above its breakpoint. Record automated captures and assistant inspection separately from human approval. The four Helpers variants differ as expected after the docs additions; the four button-group control variants pass. See V8.
- [x] If integration with Phases 59, 61 or 62 changes shared files, preserve their accepted behavior and rerun affected checks. Recompute the budget against the new merge base after any rebase. Record failures, skips, report paths and remaining blockers in `validation.md`.
- [ ] Obtain BaezFJ's required visual approval, then confirm all R1 to R7 acceptance checks pass, required PR CI succeeds and review conversations are resolved before merge. Local implementation and checks are complete. No PR or CI run was created in this task; merge readiness remains pending.

Completion check: V1 through V8 have passing evidence, all in-scope requirements have coverage, and the merge conditions in `validation.md` are satisfied.

Covers R1 through R7. V6, V7 and V8 complete the checks; rerun affected V1 through V5 checks after changes.

Local work is complete in the implementation commits. The remaining checkbox records merge review, which requires human input and a separately requested PR. The later remote rebase integrated Phase 59 at a43a5a6a0, preserving both implementations and their tests. No integration with Phases 61 or 62 occurred.
