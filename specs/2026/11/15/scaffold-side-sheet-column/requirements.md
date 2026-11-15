# Scaffold side sheet column: requirements

- Feature: a standard `.side-sheet` child of a scaffold opens as a column between the pane and the trailing toolbar and narrows the pane while open
- Date: 2026-11-15
- Roadmap phase: [Phase 96: open a side sheet as a third column](../../../../roadmap.md#phase-96-open-a-side-sheet-as-a-third-column), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It depends on [phase 88](../scaffold-default-regions/) and falls under "Components and behaviors" in the [mission](../../../../mission.md).
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `c940ffb9b`, after phase 95.

## Current behavior and need

A `dialog.side-sheet` (`_side-sheet.scss`) is `position: fixed` at the trailing edge, full height, `min(400px, 85%)` wide plus a 24px bleed that its spring overshoot runs into. `show()` opens the standard variant: no scrim, a 1px `outline-variant` rule on its inner edge, the page still interactive. `showModal()` opens the modal variant with a scrim. In a scaffold today a standard sheet covers the pane's trailing edge and the trailing toolbar, and the pane doesn't make room. M3 treats a standard side sheet as a temporary third pane that resizes the others while open.

## Scope

From 1200px up, in a `.scaffold`:

- A direct-child `dialog.side-sheet` that is open, not modal and not `[hidden]` takes a `sheet` column between the pane and the trailing region, in both the default and `.tall-rail` layouts. It is static in the grid with `z-index: auto`, exactly `--md-comp-side-sheet-container-width` (400px) wide with no bleed padding, no entry slide and no inner-edge divider (the shell's gap separates it), and stretches from the bar (or, in the tall-rail layout, the top) down to the status row or the bottom. Without a trailing toolbar it meets the window's trailing edge, as a docked sheet does.
- The pane narrows by the sheet's width while it is open and gets it back when the sheet closes.
- The trailing toolbar stays at the window's trailing edge.
- The floating pane keeps a 16px gap before the sheet, even when a toolbar sets its trailing gap to the toolbar's margin. A pane area that doesn't float (a panes container, or one holding separated panes, from phase 95) gets no scaffold gap; a panes container keeps its own 24px margin.
- The docs say to place the sheet between `main` and the toolbar in the markup, so Tab order matches the columns, and that a sheet that isn't a direct child stays an overlay.

## Exclusions

- Below 1200px, and for a modal sheet at any width: the sheet keeps its existing fixed overlay. Print pages are narrower than 1200px, so an open sheet prints as its overlay.
- A `.side-sheet.start` (leading dock): it keeps its fixed overlay.
- Animating the column. Grid tracks sized `auto` don't interpolate, and the sheet's entry slide would paint over the toolbar on its way in, so in the column the sheet appears at once and the pane narrows at once; closing removes it at once, as a closed dialog is `display: none` today. Its drag-to-dismiss still translates it, and a toolbar later in the markup paints over it, since the sheet's `z-index` is `auto` there.
- A minimum pane width. From 1200px up a collapsed rail, the 400px sheet and a toolbar leave the pane at least about 560px; an expanded rail leaves about 380px.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Below 1200px the standard sheet keeps its fixed overlay at the trailing edge | Decided under delegation, revised after spec review | The roadmap asks what happens below 840px. At 840px a 400px column beside an expanded rail and a toolbar would leave the pane almost no width, and the design reference keeps a third pane for wide windows. 1200px is the framework's large breakpoint and the roadmap's 1440px check sits above it. Below that, the overlay is what the sheet already does. |
| The column width doesn't follow the open and close motion, and the sheet doesn't slide in | Decided under delegation | The roadmap asks. An `auto` grid track can't interpolate, and the sheet's `@starting-style` slide from the window edge would cross the toolbar. Appearing in place keeps the toolbar clear. |
| The sheet column sits between the pane and the trailing region | From the roadmap | "Order pane, sheet, toolbar" in the 2026-11-15 design notes, and the roadmap's phase text. |

## Requirements

- **R1** At 1440 × 800, `show()` on a direct-child standard side sheet places it static in the grid: its leading edge is the pane's trailing edge plus the pane's 16px gap, its trailing edge is the toolbar's leading edge minus the toolbar's 24px margin, its width is 400px, it has no inner-edge border, and it runs from the bar's bottom to the window's bottom. The pane's width shrinks by 416 (the sheet plus the new gap; within 1px), and the toolbar keeps its box. Without a toolbar the sheet's trailing edge is 1440 and the pane shrinks by 400.
- **R2** `close()` gives the pane its earlier box back.
- **R3** With `.tall-rail`, the sheet runs from 0 to the bottom; with a status bar, it ends at the status bar's top.
- **R4** At 1000px a standard sheet opened in a scaffold stays `position: fixed` and the pane keeps its box. A modal sheet at 1440px stays fixed with its scrim, a `.start` sheet stays fixed, and an open sheet with `hidden` is not displayed. Resizing from 1440 to 1000 and back with the sheet open switches it between the column and the overlay.
- **R5** Under `dir="rtl"` the sheet sits between the pane and the toolbar on the mirrored side.
- **R6** These records change: the scaffold docs page and `llm.md` section, the side sheet docs page and `llm.md` section, the design reference `scaffold.md`, the decision record, `CHANGELOG.md`, the CSS budget, and `npm run build:skill` last.

## Risks considered

- Two at once: two open standard sheets would share one column and overlap; the docs say one, and phase 88's region rule covers the other regions. Bad input and refusal: CSS only.
- Other readers: the side sheet's drag-to-dismiss sets `--md-comp-side-sheet-shift`, which still translates the sheet inside its column; the sheet's `@starting-style` entry slide runs from the trailing edge into the column and the scaffold's `overflow: clip` hides the part past the window; the sheet's divider (`border-inline-start`) stays; the floating pane's gap logic (phase 95) gains the sheet case; the medium held column (phase 91) is below 840px, where the sheet is still an overlay; the sheet's glass blur works the same on a static element; Escape doesn't close a non-modal dialog natively, as today.
- UI states: RTL (R5), reduced motion (the sheet's own rule turns its transition off), forced colors (the sheet keeps its outline), print (closed dialogs don't print; an open one prints as its overlay, see the exclusions).
- `specs/checklist.md` does not exist in this project.
