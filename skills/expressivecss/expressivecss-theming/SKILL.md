---
name: expressivecss-theming
description: Theme ExpressiveCSS color roles, brand seeds, typography, shape, motion, icons, elevation, state layers, and light/dark schemes. Use for visual tokens and brand changes; exclude unrelated markup and runtime lifecycle repairs.
---

## ExpressiveCSS themes and colors

## When to use

Use this guide for color, typography, icon styling, themes, schemes, vibrant regions, state layers, or other visual tokens such as shape, motion, elevation, and shadows.

## Do not use when

Do not load this guide for unrelated markup repair, setup, or JavaScript lifecycle work. It does not replace the selected component contract or Material 3 component behavior.

Reuse the root version resolution and load only the relevant focused reference below. Consult its linked target-version documentation for missing details, conflicts, or version uncertainty.

## Focused references

Load only the references needed for the task:

- For semantic color tokens, utility classes, role pairings, and transparency, read the [color reference](./references/color.md).
- For light/dark/auto selection, seed overrides, nested schemes, Shadow DOM, and vibrant regions, read the [themes reference](./references/themes.md).
- For `z-depth-*`, Sass elevation mixins, and shadow-state rules, read the [elevation reference](./references/elevation.md).
- For Material Symbols families, axes, sizing, font delivery, and icon accessibility, read the [icons reference](./references/icons.md).
- For the 15 baseline type roles, expressive emphasis, font support, and semantic hierarchy, read the [typography reference](./references/typography.md).
- For component corners, state shape changes, and shape support gaps, read the [shape reference](./references/shape.md).
- For spatial versus effects motion, component timing ownership, and reduced motion, read the [motion reference](./references/motion.md).
- For hover, focus, pressed, and dragged opacity tokens, overlay and ring forms, and per-component overrides, read the [state-layers reference](./references/state-layers.md).

### Select a scheme

- No `theme` attribute follows the operating-system preference.
- `theme="auto"` explicitly follows the operating-system preference.
- `theme="light"` and `theme="dark"` lock the scheme.
- Change the attribute at runtime; there is no `Expressive.theme` JavaScript API.
- Add `vibrant` to a focused subtree for the Material 3 Expressive tertiary-surface emphasis axis. Do not put it on the whole page by default.

### Use semantic roles

Consume live `--md-sys-color-*` tokens and their matching utilities. Pair every container with its `on-*` foreground, for example `primary` with `on-primary` and `surface` with `on-surface`.

Use surface roles for most of the page. Reserve primary for the most important action or emphasis in a region. Use error roles for errors, not for generic decoration.

```css
.panel {
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface);
}
```

For transparency, mix a complete color token with transparent:

```css
.overlay {
  background: color-mix(in oklab, var(--md-sys-color-primary) 6%, transparent);
}
```

Do not use `rgba(var(--md-sys-color-primary), 0.06)`: the token stores a complete color, not RGB channels.

### Customize a theme

Set `--md-source` to regenerate the primary, secondary, tertiary, neutral, and neutral-variant ramps at runtime:

```css
:root {
  --md-source: #6750a4;
}
```

The error ramp deliberately does not follow the seed. Override documented `-light` and `-dark` role pairs only when you need surgical control over both schemes. Components should still consume the live role without a suffix.

### Rules

- Do not hard-code a color when a semantic role expresses the same intent.
- Do not consume `--md-sys-color-*-light` or `-dark` inside components; those are backing pairs, not live roles.
- Do not restore the removed 2014 palette classes or a Sass color lookup function.
- Use `color-mix(in oklab, ...)`, not sRGB interpolation, for state and translucent role colors.
- Load application token overrides after ExpressiveCSS.
- Keep shadow-root token anchors paired when modifying the framework itself.

## Verification

Check light, dark, auto/OS-following, nested scheme overrides, and any vibrant region. Use the [focused web checks](../expressivecss-accessibility/references/web-checks.md#contrast-after-theme-overrides) for affected contrast and forced colors. Verify native-control color scheme, and the absence of a wrong-theme flash when the application persists a choice.
