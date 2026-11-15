# Scaffold status bar: requirements

- Feature: a `.status-bar` child of a scaffold spans the full width along the bottom, below the rail, pane and toolbar, and hides under 600px
- Date: 2026-11-15
- Roadmap phase: [Phase 94: add a status bar region](../../../../roadmap.md#phase-94-add-a-status-bar-region), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It depends on [phase 88](../scaffold-default-regions/) and falls under "Components and behaviors" in the [mission](../../../../mission.md).
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `c4781e2bb`, after phase 93.

## Current behavior and need

`.status-bar` (`_status-bar.scss`, shipped in 0.18.0) is a 24px row that is `position: sticky; inset-block-end: 0` with `--expressive-z-toolbar` and pads its bottom for the safe area. In a scaffold today it is an unplaced child and falls into grid auto-placement. Its own docs say not to show it with a navigation bar, which phase 92 shows below 600px.

## Scope

- From 600px up, a direct-child `.status-bar` takes a `status` row across the full width, below the rail, pane and trailing regions, in both the default and `.tall-rail` layouts.
- Below 600px it is `display: none`.
- The semantics row's one-child-per-region rule counts the status bar as a region, and its message and the scaffold note list it.
- Docs (with a status bar in the demo), `llm.md`, `scaffold.md`, the status bar guide, decision record, changelog and budget.

## Exclusions

- Changing the status bar component.
- A status bar that isn't a direct child of the scaffold.
- Low-priority status bar items (`data-priority="low"`) hide below 600px, but a scaffold hides the whole bar there, so that hiding never shows inside a scaffold. The docs say so.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The grid places the status bar; its own sticky placement stays and has no effect on its position there | Decided under delegation | The roadmap asks which. From 600px up the scaffold doesn't scroll, so a sticky bar at its bottom never moves; a grid row puts it at the window's bottom edge and shortens the regions above it, so nothing hides under it. Its `z-index` still makes it a stacking context, which is harmless: it comes after `main`, its tooltips paint above the pane, and its menus open in the top layer, so the scaffold's `overflow: clip` doesn't cut them. Keyboard focus needs no scroll padding for it, since it sits outside the scrolling pane. |
| The status row runs under the tall rail too | From the roadmap | The roadmap says the bar spans the full width below the rail, pane and toolbar. |
| Below 600px the status bar is hidden by the scaffold | From the roadmap | The status bar guide says not to show it with a navigation bar, and compact scaffolds show one. |

## Requirements

- **R1** At 1280 × 800 a scaffold with a `.status-bar` child, written as `<footer>` or as `<div role="region">`, has a third row: the status bar's left edge is 0, its width equals the scaffold's, its bottom is 800, the rail and pane end at its top, and the trailing toolbar is centered between the app bar's bottom and the status bar's top. At 700px the rail column is still held at the collapsed width.
- **R2** With `.tall-rail`, the rail and the trailing region run from 0 to the status bar's top (the toolbar is centered in that span), and the status bar still spans the full width.
- **R3** At 390px the status bar is `display: none` and the compact layout is unchanged.
- **R4** Without a status bar, every region's box matches phases 88 to 93.
- **R5** With the root font size at 32px, the status bar grows and the pane gets shorter, with the status bar still at the bottom edge.
- **R6** These records change: `semantics.json` (R7), the scaffold docs page (a status bar in the demo, and the low-priority note) and `llm.md` section, the status bar docs page and `llm.md` section, the design reference `scaffold.md`, the decision record, `CHANGELOG.md`, the CSS budget, and `npm run build:skill` last.
- **R7** In `semantics.json`, `scaffold-one-child-per-region` also flags two visible `.status-bar` children and two visible direct-child navigation bars, and its message and the row note name both regions.

## Risks considered

- Two at once, bad input, refusal: CSS only.
- Other readers: the medium and compact rail overlays are `position: fixed` at full height, so they cover the status bar as they cover everything else; the status bar's safe-area padding stays (phase 97 handles the other regions); the page, pane and questionnaire footer rules already skip `footer.status-bar`; the scroll timeline and scroll padding are unaffected because the status bar isn't in the pane.
- UI states: enlarged text (R5), RTL (full width, nothing to mirror), no JavaScript (CSS only). Print isn't checked.
- `specs/checklist.md` does not exist in this project.
