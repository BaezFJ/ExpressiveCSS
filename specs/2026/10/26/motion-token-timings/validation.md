# Motion token timing validation

Date: 2026-10-26
Roadmap phase: [Phase 57, read motion tokens for hardcoded transition timings](../../../../roadmap.md#phase-57-read-motion-tokens-for-hardcoded-transition-timings)
Branch: `fix/motion-token-timings`
Base: local `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

All results are pending. This document defines implementation acceptance; writing it does not establish a passing test or merge readiness.

## Setup

Use Node 24 and the locked dependencies from `npm ci`. Install MCP dependencies with `npm ci --prefix mcp/expressivecss` before its checks. Run `npm run build` before focused tests, since tests read `dist/`. Host browser checks require the Playwright Chromium, Firefox and WebKit binaries and their system libraries. `CONTRIBUTING.md` also documents `npm run test:docker -- <command>` and `npm run test:packages:docker` for isolated execution.

The proposed new test filename below is a planned addition, not an existing executable check. Its command becomes runnable after plan group 1. Existing commands come from `package.json` and `CONTRIBUTING.md`; none has been executed during specification. Browser availability has not been checked.

The focused fixture loads the built CSS and IIFE, creates a real Timepicker and an expanding card with direct-child detail content, and reads their computed styles. Use the established `tests/browser.js` engine loop and resource cleanup in `finally`. Do not initialize components in static semantics checks. Run suites sequentially.

## Automated acceptance checks

Run V1 to V4 with `node --test tests/motion-token-timings-browser.test.js` after that file exists and the bundles are built. Each must run in Chromium, Firefox and WebKit without skips. Parse computed transition lists by property and normalize time units before comparing.

| ID | Requirement | Action and setup | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1 | With normal motion and no overrides, read `.timepicker-canvas`. Set `--md-sys-motion-duration-short3: 430ms` on the document root and read again without recreating the instance. Toggle the canvas opacity state. | Its opacity duration changes from 150ms to 430ms. The existing easing and opacity states remain intact. The base build instead keeps 175ms, proving this check detects the change. | Pending |
| V2 | R2 | Open the expanding card and read the direct-child content's opacity and transform delays. Set `--md-sys-motion-duration-short4: 470ms` on the document root and read again. | Both content delays change from 200ms to 470ms. Existing spring durations and easing remain unchanged. The base build keeps 180ms. | Pending |
| V3 | R2 | With the system override still set, set `--md-comp-expanding-card-content-delay: 90ms` on the article, then `0ms`. Remove the component override and read again. | Both delays become 90ms, then zero, then return to the overridden system value of 470ms. The change requires no rebuild or component initialization. The base build ignores the new component property. | Pending |
| V4 | R3 | Use nonzero system overrides and a nonzero component delay. Start with reduced motion enabled, then separately switch an active normal-motion effect to reduced motion. Trigger the canvas and content state changes. | Both targets reach their intended final opacity/transform states and have no running CSS transitions. Preserve the local resets. A computed delay alone need not be zero when a more specific authored delay remains; `transition-property: none` must prevent animation. | Pending |
| V5 | R1 to R4 | After adding the focused compiled-style assertions, run `node --test tests/expanding-card.test.js tests/reduced-motion.test.js`. Inspect the two shared Sass rules and their compiled output. | The canvas references `short3`; the article declares the new property backed by `short4`; expanded content consumes it. Both local reduced-motion resets remain. Only the agreed timing rules change. | Pending |

## Regression and release checks

| ID | Requirement | Action and setup | Expected result | Result |
| --- | --- | --- | --- | --- |
| V6 | R4 | Run `node --test tests/expanding-card-browser.test.js tests/timepicker-seconds.test.js tests/timepicker-seconds-browser.test.js tests/timepicker-time-range.test.js tests/timepicker-time-range-browser.test.js tests/spring-motion-browser.test.js`. Inspect the diff for unrelated transition and TypeScript changes. | Existing opening, closing, interruption, focus, seconds, range and motion-preference behavior passes. Timepicker timers and its `duration` option, dial timing, card close-button delay and spring pairs remain unchanged. | Pending |
| V7 | R5 | Run `node --test tests/selective-builds.test.js` after rebuilding. Review the docs, `llm.md`, changelog and budget line. | The reviewed CSS gzip measurement passes. Documentation gives 150ms and 200ms defaults, both system controls, the card component override and the separation from JavaScript timers. No new dependencies or runtime API ship. | Pending |
| V8 | All | After regenerating guidance from final sources, run `npm run check:generated`, `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss`, and `npm run verify:packages`, one at a time. | Generated data agrees with its sources, contributor checks and all three browser engines pass, and MCP/package consumers pass. Record each result and any skip or rerun. Generation does not renew source reviews or browser evidence. | Pending |

For failing-before evidence, use the base Sass or a separate base build with the new tests present. Preserve the feature work and record the exact source revision and failures. A failure caused by a missing browser, fixture error or absent bundle does not establish that a regression test detects the timing change. Restore the feature build before recording passing-after results.

## Manual and visual checks

| ID | Requirement | Action and setup | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | R1 to R5 | Run `npm run test:visual`, inspect its report with `npm run test:visual:report`, and retain the report path. View the Timepicker and expanding-card examples at default timings and with the documented overrides; repeat with reduced motion. Obtain BaezFJ's review of intended visual changes in the implementation PR. | Captures complete, unrelated layout changes are absent, both timing controls visibly affect their targets, and reduced motion stops both effects. BaezFJ records visual approval. Static screenshots alone do not prove timing behavior. | Pending |

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
