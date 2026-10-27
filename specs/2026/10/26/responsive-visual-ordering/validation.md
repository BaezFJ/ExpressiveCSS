# Responsive visual ordering: validation

Roadmap: [Phase 62: responsive visual ordering](../../../../roadmap.md#phase-62-responsive-visual-ordering). Requirements are in [requirements.md](requirements.md) and work in [plan.md](plan.md). Every result is pending until the feature is built.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R3 | A flex row of three focusable children, A, B and C in DOM order. B has `order-last expanded:order-none`, C has `expanded:order-first`. | Set the viewport to 839px, then 840px, and read each child's computed `order` and box left edge. | At 839px: orders 0, 1, 0 and visual order A, C, B. At 840px: orders 0, 0, -1 and visual order C, A, B. | Pending |
| V2 | R2 | Same fixture as V1. | Read B's computed `order` at 840px. | `0`: `expanded:order-none` overrides the unprefixed `.order-last`, and B returns to its source position after A. | Pending |
| V3 | R5 | Same fixture as V1, in Chromium, Firefox and WebKit. | At 839px and at 840px, focus the element before the row and press Tab three times. | Focus moves A, B, C at both widths, whatever the visual order. | Pending |
| V4 | R4 | Built `dist/css/expressive.css`. | Read the computed `order` of children with only `.order-first`, only `.order-last`, and both, at 599px and 1600px. | -1, 1 and 1 at both widths, the same as on `origin/master`. | Pending |
| V5 | R1, R6 | `tests/expressivecss-skill.test.js` with `order-none` in its helpers class list. | Run the test. | The compiled CSS and the skill helpers reference both name `.order-none`. | Pending |
| V6 | Budget | `tests/selective-builds.test.js` with a new reviewed budget line. | Run the selective builds test. | The recorded gzip size matches the build. | Pending |
| V7 | All | A clean tree after `npm run build:skill`. | Run `npm run verify` alone, which includes `check:generated`. | Every step passes. Known flakes are rerun alone before they count as failures. | Pending |

V1 to V4 run in `tests/helpers-browser.test.js`. V4 can share the V1 test if one fixture covers both.

## Manual checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V8 | R5, R6 | Open the docs helpers page in the dev server and read the flex table and the "Window-size prefixes" section. | Both list `.order-none` and the prefixed order classes, with the visual-only warning next to them. The examples render. | Pending |
| V9 | R6 | Read the order rows in `llm.md`, the skill helpers reference and the `CHANGELOG.md` entry. | All three name `.order-none` and the four prefixes, and none implies the classes change keyboard order. | Pending |

## Merge conditions

- V1 to V9 pass.
- The new browser test fails on `origin/master` and passes on the branch.
- Existing helper browser tests and the selective builds test still pass. V7 covers them.
- `npm run check:generated` passes after the last edit.
- Required CI checks pass and review conversations are resolved, as [CONTRIBUTING.md](../../../../../CONTRIBUTING.md) requires.
