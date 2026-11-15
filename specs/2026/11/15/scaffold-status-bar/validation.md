# Scaffold status bar: validation

Roadmap [phase 94](../../../../roadmap.md#phase-94-add-a-status-bar-region). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`. A "full scaffold" is phase 88's, plus a `<footer class="status-bar">` with two items when the check says so.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | Full scaffold with a `<footer>` status bar at 1280 × 800, then with a `<div role="region">` one, then with `.tall-rail`; the first at 700 × 800. | Measure every region. | Status bar: left 0, width 1280, bottom 800, in both forms. Rail and pane bottoms equal its top, and the toolbar's center is midway between the app bar's bottom and its top. In the tall-rail layout the rail runs from 0 to its top and the toolbar's center is midway between 0 and its top. At 700px `main` starts at the collapsed rail width. Watch fail before the change. | The status bar is auto-placed, narrower than the scaffold, overlaps a region, or drops the held column. | Pending |
| V2 | R3 | Full scaffold with a status bar and a navigation bar at 390 × 800. | Read the status bar's `display`. | `none`. Watch fail before the change. | The status bar shows with the navigation bar. | Pending |
| V3 | R4 | The phase 88 to 93 scaffold tests. | Run them. | All pass. | The extra row moves a region when there is no status bar. | Pending |
| V4a | R7 | Fixtures through the semantics rule runner. | Check a scaffold with one status bar, one with two visible, and one with a second `hidden`. | Two visible bars are flagged by `scaffold-one-child-per-region`; one, or one plus a hidden one, passes. Watch fail before the rule changes. | Two status bars pass. | Pending |
| V4 | R5 | Full scaffold with a status bar at 1280 × 800, root font size 32px. | Measure the status bar and pane. | The status bar is at least 48px tall, its bottom is 800, and the pane's bottom equals its top. | Enlarged text clips the bar or the pane runs under it. | Pending |
| V5 | R6 | After `npm run build:skill`. | Run `check:generated`, selective-builds and component-decisions; confirm the scaffold demo holds a `.status-bar`; grep "data-priority" in the scaffold docs page, "status-bar" in its `llm.md` Scaffold section, "scaffold" in the status bar docs page and its `llm.md` section, and a new changelog line. | Generated files current, budget and pin hold, records present. | A record is stale or missing, or the budget is exceeded. | Pending |
| V6 | R1 to R6 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

None. Placement is measured by the agent-run checks; the status bar's own screen reader and safe-area checks stay with its guide.

## Merge conditions

- All agent-run checks pass, with V3 as the regression check.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Nine findings, each checked against the source and fixed:
  - The exclusion claimed the status bar's own rules prevent two bars, but none does. The scaffold's one-child-per-region rule now counts it (R7, V4a).
  - The toolbar is `safe center`, so its box doesn't end at the status bar. V1 now checks centering.
  - Plan and validation disagreed on which checks fail first. They now agree (V1, V2, V4, V4a).
  - The tall rail's trailing column, the `div[role=region]` form and the 700px held column are now in R1, R2 and V1.
  - V5 now checks the demo and named strings, and the low-priority note is in scope.
  - The print claim is dropped as unchecked.
  - The stacking-context and scroll-padding notes are now in the decision row.
- 2026-11-15, `/code-review high --fix --max-findings all` on `c4781e2bb..HEAD`: nine findings, each checked against the source.
  - Fixed:
    - The design reference's status bar sentence made the tall-rail "both" ambiguous. It now comes after, and says both regions end above the status bar.
    - `llm.md` and the docs page said the rail runs to the window's bottom. They now say "or to a status bar".
    - The demo used `<footer class="status-bar">` inside a page with a site footer. It is now the `<div role="region">` form the status bar guide asks for.
    - The decision record's gaps text now names the status row.
    - The status bar test opens empty, measures once and checks the full width at 700px.
  - Also fixed, though the reviewer skipped them:
    - The partial's header and compact comments are corrected and re-pinned.
    - The note listed the navigation bar as a region, but the rule didn't count it. Two direct-child navigation bars are now flagged, with a fixture. Phase 92 added that region; the rule catches up here.
  - Kept: the status bar hides below 600px even without a navigation bar, because the roadmap says "Under 600px it is hidden".
  - Results are recorded below after the full verify.
- 2026-11-15, `code-review-and-quality` (five-axis review by an independent read-only subagent): no Critical or Required findings. R1 to R7 trace to code and to tests that fail on the old CSS. Fixed:
  - Optional: the rule message now says "one direct-child navigation bar", which is the scope R7 checks.
  - Optional: the copyable sample now includes a status bar.
  - Nits:
    - The header comment is rewrapped.
    - The tall-rail comment says the regions run to the status row.
    - The compact comment explains the hiding itself instead of pointing to the roadmap.
    - A docs line is rewrapped.
    - The `llm.md` status paragraph now follows the region rules.
  - FYI, no change: RTL and print aren't browser-tested; the spec leaves print out.
