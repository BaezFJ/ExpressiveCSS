# Shared type roles for navbar search and card media

Date: 2026-10-26
Roadmap phase: Phase 55, use the type role mixin where type is written by hand
Branch: `fix/shared-type-roles`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: specification only; implementation pending

Follow the [mission's product rules](../../../../mission.md#product-rules) and [success criteria](../../../../mission.md#success-criteria), the [framework constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 55](../../../../roadmap.md#phase-55-use-the-type-role-mixin-where-type-is-written-by-hand). Implementation tasks are in [plan.md](plan.md), and acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 1 to 51 are marked complete. Phases 52 to 54 still have their original roadmap descriptions, but the base includes their implementations through merged changes #440, #441 and #442. Phase 55 is the earliest remaining unimplemented phase and has no dependencies. The source finding is M2 in `TASKS.md`. The roadmap's completion state stays unchanged in this specification.

## Current behavior

These facts come from the base commit's source and existing tests. No build or browser check ran during specification.

- `src/sass/components/_navbar.scss` writes four body-large declarations for inputs inside a direct `<form>` child of an app bar. It omits letter-spacing. This is the documented plain-form variant, including bars built with `<nav>` or `.bar`.
- `src/sass/components/_cards.scss` writes four title-medium declarations on the shared media caption rule. It covers `article > figure > figcaption` and `article > .primary-action > figure > figcaption`, with the existing chart exclusions. It also omits letter-spacing.
- `typescale()` in `src/sass/abstracts/_mixins.scss` emits font-family, font-size, font-weight, line-height and letter-spacing using the selected role's tokens. Both component partials already use the shared abstracts.
- `.search-bar` in `src/sass/components/_search.scss` already uses body-large through `typescale()`. It needs no change. `tests/typography.test.js` records body-large tracking as `0.03125rem` and title-medium tracking as `0.009375rem`.
- `tests/app-bar.test.js`, `tests/cards.test.js` and `tests/typography.test.js` check built CSS. `tests/browser.js` provides the shared all-engine test and browser lease helpers.

The omitted declaration lets inherited or base letter-spacing replace the role's value. Reusing the existing mixin makes these elements follow the same complete type roles as other components, including theme overrides.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | App bar form inputs take all five typography properties from body-large through `@include typescale("body-large")`. Their computed letter-spacing follows the body-large token. |
| R2 | Both existing card media caption selectors take all five typography properties from title-medium through `@include typescale("title-medium")`. Their computed letter-spacing follows the title-medium token. |
| R3 | Changing either role's font-family, font-size, font-weight, line-height or letter-spacing tokens at runtime updates its target elements without rebuilding CSS or initializing components. The other role retains its own values. |
| R4 | Existing selectors, specificity, chart exclusions, component geometry declarations, colors, focus rules, markup and runtime behavior stay compatible. With default tokens, the four existing typography values stay the same; letter-spacing is the intended visual correction. Existing consumer CSS overrides continue to work. |
| R5 | `CHANGELOG.md`, the relevant navbar and card docs, and their `llm.md` sections explain the complete type roles and the letter-spacing correction. Generated guidance agrees with those sources. The implementation records the measured CSS gzip delta in the reviewed budget history. |

## Confirmed scope and decisions

The user confirmed all three interview groups on 2026-10-26.

- Use `fix/shared-type-roles` from the confirmed `origin/master` revision. Divide implementation into regression checks, the two Sass replacements, then docs and verification.
- Replace only the two hand-written declaration groups with the existing `typescale()` calls. Keep the shared mixin and token definitions unchanged.
- Update `docs/src/pages/navbar.astro`, `docs/src/pages/cards.astro`, `llm.md` and the Unreleased CHANGELOG. Explain the correction for existing markup because the added tracking can change text width or wrapping.
- Require computed checks for all five properties and live token overrides in Chromium, Firefox and WebKit, plus regression, generated-data, package, gzip and contributor checks.
- Require visual review of the navbar form input and both caption forms before merge. A successful automated check does not satisfy that review.

## Exclusions

Other stylesheet review phases, a typography audit of additional components, new tokens or helpers, and TypeScript changes are outside scope. Preserve the `.search-bar` implementation, public exports, dependencies and markup rules. No publication, commit, push or pull request is authorized by this specification task.

## Technical constraints and dependencies

Use the existing Sass module structure described in `src/sass/README.md`. Tests consume built bundles, so build before testing. Reuse `tests/css.js` for compiled CSS inspection and `tests/browser.js` for all-engine computed checks. Close browser leases and any test resources in `finally` blocks. Do not initialize components for static style checks.

Run test suites sequentially. Regenerate derived files with `npm run build:semantics` and `npm run build:skill`; edit their source files only. If generated capability metadata reports stale source pins, review the affected records in `docs/src/data/component-decisions.json` before updating them. Generation does not establish new browser or visual evidence.

There are no phase dependencies or deferred product decisions. Implementation, validation results and visual approval remain pending.
