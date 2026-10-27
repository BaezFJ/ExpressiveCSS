# Validation: responsive child sizing

Date: 2026-10-26
Roadmap phase: [Phase 60, responsive child sizing](../../../../roadmap.md#phase-60-responsive-child-sizing)
Branch: `feature/2026-10-26-responsive-child-sizing`
Base: `origin/master` at `3b9703956823c9c445a0835067915a0e322152a5`
Status: pending, no implementation checks have run

Checks map to [requirements.md](requirements.md) and the groups in [plan.md](plan.md). All results below are pending. Spec review does not establish runtime or merge readiness.

## Setup

Use the contributor runtime and dependencies from `CONTRIBUTING.md`. Build with `npm run build` before testing built bundles. Browser fixtures load `dist/css/expressive.css` and reuse `tests/helpers-browser.test.js` and its `engines` loop. Chromium, Firefox and WebKit must all be available. Close browsers in `finally` blocks and run suites sequentially. Container equivalents documented in `CONTRIBUTING.md` are acceptable when they execute the same checks.

The commands below exist in the checkout, but their Phase 60 results remain unverified. New assertions described here are planned work.

## Automated checks

### V1. Every helper switches at the exact breakpoint

Covers R1, R2 and R4. Plan group 1.

Setup: fixtures for each of the five families with a distinct base value and one prefixed value. Use explicit dimensions and `.min-w-0` or `.min-h-0` where needed to avoid content minimums hiding a shrink change. Keep a fixed sibling with `.flex-none` and a known main-axis size.

Action: after building, run `node --test tests/helpers-browser.test.js`. For each family, measure computed `flex-grow`, `flex-shrink` and `flex-basis` and child/sibling rectangles at 599/600, 839/840, 1199/1200 and 1599/1600 pixels in each engine. Include row and column layouts.

Expected: only the base rule applies just below a boundary; the prefixed declaration applies at the boundary and remains active above it until another prefix overrides it. `.flex-1` has longhands `1 1 0px`, `.flex-none` has `0 0 auto`, and `.flex-initial` has `0 1 auto`. Shrink helpers change only shrink to 0 or 1. The fixed sibling retains its requested main-axis size within 1 CSS pixel. Assert equivalent normalized longhand values if an engine serializes zero differently.

Result: pending.

### V2. Resets and larger prefixes compose correctly

Covers R1, R2, R3 and R4. Plan group 1.

Setup: a 400px row with a content-sized 80px target and an 80px `.flex-none` sibling. Test `flex-1 medium:flex-initial` and `flex-none medium:flex-1`. Add a constrained 200px row with a 160px target basis, `.min-w-0` and an 80px fixed sibling for `shrink-0 medium:shrink-1`. Include corresponding column cases. Add a child with different sizing at successive prefixes and equivalent markup with class tokens reversed.

Action: use the V1 command, resizing across the selected boundaries and back below them. Read longhands and rectangles. Test a prefixed shorthand over base `.shrink-0`, plus a prefixed shrink-only reset over base `.flex-1`.

Expected: the 400px target changes between 320px remaining-space sizing and 80px initial/content sizing. In the constrained row, shrink-0 retains a 160px target and causes the fixture's expected overflow; shrink-1 permits a 120px target beside the unchanged 80px sibling. Equivalent column main-axis measurements follow the same rule. Larger active prefixes win regardless of token order, and resizing down restores the earlier rule. A shorthand assigns all three flex longhands; `.shrink-1` retains grow and basis.

Result: pending.

### V3. Existing classes and consumer overrides retain their contract

Covers R3 and R4. Plan group 1.

Setup: unprefixed `.flex-1`, `.flex-none`, `.shrink-0`, `flex-1 shrink-0` and `flex-1 flex-none`, with identical fixtures on the base and changed bundles. Include the existing nested flex/grid shrink-and-scroll fixtures and unrelated responsive layout helpers. Add unlayered consumer CSS setting flex longhands on a sizing-helper target.

Action: run the V1 command and compare the relevant base and changed measurements. Reverse class token order in conflicting existing combinations.

Expected: existing longhands and dimensions match the base. `.flex-none` wins over `.flex-1`; `.shrink-0` disables shrinking on a shorthand-sized child. Existing nested scrolling and other responsive helper checks pass. Consumer CSS wins over normal utility declarations. No new `!important` changes that result.

Result: pending.

### V4. Selective builds emit exactly the requested helpers

Covers R1, R2 and R5. Plan group 1.

Setup: extend the existing Sass API checks in `tests/selective-builds.test.js`. Compile `custom` with `$components: ()` and `$utilities: ("helpers",)` using the existing font opt-out and load paths. Also compile with `$utilities: ()` and inspect the full build.

Action: run `node --test tests/selective-builds.test.js` after building. Check selectors and declarations for five base classes and twenty escaped prefixed classes, media boundaries and the utilities layer.

Expected: full and helpers-only builds contain those rules with the same declarations and breakpoint ordering. The build excluding helpers omits them. No duplicate standalone sizing rules or new TypeScript exports are required.

Result: pending.

### V5. Documentation and helper guidance agree

Covers R6. Plan group 2.

Action: run `node --test tests/expressivecss-skill.test.js` after building and regenerating. Read the updated Flex and Window-size prefixes sections in `llm.md`, `docs/src/pages/helpers.astro` and the maintained helper reference. Check the changelog. Run `npm run docs:build:astro` and `npm run docs:verify`, directly or through V7.

Expected: all sources name the same five families and four prefixes with the agreed declarations and widths. They explain explicit resets, shorthand behavior and content minimums, and show a flexible child beside a fixed sibling. They make no new prefix claim for excluded sizing, self-alignment or ordering classes. The docs build and helper-guidance assertions pass.

Result: pending.

### V6. Gzip size is reviewed and generated data is current

Covers R6 and R7. Plan groups 2 and 3.

Action: build and record the actual full CSS gzip size and merge-base delta in the existing reviewed budget lines of `tests/selective-builds.test.js`. Run that suite. Run `npm run build:skill` after the last relevant source edit, then `npm run check:generated`.

Expected: the recorded numbers match measured artifacts and the budget test passes. Generated guidance and contract metadata match their sources, without hand edits to derived copies. Rerun generation and measurement after integration changes that affect their inputs.

Result: pending. Size and delta are unknown until implementation.

### V7. Contributor, browser and package checks pass

Covers R3, R5, R6 and R7 as regressions. Plan group 3.

Action: run `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` sequentially. Install MCP dependencies first when needed. Retain the command outcomes and browser-engine evidence. The explicit browser suite checks engine availability; also confirm the focused V1 through V3 cases actually execute in all three engines.

Expected: all commands pass, generated checks and docs verification succeed, package consumers remain valid, and all three browser engines execute the feature cases. A failure or skipped required feature check blocks readiness until resolved or explicitly accepted through a revised specification.

Result: pending.

## Manual checks

### V8. The responsive example receives visual review

Covers R4, R6 and R7. Plan group 3.

Setup: serve the updated helper docs with the repository's documented preview workflow. Include the base and responsive sizing example beside a fixed sibling, plus a long-content example using the documented minimum-size helper.

Action: open the helper page below and above its demonstrated breakpoint and resize back. Check the fixed sibling, content fit, wrapping and focus visibility. Run `npm run test:visual` or its documented container equivalent and inspect the report. Obtain BaezFJ's review of intended changes and record it in the implementation PR as `CONTRIBUTING.md` requires.

Expected: the target child changes its space allocation, its sibling retains its requested space, and long content stays usable without unintended overlap or clipped focus. Existing visual captures have no unexplained regression. Manual approval and automated capture results are recorded separately; a broken capture does not count as a pass.

Result: pending. No visual or browser review occurred during specification.

## Merge conditions

- R1 through R7 have passing V1 through V8 evidence. No required feature case or browser engine is skipped.
- The gzip budget reflects the final merge base and final output; generated data is current.
- Contributor, browser, MCP and package checks pass. After integration changes, rerun the affected checks and remeasure any changed bundle.
- Required CI passes, review conversations are resolved, the branch is up to date and the visual review is recorded under `CONTRIBUTING.md`.
- Any new material decision is resolved or explicitly deferred with dependent work marked blocked. There are currently no open interview decisions. This specification authorizes no implementation, commit, push, PR, merge or publication.
