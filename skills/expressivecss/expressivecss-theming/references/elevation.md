# Elevation foundation

Use `src/sass/abstracts/_elevation.scss` for the shadow map and mixin, and `src/sass/utilities/_z-depth.scss` for the emitted helpers.

## Choose elevation deliberately

Prefer the component's built-in resting, hover, focus, pressed, and dragged elevation. Add a helper only to a neutral custom surface whose elevation is not already owned by a component contract. Do not stack multiple shadow classes or add an arbitrary second shadow to an existing component.

| Helper | Meaning |
|---|---|
| `.z-depth-0` | remove elevation |
| `.z-depth-1` | lowest raised surface |
| `.z-depth-1-half` | intermediate state used by the scale |
| `.z-depth-2` | moderate raised surface |
| `.z-depth-3` | stronger raised surface |
| `.z-depth-4` | high raised surface |
| `.z-depth-5` | highest utility elevation |

```html
<article class="surface-container z-depth-1 p-4">
  <h2 class="title-large">Draft</h2>
  <p class="body-medium">Last edited two minutes ago.</p>
</article>
```

Among non-zero helpers, later emitted classes win by stylesheet order, not by meaningful composition. `.z-depth-0` wins through `!important`. Use exactly one `z-depth-*` class.

## Reset behavior

`.z-depth-0` emits `box-shadow: none !important`. It can remove a component-owned shadow as well as a utility shadow. Use it only when the design explicitly calls for a flat state; normal shadow overrides are not enough to beat it afterward without another `!important` declaration.

## Sass use

When compiling ExpressiveCSS Sass, include a valid map key:

```scss
.custom-surface {
  @include z-depth("2");
}
```

Use `@include z-depth("2")`, not `@extend .z-depth-2`. The mixin validates the string key at compile time and avoids coupling a component selector to utility output. Valid keys are `"0"`, `"1"`, `"1-half"`, `"2"`, `"3"`, `"4"`, and `"5"`.

The framework does not publish CSS custom-property elevation levels. Use one helper class for markup or the Sass mixin for authored framework styles.

## States and motion

- Keep resting and interaction-state elevation changes tied to an actual affordance.
- `.hoverable` is a separate helper with one fixed hover shadow; it is not a configurable elevation level and does not add keyboard-focus behavior. Its fixed shadow can lower an element that already has a higher elevation.
- Do not rely on shadow alone to indicate focus, selection, disabled state, or drag state.
- Avoid large elevation jumps on hover. Respect reduced-motion settings when elevation changes are animated.

## Verification

Check the surface against light, dark, and vibrant backgrounds. Confirm clipping containers do not cut off the shadow, focus indicators remain visible, and the reading/DOM order does not imply a different hierarchy from the visual elevation.
