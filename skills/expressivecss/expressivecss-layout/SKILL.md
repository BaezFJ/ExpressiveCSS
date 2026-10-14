---
name: expressivecss-layout
description: Plans and reviews ExpressiveCSS page layouts with Material 3 layout guidance, covering the scaffold, canonical layouts, the five breakpoints, panes, margins, gaps and right-to-left support. Use for a new page or app shell, adaptive or responsive behavior, or a layout that breaks at some width. Not for projects without ExpressiveCSS or for styling a single component.
---

# ExpressiveCSS layout

Layout is the visual and strategic arrangement of elements on a screen. Material 3 writes its layout guidance for Android, and the same guidance applies to the web. ExpressiveCSS maps it onto semantic HTML, a 12-track CSS grid, CSS-only pane patterns and the navigation components. This guide is the overview: what a layout has to do, which names Material uses for its parts, and where each part lives in ExpressiveCSS. Topic references fill in the detail.

## References

Read each reference only when its condition applies.

| Reference | Read when |
| --- | --- |
| [Scaffold](../expressivecss-design/references/scaffold.md) | Placing bars, rails and panes, choosing a pane count, or adding resizing |
| [Canonical layouts](./references/canonical-layouts.md) | Building a feed, list-detail or supporting pane layout, or a layered pane |
| [Breakpoints](./references/breakpoints.md) | Deciding what to reveal, divide, resize, reposition or swap at the next width |
| [Grids and spacing](./references/grids-and-spacing.md) | Aligning content, choosing spacing between groups, or adding a dense view |

## What a layout has to do

Material's overview lists six principles. Each one has a concrete check in ExpressiveCSS:

1. **Organize the screen, signal hierarchy and draw attention to key actions.** Place every element in a region with a job, and give each region one high-emphasis action at most (see the hard rules in the [design rules](../references/design-rules.md)).
2. **Adapt to the compact, medium, expanded, large and extra-large breakpoints.** Design compact first, then decide what changes at each breakpoint the product reaches. The breakpoint table below gives the widths and classes.
3. **Build from an established canonical layout.** Start from list-detail, supporting pane, or a feed of cards before writing custom layout CSS. The starting points are listed under [Start from a canonical layout](#start-from-a-canonical-layout).
4. **Design for bidirectionality.** The same page must work left to right (LTR) and right to left (RTL). See [Bidirectionality](#bidirectionality).
5. **Apply consistent arrangement, sizing and spacing.** Use the grid, the gap classes and the pane margins instead of one-off pixel values, so neighboring pages line up. The [grids and spacing reference](./references/grids-and-spacing.md) covers columns, rulers, grouping and density.
6. **Treat Android measurements as design references.** Material specifies sizes in dp. Measure the web result in CSS pixels and check the component contract before claiming a dp value matches.

## Workflow for a new layout

1. List the regions the task needs with the [scaffold reference](../expressivecss-design/references/scaffold.md): bars, rails, panes and safety regions. Leave out regions the task does not need.
2. Pick the canonical layout (feed, list-detail or supporting pane) with the [canonical layouts reference](./references/canonical-layouts.md), then copy the closest template or example.
3. Write the compact layout first with meaningful source order. Then add changes only at the breakpoints where the content needs more or less room.
4. For each breakpoint after the first, decide what to reveal, divide, resize, reposition or swap, and choose panes, navigation and transient surfaces with the [breakpoints reference](./references/breakpoints.md).
5. Check the page in RTL and at every breakpoint boundary it uses, such as 599px and 600px.

## Breakpoints

Material renamed window size classes to breakpoints, and responsive layout to adaptive design. Some ExpressiveCSS guides and Sass comments still say "window class"; both names mean the ranges below.

| Breakpoint | Window width | Grid prefix | Sass mixin |
| --- | --- | --- | --- |
| Compact | below 600px | `.s1` to `.s12` (default) | none; unwrapped styles |
| Medium | 600px to 839px | `.m1` to `.m12` | `bp-up("medium")` |
| Expanded | 840px to 1199px | `.l1` to `.l12` | `bp-up("expanded")` |
| Large | 1200px to 1599px | `.xl1` to `.xl12` | `bp-up("large")` |
| Extra-large | 1600px and wider | `.xxl1` to `.xxl12` | `bp-up("extra-large")` |

The grid prefixes do not match the breakpoint names: `.l` is Expanded and `.xl` is Large. Reason from the available window or container width, never from device names such as phone or tablet. A browser window can be narrow on a large monitor, and multi-window mode shares one screen between apps. Panes inside a narrow container should follow that container, which the pane pattern supports through container queries.

Read the [breakpoints reference](./references/breakpoints.md) for what changes between breakpoints and the [grid reference](../expressivecss-usage/references/grid.md) for spans, offsets and gaps.

## Start from a canonical layout

Read the [canonical layouts reference](./references/canonical-layouts.md) to choose between feed, list-detail and supporting pane and for their behavior at each breakpoint. These files are the starting points:

| Starting point | Use it for |
| --- | --- |
| [Compact template](../assets/templates/layout-compact.html) | A single-pane app with a navigation bar |
| [Navigation rail template](../assets/templates/layout-rail.html) | A single pane beside a collapsed rail |
| [Expanded rail template](../assets/templates/layout-expanded.html) | A single pane beside an expanded rail |
| [List-detail template](../assets/templates/layout-list-detail.html) and [list-detail example](../assets/examples/list-detail.html) | Selecting an item from a list to see its detail |
| [Panes guide](../components/panes.md) | List-detail, supporting pane and equal panes |
| [Dashboard guide](../expressivecss-dashboard/SKILL.md) | Dashboards and reporting pages; start from its reference implementation |

## Bidirectionality

More than 2 billion people read right-to-left languages such as Arabic, Hebrew and Farsi. Set `dir="rtl"` and `lang` on `<html>`, or on the element that holds RTL content. Components that have a side, such as the navigation rail and side sheet, mirror with `:dir(rtl)`. In your own CSS, use logical properties (`margin-inline-start`, `inset-inline-end`, `text-align: start`) so the layout mirrors without a second stylesheet. Keep the source order identical in both directions; only the visual order flips. Media, clocks, phone numbers and code stay left to right.

## Layout terms in ExpressiveCSS

| Term | Meaning | Where it lives in ExpressiveCSS |
| --- | --- | --- |
| Adaptive design | Techniques that let an interface respond to user preferences, device type, state and breakpoints | Grid prefixes, pane container queries, and media features such as `prefers-reduced-motion` |
| Bars | Frame the page for navigation; usually the app bar and the navigation bar | [App bar](../components/app-bar.md), [navigation bar](../components/navigation-bar.md), docked [toolbar](../components/toolbars.md) |
| Bidirectionality | Supporting text and content that run right to left as well as left to right | `dir` attribute, `:dir(rtl)` in components, logical properties |
| Breakpoints | Opinionated window sizes where the layout changes (previously window size classes) | 600, 840, 1200 and 1600px; the table above |
| Column | One or more vertical blocks of content within a pane | Spans inside a `.row`; start a new `.row` inside a pane for its own columns |
| Drag handle | The component that resizes panes | [Drag handle](../components/drag-handle.md) is styling only. It adds no resize behavior, so any real resizing needs keyboard and non-drag controls |
| Fold | A flexible screen area or hinge between two displays on a foldable | No framework API. Keep content and controls off the hinge; browser support for viewport-segment queries is limited, so check it first |
| Gap | Space between elements inside a container | `.g-0` to `.g-5` on a `.row`; `.g-3` is the default |
| Margin | Space between the screen edge and the content | Panes use 16px on compact and 24px from medium. `.container` sets a percentage width instead of a fixed margin |
| Multi-window mode | Several apps sharing one screen | Nothing to add; breakpoints follow the browser window, not the screen |
| Pane | A container for components inside one app; fixed, flexible, floating or semi-permanent | `.panes` with `.list-pane`, `.detail-pane` and `.supporting-pane` children; [side sheet](../components/side-sheet.md) or [dialog](../components/dialogs.md) for floating content |
| Rails | Perimeter space around panes for navigation rails, toolbars and pane controls | A leading region can hold a [navigation rail](../components/navigation-rail.md); others hold toolbars or a [FAB](../components/fab.md). A rail region is not the navigation rail component |
| Right-to-left (RTL) language | A language written and read right to left | See Bidirectionality above |
| Rulers | Global alignment lines that organize the building blocks of a layout | No ruler class; the 12 grid tracks and pane margins supply the lines. See the [grids and spacing reference](./references/grids-and-spacing.md#rulers-and-alignment) |
| Safety region | Space reserved for system UI such as the status bar or gesture bar | `env(safe-area-inset-*)`; the navigation bar, toolbar and snackbar already pad for the bottom inset |
| Scaffold | The standard structure for assembling a screen's main parts | [Scaffold reference](../expressivecss-design/references/scaffold.md) |
| Spacer | The space between two panes on a foldable | Pane layouts use a 24px spacer from 840px |

## Related guides

Read [Usage](../expressivecss-usage/SKILL.md) and [Accessibility](../expressivecss-accessibility/SKILL.md) before writing markup, and the [Design guide](../expressivecss-design/SKILL.md) for a full design or review workflow. Material's [layout overview](https://m3.material.io/foundations/layout/layout-overview/overview) resolves disagreements on design intent; the installed ExpressiveCSS version decides what the framework ships.
