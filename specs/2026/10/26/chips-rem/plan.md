# Size chips in rem: implementation plan

Date: 2026-10-26
Roadmap phase: Phase 53, size chips in rem
Branch: `fix/chips-rem`
Base: `origin/master` at `e2481457f17e11ea6351616899ec8fd319aba35e`
Status: specified; all implementation tasks pending

Scope is defined in [requirements.md](requirements.md), under the [mission](../../../../mission.md#product-rules), [framework constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 53](../../../../roadmap.md#phase-53-size-chips-in-rem). Checks are defined in [validation.md](validation.md).

## 1. Add regression checks for chip scaling

Outcome: focused tests expose the current px sizing and protect markup and overrides.

Prerequisite: the recorded base is available; the framework can build and all three browser engines are installed, locally or in the documented container. Covers R1 to R5 through V1 to V4.

- [ ] Remove the `_chips.scss` exemption in `tests/rem-font-sizes.test.js`. Include regression coverage for chip font-size custom-property defaults, which the existing literal-property regex does not detect.
- [ ] Add proposed `tests/chips-rem.test.js` using `tests/css.js` for the compiled declarations, default dimensions, preserved spacing, and selective Sass output where appropriate. Reuse existing selective-build checks rather than add another runner.
- [ ] Add proposed `tests/chips-rem-browser.test.js` using `tests/browser.js` across Chromium, Firefox, and WebKit. Cover 16px/32px defaults, token and legacy overrides, static variants, generated input chips, long labels, and input containment. Load the built CSS and JS and use `finally` cleanup.
- [ ] Build and run the focused checks to establish failures caused by current chip sizes. Run the existing chip markup, form, and reflow tests to distinguish new expectations from regressions. Record actual failures; do not treat missing engines as baseline evidence.

Completion check: V1 to V3 fail for the relevant current sizes or token source, while V4 establishes existing behavior. Test names and fixture measurements identify the expected values in R1 and R2.

## 2. Convert the shared chip styles

Outcome: default chip content grows with the root font size using the existing shared stylesheet.

Prerequisite: group 1 identifies the failing expectations. Delivers R1 to R4, checked by V1 to V4.

- [ ] In `src/sass/components/_chips.scss`, make `--font-size` read the label-large font-size token and make `--font-size-icon` interpolate `rem(18px)`.
- [ ] Convert chip minimum height, avatar and close-button dimensions, and editable input font size, height, and width limits to the rem equivalents in R2. Preserve the nested close glyph's existing shared button icon size.
- [ ] Keep existing px spacing, selectors, states, and custom-property names. Verify generated named-input chips as well as static spans, buttons, and checkbox labels. Fix any resulting containment issue in the shared chip rules without changing component behavior.
- [ ] Build and run V1 to V4 sequentially. Retain the existing 16px-root reflow assertions; do not weaken them to permit unintended layout changes.

Completion check: the R1/R2 values and customizations pass in each engine, R3 layouts contain their content, and existing interaction/form regressions pass. No TypeScript, public exports, or markup rules change.

## 3. Update docs and finish verification

Outcome: docs explain the scaling, generated guidance agrees, and implementation evidence is ready for review.

Prerequisite: group 2 passes its focused checks. Delivers R5 and rechecks R1 to R4 through V1 to V6.

- [ ] Update `docs/src/pages/chips.astro`, the Chips section of `llm.md`, and `CHANGELOG.md`. Explain the default 32px-to-64px minimum height, label-large font size, scaled content boxes, retained px spacing, and existing custom-property overrides.
- [ ] Measure the built minified CSS gzip size against the selected base and add the reviewed value and delta to `tests/selective-builds.test.js`. Run existing selective-build checks. Investigate any unrelated bundle change.
- [ ] Regenerate with `npm run build:semantics` and `npm run build:skill` after final source, docs, and test edits. Review source-provenance requirements if an affected recorded capability becomes stale; retain truthful review and browser evidence.
- [ ] Run the contributor, all-engine browser, MCP, and package checks in V5 sequentially. Run the visual comparison and obtain the required review in V6 before an implementation PR can merge. Record outcomes and limitations, leaving any unrun check pending.

Completion check: every requirement has passing acceptance evidence, generated files agree with their sources, the gzip change is reviewed, required visual review is recorded, and the repository's CI/review rules are satisfied. Specification alone checks off none of these tasks. Keep the roadmap unchanged in this specification task; implementation, commits, pushing, and PR creation require a separate request.
