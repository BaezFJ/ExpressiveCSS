# Scaffold medium rail overlay: validation

Roadmap [phase 91](../../../../roadmap.md#phase-91-overlay-the-expanded-rail-on-medium-windows). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`. A "full scaffold" is the one the scaffold browser test builds, with the rail started by `NavigationRail.init`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 | Full scaffold at 1024 × 800. | Measure the rail and pane, add `.expanded`, measure again. | The pane's left edge moves by the rail's width change, and the rail's position is not `fixed`. | The expanded rail overlays at 1024px or the pane doesn't narrow. | Pending |
| V2 | R2, R4 | Full scaffold at 700 × 800, then the same with `.tall-rail`; full scaffold at 1280 × 800 with a `.modal` rail. | Measure the pane, expand the rail, read its position, call `elementFromPoint` beside the rail and in the app bar row at its trailing end, measure the pane again. | At 700px the rail is `fixed`, both points hit the rail (its scrim, above the app bar), and the pane's box is unchanged, in both layouts. At 1280px the `.modal` rail is `fixed` and the pane's box is unchanged. Watch the 700px case fail before the change. | The rail widens its column at 700px, or a fixed rail lets the pane jump. | Pending |
| V3 | R3 | Full scaffold at 700 × 800 whose app bar menu button has `aria-controls="rail"`. | Open with the menu button, focus a destination, press Escape; expand again and click beside the rail; expand again and click the app bar row at its trailing end. | Escape collapses the rail and focuses the menu button; each scrim click collapses it. Watch Escape fail before the runtime change. | Escape or the scrim leaves the medium overlay open, or focus isn't returned. | Pending |
| V4 | R5 | A rail outside any scaffold at 700 × 800; full scaffold at 500 × 800. | Expand each and read the position. | The rail outside a scaffold is not `fixed`. In the scaffold at 500px the rail is `fixed`, as before. | The medium rule leaks outside the scaffold, or the compact overlay changed. | Pending |
| V5 | R6 | Full scaffold with `dir="rtl"` at 700 × 800. | Measure the pane, expand the rail, measure the rail and pane. | The rail's right edge is 700 and the pane's box is unchanged. | The overlay stays on the left or the pane moves. | Pending |
| V5a | R6a | Full scaffold at 700 × 800 with motion on (no reduced-motion emulation). | Expand the rail and wait for its transition; measure the pane; remove `.expanded` and measure the pane at once and after the transition. | The pane's box is the same in all three measurements. | The column follows the collapsing rail and the pane jumps. | Pending |
| V5b | R6b | Full scaffold at 900 × 800, rail started with `NavigationRail.init`. | Expand; read the position; resize to 700 and read it; press Escape with focus in the rail; expand again at 700; resize to 900; press Escape. | At 900 the rail isn't fixed; at 700 it is, and Escape collapses it. Back at 900 it isn't fixed and Escape leaves it expanded. | Escape treats a non-overlay rail as modal, or a resize leaves the wrong state. | Pending |
| V6 | R7 | After `npm run build:skill`. | Run `npm run check:generated` and the selective-builds and component-decisions tests; grep "839" or "600px to 839px" in both docs pages, both `llm.md` sections and the changelog. | Generated files are current, the pins and budgets hold, and every record states the medium overlay. | A record is missing or stale, or a budget is exceeded. | Pending |
| V7 | R1 to R7 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V8 | R2, R3 | A tablet in portrait (600 to 839px wide) | Open the scaffold demo, open the rail from the app bar, tap the scrim. | The rail opens over the whole docs page with a scrim, and the tap closes it, with no jump in the demo's pane. | No | Pending |

## Merge conditions

- All agent-run checks pass, with V4 and phase 88's tests as regression checks.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Findings, each checked against the source and fixed:
  - Holding the column only for an expanded rail made the pane jump during the collapse transition, and every check ran with reduced motion. The column is now held for any rail from 600px to 839px and for any `.modal` rail. R6a and V5a check it with motion on.
  - The risk note put the app bar button under the scrim, but the open rail covers it. The note now says so, and the docs list the ways to close the overlay.
  - Focus leaving the overlay into hidden pane controls is now a documented limit, consistent with the compact overlay.
  - Phase 90's focus return now has a check in V3.
  - R4 is labelled an extension.
  - The docs demo escaping its box on medium windows is now in R7 and V8.
  - V2 measures the scrim with `elementFromPoint`, including the app bar row.
  - Rails that aren't direct children, the collapsed-width override, and resizing are now covered (exclusions, R6b, V5b).
