# Scaffold compact toolbar: requirements

- Feature: under 600px a scaffold's trailing vertical toolbar turns horizontal and floats, centered, above the navigation bar
- Date: 2026-11-15
- Roadmap phase: [Phase 93: float the trailing toolbar on compact windows](../../../../roadmap.md#phase-93-float-the-trailing-toolbar-on-compact-windows), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It depends on [phase 92](../scaffold-compact-scroll/) and falls under "Components and behaviors" in the [mission](../../../../mission.md).
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `217e909a9`, after phase 92.

## Current behavior and need

Since phase 92, below 600px a vertical toolbar in a scaffold sits in its own grid row after the pane, at the inline end, still vertical. On a phone it scrolls away with the page. M3 places a floating toolbar horizontally, centered, above the bottom navigation on compact windows.

`.toolbar.vertical` comes from `#{$_floating}.vertical` in `_toolbar.scss` (specificity (0,3,0)): `flex-direction: column`, swapped padding and a 24px `--md-comp-toolbar-external-space`. The floating toolbar's container is 64px tall with 48px actions, all in px. A `.toolbar-group.vertical` sets `flex-direction: column` too. Phase 92 gives the document `scroll-padding-block` for the two pinned bars.

## Scope

Below 600px, in a `.scaffold`:

- A direct-child `.toolbar.vertical` or `.toolbar-group.vertical` (not `.fixed`), and the `.toolbar.vertical` inside such a group, lay out as a row and keep the floating shape. A `.max` spacer in the row takes no width of its own.
- `.tooltip.left` bubbles on those actions show above them, as a horizontal floating toolbar's do, so they don't cover the next action.
- It is centered (replacing phase 92's `justify-self: end`), has `--expressive-z-toolbar`, and is sticky at the bottom: 16px above the navigation bar region when there is one, or above the window's bottom edge and safe area when there isn't. It floats over the page while its row is below the window, including at the top of a long page, and sits in flow on a page short enough to show its row.
- It stays in its own grid row after the pane, with 16px block margins, so at the end of the page the content above it scrolls clear.
- The document's bottom scroll padding grows by the toolbar, so keyboard focus lands clear of it.

## Exclusions

- Changing the toolbar component itself, or toolbars outside a scaffold.
- A `.fixed` toolbar, which positions itself.
- Wider windows, where phases 88 and 89 place the toolbar.
- Custom `.scaffold-trailing` content, which stays a full-width row after the pane, as phase 92 left it.
- Landscape phones and short windows wider than 600px, which use the medium layout.
- Toolbars with so many actions that a row overflows a phone. The row wraps or overflows as any floating toolbar does; the docs say to keep a compact toolbar to a few actions.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| CSS overrides the `vertical` class below 600px; the markup carries no second class | Decided under delegation | The roadmap asks which. One markup that adapts follows the rest of the scaffold, and a second class could be left off or left on by mistake. The scaffold rule's (0,4,0) specificity beats the toolbar's (0,3,0) `.vertical` rule. |
| The toolbar is `position: sticky` at the bottom in its own row, with 16px block margins, not `fixed` | Decided under delegation | The roadmap asks how the scaffold reserves room at the end of the page. A sticky element keeps its row in flow, so the page always ends with room for it, and it floats over the content only while its row is below the window. The margins put its resting place 16px above the navigation bar, the same spot it sticks to, so the shift never pulls it over the pane's last content. |
| `.tooltip.left` on those actions is turned into the default top placement below 600px | Decided under delegation | A trailing vertical toolbar uses left tooltips, which would cover the neighboring action once the toolbar is a row. The override is scoped to the scaffold's compact toolbar, so the same markup keeps left tooltips from 600px up. |
| The bottom offset is the navigation bar's height from its anatomy (`44px + 1rem + max(6px, safe area)`, defined once as `$_navbar-size` and shared with the scroll padding) plus 16px, or 16px plus the safe area without a shown navigation bar | Decided under delegation, corrected after code review | The navigation bar's height isn't available to a sibling in CSS, and phase 92 already sizes it this way. 16px is the floating toolbar's external space. |
| The document's bottom scroll padding adds the toolbar's 64px plus its 16px gap when the scaffold has a vertical toolbar | Decided under delegation | Phase 92's Codex finding showed focus can land under a pinned bar; a floating toolbar covers the same strip. |

## Requirements

- **R1** At 390px a vertical toolbar in a scaffold, a toolbar group, and the toolbar inside the group have `flex-direction: row` and are wider than tall, and the actions run left to right in DOM order, so Tab order and visual order agree. The toolbar has `z-index` equal to `--expressive-z-toolbar`.
- **R2** Mid-scroll at 390 × 800, the toolbar is centered within 1px of the window's center, and its bottom is 16px above the navigation bar's top (within 2px), without covering the navigation bar. At the top of the long page it is already floating there. With the root font size at 32px it still doesn't overlap the taller navigation bar.
- **R3** Scrolled to the end, the pane's last content ends at or above the toolbar's top.
- **R4** Without a navigation bar, the toolbar's bottom is 16px above the window's bottom.
- **R5** With a vertical toolbar, Tab to a pane control near the bottom leaves it clear of both the toolbar and the navigation bar.
- **R6** Under `dir="rtl"` the actions run right to left in DOM order.
- **R6a** Hovering an action that has a `.tooltip.left` or `.tooltip.right` shows the bubble above the action, not beside it.
- **R6b** A `[hidden]` navigation bar or toolbar counts as absent for the toolbar's offset and the scroll padding.
- **R7** From 600px up, and for a `.fixed` toolbar at any width, the toolbar is unchanged; the earlier phases' tests pass.
- **R8** These records change: the scaffold docs page and `llm.md` section, the design reference `scaffold.md`, the decision record, `CHANGELOG.md`, the CSS gzip budget, and `npm run build:skill` last.

## Risks considered

- Two at once, bad input, refusal: CSS only.
- Other readers: the toolbar's tooltips (R6a; a sticky element doesn't clip them); the rail overlay (z 998) and the navigation bar (z 997) stay above the toolbar (z 996, `--expressive-z-toolbar`); phase 92's scroll padding (R5); the docs demo box (the toolbar sticks inside it, as the navigation bar does; the safe-area term is 0 there on desktop, and on a phone it adds a few pixels inside the demo box, which is acceptable for a demo; root scroll padding doesn't reach the box).
- UI states: RTL (R6), enlarged text (the toolbar's sizes are px, the navigation bar part of the offset grows with the text), print (the scaffold prints as a block and the toolbar prints in flow), no JavaScript (CSS only).
- `specs/checklist.md` does not exist in this project.
