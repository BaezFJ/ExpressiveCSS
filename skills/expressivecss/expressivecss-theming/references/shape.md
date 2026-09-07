# Shape foundation

Use shape to identify related controls and make a supported state change legible. Start with the selected component's shape contract; a global radius override can erase selection, connected edges, or the distinction between a FAB and a common button.

## Material intent and web support

Google's [shape guidance](https://m3.material.io/styles/shape/overview) and [Android shape implementation](https://github.com/material-components/material-components-android/blob/master/docs/theming/Shape.md) describe a corner scale, rounded and cut corner families, and component overrides. Reviewed 2026-09-07. Android attributes and dp values are design references, not ExpressiveCSS APIs or a direct unit conversion contract.

| Capability | ExpressiveCSS support |
| --- | --- |
| Component corners | Component `--md-comp-*` properties and documented variants; inspect the selected guide. |
| Common button shape | `--md-comp-filled-button-container-shape` defaults to `9999px`; `.rounded` explicitly forces a pill. `.circle` also changes width and padding. |
| FAB corners | `--md-comp-fab-container-shape` and size variants; preserve the FAB's own geometry. |
| Connected and changing shapes | Button groups own shared edges, pressed corners, and selection shapes. Their runtime also owns press growth. |
| A global Material shape scale or cut-corner family | No `--md-sys-shape-*` token family or general cut-corner utility is emitted. |

Local evidence is `src/sass/components/_buttons.scss`, `src/sass/abstracts/_mixins.scss`, and `src/sass/components/_button-groups.scss`. A source-supported override is not evidence that every component implements Google's complete shape system. Do not invent a shape class or translate an Android attribute into a CSS variable.

## Override only the intended component

Load application CSS after ExpressiveCSS. This application selector changes common button corners without changing their label, target geometry, or interaction state:

```css
.account-action {
  --md-comp-filled-button-container-shape: 16px;
}
```

Use it on a common button, not a FAB, icon button, or connected group item. Explicit variants such as `.rounded` can override the resulting radius. Avoid blanket `border-radius` or `clip-path` rules across components. Component properties declared on the component itself may also defeat an ancestor override; check computed styles at the actual control.

Keep the component's default, pressed, selected, and disabled shapes consistent. Rounded appearance does not establish selection semantics or an accessible name. Preserve `aria-pressed`, native selection, and the component's keyboard contract independently of shape.

## Verification

Compare the resting, focus-visible, pressed, and selected states at the supported sizes. Check joined edges, RTL order, overflowing labels, focus-ring clipping, hit areas, and reduced motion when corners animate. Record visual results separately from source support. A full reusable shape scale and general expressive shape catalogue remain framework gaps; an application-specific override does not close them.
