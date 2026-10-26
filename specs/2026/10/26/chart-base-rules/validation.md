# Share chart base rules across chart types validation

Date: 2026-10-26
Roadmap phase: [Phase 58, share chart base rules across chart types](../../../../roadmap.md#phase-58-share-chart-base-rules-across-chart-types)
Branch: `fix/chart-base-rules`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: all implementation acceptance checks pending

Requirements are in [requirements.md](requirements.md); work groups are in [plan.md](plan.md). Commands below come from the current repository, but have not run for this specification. Chart additions to the selective fixtures and assertions are planned work.

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
| Node version, lockfile identity and Sass version | Pending |
| Baseline full minified CSS gzip bytes | Pending; the existing 90,045-byte budget is not a new measurement |
| Candidate revision or diff identity and gzip bytes | Pending |
| Saving, baseline minus candidate | Pending; must be at least 1,024 bytes |
| Retain or restore production Sass | Pending |

If implementation starts on a newer accepted base, record that revision and remeasure both sides with its toolchain. Isolate this refactor's saving from unrelated changes.

## Automated acceptance checks

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R4 | Build and measure the baseline and candidate using the method above. Record source identities and toolchain. | Candidate saves at least 1,024 gzip bytes before any CSS change is retained. Smaller savings select V8. | Pending |
| V2 | R1, R2 | Extend and run `node --test tests/selective-builds.test.js`. Inspect representative compiled selectors and declaration blocks against the base. | Shared name-independent declarations emit once in a full sheet. All twelve chart types are covered, including radial. Introduced chart grouping `:is()` arguments are single classes. Existing complete selector specificity, state matching, token reads and chart-specific overrides remain correct. Public Sass signatures and accepted custom names still work. | Pending |
| V3 | R1, R2, R3 | In that suite, compile `custom.scss` with each of the twelve chart partials alone and no utilities, then with no components. Test representative two-chart selections in both orders, default custom/full equality and the existing configuration cases. | Every standalone chart has its caption, plot, cursor, tooltip, labels, legend, table-hiding and accessibility styling as applicable. A no-chart build has no shared chart rules. Reversing chart order preserves effective overrides. Abstracts alone emit no CSS; existing custom calls and configuration still compile. | Pending |
| V4 | R2, R3 | Extend and run `node --test tests/selective-builds-browser.test.js` in all three engines. Use one chart at a time with its valid table and modular constructor. Compare full and selective rendering and computed styles, and compare the candidate with preserved base CSS. | Each of the twelve chart types keeps its default appearance and chart-specific exceptions. Table fallback, initialized accessible table and destroy restoration work. Keyboard/pointer tooltip placement, focus, legend toggling and swatches remain correct where supported. Representative modifier cases retain sparkline clipping, label thinning, axis placement and heatmap scrolling. Light/dark, RTL, forced colors, reduced motion, glass and shadow-root checks preserve the base behavior. Neighboring and nested chart cases do not acquire another chart's styles. No browser errors or acceptance skips. | Pending |
| V5 | R2, R3, R5 | After a fresh build, run the existing component chart browser tests and shared chart-axis, legend-toggle, watch, transition and update suites. Use `npm run test:browser` for the complete browser suite. | All affected regressions pass in Chromium, Firefox and WebKit. Chart rendering, updates, reduced motion and accessible data remain correct. Org-chart stays unchanged and passes its existing checks. | Pending |

Use `node scripts/check-browser.mjs` before focused browser runs. For a focused per-engine run, set `EXPRESSIVECSS_TEST_BROWSER` to `chromium`, `firefox` or `webkit` and execute the focused command once for each, sequentially. `tests/browser.js` otherwise permits missing engines to skip; those skips cannot satisfy V4 or V5. Tear down components, pages, browsers, servers, temporary files and timers in `finally` blocks.

The shared-emission assertion should fail on the repeated base output. Compatibility assertions should continue passing on both versions. Record that distinction so a formatting-only assertion does not stand in for a behavior check.

## Repository and manual checks

| ID | Requirements | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V6 | R5 | For retained changes, update the reviewed CSS budget and CHANGELOG, regenerate changed inputs, then run `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss`, and `npm run verify:packages`, sequentially. Install MCP dependencies as documented if absent. | Contributor, generated-data, docs, browser, MCP and clean-consumer packaging checks pass. The budget reports the measured saving. Any required capability source review or evidence refresh follows the existing procedure and is recorded truthfully. Reuse V5's browser run if source has not changed. | Pending |
| V7 | R2, R5 | Run `npm run test:visual`, inspect its report with `npm run test:visual:report`, and review representative chart states against the base. BaezFJ records visual review before merge. | No unintended visual changes. Captures succeed; broken or skipped captures do not establish visual approval. Computed-style and focused chart comparisons supplement pages the visual suite does not cover. | Pending |
| V8 | R4, R5 | Only if V1 saves less than 1,024 bytes: restore this attempt's production Sass edits, rebuild, compare production CSS with the baseline, and inspect the final diff. Record both gzip sizes, delta and reason in this document and `docs/development-notes.md`. Run applicable repository checks. | Production CSS matches the baseline. No candidate Sass changes or reduced gzip budget ship. Remaining checks reflect the retained implementation. The recorded outcome says the saving was insufficient and makes no claim of a shipped optimization. | Pending; conditional |

Preserve a known-good baseline artifact outside tracked source before editing. Its absence blocks the base comparisons in V4 and V7 until it can be recreated. A failure or skipped acceptance case stays visible with its cause and resolution. Focused reruns do not erase the original result.

## Merge conditions

1. For retained CSS, R1 to R5 and V1 to V7 pass with recorded evidence. V1 saves at least 1,024 bytes and V4/V5 cover all three engines without acceptance skips.
2. For insufficient savings, V8 passes and the change records a measurement-only outcome. Mark candidate-only checks inapplicable with the reason; do not mark them passed.
3. Required CI passes, review conversations are resolved and the branch is current with `master`. BaezFJ's visual review is required for the retained CSS change.
4. The diff preserves public exports, markup, accessibility and selective-build compatibility. Derived guidance matches its sources, and no release or publication occurs in this phase.

Writing this specification does not establish a measurement, browser pass, visual approval or merge readiness. Roadmap completion stays unchanged in this task.
