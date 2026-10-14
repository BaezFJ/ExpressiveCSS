# Material 3 Expressive scaffold

Read this when composing or reviewing a complete page, app shell, or adaptive pane layout. Use the scaffold to place navigation, content, and actions before styling individual components. Include only the regions the task needs.

Google's [overview](https://m3.material.io/foundations/layout/scaffold/overview), [bars](https://m3.material.io/foundations/layout/scaffold/bars), [rails](https://m3.material.io/foundations/layout/scaffold/rails), and [panes](https://m3.material.io/foundations/layout/scaffold/panes) define the design intent below, reviewed 2026-09-13 and again 2026-10-13. ExpressiveCSS's target-version guides define available markup and behavior. Scaffold regions do not introduce a new framework component, class, or initialization API.

## Identify the regions

| Region | Placement and job | ExpressiveCSS mapping |
| --- | --- | --- |
| Bars | Frame the top or bottom of the window, or span an individual pane. The top bar holds the app bar: a title and one or two essential actions such as search or back. The bottom bar holds the navigation bar: three to five primary views on compact and medium windows, sitting just above the bottom safety region. | Select an [app bar](../../components/app-bar.md), [navigation bar](../../components/navigation-bar.md), or docked [toolbar](../../components/toolbars.md) according to the job. |
| Rails | Occupy perimeter space around panes, next to bars, or float above content. On compact windows the top and bottom rail regions hold screen-level controls such as a floating toolbar, a chat input, or a FAB. Wider windows add leading and trailing regions: the leading one usually holds the navigation rail, and the trailing one holds controls that act on a pane's content. | A leading region can hold a collapsed or expanded [navigation rail](../../components/navigation-rail.md). Other regions can hold [toolbars](../../components/toolbars.md), including a vertical toolbar in the trailing region, or a [FAB](../../components/fab.md). A rail region is not itself a navigation rail component. |
| Panes | Hold primary and supporting content. Their size, visibility, and relationship change with the available space and task. | Use the existing [pane layouts](../../components/panes.md) for list-detail, supporting, or equal content. Use [grid and containers](../../expressivecss-usage/references/grid.md) for ordinary single-pane content and internal columns. |
| Safety regions | Reserve space for system UI and display obstructions. Keep primary content and controls outside them. | Respect browser-provided safe-area insets where applicable. Check existing component handling before adding application spacing; do not draw operating-system chrome. |

Navigation changes destinations; contextual controls act on the current content. Keep that distinction when moving controls between regions. A region's position does not determine its HTML landmark or ARIA role. Follow the selected component's semantics, including named navigation and command toolbars without a navigation landmark.

## Choose the pane relationship

Every layout has one to three visible panes, and at least one of them is flexible. A fixed pane keeps its width; a flexible pane grows and shrinks with the available space. A pane is either permanent or temporary: a temporary pane, such as a side sheet, opens and closes when needed and resizes the others while open.

| Breakpoint | Recommended panes | Other pane counts |
| --- | --- | --- |
| Compact | 1 | None |
| Medium | 1 | 2 |
| Expanded | 2 | 1 |
| Large | 2 | 1 |
| Extra-large | 2 | 1 or 3 |

- Single pane: one flexible content area, suitable at any width and recommended for compact and medium. Do not add empty companion panes to fill a wide window.
- Split pane: two flexible panes with the spacer visually centered in the window, which suits foldables and layouts whose width changes often. With a navigation bar or no navigation, each pane is 50% of the window. With a navigation rail, the rail and the first pane together take 50%, so the rail shrinks only the first pane. Equal widths inside the remaining content area do not produce that result.
- Fixed and flexible: one pane keeps a useful width while another takes the remaining space. It is common at expanded, large and extra-large. Choose the order from the content relationship, such as a list beside its detail or primary content beside supporting information. The fixed pane is often temporary, such as a side sheet, or a light list.
- Three panes: extra-large only, and only when the task needs a third region. A standard [side sheet](../../components/side-sheet.md) can be the third pane; while it is open, the expanded navigation rail can stay, collapse, or hide. Never use more than three panes. Google recommends 412dp for fixed panes at this size, while side sheets default to a 400dp maximum.

Start with the shipped pane pattern that matches the task. Its viewport and container queries govern actual collapse behavior; available pane space can be narrower than the window because navigation occupies part of it. Use the grid for internal content before adding application CSS. Do not claim that a framework equal-pane variant implements Google's centered split-pane geometry without checking it. `.panes.three-pane` shows three columns from 1200px, which is earlier than Google's extra-large breakpoint at 1600px.

## Adapt without losing context

Choose an adaptation for each supporting pane and state how people reach its content at the next narrower size:

- Show and hide: display related panes together when space permits and one at a time when it does not. Preserve selection and in-progress input. Provide a reachable open/back path and appropriate focus return. ExpressiveCSS panes are CSS-only; the application owns the active compact pane and transitions between content states.
- Float or dock: move a temporary task above content or anchor it to an edge. Select the documented [dialog](../../components/dialogs.md), [side sheet](../../components/side-sheet.md), or [bottom sheet](../../components/bottom-sheet.md) when its behavior fits. Decide modality from the task, then follow that component's focus, dismissal, and background-interaction contract.

Google names three ways to show more than one pane. Co-planar panes sit side by side; keep persistent utilities, such as a tool panel, co-planar with the primary content so they stay reachable. A floating pane sits above larger panes; temporary tasks such as a dialog float at every breakpoint. A docked pane is pinned to a window edge, such as a bottom sheet of extra actions.
- Reflow: move supporting content below primary content when both remain useful together. Preserve meaningful reading and keyboard order. Confirm that the selected pane pattern supports the intended stacking; its default collapse behavior is not automatically reflow.

Relocate navigation and contextual actions deliberately as regions change. Keep one usable set of primary destinations at each layout, and prevent hidden controls from remaining focusable. Retain the selected component guides' runtime ownership when switching layouts.

## Define scrolling and optional resizing

Prefer document scrolling unless independently scrolling panes serve the task. If panes scroll independently, identify each scroll container and whether its bar and actions remain visible. Fixed or sticky bars, floating controls, and feedback must not obscure content or keyboard focus. Check long content, zoom, virtual-keyboard space where relevant, and safe-area insets without double-counting spacing.

Add pane resizing only when requested or justified by the workflow. In a split pane both panes can resize freely or snap to set widths. In a fixed-and-flexible layout the handle can collapse and restore the fixed pane, switching between one and two panes. Selecting the handle (Google mentions tap, double tap, or long press) should also toggle between layout sizes. Google distinguishes persistent resizing, which retains a person's choice across sessions and breakpoint changes, from temporary resizing, which resets when the pane or product reopens, and recommends persistent resizing for most resizable layouts. Preserve a valid content width when space changes.

A resizable design needs keyboard and non-drag controls to resize, collapse, or restore the pane, with appropriate focus and accessible state. Do not infer a generic draggable pane, resize handle, or persistence API from the CSS-only pane pattern. Verify target-version support before implementation; application-owned behavior needs its own accessible controls and checks.

## Review the composition

Use the existing design and accessibility review workflow. For the scaffold, check that:

- Every region has a task-related purpose, with navigation separate from contextual actions.
- There is one document main landmark; individual panes use suitable regions inside it.
- The primary task remains reachable when panes hide, stack, float, or dock, including inside a narrow container on a wide screen.
- Reading order, focus return, selected content, and unsaved input survive layout changes.
- Bars, rails, overlays, and scrolling do not hide content or controls at reached breakpoints, with long content, zoom, and relevant RTL layouts.

For a compact settings page, a single content pane with page identity and a save action may be enough; add global navigation only if the product needs it. For a wider list-detail page, separate global destinations from list actions, keep list and detail inside one main region, and define the compact selection/back path. These are composition checks, not fixed templates or evidence that an implementation passed browser review.
