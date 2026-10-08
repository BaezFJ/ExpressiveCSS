# ExpressiveCSS helper-class reference

Read this after the Usage guide when a task needs spacing, flex layout, alignment, visibility, formatting, responsive media, or elevation helpers. The [target-version Helpers documentation](https://www.expressivecss.com/helpers.html.md), [Shadow documentation](https://www.expressivecss.com/shadow.html.md), [helper Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_helpers.scss), [spacing Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_spacing.scss), [visibility Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_visibility.scss), and [elevation Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/abstracts/_elevation.scss) override this summary if they differ.

## Contents

- Agent procedure
- Spacing grammar
- Visibility helpers: hide classes, show classes, screen-reader-only text, reveal on focus
- Alignment and layout helpers
- Flex helpers
- Sizing and overflow
- Shape and text helpers
- Shadow and elevation
- Responsive media helpers
- Native form opt-out
- Review checklist

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
| Optional side | omitted, `t`, `r`, `b`, `l`, `x`, `y`, `s`, `e` | All sides, top, right, bottom, left, horizontal, vertical, inline start, or inline end. |
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

Examples: `.m-0`, `.mt-4`, `.mx-auto`, `.p-3`, `.py-2`, `.pl-6`, `.ms-auto`, `.pe-2`.

```html
<section class="p-4">
  <h2 class="mt-0 mb-2">Title</h2>
  <p class="my-0">Body</p>
</section>
```

`.gap-0` to `.gap-6` set `gap` on the same scale for a flex or grid container; there is no `.gap-auto`.

All generated spacing declarations use `!important`, so they intentionally beat component declarations. `auto` is meaningful for margin only; padding-auto classes are not generated because CSS rejects `padding: auto`. The `l` and `r` forms remain physical directions. Use `.ms-*`, `.me-*`, `.ps-*`, and `.pe-*` for `margin-inline-start`, `margin-inline-end`, `padding-inline-start`, and `padding-inline-end`. They follow writing direction and mirror in RTL. Each accepts `0` through `6`; only `.ms-*` and `.me-*` accept `auto`. Avoid combining physical and logical helpers that set the same side.

## Visibility helpers

A `.show-on-*` class sets `display: block !important` only inside its range. It does not hide the element outside that range. To show an otherwise hidden block only in one range, combine a base `.hide` with one `.show-on-*` class:

```html
<p class="hide show-on-medium">Visible only from 600px through 839px.</p>
```

This recipe is for block content. For a flex row hidden only below 600px, retain its display class and hide the unwanted range:

```html
<div class="flex hide-on-compact-only gap-2">
  <a href="/reports">Reports</a>
  <a href="/settings">Settings</a>
</div>
```

Use a targeted media rule for display requirements the existing hide ranges cannot express. A show helper would force this row to `display: block`.

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

### Screen-reader-only text

`.visually-hidden` removes an element from sight without removing it from the accessibility tree, so screen readers still announce it. Use it for text the layout does not show, such as context that makes a repeated link unique or the text of a live region. Every declaration is `!important`, like `.hide`. A focused element stays invisible, so do not put the class on a focusable control unless its focus is drawn somewhere else.

```html
<a href="/orders/42">View<span class="visually-hidden"> order 42</span></a>
```

### Reveal on focus

`.visually-hidden-focusable` applies the same hidden styles only while the element has no focus within it. A skip link becomes visible when focused; a container becomes visible when a descendant receives focus. Use this class independently. Combining it with `.visually-hidden` would keep it hidden.

```html
<a class="visually-hidden-focusable" href="#main-content">Skip to content</a>
<main id="main-content" tabindex="-1">
  <h1>Page content</h1>
</main>
```

## Alignment and layout helpers

| Class | Effect | Use carefully |
| --- | --- | --- |
| `.valign-wrapper` | `display: flex; align-items: center` | Changes the container to flex. It does not horizontally center children. |
| `.left-align` | Left-aligns text. | Physical alignment does not mirror in RTL. |
| `.right-align` | Right-aligns text. | Physical alignment does not mirror in RTL. |
| `.start-align`, `.end-align` | `text-align: start` or `text-align: end`. | Follow text direction and mirror in RTL. |
| `.center-align` | Centers text. | Use on the text container. `.center` is not the canonical helper. |
| `.center-block` | Sets `display: block` and horizontal auto margins. | Visible centering requires a used width narrower than the parent. |
| `.divider` | Draws a 1px `outline-variant` divider. | Keep decorative dividers out of the accessibility tree; use semantic grouping or headings for real structure. |

```html
<div class="valign-wrapper">
  <span class="material-symbols mr-2" aria-hidden="true">info</span>
  <p class="my-0">Vertically centered content</p>
</div>
```

## Flex helpers

Apply one class per declaration to the container. Row direction and start alignment are the flex defaults and have no class. `.flex-1` and `.flex-none` go on a child.

| Class | Declaration | Use carefully |
| --- | --- | --- |
| `.flex` | `display: flex` | Changes the container's display; children lose block margins collapsing. |
| `.inline-flex` | `display: inline-flex` | For a control-sized container inside text. |
| `.flex-column` | `flex-direction: column` | Vertical stacks; `.justify-*` then works on the vertical axis. |
| `.flex-wrap` | `flex-wrap: wrap` | Required for chip sets and action rows that must reflow on Compact. |
| `.justify-start`, `.justify-center`, `.justify-end`, `.justify-between` | `justify-content` | `flex-start`/`flex-end` follow writing direction and mirror in RTL. |
| `.align-start`, `.align-center`, `.align-end`, `.align-stretch` | `align-items` | `.align-center` on the container is the same as `.valign-wrapper`. |
| `.flex-1` | `flex: 1 1 0` | The child takes remaining space; add `.min-w-0` if its text must truncate. |
| `.flex-none` | `flex: none` | The child keeps its content size. |
| `.gap-0` to `.gap-6` | `gap`, `!important` | Spacing scale above; use `.g-*` on `.row` instead. |

```html
<div class="flex align-center justify-between gap-3">
  <h2 class="title-medium my-0">Members</h2>
  <button type="button" class="tonal">Invite</button>
</div>
```

Components that already lay out their children (app bars, toolbars, card `.actions`, button groups, navigation bars) do not need these classes. Reach for `.row` and column spans when the layout has more than one line of content; use flex helpers for one line of controls or a stack.

## Sizing and overflow

| Class | Declaration | Use carefully |
| --- | --- | --- |
| `.min-w-0` | `min-width: 0` | Lets a flex or grid child shrink below its content's minimum width. |
| `.min-h-0` | `min-height: 0` | Lets a child shrink inside a bounded column before its content scrolls. |
| `.overflow-x-auto` | `overflow-x: auto` | For wide tables or action rows in a bounded container. |
| `.overflow-y-auto` | `overflow-y: auto` | Needs a bounded height to scroll. |
| `.overflow-hidden` | `overflow: hidden` | Clips content and focus rings; avoid hiding required content. |

```html
<div class="flex gap-2" style="max-width: 24rem">
  <span class="flex-1 min-w-0 truncate">A long filename that must fit beside its action.pdf</span>
  <button type="button" class="flex-none">Download</button>
</div>

<section class="flex flex-column" style="height: 12rem" aria-labelledby="activity-title">
  <h2 id="activity-title" class="title-medium flex-none">Activity</h2>
  <div class="flex-1 min-h-0 overflow-y-auto p-2" tabindex="0" role="region" aria-label="Recent activity">
    <p>09:00 Report uploaded.</p>
    <p>09:15 Review requested.</p>
    <p>09:30 Comments received.</p>
    <p>09:45 Changes approved.</p>
  </div>
</section>
```

Give a generic scroll region `tabindex="0"` and an accessible name when keyboard users cannot otherwise focus and scroll it. Leave padding for child focus rings, such as `.p-2`. These sizing and overflow helpers use normal declarations, as the flex helpers do.

## Shape and text helpers

| Class | Effect | Use carefully |
| --- | --- | --- |
| `.no-select` | Disables text selection. | Do not apply to content users may need to copy. |
| `.circle` | Applies a 50% border radius except when paired with `.extra` or `.large`. | Use component-owned shape variants first. FAB sizing has its own shape contract. |
| `.truncate` | One line, clipped overflow, ellipsis. | The element needs a constrained width; a flex/grid child may also need `.min-w-0`. Preserve the full value elsewhere when it matters. |
| `.break-words` | `overflow-wrap: anywhere`. | Lets long URLs or identifiers wrap without clipping. |
| `.text-nowrap` | `white-space: nowrap`. | Keeps one line without clipping or ellipsis; check narrow screens. |
| `.text-wrap` | `white-space: normal`. | Restores ordinary wrapping. |
| `.no-padding` | Sets `padding: 0 !important`. | Overrides component padding; use only when removing all padding is intentional. |
| `.hoverable` | Transitions to one fixed hover shadow. | That shadow can be lower than an existing high z-depth; hover must not be the only cue or interaction path. |

```html
<p class="truncate" title="Quarterly revenue and operating margin by region">
  Quarterly revenue and operating margin by region
</p>
```

## Shadow and elevation

Prefer component-owned elevation. For a plain element, apply exactly one of `.z-depth-0`, `.z-depth-1`, `.z-depth-1-half`, `.z-depth-2`, `.z-depth-3`, `.z-depth-4`, or `.z-depth-5`. `.z-depth-0` removes the shadow with `box-shadow: none !important`, including a component-owned shadow. In Sass, use `@include z-depth("2")` rather than `@extend .z-depth-2`. The Theming guide's elevation reference covers ordering, reset, and state rules.

## Responsive media helpers

`.responsive-img` (on `<img>`) and `.responsive-video` (on `<video>`) cap width at the container and keep the intrinsic ratio. `.video-container` wraps an `<iframe>`, `<object>`, or `<embed>` in a clipped 16:9 box. The Usage guide's media reference covers alternatives, captions, and loading.

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
- Flex containers that hold wrapping content carry `.flex-wrap`, and one-line rows are checked with long labels.
- Hidden content is not the only copy of required information or actions.
- `.visually-hidden` carries only text that assistive technology needs; it is not on a control that receives focus.
- `.visually-hidden-focusable` becomes visible on focus and is never combined with `.visually-hidden`.
- Scroll regions have bounded sizes, keyboard access, and clearance for focus rings.
- Truncated text remains available when users need the full value.
- Utility `!important` rules do not accidentally erase component spacing.
- Component variants remain preferred over utility-built imitations.
