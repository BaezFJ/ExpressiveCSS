# Scaffold compact scrolling: validation

Roadmap [phase 92](../../../../roadmap.md#phase-92-scroll-the-document-on-compact-windows). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`. A "compact scaffold" is a full scaffold (app bar with `aria-controls="rail"` menu button, rail, 3000px `main`, vertical toolbar) plus a `<footer>` holding `nav.navigation-bar`, rail started with `NavigationRail.init`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | Compact scaffold at 390 × 800. | Read the scaffold's height, `main`'s scroll and client heights; scroll the window by 1000px; measure the app bar. | The scaffold is taller than 800, `main`'s scroll height equals its client height, `window.scrollY` is 1000, and the bar's top is 0. Watch fail before the change. | The scaffold keeps the window height, `main` scrolls, or the bar scrolls away. | Pending |
| V2 | R3, R8 | Compact scaffold at 390 × 800, then the same with a bare `nav.navigation-bar` child; the first at 599, 600 and 1280 wide; a `.modal` rail at 599. | Scroll the window by 1000px and measure the bar region; at each width read the bar's and the rail's `display` and `main`'s left edge. | The region spans 0 to 390 and its bottom is 800 mid-scroll, in both forms, and `elementFromPoint` at its center hits the bar. At 599 the bar shows, the rail is `none` and `main` starts at 0, also with `.modal`. At 600 and 1280 the bar is `none`; at 600 `main` starts at the collapsed rail width. | The bar scrolls away, sits under content, or shows on wide windows. | Pending |
| V3 | R4 | Compact scaffold at 390 × 800, and one with a `.scaffold-rail` instead of the rail. | Read the rail's `display`, press Tab through the page and collect focused ids; focus the menu button, press Enter, read the rail's position; focus a destination, press Escape; expand again and tap the scrim at (370, 400). Read the `.scaffold-rail`'s `display`. | Collapsed, the rail is `none` and no destination takes focus. After Enter it is `fixed`; after Escape it is collapsed and the menu button has focus; the scrim tap collapses it. The `.scaffold-rail` is `none`. Watch fail before the change. | The rail shows or takes focus while collapsed, or the overlay doesn't open or close. | Pending |
| V4 | R5 | Compact scaffold in engines where `CSS.supports('animation-timeline', 'scroll()')`. | Read the bar's `--md-comp-top-app-bar-scroll`, scroll the window by 100px, read it again. | 0, then 1. Watch fail before the change. | The bar keeps reading the pane timeline and never fills. | Pending |
| V5 | R6, R7 | Compact scaffold, then the same with `.tall-rail`. | Measure the toolbar against `main`, scroll it into view; read the tall-rail scaffold's rail `display` and `main`'s left edge. | The toolbar's top is at or below `main`'s bottom and can be scrolled into the window. In the tall-rail scaffold the rail is `none` and `main` starts at 0. | The toolbar overlaps the pane or is unreachable, or the tall rail keeps its column. | Pending |
| V6 | R8 | The phase 88 to 91 scaffold and rail browser tests. | Run them. | All pass. | The compact rules leak into wider layouts. | Pending |
| V6a | R8a, R8b | Compact scaffold whose `main` holds a `.panes.list-detail` with a 2000px list body; compact scaffold with `header.medium` started with `AppBar`. | Read the list body's scroll and client heights and the document height; in the second, compare region boxes before and after `AppBar.init`. | The list body doesn't overflow and the document is taller than the window. The sentinel leaves every region's box unchanged. | Panes keep scrolling inside a page that also scrolls, or the sentinel shifts a region. | Pending |
| V7 | R9 | After `npm run build:skill`; the built docs site at 390px. | Run `check:generated`, the selective-builds and component-decisions tests; grep "Below 600px" in the docs page and in `llm.md`'s Scaffold section, "document scrolls" in `scaffold.md`, "hide-on-compact-only" in the docs page and `llm.md`, and a changelog line naming the navigation bar region; confirm "never scrolls the document" is gone from the docs page; open `_site/scaffold.html` at 390 × 800 and measure the demo box against its scaffold. | Generated files current, budgets and pin hold, every string is where it should be, and the demo's content stays inside its box. | A record is stale or missing, a budget is exceeded, or the demo spills over the page. | Pending |
| V8 | R1 to R9 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V9 | R1, R3 | A phone browser with a collapsing address bar | Open a scaffold page and scroll. | The address bar collapses, and the app bar and navigation bar stay pinned. | No | Pending |

## Merge conditions

- All agent-run checks pass, with V6 as the regression check.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Ten findings, each checked against the source and fixed:
  - The AppBar sentinel isn't placed by the grid. The flexible-bar limit stays, and R8b and V6a check that the sentinel moves no region.
  - The demo's inline height beats a compact rule. The demo now moves into a wrapper box that `docs.css` styles (R9).
  - `.hide-on-compact-only` is `!important` and would keep the rail from opening. The decision now says so, and the docs will too.
  - The `.modal` held column would beat the compact grid. It now applies from 600px only.
  - `.scaffold-rail` had no compact area. It is hidden below 600px (R4, V3).
  - Opening from `display: none` doesn't animate, and focus after a scrim tap goes to the page. Both are stated in the exclusions, and the scrim tap is checked.
  - `.panes` grow with their content on compact windows. The claim is corrected and checked (R8a, V6a).
  - V7's grep strings couldn't fail. They are now new strings, and the removal of the old one is checked.
  - The stale "never scrolls the document" text, the limits and the partial comment are now in R9 and the scope. Back-to-top overlapping the bar is an exclusion.
  - The 599px and 600px boundary is now in R8 and V2. Landscape phones, the required outside menu button and a non-direct-child navigation bar are now in the exclusions.
- 2026-11-15, `/code-review high --fix --max-findings all` on `fc08a9e75..HEAD`: ten findings, each checked against the source and all fixed:
  - Only a header app bar pinned below 600px. The bar region is now sticky for a `.scaffold-bar` too (R2), with a test.
  - A vertical toolbar stretched across the one-column grid (342px). It now sits at the inline end (R6), with a test.
  - The demo's sticky bars painted over the site's app bar. The demo box isolates its stacking.
  - Below 600px the demo bar filled from the page's scroll. It now reads `scroll(nearest)` there.
  - Stale anatomy and demo text was rewritten.
  - The test's hand-written comma splitter now uses `splitSelectorList` from `tests/css.js`.
  - An exact pixel assert now uses `near()`.
  - An unused binding was removed.
  - The header comment was rewrapped.
  - The navigation bar region matched a `<footer>` that also held other content, which then took page-footer padding and stuck to the bottom. The reviewer left this choice open; I settled it under delegation. The region is now a `<footer>` whose only child is the navigation bar, matching the page-footer rule's exemption. A footer with more content stays a page footer, with a test.
  CSS budget 92,373 (+131 over the phase base). The scaffold browser suite passes 71 of 71.
- 2026-11-15, `code-review-and-quality` (five-axis review by an independent read-only subagent): no Critical findings. Fixed:
  - Required: the 599px `.modal` check passed even with the held column leaking below 600px. It now also checks the pane's width; with the rule moved out of its media query it fails (96 vs 599).
  - Optional: the docs and `llm.md` didn't say the bar fills from the document's scroll below 600px. Both now do.
  - Optional: the decision record listed one compact browser check and no compact gap text. It now lists the hidden-rail and boundary checks and names the compact layout in its gaps.
  - Nits:
    - The header comment now separates the 600px-up and below-600px behavior and says the bar region pins.
    - The held-column comment says it applies from 600px up.
    - The design reference's skip-link advice moved to the 600px-up sentence.
  - FYI, checked and needing no change: stacking, sticky bars, the sentinel, the boundary, RTL, print, empty regions and the demo box.
