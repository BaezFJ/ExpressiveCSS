# Scaffold templates: validation

Roadmap [phase 98](../../../../roadmap.md#phase-98-move-the-bundled-templates-to-scaffold). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/layout-templates-browser.test.js tests/scaffold-browser.test.js`, then `npm run verify`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 | The five template files in `docs/public/` and the bundled copies. | Read each file. | No `<style`, `app-shell` or `app-content`; no `hide-on-` on the rail, navigation bar or footer; a `<div class="scaffold` right after `<body>`; `viewport-fit=cover`; a `visually-hidden-focusable` skip link; `main` with `tabindex="-1"`; `tall-rail` on the rail templates; the bundled copies match. | A template keeps shell CSS, a shell helper, or misses a required piece. | Pending |
| V2 | R2, R3 | Each template copied beside `dist`, in Chromium, Firefox and WebKit. | At 390, 700 and 1280px check the navigation bar's and rail's visibility, sideways overflow, load errors and the content container's width; click the app bar menu button at 1280 and, in the rail and dashboard templates, at 390. | As R2 and R3: the expanded rail reads `aria-expanded="true"` at 1280 before the click; at 390 the rail and dashboard overlays open; the expanded template's menu button is hidden at 700. | A region appears or vanishes against R2, the content loses its width, or the toggle does nothing. | Pending |
| V3 | R4 | The list-detail template at 375 and 1440px. | Select an item, check focus, press Back, check focus, resize to 1440. | As R4. | The focus contract breaks. | Pending |
| V4 | R5 | Scaffolds at 700 and 1280 × 800 with a navigation bar and no rail: default, `.tall-rail`, and with a status bar; the same with a rail. | Read the navigation bar's display and box, the status bar's box and the shell's bottom padding. | Without a rail it shows, spans the scaffold, its bottom is 800 (or the status bar's top), and the shell's bottom padding is 0; with a rail it is `none`. Watch fail before the change. | A rail-less scaffold loses its navigation on wide windows. | Pending |
| V5 | R6 | After `npm run build:skill`. | Run `check:generated`, selective-builds and component-decisions; grep "scaffold" in `layouts.astro` and confirm its expanded description still says the navigation bar takes over below 840px, grep "no rail is shown" in the scaffold docs page and `llm.md` Scaffold section, and a new changelog line. | Generated files current, budget and pin hold, records present. | A record is stale or missing, or the budget is exceeded. | Pending |
| V6 | R1 to R6 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V7 | R2 | A phone | Open each template from the docs' Layout templates page. | Each shows its navigation and opens the rail from the app bar where it has one. | No | Pending |

## Merge conditions

- All agent-run checks pass.
- The milestone pull request's required CI checks and reviews are done.

## Review record
- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Thirteen findings, each checked against the source and fixed:
  - The list-detail Back button's helper is content, so R1 now bans helpers only on shell regions.
  - `main.container` would break the floating pane, so the container moves inside `main`.
  - The navigation bar row was missing from the 600px-up templates, and its safe-area inset would double. R5 and V4 now cover the default, tall-rail and status-bar cases and the shell padding.
  - The rail templates now use `.tall-rail`.
  - The 700px deviation isn't needed. Hiding the expanded template's rail below 840px brings the navigation bar back, so the template keeps its old regions, and the deviation is withdrawn.
  - The test widths are now the roadmap's 390, 700 and 1280px.
  - The expanded script's order and resize handling, the 390px menu button, the Layout templates descriptions, the list-detail markup, skip links, `viewport-fit=cover` and V5's strings now have requirements or checks.
