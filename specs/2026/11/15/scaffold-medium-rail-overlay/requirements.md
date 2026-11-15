# Scaffold medium rail overlay: requirements

- Feature: in a scaffold, an expanded rail narrows the pane at 840px and wider, and opens over the pane with a scrim from 600px to 839px
- Date: 2026-11-15
- Roadmap phase: [Phase 91: overlay the expanded rail on medium windows](../../../../roadmap.md#phase-91-overlay-the-expanded-rail-on-medium-windows), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It depends on [phase 88](../scaffold-default-regions/) and [phase 90](../rail-outside-toggle/), and falls under "Components and behaviors" in the [mission](../../../../mission.md).
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `66d3accac`, after phase 90.

## Current behavior and need

`_navigation-rail.scss` makes an expanded rail a modal overlay (`position: fixed`, a full-window scrim from its `::before`) below 600px, and at every width with `.modal`, through its private `_modal-rail` mixin. `NavigationRail._isModal()` mirrors that with `.modal` or a `(width < 600px)` media query, and Escape and a scrim click collapse a modal rail only.

In a scaffold from 600px to 839px an expanded rail widens its grid column, so on a 700px window the pane loses 184px of a narrow width. Material's guidance is a modal drawer on medium windows. And whenever the rail does go fixed in a scaffold, it leaves the grid: the `auto` rail column drops to zero and the pane jumps to the leading edge under the scrim.

## Scope

- In a `.scaffold` from 600px to 839px, an expanded rail is a modal overlay with the rail's own scrim.
- From 600px to 839px, and at every width for a `.modal` rail, a scaffold's rail column keeps the collapsed width whether the rail is expanded or not, so the pane keeps its width and place as the rail opens and closes.
- The runtime treats a rail that is rendered as an overlay as modal, so Escape and a scrim tap collapse it.
- From 840px up the expanded rail keeps narrowing the pane (phase 88), checked at 1024px.
- Docs, `llm.md`, changelog and CSS and JS budget updates.

## Exclusions

- Compact windows under 600px, where phase 92 hides the rail and scrolls the document. This phase doesn't change the rail's existing compact overlay.
- Moving focus into the overlay when it opens, or trapping focus in it. The existing compact overlay does neither, and the roadmap doesn't ask for it.
- Any change outside a scaffold. A rail outside a scaffold, or one that isn't a direct child of it (for example inside `.scaffold-rail`), keeps its current medium behavior.
- Closing the overlay when focus leaves it. Tab can move from the overlay to pane controls under it, as it can from the existing compact overlay. Collapsing on `focusout` would also fire when a destination's menu renders outside the rail, so this stays a documented limit.
- A collapsed width overridden on the rail element instead of the scaffold. The column reads `--md-comp-nav-rail-collapsed-width` on `.scaffold`, so the docs say to set it there.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The medium overlay reuses the rail's modal state: the same `_modal-rail` mixin, scrim and Escape and scrim-tap handling | Decided under delegation | The roadmap asks whether to reuse it. Reusing keeps one overlay look and one dismissal contract, and adds no new class or token. |
| CSS sets it: `_navigation-rail.scss` applies `_modal-rail` to `.scaffold > .navigation-rail.expanded:not(.modal)` from 600px to 839px | Decided under delegation | The mixin is private to the rail partial, so the rule lives beside it. The scaffold has no runtime, and a CSS rule needs no script for the layout. |
| The runtime asks the rendering: `_isModal()` also returns true when the rail's computed `position` is `fixed` | Decided under delegation | That follows every CSS route to an overlay (compact, `.modal`, the scaffold's medium rule) without the script knowing about the scaffold. The class and media-query checks stay for environments without layout, such as jsdom. |
| `_scaffold.scss` keeps the rail column at `--md-comp-nav-rail-collapsed-width` for any rail from 600px to 839px, and at every width for a `.modal` rail, expanded or not | Decided under delegation, revised after spec review | The completion check wants the pane to keep its width at 700px. Holding the column only while `.expanded` matched would release it the moment the class is removed, and the pane would jump while the rail animates back to its collapsed width. Holding it always means the collapsing rail briefly overflows its column; the pane, later in the grid, paints over that strip. Covering `.modal` at every width is an extension: it stops the same jump on wide windows, which predates this phase. |

## Requirements

- **R1** At 1024px in a scaffold, expanding the rail moves the pane's leading edge by the difference between the expanded and collapsed rail widths, and the rail is not `position: fixed`.
- **R2** At 700px in a scaffold, an expanded rail is `position: fixed`, its scrim covers the window, and the pane's box is the same as when the rail was collapsed.
- **R3** At 700px in a scaffold, pressing Escape with focus in the expanded rail, or clicking the scrim beside it or over the app bar row, collapses the rail. When an app bar button with `aria-controls` opened it, Escape returns focus to that button (phase 90).
- **R4** A `.modal` rail in a scaffold at 1280px keeps the pane's box when it expands (an extension; see the decisions).
- **R5** Outside a scaffold at 700px, an expanded rail is not `position: fixed`, as before. Below 600px, inside or outside a scaffold, the existing compact overlay is unchanged.
- **R6** Under `dir="rtl"` at 700px, the overlay rail sits at the right edge and the pane keeps its box.
- **R6a** With motion on, collapsing the overlay at 700px leaves the pane's box unchanged during the rail's transition.
- **R6b** Resizing from 900px to 700px and back with the rail expanded switches it between narrowing the pane and overlaying it, and Escape collapses it only while it is an overlay.
- **R7** These records change:
  - The scaffold docs page and `llm.md` section describe the medium overlay, how it closes (the scrim, Escape or the rail's own toggle, since the open rail covers the app bar's menu button), the focus limit, where to set the collapsed width, and that the demo rail opens over the whole docs page on medium windows.
  - The navigation rail docs page and `llm.md` section say that a scaffold makes the rail modal from 600px to 839px too.
  - `CHANGELOG.md` gets an entry.
  - The CSS and JS gzip budgets in `tests/selective-builds.test.js` are updated.
  - `npm run build:skill` regenerates the guides last.

## Risks considered

- Two at once and bad input: CSS only plus a read of the computed style; nothing is written or parsed.
- Refusal: none.
- Other readers:
  - The rail's side panel opens beside the overlay rail as it does on compact windows.
  - The open overlay is at least 220px wide from the inline start and full height, so it covers the app bar's menu button. A click there lands on the rail, not the scrim. The overlay closes from the scrim beside it, Escape or the rail's own toggle; the docs say so.
  - Phase 89's tall rail uses the same rail column, so R2 holds there too; the test checks it.
  - `getComputedStyle` is read only on Escape and on a click inside the rail's own box, so it adds no work to scrolling or resizing.
- UI states: RTL (R6), reduced motion (the mixin keeps the rail's existing transitions and their reduced-motion rule), enlarged text (no change to the overlay), no JavaScript (the overlay shows from the `.expanded` class; only Escape and scrim dismissal need the runtime, as on compact windows).
- `specs/checklist.md` does not exist in this project.
