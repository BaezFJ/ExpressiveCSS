# Theme foundation

Use `src/sass/tokens/_reference.scss`, `_theme.scss`, and `_vibrant.scss` as the implementation sources. ExpressiveCSS themes are CSS custom properties resolved through `light-dark()` and `color-scheme`.

## Scheme contract

Apply the public `theme` attribute to the document root, or to a custom-element host when the stylesheet is installed in its shadow root.

| State | Behavior |
|---|---|
| No `theme` attribute | follows `prefers-color-scheme` |
| `theme="auto"` | explicitly follows `prefers-color-scheme` |
| `theme="light"` | locks the light role values |
| `theme="dark"` | locks the dark role values |

There is no `Expressive.theme` JavaScript API. Change the attribute directly.

```js
const root = document.documentElement;
root.setAttribute('theme', 'dark');
root.removeAttribute('theme'); // return to OS-following mode
```

For a persisted preference, validate the stored value, apply it before first paint, then update the attribute and storage from the control. Treat `auto` as a real saved choice; do not translate it to the current light/dark result.

```html
<script>
  const saved = localStorage.getItem('theme');
  if (['light', 'dark', 'auto'].includes(saved)) {
    document.documentElement.setAttribute('theme', saved);
  }
</script>
```

## Seed and overrides

Set `--md-source` to regenerate the primary, secondary, tertiary, neutral, and neutral-variant ramps:

```css
:root {
  --md-source: #6750a4;
}
```

The error ramp does not follow `--md-source`. Override the documented error role pairs when the product requires a different error system.

Override the unsuffixed live role when one value should apply in both schemes. When light and dark need different values, override both backing values for every affected role and keep components on the unsuffixed live role:

```css
:root {
  --md-sys-color-primary-light: #4f378b;
  --md-sys-color-primary-dark: #d0bcff;
}

.call-to-action {
  background: var(--md-sys-color-primary);
}
```

Do not consume `--md-sys-color-*-light` or `--md-sys-color-*-dark` in component rules. Load application overrides after ExpressiveCSS.

## Scoped schemes

The public `theme` selectors are `:root[theme=…]` and `:host([theme=…])`; putting `theme="dark"` on an ordinary descendant does not invoke them. For a nested region, set `color-scheme` on that region so inherited `light-dark()` roles resolve there, or explicitly scope live role overrides.

```css
.dark-preview {
  color-scheme: dark;
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface);
}
```

Keep native form controls in the same scheme and test the nested region in both page themes.

## Vibrant surfaces

`[vibrant]` is a subtree surface-emphasis attribute. It remaps surface and background roles to `tertiary-container`, and their readable foregrounds to `on-tertiary-container`. Add it to a focused subtree, not to the whole page.

```html
<section vibrant class="surface-container on-surface-text">
  <h2 class="title-large">Suggested next step</h2>
  <p>Review the generated plan.</p>
</section>
```

Within a vibrant subtree:

- surface-container levels collapse to the same tertiary container;
- `on-surface`, `on-surface-variant`, and `on-background` collapse to `on-tertiary-container`;
- primary, secondary, tertiary, outline, inverse, scrim, and shadow roles are not remapped;
- component-specific `.vibrant` variants remain component rules, not a synonym for the subtree attribute.

Do not use `[vibrant]` on a page wrapper when nested surface elevation must remain visually distinct.

## Shadow DOM

Theme source, live role anchors, and scheme selectors have paired `:root` and `:host` forms. When changing framework token sources, keep those anchors synchronized. Application authors should expose or inherit semantic custom properties rather than reaching across a shadow boundary.

## Verification

- Check light, dark, and auto with both OS preferences.
- Check first paint when a stored preference exists.
- Check the document, native controls, shadow roots, and any nested `color-scheme` region.
- Check vibrant content contrast and confirm nested surface hierarchy is not required there.
- Check all overridden role pairs in both schemes; one-sided overrides are incomplete.
