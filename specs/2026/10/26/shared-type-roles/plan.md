# Shared type roles implementation plan

Date: 2026-10-26
Roadmap phase: Phase 55, use the type role mixin where type is written by hand
Branch: `fix/shared-type-roles`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: specification only; every task below is pending

Use [requirements.md](requirements.md) for R1 to R5 and [validation.md](validation.md) for V1 to V8. Scope follows the [mission](../../../../mission.md#product-rules), [technical constraints](../../../../tech-stack.md#framework-constraints) and [Phase 55](../../../../roadmap.md#phase-55-use-the-type-role-mixin-where-type-is-written-by-hand).

| Requirement | Task groups | Validation |
| --- | --- | --- |
| R1 | 1, 2 | V1, V2, V8 |
| R2 | 1, 2 | V1, V2, V8 |
| R3 | 1, 2 | V3 |
| R4 | 1, 2, 3 | V2, V4, V8 |
| R5 | 3 | V5, V6, V8 |

## 1. Add regression checks for complete type roles

Outcome: focused tests detect the missing tracking and cover runtime token changes.

Prerequisites: the confirmed base and the existing Sass and test conventions. Delivers R1 to R4 through V1 to V4.

- [ ] Extend the existing compiled CSS checks in `tests/app-bar.test.js` and `tests/cards.test.js` to assert all five role declarations on the exact target rules. Reuse `tests/css.js` where useful.
- [ ] Add a focused all-engine test, proposed as `tests/shared-type-roles-browser.test.js`, using `engines` and `leaseBrowser` from `tests/browser.js`. Include navbar form inputs in `<nav>` and `.bar`, both card caption forms, and comparison elements for body-large and title-medium. Use static markup and clean up in `finally`.
- [ ] Check default computed values, runtime overrides of all five token properties, role isolation and an explicit consumer CSS override. Build the base CSS and record failures specifically caused by the missing tracking. Avoid unrelated fixture or runtime changes.

Completion check: V1 to V3 expose the missing letter-spacing against the base CSS. The four existing properties and compatibility assertions describe behavior that already passes. These failures are expected until group 2.

## 2. Use the shared mixin in the two component rules

Outcome: navbar form inputs and both card caption forms read their complete roles.

Prerequisite: group 1. Delivers R1 to R4 through V1 to V4.

- [ ] Replace the four body-large declarations in `src/sass/components/_navbar.scss` with `@include typescale("body-large");`.
- [ ] Replace the four title-medium declarations in the shared caption rule in `src/sass/components/_cards.scss` with `@include typescale("title-medium");`.
- [ ] Build the CSS and run the focused compiled and browser checks sequentially. Confirm the source diff preserves selectors, chart exclusions, layout and focus declarations. Leave the mixin, tokens and `.search-bar` unchanged.

Completion check: V1 to V4 pass in their required engines, and the default computed changes are limited to the intended tracking and its effects on text width.

## 3. Document the correction and complete verification

Outcome: documentation and generated guidance agree with the implementation, with measured and reviewed evidence before merge.

Prerequisite: group 2. Delivers R5 and verifies all requirements through V5 to V8.

- [ ] Add an Unreleased Fixed entry to `CHANGELOG.md`. Update the plain-form search description in `docs/src/pages/navbar.astro`, the media caption description in `docs/src/pages/cards.astro`, and their matching `llm.md` sections. Name body-large and title-medium and explain the added letter-spacing for existing markup.
- [ ] Measure the full minified CSS gzip delta against the base using the established size calculation in `tests/selective-builds.test.js`. Record the reviewed measurement without increasing a budget beyond the measured need.
- [ ] Review any affected capability metadata, then regenerate with `npm run build:semantics` and `npm run build:skill`. Confirm generated changes follow their sources.
- [ ] Run the required contributor, all-engine browser and package checks sequentially. Record actual results and any skips or reruns in `validation.md`.
- [ ] Capture the navbar and card comparisons and obtain BaezFJ's review of the intended visual change. Record the review before merge; leave roadmap completion unchanged until a later authorized update.

Completion check: V5 to V8 pass, every requirement has recorded evidence, required CI and review conditions are satisfied, and no dependent task remains blocked. Specification creation itself does not satisfy any implementation task.
