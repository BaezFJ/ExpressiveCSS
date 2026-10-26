# Share chart base rules across chart types validation

Date: 2026-10-26
Roadmap phase: [Phase 58, share chart base rules across chart types](../../../../roadmap.md#phase-58-share-chart-base-rules-across-chart-types)
Branch: `fix/chart-base-rules`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: measurement-only outcome verified; Sass restored; full-run failures and successful focused reruns recorded

Requirements are in [requirements.md](requirements.md); work groups are in [plan.md](plan.md). The size experiment and restoration checks ran on 2026-10-26. Candidate-only checks are inapplicable after the rejected size result. Existing checks that actually ran are distinguished below.

## Setup and measurement

Use Node 24 with the lockfile's dependencies. Build before tests with `npm run build`. Install or use container-provided Chromium, Firefox and WebKit. Run suites sequentially. `npm run test:docker -- <command>` is the documented container alternative; package checks also have `npm run test:packages:docker`.

V1 measures the complete `dist/css/expressive.min.css`, including the same build-generated source-map trailer in both versions, using `sizes()` from `tests/fixtures/selective-builds.mjs`. That helper uses `node:zlib` `gzipSync` with its default settings. Do not compare an in-memory compile against a file artifact or change minification, fonts or dependencies between measurements.

After each corresponding build, the measurement command is:

```sh
node --input-type=module -e 'import {readFileSync} from "node:fs"; import {sizes} from "./tests/fixtures/selective-builds.mjs"; console.log(sizes(readFileSync("dist/css/expressive.min.css")).gzip)'
```

| Measurement | Result |
| --- | --- |
| Base source revision | `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20` |
| Node version, lockfile identity and Sass version | Node `v24.22.1`; Dart Sass `1.105.2`; lockfile SHA-256 `3f68c6c08a4d5e3ca22d7df42ffc424a8d436d605e2638ddc9162579f1dba1c5` |
| Baseline full minified CSS gzip bytes | 90,098 bytes including the source-map trailer; 90,045 bytes with the existing budget test's trailer removal |
| Candidate revision or diff identity and gzip bytes | 89,243 bytes including the trailer; 89,197 bytes with the budget method. Patch SHA-256 `7e591065eed89e00a4a16cd6d0b9c8db1afc93c0ca9138fe9dcd409e87fb54e5` |
| Saving, baseline minus candidate | 855 gzip bytes including the trailer; 848 bytes with the budget method. The required saving is 1,024 bytes |
| Retain or restore production Sass | Restored. Recompiled minified CSS is byte-for-byte identical to the baseline. |

If implementation starts on a newer accepted base, record that revision and remeasure both sides with its toolchain. Isolate this refactor's saving from unrelated changes.

## Automated acceptance checks

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R4 | Build and measure the baseline and candidate using the method above. Record source identities and toolchain. | Candidate saves at least 1,024 gzip bytes before any CSS change is retained. Smaller savings select V8. | Measured; candidate rejected. Saving 855 bytes is below 1,024; V8 selected. |
| V2 | R1, R2 | Extend and run `node --test tests/selective-builds.test.js`. Inspect representative compiled selectors and declaration blocks against the base. | Shared name-independent declarations emit once in a full sheet. All twelve chart types are covered, including radial. Introduced chart grouping `:is()` arguments are single classes. Existing complete selector specificity, state matching, token reads and chart-specific overrides remain correct. Public Sass signatures and accepted custom names still work. | Inapplicable to shipped output. The candidate emitted shared rules once, but complete specificity and browser parity acceptance was not claimed after size rejection. |
| V3 | R1, R2, R3 | In that suite, compile `custom.scss` with each of the twelve chart partials alone and no utilities, then with no components. Test representative two-chart selections in both orders, default custom/full equality and the existing configuration cases. | Every standalone chart has its caption, plot, cursor, tooltip, labels, legend, table-hiding and accessibility styling as applicable. A no-chart build has no shared chart rules. Reversing chart order preserves effective overrides. Abstracts alone emit no CSS; existing custom calls and configuration still compile. | Probe passed for all twelve standalone compiles, custom name, empty selection, inert abstracts and default/full equality on both baseline and candidate. Reversed-order and browser acceptance expansion is inapplicable to the rejected candidate. |
| V4 | R2, R3 | Extend and run `node --test tests/selective-builds-browser.test.js` in all three engines. Use one chart at a time with its valid table and modular constructor. Compare full and selective rendering and computed styles, and compare the candidate with preserved base CSS. | Each of the twelve chart types keeps its default appearance and chart-specific exceptions. Table fallback, initialized accessible table and destroy restoration work. Keyboard/pointer tooltip placement, focus, legend toggling and swatches remain correct where supported. Representative modifier cases retain sparkline clipping, label thinning, axis placement and heatmap scrolling. Light/dark, RTL, forced colors, reduced motion, glass and shadow-root checks preserve the base behavior. Neighboring and nested chart cases do not acquire another chart's styles. No browser errors or acceptance skips. | Not run; inapplicable to the rejected candidate. No full/selective chart browser-parity claim. |
| V5 | R2, R3, R5 | After a fresh build, run the existing component chart browser tests and shared chart-axis, legend-toggle, watch, transition and update suites. Use `npm run test:browser` for the complete browser suite. | All affected regressions pass in Chromium, Firefox and WebKit. Chart rendering, updates, reduced motion and accessible data remain correct. Org-chart stays unchanged and passes its existing checks. | Existing chart suites ran on restored source in the full contributor run. The Firefox line-motion failure passed on rerun, including all three engines. Candidate-specific browser acceptance is inapplicable. |

Use `node scripts/check-browser.mjs` before focused browser runs. For a focused per-engine run, set `EXPRESSIVECSS_TEST_BROWSER` to `chromium`, `firefox` or `webkit` and execute the focused command once for each, sequentially. `tests/browser.js` otherwise permits missing engines to skip; those skips cannot satisfy V4 or V5. Tear down components, pages, browsers, servers, temporary files and timers in `finally` blocks.

The shared-emission assertion should fail on the repeated base output. Compatibility assertions should continue passing on both versions. Record that distinction so a formatting-only assertion does not stand in for a behavior check.

## Repository and manual checks

| ID | Requirements | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V6 | R5 | For retained changes, update the reviewed CSS budget and CHANGELOG, regenerate changed inputs, then run `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss`, and `npm run verify:packages`, sequentially. Install MCP dependencies as documented if absent. | Contributor, generated-data, docs, browser, MCP and clean-consumer packaging checks pass. The budget reports the measured saving. Any required capability source review or evidence refresh follows the existing procedure and is recorded truthfully. Reuse V5's browser run if source has not changed. | Baseline build and existing selective-build suite passed. Full `npm run verify` reported six failures, two cancellations and six skips; see the rerun record below. All eight affected checks then passed in 18 selected tests with zero skips. Generated-data and docs checks passed. Budget, CHANGELOG, generated-data edits and separate candidate browser/MCP/package checks are inapplicable to this documentation-only result. |
| V7 | R2, R5 | Run `npm run test:visual`, inspect its report with `npm run test:visual:report`, and review representative chart states against the base. BaezFJ records visual review before merge. | No unintended visual changes. Captures succeed; broken or skipped captures do not establish visual approval. Computed-style and focused chart comparisons supplement pages the visual suite does not cover. | Not run; inapplicable because restored CSS matches the base byte-for-byte. No visual approval claimed. |
| V8 | R4, R5 | Only if V1 saves less than 1,024 bytes: restore this attempt's production Sass edits, rebuild, compare production CSS with the baseline, and inspect the final diff. Record both gzip sizes, delta and reason in this document and `docs/development-notes.md`. Run applicable repository checks. | Production CSS matches the baseline. No candidate Sass changes or reduced gzip budget ship. Remaining checks reflect the retained implementation. The recorded outcome says the saving was insufficient and makes no claim of a shipped optimization. | Passed for the measurement-only outcome. Restoration and CSS byte comparison passed; production files and budget have no diff. Build, typecheck, generated-data and docs checks passed. Initial suite failures and successful focused reruns are recorded below. |

Preserve a known-good baseline artifact outside tracked source before editing. Its absence blocks the base comparisons in V4 and V7 until it can be recreated. A failure or skipped acceptance case stays visible with its cause and resolution. Focused reruns do not erase the original result.

## Merge conditions

1. For retained CSS, R1 to R5 and V1 to V7 pass with recorded evidence. V1 saves at least 1,024 bytes and V4/V5 cover all three engines without acceptance skips.
2. For insufficient savings, V8 passes and the change records a measurement-only outcome. Mark candidate-only checks inapplicable with the reason; do not mark them passed.
3. Required CI passes, review conversations are resolved and the branch is current with `master`. BaezFJ's visual review is required for the retained CSS change.
4. The diff preserves public exports, markup, accessibility and selective-build compatibility. Derived guidance matches its sources, and no release or publication occurs in this phase.

Writing this specification does not establish a measurement, browser pass, visual approval or merge readiness. Roadmap completion stays unchanged in this task.

## Experiment evidence

`npm run test:docker -- sh -c 'npm run build && node --test tests/selective-builds.test.js'` passed on the unchanged framework. The separate size probe used the same locked dependency image, pinned by image ID, for both versions. Sass compiled the full entry with `--style=compressed --source-map --load-path=/work/src/sass` to files named `expressive.min.css`. Native `gzipSync` measured their bytes with default options. Removing the source-map trailer with the existing budget-test expression produced an 848-byte saving, which also falls below the threshold.

The candidate moved identical layout, caption, cursor, tooltip, label, legend and swatch declarations into a private write-once mixin. Single-class `:is()` alternatives covered the twelve chart types, including radial. Chart-specific tokens, plot background and height, tooltip color and glass, and swatch color remained in `chart($name)`. Table and sparkline selector lists kept chart names paired to avoid cross-type descendant matching. Custom names used the same private base with their own class. The final shared helper's correctness beyond the compile probe was not established because it failed the size condition first.

The baseline compressed CSS SHA-256 is `24f2523fbb6c643d56a4fe6ae0fa912550fd86d0421e92492200de68fd5c194f`; the rejected candidate's is `b0994bf34117a333b9d91b423ba6abf505b1408289d79fdc33456f8937719087`. The restored artifact matches the baseline hash and bytes. Logs, assertion probe, patch, source copies and measurements are local ignored artifacts under `.cache/chart-base-rules/`. They are not package contents or committed reports.

Repository checks and merge requirements in `CONTRIBUTING.md` apply. Required PR CI and review are not established by these local results.

## Contributor verification and reruns

The documented container runner ran `npm run verify`. Build and typecheck passed. The test stage completed with 3,207 tests: 3,193 passed, six failed, two were cancelled after timeouts, and six skipped. Its exit code was 1, so the complete `verify` command was not a clean pass. No production source or tests differ from the base.

All eight affected checks passed in a second container run with `node --test --test-concurrency=1` and a name filter selecting those cases across their eight test files. The browser cases also ran in the other engines. This selected 18 tests, all passed, with zero failures, cancellations or skips. No source or assertion edits were made between runs.

| Initial location | Full-run result | Focused result |
| --- | --- | --- |
| `tests/chart-transition-browser.test.js:97`, Firefox | Animation was not running at the sampled time. | Passed in Chromium, Firefox and WebKit. |
| `tests/confetti-browser.test.js:92`, Chromium | `Cannot read properties of null (reading 'left')`. | Passed in all three engines. |
| `tests/defer-render-browser.test.js:75`, Chromium | Cancelled after a 60,000 ms timeout. | Passed in all three engines. |
| `tests/docker-runner.test.js:79` | Expected `WAITING` was missing from captured output. | Passed. |
| `tests/expanding-card-browser.test.js:48`, Firefox | Long transition did not outlive the sampled 500 ms. | Passed in all three engines. |
| `tests/expressivecss-codex-adapter.test.js:183` | Hit the 3,000 ms operator timeout before the expected oversized-stream error. | Passed. |
| `tests/expressivecss-skill-evals.test.js:1205` | Outer-timeout timing assertion failed. | Passed. |
| `tests/keypad-browser.test.js:60`, Firefox | Cancelled after a 30,000 ms timeout. | Passed in all three engines. |

The second run then completed `npm run check:generated`, `npm run docs:build:astro` and `npm run docs:verify`. Verification found 136 pages, 11 aliases and 119 Markdown counterparts, with assets and LLM documents present. The initial full-run failures remain part of this record; successful focused reruns do not turn that command into a pass.

Local logs are `.cache/chart-base-rules/verify.log` and `.cache/chart-base-rules/focused-verify.log`. Exported reports are under `.cache/container-tests/expressivecss-4c28175d-6a04-46ea-8638-cc9ca611346d/` and `.cache/container-tests/expressivecss-8f693471-ffe6-45d2-8fd7-68fd8c270715/`. Candidate visual comparisons, separate MCP/package runs and publication were not performed for the documentation-only outcome.
