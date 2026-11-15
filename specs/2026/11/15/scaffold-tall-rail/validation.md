# Scaffold tall rail: validation

Roadmap [phase 89](../../../../roadmap.md#phase-89-run-the-rail-the-full-height). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`. A "full scaffold" is the one phase 88's browser test builds: a top app bar, a four-destination rail, a 3000px `main` and a three-action vertical toolbar.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | Full scaffold with `.tall-rail` at 1280 × 800, then with the root font size at 32px. | Measure the rail, bar, pane and toolbar and read the scaffold's `grid-template-areas`. | The rail spans 0 to 800 at the leading edge. The bar's left edge equals the rail's right edge and its right edge equals the pane's. The pane's top equals the bar's bottom. The toolbar is 24px from the right edge and from the pane, and centered between 0 and 800. The areas read `"rail bar trailing" "rail pane trailing"`. At 32px the rail still spans 0 to 800 and the pane's top still equals the taller bar's bottom. | The rail starts below the bar, the bar spans the rail or the trailing column, or the toolbar is centered below the bar. | Pass (2026-11-15), all three engines; seen failing before the modifier existed |
| V2 | R3 | The phase 88 browser tests. | Run them unchanged. | All pass. | The modifier rule leaks into the default layout. | Pass (2026-11-15): phase 88 scaffold tests unchanged and passing |
| V3 | R4 | Full tall-rail scaffold with `dir="rtl"`. | Measure the rail, bar and toolbar. | The rail's right edge is 1280 and it spans 0 to 800; the bar's right edge equals the rail's left edge; the toolbar's left edge is 24. | Any of them keeps its LTR side. | Pass (2026-11-15), all three engines; seen failing before the modifier existed |
| V4 | R5, R6 | Full tall-rail scaffold at 1280 × 800, then the same with no rail and no toolbar. | Add `.expanded` to the rail and measure the bar and pane; in the second, measure the bar and pane. | Expanded, both the bar's and the pane's left edges equal the rail's right edge. Without a rail or toolbar the bar spans 0 to 1280 and the pane's edges match it (regression). | The expanded rail overlaps the bar or pane, or an empty region leaves a gap. | Pass (2026-11-15), all three engines, with a 500px modal case added after review |
| V5 | R7 | Full tall-rail scaffold in Chromium (regression). | Read the bar's `--md-comp-top-app-bar-scroll`, scroll `main` by 100px, read it again. | 0 at rest, then 1. | The tall-rail bar loses the pane timeline. | Pass (2026-11-15) where `timeline-scope` is supported, Chromium included |
| V6 | R8 | After `npm run build:skill`. | Run `npm run check:generated`, the component-decisions and selective-builds tests, and read the docs page, `llm.md`, `scaffold.md` and the changelog. | Generated files are current, the pin and budget hold, and each record names `.tall-rail`. | A record is missing the modifier, a generated file is stale, or the CSS exceeds its budget. | Pass (2026-11-15): check:generated current, budget 92,098 (+22), records name `.tall-rail` |
| V7 | R1 to R8 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pass (2026-11-15): verify 3,950 of 3,950 and docs:verify; MCP smoke and verify:packages pass |

## Human checks

None. The modifier changes grid placement only, which the agent-run checks measure; phase 88's screen reader and mobile checks still cover the scaffold.

## Merge conditions

- All agent-run checks pass, with V2 as the regression check.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Findings, each checked against the source and fixed:
  - High: the first draft spanned the bar over the trailing column and claimed no roadmap phase asked for a pane-only bar. Phase 89's own text says "the app bar sits over the pane area only". The spec now follows the roadmap: the areas are `"rail bar trailing" "rail pane trailing"`.
  - Medium: R5 ignored the fixed modal rail below 600px and with `.modal`. It is now limited to 600px and up, with a note.
  - Medium: V4's no-rail case and V5 can't fail because of the modifier. Both are now labelled regression checks.
  - Low: the rail panel limit, the docs demo choice, enlarged text and the hand-written `scaffold.md` are now covered in the risks, decisions, R2/V1 and R8/V6.
- 2026-11-15, `/code-review high --fix --max-findings all` on `abd59e7c5..HEAD`: the CSS was correct, and there were seven findings in the tests, records and comments. All fixed:
  - The tall-rail timeline check now runs wherever `timeline-scope` is supported and asserts 0 before the scroll.
  - The 200% check uses tolerance instead of exact pixels.
  - A wasted measurement was removed.
  - The header comment was rewrapped, and its pin updated.
  - The docs limit line now names the tall rail.
  - The RTL test now checks that the bar stops at the pane and the toolbar is centered.
  - The results are filled in below once V6 and V7 run.
- 2026-11-15, `code-review-and-quality` (five-axis review by an independent read-only subagent): no Critical or Required findings; R1 to R8 trace to code and tests that fail without the rule. Fixed:
  - Optional: R5's below-600px sentence had no test. A 500px case now checks that the expanded rail is `position: fixed` and the bar starts at 0.
  - Nit: the docs limit wording implied the panel differs by layout. It now says "in either layout".
  - Nit: the 200% check now asserts that the bar grew.
  - Nit: the decision record's `documentedSupport` is split into two sentences.
- 2026-11-15, local Codex review (`codex review --base abd59e7c5`, saved as `codex-review-phase-89.txt` in the worktree's git dir, read to its last line): "No actionable defects found." Its sandbox couldn't launch Chromium or WebKit, so 23 browser cases failed there. The same tests pass in this session's verify run. Nothing to fix or reject.
