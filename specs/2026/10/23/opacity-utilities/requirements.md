# Opacity utilities

Date: 2026-10-23
Roadmap phase: Phase 29, opacity utilities
Branch: `feature/2026-10-23-opacity-utilities`
Base: `origin/master` at `3ef49121a` (#405)
Status: specified; not implemented

Follow the [mission's agreed scope for utilities](../../../../mission.md#agreed-scope), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 29](../../../../roadmap.md#phase-29-opacity-utilities). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user asked for Phase 29 by number. It has no dependencies. Phases 25 to 28 are unfinished but are being specified on other branches, and none of them touches opacity. Phase 26 (position helpers) and Phase 28 (pointer utilities) will probably add classes to `src/sass/utilities/_helpers.scss` too, so this branch may need a small merge there.

## Current behavior

These facts come from the base commit.

- No utility class sets `opacity`. `src/sass/utilities/` has no opacity rule, and no `.opacity-*` selector exists anywhere in `src/sass`, `docs/src` or `semantics.json`.
- Components set their own opacity in the `components` layer. The M3 disabled-content value, 0.38, appears as `opacity: 0.38` in 15 declarations across component partials and `abstracts/_mixins.scss`, plus the carousel's `--md-comp-carousel-disabled-opacity` token. One example is `input[type="range"]:disabled` in `src/sass/components/forms/_slider.scss`. No component sets `opacity` with `!important`.
- `src/sass/custom.scss` declares `@layer tokens, base, components, utilities;`, so a non-important utility declaration beats a component declaration of the same property, and any unlayered page rule beats both.
- The M3 state-layer opacities (0.08, 0.1, 0.1, 0.16) are tokens in `src/sass/tokens/_state.scss`. They apply to overlays, not to whole elements.
- `src/sass/utilities/_helpers.scss` holds the single-purpose helpers. Its `$_layout` map is the only one that gets window-size prefixes. `docs/src/pages/helpers.astro` documents the helpers in sections listed in `defineSections`, and `llm.md` documents them under "Formatting" and nearby headings. `npm run build:skill` copies the helper reference into `skills/expressivecss/expressivecss-usage/references/helpers.md`.

An author who wants to dim a decorative image, a placeholder or a custom disabled control writes page CSS today.

## Scope

In scope: six opacity classes in the helpers partial, a browser test, the helpers docs page, `llm.md`, regenerated guidance and a gzip budget line.

Out of scope:

- Window-size prefixes. Opacity doesn't change layout, and the mission ties prefixes to layout changes.
- Hover, focus or other state variants.
- `!important`. The utilities layer already beats component opacity.
- Classes that read the state-layer tokens. Those values are for overlays.
- A disabled state. A dimmed element still takes clicks and focus.
- Rules in `semantics.json`. The classes carry no markup contract.

## Confirmed decisions

These came from the interview on 2026-10-23.

- The steps are 0, 25, 38, 50, 75 and 100 percent. Bootstrap's quarter scale covers general dimming, and 38 matches the M3 disabled-content opacity the framework already uses. The interview offered a plain quarter scale, M3 values only, and steps of ten; the user chose this mix.
- No window-size prefixes, no state variants and no `!important`. The user accepted these defaults with the scale.
- The work goes on a new `feature/2026-10-23-opacity-utilities` branch from `origin/master`, in three task groups: Sass, browser test, docs.
- Validation covers the per-class browser test, a test that a class beats a component's own opacity, and docs with `npm run verify`.

The tech stack also requires a reviewed gzip budget line for every bundle change. The user didn't pick the optional selective-build compile check, so the plan records the budget line and adds no compile check.

## Requirements

- R1. `.opacity-0`, `.opacity-25`, `.opacity-38`, `.opacity-50`, `.opacity-75` and `.opacity-100` set `opacity` to 0, 0.25, 0.38, 0.5, 0.75 and 1. The computed value matches in Chromium, Firefox and WebKit.
- R2. The classes are emitted in the `utilities` layer from `src/sass/utilities/_helpers.scss`, so the full build and a selective build that loads `helpers` both include them.
- R3. A class on an element whose component rule sets its own opacity wins. A disabled range input with `.opacity-100` computes opacity 1, and one with `.opacity-50` computes 0.5.
- R4. The classes set no other property, have no window-size prefix or state variant, and don't use `!important`, so an unlayered page rule still overrides them.
- R5. The helpers docs page and `llm.md` list each class with its value. The docs say that 38 is the M3 disabled-content opacity, that dimmed text still has to meet contrast unless it belongs to a disabled control, and that `.opacity-0` hides nothing from keyboards, pointers or assistive technology, so authors should use `.hide` or `hidden` to remove content.
- R6. Generated guidance matches `llm.md` after `npm run build:skill`, and `tests/selective-builds.test.js` records the CSS gzip change in a reviewed budget line.

## Technical constraints

- Emit the classes from a Sass map of class suffix to unitless value with `@each`, as `_helpers.scss` does for corners. Unitless numbers make `getComputedStyle` report `0.38`, not `38%`, and need no `sass:math`.
- No TypeScript changes, so the fallow complexity gate doesn't apply.
- Build before testing; the tests read `dist/css/expressive.css`.
- Run `npm run build:skill` after the last edit to `llm.md` or the tests, because the contract hash covers them.

## Dependencies

None. If Phase 26 or Phase 28 edits the same partial on another branch, the later merge has to keep every block.

## Open decisions

None.
