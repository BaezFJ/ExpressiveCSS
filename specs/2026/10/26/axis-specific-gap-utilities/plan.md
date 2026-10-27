# Axis-specific gap utilities implementation plan

Date: 2026-10-26
Roadmap phase: Phase 59, axis-specific gap utilities
Branch: `feature/2026-10-26-axis-specific-gap-utilities`
Base: `origin/master` at `3b9703956823c9c445a0835067915a0e322152a5`
Status: Group 1 complete; Groups 2 and 3 pending

Use the [mission](../../../../mission.md#agreed-scope), [technical constraints](../../../../tech-stack.md#framework-stack) and [roadmap Phase 59](../../../../roadmap.md#phase-59-axis-specific-gap-utilities). The confirmed contract is in [requirements.md](requirements.md); checks are in [validation.md](validation.md). The groups below are the three groups confirmed by the user. Checkboxes record completed implementation work; validation.md records the evidence.

## 1. Sass rules and focused regressions

Outcome: authors set either gap independently with the confirmed scale and cascade.

Prerequisites: confirmed R1 through R4; inspect the shared spacing loops, their index/custom loaders and existing tests. Capture the base CSS gzip measurement using the repository method before changing production Sass.

- [x] Extend `src/sass/utilities/_spacing.scss` using its existing values and breakpoint loop. Emit shorthand before both axis families within each breakpoint level. Preserve existing margin and padding generation and avoid a new public Sass API.
- [x] Extend `tests/helpers-browser.test.js` through its existing `engines` loop for the scale, native axis behavior, breakpoints and cascade. Use grid and wrapping flex fixtures; close browser leases in `finally` blocks.
- [x] Extend `tests/selective-builds.test.js` for a spacing-only custom build and a build excluding spacing. Keep the existing full/default-custom equality check.
- [x] Build the affected bundles and run focused checks sequentially. Confirm the new browser assertions fail against base CSS before treating them as regression evidence.

Delivers R1 through R4. Completion check: V1 through V6 pass in the applicable environments, with no new acceptance test silently skipped. Detailed command and setup requirements remain in validation.md.

## 2. Docs and generated guidance

Outcome: page authors and agents receive the same class names and cascade contract.

Prerequisites: Group 1 implements the confirmed behavior. Inspect the relevant generator inputs before changing derived guidance.

- [ ] Update the helper table and prefix guidance in `docs/src/pages/helpers.astro`; add a live wrapping-grid example using `gap-4 medium:gap-x-2` and explain its unchanged row gap.
- [ ] Update `llm.md` with both families, the scale, all four prefixes, native property meanings, zero resets and shorthand precedence. Distinguish these utilities from the base grid's `.g-*` classes.
- [ ] Add an Unreleased entry to `CHANGELOG.md`. Run `npm run build:semantics` and `npm run build:skill`, keeping source-owned metadata accurate and reviewing generated changes. Do not update source pins or capability evidence without the reviews and checks they require.
- [ ] Run `npm run check:generated` and review the generated helper guidance for agreement with the docs and R1 through R5.

Delivers R5 and the guidance portion of R6. Completion check: V7 passes, the live example demonstrates the roadmap outcome, and generated copies contain no conflicting guidance.

## 3. Browser, size and contributor verification

Outcome: the implementation has recorded acceptance evidence and is ready for required review.

Prerequisites: Groups 1 and 2 complete; Node 24, locked dependencies and all three browser engines available directly or through the repository container workflow.

- [ ] Run V1 through V6 against the final built CSS in Chromium, Firefox and WebKit, including all breakpoint boundaries, zero resets, root scaling, RTL and selective-build compatibility. Record actual results and skips.
- [ ] Measure final CSS gzip bytes with the same toolchain and method as the base. Record both sizes and the delta; update the reviewed CSS budget and its explanatory comment in `tests/selective-builds.test.js` after reviewing that increase.
- [ ] Run V7 and V8 sequentially, including generated checks, contributor verification, explicit browser checks, MCP smoke tests and isolated package consumers. Resolve failures and record any remaining blocker.
- [ ] Run the visual comparison in V9 and inspect the live example at both sides of the breakpoint. Obtain BaezFJ's visual review and record it in the implementation PR. Verify required CI and review conversations before merge.

Delivers R6 and final verification of R1 through R5. Completion check: every validation row has passing evidence, size changes are reviewed, required CI is green and required visual review is recorded. Missing evidence blocks merge. Specification alone does not complete any task or roadmap phase.
