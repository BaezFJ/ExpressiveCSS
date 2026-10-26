# Name chip custom properties under `--md-comp-chip`

Date: 2026-10-26
Roadmap phase: Phase 56, name chip custom properties under `--md-comp-chip`
Branch: `fix/chip-custom-properties`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: specification only; implementation and acceptance checks pending

Follow the [mission's product rules](../../../../mission.md#product-rules), [framework constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 56](../../../../roadmap.md#phase-56-name-chip-custom-properties-under---md-comp-chip). Work groups are in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection and dependency

Javier explicitly selected Phase 56. Its only dependency is Phase 53, size chips in rem. The base includes that implementation in `5ecfbbbf9`, merged as PR #441, with its styles and regression tests. The roadmap still has expanded entries for phases 52 to 55. Selecting Phase 56 does not declare those phases complete or make Phase 55 a prerequisite. Leave the roadmap's completion state unchanged.

## Current behavior

The following facts come from source inspection at the recorded base.

- `src/sass/components/_chips.scss` declares `--padding: 8px`, `--font-size: var(--md-sys-typescale-label-large-font-size)`, and `--font-size-icon: 1.125rem` on `.chip`. The chip reads them for left/right padding, label font size, and direct child Material Symbol font size.
- Phase 53 already supplies rem sizing. With a 16px root, default label, leading icon, and minimum height are 14px, 18px, and 32px. With a 32px root, they are 28px, 36px, and 64px. Block padding stays 4px and the content gap stays 8px.
- `src/ts/components/chips.ts` creates `.chip` spans with optional images and named `.close` buttons. It does not read or write these custom properties. The nested close glyph follows shared button icon sizing, separately from the direct child chip icon.
- `tests/chips-rem.test.js` checks full and selective Sass output. `tests/chips-rem-browser.test.js` checks scaling, legacy chip-local overrides, wrapping, and interaction in all three engines. The docs page and Chips section of `llm.md` teach the old names.

The generic property names differ from the component-prefixed names used elsewhere in the framework. Phase 56 gives authors chip-specific names while preserving existing customization.

## Confirmed decisions

The 2026-10-26 interview confirmed the phase, base, branch, and three implementation groups: regression tests, shared chip styles, then docs and verification. The public names are `--md-comp-chip-padding`, `--md-comp-chip-label-size`, and `--md-comp-chip-icon-size`. Each new name takes priority over its legacy counterpart. Old chip-local overrides and current defaults remain supported. Deprecation has no removal date.

Acceptance requires full/selective CSS checks, Chromium/Firefox/WebKit checks at 16px and 32px roots, existing chip/form regressions, measured gzip review, generated guidance, contributor and MCP/package checks, and visual comparison with maintainer review before merge.

## Requirements

### R1. Chips accept the component-prefixed properties

| New property | Controls | Legacy counterpart |
| --- | --- | --- |
| `--md-comp-chip-padding` | Left and right chip padding | `--padding` |
| `--md-comp-chip-label-size` | Chip label font size | `--font-size` |
| `--md-comp-chip-icon-size` | Direct child Material Symbol font size | `--font-size-icon` |

Valid author values on `.chip` control those declarations in full and selective builds. Preserve the existing selectors, specificity, and cascade layers. Padding remains an inline spacing control; it does not replace the existing block padding. Icon size does not resize avatars, close-button boxes, or the nested close glyph.

### R2. Each property falls back independently to its legacy counterpart

If an author supplies both valid names for the same control, the new name wins. If the new name is absent, the old name retains its current effect, including fixed px overrides on the chip. An author can mix new names and old names for different controls. Removing a new override restores the legacy value, or the existing default when no legacy override exists.

Use native CSS `var()` fallback chains in the shared declarations. Retain the existing legacy defaults as needed. Do not introduce a new local default that masks an authored old value. CSS handles invalid custom-property values by its normal rules; this phase adds no value parser or runtime validation.

### R3. Uncustomized chips retain Phase 53 sizing and layout

The label continues to follow `--md-sys-typescale-label-large-font-size`. The direct child icon keeps its 1.125rem default and horizontal padding stays 8px. Default computed values at 16px/32px roots remain label 14px/28px, icon 18px/36px, and minimum height 32px/64px. An override of the label-large font-size token still affects an otherwise uncustomized chip.

Keep block padding, gaps, borders, wrapping, avatar and close-button dimensions, and editable input dimensions unchanged. Long labels and initialized editable fields retain Phase 53's containment at a 320px viewport. Fixed px consumer values remain fixed when the root size changes.

### R4. Markup, runtime, and accessibility contracts remain compatible

The same `.chip` styling supports static span chips, button chips, checkbox-label chips, outlined/selected variants, and chips created by the existing runtime. Preserve keyboard focus and activation, accessible names, add/remove behavior, and form submission, reset, validity, and disabled behavior. Preserve supported shadow-root stylesheet use and selective Sass loading. No TypeScript, public export, runtime option, or semantics rule change is required.

### R5. Documentation and delivery records describe the compatibility policy

Update `docs/src/pages/chips.astro` and the Chips section of `llm.md` with the new-to-old mapping, unchanged defaults, and precedence. Add a working example using the new names. Mark all three old names deprecated in `CHANGELOG.md` under Unreleased, retain their compatibility, and give no removal date.

Regenerate committed guidance from its sources with `npm run build:semantics` and `npm run build:skill`; never edit generated copies by hand. Review any affected provenance records without claiming generation renews browser or source-review evidence. Record actual minified CSS gzip size and its delta against the base in `tests/selective-builds.test.js`. Complete the checks and review in validation.md before implementation can merge.

## Scope and constraints

Implement the fallback in `src/sass/components/_chips.scss` using existing Sass helpers and CSS custom properties. Extend the existing chip test files and fixtures instead of creating another customization system. Follow [CONTRIBUTING.md](../../../../../CONTRIBUTING.md) and [Sass architecture](../../../../../src/sass/README.md). Tests use built bundles; build first and run suites sequentially. Close browser leases and destroy initialized components in `finally` blocks. Static semantics checks never initialize components.

Excluded work includes removing legacy names, assigning a removal release, adding controls for other chip dimensions, changing the editable input's typography, changing other components, adding dependencies, runtime changes, and publication. This task creates the specification only. Implementation, commit, push, and PR creation require separate requests.

## Open decisions

None. Phase 53's implementation is present at the base. All Phase 56 implementation tasks and acceptance results remain pending. Missing engines, failed captures, unresolved regressions, or missing required review block merge.
