# Parts of a layout and adaptive design

Read this when deciding what a layout is made of, or how its panes and components should change for different people, devices and window sizes. Material's [parts of layout](https://m3.material.io/foundations/layout/layout-overview/parts-of-layout) and [adaptive design](https://m3.material.io/foundations/layout/layout-overview/adaptive-design) pages, reviewed 2026-11-27, set the design intent. Material implements this guidance on Android, and it applies to the web; the selected component guides define what ExpressiveCSS ships.

Contents:

- Parts of a layout
- What adaptive design means
- Adaptive pane strategies
- Adapting components
- Review checklist

## Parts of a layout

Material builds every layout from the same parts, from the outside in. Decide each one before styling components:

| Part | Job | In ExpressiveCSS |
| --- | --- | --- |
| Window | Frames the app. It can share the screen with other apps, and on desktop it can be resized and moved freely. | On the web the browser window or the layout's container is the window; breakpoints follow it, never the screen or device |
| Grid | Groups related information in columns, applies spacing consistently, creates focal points for primary actions, and aligns bars, rails and panes | The 12-track grid and gap classes; [grids and spacing](./grids-and-spacing.md) |
| Bars | Frame the main content, hold the app bar or navigation bar, and can span one pane or several | [Scaffold](../../expressivecss-design/references/scaffold.md) bar regions with the [app bar](../../components/app-bar.md) or [navigation bar](../../components/navigation-bar.md) |
| Rails | Fill the perimeter around panes or float above them, holding the navigation rail, toolbars, chat inputs, FABs and other primary controls | Scaffold rail regions. A compact window's rail region can hold a floating toolbar; a desktop window's leading region holds the [navigation rail](../../components/navigation-rail.md) |
| Panes | Hold all content. A layout has one to three panes of different widths that adapt to the breakpoint and to the language direction | [Panes](../../components/panes.md), or `<main>` as the scaffold's pane region |
| Containment | Shows how panes relate: implicitly, with panes that blend into the background, or explicitly, with distinct color or outlines | See [Containment](#containment) below |
| Drag handles | Resize flexible panes, or collapse and restore a fixed pane to switch between one and two panes | [Drag handle](../../components/drag-handle.md) is styling only; resizing needs the keyboard and non-drag controls in the [scaffold reference](../../expressivecss-design/references/scaffold.md#define-scrolling-and-optional-resizing) |
| Rulers | Global alignment lines that keep margins and placement consistent across every layer | No ruler class; the grid tracks and pane margins supply the lines ([rulers](./grids-and-spacing.md#rulers-and-alignment)) |

Every piece of content belongs in a pane. Content that floats outside any pane, such as a form beside the rail with no container, has no defined margins, width limits or adaptation. A pane is one destination: in a messaging app, the conversation list is one pane and the open thread is another. People navigate to a pane or between panes, and showing several at once makes the product faster to use when the window has room.

In right-to-left languages the navigation rail and other leading regions sit on the right. ExpressiveCSS components that have a side mirror with `:dir(rtl)`; keep your own layout CSS in logical properties, as [bidirectionality](../SKILL.md#bidirectionality) explains.

### Containment

- **Implicit grouping**: panes share the background color and are separated only by space. It suits panes that belong to one task, such as a list and its detail.
- **Explicit grouping**: a pane gets its own container color or an outline. Use it to emphasize the primary pane, or to set apart content that is unrelated to its neighbor.

From 600px up a `.scaffold` draws its pane region as a rounded `surface` on a `surface-container` background, which is explicit grouping of the whole content area against the navigation. Inside it, separate list and detail panes with spacing rather than a second set of containers. Use color roles for any container, never hex values. Keep the space between related panes smaller than the space around them, as the [spacing rules](./grids-and-spacing.md#spacing) describe.

Spatial (XR) layouts give each pane a container color so it stands out from the passthrough or virtual environment. ExpressiveCSS does not target spatial environments.

## What adaptive design means

Responsive design scales one layout to fit any screen. Adaptive design changes the structure, the components and the whole layout so each context gets the experience that suits it, not only a bigger or smaller copy. Material adapts to three things:

| Factor | What changes | On the web |
| --- | --- | --- |
| People | Individual preferences and settings | The `theme` attribute follows `prefers-color-scheme` unless set; `prefers-contrast: more` selects high contrast unless a `contrast` attribute is set; `prefers-reduced-motion`, forced colors, text zoom and the page language and direction. The [theming](../../expressivecss-theming/SKILL.md) and [accessibility](../../expressivecss-accessibility/SKILL.md) guides own these |
| Devices | Phone, foldable, tablet, desktop, watch or XR, and their inputs | Read capabilities, not device names: width and container queries for space, and `hover` and `pointer` media features only to refine presentation |
| Usage | The window is resized, the orientation changes, or the person moves to another device | Re-evaluate at every breakpoint boundary, and preserve selection, scroll position and unsaved input when the layout changes |

Material describes three experience types. Start with mobile and make sure the layout scales up through them:

- **Mobile**: phones, foldables and tablets. An app can run full screen (the default), in split screen beside another app, or in a floating bubble window. On the web, split screen and bubbles simply make the browser window narrower.
- **Desktop**: free-form windows that people resize and arrange, including a tablet with a keyboard and mouse, or a phone connected to a monitor. A desktop layout can drop from three columns to two when its window shrinks to medium. The [desktop reference](./desktop.md) covers desktop layout and input.
- **Spatial**: XR windows in a virtual space, where a navigation rail can float beside the pane as an orbiter. ExpressiveCSS has no spatial layout.

Each experience has a primary input, but design for touch, pointer and physical keyboard in all of them, because people use any device in a desktop setup.

## Adaptive pane strategies

As a window resizes or a person navigates, panes change size, enter and leave the screen, and reorganize. Material names three adaptive strategies, and three ways to show more than one pane:

| Strategy | What happens | Where it is covered |
| --- | --- | --- |
| Show and hide | Related panes appear together when there is room and one at a time when there is not | [Scaffold](../../expressivecss-design/references/scaffold.md#adapt-without-losing-context); [list-detail](./canonical-layouts.md) |
| Levitate | A pane moves above the content to focus one task | [Canonical layouts](./canonical-layouts.md) |
| Reflow | Supporting content moves below or beside the primary content | Scaffold; the [breakpoints reference](./breakpoints.md) "What should be repositioned?" |

| Presentation | Meaning | ExpressiveCSS example |
| --- | --- | --- |
| Co-planar | Panes side by side | `.panes`, `.list-detail` |
| Floating | A pane above other panes or content | [Dialog](../../components/dialogs.md) |
| Docked | A pane above other content with one edge anchored to the window edge | [Bottom sheet](../../components/bottom-sheet.md), [side sheet](../../components/side-sheet.md) |

## Adapting components

Components adapt in appearance, placement and behavior depending on where they sit relative to their container, content and pane edges, how much space they have, and which inputs the person uses. Material uses three strategies:

- **Resizing.** A component responds to its content and its place in the layout. ExpressiveCSS buttons are `inline-flex` and hug their label by default. Let a button span its container only where that helps on a narrow window, such as the action of a compact sheet; on wide panes keep the default width, as the [desktop reference](./desktop.md#components) explains.
- **Showing and hiding.** A component reveals or collapses information to fit the space. A list row can show its supporting text, the `<p>` after the label in a [list](../../components/lists.md), when the pane is wide, and keep only the label on compact. Whatever is hidden on a narrow window must stay reachable another way, such as on the item's detail page.
- **Presentation changes.** Orientation, color, type or shape change, or the component switches configuration. When the window grows, a FAB can become an extended FAB, and a collapsed [navigation rail](../../components/navigation-rail.md) can expand, carrying its own extended FAB. A horizontal [card](../../components/cards.md) puts media beside its text from 600px. These keep the same component; swapping one component for another is a separate decision covered in the [breakpoints reference](./breakpoints.md#5-what-should-be-swapped).

Prefer container queries when a component sits in a pane, because the pane can be narrow on a wide window. Keep source order meaningful through every change: CSS that moves elements does not change reading or focus order, and an element hidden with `display: none` or `hidden` leaves both.

## Review checklist

- The layout names its window, grid, bars, rails and panes, and every piece of content sits inside a pane.
- Pane grouping is deliberate: related panes are grouped implicitly, and explicit containers use color roles and mark real emphasis or separation.
- The page adapts to people (color scheme, contrast, motion, zoom, direction), to devices by capability rather than name, and to usage (resizing, rotation) without losing state.
- Each supporting pane has a named strategy (show and hide, levitate or reflow) and a path to its content at the next narrower size.
- Components resize, show and hide, or change presentation within their own contract, and information hidden on compact stays reachable.
- The layout is checked in LTR and RTL, with navigation on the leading side in both.
