# Scaffold floating pane: validation

Roadmap [phase 95](../../../../roadmap.md#phase-95-float-the-pane-on-a-surface). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 | Full scaffold at 1024 × 800 with color probes. | Read the scaffold's, pane's and app bar's backgrounds and the pane's radius; where `timeline-scope` is supported, scroll the pane and read the bar again. | Scaffold and bar match `surface-container`; pane matches `surface`; radius 16px; the scrolled bar matches `surface-container-high`. Watch fail before the change. | The shell stays the page color, the pane isn't set apart, or the bar stays `surface`. | Pending |
| V2 | R2 | Scaffolds at 1024 × 800: rail without toolbar, rail with toolbar, no rail, a hidden rail, rail with a status bar, rail with a `.scaffold-trailing`; the first at 700 × 800. | Measure the pane against its neighbors. | Top = bar bottom; leading edge = rail trailing edge (16 without a rail or with a hidden one); bottom 784 (status top − 16 with a status bar); trailing edge 1008 without a toolbar, the toolbar's left − 24 with one, and the custom region's left − 16 with `.scaffold-trailing`. At 700px the leading edge is 96. Watch fail before the change. | A gap is missing or doubled. | Pending |
| V3 | R3 | Full scaffold at 390 × 800. | Read the scaffold's and pane's backgrounds and the pane's radius. | Both backgrounds `rgba(0, 0, 0, 0)`; radius 0px. A guard: it passes before the change too. | The floating surface leaks into compact windows. | Pending |
| V4 | R4 | Scaffolds at 1024 × 800 with `main` holding `.panes.separated`, with `main` holding `.pane-layout.floating`, and with `main.panes.list-detail`. | Read `main`'s background, radius and box, and a pane's background. | Holding separated or floating panes: `main` transparent, radius 0, its trailing edge 1024 and its bottom 800 (no gaps); the panes match `surface-container-low`. `main.panes.list-detail`: its own `surface` color, radius 0, and the panes layout's 24px margins. Watch the first two fail before the change. | The pane area nests a surface or gaps around separated panes, or overrides a panes container's own layout. | Pending |
| V5 | R5 | Chromium, forced colors emulated, full scaffold at 1024 × 800. | Read the pane's border. | 1px solid. Watch fail before the change. | The pane disappears into the shell under forced colors. | Pending |
| V6 | R6 | Phases 88 to 94 scaffold tests. | Run them, adjusted for the moved pane edges. | All pass. | The floating surface breaks an earlier layout. | Pending |
| V7 | R7 | After `npm run build:skill`. | Run `check:generated`, selective-builds and component-decisions; grep "surface-container-high" and "rounded" in the docs page and `llm.md` Scaffold section, "rounded" in `scaffold.md`, and a new changelog line naming the rounded pane. | Generated files current, budget and pin hold, records present. | A record is stale or missing, or the budget is exceeded. | Pending |
| V8 | R1 to R7 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V9 | R5 | Windows with a contrast theme | Open the scaffold demo in Edge. | The pane's edge is visible against the shell. | No | Pending |

## Merge conditions

- All agent-run checks pass, with V6 as the regression check.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Eleven findings, each checked against the source and fixed:
  - The bar's scroll fill would vanish against a `surface-container` rest color. The scrolled color is now `surface-container-high`, and the docs claims are updated.
  - V7's grep strings couldn't fail. They are new strings now.
  - The trailing gap now depends on a shown floating toolbar (`.scaffold-trailing` gets 16px), and hidden regions count as absent.
  - `.panes` margins collided with the gaps. A pane area that is itself a panes container is left alone, and one holding separated or floating panes (with `.pane-layout`) gets no surface or gaps.
  - The 700px held column is now in R2 and V2.
  - V3 is labelled a guard, and V4 now has cases that fail first.
  - Corner clipping, `.scaffold-bar`'s shell color, the bar token selector, the 16px versus 24px gaps, `[vibrant]` and the demo box are now stated.
  The "unreleased" claim checks out: `.scaffold` sits under `[Unreleased]` with the package at 0.18.1.
