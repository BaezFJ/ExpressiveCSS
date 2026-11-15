# Scaffold default regions: requirements

- Feature: `.scaffold`, a container that places an app's bar, rail, pane area and trailing toolbar
- Date: 2026-11-15
- Roadmap phase: [Phase 88: lay out the scaffold's default regions](../../../../roadmap.md#phase-88-lay-out-the-scaffolds-default-regions), the first phase of the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It falls under "Components and behaviors" in the [mission](../../../../mission.md), and the "Styling contracts" in the [technical constraints](../../../../tech-stack.md) govern it.
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by every phase of the milestone, which ships as one pull request.
- Base: `origin/master` at `017408139`

## Current behavior and need

ExpressiveCSS ships the parts of an app shell but nothing that places them. Four of the six bundled layout templates in `skills/expressivecss/assets/templates/` write their own `.app-shell` grid in a `<style>` block, and `layout-list-detail.html` writes a `main.workspace` grid. `layout-rail.html`, for example, makes the rail `position: sticky; top: 0; height: 100dvh` and wraps the header, `main` and the navigation bar in an `.app-content` column.

The parts each assume they own the page:

- `.navigation-rail` (`src/sass/components/_navigation-rail.scss`) has `min-height: 100dvh` and its own `overflow-y: auto`. Below 600px, and with `.modal`, an expanded rail becomes `position: fixed` with a scrim.
- A top app bar, `header:has(> :is(nav:not(.tabs, .navigation-bar, .navigation-rail), .bar))` in `src/sass/components/_navbar.scss`, is `position: sticky; top: 0`, and its scrolled fill runs on `animation-timeline: scroll(root)`, so it only fills when the document scrolls. That selector's specificity is (0,1,2).
- `AppBar` (`src/ts/components/appBar.ts`) collapses `.medium` and `.large` bars by watching a sentinel it inserts after the header, which only moves when the document scrolls. `BackToTop` (`src/ts/components/backToTop.ts`) watches and scrolls the window.
- `.toolbar.vertical` and `.toolbar-group.vertical` (`src/sass/components/_toolbar.scss`) are floating columns with elevation and no placement of their own. The bar's `--md-comp-toolbar-external-space` is 24px when vertical. Icon-only actions use `.tooltip.left` bubbles that are absolutely positioned outside the bar.
- `.panes` (`src/sass/components/_panes.scss`) is `height: 100%` and each pane scrolls its own body, so it needs a parent with a definite height. Its column switch follows the viewport unless an ancestor is a size container.

The design skill's [scaffold reference](../../../../../skills/expressivecss/expressivecss-design/references/scaffold.md) says scaffold regions "do not introduce a new framework component, class, or initialization API" and tells authors to "prefer document scrolling". This phase changes both.

## Scope

A CSS-only component:

- `.scaffold` on a `<div>` inside `<body>`, a grid as tall as the window. Its first row is the bar region across the full width; its second row holds the rail, pane and trailing regions.
- Direct children placed by component: a `header` in the bar region, a `.navigation-rail` in the rail region, `main` in the pane region, and a `.toolbar.vertical` or `.toolbar-group.vertical` in the trailing region.
- Region classes for custom content that isn't one of those components: `.scaffold-bar`, `.scaffold-rail`, `.scaffold-pane` and `.scaffold-trailing`.
- Only the pane region scrolls. The rail scrolls its own destinations when they don't fit.
- A top app bar in a scaffold fills on scroll from the pane's scroll, where the engine supports `timeline-scope`.
- Printing a scaffold prints the whole pane.
- A docs page, `llm.md` section, semantics row, decision record, design review entry, scaffold reference update, changelog entry and gzip budget line.

## Exclusions

These belong to later phases of the milestone, or stay out:

- A full-height rail modifier (phase 89), an outside rail toggle (phase 90), medium-window overlay (phase 91), compact document scrolling and the navigation bar (phase 92), the floating compact toolbar (phase 93), a status bar row (phase 94), the floating pane surface (phase 95), a side sheet column (phase 96), safe-area insets (phase 97) and moving the templates (phase 98).
- Any change to how the rail, app bar, toolbar or panes look or behave outside a `.scaffold`.
- Any TypeScript. The scaffold has no runtime, AutoInit entry or event.
- Collapsing `.medium` and `.large` app bars on pane scroll, and showing `.back-to-top` on pane scroll. Both components watch the window, so in a scaffold a flexible bar stays expanded and the back-to-top link stays hidden. Making them follow the pane is a runtime change to two components; the docs page states the limit.
- Moving a navigation rail's side panel below the bar. The panel is a top-layer popover that spans the window height beside its trigger, so in a scaffold it opens over the bar. It light-dismisses like any popover.
- Making the pane area a size container. Container queries would let `.panes` follow the pane's width instead of the window's, but `container-type` adds layout containment, which would make `main` the containing block for fixed-position descendants such as a FAB. The docs page tells authors who want that to set `container-type: inline-size` on `main` themselves, as the panes guide already does for nested layouts.
- Placement for other children. A child that is none of the listed components or region classes falls into grid auto-placement, as in any grid. The later phases add the navigation bar, status bar and side sheet.
- Below 600px this phase leaves the rail and toolbar where 1280px puts them. Phase 92 defines compact windows.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Class is `.scaffold`; app bar spans the top; rail, pane and trailing toolbar sit below it; the shell fills the window and only the pane scrolls | Confirmed by the user in the 2026-11-15 design discussion recorded in the roadmap | Matches Gmail on the web, which the roadmap names as the default. |
| Region classes are `.scaffold-bar`, `.scaffold-rail`, `.scaffold-pane` and `.scaffold-trailing` | Decided under delegation | M3's scaffold names the regions bars, rails and panes, and the roadmap calls the fourth "trailing". The `scaffold-` prefix keeps them from colliding with `.bar` (the app bar's inner element), `.pane` (a pane in `.panes`) and `.navigation-rail`. Unreleased, so cheap to rename. |
| `main` is the pane area. A `.panes` layout goes inside `main` and fills it; `main.panes` also works | Decided under delegation | The scaffold reference and the `pane-is-not-main` semantics rule both require one `main` with panes inside it. `.panes` is `height: 100%` with `min-height: 0`, and a stretched grid item gives its child a definite height, so `.panes` fills `main` with no extra rule. `main.panes` already matches `> main`. |
| The rail's `100dvh` gives way to the grid row with `min-block-size: 0` on `.scaffold > .navigation-rail` | Decided under delegation | (0,2,0) beats the rail's (0,1,0) `min-height`. The grid row stretches the rail to the region height, and the rail's own `overflow-y: auto` scrolls its destinations. The fixed `position` of a modal rail is left alone; phases 91 and 92 handle it. |
| The shell is `block-size: 100dvh` with `overflow: clip` | Decided under delegation | `dvh` follows a mobile browser's collapsing address bar, which `vh` doesn't. `body` margin is already 0 in `_normalize.scss`. `clip`, unlike `hidden`, also stops focus, `scrollIntoView` and find-in-page from scrolling the shell itself. Phase 92 lets the document scroll on compact windows. |
| The trailing toolbar is centered with `align-self: safe center` and inset by `--md-comp-toolbar-external-space`; it does not scroll | Decided under delegation | M3 places a vertical floating toolbar centered at the trailing edge with 24dp external space, which the token holds. A scrolling toolbar would clip its `.tooltip.left` bubbles, which a trailing toolbar is the most likely to use. Its actions are px-sized, so enlarged text doesn't grow it, and `safe` keeps its first action at the region's top if it is ever taller. |
| The app bar override is `.scaffold > header:has(> nav, > .bar)`, setting only `animation-timeline` to a timeline the pane area names, inside `@supports (timeline-scope: --a)` | Decided under delegation | Its (0,2,1) specificity beats the base rule's (0,1,2). Setting the longhand alone keeps the base rule's `animation` name and range. The pane area (`main` or `.scaffold-pane`) names the timeline, so the bar fills only when the pane area itself scrolls; when a `.panes` layout scrolls inside it, the bar stays at rest. Engines without `timeline-scope` keep the bar at rest, the spec default, as they already do. |
| Docs page sits in the Structure group after Panes | Decided under delegation | The scaffold places the Structure components, and Panes is the closest existing layout guide. |
| Material relationship is `pattern`, linked to the M3 scaffold overview, reviewed in `layout-material-review.md` | Decided under delegation | M3 describes the scaffold as a layout foundation, as it does the canonical layouts that Panes records as `pattern`. |

## Requirements

- **R1** `.scaffold` is a grid whose areas are `bar` across the first row and `rail`, `pane` and `trailing` across the second. Columns are `auto minmax(0, 1fr) auto` and rows `auto minmax(0, 1fr)`. It is `block-size: 100dvh` and `overflow: clip`, so at 1280px the document does not scroll.
- **R2** Direct children take regions by component: `header` and `.scaffold-bar` take `bar`, `.navigation-rail` and `.scaffold-rail` take `rail`, `main` and `.scaffold-pane` take `pane`, and `.toolbar.vertical`, `.toolbar-group.vertical` and `.scaffold-trailing` take `trailing`. An empty region takes no space: without a rail or toolbar the pane meets that edge, and without a bar the second row starts at the top. The zero-size sentinel `AppBar` inserts after a flexible bar moves no region.
- **R3** The pane region is the scroll container (`overflow: auto`, whose automatic minimum size is 0). Scrolling a long pane leaves the bar, rail and toolbar where they were. Custom `.scaffold-rail` and `.scaffold-trailing` content scrolls when it doesn't fit.
- **R4** A `.navigation-rail` in a scaffold runs from the bar's bottom edge to the window's bottom edge, and scrolls its own destinations when they don't fit. At 1280px, `.expanded` widens the rail column and narrows the pane by the same amount, with no overlap.
- **R5** A vertical toolbar or toolbar group in a scaffold is centered vertically in the trailing region and sits `--md-comp-toolbar-external-space` (24px when not set) from the window edge and from the pane. When it is taller than the region, its first action stays inside the region.
- **R6** A `.panes` layout inside the scaffold's `main`, and a `main.panes`, is as tall as the pane region, and each pane scrolls on its own.
- **R7** Under `dir="rtl"` the rail sits at the right edge and the toolbar at the left.
- **R8** In engines that support `timeline-scope`, a top app bar in a scaffold takes its scrolled fill from the pane area's scroll, through a `--md-comp-top-app-bar-timeline` property the app bar reads (falling back to `scroll(root)`): at rest when the pane is at the top, `surface-container` once it has scrolled 8px. Chromium supports it, so the check must run there.
- **R9** Text enlarged to 200% grows the bar through its existing `rem()` sizes, the pane still scrolls, and the rail's destinations can still be scrolled into view.
- **R10** In print, the scaffold and its pane area drop their fixed height and overflow, so the whole pane prints. The rail already hides in print.
- **R11** Every selector this phase adds starts at `.scaffold` or a region class. Outside a scaffold, a navigation rail is still at least `100dvh` tall, a top app bar keeps its `scroll(root)` timeline, and a vertical toolbar keeps no margin.
- **R12** A `scaffold` row in `semantics.json` is `enforced`, with these `fragmentSafe` `forbid` rules:
  - The scaffold is not a landmark: neither a landmark element (`main`, `nav`, `header`, `footer`, `aside`, `section`) nor a landmark, `region`, `document` or `application` role. Listing the roles instead of `[role]` keeps the rule from blocking the composite roles, which the semantics test would make the row account for.
  - It holds at most one visible child per region. Two visible bar, rail, pane or trailing children would overlap in one area. `hidden="until-found"` still takes part in layout, so it counts as visible.
  - Scaffolds don't nest: `.scaffold .scaffold`.
- **R13** The docs page `docs/src/pages/scaffold.astro` is listed in `docs/src/data/nav.ts` after Panes. It shows the four regions, the region classes, `.panes` inside `main`, RTL, scrolling, the app bar fill, `tabindex="-1"` on `main` with a skip link, and the excluded limits (flexible bar, back-to-top, rail panel, container queries). Its bounded live demo keeps the docs page to one `main` landmark.
- **R14** These records change:
  - `llm.md` gets a Scaffold section.
  - `docs/src/data/component-decisions.json` gets a `scaffold` record in catalogue order: `"runtime": "css-only"`, material status `material`, relationship `pattern`, `sourceRevision` pinned to a branch commit that holds the files, and a `capabilityReview` citing the partial and the browser test.
  - `skills/expressivecss/expressivecss-design/references/layout-material-review.md` gets a hand-written Scaffold entry.
  - `skills/expressivecss/expressivecss-design/references/scaffold.md` maps each region to the scaffold, drops the "no framework class" sentence, and says the scaffold scrolls the pane instead of the document.
  - `CHANGELOG.md` gets an Unreleased entry.
  - `tests/selective-builds.test.js` gets a reviewed gzip budget line.
  - `npm run build:semantics` and `npm run build:skill` rebuild the generated files, with the skill build last.
- **R15** A keyboard user can scroll the pane: with focus on `main` (given `tabindex="-1"`, as the docs page shows), Page Down scrolls it in every engine.
- **R16** The scaffold's landmarks keep source order: a `header` child is the banner, the rail is a navigation landmark and `main` is the main landmark. The scaffold itself adds none.

## Risks considered

- Concurrency: the component writes nothing and has no runtime.
- Bad input: an unknown child falls into grid auto-placement, as the exclusions say. Two children in one region or a nested scaffold are flagged by R12.
- Refusal: no permissions or tenants are involved.
- Other readers:
  - The rail's `min-height: 100dvh`, its modal `position: fixed` and its print hiding: R4, R10, R11. Its side panel: excluded.
  - The app bar's sticky position and `scroll(root)` fill: R8, R11. `AppBar`'s sentinel: R2. Its flexible-bar collapse and `BackToTop`: excluded, with the limit in the docs.
  - The vertical toolbar's floating shape and its `.tooltip.left` bubbles: R5, R11.
  - `.panes` height and viewport queries: R6, and the container-query exclusion.
  - The docs site landmark pass (`scripts/verify-site.mjs`): R13 keeps the demo inside the docs page's own `main`.
  - The semantics roster test: R12 adds the row the roster requires for the new partial.
  - The skill guide counts and reading budget in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`: plan group 3.
  - `mcp/expressivecss/smoke.mjs` search totals: plan group 4 runs the smoke test.
  - The bundled templates keep their own shell CSS until phase 98, so nothing in them changes.
- UI states: RTL (R7), enlarged text (R9), print (R10), keyboard scrolling (R15), landmarks (R16), an expanded rail (R4) and an empty region (R2). The scaffold adds no color, motion or focus style, so forced colors, reduced motion and dark theme come from the components it places. It works without JavaScript; the rail's toggle needs the rail's own runtime, as it does today. A popover or menu opened from the bar is in the top layer, so `overflow: clip` doesn't cut it.
- `specs/checklist.md` does not exist in this project.
