---
name: expressivecss-theming
description: Theme ExpressiveCSS with Material 3 color roles.
---

## ExpressiveCSS themes and colors

## When to use

Use this guide for color, typography, icon styling, themes, schemes, vibrant regions, or other visual tokens.

## Do not use when

Do not load this guide for unrelated markup repair, setup, or JavaScript lifecycle work. It does not replace the selected component contract or Material 3 component behavior.

Read the target version's [Themes](https://www.expressivecss.com/themes.html.md) and [Color](https://www.expressivecss.com/color.html.md) documentation before changing tokens.

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

Check light, dark, auto/OS-following, nested scheme overrides, and any vibrant region. Verify text and non-text contrast, native-control color scheme, and the absence of a wrong-theme flash when the application persists a choice.
