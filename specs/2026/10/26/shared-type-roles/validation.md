# Shared type roles validation

Date: 2026-10-26
Roadmap phase: Phase 55, use the type role mixin where type is written by hand
Branch: `fix/shared-type-roles`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: automated checks passed and visual captures inspected on 2026-10-26; BaezFJ visual approval pending

Requirements are in [requirements.md](requirements.md), and work groups are in [plan.md](plan.md). Checks follow the [mission's success criteria](../../../../mission.md#success-criteria), [framework testing constraints](../../../../tech-stack.md#framework-testing) and [Phase 55](../../../../roadmap.md#phase-55-use-the-type-role-mixin-where-type-is-written-by-hand).

## Test setup

Use the contributor runtime and dependencies from `CONTRIBUTING.md`. Build with `npm run build` before tests that read `dist/`. The browser fixture uses the built CSS, static accessible markup, `tests/browser.js` and no component initialization. Close leases in `finally` blocks. Include `<header><nav><form><input>` and `<header><div class="bar"><form><input>` variants, plus a direct card figure caption and a caption inside `.primary-action`, preserving the existing chart exclusions.

Use reference elements with the existing `.body-large` and `.title-medium` classes to compare computed font-family, font-size, font-weight, line-height and letter-spacing. At a 16px root the default tracking should be 0.5px for body-large and 0.15px for title-medium, subject to normal browser serialization tolerance. Compare the four existing properties against the base CSS too.

The commands below ran through the documented Docker runner, sequentially. The new browser test is `tests/shared-type-roles-browser.test.js`. Missing browsers or skipped feature assertions would leave the relevant check pending.

## Focused automated checks

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R2 | Build CSS; run `node --test tests/app-bar.test.js tests/cards.test.js tests/typography.test.js`. Inspect the exact compiled target rules using the existing CSS test helpers. | Each target rule names the correct tokens for all five properties. Both caption selector forms remain covered. Default token definitions stay unchanged. The tracking assertions fail against base CSS and pass after the replacements. | Passed. Both new compiled-rule checks failed against the base, then passed with the fix. The focused run passed all 64 checks without skips. |
| V2 | R1, R2, R4 | Run the proposed `node --test tests/shared-type-roles-browser.test.js` in Chromium, Firefox and WebKit through the shared engine loop. Read all five computed properties for each target and its role reference. | Each target matches its complete role. Default tracking matches the values above, and the four existing properties match the base. Record the tracking failures against the base CSS as regression evidence. | Passed in Chromium, Firefox and WebKit. The base failed in each engine because the direct caption used 0.4px tracking instead of 0.15px; the other four properties matched. Both navbar forms and both caption forms pass with the fix. |
| V3 | R3 | In the same browser test, change each role's five tokens on the page after initial rendering. Use valid distinct values, including generic font families and nondefault tracking. Remove the overrides afterward. | The relevant targets update to the same computed values as their reference role without reloading or initializing components. The other role keeps its values. Removing overrides restores defaults. A later unlayered consumer CSS declaration can still override the component. | Passed in all three engines. All five live token overrides, role isolation, restoration and the unlayered consumer tracking override passed. |
| V4 | R4 | Review the two Sass diffs; run the focused tests above and `node --test tests/cards-semantics.test.js tests/app-bar-js.test.js tests/cards-browser.test.js`. | Only the four-declaration groups become mixin calls. Selectors, specificity, chart exclusions, colors, layout and focus rules stay intact. Existing semantics, input and card interactions pass. `.search-bar`, public exports and the shared mixin remain unchanged. | Passed. The source diff changes only the two declaration groups. The 64 focused checks include existing card semantics, app bar runtime and card browser regressions. |

## Documentation, size and regression checks

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V5 | R5 | Read the Unreleased CHANGELOG entry, `docs/src/pages/navbar.astro`, `docs/src/pages/cards.astro` and matching `llm.md` sections. Regenerate with `npm run build:semantics` and `npm run build:skill`, then run `npm run check:generated`. | Sources describe the correct complete roles and explain that the correction changes tracking for existing markup. Derived guidance matches its sources. Affected source pins have an actual source review. | Passed. Both generators ran, and generated-data checks passed locally and in Docker. All 99 component guides changed only in their contract hash. Navbar and card capability pins were already stale at the base; they retain that state rather than claim renewed capability evidence. |
| V6 | R5 | Build base and changed minified CSS in isolation. Measure both using the same source-map stripping and gzip calculation as `tests/selective-builds.test.js`; run `node --test tests/selective-builds.test.js`. | Record both byte counts and the delta in the reviewed CSS budget history. The artifacts stay within reviewed budgets, and existing selective builds pass. No budget change hides unrelated growth. | Passed. Isolated compilation measured 90,045 base and 90,048 changed gzip bytes, a 3-byte increase. The CSS budget now records 90,048. Selective-build checks passed in contributor verification. |
| V7 | All | Run `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` sequentially. Install the separate MCP dependencies with `npm ci --prefix mcp/expressivecss` if needed. The documented Docker commands may run the equivalent checks. | Contributor checks, docs, generated data, the explicit three-engine browser suite, MCP tests and both package consumers pass. Record skips and failures with their limits; focused reruns do not replace unfinished checks. | Passed. Contributor verification passed 3,206 of 3,212 tests, with six skips and zero failures. The explicit browser suite passed 1,528 of 1,534, with the same six skips and zero failures. Counts overlap. MCP tests and both isolated package consumers passed. |

## Manual visual check

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V8 | R1, R2, R4, R5 | Compare base and changed CSS on the navbar plain-form search field and both caption forms, using short and long text at compact and expanded widths. Use `npm run test:visual` or the documented Docker equivalent for captures, inspect the report, and obtain BaezFJ's recorded review. Add a focused fixture if the existing docs captures omit a target. | Tracking changes as intended. Text stays readable, search input remains usable, captions remain contained, and focus and controls remain visible. Any screenshot differences have an explicit review; broken captures and automated passes do not count as approval. Record artifact paths and the review result. | Captures complete; approval pending. Four docs comparisons captured stable images and exited 1 for screenshot differences. Focused before/after captures at 320px and 900px show contained captions. BaezFJ must review the differences before merge. |

## Merge conditions

- V1 to V8 pass with recorded evidence for R1 to R5. Feature assertions run in Chromium, Firefox and WebKit without skips.
- The focused tracking checks fail against the base CSS and pass against the changed CSS. Existing regression checks pass.
- Generated guidance is current, gzip measurements have review, and BaezFJ has approved the intended visual differences.
- Required CI passes, review conversations are resolved, and the branch is up to date with `master` under `CONTRIBUTING.md`.
- Deferred decisions: none. Missing evidence or visual approval blocks merge. Keep the roadmap's completion state unchanged during this specification task.

## Execution evidence

The regression run used the base Sass with the new tests and failed five of 44 checks, with no skips. Its log is `.cache/shared-type-roles-baseline.log`. The 64-check positive run is in `.cache/shared-type-roles-focused.log`; exported reports are in `.cache/container-tests/expressivecss-1b0f1f48-761f-4bb0-83a0-7076fb73104b/`.

The size experiment compiled base and changed Sass in the container, restored the container sources in `finally`, and left host sources unchanged. `.cache/shared-type-roles-size.log` records the measurements; the exported base CSS and size JSON are in `.cache/container-tests/expressivecss-0773a785-82c6-4c0e-984a-7fe4859aa0a2/cross-browser/`.

The full check command was `npm run test:docker -- sh -c 'npm run verify && npm run test:browser && npm ci --prefix mcp/expressivecss && npm test --prefix mcp/expressivecss && npm run verify:packages'`. It exited 0. The log is `.cache/shared-type-roles-verify.log`, and reports are in `.cache/container-tests/expressivecss-7d82449b-dfae-4463-b2d0-a16ce9355eb5/`. The six skips are three optional evaluation SDK checks and three Firefox map checks that need WebGL2. None are Phase 55 checks. No test reruns were needed.

The visual command was `VISUAL_BASE=a5f90c850 npm run test:visual:docker -- --grep '(navbar|cards) @ (compact|expanded)$' --workers 2`. All four baseline captures passed. All four changed-page comparisons captured stable screenshots and flagged differences; the command exited 1. Navbar page heights increased by 72px at compact and 48px at expanded; card page heights increased by 96px and 24px. The docs additions affect layout, and the caption tracking changes text width. This is a report requiring review, not a passing visual comparison. The log is `.cache/shared-type-roles-visual.log`; the report is `.cache/container-tests/expressivecss-e20c0788-b53b-48dd-8414-ad3756f2fb0c/report/index.html`.

The collaborative preview failed twice with `Preview automation snapshot timed out after 15000ms.` Focused captures therefore used the repository's Playwright environment. An isolated container compiled base and changed Sass, loaded the built fonts, and captured both navbar form variants plus short direct and long primary-action captions. The log is `.cache/shared-type-roles-focus-capture.log`. Inspected images and measurements are in `.cache/container-tests/expressivecss-05a23b08-187c-41c9-a6a4-ed648c8725c6/cross-browser/type-roles-focus/`: `compact.png`, `expanded.png` and `measurements.json`. The inputs retain 0.5px tracking. Captions change from 0.4px to 0.15px; the expanded long caption narrows from 573px to 555.5px. The captions remain contained at both widths. These inspections do not supply BaezFJ's required approval.
