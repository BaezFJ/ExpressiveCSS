# Typography foundation

Use semantic HTML first, then apply a Material 3 type-role class when visual hierarchy must differ from the element default. The type-role loop and text helpers live in `src/sass/utilities/_typescale.scss`; token values live in `src/sass/tokens/_reference.scss`; element defaults and `.flow-text` live in `src/sass/base/_typography.scss`.

## Contents

- Role selection
- Exact type scale
- Expressive emphasis and current limits
- Typeface tokens and bundled fonts
- Element defaults
- Text helpers
- Accessibility and layout

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

| Roles | Emphasized weight | Token |
| --- | --- | --- |
| Display, headline, title-large, body | Medium, `500` | `--md-sys-typescale-emphasized-{role}-font-weight` |
| Title-medium, title-small, label | Bold, `700` | `--md-sys-typescale-emphasized-{role}-font-weight` |

Each role has an emphasized class, `.{role}-emphasized` such as `.label-large-emphasized` or `.headline-small-emphasized`. It applies the role's family, size, line height and tracking with the emphasized weight. The `--md-sys-typescale-emphasized-*` tokens hold only the weight; everything else is the baseline role's. The package bundles Roboto and Noto Sans at `400`, `500` and `700`, and the browser fetches the `700` faces only when a page renders that weight.

```html
<h2 class="headline-small-emphasized">Account security</h2>
<span class="label-large-emphasized">Selected</span>
```

Scope emphasis to the text that needs it. `.bold` means `500` in this framework, so it is not the `700` emphasized label treatment; use the emphasized class. Heavier text does not change selection semantics, so keep `aria-selected`, `aria-current` or the native state as the source of truth.

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

The defaults are Roboto for `--md-ref-typeface-brand` and `--md-ref-typeface-plain`, followed by `--md-ref-typeface-fallback`. The package bundles Roboto and Noto Sans at 400, 500 and 700. Roboto ships Latin, Latin Extended, Cyrillic, Cyrillic Extended, Greek, Greek Extended and Vietnamese, and Noto Sans adds Devanagari, each at 400, 500 and 700. Every subset is its own face with a `unicode-range`, so the browser downloads only the scripts and weights the page renders. Arabic, Hebrew, CJK, Thai and other scripts need their own family, such as Noto Sans Arabic; load it and add it to `--md-ref-typeface-fallback`. If a replacement family does not provide the weights used by the scale, browsers may synthesize them.

## Element defaults

Without role classes, `body` uses body-medium. Headings remain semantic and receive framework defaults: `h1` uses display-small; `h2` headline-large; `h3` headline-medium; `h4` headline-small; `h5` title-large; and `h6` title-medium. Paragraphs use body-large with normal vertical rhythm and `text-wrap-style: pretty`; headings use `text-wrap-style: balance`; `small` and `figcaption` use body-small. Links use the primary role and remove text decoration by default, except a link without a class inside a `p`, `dd`, `blockquote`, `figcaption` or `td`, which keeps an underline because it sits in running text. Elsewhere, add an underline or another non-color affordance when context alone does not make a link recognizable. Do not add a type class solely to reproduce an existing element default. For rendered Markdown or CMS output, put `.prose` on a `<div>`, `<section>` or `<main>` (never an `<article>`, which is a card); it styles only elements without a class.

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

These helpers can override role weight or decoration. Combine them only when that override is intentional. The bundled Roboto and Noto Sans faces include 400, 500 and 700 only, so `.light` and `.thin` may be synthesized unless the application supplies 300 and 200 faces. Text-transform classes change visual presentation, not the accessible/source text.

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
