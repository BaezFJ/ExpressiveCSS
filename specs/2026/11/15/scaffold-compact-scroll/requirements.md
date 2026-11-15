# Scaffold compact scrolling: requirements

- Feature: under 600px the scaffold scrolls the document, pins the app bar, shows a bottom navigation bar and hides the rail until it opens as a modal
- Date: 2026-11-15
- Roadmap phase: [Phase 92: scroll the document on compact windows](../../../../roadmap.md#phase-92-scroll-the-document-on-compact-windows), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It depends on [phase 90](../rail-outside-toggle/) and falls under "Components and behaviors" in the [mission](../../../../mission.md).
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `fc08a9e75`, after phase 91.

## Current behavior and need

At every width the scaffold is `100dvh` tall with `overflow: clip`, and only `main` scrolls (phase 88). On a phone that keeps the mobile browser's address bar from collapsing, because the document never scrolls. Below 600px the collapsed rail still takes 96px of a narrow window, and the scaffold has no place for the bottom `nav.navigation-bar` that compact layouts use instead of a rail. The bundled templates show the navigation bar with `.hide-on-med-and-up` and hide the rail with `.hide-on-compact-only`.

`nav.navigation-bar` (`_navigation-bar.scss`) is a full-width row that pads its bottom for the safe area; `.fixed` makes it sticky at the bottom. The rail's compact overlay (`_modal-rail`, `position: fixed`, scrim) already applies to an expanded rail below 600px, and phase 90's app bar button opens it.

## Scope

Below 600px, in a `.scaffold`:

- The scaffold drops its window height and clip, and `main` stops being a scroll container, so the document scrolls.
- The app bar stays pinned at the top (its existing sticky position).
- A direct-child `nav.navigation-bar`, or a `<footer>` whose only child is one, takes a bottom region and sticks to the window's bottom edge.
- A collapsed rail is `display: none`. An expanded rail is the existing compact overlay, which opens from an app bar button with `aria-controls` (phase 90), since the rail's own menu button is hidden with it. Custom `.scaffold-rail` content is hidden too, because the compact layout has no rail region.
- The app bar's scrolled fill follows the document again.
- The trailing region sits after the pane, in flow, until phase 93 floats it.
- The `.modal` held-column rule from phase 91 applies from 600px up only.
- The docs, `llm.md` and partial comments that said the scaffold never scrolls the document are updated.

From 600px up the navigation bar region is hidden, and nothing else changes.

## Exclusions

- Floating the trailing toolbar (phase 93), the status bar (phase 94) and safe-area padding beyond what the navigation bar already does (phase 97).
- Moving focus into the opened rail. The compact overlay doesn't today, and the roadmap doesn't ask for it.
- Landscape phones wider than 600px, such as 844 × 390. They are medium windows, so the pane scrolls and the address bar doesn't collapse there.
- A `nav.navigation-bar` that isn't a direct child of the scaffold or of its direct-child `<footer>`. It isn't a region, so the scaffold doesn't place it or hide it from 600px.
- Collapsing flexible `.medium` and `.large` app bars. `AppBar` puts its sentinel after the header, where the scaffold grid doesn't place it, so the existing limit stays; a check makes sure the sentinel moves no region.
- Animating the rail open from `display: none`. With no starting style, the overlay snaps open, as it now snaps closed on medium windows. A scrim tap or a destination click drops focus to the page, as the existing compact overlay does; only Escape returns focus.
- Moving back-to-top above the navigation bar. On compact windows the document scrolls, so the link can appear, and it overlaps the bar as it already overlaps every bottom bar; the docs say so.
- A semantics rule against two navigation bars. Two would overlap in one area, like two rails, but the `:has()` selector a `footer` form needs is too uncertain in the static checker's DOM engine. The docs say one navigation bar.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Scaffold rules swap the rail and the navigation bar, not the `hide-on-*` helpers | Decided under delegation | The roadmap asks which. Scaffold rules mean the markup needs no helper classes, so a page can't show both or neither by forgetting one, and the swap uses the same 600px breakpoint as the rest of the scaffold. A rail must not carry `.hide-on-compact-only`: that helper is `display: none !important`, so the rail could never open as the overlay. The docs say to drop it. |
| A collapsed rail is `display: none` below 600px | Decided under delegation | The roadmap wants it off-screen and out of the tab order. `display: none` does both. The existing compact overlay rules apply as soon as `.expanded` is added, so the rail opens from the app bar's `aria-controls` button. |
| The navigation bar region accepts `nav.navigation-bar` or a `<footer>` whose only child is one, and makes the region `position: sticky; inset-block-end: 0` with `--expressive-z-app-bar` | Decided under delegation | The templates wrap the bar in a `<footer>`, and `.navigation-bar.fixed` already uses sticky with that z-index. Placing the region keeps the bar component unchanged. |
| The compact grid is one column with the areas `bar`, `pane`, `trailing` and `navbar`, and `.tall-rail` uses it too | Decided under delegation | The rail leaves the grid on compact windows, so a tall rail has nothing to change. The trailing row keeps the toolbar reachable until phase 93. |
| `--_app-bar-timeline` is set only from 600px up | Decided under delegation | Below 600px `main` doesn't scroll, so a timeline it names would be inactive and the bar would never fill. Without the property the bar falls back to `scroll(root)`, which the document scroll drives. |

## Requirements

- **R1** At 390 × 800 a scaffold with a 3000px `main` is taller than the window, `main` has no scroll overflow of its own, and scrolling the window moves the content.
- **R2** While the window scrolls, the bar region stays at the top edge, whether it is a `header` app bar or a `.scaffold-bar`.
- **R3** A direct-child `nav.navigation-bar`, or a `<footer>` holding one, spans the window width and stays at the bottom edge while the window scrolls, above the content. From 600px up it is `display: none`.
- **R4** Below 600px a collapsed rail, and a `.scaffold-rail`, are `display: none`, and none of the rail's destinations can take focus. Activating the app bar's `aria-controls` button expands the rail as a fixed overlay with a scrim. Escape collapses it and returns focus to the button, and a scrim tap collapses it.
- **R5** In engines with scroll-driven animations, the app bar's scrolled fill follows the window's scroll below 600px (progress 0 at the top, 1 after scrolling).
- **R5a** Below 600px, when the scaffold is a direct child of `<body>`, the document's `scroll-padding-block` keeps a control that keyboard focus reaches clear of the pinned app bar and navigation bar.
- **R6** The trailing region follows the pane in flow below 600px and is reachable by scrolling. A vertical toolbar there keeps its own width at the inline end instead of stretching across the window.
- **R7** A `.tall-rail` scaffold uses the same compact layout.
- **R8** From 600px up the layout matches phases 88 to 91; their tests pass unchanged. At 599px the compact layout applies (the navigation bar shows, the rail is hidden); at 600px the medium layout does (the navigation bar is hidden, the rail holds its column). A `.modal` rail holds no column below 600px.
- **R8a** A `.panes` layout inside `main` grows with its content below 600px, so the document scrolls instead of the pane bodies.
- **R8b** `AppBar`'s sentinel after a flexible bar moves no region in the compact layout.
- **R9** These records change: the scaffold docs page (with a navigation bar in the demo; the demo wrapped in a box that `docs/static/docs.css` gives a fixed height and its own scrolling, so on compact windows the scaffold scrolls inside the box; the scrolling and limits sections rewritten for compact windows; the `.hide-on-compact-only` note), the `_scaffold.scss` header comment, the scaffold `llm.md` section, the design reference `scaffold.md`, the decision record, `CHANGELOG.md`, the CSS gzip budget, and `npm run build:skill` last.

## Risks considered

- Two at once, bad input, refusal: CSS only.
- Other readers:
  - The rail's compact overlay and Escape (R4) come from phases 90 and 91; the overlay flag already covers compact windows.
  - The app bar's timeline (R5).
  - The navigation bar's own bottom safe-area padding stays. Phase 97 handles the other regions.
  - The pane footer rule skips a `footer` around a lone navigation bar, so that `footer` keeps no pane-footer styles.
  - `.panes` inside `main`: `height: 100%` of an auto-height `main` resolves to auto, so the panes grow and the document scrolls (R8a). On compact windows they show one pane at a time.
  - The docs demo (R9).
  - The templates still carry their own CSS until phase 98.
- UI states: RTL (logical properties throughout), enlarged text (the document scrolls, so nothing clips), no JavaScript (the rail can't open, as with any compact rail, and the navigation bar still works), print (the navigation bar and rail hide in print).
- `specs/checklist.md` does not exist in this project.
