# Typography foundation

Use semantic HTML first, then apply a Material 3 type-role class when visual hierarchy must differ from the element default. The type-role loop and text helpers live in `src/sass/utilities/_typescale.scss`; token values live in `src/sass/tokens/_reference.scss`; element defaults and `.flow-text` live in `src/sass/base/_typography.scss`.

## Role selection

- `display-*`: rare, short hero or campaign text.
- `headline-*`: page and section hierarchy.
- `title-*`: component and subsection titles.
- `body-*`: prose, descriptions, and supporting content.
- `label-*`: controls, metadata, and compact UI labels.
- Choose `large`, `medium`, or `small` from available space and hierarchy, not viewport width alone.

```html
<article>
  <h1 class="headline-large">Account security</h1>
  <p class="body-large">Review devices with access to your account.</p>
  <p class="label-medium on-surface-variant-text">Updated today</p>
</article>
```

A class controls visual type only. It does not change heading rank, landmarks, accessible name, or document outline.

## Exact type scale

| Class | Size | Line height | Weight | Letter spacing |
|---|---:|---:|---:|---:|
| `.display-large` | `3.5625rem` | `4rem` | `400` | `-0.015625rem` |
| `.display-medium` | `2.8125rem` | `3.25rem` | `400` | `0rem` |
| `.display-small` | `2.25rem` | `2.75rem` | `400` | `0rem` |
| `.headline-large` | `2rem` | `2.5rem` | `400` | `0rem` |
| `.headline-medium` | `1.75rem` | `2.25rem` | `400` | `0rem` |
| `.headline-small` | `1.5rem` | `2rem` | `400` | `0rem` |
| `.title-large` | `1.375rem` | `1.75rem` | `400` | `0rem` |
| `.title-medium` | `1rem` | `1.5rem` | `500` | `0.009375rem` |
| `.title-small` | `0.875rem` | `1.25rem` | `500` | `0.00625rem` |
| `.body-large` | `1rem` | `1.5rem` | `400` | `0.03125rem` |
| `.body-medium` | `0.875rem` | `1.25rem` | `400` | `0.015625rem` |
| `.body-small` | `0.75rem` | `1rem` | `400` | `0.025rem` |
| `.label-large` | `0.875rem` | `1.25rem` | `500` | `0.00625rem` |
| `.label-medium` | `0.75rem` | `1rem` | `500` | `0.03125rem` |
| `.label-small` | `0.6875rem` | `1rem` | `500` | `0.03125rem` |

Display, headline, and `title-large` use the brand typeface token. Body, label, `title-medium`, and `title-small` use the plain typeface token.

Every role exposes `--md-sys-typescale-{role}-font-family-name`, `-font-family-style`, `-font-weight`, `-font-size`, `-line-height`, and `-letter-spacing`. The role utilities consume all except `-font-family-style`; its `Regular` and `Medium` values describe weight and are not valid CSS `font-style` values.

## Expressive emphasis and current limits

Google's [typography guidance](https://m3.material.io/styles/typography/overview) and [Android typography implementation](https://github.com/material-components/material-components-android/blob/master/docs/theming/Typography.md) include an emphasized counterpart for each baseline role. They use stronger weight to distinguish selected content, actions, headlines, and editorial hierarchy. Reviewed 2026-09-07. The Android style names are design evidence, not CSS classes.

| Roles | Google emphasized weight | ExpressiveCSS application path |
| --- | --- | --- |
| Display, headline, title-large, body | Medium, conventionally `500` | Scope the existing role's `-font-weight` token to the intended element. Bundled fonts supply `500`. |
| Title-medium, title-small, label | Bold, conventionally `700` | Supply a real `700` face or a variable font covering it, then scope the existing role token. Bundled fonts do not supply `700`. |

ExpressiveCSS emits only the 15 baseline roles above. It has no emphasized type-role utility or `--md-sys-typescale-emphasized-*` token family. The rich banner title already applies body-medium at `500` locally; that component treatment does not expose a reusable emphasized scale. See `src/sass/components/_banners.scss`.

For a selected headline treatment, this is an application-owned override of an existing token:

```css
.account-heading {
  --md-sys-typescale-headline-small-font-weight: 500;
}
```

```html
<h2 class="headline-small account-heading">Account security</h2>
```

Scope emphasis to the text or intended subtree. Changing all weights at `:root` would erase the contrast between ordinary and emphasized text. Keep the role's size, line height, and spacing unless the brand requires a tested adjustment. `.bold` means `500` in this framework, so it cannot stand in for the `700` emphasized label treatment. Do not invent `.label-large-emphasized` or imply that heavier text changes selection semantics.

Use emphasis sparingly around the task's important action or content. Keep ordinary prose comfortable to read; use semantic `<strong>` when the text itself has greater importance. Verify the actual loaded font face and weight, text wrapping, fallback scripts, and zoom. A font-family declaration alone does not load a font, and synthetic bold is not proof that the requested face exists.

## Typeface tokens and bundled fonts

Override the reference tokens rather than all 15 roles:

```css
:root {
  --md-ref-typeface-brand: "Example Display";
  --md-ref-typeface-plain: "Example Sans";
  --md-ref-typeface-fallback: "Noto Sans", sans-serif;
}
```

The defaults are Roboto for `--md-ref-typeface-brand` and `--md-ref-typeface-plain`, followed by `--md-ref-typeface-fallback`. The package bundles Roboto 400/500 and Noto Sans 400/500. If a replacement family does not provide the weights used by the scale, browsers may synthesize them.

## Element defaults

Without role classes, `body` uses body-medium. Headings remain semantic and receive framework defaults: `h1` uses display-small; `h2` headline-large; `h3` headline-medium; `h4` headline-small; `h5` title-large; and `h6` title-medium. Paragraphs use body-large with normal vertical rhythm; `small` and `figcaption` use body-small. Links use the primary role and remove text decoration by default; add an underline or another non-color affordance when context alone does not make a link recognizable. Do not add a type class solely to reproduce an existing element default.

## Text helpers

| Helper | Effect |
|---|---|
| `.italic` | `font-style: italic` |
| `.bold` | `font-weight: 500` |
| `.light` | `font-weight: 300` |
| `.thin` | `font-weight: 200` |
| `.underline` | underline |
| `.overline` | overline |
| `.upper` | uppercase transform |
| `.lower` | lowercase transform |
| `.capitalize` | capitalize transform |
| `.flow-text` | fluid type from `1.2rem` to `1.68rem` across `360px`–`960px` |

These helpers can override role weight or decoration. Combine them only when that override is intentional. The bundled Roboto and Noto Sans faces include 400 and 500 only, so `.light` and `.thin` may be synthesized unless the application supplies 300 and 200 faces. Text-transform classes change visual presentation, not the accessible/source text.

`.flow-text` emits `clamp(1.2rem, 0.912rem + 1.28vw, 1.68rem)`. Do not combine it with a type-role utility; the later utility layer wins on `font-size`.

The current compiled CSS does not provide legacy large/medium/small text helpers. Use a type-role class or `.flow-text` instead of guessing class names.

## Accessibility and layout

- Preserve logical heading order even when visual classes change size.
- Keep body text resizable; do not replace rem-based role tokens with fixed pixels.
- Do not use tiny label roles for long prose.
- Keep line length readable and allow zoom/reflow without truncating essential text.
- Pair color choices with the matching `on-*` role and test contrast in light, dark, and vibrant regions.
- Use actual `<strong>` or `<em>` when emphasis is semantic; `.bold` and `.italic` are only visual.

Verify font loading, fallback scripts, 200% text zoom, narrow containers, wrapping labels, and both 400 and 500 weights.
