---
name: expressivecss-theming
description: Themes ExpressiveCSS color roles, brand seeds, typography, icon styling, shape, motion, elevation, state layers, vibrant regions, and light/dark schemes. Use for visual tokens and brand changes. Not for markup repair, setup, or JavaScript lifecycle work, and never a substitute for the selected component contract.
---

# ExpressiveCSS themes and colors

## Before changing tokens

Reuse the root version resolution. Before changing a brand choice, check the application's existing theme notes and token owner. For conflicting decisions or a change shared across pages, read the [product context reference](../expressivecss-design/references/product-context.md); a token-only task does not need the full Design workflow.

## Core rules

These rules apply to every token change. The references below hold the details and examples.

- Consume live `--md-sys-color-*` tokens and their matching utilities. Pair every container with its `on-*` foreground, such as `surface` with `on-surface`.
- Use surface roles for most of the page, primary for the most important action or emphasis in a region, and error roles only for errors.
- Do not hard-code a color when a semantic role expresses the same intent.
- For transparency, mix a complete token with `color-mix(in oklab, var(--md-sys-color-primary) 6%, transparent)`. Tokens store complete colors, so `rgba(var(--md-sys-color-primary), 0.06)` is invalid.
- Set `--md-source` to change the brand seed. Components consume the unsuffixed live role; never consume `--md-sys-color-*-light` or `-dark` backing pairs.
- Select the scheme with the `theme` attribute on `<html>` or a shadow host (`auto`, `light`, or `dark`; absent follows the OS). There is no `Expressive.theme` JavaScript API.
- Put `vibrant` on a focused subtree only, never the whole page by default.
- Load application token overrides after ExpressiveCSS.

## Focused references

Read only the reference for the token family you are changing:

- Read the [color reference](./references/color.md) before choosing roles, utility classes, pairings, transparency, or the scrim.
- Read the [themes reference](./references/themes.md) before changing scheme selection, a persisted theme choice, the seed, `-light`/`-dark` overrides, nested schemes, Shadow DOM, or vibrant regions.
- Read the [elevation reference](./references/elevation.md) before using `z-depth-*`, the Sass elevation mixin, or shadow-state rules.
- Read the [icons reference](./references/icons.md) before changing Material Symbols families, axes, sizing, font delivery, or icon accessibility.
- Read the [typography reference](./references/typography.md) before changing type roles, emphasis, typefaces, or text helpers.
- Read the [shape reference](./references/shape.md) before changing component corners or state shape.
- Read the [motion reference](./references/motion.md) before changing component timing, spatial or effects motion, or reduced-motion behavior.
- Read the [state-layers reference](./references/state-layers.md) before changing hover, focus, pressed, or dragged opacity tokens or per-component overrides.

## Verification

Check light, dark, auto with both OS preferences, nested scheme overrides, and any vibrant region. For affected contrast and forced colors, run the [focused web checks](../expressivecss-accessibility/references/web-checks.md#contrast-after-theme-overrides). Verify native-control color scheme, and the absence of a wrong-theme flash when the application persists a choice. Fix any failure, then repeat the same checks.
