# Opacity utilities validation

Roadmap phase: [Phase 29, opacity utilities](../../../../roadmap.md#phase-29-opacity-utilities)
Branch: `feature/2026-10-23-opacity-utilities`
Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

Results recorded 2026-10-23 on the branch before the pull request. Required CI and review are still pending.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | `npm run build:css`; one `<div>` per class in a page that loads `dist/css/expressive.css` | Read `getComputedStyle(el).opacity` for each, in Chromium, Firefox and WebKit | `"0"`, `"0.25"`, `"0.38"`, `"0.5"`, `"0.75"`, `"1"` in every engine | Passed in Chromium, Firefox and WebKit; failed on the base commit's CSS |
| V2 | R3 | Same page with three `<input type="range" disabled>`: one bare, one with `.opacity-100`, one with `.opacity-50` | Read computed opacity in each engine | 0.38, 1 and 0.5 | Passed in all three engines; failed on the base commit's CSS |
| V3 | R2, R4 | Built CSS | Search `dist/css/expressive.css` for `.opacity-` rules | Six rules, all inside `@layer utilities`, none with `!important`, no `medium:` or other prefixed copies | Passed: six rules after `@layer utilities` at line 18923 of the unminified build, no `!important`, no prefixed copies |
| V4 | R4 | V2's page plus an unlayered `<style>` rule setting `opacity: 0.6` on the `.opacity-100` input | Read computed opacity | 0.6 | Passed in all three engines |
| V5 | R6 | After the last edit | `npm run build:skill` then `npm run check:generated` | Exits 0; the generated helpers reference lists the opacity classes | Passed. The usage skill's `references/helpers.md` is hand-written, so the row was added by hand |
| V6 | R6 | Merge-base build and branch build | Run `tests/selective-builds.test.js` | Passes with a new reviewed CSS gzip budget line whose delta matches the measured change | Passed: 84,819 to 84,863 gzip bytes (+44) |
| V7 | R1 to R6 | Nothing else running | `npm run verify` | All steps pass | Passed after reruns. 2,571 of 2,576 tests passed and 3 skipped. The two failures, the docker-runner SIGINT test and the codex-adapter oversized-stream test, are known load flakes and passed alone (17 of 17). `check:generated`, `docs:build:astro` and `docs:verify` then passed. `npm test --prefix mcp/expressivecss` passed |

Run V1, V2 and V4 with `node --test tests/helpers-browser.test.js` after `npm run build:css`. Each test must fail on the base commit's CSS.

## Manual checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V8 | R5 | Open the helpers page in `npm run docs:dev` and read the opacity section and its `llm.md` twin | Both list the six classes and values, call 38 the M3 disabled-content opacity, warn that dimmed text still needs contrast, and point to `.hide` or `hidden` for removing content | Partly checked: the built `_site/helpers.html` has the Opacity heading and examples. The page was not opened in a browser |

## Regression

V7 covers the existing helpers, selective build and docs tests. No component Sass changes, so no visual baseline should move; `npm run test:visual` is not required.

## Merge conditions

- V1 to V8 pass.
- `npm run verify` passes on the final commit.
- Required CI passes and review conversations are resolved.
- The roadmap marks Phase 29 completed with a link to this spec.
