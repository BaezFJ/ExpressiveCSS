# Shared type roles validation

Date: 2026-10-26
Roadmap phase: Phase 55, use the type role mixin where type is written by hand
Branch: `fix/shared-type-roles`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: all implementation checks pending; no build, automated test or visual review ran during specification

Requirements are in [requirements.md](requirements.md), and work groups are in [plan.md](plan.md). Checks follow the [mission's success criteria](../../../../mission.md#success-criteria), [framework testing constraints](../../../../tech-stack.md#framework-testing) and [Phase 55](../../../../roadmap.md#phase-55-use-the-type-role-mixin-where-type-is-written-by-hand).

## Test setup

Use the contributor runtime and dependencies from `CONTRIBUTING.md`. Build with `npm run build` before tests that read `dist/`. The browser fixture uses the built CSS, static accessible markup, `tests/browser.js` and no component initialization. Close leases in `finally` blocks. Include `<header><nav><form><input>` and `<header><div class="bar"><form><input>` variants, plus a direct card figure caption and a caption inside `.primary-action`, preserving the existing chart exclusions.

Use reference elements with the existing `.body-large` and `.title-medium` classes to compare computed font-family, font-size, font-weight, line-height and letter-spacing. At a 16px root the default tracking should be 0.5px for body-large and 0.15px for title-medium, subject to normal browser serialization tolerance. Compare the four existing properties against the base CSS too.

The commands below use existing repository entry points except the explicitly proposed browser test file. They have not been executed for this feature. Run suites sequentially. Missing browsers or skipped feature assertions leave the relevant check pending.

## Focused automated checks

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R2 | Build CSS; run `node --test tests/app-bar.test.js tests/cards.test.js tests/typography.test.js`. Inspect the exact compiled target rules using the existing CSS test helpers. | Each target rule names the correct tokens for all five properties. Both caption selector forms remain covered. Default token definitions stay unchanged. The tracking assertions fail against base CSS and pass after the replacements. | Pending |
| V2 | R1, R2, R4 | Run the proposed `node --test tests/shared-type-roles-browser.test.js` in Chromium, Firefox and WebKit through the shared engine loop. Read all five computed properties for each target and its role reference. | Each target matches its complete role. Default tracking matches the values above, and the four existing properties match the base. Record the tracking failures against the base CSS as regression evidence. | Pending |
| V3 | R3 | In the same browser test, change each role's five tokens on the page after initial rendering. Use valid distinct values, including generic font families and nondefault tracking. Remove the overrides afterward. | The relevant targets update to the same computed values as their reference role without reloading or initializing components. The other role keeps its values. Removing overrides restores defaults. A later unlayered consumer CSS declaration can still override the component. | Pending |
| V4 | R4 | Review the two Sass diffs; run the focused tests above and `node --test tests/cards-semantics.test.js tests/app-bar-js.test.js tests/cards-browser.test.js`. | Only the four-declaration groups become mixin calls. Selectors, specificity, chart exclusions, colors, layout and focus rules stay intact. Existing semantics, input and card interactions pass. `.search-bar`, public exports and the shared mixin remain unchanged. | Pending |

## Documentation, size and regression checks

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V5 | R5 | Read the Unreleased CHANGELOG entry, `docs/src/pages/navbar.astro`, `docs/src/pages/cards.astro` and matching `llm.md` sections. Regenerate with `npm run build:semantics` and `npm run build:skill`, then run `npm run check:generated`. | Sources describe the correct complete roles and explain that the correction changes tracking for existing markup. Derived guidance matches its sources. Affected source pins have an actual source review. | Pending |
| V6 | R5 | Build base and changed minified CSS in isolation. Measure both using the same source-map stripping and gzip calculation as `tests/selective-builds.test.js`; run `node --test tests/selective-builds.test.js`. | Record both byte counts and the delta in the reviewed CSS budget history. The artifacts stay within reviewed budgets, and existing selective builds pass. No budget change hides unrelated growth. | Pending |
| V7 | All | Run `npm run verify`, `npm run test:browser`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` sequentially. Install the separate MCP dependencies with `npm ci --prefix mcp/expressivecss` if needed. The documented Docker commands may run the equivalent checks. | Contributor checks, docs, generated data, the explicit three-engine browser suite, MCP tests and both package consumers pass. Record skips and failures with their limits; focused reruns do not replace unfinished checks. | Pending |

## Manual visual check

| ID | Requirements | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V8 | R1, R2, R4, R5 | Compare base and changed CSS on the navbar plain-form search field and both caption forms, using short and long text at compact and expanded widths. Use `npm run test:visual` or the documented Docker equivalent for captures, inspect the report, and obtain BaezFJ's recorded review. Add a focused fixture if the existing docs captures omit a target. | Tracking changes as intended. Text stays readable, search input remains usable, captions remain contained, and focus and controls remain visible. Any screenshot differences have an explicit review; broken captures and automated passes do not count as approval. Record artifact paths and the review result. | Pending |

## Merge conditions

- V1 to V8 pass with recorded evidence for R1 to R5. Feature assertions run in Chromium, Firefox and WebKit without skips.
- The focused tracking checks fail against the base CSS and pass against the changed CSS. Existing regression checks pass.
- Generated guidance is current, gzip measurements have review, and BaezFJ has approved the intended visual differences.
- Required CI passes, review conversations are resolved, and the branch is up to date with `master` under `CONTRIBUTING.md`.
- Deferred decisions: none. Missing evidence or visual approval blocks merge. Keep the roadmap's completion state unchanged during this specification task.
