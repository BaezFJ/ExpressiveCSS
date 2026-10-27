# Responsive visual ordering: plan

Roadmap: [Phase 62: responsive visual ordering](../../../../roadmap.md#phase-62-responsive-visual-ordering). Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

## 1. Prefixed order classes in Sass

Prerequisites: none.

- [ ] In `src/sass/utilities/_helpers.scss`, delete the `.order-first` and `.order-last` rules from the "On a flex or grid child" block.
- [ ] Add `"order-first": (order: -1)`, `"order-last": (order: 1)` and `"order-none": (order: 0)` to `$_layout`, in that order.
- [ ] Update the comment above `$_layout` if it no longer describes the map's contents.
- [ ] Run `npm run build` and confirm `dist/css/expressive.css` has `.order-none` and an `.expanded\:order-first` rule inside the `width >= 840px` query.

Completion check: the built CSS has all fifteen order classes (three unprefixed and twelve prefixed), and unprefixed `.order-first` and `.order-last` declare the same values as before.

Covers R1, R2, R3, R4.

## 2. Regression tests and gzip budget

Prerequisites: group 1.

- [ ] Add a browser test to `tests/helpers-browser.test.js` next to "window-size prefixes switch layout from their size class up". Use a flex row of three focusable children where one child has `order-last expanded:order-none` and another has `expanded:order-first`.
- [ ] At 839px and 840px widths, assert each child's computed `order` and its left-to-right box position.
- [ ] At both widths, press Tab through the row and assert focus follows DOM order.
- [ ] Run the test in Chromium, Firefox and WebKit inside one of the file's existing `for (const [engine, browserType, utilityTest] of engines)` loops.
- [ ] Add `order-none` to the class list in the helpers test in `tests/expressivecss-skill.test.js`, so the compiled CSS and the skill reference must both name it.
- [ ] Add a reviewed gzip budget line to `tests/selective-builds.test.js` with the new size and the delta.

Completion check: the new browser test fails on `origin/master` and passes on the branch.

Covers R1, R2, R3, R4, R5, R6.

## 3. Documentation and generated guidance

Prerequisites: group 1. Run the last task after group 2.

- [ ] `docs/src/pages/helpers.astro`: add `.order-none` to the flex table row, add order to the prefixed class list in the "Window-size prefixes" section, and keep the visual-only warning.
- [ ] `llm.md`: update the Flex table row for the order classes and the prefixed-class list in the same way.
- [ ] `skills/expressivecss/expressivecss-usage/references/helpers.md`: update the order row and the "Window-size prefixes" paragraph.
- [ ] `CHANGELOG.md`: add an entry under `[Unreleased]` → `Added`.
- [ ] Run `npm run build:skill` after the last source edit.

Completion check: `npm run check:generated` passes, and each of the three references lists `.order-none` and says the prefixed order classes change visual order only.

Covers R5, R6.

## 4. Verify

Prerequisites: groups 1 to 3.

- [ ] Run `npm run verify` on its own, with no other test suite running.
- [ ] Rerun any failure listed in the known-flake notes alone before debugging it, then rerun the verify steps it skipped.

Completion check: every automated check in [validation.md](validation.md) passes.

Covers V1 to V7.
