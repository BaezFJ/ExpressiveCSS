# Scaffold compact toolbar: validation

Roadmap [phase 93](../../../../roadmap.md#phase-93-float-the-trailing-toolbar-on-compact-windows). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`. A "compact scaffold" is phase 92's: an app bar, a rail, a 3000px `main`, a three-action vertical toolbar and a `<footer>` navigation bar, with the navigation bar's icons sized as the icon font would (a 66px bar).

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R6 | Compact scaffold at 390 × 800, and the same with `dir="rtl"`; one with a `.toolbar-group.vertical` holding a three-action `.toolbar.vertical` and an `.extra` FAB. | Read `flex-direction` and `z-index`, measure the toolbar and its actions; in the group read the inner toolbar's direction and box. | Row, z-index 996, wider than tall, actions' left edges increasing in DOM order (decreasing under RTL). The group and its inner toolbar are rows and wider than tall. Watch fail before the change. | The toolbar or the group's inner toolbar stays vertical, or the order flips. | Pending |
| V2 | R2, R4 | Compact scaffold, one without a navigation bar, and the first with the root font size at 32px. | At the top of the page and after scrolling by 1000px, measure the toolbar and the navigation bar. | At both scroll positions the toolbar's center is at 195 within 1px and its bottom is the navigation bar's top − 16 within 2px, with no overlap. Without the bar, bottom = 800 − 16 within 2px. At 32px the toolbar's bottom is at or above the navigation bar's top. Watch fail before the change. | The toolbar scrolls away, isn't centered, or covers the bar. | Pending |
| V3 | R3 | Compact scaffold whose `main` ends in an element `#last`. | Scroll to the end; measure `#last` and the toolbar. | `#last`'s bottom is at or above the toolbar's top. | The floating toolbar covers the end of the page. | Pending |
| V4 | R5 | Compact scaffold whose `main` holds a button 640px down. | Focus the app bar's menu button and press Tab. | The button has focus and its bottom is at or above the toolbar's top. Watch fail with the sticky placement in and the larger scroll padding left out. | Focus lands under the floating toolbar. | Pending |
| V4b | R6a | Compact scaffold whose toolbar's first action holds a `.tooltip.left`. | Hover the action and measure the bubble against it. | The bubble's bottom is at or above the action's top and it overlaps the action horizontally. Watch fail before the override. | The bubble shows beside the action and covers its neighbor. | Pending |
| V5 | R7 | The scaffold tests from phases 88 to 92, and a compact scaffold with a `.toolbar.vertical.fixed`. | Run them; read the fixed toolbar's `flex-direction`. | All pass; the fixed toolbar stays `column`. | The compact rules leak to wider layouts or to `.fixed`. | Pending |
| V6 | R8 | After `npm run build:skill`. | Run `check:generated`, selective-builds and component-decisions; grep "floats" or "horizontal" in the docs page, `llm.md`'s Scaffold section, `scaffold.md` and a new changelog line. | Generated files current, budget and pin hold, every record describes the compact toolbar. | A record is stale or missing, or the budget is exceeded. | Pending |
| V7 | R1 to R8 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V8 | R2, R3 | A phone | Scroll a scaffold page with a toolbar to its end. | The toolbar floats above the navigation bar and the last content scrolls clear of it. | No | Pending |

## Merge conditions

- All agent-run checks pass, with V5 as the regression check.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Eleven findings, each checked against the source and fixed:
  - The group's inner `.toolbar.vertical` wasn't in scope. It is now, and V1 uses a three-action group.
  - The sticky offset would pull the toolbar over the pane's end. 16px block margins now set its resting place at the stuck position.
  - V4 couldn't fail before the change. It now watches the scroll padding specifically.
  - Left tooltips would cover neighboring actions. They now flip to the top on compact windows (R6a, V4b).
  - The z-index was unset. The toolbar now takes `--expressive-z-toolbar` (R1).
  - Phase 92's `justify-self: end` is now replaced, not added to.
  - V1's radius check couldn't fail. It now checks `flex-direction` and z-index.
  - `.scaffold-trailing`, the `.max` spacer, the top and short-page cases, enlarged text (V2 at 32px), landscape and the demo box's safe-area term are now stated in the requirements or exclusions.
