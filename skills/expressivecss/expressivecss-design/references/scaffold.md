# Material 3 Expressive scaffold

Read this when composing or reviewing a complete page, app shell, or adaptive pane layout. Use the scaffold to place navigation, content, and actions before styling individual components. Include only the regions the task needs.

Google's [overview](https://m3.material.io/foundations/layout/scaffold/overview), [bars](https://m3.material.io/foundations/layout/scaffold/bars), [rails](https://m3.material.io/foundations/layout/scaffold/rails), and [panes](https://m3.material.io/foundations/layout/scaffold/panes) define the design intent below, reviewed 2026-09-13. ExpressiveCSS's target-version guides define available markup and behavior. Scaffold regions do not introduce a new framework component, class, or initialization API.

## Identify the regions

| Region | Placement and job | ExpressiveCSS mapping |
| --- | --- | --- |
| Bars | Frame the top or bottom of the window, or span an individual pane. Hold page identity and essential actions, or primary destinations. | Select an [app bar](../../components/app-bar.md) or [navigation bar](../../components/navigation-bar.md) according to the job. For new bottom-edge actions, prefer a docked [toolbar](../../components/toolbars.md), placed in the adjacent rail region. The [bottom app bar](../../components/bottom-app-bar.md) is retained legacy behavior, deprecated for M3 Expressive. |
| Rails | Occupy perimeter space around panes, adjacent to bars, or float above content. Top and bottom regions can hold contextual controls; wider layouts can also use leading and trailing regions. | A leading region can hold a [navigation rail](../../components/navigation-rail.md). Other regions can hold [toolbars](../../components/toolbars.md) or a [FAB](../../components/fab.md). A rail region is not itself a navigation rail component. |
| Panes | Hold primary and supporting content. Their size, visibility, and relationship change with the available space and task. | Use the existing [pane layouts](../../components/panes.md) for list-detail, supporting, or equal content. Use [grid and containers](../../expressivecss-usage/references/grid.md) for ordinary single-pane content and internal columns. |
| Safety regions | Reserve space for system UI and display obstructions. Keep primary content and controls outside them. | Respect browser-provided safe-area insets where applicable. Check existing component handling before adding application spacing; do not draw operating-system chrome. |

Navigation changes destinations; contextual controls act on the current content. Keep that distinction when moving controls between regions. A region's position does not determine its HTML landmark or ARIA role. Follow the selected component's semantics, including named navigation and command toolbars without a navigation landmark.

## Choose the pane relationship

- Single pane: one flexible content area, suitable at any width and the usual compact starting point. Do not add empty companion panes to fill a wide window.
- Split pane: two flexible panes with the spacer visually centered in the window. Google counts a leading navigation region together with the first pane when balancing the halves. Equal widths inside the remaining content area do not necessarily produce that result.
- Fixed and flexible: one pane keeps a useful width while another takes the remaining space. Choose their order from the content relationship, such as a list beside its detail or primary content beside supporting information.
- Three panes: use only when the task needs a third region and enough space remains, typically at extra-large widths. Google limits the layout to three panes. A supporting sheet can supply the third region.

Start with the shipped pane pattern that matches the task. Its viewport and container queries govern actual collapse behavior; available pane space can be narrower than the window because navigation occupies part of it. Use the grid for internal content before adding application CSS. Do not claim that a framework equal-pane variant implements Google's centered split-pane geometry without checking it.

## Adapt without losing context

Choose an adaptation for each supporting pane and state how people reach its content at the next narrower size:

- Show and hide: display related panes together when space permits and one at a time when it does not. Preserve selection and in-progress input. Provide a reachable open/back path and appropriate focus return. ExpressiveCSS panes are CSS-only; the application owns the active compact pane and transitions between content states.
- Float or dock: move a temporary task above content or anchor it to an edge. Select the documented [dialog](../../components/dialogs.md), [side sheet](../../components/side-sheet.md), or [bottom sheet](../../components/bottom-sheet.md) when its behavior fits. Persistent utilities generally work better beside content. Decide modality from the task, then follow that component's focus, dismissal, and background-interaction contract.
- Reflow: move supporting content below primary content when both remain useful together. Preserve meaningful reading and keyboard order. Confirm that the selected pane pattern supports the intended stacking; its default collapse behavior is not automatically reflow.

Relocate navigation and contextual actions deliberately as regions change. Keep one usable set of primary destinations at each layout, and prevent hidden controls from remaining focusable. Retain the selected component guides' runtime ownership when switching layouts.

## Define scrolling and optional resizing

Prefer document scrolling unless independently scrolling panes serve the task. If panes scroll independently, identify each scroll container and whether its bar and actions remain visible. Fixed or sticky bars, floating controls, and feedback must not obscure content or keyboard focus. Check long content, zoom, virtual-keyboard space where relevant, and safe-area insets without double-counting spacing.

Add pane resizing only when requested or justified by the workflow. Google distinguishes persistent resizing, which retains a person's choice across sessions and breakpoint changes, from temporary resizing, which resets when the pane or product reopens. Preserve a valid content width when space changes.

A resizable design needs keyboard and non-drag controls to resize, collapse, or restore the pane, with appropriate focus and accessible state. Do not infer a generic draggable pane, resize handle, or persistence API from the CSS-only pane pattern. Verify target-version support before implementation; application-owned behavior needs its own accessible controls and checks.

## Review the composition

Use the existing design and accessibility review workflow. For the scaffold, check that:

- Every region has a task-related purpose, with navigation separate from contextual actions.
- There is one document main landmark; individual panes use suitable regions inside it.
- The primary task remains reachable when panes hide, stack, float, or dock, including inside a narrow container on a wide screen.
- Reading order, focus return, selected content, and unsaved input survive layout changes.
- Bars, rails, overlays, and scrolling do not hide content or controls at reached breakpoints, with long content, zoom, and relevant RTL layouts.

For a compact settings page, a single content pane with page identity and a save action may be enough; add global navigation only if the product needs it. For a wider list-detail page, separate global destinations from list actions, keep list and detail inside one main region, and define the compact selection/back path. These are composition checks, not fixed templates or evidence that an implementation passed browser review.
