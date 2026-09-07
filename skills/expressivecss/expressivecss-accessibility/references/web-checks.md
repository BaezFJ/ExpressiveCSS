# Focused web accessibility checks

Use these checks for the affected controls and states. Material describes design
intent; WCAG defines conformance criteria; installed sources and browser tests
establish what this interface does. Sources reviewed September 7, 2026.

## Target sizes

Keep Material's **48 by 48 dp** touch-target recommendation distinct from web
conformance. Measure the actual clickable region in CSS pixels, including working
label/padding areas. An icon's size, device pixels, or screenshot scale does not
establish the hit area. Do not shrink a component's larger target merely because
it meets a WCAG minimum. [Material touch-target guidance](https://m1.material.io/usability/accessibility.html#accessibility-touch-targets)
is historical design guidance; [current Android guidance](https://developer.android.com/develop/ui/compose/accessibility/api-defaults#minimum-touch-target-sizes)
is platform guidance, not a web implementation guarantee.

[WCAG 2.2 SC 2.5.8, AA](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
requires 24 by 24 CSS pixels or an applicable exception:

- **Spacing:** center a 24-CSS-pixel-diameter circle on each undersized target's
  bounding box. It must not intersect another target or another undersized
  target's circle. A generic gap value is not enough.
- **Equivalent:** another control on the same page performs the function and
  meets this criterion.
- **Inline:** the target is in a sentence, or constrained by surrounding
  non-target text's line height. A standalone small icon is not an inline link.
- **User agent:** the browser determines the size and the author has not changed it.
- **Essential:** the presentation is fundamental or legally required.

Name the exception and show its evidence. Rounded, clipped, overlapping, or
pseudo-element hit areas need hit testing beyond `getBoundingClientRect()`.
Report the CSS-pixel measurement without multiplying by devicePixelRatio or
relying on user zoom to pass. AA compliance is not the Material target goal;
SC 2.5.5's 44 by 44 CSS-pixel enhanced target is a separate AAA criterion.

## Dragging alternatives

[SC 2.5.7, AA](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
requires the same outcome using one pointer without dragging, except when
essential or an unmodified browser-provided function. Keyboard access is a
separate requirement; arrow-key reordering alone does not satisfy 2.5.7.

Offer clickable/tappable Move up/down controls, a destination choice, or select
then place actions. Verify the complete outcome with clicks/taps and separately
with the keyboard, including focus, updated order/value, and feedback. A visual
drag handle does not implement these behaviors. For a draggable sheet, inspect
its actual close/snap/resize outcomes and their alternatives; do not infer that
Escape, a decorative grip, or backdrop dismissal covers every outcome.

## Forced colors

[CSS Color Adjustment](https://drafts.csswg.org/css-color-adjust/#forced) lets the
browser substitute a user palette. Shadows disappear and non-URL background
images, including gradients, are removed. A shadow-only focus ring or
background-only selected state can disappear even when ordinary themes pass.

Emulate `forced-colors: active`, confirm the media query, then inspect native
controls, labels, focus, selection, errors, and meaningful icons. Use visible
borders/outlines and suitable system colors such as `CanvasText`, `ButtonText`,
and `Highlight`, with text or shape cues for state. Preserve native elements;
adding an ARIA role does not reproduce native browser color treatment.

Keep automatic color adjustment. Do not apply `forced-color-adjust: none`
globally to preserve branding. A necessary local opt-out needs its own evidence.
Capture the affected state and test keyboard/pointer operation. Emulation is
useful evidence, not certification of Windows High Contrast themes or screen
reader speech; record the browser/OS and which checks remain unavailable.

## Contrast after theme overrides

Semantic `on-*` pairings express intent; arbitrary seed, role, opacity, or type
overrides can still break contrast. Identify the winning styles and actual
foreground/background in each affected light, dark, nested, and vibrant region.
Composite alpha and state layers over the real backdrop; do not compare raw
tokens or sample antialiased glyph edges. Check rest, hover, focus, selected,
error, and relevant disabled states before and after the change.

[SC 1.4.3, AA](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
requires 4.5:1 for ordinary text and 3:1 for large text, at least 18pt or 14pt
bold, approximately 24px or 18.67px bold. A Material role named "large" does not
prove that threshold; a weight of 500 is not automatically bold. Do not round
a failing ratio upward. Inactive controls, incidental/decorative text, and
logotypes have exceptions; brand-colored action labels are not logotypes.

[SC 1.4.11, AA](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
requires 3:1 against adjacent colors for visual information needed to identify
controls and their states, and meaningful graphics. It does not require every
decorative divider to pass. Inactive controls and unmodified browser-determined
control appearance are exceptions; graphics have an essential-presentation
exception. Author focus indicators need contrast and visible-focus checks.

Record selector, theme, state, resolved colors, ratio, threshold, and outcome.
Repair the scoped role pair or state styling, then repeat the same checks;
do not disable forced colors or overwrite the user's scheme to force a pass.
Report only the states measured, not blanket WCAG conformance.
