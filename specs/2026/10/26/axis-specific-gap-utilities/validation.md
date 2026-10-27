# Axis-specific gap utilities validation

Date: 2026-10-26
Roadmap phase: Phase 59, axis-specific gap utilities
Branch: `feature/2026-10-26-axis-specific-gap-utilities`
Base: `origin/master` at `3b9703956823c9c445a0835067915a0e322152a5`
Status: V1 through V7 passed locally; V8 and V9 pending

Checks implement the [mission](../../../../mission.md#product-rules), [framework testing constraints](../../../../tech-stack.md#framework-testing) and [roadmap Phase 59 completion check](../../../../roadmap.md#phase-59-axis-specific-gap-utilities). See [requirements.md](requirements.md) and [plan.md](plan.md). The user confirmed all checks below; none are deferred.

## Setup and evidence

Use Node 24 and locked dependencies. Build with `npm run build` before tests that read `dist/`. Reuse `tests/helpers-browser.test.js`, `tests/selective-builds.test.js` and `tests/browser.js`; add focused cases to those files during implementation. Use `engines` for every new browser acceptance case and close each lease in `finally`. Run suites sequentially.

For focused host runs, build first and run each command separately:

```sh
EXPRESSIVECSS_TEST_BROWSER=chromium node --test tests/helpers-browser.test.js
EXPRESSIVECSS_TEST_BROWSER=firefox node --test tests/helpers-browser.test.js
EXPRESSIVECSS_TEST_BROWSER=webkit node --test tests/helpers-browser.test.js
node --test tests/selective-builds.test.js
```

The explicit engine setting makes a missing requested engine fail instead of skip. The commands are established repository entry points, but have not run for this specification. New Phase 59 assertions do not exist yet. A successful run of existing tests alone cannot establish this feature's acceptance.

The container alternative is `npm run test:docker -- <command>`, using the commands above after a build inside that environment. Follow CONTRIBUTING.md for setup, report locations and cleanup. Keep baseline and candidate measurements in comparable environments. Save browser names and versions, source revision, commands, results and artifact paths with the implementation evidence.

## Automated acceptance

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R2 | In each engine, create a two-column, multi-row grid and a flex container with fixed-width children that wrap. At a 16px root, apply each `gap-x-*` and `gap-y-*` value individually and in unequal pairs. Read computed row/column gaps and child geometry. Inspect compiled declarations for `!important` and absence of auto variants. | Values 0 through 6 compute to 0, 4, 8, 12, 16, 24 and 48px on the named property. Applying one axis leaves the other axis at its fixture baseline. Both grid and flex geometry reflect the requested gaps. No auto variants exist. | Passed 2026-10-26; see evidence below. |
| V2 | R2, R3 | In each engine and both layouts, combine a base gap with each axis prefix. Check widths 599/600, 839/840, 1199/1200 and 1599/1600. Also run the cumulative example below and resize back down. Check generated rules for both families and every scale value at each prefix. | A prefix starts exactly at its existing minimum width, remains active above it and stops applying below it. Cumulative results match the table below in either resize direction. | Passed 2026-10-26; see evidence below. |
| V3 | R1, R3 | In each engine, combine shorthand and axes at the same breakpoint using different numeric values, such as `gap-6 gap-x-1 gap-y-2`. Repeat with reversed HTML class order and with prefixed equivalents. Test a base axis plus a later shorthand, then a later axis overriding an earlier shorthand. Include zero resets for each axis and both axes together. | Same-level axes override shorthand even when their numeric suffix is smaller and regardless of class order. A later shorthand resets both axes; a later axis changes only its property. Zero computes to 0px on exactly the requested axes. | Passed 2026-10-26; see evidence below. |
| V4 | R1, R2, R4 | Repeat representative unequal gaps and breakpoint overrides at root sizes 16px and 32px in LTR and RTL, for grid, wrapping flex-row and wrapping flex-column fixtures. | Nonzero gap lengths double with the root size; zero stays zero. RTL preserves the property values and correct layout spacing. Flex direction uses native row-gap/column-gap semantics without remapping classes. | Passed 2026-10-26; see evidence below. |
| V5 | R4 | Compare representative legacy `.gap-0` through `.gap-6`, prefixed gap, margin, padding and grid `.g-*` cases against base CSS. Include the existing helper browser regressions and check that new utilities still override ordinary component/page gap declarations through `!important`. | Existing markup has the same computed layout at matching root and viewport sizes. New declarations retain single-class specificity and existing layer placement. No runtime or public export changes occur. | Passed 2026-10-26; see evidence below. |
| V6 | R1, R2, R4 | Extend and run `tests/selective-builds.test.js`. Compile full and default-custom stylesheets, a custom build with `$components: ()` and `$utilities: ("spacing")`, and one with `$utilities: ()`. Use existing Sass compile options. Apply the spacing-only CSS to representative browser fixtures in each engine. | Full and default-custom CSS match. Spacing-only output contains working base and prefixed axis rules without the helpers partial. Excluding spacing emits none of the new utility selectors. Existing configuration tests pass. | Passed 2026-10-26; see evidence below. |
| V7 | R5, R6 | Review helpers docs, `llm.md` and the Unreleased entry against the requirements. Regenerate with `npm run build:semantics` and `npm run build:skill`; run `npm run check:generated`. Inspect resulting helper guidance and build/verify the docs through V8. | Sources and generated guidance agree on names, scale, prefixes and cascade. The docs contain the live wrapping-grid example. Generated copies have no manual edits or unexplained provenance changes. | Passed 2026-10-26; see evidence below. |
| V8 | R4, R6 | Run the size and repository checks below on the final implementation. Record baseline/candidate gzip values, delta and required CI results. | A reviewed budget records the measured final CSS size. Contributor, explicit browser, MCP/package and required CI checks pass, with affected regressions resolved. | Pending |

For the cumulative V2 fixture, use `gap-4 medium:gap-x-2 expanded:gap-y-5 large:gap-x-0 extra-large:gap-y-1` at a 16px root. Keep children small enough to fit multiple columns or items per line at every viewport.

| Viewport width | Row gap | Column gap |
| --- | --- | --- |
| Below 600px | 16px | 16px |
| 600px to below 840px | 16px | 8px |
| 840px to below 1200px | 24px | 8px |
| 1200px to below 1600px | 24px | 0px |
| At least 1600px | 4px | 0px |

## Size and repository checks for V8

Use the existing `sizes()` method from `tests/fixtures/selective-builds.mjs` and the CSS input used by the budget assertion in `tests/selective-builds.test.js`. Measure the base and candidate production minified CSS with the same Node, Sass, locked dependencies and compression method. Preserve the repository's source-map handling. Record raw measurements and revisions before changing the ceiling. The base's recorded 90,072-byte ceiling is not a substitute for measuring the base. No new numeric size allowance has been approved in this spec.

Run these established commands sequentially after implementation and regeneration:

```sh
npm run verify
npm run test:browser
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify:packages
```

`npm run verify` builds and runs contributor checks, including generated data and docs. The separate browser command requires all supported engines. MCP and package checks verify that generated guidance remains self-contained and compatible. Use the repository container equivalents if host prerequisites are missing. Record failures and environmental skips; do not describe them as passing acceptance.

## Manual and visual acceptance

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | R2, R3, R5, R6 | Run `npm run test:visual` and inspect the report with `npm run test:visual:report`. Inspect the helpers page's live wrapping-grid example below and at its breakpoint, in LTR and RTL and with enlarged root text. Record the comparison base and artifact paths. BaezFJ reviews intended changes in the implementation PR. | The example changes only its requested gap axis at the breakpoint; content remains readable. No unexplained regressions appear in existing pages. Captures complete successfully and BaezFJ's visual approval is recorded. | Pending |

The roadmap demonstration can use `gap-4 medium:gap-x-2`: below 600px both gaps are 16px; from 600px the column gap is 8px and the row gap remains 16px at the default root. Browser emulation and screenshots establish only their recorded checks, not a physical-device or screen-reader review.

## Requirement coverage and merge conditions

| Requirement | Planned group | Validation |
| --- | --- | --- |
| R1 | 1 | V1, V3, V4, V6 |
| R2 | 1, 3 | V1, V2, V4, V6, V9 |
| R3 | 1, 3 | V2, V3, V9 |
| R4 | 1, 3 | V4, V5, V6, V8 |
| R5 | 2, 3 | V7, V9 |
| R6 | 2, 3 | V7, V8, V9 |

Merge requires passing evidence for all in-scope acceptance checks, passing affected regressions and required CI, a reviewed gzip budget, resolved review conversations and BaezFJ's recorded visual approval. Missing engines, unresolved failures or missing visual approval block merge. No migration is expected because existing markup behavior is preserved and new classes are opt-in. Specification creates no implementation evidence and leaves the roadmap completion state unchanged.

## Implementation evidence on 2026-10-26

Group 1 uses the existing spacing map and breakpoint mixin through a private `_gaps` mixin. It adds 70 axis rules and no runtime code. Removing those additive rules from the expanded candidate CSS leaves every existing compiled rule identical to the base after whitespace and source-map normalization. The check is in `.cache/phase59/legacy-css-check.log`.

The final regression assertion failed against base CSS for `gap-x-0`: computed column gap remained 9px instead of 0px. The corrected test fixtures allow two 50px items plus the maximum enlarged gap to fit, so geometry checks cover both axes. The expected failure is in `.cache/phase59/red.log`.

`npm run build`, the candidate `npm run build:css`, typecheck and generated-data checks passed. `node --test tests/helpers-browser.test.js tests/selective-builds.test.js` passed all 62 checks with no skips. Before moving the spacing-only cases into the helpers suite, `node --test tests/selective-builds-browser.test.js` passed all six checks with no skips, including the three existing rendering/interaction comparisons. The final helpers suite includes the spacing-only grid/flex cases in Chromium, Firefox and WebKit. Logs are `.cache/phase59/slice1-final-tests.log`, `.cache/phase59/slice1-selective-browser.log`, `.cache/phase59/typecheck.log` and `.cache/phase59/slice1-generated-check.log`.

The source-map-stripped minified baseline at `3b9703956823c9c445a0835067915a0e322152a5` measures 90,072 gzip bytes. The candidate measures 90,374, an increase of 302 bytes. Both measurements use Node v24.21.0, Dart Sass 1.105.2, the lockfile and the repository's `sizes()` function. The reviewed CSS ceiling now records 90,374. Measurements are `.cache/phase59/base-size.json` and `.cache/phase59/candidate-size.json`. Full contributor, package, final browser and visual checks remain pending.

The first implementation commit attempt was rejected by the Fallow hook for test complexity. Breakpoint and precedence checks are now separate tests sharing a small fixture. The spacing-only cases moved into the helpers suite, preserving the existing selective-browser test file unchanged. The final 62-check run above tests that arrangement.

Group 2 updates the helpers page, `llm.md`, Unreleased changelog and the authored helper and layout skill references. The live grid example uses `gap-4 medium:gap-x-2`. Both generators and `npm run check:generated` passed. All 33 guidance tests passed with no skips after the authored-reference updates. The Astro build and docs verification passed for 136 pages, 11 aliases and 119 Markdown counterparts. Logs are `.cache/phase59/slice2-generate.log`, `.cache/phase59/slice2-generated-check.log`, `.cache/phase59/slice2-guidance-tests.log` and `.cache/phase59/slice2-docs.log`. Each of the 99 generated component guides differs only in its contract hash; those guides do not contain the separately authored helper reference.

Astro preview exited before becoming ready. The repository's `visual/serve.mjs` serves the built site on port 4329 instead. T3 preview navigated to the helpers page, but two snapshot calls timed out after 15 seconds. No visual pass is claimed from those calls; repository Playwright inspection remains pending.
