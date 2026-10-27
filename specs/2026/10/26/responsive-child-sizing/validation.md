# Validation: responsive child sizing

Date: 2026-10-26
Roadmap phase: [Phase 60, responsive child sizing](../../../../roadmap.md#phase-60-responsive-child-sizing)
Branch: `feature/2026-10-26-responsive-child-sizing`
Base: `origin/master` at `a43a5a6a0466d867539e80a97bafd7236f048c04`
Original specification base: `3b9703956823c9c445a0835067915a0e322152a5`
Status: V1 through V7 pass locally, V8 captures complete, human visual approval and PR CI pending

Checks map to [requirements.md](requirements.md) and the groups in [plan.md](plan.md). Results distinguish completed checks from pending checks. Spec review does not establish runtime or merge readiness.

## Setup

Use the contributor runtime and dependencies from `CONTRIBUTING.md`. Build with `npm run build` before testing built bundles. Browser fixtures load `dist/css/expressive.css` and reuse `tests/helpers-browser.test.js` and its `engines` loop. Chromium, Firefox and WebKit must all be available. Close browsers in `finally` blocks and run suites sequentially. Container equivalents documented in `CONTRIBUTING.md` are acceptable when they execute the same checks.

The commands below exist in the checkout, but their Phase 60 results remain unverified. New assertions described here are planned work.

## Automated checks

### V1. Every helper switches at the exact breakpoint

Covers R1, R2 and R4. Plan group 1.

Setup: fixtures for each of the five families with a distinct base value and one prefixed value. Use explicit dimensions and `.min-w-0` or `.min-h-0` where needed to avoid content minimums hiding a shrink change. Keep a fixed sibling with `.flex-none` and a known main-axis size.

Action: after building, run `node --test tests/helpers-browser.test.js`. For each family, measure computed `flex-grow`, `flex-shrink` and `flex-basis` and child/sibling rectangles at 599/600, 839/840, 1199/1200 and 1599/1600 pixels in each engine. Include row and column layouts.

Expected: only the base rule applies just below a boundary; the prefixed declaration applies at the boundary and remains active above it until another prefix overrides it. `.flex-1` has longhands `1 1 0px`, `.flex-none` has `0 0 auto`, and `.flex-initial` has `0 1 auto`. Shrink helpers change only shrink to 0 or 1. The fixed sibling retains its requested main-axis size within 1 CSS pixel. Assert equivalent normalized longhand values if an engine serializes zero differently.

Result: Pass, 2026-10-26. The breakpoint test passed in Chromium, Firefox and WebKit for all five families, both axes and all four boundaries, including resizing back below each boundary. Fixed siblings retained 80px.

### V2. Resets and larger prefixes compose correctly

Covers R1, R2, R3 and R4. Plan group 1.

Setup: a 400px row with a content-sized 80px target and an 80px `.flex-none` sibling. Test `flex-1 medium:flex-initial` and `flex-none medium:flex-1`. Add a constrained 200px row with a 160px target basis, `.min-w-0` and an 80px fixed sibling for `shrink-0 medium:shrink-1`. Include corresponding column cases. Add a child with different sizing at successive prefixes and equivalent markup with class tokens reversed.

Action: use the V1 command, resizing across the selected boundaries and back below them. Read longhands and rectangles. Test a prefixed shorthand over base `.shrink-0`, plus a prefixed shrink-only reset over base `.flex-1`.

Expected: the 400px target changes between 320px remaining-space sizing and 80px initial/content sizing. In the constrained row, shrink-0 retains a 160px target and causes the fixture's expected overflow; shrink-1 permits a 120px target beside the unchanged 80px sibling. Equivalent column main-axis measurements follow the same rule. Larger active prefixes win regardless of token order, and resizing down restores the earlier rule. A shorthand assigns all three flex longhands; `.shrink-1` retains grow and basis.

Result: Pass, 2026-10-26. Breakpoint geometry and prefix-order tests passed in all three engines, including reversed tokens, shorthand resets and shrink-only resets.

### V3. Existing classes and consumer overrides retain their contract

Covers R3 and R4. Plan group 1.

Setup: unprefixed `.flex-1`, `.flex-none`, `.shrink-0`, `flex-1 shrink-0` and `flex-1 flex-none`, with identical fixtures on the base and changed bundles. Include the existing nested flex/grid shrink-and-scroll fixtures and unrelated responsive layout helpers. Add unlayered consumer CSS setting flex longhands on a sizing-helper target.

Action: run the V1 command and compare the relevant base and changed measurements. Reverse class token order in conflicting existing combinations.

Expected: existing longhands and dimensions match the base. `.flex-none` wins over `.flex-1`; `.shrink-0` disables shrinking on a shorthand-sized child. Existing nested scrolling and other responsive helper checks pass. Consumer CSS wins over normal utility declarations. No new `!important` changes that result.

Result: Pass, 2026-10-26. Base combinations and unlayered overrides matched the expected longhands from the original declarations in all three engines. All 51 helper browser checks passed, including existing nested flex/grid scrolling and unrelated responsive helpers. No skips.

### V4. Selective builds emit exactly the requested helpers

Covers R1, R2 and R5. Plan group 1.

Setup: extend the existing Sass API checks in `tests/selective-builds.test.js`. Compile `custom` with `$components: ()` and `$utilities: ("helpers",)` using the existing font opt-out and load paths. Also compile with `$utilities: ()` and inspect the full build.

Action: run `node --test tests/selective-builds.test.js` after building. Check selectors and declarations for five base classes and twenty escaped prefixed classes, media boundaries and the utilities layer.

Expected: full and helpers-only builds contain those rules with the same declarations and breakpoint ordering. The build excluding helpers omits them. No duplicate standalone sizing rules or new TypeScript exports are required.

Result: Pass, 2026-10-26. All five selective-build tests passed, including the new full/helpers-only/excluded sizing check, existing custom Sass configuration tests and the updated gzip budget. The build and typecheck also passed.

### V5. Documentation and helper guidance agree

Covers R6. Plan group 2.

Action: run `node --test tests/expressivecss-skill.test.js` after building and regenerating. Read the updated Flex and Window-size prefixes sections in `llm.md`, `docs/src/pages/helpers.astro` and the maintained helper reference. Check the changelog. Run `npm run docs:build:astro` and `npm run docs:verify`, directly or through V7.

Expected: all sources name the same five families and four prefixes with the agreed declarations and widths. They explain explicit resets, shorthand behavior and content minimums, and show a flexible child beside a fixed sibling. They make no new prefix claim for excluded sizing, self-alignment or ordering classes. The docs build and helper-guidance assertions pass.

Result: Pass, 2026-10-26. All 33 helper/skill guidance tests passed with no skips. Astro built 130 routes; docs verification confirmed 136 HTML pages, 11 aliases and 119 Markdown counterparts. The three maintained references and the changelog agree on the five families and reset contract.

### V6. Gzip size is reviewed and generated data is current

Covers R6 and R7. Plan groups 2 and 3.

Action: build and record the actual full CSS gzip size and merge-base delta in the existing reviewed budget lines of `tests/selective-builds.test.js`. Run that suite. Run `npm run build:skill` after the last relevant source edit, then `npm run check:generated`.

Expected: the recorded numbers match measured artifacts and the budget test passes. Generated guidance and contract metadata match their sources, without hand edits to derived copies. Rerun generation and measurement after integration changes that affect their inputs.

Result: Pass, 2026-10-26. The original implementation measured 90,177 gzip bytes, 105 bytes above base 3b9703956. After the remote rebase, CSS measures 90,471 bytes, 97 bytes above base a43a5a6a0. The reviewed budget passes. `npm run build:skill` and `npm run check:generated` pass; generated changes update the shared contract hashes in the component guides and MCP data.

### V7. Contributor, browser and package checks pass

Covers R3, R5, R6 and R7 as regressions. Plan group 3.

Action: run `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` sequentially. Install MCP dependencies first when needed. Retain the command outcomes and browser-engine evidence. The explicit browser suite checks engine availability; also confirm the focused V1 through V3 cases actually execute in all three engines.

Expected: all commands pass, generated checks and docs verification succeed, package consumers remain valid, and all three browser engines execute the feature cases. A failure or skipped required feature check blocks readiness until resolved or explicitly accepted through a revised specification.

Result: Pass, 2026-10-26, with recorded environment skips. Using the documented Docker runner with `taskset -c 0-3`, `npm run verify` passed with 3,256 passes and 6 skips from 3,262 tests; the explicit browser command passed with 1,576 passes and 6 skips from 1,582 tests. The skips are three optional evaluation-SDK cases and three Firefox map cases without WebGL2. Every Phase 60 case ran. MCP smoke tests and isolated framework/MCP package consumers passed.

## Manual checks

### V8. The responsive example receives visual review

Covers R4, R6 and R7. Plan group 3.

Setup: serve the updated helper docs with the repository's documented preview workflow. Include the base and responsive sizing example beside a fixed sibling, plus a long-content example using the documented minimum-size helper.

Action: open the helper page below and above its demonstrated breakpoint and resize back. Check the fixed sibling, content fit, wrapping and focus visibility. Run `npm run test:visual` or its documented container equivalent and inspect the report. Obtain BaezFJ's review of intended changes and record it in the implementation PR as `CONTRIBUTING.md` requires.

Expected: the target child changes its space allocation, its sibling retains its requested space, and long content stays usable without unintended overlap or clipped focus. Existing visual captures have no unexplained regression. Manual approval and automated capture results are recorded separately; a broken capture does not count as a pass.

Result: Captures and assistant inspection complete, human approval pending. The live example passed the 20 theme/direction/width combinations and enlarged-text check described below. The documented visual runner captured all eight base variants, then reported four Helpers differences and four passing button-group controls. Its nonzero exit records the intended changed-page screenshots, not a passing pixel comparison. BaezFJ has not approved the changes; PR CI has not run.

## Merge conditions

- R1 through R7 have passing V1 through V8 evidence. No required feature case or browser engine is skipped.
- The gzip budget reflects the final merge base and final output; generated data is current.
- Contributor, browser, MCP and package checks pass. After integration changes, rerun the affected checks and remeasure any changed bundle.
- Required CI passes, review conversations are resolved, the branch is up to date and the visual review is recorded under `CONTRIBUTING.md`.
- Any new material decision is resolved or explicitly deferred with dependent work marked blocked. There are currently no open interview decisions. The later `incremental-implementation` request authorized implementation and verified local commits. Push, PR creation, merge and publication remain outside this task.


## Implementation evidence

Group 1 used the documented Docker runner. Logs are local ignored artifacts:

- `.cache/phase60/slice1-boundaries.log`: build and the new boundary test, 3 passes, no failures or skips.
- `.cache/phase60/slice1-regressions.log`: build, all 51 helper browser tests and 2 focused selective Sass checks, all passing.
- `.cache/phase60/slice1-size.log`: compiled the base Sass from Git and the changed Sass in the same container, measuring 90,072 and 90,177 gzip bytes. The fatal-deprecation Sass compile passed.
- `.cache/phase60/slice1-selective.log`: build, all 5 selective-build tests and typecheck passed. The measured 105-byte increase was recorded during group 1 so the intermediate commit passes its budget check.

The first group-1 commit attempt was blocked by Fallow because the combined boundary test had cognitive complexity 22 and local `dist/` was absent. Splitting boundary/axis cases into named tests removed the complexity finding; a container build supplied local ignored artifacts for analysis. The revised helper suite passed all 72 tests with no skips in `.cache/phase60/slice1-split.log`.

Group 2 evidence: `.cache/phase60/slice2-docs.log` records the passing build, 33 guidance tests, Astro build and docs verification. `.cache/phase60/generate.log` and `generated-check.log` record generation and drift checks. The T3 preview loaded the page, but two snapshot calls returned `Preview automation snapshot timed out after 15000ms.` Its requested 839px viewport still reported 1280px. Visual review uses the repository Playwright workflow instead; those preview calls establish no breakpoint or screenshot result.


### Final functional checks

The first unrestricted `npm run verify` attempt recorded 3,248 passes, 7 failures, 1 timeout and 6 skips. Failures affected chart animation, confetti, container signal cleanup, oversized adapter output, hover cards, keypad, marquee and sheet springs. The output is in `.cache/phase60/final-checks.log`. No feature or test source changed in response. All 23 isolated checks covering those cases passed sequentially, then the complete verification passed with CPU affinity limited to cores 0 through 3. This demonstrates intermittent failures; their exact cause was not established.

`.cache/phase60/final-checks-limited.log` records the successful sequence: build and isolated reruns, `npm run verify`, `npm run test:browser`, `npm ci --prefix mcp/expressivecss`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. The runner exported browser evidence to `.cache/container-tests/expressivecss-8e57c08f-6446-4db1-aa03-6a836c4a1cbf/`. Critical flows passed for keyboard and Arabic/touch/reflow profiles in Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2. Isolated consumers verified framework 0.15.0 and MCP server 0.4.1.

The rendered helper example passed 20 combinations of 375, 839, 840, 900 and 1440px widths, light/dark themes and LTR/RTL directions. The fixed sibling retained its width, the target used the expected flex longhands, neither overlapped nor overflowed the page, and 32px root text fitted the compact demo. `.cache/phase60/demo-measurements.json` and `demo-capture.log` retain results. Assistant inspection of `demo-375-light-ltr.png`, `demo-900-light-ltr.png` and `demo-900-dark-rtl.png` confirmed truncation, remaining-space sizing, mirrored placement and visible focus rings. These captures support review; they do not record BaezFJ's approval.


### Visual comparison and remaining merge review

`VISUAL_BASE=3b9703956823c9c445a0835067915a0e322152a5 npm run test:visual:docker -- --grep 'helpers|button-groups' --workers 2` completed both capture passes. All 8 baseline captures passed. The changed pass reported 4 passing button-group controls and 4 Helpers screenshot differences. Captures were stable; each Helpers page gained the documented table rows, prefix explanation and live example. The visual command exited 1 for those differences. `.cache/phase60/visual.log` records the result.

The report is `.cache/container-tests/expressivecss-d63ccb44-2726-4858-9b61-65dfb0575b72/report/index.html`. Expected, actual and diff PNGs are under that directory's sibling `results/`. The Helpers first changed pixel occurs at y=5,684 for Compact, y=4,412 for Expanded, and y=4,264 for Large and Large dark, within the edited helper content. The changed page heights are 23,900, 19,335 and 19,251 pixels respectively. `.cache/phase60/visual-regions.log` records read-only pixel analysis with the already-installed Sharp dependency. No other documentation pages received a visual comparison.

The focused demo captures were inspected by the assistant. BaezFJ's review of the intended Helpers differences remains required by `CONTRIBUTING.md`; these automated results do not replace it. No PR was opened, no CI result is claimed and the roadmap remains unchanged. Local implementation and validation are complete, with merge blocked on human visual approval and the eventual required PR checks.


## Remote rebase on 2026-10-26

At the user's request, the four local commits were rebased onto fetched `origin/master` at `a43a5a6a0466d867539e80a97bafd7236f048c04`, which adds Phase 59's axis-specific gaps through PR #448. The previous local tip was `81b2a5e2835dc6a0178e3f6a495ae8e1c68f8066`. Conflicts in both shared test files and the changelog/prefix references retain both features. The skill generator regenerated 102 conflicted derived files from the merged sources.

Source checks confirmed the Phase 60 helpers partial remains byte-identical to its pre-rebase version, the Phase 59 spacing partial matches the fetched base, and both original browser and selective-build test blocks are preserved. The merged CSS measures 90,471 gzip bytes against the new base's 90,374 bytes, a 97-byte increase. The budget records that measurement. The range comparison is in `.cache/phase60/rebase-range-diff.log`; measurements are in `rebase-size.log`.

The documented Docker runner, limited to cores 0 through 3, passed the build, typecheck and all 132 tests in `tests/helpers-browser.test.js`, `tests/selective-builds.test.js` and `tests/expressivecss-skill.test.js`. No test failed or skipped. These include both phases' cases in Chromium, Firefox and WebKit. Generated-data checks, the Astro build, docs verification and MCP smoke tests also passed. `.cache/phase60/rebase-checks.log` records the sequence, and the runner retained reports in `.cache/container-tests/expressivecss-b8ef5f6b-ec39-4193-8479-241e0c414814/`.

The full contributor suite, full standalone browser suite, isolated package consumers and visual comparison above belong to the pre-rebase revision and were not repeated for this rebase. Prior visual captures do not establish approval of the merged documentation. Human visual approval and eventual PR CI remain pending. Nothing was pushed.
