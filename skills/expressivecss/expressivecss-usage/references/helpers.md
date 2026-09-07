# ExpressiveCSS helper-class reference

Read this after the Usage guide when a task needs spacing, alignment, visibility, formatting, responsive media, or elevation helpers. Reuse the root guide's installed-version resolution. The [target-version Helpers documentation](https://www.expressivecss.com/helpers.html.md), [Shadow documentation](https://www.expressivecss.com/shadow.html.md), [helper Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_helpers.scss), [spacing Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_spacing.scss), [visibility Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_visibility.scss), and [elevation Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/abstracts/_elevation.scss) override this summary if they differ.

## Agent procedure

1. Use a documented component variant or the grid before adding utility classes.
2. Choose the smallest single-purpose helper that expresses the required layout change.
3. Check whether the helper changes `display`, uses `!important`, fixes a physical left/right side, or hides content from every user.
4. Keep repeated application-specific combinations in application CSS instead of assembling a utility component.
5. Verify every visibility boundary, long-content case, zoom/reflow state, and RTL layout that the helper can affect.

## Spacing grammar

Build a spacing class as `{m|p}{side?}-{value}`.

| Part | Values | Meaning |
| --- | --- | --- |
| Property | `m`, `p` | Margin or padding. |
| Optional side | omitted, `t`, `r`, `b`, `l`, `x`, `y` | All sides, top, right, bottom, left, horizontal, or vertical. |
| Value | `0`, `1`, `2`, `3`, `4`, `5`, `6`, `auto` | Selects a value from the spacing scale. |

| Value | CSS value |
| --- | --- |
| `0` | `0` |
| `1` | `0.25rem` |
| `2` | `0.5rem` |
| `3` | `0.75rem` |
| `4` | `1rem` |
| `5` | `1.5rem` |
| `6` | `3rem` |
| `auto` | `auto` |

Examples: `.m-0`, `.mt-4`, `.mx-auto`, `.p-3`, `.py-2`, `.pl-6`.

```html
<section class="p-4">
  <h2 class="mt-0 mb-2">Title</h2>
  <p class="my-0">Body</p>
</section>
```

All generated spacing declarations use `!important`, so they intentionally beat component declarations. `auto` is meaningful for margin only; do not use `.p-auto`, `.pt-auto`, or another padding-auto form because CSS rejects `padding: auto`. The `l` and `r` forms are physical directions; use application CSS with logical properties when spacing must mirror in RTL.

## Visibility helpers

A `.show-on-*` class sets `display: block !important` only inside its range. It does not hide the element outside that range. To show an otherwise hidden block only in one range, combine a base `.hide` with one `.show-on-*` class:

```html
<p class="hide show-on-medium">Visible only from 600px through 839px.</p>
```

This recipe is for block content. Because the show helper forces `display: block`, use a targeted media rule when the visible display must be `flex`, `grid`, `inline`, or another value.

### Hide classes

| Class | Hidden range |
| --- | --- |
| `.hide` | Every width. |
| `.hide-on-compact-only` | Below 600px. |
| `.hide-on-medium-only` | 600–839px. |
| `.hide-on-expanded-only` | 840–1199px. |
| `.hide-on-expanded-and-up` | 840px and above. |
| `.hide-on-large-only` | 1200–1599px. |
| `.hide-on-extra-large-only` | 1600px and above. |
| `.hide-on-med-and-down` | Below 840px. This shipped legacy name has no longer-form equivalent. |
| `.hide-on-med-and-up` | 600px and above. This shipped legacy name has no longer-form equivalent. |

### Canonical show classes

| Class | `display: block` range |
| --- | --- |
| `.show-on-compact` | Below 600px. |
| `.show-on-medium` | 600–839px. |
| `.show-on-expanded` | 840–1199px. |
| `.show-on-expanded-and-up` | 840px and above. |
| `.show-on-large` | 1200–1599px. |
| `.show-on-extra-large` | 1600px and above. |
| `.show-on-medium-and-up` | 600px and above. |
| `.show-on-medium-and-down` | Below 840px. |

`.center-on-small-only` centers text below 600px and leaves alignment unchanged at wider widths.

Compatibility aliases remain in the stylesheet: `.hide-on-small-only`, `.hide-on-small-and-down`, `.hide-on-med-only`, `.hide-on-xxl-only`, `.show-on-small`, and `.show-on-xxl`. Preserve them when maintaining older markup, but prefer canonical Compact/Medium/Expanded/Large/Extra-large names in new code. The two `med-and-*` hide classes in the table are public helpers, not aliases for nonexistent `.hide-on-medium-and-down` or `.hide-on-medium-and-up` classes.

Never use display hiding as the only way to provide required content or actions. Confirm hidden content is intentionally removed from visual layout and the accessibility tree.

## Alignment and layout helpers

| Class | Effect | Use carefully |
| --- | --- | --- |
| `.valign-wrapper` | `display: flex; align-items: center` | Changes the container to flex. It does not horizontally center children. |
| `.left-align` | Left-aligns text. | Physical alignment does not mirror in RTL. |
| `.right-align` | Right-aligns text. | Physical alignment does not mirror in RTL. |
| `.center-align` | Centers text. | Use on the text container. `.center` is not the canonical helper. |
| `.center-block` | Sets `display: block` and horizontal auto margins. | Visible centering requires a used width narrower than the parent. |
| `.divider` | Draws a 1px `outline-variant` divider. | Keep decorative dividers out of the accessibility tree; use semantic grouping or headings for real structure. |

```html
<div class="valign-wrapper">
  <span class="material-symbols mr-2" aria-hidden="true">info</span>
  <p class="my-0">Vertically centered content</p>
</div>
```

## Shape and text helpers

| Class | Effect | Use carefully |
| --- | --- | --- |
| `.no-select` | Disables text selection. | Do not apply to content users may need to copy. |
| `.circle` | Applies a 50% border radius except when paired with `.extra` or `.large`. | Use component-owned shape variants first. FAB sizing has its own shape contract. |
| `.truncate` | One line, clipped overflow, ellipsis. | The element needs a constrained width; a flex/grid child may also need `min-width: 0`. Preserve the full value elsewhere when it matters. |
| `.no-padding` | Sets `padding: 0 !important`. | Overrides component padding; use only when removing all padding is intentional. |
| `.hoverable` | Transitions to one fixed hover shadow. | That shadow can be lower than an existing high z-depth; hover must not be the only cue or interaction path. |

```html
<p class="truncate" title="Quarterly revenue and operating margin by region">
  Quarterly revenue and operating margin by region
</p>
```

## Shadow and elevation

Apply one elevation class when a plain element needs a documented Material shadow. Prefer component-owned elevation when a component already defines it.

| Class | Effect |
| --- | --- |
| `.z-depth-0` | Removes the shadow with `box-shadow: none !important`; use it to flatten a component-owned shadow deliberately. |
| `.z-depth-1` | Elevation level 1. |
| `.z-depth-1-half` | In-between elevation used by some component hover states. |
| `.z-depth-2` | Elevation level 2. |
| `.z-depth-3` | Elevation level 3. |
| `.z-depth-4` | Elevation level 4. |
| `.z-depth-5` | Elevation level 5. |

```html
<article class="z-depth-2 p-4">Raised content</article>
```

In Sass, use `@include z-depth("2")` rather than `@extend .z-depth-2`. The class list and mixin share the same elevation map. Do not stack multiple `.z-depth-*` classes; choose one level, and verify the elevation still communicates hierarchy in every state.

## Responsive media helpers

| Class | Apply to | Effect |
| --- | --- | --- |
| `.responsive-img` | `<img>` | `max-width: 100%; height: auto` and a 12px radius unless `.circle` is also present. |
| `.responsive-video` | `<video>` | `max-width: 100%; height: auto` and a 12px radius. |
| `.video-container` | Wrapper around `<iframe>`, `<object>`, or `<embed>` | Creates a clipped 16:9 box and makes the child fill it. |

```html
<img class="responsive-img" src="report.png" alt="Quarterly sales chart">

<div class="video-container">
  <iframe src="https://example.com/embed/video" title="Product walkthrough"></iframe>
</div>
```

Use meaningful `alt` text for informative images, empty `alt` for decorative images, and a title or other accessible name for an embedded frame.

## Native form opt-out

Apply `.browser-default` to an `<input>` or `<select>` when the target-version component documentation says to keep the native control instead of applying ExpressiveCSS form treatment.

```html
<select class="browser-default" aria-label="Sort results">
  <option>Newest</option>
  <option>Oldest</option>
</select>
```

`.browser-default` is a targeted form-control opt-out, not a general CSS reset. Do not apply it to arbitrary elements.

## Review checklist

- Every utility has one explicit job.
- Spacing class grammar and values are valid; no padding-auto class is used.
- Physical left/right spacing and alignment are checked in RTL.
- Show helpers pair with `.hide` when the content should be absent outside the show range.
- A forced `display: block` does not break flex, grid, inline, or table layout.
- Hidden content is not the only copy of required information or actions.
- Truncated text remains available when users need the full value.
- Utility `!important` rules do not accidentally erase component spacing.
- Component variants remain preferred over utility-built imitations.
