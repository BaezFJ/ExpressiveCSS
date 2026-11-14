# Status bar: requirements

- Feature: `.status-bar`, a thin information bar along the bottom of an app shell, modeled on the VS Code status bar
- Date: 2026-11-14
- Roadmap phase: none. This is an ad hoc component outside the [roadmap](../../../../roadmap.md). It falls under the "Components and behaviors" scope of the [mission](../../../../mission.md), and the "Styling contracts" section of the [technical constraints](../../../../tech-stack.md) governs it.
- Branch: `feature/2026-11-14-status-bar`
- Base: `origin/master` at `44024884b`

## Current behavior and need

ExpressiveCSS has no dense bar for ambient application state. The closest pieces miss the job:

- `.toolbar.docked` (`src/sass/components/_toolbar.scss`) is 64dp tall with 48dp actions, holds commands only and follows the M3 `md.comp.toolbar.*` token sets.
- `.page-footer` is a site footer with link columns.

Authors of editor-style and dashboard apps who want a VS Code-like bar of branch, sync, problem counts, cursor position, account and notifications have to write their own CSS. M3 has no component for this, and in M3 "status bar" names the operating system's bar, so this is a framework extra like the command palette and KPI card.

## Scope

A CSS-only component:

- A bar root, `.status-bar`, written as `<footer>` or as `<div role="region" aria-label="Status">`.
- Items as direct children: `<button>` for an item that opens something, `<a>` for one that goes somewhere, `<span>` for read-only text. An item holds a Material Symbols icon, text, or both.
- `.end` on the first trailing item starts the end group.
- A `.vibrant` bar. One item is colored with the existing color helpers.
- `data-priority="low"` items hidden at compact widths, and wrapping for items that still don't fit.
- The page footer stepping aside for a `<footer class="status-bar">`.
- A docs page, `llm.md` section, semantics row, decision record, design review entry, changelog entry and gzip budget line.

## Exclusions

- Any TypeScript, AutoInit entry or event. Items that open menus or tooltips use those components' own markup and runtime.
- A JS overflow manager that moves hidden items into a "more" menu. Add it if compact-width priority hiding proves too coarse.
- Arrow-key roving focus. Every item is a tab stop, as in the toolbar.
- Item color classes such as `.emphasis`, `.error` or `.warning`. `.error` is already a color helper in the utilities layer and would beat any component rule, and the helpers (`.primary`, `.error-container` and their `-text` pairs) already cover item color. A warning color would need a shared role that no component defines yet.
- A tooltip demo. CSS-only tooltips on small buttons currently collapse to one character wide everywhere in the framework (a 40px `.circle` button shows the same). That is a separate tooltip fix.
- A `.fixed` variant. The bar is sticky in flow. Add `.fixed` if authors need it outside a scrolling shell.
- Moving the snackbar or back-to-top button above the bar. They already overlap every bottom bar (`_snackbar.scss` has no bottom-bar offset), and changing that is a separate fix.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Name is `.status-bar` | Confirmed by the user | Matches VS Code, JetBrains and Windows. The docs page notes the overlap with the OS "status bar" term the layout skill uses. |
| New component, not a toolbar variant | Confirmed by the user | The toolbar is 64dp, holds commands only and is tied to M3 tokens. This bar is a third of that height and mixes read-only text with commands. |
| Stays visible at compact widths; docs say not to show it with `nav.navigation-bar` | Confirmed by the user | The toolbar documents the same limit ("Do not show a toolbar at the same time as nav.navigation-bar"). Authors hide the bar if they want. |
| Narrow-width hiding uses the compact media query (`width < 600px`) instead of a container query | Decided from evidence | `container-type: inline-size` adds layout containment, which makes the bar the containing block for fixed-position descendants and would trap a menu or tooltip fallback positioned inside it. The bar spans the window, so the window width is the bar width. |
| Placement is `position: sticky; inset-block-end: 0`, in flow | Decided from evidence | An app shell puts the bar last. Sticky keeps it at the bottom of a long page and leaves it in flow, so content never hides under it. `.fixed` can be added later. |
| Stacking reuses `--expressive-z-toolbar` | Decided from evidence | Both are bottom bars at the same tier in `tokens/_stacking.scss`, so a new public token adds nothing. |
| Item targets are 24 × 24 CSS px minimum, with no coarse-pointer growth | Decided from evidence | 24px meets WCAG 2.2 SC 2.5.8 (AA), and the framework has no `pointer: coarse` precedent. M3's 48dp target is not met; the docs page says so and suggests hiding the bar on touch layouts. |
| `.vibrant` uses primary-container, as `.toolbar.vibrant` does | Decided from evidence | Keeps the two bars consistent. Colors go through `--md-comp-status-bar-*` tokens pointed at system roles, so the `[vibrant]` foundation repaints the bar with no component code, as it does the toolbar. |
| `.end` is scoped under `.status-bar` | Decided from evidence | `.popover.end` already uses `.end`, so unscoped selectors would collide. |
| Items that don't fit wrap instead of scrolling inside the bar | Decided during the build | A scrolling bar (`overflow-x: auto`) also clips vertically, which cut off CSS-only tooltips and badges rising above an item, and Firefox made the bar itself a tab stop when it overflowed. Wrapping keeps every item visible and reachable and never scrolls the page. |
| Item hover is a `background-image` overlay, and `_buttons.scss` leaves `.status-bar > *` out of the common button rules | Decided during the build, revised after `/code-review` | The overlay shows over a helper fill. Restating one state at a time missed plain `:focus`, the pressed corner shape, `aria-pressed` colors and `.disabled`/`aria-disabled`, so the bar's items now skip the whole common button stack. `.status-bar > *` keeps the `:not()` at one class of specificity, and the guard in `tests/regressions.test.js` now accepts `.class > *` entries alongside bare classes. |
| The page, pane and questionnaire footer rules skip `footer.status-bar` | Decided during the build, extended after `/code-review` | Each styles a bare `<footer>`. Each already skips a footer around a lone navigation bar, and the same `:not()` now skips the status bar without changing the selector's specificity. |
| A plain `<div>` bar takes `role="region"` | Decided after `/code-review` | ARIA prohibits `aria-label` on the generic role, so a labelled plain `<div>` has no name. A named region keeps the bar reachable as a landmark, like the footer form. |

## Requirements

- **R1** `.status-bar` is a full-width row: flex, `flex-wrap: wrap`, `align-items: center`, `min-block-size: rem(24px)`, surface-container background, on-surface-variant text and the complete body-small type role (size, line height, weight, letter-spacing). It is `position: sticky; inset-block-end: 0` with `z-index: var(--expressive-z-toolbar)`, and pads its block end by `env(safe-area-inset-bottom, 0px)`.
- **R2** Direct `button`, `a` and `span` children lay out as items: inline-flex, centered, a 4px gap between icon and text, 8px inline padding, and `min-block-size` and `min-inline-size` of `rem(24px)`. A Material Symbols icon in an item is `rem(16px)`.
- **R3** Button and link items drop native chrome: transparent background, no border, inherited color and font, no underline. Hover and pressed draw a state layer from the shared state tokens as a `background-image`, over any fill. The global filled-button fill never shows on hover, press or focus. Focus draws the `focus-ring` mixin with a negative offset, inside the item. A disabled button or link (`disabled`, `.disabled` or `aria-disabled="true"`) is drawn at 38% opacity, so a helper fill dims too, ignores pointer events as a common disabled button does, and shows no state layer. Pressing keeps the item square, and `aria-pressed` adds no fill. Read-only `span` items get no state layer.
- **R4** The first item carrying `.end` gets `margin-inline-start: auto`, which pushes it and every later item to the end. Below 600px, when that item is a hidden `data-priority="low"` item, the first visible `.end` item takes over. Logical properties mirror the layout under `dir="rtl"`. A badge nested in an item icon anchors to the 16px glyph.
- **R5** `.status-bar.vibrant` paints primary-container with on-primary-container text. All bar and item colors read `--md-comp-status-bar-*` custom properties that point at `--md-sys-color-*` roles.
- **R6** An item colored with the helpers, such as `primary on-primary-text` or `error-container on-error-container-text`, keeps that fill and text color on a plain and a `.vibrant` bar.
- **R7** Below 600px window width, items with `data-priority="low"` are `display: none`. At every width the bar adds no horizontal page scroll: items that don't fit wrap to another row.
- **R8** Text enlarged to 200% grows the bar's height through `rem()` sizing. Items that fit stay on one row and their text is not clipped vertically.
- **R9** In forced colors the bar keeps a visible top edge and focused items keep a visible ring. A helper fill disappears there, so its meaning has to be in the item's text (R13).
- **R10** Items add no transition of their own. The global button transition drops to `transition: none` under `prefers-reduced-motion: reduce`, in the component's own rule.
- **R11** A `status-bar` row in `semantics.json` is `enforced`, with a `rejects` record for the toolbar role and these rules:
  - The bar takes no composite role (`forbid-composite-roles` on `.status-bar`).
  - The bar is not a live region. The rule forbids `.status-bar:is([role="status"], [role="alert"], [role="log"], [aria-live])`, because a live region reads its buttons' labels with every update.
  - The bar is not written as `nav.status-bar`.
  - The bar is a `<footer>` or a `[role="region"]` (`.status-bar:not(footer, [role="region"])` is forbidden).
  - Every `button` and `a` item ends up with an accessible name (`require-accessible-name` on `.status-bar > :is(button, a)`).
- **R12** No selector this component adds matches outside `.status-bar`. Unscoped `.end` or `.vibrant` rules from this partial would restyle the popover, the toolbar and other components. A `<footer>` page footer keeps its styles, and a `footer.status-bar` gets none of them, nor any pane or questionnaire footer styles.
- **R13** The docs page `docs/src/pages/status-bar.astro` is listed in `docs/src/data/nav.ts` after Toolbars in "Search and commands". It shows:
  - the anatomy and both root forms: `<footer>`, or a `<div>` with `aria-label` when the page already has a site footer
  - `role="status"` on a changing text item and never on the bar
  - `.end`, `.vibrant`, helper-colored items and `data-priority="low"`
  - an item that opens a menu and an item with a badge
  - the 24px target limit, the term overlap with the OS status bar, and "do not show with `nav.navigation-bar`"
- **R14** These records change:
  - `llm.md` gets a Status bar section.
  - `docs/src/data/component-decisions.json` gets a `status-bar` record in catalogue order, with `"runtime": "css-only"`, a `framework-extra` material status and `sourceRevision` and `capabilityReview` entries.
  - `skills/expressivecss/expressivecss-design/references/web-extensions-review.md` gets a hand-written entry.
  - `CHANGELOG.md` gets an Unreleased entry.
  - `tests/selective-builds.test.js` gets a reviewed gzip budget line for the CSS growth.
  - `npm run build:semantics` and `npm run build:skill` rebuild the generated files, with the skill build last.

## Risks considered

- Concurrency: the component writes nothing and has no runtime, so nothing can race.
- Bad input: long item text cannot break the page, because items wrap (R7). An item with no visible text and no name fails R11's name rule.
- Refusal: no permissions or tenants are involved.
- Other readers:
  - `.popover.end`, `.toolbar.vibrant` and the `[vibrant]` foundation: R12 and V12.
  - The page footer's bare `footer` selector, found during the build: R12, V12 and `tests/page-footer-browser.test.js`.
  - The global filled-button state rules in `_buttons.scss`, found during the build: R3 and V3.
  - The `.error` and `.primary` color helpers, found during the build: R6 and V6.
  - The docs site landmark pass (`scripts/verify-site.mjs`): demos sit inside `<main>`, where `<footer>` is not a contentinfo landmark, so they add no duplicate landmark. V15 runs the pass.
  - The semantics roster test: R11 adds the row the roster requires for the new partial.
  - Skill guide counts and the reading budget in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`: plan group 4 updates them.
  - Snackbar and back-to-top overlap: excluded above.
- UI states: hover, pressed, focus and disabled (R3), vibrant and helper colors (R5, R6), compact width (R7), enlarged text (R8), forced colors (R9), reduced motion (R10), RTL (R4) and dark theme through tokens (R5). The component works fully without JavaScript because it has no runtime.
- `specs/checklist.md` does not exist in this project.
