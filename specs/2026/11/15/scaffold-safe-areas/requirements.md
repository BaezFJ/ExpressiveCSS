# Scaffold safe areas: requirements

- Feature: the scaffold keeps its regions clear of `env(safe-area-inset-*)` without doubling insets components already apply
- Date: 2026-11-15
- Roadmap phase: [Phase 97: keep regions inside safe areas](../../../../roadmap.md#phase-97-keep-regions-inside-safe-areas), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It depends on [phase 88](../scaffold-default-regions/) and [phase 92](../scaffold-compact-scroll/), and falls under "Components and behaviors" in the [mission](../../../../mission.md).
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `dfc7648ad`, after phase 96.

## Current behavior and need

With `viewport-fit=cover` a phone draws the page under its notch and home indicator, and `env(safe-area-inset-*)` reports those edges. Components that pad already: `nav.navigation-bar` (`padding-bottom: max(6px, inset)`), `.status-bar` (`padding-bottom: inset`), `.toolbar.docked.fixed` (`8px + inset`) and the snackbar. The scaffold adds the bottom inset to its compact floating toolbar's offset and its scroll padding (phases 92 and 93). Nothing keeps the app bar, the rail, the pane, custom regions or the rail overlay clear of the other edges.

## Scope

In a `.scaffold`:

- At every width, the scaffold pads its left and right by the side insets (physical `padding-left`/`-right`), so every region, custom ones included, clears a landscape notch.
- From 600px up, the scaffold also pads its top by the top inset and its bottom by the bottom inset, unless a shown `.status-bar` pads the bottom itself. Every region that meets those edges (bar, tall rail, sheet column, a pane without a bar) clears them. The strips show the shell's `surface-container`, which is the bar's and status bar's rest color.
- Below 600px, where the document scrolls and the app bar sticks to the window's top, the bar region pads its own top by the top inset inside its background. Without a shown bar the scaffold pads its top instead; without a shown navigation bar it pads its bottom. The navigation bar and the floating toolbar keep their own bottom insets.
- The compact scroll padding's top adds the top inset.
- An expanded rail overlay (fixed to the window) adds the top inset to its top padding, the bottom inset to its bottom padding, and the side inset on its docked side to that side's padding, choosing the side by `:dir()`.

## Exclusions

- `viewport-fit=cover` itself. The page's meta tag opts in; without it the insets are zero and nothing changes. The docs page tells authors to add it; the docs site's shared layout doesn't, since that would change every docs page.
- Overlays the scaffold doesn't place: an overlay side sheet (modal, `.start`, or below 1200px) and a `.toolbar.vertical.fixed` keep their own positioning, which doesn't read the insets today.
- Insets inside the pane's own content.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Tests supply insets by rewriting every `env(safe-area-inset-*)` in the stylesheet, with or without a fallback, to fixed lengths, and assert none is left | Decided under delegation | The roadmap asks how. Desktop browsers report zero insets, and only Chromium has a DevTools override. Rewriting the stylesheet runs the same CSS in all three engines with known values. |
| The scaffold pads itself rather than each region | Decided under delegation, revised after spec review | One padding covers every region that meets an edge, custom regions and the sheet column included, with no hard-coded component padding. Below 600px the bar pads its own top instead, because padding above a sticky bar scrolls away with the document. |
| Physical left and right insets, with the rail overlay choosing its side by `:dir()` | Decided under delegation | The insets are physical; mapping them to logical sides would put a left notch's inset on the wrong edge under `dir="rtl"`. |

## Requirements

Insets in the checks are top 40, right 50, bottom 20 and left 30, so a left/right mix-up shows.

- **R1** At 1280 × 800 with a bar, rail, pane and toolbar: the bar's top is 40, the rail's left edge is 30, the toolbar's right edge is 1280 − 50 − 24, the rail's bottom is 780, and the floating pane's bottom is 780 − 16.
- **R2** In the tall-rail layout the rail's top is 40; with no bar, the floating pane's top is 40 + 16; with a `.scaffold-rail` instead of a rail, its left edge is 30.
- **R3** With a status bar at 1280: the status bar's bottom padding is 20 (once), its bottom is 800, and the rail's bottom meets its top.
- **R4** At 390 × 800 in the compact layout: the app bar's first button is at least 40px from the top after the document scrolls 1000px, the navigation bar's bottom padding is 20 (once), and the floating toolbar sits 16px above the navigation bar. Without a navigation bar, the scaffold's bottom padding is 20. The document's scroll padding top is 4rem + 40px.
- **R5** An expanded rail overlay at 390 has a top padding of 20 + 40 and a bottom padding of 16 + 20, and its left padding is 16 + 30; under `dir="rtl"` at 700 its right padding is 16 + 50 and its left padding is 16.
- **R6** With all insets at 0 (the browser default), every earlier scaffold test passes unchanged.
- **R7** These records change: the scaffold docs page (`viewport-fit=cover`) and `llm.md` section, the design reference `scaffold.md`, the decision record, `CHANGELOG.md`, the CSS budget, and `npm run build:skill` last.

## Risks considered

- Two at once, bad input, refusal: CSS only.
- Other readers: the navigation bar, status bar, docked toolbar and snackbar keep their own insets (R3, R4); the scaffold's compact scroll padding and floating toolbar already add the bottom inset; the 100dvh shell keeps its height with block padding because `box-sizing` is `border-box`; the rail overlay's `::after` surface inherits the rail's border-box width, so growing padding doesn't widen it; the held rail column at 600–839px keeps its width.
- UI states: RTL (R5), compact and wide layouts (R1, R4), zero insets (R6), print (insets are zero in print).
- `specs/checklist.md` does not exist in this project.
