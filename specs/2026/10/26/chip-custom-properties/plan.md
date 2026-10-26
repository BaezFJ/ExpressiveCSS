# Chip custom properties: implementation plan

Date: 2026-10-26
Roadmap phase: Phase 56, name chip custom properties under `--md-comp-chip`
Branch: `fix/chip-custom-properties`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: specification only; every implementation task is pending

Read [requirements.md](requirements.md) and [validation.md](validation.md). This plan follows the [mission](../../../../mission.md#product-rules), [technical constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 56](../../../../roadmap.md#phase-56-name-chip-custom-properties-under---md-comp-chip).

## 1. Specify the compatibility regressions in existing tests

Outcome: focused tests distinguish new-property support, legacy fallback, and per-property precedence.

Prerequisite: the recorded base contains Phase 53. Delivers coverage for R1 to R4 through V1 to V3.

- [ ] Extend `tests/chips-rem.test.js` using `tests/css.js` and its existing selective compilation. Check the three new reads and legacy fallbacks in full and selective sheets, retaining default sizing and spacing assertions.
- [ ] Extend `tests/chips-rem-browser.test.js` with V2's customization matrix at 16px and 32px roots in Chromium, Firefox, and WebKit. Cover static chip variants and an initialized generated chip. Keep component and browser cleanup in `finally` blocks.
- [ ] Keep the current scaling, wrapping, input containment, and legacy fixed-value tests. Inspect `tests/rem-font-sizes.test.js` and adjust its font-default guard only if moving defaults would otherwise bypass it.
- [ ] Build and run the focused checks. Record that new-property and precedence cases fail against the unchanged implementation while existing legacy and default cases pass.

Completion check: tests fail for the missing Phase 56 behavior and make every V2 row observable without weakening the Phase 53 regressions. Initial expected failures do not count as completed acceptance.

## 2. Read new properties in the shared chip stylesheet

Outcome: new and legacy customization both work with the confirmed precedence.

Prerequisite: group 1 exposes the missing behavior. Delivers R1 to R4 through V1 to V3.

- [ ] Update the padding, label-size, and direct child icon-size reads in `src/sass/components/_chips.scss` to use their new names with the old names as fallbacks. Preserve legacy defaults and the existing selectors and layout rules.
- [ ] Keep the nested close glyph, avatar, editable input, and other chip dimensions under their existing rules. Use no TypeScript changes, aliases in script, or new helpers.
- [ ] Rebuild and pass V1/V2, including override removal, mixed naming, all-three-property precedence, unchanged defaults, and full/selective output.
- [ ] Run V3's chip, form, reflow, and shadow-root regressions. Investigate any rendering or interaction change beyond the requested customization.

Completion check: V1 to V3 pass in all required engines, old chip-local overrides still work, and removing new overrides restores the correct fallback.

## 3. Document deprecation and finish verification

Outcome: authors can migrate using the documented mapping, and the change has reviewable delivery evidence.

Prerequisite: group 2 passes focused checks. Delivers R5 through V4/V5 and verifies R1 to R4 in the required suites.

- [ ] Update `docs/src/pages/chips.astro`, `llm.md`, and Unreleased `CHANGELOG.md`. Show the new names and precedence, mark old names deprecated, and state their continued support without a removal date.
- [ ] Measure base/head minified CSS with the gzip method in `tests/selective-builds.test.js`. Record the measured size and delta in its reviewed budget lines; investigate an unexpected JavaScript change.
- [ ] Regenerate with `npm run build:semantics` and `npm run build:skill`, review the generated diff and affected provenance, and pass V4's contributor, all-engine browser, MCP, and package commands sequentially.
- [ ] Run V5's visual comparison against the recorded base and inspect chip fixtures at both root sizes. Record valid captures, differences, and BaezFJ's required visual review before merge.
- [ ] Record actual command results and remaining blockers in validation.md. Keep the roadmap completion state unchanged during this specification workflow.

Completion check: every requirement has passing mapped acceptance evidence, required CI and reviews are satisfied, and no missing or skipped required check appears as a pass. This specification does not authorize implementing, committing, pushing, opening a PR, merging, or publishing.
