# Motion token timing validation

Date: 2026-10-26
Roadmap phase: [Phase 57, read motion tokens for hardcoded transition timings](../../../../roadmap.md#phase-57-read-motion-tokens-for-hardcoded-transition-timings)
Branch: `fix/motion-token-timings`
Base: local `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

Results were recorded on 2026-10-26. Contributor and package verification passed. The separate browser run needed three isolated reruns, all passing. Visual captures and built-docs checks completed; BaezFJ's visual approval remains pending.

## Setup

Use Node 24 and the locked dependencies from `npm ci`. Install MCP dependencies with `npm ci --prefix mcp/expressivecss` before its checks. Run `npm run build` before focused tests, since tests read `dist/`. Host browser checks require the Playwright Chromium, Firefox and WebKit binaries and their system libraries. `CONTRIBUTING.md` also documents `npm run test:docker -- <command>` and `npm run test:packages:docker` for isolated execution.

The new `tests/motion-token-timings-browser.test.js` is implemented. Focused checks ran in the repository Docker image with Chromium, Firefox and WebKit. Commands below come from `package.json` and `CONTRIBUTING.md`. Host browser availability was not used as evidence.

The focused fixture loads the built CSS and IIFE, creates a real Timepicker and an expanding card with direct-child detail content, and reads their computed styles. Use the established `tests/browser.js` engine loop and resource cleanup in `finally`. Do not initialize components in static semantics checks. Run suites sequentially.

## Automated acceptance checks

Run V1 to V4 with `node --test tests/motion-token-timings-browser.test.js` after that file exists and the bundles are built. Each must run in Chromium, Firefox and WebKit without skips. Parse computed transition lists by property and normalize time units before comparing.

| ID | Requirement | Action and setup | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1 | With normal motion and no overrides, read `.timepicker-canvas`. Set `--md-sys-motion-duration-short3: 430ms` on the document root and read again without recreating the instance. Toggle the canvas opacity state. | Its opacity duration changes from 150ms to 430ms. The existing easing and opacity states remain intact. The base build instead keeps 175ms, proving this check detects the change. | Passed in all three engines. The base build failed at 175ms versus 150ms; the changed build reads 150ms and follows the 430ms override. |
| V2 | R2 | Open the expanding card and read the direct-child content's opacity and transform delays. Set `--md-sys-motion-duration-short4: 470ms` on the document root and read again. | Both content delays change from 200ms to 470ms. Existing spring durations and easing remain unchanged. The base build keeps 180ms. | Passed in all three engines. The base build kept 180ms; the changed build reads 200ms and follows the 470ms override without changing spring durations. |
| V3 | R2 | With the system override still set, set `--md-comp-expanding-card-content-delay: 90ms` on the article, then `0ms`. Remove the component override and read again. | Both delays become 90ms, then zero, then return to the overridden system value of 470ms. The change requires no rebuild or component initialization. The base build ignores the new component property. | Passed in all three engines for 90ms, zero and fallback restoration to 470ms. The base build ignored the component property and kept 180ms. |
| V4 | R3 | Use nonzero system overrides and a nonzero component delay. Start with reduced motion enabled, then separately switch an active normal-motion effect to reduced motion. Trigger the canvas and content state changes. | Both targets reach their intended final opacity/transform states and have no running CSS transitions. Preserve the local resets. A computed delay alone need not be zero when a more specific authored delay remains; `transition-property: none` must prevent animation. | Passed all six cases in all three engines, on both the base and changed CSS. Active effects were paused before changing preference; neither target retained an animation under reduced motion. |
| V5 | R1 to R4 | After adding the focused compiled-style assertions, run `node --test tests/expanding-card.test.js tests/reduced-motion.test.js`. Inspect the two shared Sass rules and their compiled output. | The canvas references `short3`; the article declares the new property backed by `short4`; expanded content consumes it. Both local reduced-motion resets remain. Only the agreed timing rules change. | Passed in the focused Docker run. Both token references and existing local resets are present in the built sheet. |

## Regression and release checks

| ID | Requirement | Action and setup | Expected result | Result |
| --- | --- | --- | --- | --- |
| V6 | R4 | Run `node --test tests/expanding-card-browser.test.js tests/timepicker-seconds.test.js tests/timepicker-seconds-browser.test.js tests/timepicker-time-range.test.js tests/timepicker-time-range-browser.test.js tests/spring-motion-browser.test.js`. Inspect the diff for unrelated transition and TypeScript changes. | Existing opening, closing, interruption, focus, seconds, range and motion-preference behavior passes. Timepicker timers and its `duration` option, dial timing, card close-button delay and spring pairs remain unchanged. | Passed with V1 to V5 in the focused Docker run: 105 tests, zero failures or skips. The source diff changes only the two timing values and the new component property; no TypeScript changes. |
| V7 | R5 | Run `node --test tests/selective-builds.test.js` after rebuilding. Review the docs, `llm.md`, changelog and budget line. | The reviewed CSS gzip measurement passes. Documentation gives 150ms and 200ms defaults, both system controls, the card component override and the separation from JavaScript timers. No new dependencies or runtime API ship. | Passed. Four selective-build tests pass. CSS gzip is 90,049 bytes, up 4 from 90,045. Docs, llm.md, the changelog and reviewed budget line record the agreed controls and defaults. |
| V8 | All | After regenerating guidance from final sources, run `npm run check:generated`, `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss`, and `npm run verify:packages`, one at a time. | Generated data agrees with its sources, contributor checks and all three browser engines pass, and MCP/package consumers pass. Record each result and any skip or rerun. Generation does not renew source reviews or browser evidence. | Contributor verification passed: 3,220 passes, six skips, zero failures. Generated-data and docs checks passed. The separate browser suite recorded 1,540 passes, one failure, two cancellations and six skips; all three affected cases passed individually afterward. MCP smoke tests and both isolated package consumers passed. See the detailed run record below. |

For failing-before evidence, use the base Sass or a separate base build with the new tests present. Preserve the feature work and record the exact source revision and failures. A failure caused by a missing browser, fixture error or absent bundle does not establish that a regression test detects the timing change. Restore the feature build before recording passing-after results.

## Manual and visual checks

| ID | Requirement | Action and setup | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | R1 to R5 | Run `npm run test:visual`, inspect its report with `npm run test:visual:report`, and retain the report path. View the Timepicker and expanding-card examples at default timings and with the documented overrides; repeat with reduced motion. Obtain BaezFJ's review of intended visual changes in the implementation PR. | Captures complete, unrelated layout changes are absent, both timing controls visibly affect their targets, and reduced motion stops both effects. BaezFJ records visual approval. Static screenshots alone do not prove timing behavior. | Captures completed for both pages at all four variants, with eight screenshot differences after the added documentation paragraphs. The visual command exited 1 for differences, not a passing comparison. Representative large diffs and built-docs screenshots were inspected. Default/custom timing and reduced-motion probes passed. BaezFJ's visual approval remains pending. |

## Requirement coverage

| Requirement | Planned work | Observable checks |
| --- | --- | --- |
| R1 | Groups 1, 2 and 3 | V1, V4, V5, V8, V9 |
| R2 | Groups 1, 2 and 3 | V2, V3, V4, V5, V8, V9 |
| R3 | Groups 1 and 2 | V4, V5, V6, V8, V9 |
| R4 | Groups 1 and 2 | V1, V2, V5, V6, V8 |
| R5 | Group 3 | V7, V8, V9 |

## Merge conditions

- V1 to V9 have recorded evidence, including failures on the base timing rules and passes on the feature build. All three engines run the new acceptance checks without skips.
- Every in-scope acceptance and affected regression check passes. Investigate failures; record isolated reruns and run any verification steps a failure prevented.
- Gzip review, generated guidance and source/evidence reviews are current. BaezFJ records the required visual approval, and required CI and review conversations are resolved.
- The implementation branch is current with `master`, compatibility remains as R4 specifies, and the intentional default timing changes appear in the release notes.
- The specification leaves the roadmap completion state unchanged. Implementation, commits, push, pull request creation, merge and publication require separate instructions.

## Execution evidence

The base source was `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`. The corrected base run recorded nine expected assertion failures across the three engines, three failing parent tests, and six passing reduced-motion tests. An earlier fixture error called a nonexistent Timepicker `open()` method; that run is excluded from regression evidence. The corrected fixture uses the existing inline clock. Logs are `.cache/phase57/base.log` and `.cache/phase57/focused.log`.

The focused command was `npm run test:docker -- sh -c 'npm run build && node --test tests/motion-token-timings-browser.test.js tests/expanding-card.test.js tests/reduced-motion.test.js tests/expanding-card-browser.test.js tests/timepicker-seconds.test.js tests/timepicker-seconds-browser.test.js tests/timepicker-time-range.test.js tests/timepicker-time-range-browser.test.js tests/spring-motion-browser.test.js'`. Container reports are in `.cache/container-tests/expressivecss-8daaa3d5-3256-4ca3-8dbe-72195c0f2a14/`.

`npm run check:generated` and the 15 component-decisions tests passed after `npm run build:skill`. All 99 regenerated component guides differ only in their contract hash. Capability source pins for both changed Sass files were already stale on the base revision; they remain unchanged. These focused timing checks do not establish a new full component review.

### Full verification and isolated reruns

`npm run verify` completed in the Docker run exported to `.cache/container-tests/expressivecss-0ed1c97c-d4e7-4393-809b-ca6e5aec4dc2/`. Its test phase ran 3,226 tests with 3,220 passes, six skips and no failures. Three skips require the optional evaluation SDK; three Firefox map checks report missing WebGL2. The generated-data check, typecheck and docs build/verification passed.

The following `npm run test:browser` ran 1,549 tests and exited nonzero. It recorded one assertion failure, two timeout cancellations and six skips. The phase 57 timing tests passed in every engine. These unrelated cases passed in the contributor run and then passed individually after the browser run:

- `tests/defer-render-browser.test.js`, Chromium focus ring in a deferred row. The browser run timed out after 60 seconds; its isolated rerun passed.
- `tests/keypad-browser.test.js`, Firefox keypad and keyboard input. The browser run timed out after 30 seconds; its isolated rerun passed.
- `tests/sheet-spring-browser.test.js`, Chromium sheet motion preference change. The browser run still observed an active spring; its isolated rerun passed.

The reruns used `node --test --test-name-pattern` for each exact case, sequentially after rebuilding. No source changes addressed these unrelated failures. The rerun container then installed MCP dependencies, passed `npm test --prefix mcp/expressivecss`, and passed `npm run verify:packages`, including both isolated consumers and the packaged MCP smoke test. Reports are in `.cache/container-tests/expressivecss-e468d67b-8aff-4fee-823b-ead3ae00fd79/`. Logs are `.cache/phase57/verify.log` and `.cache/phase57/reruns-packages.log`.

### Visual and built-docs checks

`VISUAL_BASE=a5f90c850 npm run test:visual:docker -- --grep 'cards|timepicker' --workers 2` captured both pages at compact, expanded, large and large-dark sizes. All eight comparisons reported differences and the command exited 1. Stable captures show the new documentation paragraphs increase page height and shift later content. The representative large diffs begin at those paragraphs. This is an advisory difference result, not a passing visual comparison. The report is `.cache/container-tests/expressivecss-d86e4412-55e4-43af-90d5-75cd794ad594/report/index.html`. A first run used an over-restrictive filter and found no tests; it supplies no visual evidence.

The collaborative preview twice failed to inspect the built page with `Preview automation snapshot timed out after 15000ms.` The Astro dev server also failed to start within 30 seconds. The repository static server served the successfully built `_site/` instead, and an isolated Playwright probe opened the real card and inline Timepicker examples. It verified the card's 200ms default and 600ms override, the canvas's 150ms default and 600ms override, and no active target transitions under reduced motion. Screenshots `.cache/phase57/card-default.png`, `.cache/phase57/card-custom.png` and `.cache/phase57/timepicker-custom.png` were inspected. The recorded interaction video is `.cache/phase57/video/page@7d2cc5fdaeb891d0d1989eb51ddc4120.webm`; `.cache/phase57/manual.log` records the checks. BaezFJ's visual approval remains pending.

The final size review uses the repository budget method, stripping the source-map trailer before gzip. It measures 90,049 bytes, up 4 from the 90,045-byte base. An earlier measurement included the trailer and gave 90,102 bytes; the budget and recorded result were corrected. The final focused budget test is recorded in `.cache/phase57/final-size.log`. No browser or runtime source changed after the passing focused tests.
