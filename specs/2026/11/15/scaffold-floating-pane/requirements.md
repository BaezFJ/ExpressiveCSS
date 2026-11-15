# Scaffold floating pane: requirements

- Feature: from 600px up the scaffold's background is `surface-container` and the pane area sits on a rounded `surface` with a gap around it
- Date: 2026-11-15
- Roadmap phase: [Phase 95: float the pane on a surface](../../../../roadmap.md#phase-95-float-the-pane-on-a-surface), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It depends on [phase 88](../scaffold-default-regions/) and falls under "Components and behaviors" in the [mission](../../../../mission.md).
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `ef84350fa`, after phase 94.

## Current behavior and need

The scaffold has no background of its own; the page's `surface` shows through every region. The rail and status bar paint `surface-container`, the app bar paints `surface` (its `--md-comp-top-app-bar-container-color`), and `main` is transparent. Gmail and M3's expressive app layouts set the pane apart as a rounded `surface` floating on a `surface-container` shell, with the bar and rail on the shell color.

`.panes.separated` and `.panes.floating` (`_panes.scss`) already float each pane as a `surface-container-low` card with a 24px gap and padding.

## Scope

From 600px up, in a `.scaffold`:

- The scaffold paints `surface-container`. A top app bar in its bar region uses `surface-container` as its rest color, so it blends with the shell, and `surface-container-high` as its scrolled color, so its fill on pane scroll stays visible. The token override is `.scaffold > header:has(> nav, > .bar)`, which out-ranks the bar's own `header:has(…)` (0,1,2). A `.scaffold-bar` paints nothing, so it shows the shell color.
- The pane area (`main` or `.scaffold-pane`) paints `surface`, has `--md-sys-shape-corner-large` (16px) corners, and a 16px gap below it, a 16px gap after it unless a shown floating toolbar (`.toolbar.vertical` or `.toolbar-group.vertical`, not `.fixed`) gives it its own 24px margin, and a 16px gap before it when no rail is shown. A `.scaffold-trailing` gets the 16px gap. `[hidden]` regions count as absent.
- A pane area that holds a separated or floating panes layout (`.panes` or `.pane-layout` with `.separated` or `.floating`) gets no surface, radius or gaps; its panes are already floating cards with their own padding.
- A pane area that is itself a panes container (`main.panes` and its aliases) keeps the panes layout's own margins, width and color; put a panes layout inside `main` to get the floating surface. The docs say so.
- In forced colors, the pane area draws a 1px `CanvasText` border, since the system colors flatten both backgrounds.

Below 600px nothing changes: the pane stays flat against the page.

## Exclusions

- A modifier to turn the floating surface off. The scaffold hasn't shipped in a release, so making the surface its default changes no markup any page already has; a modifier can come later if someone needs a flat wide shell.
- Changing the rail, status bar or toolbar colors; they already paint `surface-container` or their own floating colors.
- Panes layouts other than `.separated` and `.floating`; coplanar panes inside `main` share the pane's `surface`.
- Insetting content from the rounded corners. `overflow: auto` clips full-bleed content and classic scrollbars at the 16px corners; the docs tell authors to pad the pane's content, as the demo does.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The floating surface is the default from 600px up | Decided under delegation | The roadmap asks whether default or modifier, given the product rule on changing existing markup. The rule protects markup pages already have; `.scaffold` is new in this unreleased milestone, so no page has it yet. The roadmap describes the surface as the scaffold's look from 600px up. |
| A pane area holding or being `.panes.separated` or `.panes.floating` drops its own surface | Decided under delegation | The roadmap asks how they combine. Separated panes are already rounded floating cards with their own gap; another surface around them would nest cards in a card. |
| The app bar takes `surface-container` through its own token | Decided under delegation | A `surface` bar would read as a strip above the shell. Setting `--md-comp-top-app-bar-container-color` on the bar region keeps the bar component unchanged and leaves a color utility on the header winning, as it does today. |
| The gaps are 16px, fixed, and the side next to a floating toolbar uses the toolbar's own 24px margin | Decided under delegation | 16px matches the horizontal floating toolbar's external space and Gmail's spacing, and keeps the pane area as large as it can be on medium windows. The vertical toolbar's 24px margin (from phase 88) stays, so that one side is wider; doubling it would waste width. A token can follow if a page needs another value. |
| The app bar's scrolled color becomes `surface-container-high` in a scaffold from 600px up | Decided under delegation | With a `surface-container` rest color, the existing scrolled `surface-container` would make the fill invisible, contradicting the docs' promise that the bar fills when the pane scrolls. One step higher keeps a visible fill on the same ramp. |

## Requirements

- **R1** At 1024 × 800 the scaffold's background is `surface-container`, the pane area's is `surface`, and its corner radius is 16px. A top app bar's background at rest is `surface-container`; where scroll timelines run, after the pane scrolls it is `surface-container-high`.
- **R2** At 1024 × 800 with a rail and no toolbar, the pane's top meets the bar's bottom, its leading edge meets the rail's trailing edge, its bottom is 784 and its trailing edge is 1008. With a trailing toolbar, the gap between the pane and the toolbar is the toolbar's 24px margin. With no rail, the pane's leading edge is 16. With a status bar, the pane's bottom is 16px above it. With a `.scaffold-trailing`, the gap before it is 16px. At 700 × 800 the pane's leading edge is the held 96px rail column.
- **R3** At 390 × 800 the scaffold and the pane area have no background of their own and the pane's radius is 0.
- **R4** A pane area holding a `.panes.separated` or `.pane-layout.floating` layout has a transparent background, no radius and no gaps, and its panes keep their `surface-container-low` cards. A `main.panes.list-detail` keeps the panes layout's 24px margins and its own color.
- **R5** Under forced colors (Chromium emulation) the pane area at 1024px has a 1px solid border.
- **R6** The earlier phases' scaffold tests pass, adjusted only where they measured the pane's edges, which the gap now moves.
- **R7** These records change (the docs, `llm.md` and changelog lines about the bar's fill name `surface-container-high`; the docs note the corner padding and the panes-inside-main advice): the scaffold docs page and `llm.md` section, the design reference `scaffold.md`, the decision record, `CHANGELOG.md`, the CSS budget, and `npm run build:skill` last.

## Risks considered

- Two at once, bad input, refusal: CSS only.
- Other readers: the app bar's scrolled fill (now `surface-container-high`, see the decisions). The pane's `overflow: auto` clips its content to the rounded corners. The medium overlay rail and its scrim cover the pane as before. Earlier tests that measured the pane's trailing or bottom edge at the window edge move by 16px (R6).
- UI states: forced colors (R5), dark theme and `[vibrant]` (both remap the system roles the scaffold reads), RTL (logical margins), print (backgrounds rarely print; the pane prints in flow), reduced motion (no motion added). The demo pane's focus ring runs along the bar and rail edges where there is no gap, which is acceptable. The docs demo box's `outline-variant` border now frames a `surface-container` shell.
- `specs/checklist.md` does not exist in this project.
