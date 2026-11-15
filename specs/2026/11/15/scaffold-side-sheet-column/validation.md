# Scaffold side sheet column: validation

Roadmap [phase 96](../../../../roadmap.md#phase-96-open-a-side-sheet-as-a-third-column). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`. A "sheet scaffold" is a full scaffold with a `dialog.side-sheet#sheet` (header and a paragraph) after `main`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | Sheet scaffold at 1440 × 800. | Measure the pane and toolbar; call `show()`; measure the sheet, pane and toolbar and read the sheet's border; call `close()`; measure the pane. | Open: sheet `position: static`, width 400, no inline-start border, left = pane right + 16, right = toolbar left − 24, top = bar bottom, bottom 800; pane width shrank by 416 within 1px; toolbar box unchanged. Closed: pane box as before. Watch fail before the change. | The sheet overlays the pane or toolbar, or the pane doesn't make room or doesn't get it back. | Pending |
| V2 | R3 | Sheet scaffold with `.tall-rail`, then one with a status bar, at 1440 × 800. | Open the sheet, read its position and measure it. | `position: static` in both. Tall rail: top 0, bottom 800. With a status bar: bottom = status bar top. | The sheet ignores the layout's rows. | Pending |
| V3 | R4 | Sheet scaffold at 1000 × 800; at 1440 with `showModal()`; at 1440 with `.side-sheet.start` and `show()`; at 1440 with `hidden` and `show()`; at 1440 open, resized to 1000 and back. | Open each and read its position and display; at 1000 also measure the pane. | Each is `position: fixed`; at 1000 the pane's box is unchanged; the hidden one is `display: none` and the pane keeps its box; the resized one is fixed at 1000 and static again at 1440. Watch the hidden case's pane box fail without the `[hidden]` exclusion. | The column rule leaks below 1200px, to modal, leading or hidden sheets. | Pending |
| V4 | R1 | Sheet scaffold without a toolbar at 1440 × 800; one whose `main` is `main.panes.list-detail`. | Open the sheet and measure. | No toolbar: sheet right = 1440, left = pane right + 16, pane width shrank by 400. Panes container: sheet left = pane right + 24, the panes layout's own margin. | The sheet leaves a gap at the window edge, or doubles the pane's gap. | Pending |
| V5 | R5 | Sheet scaffold with `dir="rtl"` at 1440 × 800. | Open the sheet and measure. | The sheet's right edge = pane left − 16; its left = toolbar right + 24. Watch fail before the change. | The sheet keeps its LTR side. | Pending |
| V6 | R1 to R5 | The phase 88 to 95 scaffold tests. | Run them. | All pass. | The fourth column moves an earlier region. | Pending |
| V7 | R6 | After `npm run build:skill`. | Run `check:generated`, selective-builds and component-decisions; grep "side-sheet" in the scaffold docs page and `llm.md` Scaffold section, "scaffold" in the side sheet docs page and its `llm.md` section, and a new changelog line. | Generated files current, budget and pin hold, records present. | A record is stale or missing, or the budget is exceeded. | Pending |
| V8 | R1 to R6 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

None. Placement and the pane's width are measured by the agent-run checks; the side sheet's own checks stay with its guide.

## Merge conditions

- All agent-run checks pass, with V6 as the regression check.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Fourteen findings, each checked against the source and fixed:
  - The width, bleed and padding resets were unplanned. They are now in the scope and R1.
  - The entry slide and a drag would paint over the toolbar. In the column the sheet has no entry slide and `z-index: auto`.
  - The print claim was wrong: the sheet prints as its overlay.
  - V2 couldn't fail. It now checks `position: static`.
  - V4 repeated V1. It now covers no toolbar and a non-floating pane.
  - The pane could shrink to nothing at 840px. The column now starts at 1200px.
  - `[hidden]` sheets, resizing, non-direct children, source order and the divider are now covered (scope, R4, V3, docs).
  - The compact template needs no fourth column.
- 2026-11-15, `/code-review high --fix --max-findings all` on `c940ffb9b..HEAD`: eight findings, each checked against the source.
  - Fixed by the review:
    - A dead `[hidden]` rule was removed; the base layer's `!important` rule already hides it.
    - The hidden-sheet test now checks that the pane keeps its box. With `[hidden]` dropped from `$_sheet-open` it fails.
    - The stale risk text was corrected.
    - The decision record names the sheet column.
  - Also fixed, though the reviewer skipped them:
    - The fourth track left an empty cell that a stray child would fill. The column now exists only while a sheet is open (R0).
    - `z-index: auto` let a `.fixed` toolbar cover the sheet. The sheet keeps its own stacking.
    - Dropping the bleed exposed the shell on a spring overshoot. The sheet now snaps back on the effects spring, which doesn't overshoot.
    - Long content was cut off. The sheet scrolls; the browsers' own dialog styles already scroll it, so the explicit rule is a safeguard.
    - An expanded-rail case at 1200px now checks the pane keeps at least 300px.
  - A combined mutation (no scrolling rule, `z-index: auto`) failed the new test on the stacking check.
  - The scaffold suite passes 114 of 114.
