# Color foundation

Use the installed ExpressiveCSS version as the source of truth. The role list comes from `src/sass/abstracts/_variables.scss`; the live tokens come from `src/sass/tokens/_theme.scss`; utility generation comes from `src/sass/utilities/_colors.scss`.

## Contents

- Decision rule
- Recommended pairings
- Complete utility inventory
- Transparency and states
- Component exclusions and pitfalls

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

Every role below emits two classes. The background class (for example `.primary`) sets `background-color`; the `-text` form (for example `.primary-text`) sets the foreground `color`. Background classes by family:

- Primary: `.primary`, `.on-primary`, `.primary-container`, `.on-primary-container`, `.primary-fixed`, `.primary-fixed-dim`, `.on-primary-fixed`, `.on-primary-fixed-variant`.
- Secondary: `.secondary`, `.on-secondary`, `.secondary-container`, `.on-secondary-container`, `.secondary-fixed`, `.secondary-fixed-dim`, `.on-secondary-fixed`, `.on-secondary-fixed-variant`.
- Tertiary: `.tertiary`, `.on-tertiary`, `.tertiary-container`, `.on-tertiary-container`, `.tertiary-fixed`, `.tertiary-fixed-dim`, `.on-tertiary-fixed`, `.on-tertiary-fixed-variant`.
- Error: `.error`, `.on-error`, `.error-container`, `.on-error-container`.
- Surface and outline: `.surface`, `.on-surface`, `.on-surface-variant`, `.surface-dim`, `.surface-bright`, `.surface-container-lowest`, `.surface-container-low`, `.surface-container`, `.surface-container-high`, `.surface-container-highest`, `.outline`, `.outline-variant`, `.inverse-surface`, `.inverse-on-surface`, `.inverse-primary`, `.scrim`, `.shadow`, `.background`, `.on-background`, `.surface-variant`, `.surface-tint`.

Foreground classes append `-text` to each name above: `.primary-text`, `.on-primary-text`, `.primary-container-text`, `.on-primary-container-text`, `.primary-fixed-text`, `.primary-fixed-dim-text`, `.on-primary-fixed-text`, `.on-primary-fixed-variant-text`, `.secondary-text`, `.on-secondary-text`, `.secondary-container-text`, `.on-secondary-container-text`, `.secondary-fixed-text`, `.secondary-fixed-dim-text`, `.on-secondary-fixed-text`, `.on-secondary-fixed-variant-text`, `.tertiary-text`, `.on-tertiary-text`, `.tertiary-container-text`, `.on-tertiary-container-text`, `.tertiary-fixed-text`, `.tertiary-fixed-dim-text`, `.on-tertiary-fixed-text`, `.on-tertiary-fixed-variant-text`, `.error-text`, `.on-error-text`, `.error-container-text`, `.on-error-container-text`, `.surface-text`, `.on-surface-text`, `.on-surface-variant-text`, `.surface-dim-text`, `.surface-bright-text`, `.surface-container-lowest-text`, `.surface-container-low-text`, `.surface-container-text`, `.surface-container-high-text`, `.surface-container-highest-text`, `.outline-text`, `.outline-variant-text`, `.inverse-surface-text`, `.inverse-on-surface-text`, `.inverse-primary-text`, `.scrim-text`, `.shadow-text`, `.background-text`, `.on-background-text`, `.surface-variant-text`, `.surface-tint-text`.

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
