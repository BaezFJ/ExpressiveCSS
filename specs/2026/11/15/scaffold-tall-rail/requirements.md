# Scaffold tall rail: requirements

- Feature: `.scaffold.tall-rail`, a modifier that runs the rail the full window height and puts the app bar over the pane area only
- Date: 2026-11-15
- Roadmap phase: [Phase 89: run the rail the full height](../../../../roadmap.md#phase-89-run-the-rail-the-full-height), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It builds on [phase 88](../scaffold-default-regions/) and falls under "Components and behaviors" in the [mission](../../../../mission.md); the "Styling contracts" in the [technical constraints](../../../../tech-stack.md) govern it.
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `abd59e7c5`, after phase 88.

## Current behavior and need

Phase 88's `.scaffold` uses the areas `"bar bar bar" "rail pane trailing"`: the app bar spans the window and the rail starts below it. The bundled `layout-rail.html` template, and pages built on it, put the rail first at full height with the header and `main` in a column beside it. `.scaffold` can't express that layout without page CSS.

## Scope

- A `.tall-rail` modifier on `.scaffold` that changes the grid areas to `"rail bar trailing" "rail pane trailing"`: the rail and the trailing region run the full height, and the bar sits over the pane only.
- Docs, `llm.md`, the design reference, decision record, changelog and gzip budget updates.

## Exclusions

- Any change to the default layout, or to the rail, app bar or toolbar themselves.
- A variant where the bar also spans the trailing region. The roadmap places the bar over the pane area only, so that variant waits until someone asks for it.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The modifier is `.scaffold.tall-rail` | Decided under delegation | Framework modifiers are short words on the component (`.panes.separated`, `.toolbar.vertical`). `tall-rail` names what changes and doesn't collide with an existing class; `full-height` would read as the scaffold's own height, which is already full. Unreleased, so cheap to rename. |
| The bar sits over the pane area only, and the trailing region runs the full height beside it | From the roadmap | Phase 89's text says "the app bar sits over the pane area only", and phase 88 calls `main` the pane area. A spec review flagged an earlier draft that spanned the bar over the trailing column as a deviation from that text. |
| The tall-rail section shows code, not a second live demo | Decided under delegation | The existing demo already shows the regions; a second fixed-height demo would add another rail landmark to the docs page for a one-line difference. |
| No new semantics rule | Decided under delegation | The modifier changes placement only, so it adds no markup an author could get wrong beyond what phase 88's rules already check. |

## Requirements

- **R1** `.scaffold.tall-rail` has the areas `"rail bar trailing"` and `"rail pane trailing"`, with the same columns and rows as phase 88.
- **R2** At 1280 × 800 the rail's top is at 0 and its bottom at the window's bottom. The bar starts at the rail's inline end and ends at the pane's inline end, 24px before the toolbar. The pane starts below the bar. The toolbar is centered vertically in the full window height, 24px from the window edge and from the bar and pane. With text enlarged to 200%, the rail still runs the full height and the taller bar shortens only the pane.
- **R3** Without the modifier the layout matches phase 88; phase 88's browser tests keep passing unchanged.
- **R4** Under `dir="rtl"` the rail is at the right edge from top to bottom, and the toolbar at the left edge.
- **R5** From 600px up, expanding the rail widens its column, so the bar and the pane both start at the expanded rail's inline end, with no overlap. Below 600px, and with `.modal`, an expanded rail is `position: fixed` with a scrim, as in phase 88; phases 91 and 92 change those widths.
- **R6** A tall-rail scaffold without a rail or toolbar keeps phase 88's empty-region rule: the bar and pane meet the edges. This is a regression check; the modifier doesn't change it.
- **R7** In engines that support `timeline-scope`, the tall-rail bar still fills from the pane's scroll. A regression check: the modifier changes only grid areas.
- **R8** These records change: the docs page shows the modifier with a code example, the design reference `scaffold.md` names it in the rails row, `llm.md` describes it, the decision record's `documentedSupport` and a browser check name it, `CHANGELOG.md` gets an entry, `tests/selective-builds.test.js` gets a reviewed budget line, and `npm run build:skill` regenerates the guides last.

## Risks considered

- Concurrency, bad input and refusal: the modifier writes nothing, takes no input and involves no permissions.
- Other readers: a rail's side panel spans the window height beside its trigger and opens over the bar and pane, the same limit phase 88 documents; the docs limits list says so for the tall rail too. The rail's own first-child menu toggle stays at the top of a tall rail, as in `layout-rail.html`. The app bar's sticky position and timeline come from phase 88 and are unchanged (R7). Print drops the grid (phase 88's `display: block`) and hides the rail, so the modifier has no print effect.
- UI states: RTL (R4), an expanded rail (R5), a missing rail (R6). Enlarged text grows the bar as in phase 88; the rail runs the full height either way. No color, motion or focus changes.
- Semantics: the landmarks keep source order; the modifier changes only grid areas.
- `specs/checklist.md` does not exist in this project.
