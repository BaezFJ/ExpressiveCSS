# Read the elevation token in the map popup validation

Roadmap phase: [Phase 54, read the elevation token in the map popup](../../../../roadmap.md#phase-54-read-the-elevation-token-in-the-map-popup)
Branch: `fix/map-popup-elevation-token`
Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

Build with `npm run build` before any test, since the tests read `dist/`. Results were recorded on 2026-10-26 against the branch build.

## Automated checks

| ID | Requirement | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1 | The map test page with `maplibre-gl.css` and `expressive.css`, depot popup open, in Chromium, Firefox and WebKit | `node --test tests/map-browser.test.js`, with `--md-sys-elevation-level2` set on `:root` to a distinct shadow | The popup's computed `box-shadow` equals a probe styled with `var(--md-sys-elevation-level2)`, both before and after the override. On the base CSS the post-override assertion fails. | Passed in Chromium, Firefox and WebKit, none skipped. Against the base CSS it failed in all three at the override step: the popup kept the inlined level 2 shadow. |
| V2 | R2 | Same page, no token override | Same command | The popup's computed `box-shadow` is the level 2 shadow and not MapLibre's `0 1px 2px` shadow. | Passed in all three engines. |
| V3 | R3, R4 | Built `dist/css/expressive.css` and Sass sources | Read the compiled `.maplibregl-popup-content` rule; `grep -n "sass:map\|map\.get" src/sass/components/_map.scss` | The rule has `box-shadow: var(--md-sys-elevation-level2) !important`. The grep finds nothing. The `z-depth` comment names the map popup. | Passed. The compiled rule has `box-shadow:var(--md-sys-elevation-level2) !important`, the grep finds nothing, and the comment names the popup. |
| V4 | R5 | Built bundles | `node --test tests/selective-builds.test.js` | Passes with a new reviewed budget line for the CSS gzip change. `CHANGELOG.md` has a Fixed entry under Unreleased. | Passed. CSS gzip 90,045 bytes (-26 from 90,071). The CHANGELOG entry is under Unreleased, Fixed. |
| V5 | R5 | All edits done, then `npm run build:skill` | `npm run check:generated` | Generated semantics, skill and MCP copies match their sources. | Passed after `npm run build:skill`. The regenerated guides changed only in the contract hash. |

An engine skipped for missing WebGL2 would not count as a pass for V1 or V2. No engine skipped in the local run.

## Regression checks

| ID | Requirement | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V6 | All | `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time | All pass. A failure from a known flaky test is rerun alone and recorded with its rerun result, and the verify steps it skipped are run afterward. | Passed. `npm run verify` ran 3,207 tests with no failures or skips, then `docs:verify` passed. The MCP tests and smoke test passed, and `verify:packages` passed. |

## Manual checks

None. The user didn't pick the manual docs check, so no visual check is claimed for this phase.

## Merge conditions

- V1 to V6 pass and their results are recorded here.
- The new browser assertion fails against the base commit's CSS, which shows it tests the change.
- Required CI passes, review conversations are resolved, and the branch is current with `master`.
- The roadmap marks Phase 54 complete only in a later change, after this branch merges.
