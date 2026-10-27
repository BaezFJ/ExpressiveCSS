# Grids and spacing

Read this when placing regions and content on the grid, aligning content across pages, choosing spacing between elements, or adding a dense view. Material's [grids and spacing guidance](https://m3.material.io/foundations/layout/grids-spacing/overview), reviewed 2026-10-13, sets the design intent. The [grid reference](../../expressivecss-usage/references/grid.md) and [helpers reference](../../expressivecss-usage/references/helpers.md) define the shipped classes.

## Contents

- Grids
- Rulers and alignment
- Spacing
- Density
- Review checklist

## Grids

Material lays out every breakpoint on a column grid. Rails and panes sit on it, and its column count, column width and spacing grow with the window. Fewer columns on compact keep the layout focused; more columns on wider windows, such as an unfolded foldable, allow a richer layout.

| Breakpoint | Material columns | ExpressiveCSS equivalent |
| --- | --- | --- |
| Compact | 4 | `.s3` is one Material column, `.s6` two, `.s12` all four |
| Medium and expanded | 8 | `.m3`/`.l3` is two Material columns, `.m6`/`.l6` four; a single eighth has no span |
| Large and extra-large | 12 | One track is one column (`.xl1`, `.xxl1`) |

ExpressiveCSS always has 12 tracks in a `.row`, so the table maps Material's columns onto them. Gaps grow from 1.5rem to 2rem at extra-large, and `.container` changes its percentage width at medium, expanded and extra-large.

Fill the grid from the outside in:

1. Place the bars and rails nearest the edges of the usable space first: a [navigation bar](../../components/navigation-bar.md) or [navigation rail](../../components/navigation-rail.md), then [app bars](../../components/app-bar.md) and [toolbars](../../components/toolbars.md).
2. Fill the remaining region with panes, chosen with the [canonical layouts reference](./canonical-layouts.md).
3. Lay out each pane's content with `.row` and column spans, starting a new `.row` inside the pane.

## Rulers and alignment

Rulers are global alignment lines that keep content and components lined up and give every page the same focal points. ExpressiveCSS has no ruler classes; reproduce each ruler with the grid, the container and consistent spacing.

| Ruler | Purpose | ExpressiveCSS |
| --- | --- | --- |
| Margin | Where content starts from the window edge | `.container` width or the pane margins (16px compact, 24px from medium) |
| Bar and safety | Keep actionable content clear of the status bar, browser chrome and gesture area | `env(safe-area-inset-*)`; the navigation bar, toolbar and snackbar already pad for the bottom inset |
| Title | Aligns the screen title and the icons and actions in the app bar | The [app bar](../../components/app-bar.md) layout; match the content's start edge to the title |
| Content | The first content ruler anchors major blocks such as a hero image, headline or carousel; later rulers mark where supporting text or actions start | Start each block on the same grid track on every page of the product |
| Rail | The edge of the rail region | The navigation rail's inline end |

The margin ruler can move inward or outward. A wider margin adds negative space and calm; a narrower margin fits more content. Content can also break the margin on purpose for immersion: a photo grid can run full width while search keeps the standard margin. In ExpressiveCSS, put the full-width block outside `.container`, or use `.container.max`, and keep the controls inside the normal container.

## Spacing

Spacing groups content, directs attention and sets the product's tone. Denser spacing feels focused and serious; open spacing feels calm. Desktop layouts can use more generous spacing than mobile ones.

Use the spacing scale instead of one-off values: `.m*`, `.p*` and `.gap-*` from 0 to 6, with zero at 0 and the nonzero values from 0.25rem to 3rem, and `.g-0` to `.g-5` on a `.row`. Set independent column and row gaps with `.gap-x-*` and `.gap-y-*`. Both accept all four window-size prefixes. For example, `gap-4 medium:gap-x-2` retains a `1rem` row gap while reducing the column gap to `0.5rem` from 600px. See the [helper reference](../../expressivecss-usage/references/helpers.md#spacing-grammar) for scale and shorthand precedence. Prefer the logical forms `.ms-*`, `.me-*`, `.ps-*` and `.pe-*` so spacing mirrors in RTL.

### Group related content

- Implicit grouping uses proximity and open space. An image with its caption, or carousel items close together with space around the set. Keep the space inside a group smaller than the space between groups, for example `.mb-2` inside and `.mb-6` between.
- Explicit grouping uses a boundary: an outline, divider, or shadow. A boundary can also signal that the group is interactive, such as list items between dividers or a card holding an image and caption. Use [cards](../../components/cards.md), [lists](../../components/lists.md) or the `.divider` helper rather than ad hoc borders.

### Direct attention

- Rhythm: keep the same spacing between related items. Cards of different heights keep one gap, which a `.row` gap does by default.
- Similarity: give similar elements the same size and spacing, and align leading elements such as thumbnails, avatars and icons. Product thumbnails stay one size even when the source images have different aspect ratios; set a fixed `aspect-ratio` and `object-fit: cover`.
- Proximity: place actions next to the content they affect, such as a card's `.actions` row under its content.
- Continuity: put the parts of one control in one row or container, such as a [chip](../../components/chips.md) set for sizes.

### Spacing as expression

Give the most important content and actions the most space and the brightest surfaces. Keep key actions and information in the same place across pages so they become recognizable focal points. Negative space around a header or a primary action gives it emphasis without making it larger.

## Density

Information density is how much content fits on the screen. Increase it only where people need to scan or compare a lot of information, such as data tables, long lists, long forms, finance views and dashboards. Lower density suits pages built around a focused message, imagery, or simple navigation. Not every layout needs a density option, and some people do not benefit from one.

There are two ways to raise density, and they can be combined:

- Layout density: smaller margins, spacers, padding and gaps. Use `.g-1` or `.g-2` on rows, smaller spacing helpers, and `.data-table.dense`, which shortens rows from 52px to 40px.
- Component scaling: a component's own density scale, from 0 (default) down to -1, -2 and -3, usually removing 4dp of vertical padding per step. ExpressiveCSS has no general component density scale; a component offers density only where its guide documents it.

Rules for any dense view:

- Make density opt-in. Do not switch density automatically across breakpoints or orientation; a person who wants a dense desktop view may not want it on a phone.
- Keep the density control itself at the default size so people can always switch back.
- Keep interactive targets at least 48 by 48 CSS pixels, even when the visible icon or row is smaller. Check selection checkboxes and row actions in a dense table. This is Material's recommendation; WCAG 2.2 SC 2.5.8 sets a lower 24px minimum with exceptions, as the [design rules](../../references/design-rules.md) explain.
- Do not change text size when a component gets denser, and keep its content centered in the container.
- Do not make focused-task or alerting components denser: menus, snackbars and dialogs keep their default size.

## Review checklist

- Bars and rails are placed first, panes second, and pane content uses its own `.row`.
- Content blocks start on the same grid track and margin on every page; any full-width block is a deliberate exception.
- Spacing inside a group is smaller than spacing between groups, and every value comes from the spacing scale.
- Similar items share size, spacing and leading alignment, and actions sit next to the content they affect.
- Dense views are opt-in, keep 48px targets and unchanged text size, and leave menus, snackbars and dialogs at default density.
