# Icon foundation

Use `src/sass/components/_icons-material-design.scss` for icon classes and custom properties, and `src/sass/base/_fonts.scss` for bundled font faces.

## Canonical markup

Use a `span` and the `.material-symbols` class for the default outlined Material Symbols face.

```html
<span class="material-symbols" aria-hidden="true">search</span>
```

`.material-symbols` and `.material-symbols-outlined` both select the outlined family. `.material-symbols-rounded` and `.material-symbols-sharp` select the other bundled families. `.material-icons` is a legacy compatibility alias; do not choose it for new work.

| Class | Family |
|---|---|
| `.material-symbols` | Material Symbols Outlined |
| `.material-symbols-outlined` | Material Symbols Outlined |
| `.material-symbols-rounded` | Material Symbols Rounded |
| `.material-symbols-sharp` | Material Symbols Sharp |
| `.material-icons` | legacy Material Icons compatibility |

Use `.icon-filled` to set the variable font fill axis to `1`.

```html
<span class="material-symbols icon-filled" aria-hidden="true">favorite</span>
```

## Per-icon axes

Set the custom properties on the icon or an ancestor:

| Property | Default | Supported range or value |
|---|---:|---|
| `--md-icon-font` | `"Material Symbols Outlined"` | any compatible font family the application loads; the package bundles Outlined, Rounded, and Sharp |
| `--md-icon-fill` | `0` | `0` or `1` |
| `--md-icon-weight` | `400` | `100`–`700` |
| `--md-icon-grade` | `0` | `−50`–`200` |
| `--md-icon-optical-size` | `24` | `20`–`48`, unitless |

```html
<span class="material-symbols custom-symbol" aria-hidden="true">bolt</span>
```

```css
.custom-symbol {
  --md-icon-font: "Material Symbols Rounded";
  --md-icon-fill: 1;
  --md-icon-weight: 500;
  --md-icon-grade: 0;
  --md-icon-optical-size: 24;
}
```

The inherited `icon-style` attribute changes the family for a subtree or shadow host. Supported forms are `icon-style="outlined"`, `icon-style="rounded"`, and `icon-style="sharp"`. Prefer a family class for one icon and `icon-style` for a whole region.

```html
<nav icon-style="rounded">
  <span class="material-symbols" aria-hidden="true">home</span>
</nav>
```

## Size helper presets

These helpers are convenience presets; they do not restrict per-icon axis values.

| Helper | Font size | Optical size |
|---|---:|---:|
| `.tiny` | `1rem` | `20` |
| `.small` | `2rem` | `24` |
| `.medium` | `4rem` | `40` |
| `.large` | `6rem` | `48` |

Apply these as a second class, for example `<span class="material-symbols small">settings</span>`. Use component defaults for button, navigation, and field icons instead of forcing a size helper.

`.left` floats an icon left and adds a physical `margin-left: -8px`; `.right` floats it right. Avoid both in new flex/grid layouts and in RTL-sensitive UI. Prefer layout gap and logical properties.

## Fonts and color

The distributed CSS expects the bundled fonts at `../fonts/` relative to `dist/css/`. Sass consumers can change `$expressive-font-path` or set `$expressive-include-fonts: false` when the application provides equivalent faces.

Icons inherit `color`. Use semantic color tokens or a `*-text` utility; do not put a background color role class on an icon when you intend to change its glyph color.

## Accessibility

- Decorative icons: set `aria-hidden="true"`.
- Icon next to a visible label: hide the icon from assistive technology unless it adds meaning not present in the label.
- Standalone informative icon: give the icon `role="img"` and an `aria-label`, or provide adjacent accessible text.
- An icon-only button needs an accessible name on the button, usually `aria-label`; hiding its child icon does not name the control.
- Never depend on the ligature word or glyph shape as the only status cue.

```html
<button class="icon-button" type="button" aria-label="Search">
  <span class="material-symbols" aria-hidden="true">search</span>
</button>
```

Verify the icon family loads, the ligature does not flash as readable text, color contrast is sufficient, and the control retains the component's target size.
