# Color foundation

Use the installed ExpressiveCSS version as the source of truth. The role list comes from `src/sass/abstracts/_variables.scss`; the live tokens come from `src/sass/tokens/_theme.scss`; utility generation comes from `src/sass/utilities/_colors.scss`.

## Decision rule

1. Pick a semantic role from the element's purpose, not from the hue you want.
2. For component CSS, consume `var(--md-sys-color-<role>)`.
3. For one-off markup, use the background class `.<role>` and the `.<role>-text` foreground class.
4. Pair a fill or container with its matching `on-*` role. Test contrast in light and dark schemes.

```html
<section class="surface-container on-surface-text">
  <aside class="primary on-primary-text p-4">
    <h2 class="title-large">Important update</h2>
    <p class="body-medium">Review the new account policy.</p>
  </aside>
</section>
```

```css
.notice {
  color: var(--md-sys-color-on-error-container);
  background: var(--md-sys-color-error-container);
}
```

The utility declarations are in the utilities cascade layer, which is later than the component layer. Prefer tokens in authored component CSS when later overrides or state styling are required; unlayered application CSS can still override layered utilities.

## Recommended pairings

| Fill role | Foreground role | Typical purpose |
|---|---|---|
| `primary` | `on-primary` | highest-emphasis action or selected state |
| `primary-container` | `on-primary-container` | prominent tonal region |
| `secondary` | `on-secondary` | supporting emphasis |
| `secondary-container` | `on-secondary-container` | supporting tonal region |
| `tertiary` | `on-tertiary` | contrasting accent |
| `tertiary-container` | `on-tertiary-container` | contrasting tonal region |
| `error` | `on-error` | high-emphasis error state |
| `error-container` | `on-error-container` | error message or recovery region |
| `surface` | `on-surface` | page and component surface |
| `surface-container-*` | `on-surface` | nested surface hierarchy |
| `inverse-surface` | `inverse-on-surface` | inverted surface such as a transient message |
| `*-fixed` | `on-*-fixed` | accent that intentionally does not change with scheme |
| `*-fixed-dim` | `on-*-fixed-variant` | lower-emphasis fixed accent |

`outline` and `outline-variant` are primarily border/divider tokens. `scrim`, `shadow`, `surface-tint`, and `inverse-primary` are specialized roles; use their tokens where a component contract calls for them rather than inventing a fill/foreground pairing.

## Complete utility inventory

Every role below emits both forms. The first class sets `background-color`; the `-text` form sets `color`.

| Role | Background class | Foreground class |
|---|---|---|
| Primary | `.primary` | `.primary-text` |
| On primary | `.on-primary` | `.on-primary-text` |
| Primary container | `.primary-container` | `.primary-container-text` |
| On primary container | `.on-primary-container` | `.on-primary-container-text` |
| Primary fixed | `.primary-fixed` | `.primary-fixed-text` |
| Primary fixed dim | `.primary-fixed-dim` | `.primary-fixed-dim-text` |
| On primary fixed | `.on-primary-fixed` | `.on-primary-fixed-text` |
| On primary fixed variant | `.on-primary-fixed-variant` | `.on-primary-fixed-variant-text` |
| Secondary | `.secondary` | `.secondary-text` |
| On secondary | `.on-secondary` | `.on-secondary-text` |
| Secondary container | `.secondary-container` | `.secondary-container-text` |
| On secondary container | `.on-secondary-container` | `.on-secondary-container-text` |
| Secondary fixed | `.secondary-fixed` | `.secondary-fixed-text` |
| Secondary fixed dim | `.secondary-fixed-dim` | `.secondary-fixed-dim-text` |
| On secondary fixed | `.on-secondary-fixed` | `.on-secondary-fixed-text` |
| On secondary fixed variant | `.on-secondary-fixed-variant` | `.on-secondary-fixed-variant-text` |
| Tertiary | `.tertiary` | `.tertiary-text` |
| On tertiary | `.on-tertiary` | `.on-tertiary-text` |
| Tertiary container | `.tertiary-container` | `.tertiary-container-text` |
| On tertiary container | `.on-tertiary-container` | `.on-tertiary-container-text` |
| Tertiary fixed | `.tertiary-fixed` | `.tertiary-fixed-text` |
| Tertiary fixed dim | `.tertiary-fixed-dim` | `.tertiary-fixed-dim-text` |
| On tertiary fixed | `.on-tertiary-fixed` | `.on-tertiary-fixed-text` |
| On tertiary fixed variant | `.on-tertiary-fixed-variant` | `.on-tertiary-fixed-variant-text` |
| Error | `.error` | `.error-text` |
| On error | `.on-error` | `.on-error-text` |
| Error container | `.error-container` | `.error-container-text` |
| On error container | `.on-error-container` | `.on-error-container-text` |
| Surface | `.surface` | `.surface-text` |
| On surface | `.on-surface` | `.on-surface-text` |
| On surface variant | `.on-surface-variant` | `.on-surface-variant-text` |
| Surface dim | `.surface-dim` | `.surface-dim-text` |
| Surface bright | `.surface-bright` | `.surface-bright-text` |
| Surface container lowest | `.surface-container-lowest` | `.surface-container-lowest-text` |
| Surface container low | `.surface-container-low` | `.surface-container-low-text` |
| Surface container | `.surface-container` | `.surface-container-text` |
| Surface container high | `.surface-container-high` | `.surface-container-high-text` |
| Surface container highest | `.surface-container-highest` | `.surface-container-highest-text` |
| Outline | `.outline` | `.outline-text` |
| Outline variant | `.outline-variant` | `.outline-variant-text` |
| Inverse surface | `.inverse-surface` | `.inverse-surface-text` |
| Inverse on surface | `.inverse-on-surface` | `.inverse-on-surface-text` |
| Inverse primary | `.inverse-primary` | `.inverse-primary-text` |
| Scrim | `.scrim` | `.scrim-text` |
| Shadow | `.shadow` | `.shadow-text` |
| Background | `.background` | `.background-text` |
| On background | `.on-background` | `.on-background-text` |
| Surface variant | `.surface-variant` | `.surface-variant-text` |
| Surface tint | `.surface-tint` | `.surface-tint-text` |

`background`, `on-background`, `surface-variant`, and `surface-tint` are compatibility aliases. Prefer the current surface roles in new work.

## Transparency and states

Color tokens are complete CSS colors, not channel lists. Mix them with transparent:

```css
.card:hover {
  background: color-mix(in oklab, var(--md-sys-color-primary) 8%, transparent);
}
```

Do not write `rgba(var(--md-sys-color-primary), .08)`. Do not restore the removed Material 2014 palette class grammar or Sass color lookup function.

`.scrim` is the opaque system role, not the translucent modal wash. Dialogs, drawers, and modal rails consume `--md-comp-scrim-color`, which mixes the scrim role with transparency. Override that component token on the modal surface for a local change; changing `--md-sys-color-scrim` on a descendant does not recompute an inherited scrim value that resolved above it.

## Component exclusions and pitfalls

- `primary-container`, `secondary-container`, and `tertiary-container` background utilities deliberately exclude any element that also has `.extend` or `.fab-menu`; those components own the same color axis. Their `-text` forms still apply.
- A class named for an `on-*` role is still a background utility unless it ends in `-text`.
- Never use color alone to communicate error, selection, or status.
- Fixed accent roles do not adapt between light and dark. Use them only when scheme-invariant identity is intended.
- Role names and generated palettes do not prove contrast after overrides. For color, opacity, or type changes, measure affected text, necessary icons, boundaries, and focus states against their actual backgrounds in both schemes. Use the [focused web checks](../../expressivecss-accessibility/references/web-checks.md#contrast-after-theme-overrides); an explicit contrast or forced-colors investigation also loads Accessibility through the root route.
