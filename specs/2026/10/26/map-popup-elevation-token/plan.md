# Read the elevation token in the map popup plan

Roadmap phase: [Phase 54, read the elevation token in the map popup](../../../../roadmap.md#phase-54-read-the-elevation-token-in-the-map-popup)
Branch: `fix/map-popup-elevation-token`
Requirements: [requirements.md](requirements.md). Validation: [validation.md](validation.md).

The worktree has no `node_modules` at the base commit, so run `npm ci` and `npm ci --prefix mcp/expressivecss` before group 1.

## 1. Failing browser assertion

Prerequisites: `npm ci`, then `npm run build` on the base commit.

- [x] In the first test of `tests/map-browser.test.js`, while the depot popup is open, read the computed `box-shadow` of `.maplibregl-popup-content`.
- [x] Assert that it is not MapLibre's `0 1px 2px` shadow and that it equals the computed shadow of a probe element styled with `box-shadow: var(--md-sys-elevation-level2)`.
- [x] Set `--md-sys-elevation-level2` on `:root` to a distinct shadow, such as `0 0 0 3px rgb(255 0 0)`, and assert that the popup's computed shadow changes to match the probe again.
- [x] Run `node --test tests/map-browser.test.js` against the base build and confirm the override assertion fails in each engine that has WebGL2.

Completion check: the new assertions fail on the base CSS only at the override step, and the existing map assertions still pass.

Covers: R1, R2. Checks: V1, V2.

## 2. Popup reads the token

Prerequisites: group 1.

- [x] In `src/sass/components/_map.scss`, replace `box-shadow: map.get($elevations, "2") !important;` with `@include z-depth(2, true);`.
- [x] Remove `@use "sass:map";` from `_map.scss`.
- [x] In `src/sass/abstracts/_elevation.scss`, extend the `$important` comment: the `.z-depth-0` utility and the map popup pass it, the popup because it must beat MapLibre's unlayered stylesheet.
- [x] `npm run build`, then rerun `node --test tests/map-browser.test.js` and the static elevation checks in `tests/menu.test.js` and `tests/expressivecss-skill.test.js`.

Completion check: the browser test passes in every engine that runs it, and the compiled popup rule reads `box-shadow: var(--md-sys-elevation-level2) !important`.

Covers: R1, R2, R3, R4. Checks: V1, V2, V3.

## 3. Release files and full checks

Prerequisites: group 2.

- [x] Add a Fixed entry under Unreleased in `CHANGELOG.md`.
- [x] Add a reviewed gzip budget line to `tests/selective-builds.test.js` and run it.
- [x] Run `npm run build:skill`, then `npm run check:generated`.
- [x] Run `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time. Rerun a known flaky failure alone and record it.
- [x] Record the results in [validation.md](validation.md).

Completion check: every check in validation.md has a recorded result.

Covers: R5 and regressions for all. Checks: V4, V5, V6.
