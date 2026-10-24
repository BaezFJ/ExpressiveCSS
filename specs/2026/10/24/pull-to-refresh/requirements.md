# Pull-to-refresh

Date: 2026-10-24
Roadmap phase: Phase 36, pull-to-refresh
Branch: `feature/2026-10-24-pull-to-refresh`
Base: `origin/master` at `591de9f30`, fetched 2026-10-24
Status: implemented and locally verified 2026-10-24; CI and review pending

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 36](../../../../roadmap.md#phase-36-pull-to-refresh). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phase 35 merged as #418 (`591de9f30`), which ends the data table and chart milestone. Phase 36 opens the touch and input milestone and has no dependencies. No branch or worktree holds work on it.

## Current behavior

These facts come from the base commit.

- No component reacts to a pull at the top of a scroll container. On Chrome and Firefox for Android, pulling down at the top of the page runs the browser's own reload, and on other engines it overscrolls.
- `.loading-indicator` in `src/sass/components/_loading-indicator.scss` is a CSS-only M3 Expressive indicator, with a `contained` variant. The `loading-indicator` row in `semantics.json` requires `role="status"` and an accessible name.
- `src/ts/behaviors/sheetDrag.ts` tracks pointer drags for the bottom and side sheets, with a 4px drag slop and spring snap-back from `core/spring`. Its state machine dismisses dialogs and is not shared outside the sheets.
- `Component._notify()` in `src/ts/core/component.ts` runs an `on…` option callback and then fires a bubbling `expressive:<type>` event. `Utils.emit()` can make that event cancelable.
- `tests/sheet-touch-browser.test.js` drives real touch drags through CDP `Input.dispatchTouchEvent` in a `hasTouch` Chromium context. No test drives touch in Firefox or WebKit.

## Scope

A `.pull-to-refresh` container lets people refresh its content by pulling down at its top, or by pressing a refresh button inside it. The page reports when the refresh finishes.

### Expected behavior

- **R1.** A touch pull that starts while the scroll container is at its top, moves down past the threshold and is released fires one `expressive:refresh` event from the `.pull-to-refresh` element and runs the `onRefresh` option. The loading indicator is visible from the release until the refresh finishes. The threshold defaults to 64px of finger travel and is set with the `threshold` option, which AutoInit also reads from `data-pull-to-refresh-options`.
- **R2.** While the finger is down, the loading indicator comes down with the pull and fades in as the pull nears the threshold. The content stays in place, as in M3's pull-to-refresh. Releasing short of the threshold, or a `touchcancel`, sends the indicator back up and fires nothing.
- **R3.** Touch and pen input pull. A mouse drag never pulls. A pull that starts while the container is scrolled down, a drag that moves up or sideways first, and a drag that a scrolled-down scroller inside the container can take scroll as they do today and fire nothing. A second finger ends a pull, so a pinch still zooms.
- **R4.** The refresh finishes when every promise passed to `event.detail.waitUntil()` has settled, whether fulfilled or rejected, or when the page calls the instance's `complete()` method, whichever comes first. If neither happens, the indicator stays. On finish, the indicator goes back up and hides.
- **R5.** While a refresh runs, the container has `aria-busy="true"`, and further pulls, button presses and `refresh()` calls fire no second event. When it finishes, `aria-busy` is removed.
- **R6.** Activating a `[data-refresh]` button inside the container, by click, Enter or Space, starts the same refresh as a pull: one event, the visible indicator, the same finish. The instance's `refresh()` method does the same from script.
- **R7.** The browser's own pull-to-refresh does not run on a `.pull-to-refresh` container. The Sass gives the container `overscroll-behavior-y: contain`.
- **R8.** The container can be an element with its own scroll, or sit in a scroller around it: the nearest scrolling ancestor, or the page when none scrolls. In each case "at its top" means a scroll position of 0.
- **R9.** Under `prefers-reduced-motion: reduce`, pulling and the button still refresh. The indicator does not animate back up; it hides at once.
- **R10.** `destroy()` removes every listener, clears the pull offset and `aria-busy`, hides the indicator and ends any running refresh without firing an event. A later pull fires nothing.
- **R11.** `llm.md` gains a "Pull-to-refresh" section, and `docs/src/pages/pull-to-refresh.astro` documents the markup, options, methods, event and the button with a live example. `semantics.json` gains a row for the component. The component decisions data, the changelog's Unreleased section and the hand-written web extensions review get entries, and `npm run build:skill` regenerates the derived files.
- **R12.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, and the capability `sourceRevision` pin names a commit on `master`.

### Exclusions

- Pulling from the bottom or from a side. Only a downward pull at the top refreshes.
- A true virtual or infinite list. Loading more rows at the bottom is a separate pattern.
- A pull on a container nested inside another `.pull-to-refresh`. Nesting is unsupported, and the docs say so.
- A separate automated check for pen input. The browser tests drive touch only; pen works where the browser reports a stylus as touch input, as Safari on iPadOS does. Whether other browsers do was not checked.
- Manual checks on real phones, including whether Chrome or Firefox for Android still run their own reload. The user left them out of the merge conditions, so R7 rests on the computed `overscroll-behavior-y` value and the emulated pull.
- Manual visual, forced-colors and screen reader checks.
- Running `npm run verify`, the MCP tests and `verify:packages` locally as a merge condition. The repository's required CI checks stand in for them.

## Decisions

### Confirmed with the user on 2026-10-24

- The non-gesture alternative is a `[data-refresh]` button the author places inside the container, plus a `refresh()` method. The user chose this over a method alone, which would leave every page to write its own button glue.
- `overscroll-behavior-y: contain` on the container stops the browser's own pull-to-refresh.
- The page reports the finish by passing a promise to `event.detail.waitUntil()` or by calling `complete()`.
- Touch and pen pull; a mouse drag never does.
- Page scrolling is in scope, not only elements with their own scroll. The user turned down the option that left it out.
- The work splits into three groups: the gesture, indicator and acceptance test; then the button path and edge cases; then docs and checks.
- The merge conditions are the acceptance test in all three engines and short regression cases, one per behavior. Manual phone checks and a full local verify run are not merge conditions.

### Proposals for implementation

These are open to change in review.

- Markup: the author writes the indicator, so its role and name stay in markup as the product rules ask.

  ```html
  <div class="pull-to-refresh">
    <span class="loading-indicator contained" role="status" aria-label="Refreshing"></span>
    <button type="button" class="text" data-refresh>Refresh</button>
    <ul class="list">…</ul>
  </div>
  ```

  The indicator must be a direct child. The Sass makes it sticky at the top of the scroll area with a negative end margin, so it takes no space, and hides it at rest. The script only sets state: a `.pulling` class and two custom properties while a finger pulls, and `aria-busy` while refreshing.
- Gesture input: listen for touch events rather than pointer events. With `touch-action: auto`, a pointer drag becomes a browser pan and ends in `pointercancel`, and Safari has no directional `touch-action` values to prevent that. A passive `touchstart` records the start, and a non-passive `touchmove`, registered for the instance's life, calls `preventDefault()` only once the pull is downward from a scroll position of 0. Adding the blocking listener during `touchstart` instead risks Chromium having already started a non-blocking touch sequence. Browsers fire touch events for a stylus too, and never for a mouse, which covers R3 without a pointer type check.
- The indicator's offset is a custom property, `--pull-to-refresh-offset`, set while pulling. The drawn offset is half the finger travel, capped at the threshold, so the pull resists. The indicator returns with a CSS transition on the default spatial spring token, which reduced motion turns off; a run-time spring from `core/spring` adds code for no visible gain on a release that always starts from rest.
- `onRefresh` gets the same `detail` object the event carries, so a callback can also call `waitUntil()`.
- Scroll source: from the touch target, the component walks up to the first scroll container that is scrolled down or that holds the `.pull-to-refresh` element, and reads `document.scrollingElement` when it finds none. A pull counts only when that scroller is at 0. A review on 2026-10-24 found that reading only the container's own scroll let a pull take a drag from a scrolled-down inner list or ancestor pane. The Sass also applies `overscroll-behavior-y: contain` to `:root:has(.pull-to-refresh)` so the page's own pull stops.
- The `semantics.json` row has two `forbid` rules: a `.pull-to-refresh` without a `button[data-refresh]` inside it, and one without a direct `.loading-indicator` child. The first keeps the non-gesture path from being left out.
- Register the component in `components/registry.ts` as `PullToRefresh` with the `.pull-to-refresh` selector.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.

### Deferred

None.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work follows `src/sass/README.md`. `components/` imports from `core/`, never the reverse.
- Listeners that last as long as the instance take `this._events.signal`.
- Text- and icon-holding boxes use `rem()`; the pull offset and threshold stay in pixels.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency.

## Dependencies

- None from the roadmap. The component reuses `.loading-indicator`, `Component._notify()` and the spatial spring motion tokens.
- Phase 37, swipe actions on list rows, may later reuse its touch handling. That phase decides.
