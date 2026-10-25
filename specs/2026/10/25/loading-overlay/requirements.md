# Loading overlay

Date: 2026-10-25
Roadmap phase: Phase 41, loading overlay
Branch: `feature/2026-10-25-loading-overlay`
Base: `origin/master` at `a9bbf77ad` (#425)
Status: specified; not implemented

Follow the [mission's agreed scope for components and behaviors](../../../../mission.md#agreed-scope), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 41](../../../../roadmap.md#phase-41-loading-overlay). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The roadmap marks Phases 1 to 37 completed. Phases 38 (pattern input mask), 39 (currency formatting) and 40 (deferred rendering) are not marked yet, but all three merged to `master` as #422, #423 and #425. Phase 41 has no dependencies. This spec leaves the roadmap's completion state unchanged.

## Current behavior

These facts come from the base commit.

- Nothing in `src/sass`, `src/ts` or `docs/src/pages` names a loading overlay. The framework gap review of 2026-10-23 listed "a loading overlay for a busy region" as missing.
- To block a region while it loads, a page today writes its own scrim CSS, sets `inert` itself, and handles the announcement and focus.
- `.loading-indicator` (`src/sass/components/_loading-indicator.scss`) is one CSS-only element: a morphing shape drawn on `::before`, with `forced-colors-fill` and a reduced-motion block. Its markup carries `role="status"` and `aria-label`.
- `--md-comp-scrim-color` (`src/sass/components/_scrim.scss`) is the 32% scrim that dialogs, sheets and the modal rail share. It is declared on `:root` and `:host`.
- The skeleton guidance in `llm.md` already tells authors to mark a loading region `aria-busy="true"` and to report the wait in a status outside it.
- `PullToRefresh` (`src/ts/components/pullToRefresh.ts`) sets `aria-busy` on its container and announces the start and finish in a visually hidden `role="status"` element it adds, with words from `i18n`. That element sits inside the busy container.

## Scope

### Requirements

- R1. A `.loading-overlay` region holds a `.loading-indicator` as a direct child plus its content. The page marks the region busy by setting `aria-busy="true"` and clears it by removing the attribute or setting it to any other value. `AutoInit()` starts every `.loading-overlay`, and the component notices the attribute change without a method call. A region that already has `aria-busy="true"` when the component starts is busy from the start.
- R2. While the region is busy it takes no pointer or keyboard input: a click on a control inside it does nothing, and Tab skips its controls. Clearing the region restores both. The region's `inert` state after clearing is the one it had before it became busy.
- R3. While the region is busy, a scrim covers its whole box and the `.loading-indicator` shows centred over it. When it is not busy, neither shows. Both fade in and out.
- R4. The component adds one visually hidden `role="status"` element outside the region, as its next sibling, so it is neither inert nor inside the busy subtree. It announces "Loading" when the region becomes busy and "Loaded" when it clears. The words come from `i18n.loading` and `i18n.loaded`.
- R5. If focus was inside the region when it became busy, the component returns focus to that element when the region clears, provided focus has not moved somewhere else in the meantime and the element is still in the document.
- R6. In forced colors the indicator stays visible over the scrim. Under reduced motion the scrim and indicator appear and disappear without a fade.
- R7. `destroy()` disconnects the observer, removes the status element, and restores the region's original `inert` state.
- R8. A docs page, the `llm.md` reference, a `semantics.json` row, the AutoInit registry tables and the changelog describe the component, its markup, `i18n`, and the rule that the page owns `aria-busy`.
- R9. The new gzip sizes are recorded in reviewed budget lines in `tests/selective-builds.test.js`, and the generated skill and MCP copies are current.

### Exclusions

- `expressive:*` events and option callbacks. The page causes every state change, so it already knows when one happens.
- Methods for marking the region busy, such as `busy()` and `clear()`. The attribute is the only API.
- A full-page overlay. A page that wants one wraps its main content in a `.loading-overlay`.
- Determinate progress inside the overlay. Authors who need it use `.progress` outside the region.
- Blocking input to anything outside the region.

## Decisions

### Confirmed in the interview on 2026-10-25

- Phase 41 is next, on `feature/2026-10-25-loading-overlay` from a freshly fetched `origin/master`.
- The page toggles `aria-busy="true"` on a `.loading-overlay`. A small AutoInit component sees the change, makes the region inert, shows the scrim and indicator, announces the start and finish outside the region, and returns focus on clear. The CSS-only option was turned down because a page that forgets `inert` leaves the keyboard open. The methods-only option was turned down because it gives no markup-only path.
- The work starts with a three-engine probe of `inert` and focus loss, then the CSS, then the component.
- Merge requires the click and Tab browser test, the status and focus tests, and the forced-colors and reduced-motion checks. No manual screen reader pass.

### Proposals for implementation

These follow from the code and can change during implementation if the code or the probe disagrees.

- Make the whole region inert, indicator included. Inert content leaves the accessibility tree, so the indicator's own `role="status"` goes quiet while busy and the status element from R4 does the announcing. The indicator keeps the markup it has everywhere else, so `semantics.json` needs no special case for it.
- Put the styles in `src/sass/components/_loading-overlay.scss`, forwarded from `components/_index.scss` next to `pull-to-refresh`.
- Key the CSS on `.loading-overlay[aria-busy="true"]`, so the scrim and indicator also show before the script starts. Input stays open until then.
- Draw the scrim on the region's `::after` with `position: absolute; inset: 0`, and position the indicator the same way with `margin: auto`. The region gets `position: relative` unless it is already positioned. Whether the scrim colour is `--md-comp-scrim-color` or a surface tint is settled in plan group 2, by looking at it over light and dark content.
- Name the status element's class `.loading-overlay-status`, matching `.pull-to-refresh-status`.
- Register the component as `LoadingOverlay` with the key `Expressive_LoadingOverlay`, and watch the attribute with a `MutationObserver` filtered to `aria-busy`, as `chips.ts` and `questionnaire.ts` filter theirs.
- Give the component its own docs page, `docs/src/pages/loading-overlay.astro`, as pull-to-refresh has.

### Open decisions

None.

## Technical constraints

- `inert` blocks pointer events, focus and find-in-page for the subtree and removes it from the accessibility tree, in all three engines.
- When the focused element becomes inert, engines may blur it, and focus falls to `<body>`. Plan group 1 records what each engine does and whether a `blur` or `focusout` fires, since R5 depends on it.
- An absolutely positioned `::after` with `inset: 0` covers only the first screenful of a region that scrolls itself, because it scrolls with the content. Plan group 1 checks this; if it holds, the scrim needs another technique for scrolling regions, or the docs say to put the overlay on a wrapper around the scroller.
- In forced colors, engines replace background colours, so a translucent scrim may turn opaque Canvas. `.loading-indicator` already uses `forced-colors-fill`. Forced-colors checks are static CSS checks in `tests/forced-colors.test.js`.
- Under reduced motion, keep a per-component `transition: none`. The documented `:root` duration override beats the layered token zeroing in `tokens/_motion.scss`.
- A new AutoInit component needs a `semantics.json` row first, a `tests/fixtures.js` entry and the `AUTO_INIT_FIXTURES.length` count in `tests/autoinit.test.js`, the hardcoded guide counts in the skill tests, both AutoInit registry tables in `llm.md`, `docs/src/pages/auto-init.astro`, and a hand-written entry in `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`.
- New functions stay below cyclomatic complexity 5, or the fallow pre-commit gate fails.

## Dependencies

None. No later phase depends on this one.
