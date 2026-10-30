# Shape foundation

Use shape to identify related controls and make a supported state change legible. Start with the selected component's shape contract; a global radius override can erase selection, connected edges, or the distinction between a FAB and a common button.

## Material intent and web support

Google's [shape guidance](https://m3.material.io/styles/shape/overview) and [Android shape implementation](https://github.com/material-components/material-components-android/blob/master/docs/theming/Shape.md) describe a corner scale, rounded and cut corner families, and component overrides. Reviewed 2026-09-07. Android attributes and dp values are design references, not ExpressiveCSS APIs or a direct unit conversion contract.

| Capability | ExpressiveCSS support |
| --- | --- |
| Component corners | Component `--md-comp-*` properties and documented variants; inspect the selected guide. |
| Common button shape | `--md-comp-filled-button-container-shape` defaults to `var(--md-sys-shape-corner-full)`; `.rounded` explicitly forces a pill. `.circle` also changes width and padding. |
| FAB corners | `--md-comp-fab-container-shape` and size variants; preserve the FAB's own geometry. |
| Connected and changing shapes | Button groups own shared edges, pressed corners, and selection shapes. Their runtime also owns press growth. |
| Corner scale | `--md-sys-shape-corner-*` from `none` to `full` on `:root` and `:host`, including the Expressive `large-increased`, `extra-large-increased` and `extra-extra-large` steps. Component shape tokens on that scale read them, so one override changes every component on that step. |
| Cut-corner family | `--md-sys-shape-corner-family` is `round` or `bevel`. `corners="cut"` on the root or a subtree cuts the corners of cards, dialogs, sheets, menus, fieldsets, buttons, chips, alerts, snackbars, tooltips, popovers and outlined fields; `corners="round"` restores them. `.corner-cut` cuts one element. Round indicators and `.circle` stay round. It relies on CSS `corner-shape`, so browsers without it (Firefox 157) keep rounded corners. |

Local evidence is `src/sass/tokens/_shape.scss`, `src/sass/components/_buttons.scss`, `src/sass/abstracts/_mixins.scss`, and `src/sass/components/_button-groups.scss`. A source-supported override is not evidence that every component implements Google's complete shape system. Do not invent a shape class or translate an Android attribute into a CSS variable.

## Override only the intended component

Load application CSS after ExpressiveCSS. This application selector changes common button corners without changing their label, target geometry, or interaction state:

```css
.account-action {
  --md-comp-filled-button-container-shape: 16px;
}
```

To change the scale everywhere instead, override the system token. Every component whose shape sits on that step follows:

```css
:root {
  --md-sys-shape-corner-medium: 8px;
}
```

Use the component override on a common button, not a FAB, icon button, or connected group item. Explicit variants such as `.rounded` can override the resulting radius. Avoid blanket `border-radius` or `clip-path` rules across components. Component properties declared on the component itself may also defeat an ancestor override; check computed styles at the actual control.

Keep the component's default, pressed, selected, and disabled shapes consistent. Rounded appearance does not establish selection semantics or an accessible name. Preserve `aria-pressed`, native selection, and the component's keyboard contract independently of shape.

## Verification

Compare the resting, focus-visible, pressed, and selected states at the supported sizes. Check joined edges, RTL order, overflowing labels, focus-ring clipping, hit areas, and reduced motion when corners animate. Record visual results separately from source support.

## Decorative shape catalogue

The [Shapes guide](https://www.expressivecss.com/shapes.html.md) and `src/sass/utilities/_shapes.scss` own twenty CSS masks. Use a `.shape-<name>` class:

| Family | Names |
| --- | --- |
| Rounded forms | `pebble`, `bean`, `peak`, `dart`, `slice`, `kite`, `cell`, `crest`, `facet` |
| Radiating forms | `spark`, `seal`, `spike`, `flare` |
| Scallops | `scallop-4`, `scallop-6`, `scallop-7`, `scallop-9`, `scallop-12` |
| Blooms | `bloom-4`, `bloom-8` |

```html
<img class="shape-scallop-6" src="portrait.jpg" width="160" alt="Team portrait">
<button type="button" class="icon-button filled shape-spark" aria-label="Favorite">
  <span class="material-symbols" aria-hidden="true">favorite</span>
</button>
```

The mask stretches to the element's box. Images, video and canvas get `aspect-ratio: 1`, `height: auto` and `object-fit: cover`; choose a square control for button shapes. The mask clips shadows, borders, overflowing content and native video controls. Use a wrapper with `filter: drop-shadow()` when a shadow must follow the shape, and keep video controls reachable outside the mask.

The utility uses `contain: paint` and draws focus inside its edge. Focusable replaced elements such as images cannot draw the `::after` band, so check their visible focus separately. Forced colors use a system-color band. Include `"shapes"` in `$utilities` for a selective Sass build. The corner scale and this mask catalogue are shipped contracts; full Material parity remains unassessed.
