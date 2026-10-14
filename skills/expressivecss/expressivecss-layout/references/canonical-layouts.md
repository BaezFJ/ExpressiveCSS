# Canonical layouts

Read this when choosing a starting layout for a screen, or when building or reviewing a feed, list-detail, or supporting pane layout. Material's [canonical layout examples](https://m3.material.io/foundations/layout/canonical-examples/overview), reviewed 2026-10-13, set the design intent. The [panes guide](../../components/panes.md) and the selected component guides define what ExpressiveCSS ships.

## Contents

- Pick an example
- Feed
- List-detail
- Supporting pane
- Custom and layered layouts
- Review checklist

## Pick an example

Canonical layouts show how to fill the scaffold's bar, rail and pane regions for common screens. Each one has a configuration for compact, medium and expanded windows. Start from the closest one and change it, instead of designing the screen from nothing.

| Example | Use it when | ExpressiveCSS starting point |
| --- | --- | --- |
| Feed | People browse many comparable items, such as news, photos or social posts | Cards in a `.row` grid; the [dashboard guide](../../expressivecss-dashboard/SKILL.md) for metric cards |
| List-detail | Items in a list each open a detail view: inbox and email, files and folder, artist and album, settings and category | `.panes.list-detail`; the [list-detail template](../../assets/templates/layout-list-detail.html) and [example](../../assets/examples/list-detail.html) |
| Supporting pane | Secondary content only makes sense next to the primary content: comments on a document, lessons beside a course, related items beside a video | `.panes.supporting`, or grid spans when the supporting pane must stack |

A parent and its children make a list-detail layout, not a supporting pane. If the secondary content would still make sense on its own page, it is probably a detail view.

## Feed

A feed arranges cards or list items in a grid so people can scan a lot of content quickly. Grids go from one column to many, so a feed works at almost any width.

- Compact: stack items vertically, each filling the pane width.
- Medium: split items across columns. Items can have different widths.
- Expanded, large and extra-large: add columns, and let column width grow.

Use size and position to show relationships: a larger card for the lead story, smaller cards grouped beside it. Reading order follows position, so the source order should match the visual order at every width. Items reflow when the window changes, for example on rotation or entering multi-window mode, so keep the reading order the same as the layout reflows.

In ExpressiveCSS, a feed is a `.row` with one card or list item per column, following the card collection pattern in the [grid reference](../../expressivecss-usage/references/grid.md):

```html
<div class="row g-4">
  <article class="s12 m6 l4 xxl3">…</article>
  <article class="s12 m12 l8 xxl6">Lead story</article>
</div>
```

A wider span such as `.l8` makes a featured card. Horizontal [cards](../../components/cards.md) stack below 600px. Do not reorder cards with CSS to change their visual order; reorder the source instead.

## List-detail

List-detail shows an explorable list beside the selected item's detail. It always has two panes. Depending on the breakpoint they appear together or one at a time.

| Breakpoint | Visible panes |
| --- | --- |
| Compact (0 to 599) | 1 |
| Medium (600 to 839) | 1 (recommended) or 2 |
| Expanded (840+) | 2 |
| Large (1200 to 1599) | 2 |
| Extra-large (1600+) | 2 |

- Compact: one pane, either the list or the detail.
- Medium: one pane for dense content or deep focus. Two panes help when people browse a collection and switch items often; use a navigation bar or modal rail to leave room for both.
- Expanded and wider: two panes.

ExpressiveCSS `.panes.list-detail` has a 360px list pane and a flexible detail pane. Below 840px it shows one pane: the first by default, or the pane with `active`. The application moves `active` when someone opens an item or goes back. At 840px and up every pane shows and `active` is ignored. A two-pane medium layout therefore needs its own grid layout. The thresholds follow the nearest container with `container-type: inline-size`, so a list-detail inside a narrow column collapses even on a wide window.

### Behavior in one pane and in two

- Back button: only in the single-pane detail view, and return focus to the selected list item when it is used. Hide it under the same condition that shows both panes. The panes collapse by the width of the nearest ancestor with `container-type: inline-size`, or the viewport when there is none. The template's container spans the whole window, so its `.hide-on-expanded-and-up` matches. When the container is narrower than the window, for example beside a navigation rail, hide Back with an `@container (width >= 840px)` rule against that container instead. A viewport helper there hides Back while only one pane shows, leaving no way back to the list.
- Selected state: only in the two-pane list. Mark it with `aria-current` on the item's link, as the template does.
- Visual focus: in two panes, group content so the eye goes to the detail. Separated panes (`.panes.separated`) or the default divider both work.

### When the layout changes

The window can change while someone is using the page: rotating, unfolding, resizing, or entering multi-window mode.

- No item selected: one pane shows the list. Two panes show the list and an empty or placeholder detail, such as an [empty state](../../components/empty-state.md). For multi-select, keep showing the most recently used pane when the layout drops to one pane.
- Item selected, one pane to two: show both, with the selected item's detail visible.
- Item selected, two panes to one: usually show the detail, with its header and back button. If selection does not navigate, as in multi-select, show the list with the item still selected. If the single-pane layout was showing the list before, return to the list.

Save state between detail views. Keep read and unread status, and keep each detail view's scroll position when people move to another item and back. ExpressiveCSS does not store this; the application does.

## Supporting pane

A supporting pane layout has a focus pane with the main content, about two thirds of the space, and a supporting pane for the rest. Use it for productivity tools, document editing with comments, and media browsing.

- Compact: put the supporting pane below the focus pane. A [bottom sheet](../../components/bottom-sheet.md) can hold supporting content and keep attention on the focus pane.
- Medium: put the supporting pane below the focus pane.
- Expanded: put the supporting pane on the leading or trailing side of the focus pane.

`.panes.supporting` puts a flexible primary pane first and a fixed 360px supporting pane after it; `start` puts the supporting pane first. Below 840px it shows one pane at a time instead of stacking, so supporting content is hidden unless the application switches `active`. When the supporting content must stay visible below the focus pane, which is Material's guidance, build the layout with grid spans:

```html
<div class="row">
  <section class="s12 l8" aria-labelledby="doc-title">…</section>
  <aside class="s12 l4" aria-labelledby="comments-title">…</aside>
</div>
```

This stacks on compact and medium and becomes an 8/4 split, close to two thirds, from 840px. Keep the focus content first in the source so it is read first.

## Custom and layered layouts

Build custom layouts on top of a canonical layout or by combining scaffold regions; the [scaffold reference](../../expressivecss-design/references/scaffold.md) covers the regions and adaptations.

To focus people on one task, layer a pane above the content. Material calls this the levitate strategy. Examples are reviewing a shopping basket, responding to comments, or creating a calendar event. In ExpressiveCSS, a layered pane is a [side sheet](../../components/side-sheet.md), [bottom sheet](../../components/bottom-sheet.md) or [dialog](../../components/dialogs.md). Choose modal or standard from the task, and follow that component's focus, dismissal and background rules.

## Review checklist

- The screen starts from the canonical layout that matches its content relationship: a feed, a parent-child list-detail, or primary content with supporting content.
- Feed items keep the same source and visual order at every width.
- List-detail shows a back button only in one pane and a selected state only in two, and focus returns to the selected item after going back.
- Crossing 840px with and without a selected item shows the views described above, and read state and scroll position survive.
- Supporting content stays reachable on compact and medium, either stacked below the focus pane or in a bottom sheet.
- A layered pane follows its component's focus and dismissal contract.
