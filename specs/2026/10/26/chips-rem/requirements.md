# Size chips in rem

Date: 2026-10-26
Roadmap phase: Phase 53, size chips in rem
Branch: `fix/chips-rem`
Base: `origin/master` at `e2481457f17e11ea6351616899ec8fd319aba35e`
Status: specified; implementation pending

Follow the [mission's product rules](../../../../mission.md#product-rules), [framework constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 53](../../../../roadmap.md#phase-53-size-chips-in-rem). Work groups are in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 1 to 51 are marked complete. Phase 52 remains expanded in the roadmap, but the selected base contains its implementation in commit `e2481457f`, merged as PR #440. Its rem conversions and regression tests are present. Phase 53 is the earliest unfinished phase and has no dependencies. This specification leaves the roadmap's completion state unchanged.

## Current behavior

These facts come from the selected base and direct source inspection.

- `src/sass/components/_chips.scss` sets `--font-size: 14px`, `--font-size-icon: 18px`, and a 32px minimum chip height. Avatars and close buttons are 24px square. The editable input has a 16px font, 32px height, and width limits of 100px and 200px.
- The same stylesheet already supports span, button, and checkbox-label chips, outlined and selected states, and wrapping labels. It retains 4px block padding, an 8px chip content gap, and `--padding: 8px`.
- `src/sass/abstracts/_mixins.scss` provides `rem($px)`, which converts a 16px-based dimension to rem. `src/sass/tokens/_reference.scss` defines label-large's font size as `0.875rem`, equivalent to 14px at the default root size.
- `src/ts/components/chips.ts` renders `.chip` spans, optional images, and `.close` buttons with nested Material Symbols. Its editable input receives `.input`; named inputs can sit inside `expressive-chips-control`. The nested close glyph already follows the base icon's rem size and differs from the direct child icon's 18px size.
- `tests/rem-font-sizes.test.js` exempts `_chips.scss` until Phase 53. `tests/reflow-browser.test.js` checks chip height and wrapping in Chromium at the default size. `tests/chips.test.js`, `tests/chips-form.test.js`, and `tests/chips-form-browser.test.js` cover generated markup and behavior.

The fixed chip sizes do not grow with the reader's root font size. The existing rem helper and type token cover the conversion without new helpers or runtime code.

## Confirmed decisions

The interview on 2026-10-26 confirmed these choices.

1. Use Phase 53 and branch `fix/chips-rem` from the recorded `origin/master` commit. Work in three groups: regression checks, shared chip styles, then docs and verification.
2. Scale the label, icon, minimum height, editable input, avatar, and close-button boxes. Read the label-large font-size token through the existing `--font-size` default. Keep padding, gaps, and borders in px.
3. Preserve existing custom-property names and component behavior. Phase 56 owns renaming properties to `--md-comp-chip-*`.
4. Require automated 16px/32px checks in all three browser engines, wrapping and input containment, existing behavior regressions, the guard exemption's removal, gzip review, contributor/package checks, and visual review before merge.

## Requirements

### R1. The chip label follows the label-large font-size token

The default `--font-size` reads `--md-sys-typescale-label-large-font-size`. With the shipped token, chip labels render at 14px for a 16px root and 28px for a 32px root. An author override of the label-large font-size token affects an otherwise uncustomized chip. Preserve the existing weight, unitless line height, font family, and letter spacing; this phase adopts the font-size token only.

### R2. Chip content dimensions scale with the root font size

Use the existing `rem()` helper for the following default dimensions. Interpolate Sass results in custom-property declarations.

| Element or property | At a 16px root | At a 32px root |
| --- | --- | --- |
| Direct child Material Symbol font size, through `--font-size-icon` | 18px | 36px |
| Chip minimum height | 32px | 64px |
| Avatar image width and height | 24px | 48px |
| Close-button width and height | 24px | 48px |
| Editable input font size | 16px | 32px |
| Editable input height | 32px | 64px |
| Editable input minimum width | 100px | 200px |
| Editable input maximum width | 200px | 400px |

The nested close glyph retains the base icon sizing, 24px and 48px respectively. Do not apply the direct child icon's 18px default to it.

### R3. Enlarged chips retain wrapping and input containment

At both root sizes, a short default chip has the expected 32px or 64px height, including variants with an avatar or close button. A long label wraps and grows the chip vertically within its parent, with the existing 4px top and bottom inset. In a 320px-wide fixture, an initialized editable chips field keeps its input text vertically inside its input and its input and chips within the field. Avatar images, leading icons, and close glyphs stay inside their boxes without overlapping labels. Padding, gaps, borders, margins, and shape settings keep their existing declarations and units.

### R4. Existing author markup and customization keep working

Keep `.chip`, `.chips`, checkbox-label chips, outlined and selected styles, and the `--font-size`, `--font-size-icon`, and `--padding` names. Explicit consumer values still control their existing properties, including fixed px values. Preserve accessible names, keyboard focus, add/remove behavior, and form submission, reset, validity, and disabled state. Static chip fixtures require no component initialization. No TypeScript API, export, markup rule, or runtime behavior changes are planned.

### R5. Regression coverage and delivery records describe the change

Remove the chips exemption from the font-size guard and cover the chip custom-property defaults so a px default cannot bypass it. Add focused compiled-CSS and browser regressions using existing helpers. Update the chips docs, `llm.md`, and Unreleased changelog with rem scaling and the retained px spacing. Record measured CSS gzip size and its delta in `tests/selective-builds.test.js`; regenerate guidance from its sources and pass the required checks and visual review in validation.md. All implementation and acceptance results remain pending at specification time.

## Scope and constraints

The shared implementation is `src/sass/components/_chips.scss`. Reuse its abstracts import and the existing type token. Preserve selectors and specificity. Keep the full and selective Sass builds working, including the supported shadow-root stylesheet use.

Tests read built bundles. Build first, run suites sequentially, and tear down initialized components, browser leases, and timers in `finally` blocks. Never initialize components in a static semantics check. Follow [CONTRIBUTING.md](../../../../../CONTRIBUTING.md) and [Sass architecture](../../../../../src/sass/README.md). Generated guidance comes from `semantics.json`, `llm.md`, the docs data, and the generators; do not hand-edit generated files or renew review evidence merely by changing a pin.

Excluded work includes property renaming in Phase 56, other components' fixed containers from Phase 52, a full chip type-role change, new tokens or abstractions, TypeScript changes, dependencies, and release publication. The changelog records the larger-font rendering change while documenting the retained markup and overrides.

## Dependencies and open decisions

There are no phase prerequisites or open interview decisions. The selected base supplies Phase 52's guard and rem helper. Phase 56 can build on this work later. Missing browser engines, failed captures, unresolved regressions, or unavailable required review evidence block acceptance rather than count as passes.
