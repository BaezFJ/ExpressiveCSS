# Scaffold compact toolbar: validation

Roadmap [phase 93](../../../../roadmap.md#phase-93-float-the-trailing-toolbar-on-compact-windows). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`. A "compact scaffold" is phase 92's: an app bar, a rail, a 3000px `main`, a three-action vertical toolbar and a `<footer>` navigation bar, with the navigation bar at its real 74px height (its 32px indicator around the icon).

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
- 2026-11-15, `/code-review high --fix --max-findings all` on `217e909a9..HEAD`: eight findings, each checked against the source and all fixed:
  - Without a navigation bar, the toolbar's resting margin left out the safe area that its sticky offset included, so the toolbar rose over the pane's end on a notched phone. The margin now adds the safe area, and with a bar the margin is back to 16px.
  - The navigation bar's height counted its 6px bottom padding and the safe area on top of each other. It is now `44px + 1rem + max(6px, safe area)`, defined once as `$_navbar-size` and used by the offset and the scroll padding.
  - `.tooltip.right` (the trailing side under RTL) still opened sideways. It now moves above too, and the test covers both.
  - A `[hidden]` navigation bar or toolbar still shaped the offset and the padding. The reviewer left this open; I fixed it here. The scroll padding is now the sum of two private parts set only for a shown bar and a shown toolbar, and a test hides the bar. It failed with the exclusion removed (R6b).
  - A stale comment in the selector-scope test was corrected.
  CSS budget 92,686. The scaffold and tokens suites pass 97 of 97.
- 2026-11-15, `code-review-and-quality` (five-axis review by an independent read-only subagent): no Critical findings. Fixed:
  - Required: the 200% check passed even with the `1rem` dropped from the bar height. It now asserts the same 16px gap; with `1rem` removed it fails (718 vs 718).
  - Optional: the bare `nav` child and a hidden bar inside a shown footer had no tests. Both are covered now.
  - Optional: the end-of-page check couldn't see a missing bottom margin. It now asserts both 16px margins and fails with the bottom margin at 0.
  - Optional: the `.max` spacer had no check. A test now checks it takes no width.
  - Optional: the tooltip test read a hidden bubble's box. It now asserts opacity 1 and full scale, and fails with the full-scale rule removed.
  - Optional: the size comment now notes the icon-only bar.
  - Nits: the header comment names the floating toolbar; the shown-bar list is one Sass variable where `:has()` doesn't nest; the decision record lists the end-of-page check and names the compact toolbar in its gaps.
  The scaffold suite passes 89 of 89.
- 2026-11-15, local Codex review (`codex review --base 217e909a9`, saved as `codex-review-phase-93.txt` in the worktree's git dir, read to its last line). One [P2] finding, confirmed and fixed:
  - The navigation bar's icon container is its 32px indicator, not the 24px glyph, so the real bar is 74px. The `44px + 1rem + …` formula gave 66px, which left the toolbar 8px above the bar instead of 16px, and the phase 92 scroll padding 8px short.
  - The test style that shrank the icons to 24px had hidden this. In phase 92 I had misread the fixture's 74px as an artifact of the missing icon font.
  - The formula is now `52px + 1rem + max(6px, safe area)`, and the tests drop the override and measure the real 74px bar. With the old formula, the floating-toolbar test fails (718 vs 726).
