# Scaffold templates: validation

Roadmap [phase 98](../../../../roadmap.md#phase-98-move-the-bundled-templates-to-scaffold). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/layout-templates-browser.test.js tests/scaffold-browser.test.js`, then `npm run verify`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 | The five template files in `docs/public/` and the bundled copies. | Read each file. | No `<style`, `app-shell` or `app-content`; no `hide-on-` on the rail, navigation bar or footer; a `<div class="scaffold` right after `<body>`; `viewport-fit=cover`; a `visually-hidden-focusable` skip link; `main` with `tabindex="-1"`; no `tall-rail` (the default layout); the bundled copies match. | A template keeps shell CSS, a shell helper, or misses a required piece. | Pass. The static test in `tests/layout-templates-browser.test.js` reads each template and its bundled copy: no shell CSS or shell helper, the scaffold is the body's child, `viewport-fit=cover`, a skip link in the header, a focusable `main`, no `tall-rail` (changed after the phone check), and the copies match. |
| V2 | R2, R3 | Each template copied beside `dist`, in Chromium, Firefox and WebKit. | At 390, 700 and 1280px check the navigation bar's and rail's visibility, sideways overflow, load errors and the content container's width; click the app bar menu button at 1280 and, in the rail and dashboard templates, at 390. | As R2 and R3: the expanded rail reads `aria-expanded="true"` at 1280 before the click; at 390 the rail and dashboard overlays open; the expanded template's menu button is hidden at 700. | A region appears or vanishes against R2, the content loses its width, or the toggle does nothing. | Pass in Chromium, Firefox and WebKit: regions per width, no overflow or load errors, the container's share of `main`, `main` floating with a 16px gap and rounded corners, the menu button toggling at 1280 and opening the overlay at 390, and the expanded menu button hidden at 700. Watched it fail with the expanded template's `hidden` line removed. |
| V3 | R4, R9 | The list-detail template at 375 and 1440px. | Select an item, check focus, press Back, check focus, resize to 1440. | As R4. | The focus contract breaks. | Pass in all three engines (the same test file), including both panes and a hidden Back button at 850px after a selection. Watched the 850px check fail with a container query on `main`. |
| V4 | R5 | Scaffolds at 700 and 1280 × 800 with a navigation bar and no rail: default, `.tall-rail`, and with a status bar; the same with a rail. | Read the navigation bar's display and box, the status bar's box and the shell's bottom padding. | Without a rail it shows, spans the scaffold, its bottom is 800 (or the status bar's top), and the shell's bottom padding is 0; with a rail it is `none`. Watch fail before the change. | A rail-less scaffold loses its navigation on wide windows. | Pass in all three engines, with the inset rewrite: default, tall rail, bare bar, hidden rail and empty custom rail at 700 and 1280; above a status bar (6px vs 20px); hidden with a shown rail, where the shell pads 20px again; and with an open side sheet column. Watched it fail before the change, and again with the shell rule and with the status-bar rule each removed. |
| V5 | R6 | After `npm run build:skill`. | Run `check:generated`, selective-builds and component-decisions; grep "scaffold" in `layouts.astro` and confirm its expanded description still says the navigation bar takes over below 840px, grep "no rail is shown" in the scaffold docs page and `llm.md` Scaffold section, and a new changelog line. | Generated files current, budget and pin hold, records present. | A record is stale or missing, or the budget is exceeded. | Pass. `npm run build:skill` and `check:generated` are current; selective-builds (budget 93,529) and component-decisions (the new `_scaffold.scss` pin) pass; `layouts.astro` names the scaffold and the expanded description still says the navigation bar takes over below 840px; the scaffold page and the llm.md Scaffold section say "no rail is shown"; and there are new changelog lines. |
| V6 | R1 to R6 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pass. `npm run verify` 4,062 of 4,062 with docs build and docs:verify, `npm test --prefix mcp/expressivecss` (MCP smoke) and `npm run verify:packages` pass on the final tree. |

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
- 2026-11-15, built-in `code-review` (`high --fix --max-findings all 15b206a0e..HEAD`), eleven findings, each checked against the source:
  - It fixed three: the safe-area paragraphs in `llm.md` and the scaffold page now name the navigation bar, `RAIL_FROM` no longer lists the compact template, and a changelog line is rewrapped.
  - It skipped the rest, and the quality review below raised them again, so they were fixed in the same pass: the doubled inset above a status bar, the expanded template's first paint, the shown-rail definition for helper-hidden rails, the status bar guidance, the list-detail container, and the repeated rail selector.
  - Rejected, outside the phase: the dashboard skill's reference implementation (`expressivecss-dashboard/assets/analytics-overview.html`) still writes its own shell grid. This phase covers the five bundled templates, and the dashboard skill owns that file.
- 2026-11-15, five-axis quality review by an independent read-only subagent (Plan agent). Ten findings, all fixed:
  - Required: V4 couldn't fail on the shell padding because desktop insets are zero. It now runs with the inset rewrite, checks the bar's own 20px padding and the side insets, and checks that the shell pads 20px again with a rail.
  - Required: the bottom inset doubled with a navigation bar above a status bar. Fixed with R7.
  - Required: the docs now say what counts as a shown rail, in the scaffold page, llm.md, the design reference and the changelog.
  - Nits: the status bar wording in the scaffold and status bar pages, the changelog and the decision record's `documentedSupport` now mention the navigation bar; the template test checks that `main` floats; V4 adds the hidden and empty rail cases and an open side sheet; the records are filled in.
  - Optional: the expanded template's focus and first paint (R8), the list-detail container (R9, later revised, see the Codex review), and a single `$_rail-shown` variable.
  - CSS budget 93,529. The scaffold, template, selective-builds, component-decisions and status bar suites pass 162 of 162.
- 2026-11-15, local Codex review (`codex review --base 15b206a0e`, saved as `codex-review-phase-98.txt` in the worktree's git dir, read to its last line). One [P2] finding, confirmed and fixed: with `container-type` on the list-detail template's `main`, the panes kept one column at 840 to 871px while the Back button's window-based helper was already hidden, which stranded the detail pane. The panes now follow the window again (R9 revised), and V3 checks 850px. Codex couldn't launch browsers in its sandbox, so it ran only the build, generated and static checks.
