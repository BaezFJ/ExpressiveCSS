# State layers foundation

Read this after the Theming guide when changing interaction feedback or reviewing a custom interactive surface. Reuse the root guide's installed-version resolution. The [target-version State layers documentation](https://www.expressivecss.com/state-layers.html.md), [state token Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/tokens/_state.scss), and target component Sass override this summary if they differ.

A state layer is a foundation with no markup of its own. ExpressiveCSS components paint their own overlay or ring for hover, visible focus, press, and drag. Application markup should not add a generic state-layer element or restore an ink-ripple script.

## System opacity tokens

| Token | Default | State |
| --- | --- | --- |
| `--md-sys-state-hover-state-layer-opacity` | `0.08` | Pointer hover. |
| `--md-sys-state-focus-state-layer-opacity` | `0.1` | Visible focus. |
| `--md-sys-state-pressed-state-layer-opacity` | `0.1` | Active press. |
| `--md-sys-state-dragged-state-layer-opacity` | `0.16` | Dragged or picked-up state. |

The values are unitless numbers used as opacity, so keep overrides from `0` through `1`. Focus and pressed both use `0.1`. Do not copy secondary sources that use `0.12` for focus. ExpressiveCSS declares the four system tokens on both `:root` and `:host`, so the same stylesheet can seed a document or a shadow root.

Set a system token on `:root` to affect every component that inherits it. Set it on a subtree to change descendants, or override the documented `--md-comp-*` token on one component when that component exposes one.

```css
:root {
  --md-sys-state-hover-state-layer-opacity: 0.08;
}

.quiet-card {
  --md-comp-card-hover-state-layer-opacity: 0.04;
}
```

Selected and disabled states do not have system state-layer opacity tokens. Follow the selected-container, content-opacity, disabled-opacity, and state rules documented by the specific component. Do not invent `--md-sys-state-selected-state-layer-opacity` or `--md-sys-state-disabled-state-layer-opacity`.

## Two painting forms

Most components use a pseudo-element overlay. Its background uses the component's state-layer color, and its `opacity` reads the unitless token directly.

Checkboxes and radio buttons use a ring because the visible control is too small for an internal overlay. A ring mixes the state color with transparent via `color-mix()`. That percentage form must multiply the unitless token by `100%`:

```scss
.custom-control:hover {
  background: color-mix(
    in oklab,
    var(--md-sys-color-on-surface)
      calc(var(--md-sys-state-hover-state-layer-opacity) * 100%),
    transparent
  );
}
```

Do not append `%` directly to `var(...)`, and do not pass a complete color token through `rgba()`. In framework Sass, use the existing `state-opacity()` or `state-layer-ring()` helper instead of repeating the conversion.

## State and focus rules

- Use the component's documented state-layer color. This is often an `on-*` role mixed over its container, not the container color itself.
- Keep hover, focus, pressed, and dragged distinct even when two default opacities match. Their selectors and component state can differ.
- A state layer does not replace the focus indicator. Keep the component's visible focus outline or ring and test it separately.
- Hover feedback cannot be the only signal for an action. Touch and keyboard paths need their own state treatment.
- Do not apply interactive state layers to disabled controls.
- Do not animate a state change so slowly that feedback lags behind the input.

## Overriding safely

Changing a system token changes many components at runtime. Prefer the default values unless the product has a measured contrast or feedback problem. If an override is required, record its scope and verify every component it can reach. A value that works on one primary container may disappear on a surface, outline, or vibrant region.

The system tokens control opacity only. Component tokens and rules still choose the color, shape, selector, layering, and focus indicator. Changing one opacity cannot repair a wrong state color, clipped pseudo-element, missing pressed selector, or hidden focus outline.

## Verification

Exercise hover, keyboard focus, press, drag, selection, and disabled states that the component can reach. Inspect computed styles for the system and component token chain. Check overlays against every light, dark, and vibrant background in scope. Confirm rings are not clipped, pseudo-elements do not block pointer input, pressed feedback works on touch, focus remains visible without hover, and disabled controls paint no interactive state layer.
