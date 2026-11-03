# ExpressiveCSS helper-class reference

Read this after the Usage guide when a task needs spacing, flex layout, alignment, visibility, formatting, responsive media, or elevation helpers. The [target-version Helpers documentation](https://www.expressivecss.com/helpers.html.md), [Shadow documentation](https://www.expressivecss.com/shadow.html.md), [helper Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_helpers.scss), [spacing Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_spacing.scss), [visibility Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/utilities/_visibility.scss), and [elevation Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/abstracts/_elevation.scss) override this summary if they differ.

## Contents

- Agent procedure
- Spacing grammar
- Visibility helpers: hide classes, show classes, screen-reader-only text, reveal on focus
- Alignment and layout helpers
- Flex helpers
- Window-size prefixes
- Sizing and overflow
- Shape and text helpers
- Shadow and elevation
- Responsive media helpers
- Native form opt-out
- Native scroll areas
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

`.gap-0` to `.gap-6` set `gap` on the same scale for a flex or grid container. `.gap-x-0` to `.gap-x-6` set only `column-gap`, and `.gap-y-0` to `.gap-y-6` set only `row-gap`. These keep the native property meanings in RTL and column-direction flex layouts. No gap family accepts `auto`.

At the same breakpoint, an axis class overrides the gap shorthand regardless of HTML class order. A later breakpoint's shorthand resets both axes; a later axis class changes only its axis. Use `0` to remove a gap, and avoid conflicting values from the same family at the same breakpoint. For example, `grid-auto-fill gap-4 medium:gap-x-2` keeps a `1rem` row gap while its column gap changes from `1rem` to `0.5rem` at 600px. The grid's `.g-*` classes use a separate scale.

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

`.hide-on-print` hides an element on paper and `.print-only` shows it only on paper. Print also forces the light scheme, hides navigation rails, navigation bars, the FAB menu, snackbars and tooltips, and prints the URL after external links in running text. Use `.hide-on-print` for other screen-only controls instead of a page-level print sheet.

`.center-on-small-only` centers text below 600px and leaves alignment unchanged at wider widths.

The two `med-and-*` hide classes in the table are public helpers, not aliases for nonexistent `.hide-on-medium-and-down` or `.hide-on-medium-and-up` classes.

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
| `.query-container` | `container-type: inline-size`. Horizontal cards and description lists inside it stack below 600px of container width. | Put it on a wrapper that fills its parent; inline-size containment stops the element sizing itself from its content. |
| `.relative`, `.sticky-top` | `position: relative`; `position: sticky; top: 0`. | A sticky element stops at an ancestor with `overflow: hidden`. |
| `.position-absolute`, `.position-fixed`, `.position-static` | The matching `position`. | Give an absolute element's parent `.relative`. There is no bare `.fixed`; that is a component modifier. `.position-fixed` sets no `z-index`, so add a `--expressive-z-*` value, and a transformed, filtered or contained ancestor captures it. `.position-static` undoes `.relative` and `.sticky-top`. |
| `.inset-0`, `.top-0`, `.bottom-0`, `.start-0`, `.end-0` | `inset: 0`, or 0 on one edge. | `.start-0` and `.end-0` are logical and swap sides in RTL. None of the position classes take a window-size prefix. |
| `.block`, `.inline-block`, `.grid`, `.inline-grid`, `.contents` | The matching `display`. | There is no `display: inline` class; `.inline` is the checkbox and radio row. Keep `.contents` off buttons, lists, tables and headings. |
| `.divider` | Draws a 1px `outline-variant` divider. | Keep decorative dividers out of the accessibility tree; use semantic grouping or headings for real structure. |

```html
<div class="valign-wrapper">
  <span class="material-symbols mr-2" aria-hidden="true">info</span>
  <p class="my-0">Vertically centered content</p>
</div>
```

## Flex helpers

Apply one class per declaration to the container. `.flex-row` and `.flex-nowrap` restate the defaults so a window-size prefix can switch back to them. `.flex-1`, `.flex-none`, `.flex-initial`, `.shrink-0`, `.shrink-1`, `.self-*` and `.order-*` go on a child.

| Class | Declaration | Use carefully |
| --- | --- | --- |
| `.flex` | `display: flex` | Changes the container's display; children lose block margins collapsing. |
| `.inline-flex` | `display: inline-flex` | For a control-sized container inside text. |
| `.flex-row`, `.flex-column` | `flex-direction` | Vertical stacks; `.justify-*` then works on the vertical axis. |
| `.flex-wrap`, `.flex-nowrap` | `flex-wrap` | Wrap is required for chip sets and action rows that must reflow on Compact. |
| `.justify-start`, `.justify-center`, `.justify-end`, `.justify-between`, `.justify-around`, `.justify-evenly` | `justify-content` | `flex-start`/`flex-end` follow writing direction and mirror in RTL. |
| `.align-start`, `.align-center`, `.align-end`, `.align-stretch`, `.align-baseline` | `align-items` | `.align-center` on the container is the same as `.valign-wrapper`. |
| `.flex-1` | `flex: 1 1 0` | The child takes remaining space; add `.min-w-0` if its text must truncate. |
| `.flex-none` | `flex: none` | The child keeps its content size. |
| `.flex-initial` | `flex: 0 1 auto` | Sizes from content, can shrink and does not grow. |
| `.shrink-0` | `flex-shrink: 0` | Keeps an icon or avatar from squeezing. |
| `.shrink-1` | `flex-shrink: 1` | Restores shrinking while keeping grow and basis. |
| `.self-start`, `.self-center`, `.self-end`, `.self-stretch` | `align-self` | One child out of line with the rest. |
| `.self-auto` | `align-self: auto` | Hand a child back to the parent's `align-*`, usually with a prefix: `self-center expanded:self-auto`. |
| `.order-first`, `.order-last`, `.order-none` | `order: -1`, `order: 1`, `order: 0` | Visual only; keyboard and reading order follow the source, so do not reorder meaningful content. `.order-none` restores the source position, for example `order-last expanded:order-none`. |
| `.gap-0` to `.gap-6` | `gap`, `!important` | Spacing scale above; use `.g-*` on `.row` instead. |
| `.gap-x-0` to `.gap-x-6` | `column-gap`, `!important` | Changes only the column gap. |
| `.gap-y-0` to `.gap-y-6` | `row-gap`, `!important` | Changes only the row gap. |

```html
<div class="flex align-center justify-between gap-3">
  <h2 class="title-medium my-0">Members</h2>
  <button type="button" class="tonal">Invite</button>
</div>
```

Components that already lay out their children (app bars, toolbars, card `.actions`, button groups, navigation bars) do not need these classes. Reach for `.row` and column spans when the layout has more than one line of content; use flex helpers for one line of controls or a stack.

## Window-size prefixes

Display, flex direction and wrap, `.flex-1`, `.flex-none`, `.flex-initial`, `.shrink-0`, `.shrink-1`, `justify-*`, `align-*`, `self-*`, `.order-*`, `.start-align`, `.center-align`, `.end-align`, `.gap-*`, `.gap-x-*`, `.gap-y-*`, margin and padding (all sides, `x`, `y`, `t`, `b`, `s`, `e`; not `l` or `r`) and `.hide` also take a `medium:`, `expanded:`, `large:` or `extra-large:` prefix. The prefixed class applies from that size class up (600, 840, 1200 and 1600px) and overrides the unprefixed one, like the grid's `m6` and `l4`.

```html
<div class="flex flex-column gap-2 expanded:flex-row expanded:align-center expanded:justify-between">
  <h2 class="title-medium my-0">Members</h2>
  <button type="button" class="tonal">Invite</button>
</div>
```

A child can change its share of the space too. This filename sizes from its content below Expanded and takes the remaining space from 840px up. The link keeps its size. `.min-w-0` lets the text shrink below its content minimum so it can truncate. Use `.min-h-0` for a child that must shrink inside a bounded column.

```html
<div class="flex align-center gap-3">
  <span class="flex-initial expanded:flex-1 min-w-0 truncate">Quarterly report with a long filename.pdf</span>
  <a class="button tonal flex-none" href="#overflow">Sizing guide</a>
</div>
```

A prefixed `flex-*` shorthand sets grow, shrink and basis together, so `shrink-0 medium:flex-initial` allows shrinking from 600px up. Use `shrink-0 medium:shrink-1` to restore shrinking while keeping grow and basis. These resets assign explicit values; they do not recover an earlier component rule. Larger active prefixes win regardless of class order. Self-alignment, ordering and the other sizing helpers have no window-size prefixes.

Prefixes are mobile first; there is no max-width form. To hide content at a size, use the `.hide-on-*` classes, which are `!important`. Escape the colon in Sass or CSS selectors: `.expanded\:flex-row`. `.medium:hide` hides from Medium up.

## Sizing and overflow

| Class | Declaration | Use carefully |
| --- | --- | --- |
| `.min-w-0` | `min-width: 0` | Lets a flex or grid child shrink below its content's minimum width. |
| `.min-h-0` | `min-height: 0` | Lets a child shrink inside a bounded column before its content scrolls. |
| `.w-full`, `.h-full`, `.max-w-full` | `width: 100%`, `height: 100%`, `max-width: 100%` | `.h-full` needs a parent with a definite height. |
| `.aspect-1x1`, `.aspect-4x3`, `.aspect-16x9` | `aspect-ratio` | The height follows the width; an explicit height wins over the ratio. |
| `.object-cover`, `.object-contain` | `object-fit` | On an `<img>` or `<video>` with a set ratio; keep intrinsic `width` and `height` attributes. |
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
| `.circle` | Applies a 50% border radius except when paired with `.extra` or `.large`. | Use component-owned shape variants first. FAB sizing has its own shape contract. |
| `.truncate` | One line, clipped overflow, ellipsis. | The element needs a constrained width; a flex/grid child may also need `.min-w-0`. Preserve the full value elsewhere when it matters. |
| `.break-words` | `overflow-wrap: anywhere`. | Lets long URLs or identifiers wrap without clipping. |
| `.text-nowrap` | `white-space: nowrap`. | Keeps one line without clipping or ellipsis; check narrow screens. |
| `.text-wrap` | `white-space: normal`. | Restores ordinary wrapping. |
| `.text-balance`, `.text-pretty` | `text-wrap-style: balance`, `text-wrap-style: pretty`. | Headings already balance and paragraphs already use pretty; use these on other elements, such as a `<span>` title or a list item. |
| `.opacity-0`, `.opacity-25`, `.opacity-38`, `.opacity-50`, `.opacity-75`, `.opacity-100` | `opacity` of 0, 0.25, 0.38, 0.5, 0.75 or 1. 38 is M3's disabled-content opacity. Overrides a component's own opacity. | Disables and hides nothing: the element still takes clicks and focus and stays in the accessibility tree. Dimmed text needs enough contrast unless it belongs to a disabled control. |
| `.bordered`, `.border-top`, `.border-bottom`, `.border-start`, `.border-end` | A 1px `outline-variant` border on all sides or one side. Start and end mirror in RTL. | `.border` is the outlined card variant, not this utility. |
| `.corner-none` to `.corner-full` | `border-radius` from the matching `--md-sys-shape-corner-*` token (`none`, `extra-small`, `small`, `medium`, `large`, `extra-large`, `full`). | On a component it replaces the component's own shape and its state corner changes. `.rounded` is the pill button. |
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

## Native scroll areas

Use `.scroll-area` on a container with a bounded width or height to add native `overflow: auto`, a thin scrollbar and theme-aware colors. It requires no initialization. The [Scroll area guide](https://www.expressivecss.com/scroll-area.html.md) and `src/sass/utilities/_scroll-area.scss` own the contract.

```html
<div class="scroll-area min-h-0 p-2" style="height: 18rem"
     tabindex="0" role="region" aria-label="Recent activity">
  <p>Activity entries...</p>
</div>
```

Give a generic scrolling region keyboard focus and an accessible name when no focusable child provides scrolling access. Preserve padding for focus rings; use `.min-h-0` or `.min-w-0` when its flex or grid parent must let it shrink. Wheel, touch and keyboard scrolling remain native. Applying the class to `<html>` styles the page scrollbar.

`--scroll-area-thumb-color` defaults to `var(--md-sys-color-on-surface-variant)` and `--scroll-area-track-color` to `transparent`. Forced colors restore system colors and scrollbar width. Older WebKit engines use an 8px fallback; the operating system can affect rendering. Selective Sass builds need `"scroll-area"` in `$utilities`.

For custom positioned content, use the [stacking token reference](https://www.expressivecss.com/tokens.html.md); a shadow's elevation does not set its `z-index`.

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
