# Scaffold templates: requirements

- Feature: the bundled layout templates use `.scaffold` and drop their inline shell CSS
- Date: 2026-11-15
- Roadmap phase: [Phase 98: move the bundled templates to `.scaffold`](../../../../roadmap.md#phase-98-move-the-bundled-templates-to-scaffold), the last phase of the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It depends on phases 88 to 97 and falls under "Components and behaviors" in the [mission](../../../../mission.md).
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `15b206a0e`, after phase 97.

## Current behavior and need

The templates live in `docs/public/` and `npm run build:skill` copies them to `skills/expressivecss/assets/templates/`. The docs' Layout templates page previews them, and `tests/layout-templates-browser.test.js` copies each beside `dist` and checks it at 375, 800 and 1440px.

- `layout-compact`, `layout-rail`, `layout-dashboard` and `layout-expanded` each write an `.app-shell` grid with an `.app-content` column in a `<style>` block. Their rail and navigation bar swap through `hide-on-*` helpers, and the rail's own first-child button toggles it. The compact template shows its navigation bar at every width; the expanded one shows a navigation bar below 840px and an expanded rail from 840px.
- `layout-list-detail` makes `body` a full-height flex column around a `main.workspace` size container holding a `.list-detail` layout.
- `starter.html` is a document page (header, `main`, site footer) with no `<style>` block.

Phase 92 hides a scaffold's navigation bar from 600px up, which would leave a scaffold with no rail, like the compact template, without any navigation on wider windows.

## Scope

- The five app layout templates become `<div class="scaffold">` shells with no `<style>` block. Their `viewport` meta adds `viewport-fit=cover`.
- The rail templates use the scaffold's default layout, with the app bar across the top and the rail below it. They put the menu button in the app bar with `aria-controls` naming the rail; the rail drops its own toggle and the `hide-on-*` helpers; the navigation bar footer drops its helpers.
- The expanded template's rail starts collapsed in the markup. Its script, run after `AutoInit()` and on every change of `(width >= 840px)`, shows and expands the rail from 840px and gives the rail and the menu button `hidden` below, so the navigation bar shows up to 839px, as before. Without JavaScript the template shows a collapsed rail from 600px.
- `.container` and spacing helpers move from `main` to a `<div>` inside it, so the floating pane keeps its gaps; the compact template's 600px limit moves with them.
- Each app template gets a skip link inside its header and `tabindex="-1"` on `main`, as the scaffold guide asks.
- The list-detail template's `main` holds its `.list-detail` layout as a child (`main > .list-detail`), so the pane floats around it; the Back button keeps its `hide-on-expanded-and-up` helper, which is content, not shell.
- The scaffold keeps a navigation bar shown from 600px up when no rail is shown. It gets a `navbar` row above the status row in every 600px-up grid template (default, tall rail, and both side-sheet templates), and the shell drops its bottom safe-area padding while it shows, since the bar pads that inset itself.
- The test follows the templates, and the Layout templates page and the layout skill mention the scaffold.

## Exclusions

- `starter.html`: it is a document page without app-shell navigation, which the scaffold reference says scrolls best as a document, and it has no shell CSS to drop.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| `starter.html` stays as it is | Decided under delegation | The roadmap counts six templates, but the completion check (no shell `<style>` block, the same regions) already holds for the starter, and a document page gains nothing from a fixed-height shell. |
| From 600px up a scaffold hides its navigation bar only when a rail is shown | Decided under delegation | Phase 92 assumed every wide scaffold has a rail. Without one, hiding the bar removes the only navigation; the compact template shows the bar at every width. The `[hidden]` and `:empty` rules from phases 95 and 97 decide "shown". |
| The expanded template hides its rail and menu button below 840px with a short script, and expands the rail from 840px | Decided under delegation, revised after spec review | A static `.expanded` rail opens as the medium overlay (phase 91) on load. With the rail `[hidden]`, the scaffold shows the navigation bar instead (R5), so the template keeps its old regions at every width without a new scaffold option. |
| The app bar holds the menu button in every rail template | From the 2026-11-15 design notes | The milestone's design puts the menu button in the app bar, as Gmail does; phase 90 made that work, and phase 92 needs it to open the rail below 600px. |

## Requirements

- **R1** None of `layout-compact`, `layout-rail`, `layout-dashboard`, `layout-expanded` or `layout-list-detail` has a `<style>` element, `.app-shell` or `.app-content`, and none has a `hide-on-*` class on the rail, navigation bar or its footer. Each has a `.scaffold` that is a direct child of `<body>`, `viewport-fit=cover` in its viewport meta, a skip link in its header and `tabindex="-1"` on `main`; no template uses `.tall-rail`.
- **R2** At 390, 700 and 1280px (the roadmap's widths), copied beside `dist`, each template shows the same regions as before: the compact template a navigation bar at every width; the rail and dashboard templates a navigation bar below 600px and a rail from 600px; the expanded template a navigation bar below 840px and an expanded rail from 840px; the list-detail template the list everywhere and the detail from 840px. No template scrolls sideways, loads a missing asset or throws, and `main`'s content keeps its container width inside the floating pane.
- **R3** In the rail and dashboard templates the app bar's menu button toggles the rail and its `aria-expanded` at 1280px, and opens the overlay at 390px. In the expanded template it toggles the rail at 1280px and is hidden below 840px.
- **R4** The list-detail template keeps its focus contract: selecting an item at 375px shows and focuses the detail, Back returns focus to the item, and at 1440px both panes show.
- **R5** A scaffold with a navigation bar and no shown rail keeps the navigation bar at 700 and 1280px, spanning the scaffold with its bottom at the window's bottom, in the default and tall-rail layouts, and above a status bar when both show; the shell's bottom padding is 0 while it shows. With a shown rail it is hidden from 600px as before.
- **R6** These records change: `docs/src/pages/layouts.astro` names the scaffold and its template descriptions stay true; the scaffold docs page and `llm.md` section state the navigation bar rule; `skills/expressivecss/expressivecss-layout/SKILL.md` describes the expanded template's medium layout; `CHANGELOG.md`; the CSS budget; `npm run build:skill` last, which regenerates the bundled templates.

## Risks considered

- Two at once, bad input, refusal: no runtime input; the template script only calls `expand()` and `collapse()`.
- Other readers: the bundled skill copies (regenerated), the docs previews (iframes at a fixed height; the scaffold fills them), `scripts/verify-site.mjs` (the template pages stay present), the MCP guides that link templates, and the migration skill's `hide-on-*` notes (unchanged).
- UI states: RTL (the scaffold's), reduced motion, no JavaScript (the scaffold lays out without it; the rail can't toggle, as before), compact (the overlay rail).
- `specs/checklist.md` does not exist in this project.

## Decisions made while building

- **R7** (from the phase reviews) With a status bar shown below it, a navigation bar shown from 600px up pads 6px at the bottom instead of the bottom inset, which the status bar pads. Checked in V4, which now runs with the inset rewrite and fails with either padding rule removed.
- **R8** (from the phase reviews) The expanded template sets its first state (rail `hidden` or `.expanded`, menu button `hidden`) in a script that runs before the first paint, then starts the rail after `AutoInit()`. When a window narrows below 840px with focus in the rail or on the menu button, focus moves to `main`. Checked in V2.
- **R9** (from the phase reviews, revised after the Codex review) The list-detail template's panes follow the window width, the scaffold's default, so they switch at the same 840px as the Back button's `hide-on-expanded-and-up` helper. A container query on `main` would keep one pane at 840 to 871px, where the floating pane's margins make `main` narrower than 840px, while the helper had already hidden Back. Checked in V3 at 850px.
- The docs say what counts as a shown rail: anything except a rail with the `hidden` attribute or an empty `.scaffold-rail`. A `hide-on-*` helper does not count, because CSS can't see it. The status bar guide allows a status bar under the navigation bar in a scaffold without a rail.
- Changed after Javier's phone check on 2026-11-15: the rail templates drop `.tall-rail` and use the scaffold's default layout, with the app bar across the full width. The old shells ran the rail the full height, but templates should show the framework's default. R1 and V1 now require no `.tall-rail`.
- **R10** (added at Javier's request on 2026-11-15) Three more templates show the regions the first five leave out, each in the scaffold's default layout with a rail and the same shell rules as R1. `layout-toolbar` has a trailing vertical toolbar of page actions, which floats as a row below 600px. `layout-status` has a status bar shown from 600px up; its navigation bar is a bare `nav` because the status bar is the page's footer. `layout-sheet` opens a project's details in a standard side sheet that is a column from 1200px and an overlay below, moves focus to the sheet's heading, and returns it to the project when the sheet closes. The Layout templates page, the skill copies, the site check and the skill guides list them. Checked in V1, V2 and V8.
- **R11** (added at Javier's request on 2026-11-15) `layout-workspace` uses every region at once: app bar, rail, pane, side sheet, trailing toolbar, status bar, and a bare navigation bar, in that source order so Tab follows pane, sheet, toolbar. It combines the R10 behaviors, and from 1200px the open sheet sits between the pane and the toolbar, with the toolbar ending above the status bar. Checked in V8.
- **R12** (added at Javier's request on 2026-11-15, from Google's scaffold rails diagram) From 600px up a trailing vertical toolbar in a scaffold has a 4px inline margin instead of the toolbar's 24px external space, so the trailing rail hugs it as Material draws it. The margin is still the pane's (or sheet's) gap on that side. Checked in V4's neighbors: the scaffold browser suite asserts 4px from the pane, the window edge, the sheet, the safe-area inset and under RTL.
- **R13** (added at Javier's request on 2026-11-15) From 1200px up the sheet column is Material's detached side sheet: `--md-sys-shape-corner-large` on every corner, the pane's gaps above (16px with no bar or beside a tall rail's bar) and below, and 16px after it, or the toolbar's 4px margin beside a toolbar. Screen only, like the pane. Evidence: material-components-android tokens give the docked standard sheet `Corner.None` and the detached sheet `shapeAppearanceCornerLarge`, the token the pane uses. Checked in the scaffold browser suite's sheet column tests.
