# Swipe actions on list rows

Date: 2026-10-24
Roadmap phase: Phase 37, swipe actions on list rows
Branch: `feature/2026-10-24-swipe-actions`
Base: `origin/master` at `935145a31`, fetched 2026-10-24
Status: specified 2026-10-24; not implemented

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 37](../../../../roadmap.md#phase-37-swipe-actions-on-list-rows). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phase 35 merged as #418 (`591de9f30`) and Phase 36 as #419 (`935145a31`); the roadmap does not mark them complete yet. Phase 37 is the next phase in the touch and input milestone and has no dependencies. No branch, worktree or spec directory holds work on it.

## Current behavior

These facts come from the base commit.

- A `.list` row is a grid on the `<li>`, or on a wrapping `<a>` or `<label>`, with a leading slot, the label and a trailing slot (`src/sass/components/_list.scss`). No row reacts to a sideways swipe; on touch, a horizontal drag on a list does nothing, or scrolls a container that scrolls sideways.
- `src/ts/behaviors/lists.ts` adds Up, Down, Home and End to lists whose rows are each a single link or button. Rows with more than one control keep native Tab order.
- `src/ts/behaviors/sortable.ts` is the nearest precedent for a gesture with a button alternative: a `.sortable` list needs `[data-move]` buttons in each row, and `semantics.json` enforces that with the `sortable-items-move-without-dragging` rule.
- `src/ts/behaviors/sheetDrag.ts` tracks pointer drags for the bottom and side sheets. Its state machine is typed to `HTMLDialogElement`, only moves toward dismissal and ends in `dialog.close()`.
- `src/ts/components/pullToRefresh.ts` handles a one-axis touch gesture on its own element: a passive `touchstart`, a non-passive `touchmove` registered for the instance's life that calls `preventDefault()` only once the gesture is decided, a 4px slop, and a second finger or `touchcancel` ending the gesture.
- `Component._notify()` in `src/ts/core/component.ts` runs an `on…` option callback and then fires a bubbling `expressive:<type>` event.

## Scope

A `.list.swipeable` list lets people swipe a row toward its inline start to reveal that row's actions at the inline end. People who don't swipe reach the same actions through a toggle button in the row or with the keyboard.

### Expected behavior

- **R1.** A touch swipe that starts on a row of a `.list.swipeable` list and moves toward the inline start (left in a left-to-right page) slides the row's content with the finger and uncovers the row's `.swipe-actions` group at the inline end. Released past half the group's width, or with a flick toward the inline start, the row opens with the whole group visible. Released short of that, the row slides back closed.
- **R2.** The content never slides farther than the group's width. On a closed row, a swipe toward the inline end does nothing. On an open row, a swipe toward the inline end closes it.
- **R3.** Touch and pen input swipe. A mouse drag never swipes. A gesture that moves vertically first scrolls as it does today and opens nothing. A second finger or a `touchcancel` ends the swipe and the row returns to the state it had before the swipe began.
- **R4.** A swipe only reveals. No action runs, however far the swipe goes, until a person activates one of the action buttons.
- **R5.** Each row holds a `[data-swipe-toggle]` button. Activating it by click, Enter or Space opens the row, or closes an open one. The component keeps `aria-expanded` on the toggle in step with the row's state, whether the row opened by swipe, toggle, focus or script.
- **R6.** When focus moves to a button inside a row's `.swipe-actions`, the row opens so the focused action is visible. The action buttons stay in the tab order and in the accessibility tree while the row is closed.
- **R7.** An open row closes when a tap or focus lands outside it, or on Escape inside it. Escape on an action moves focus to the row's toggle.
- **R8.** Activating an action button closes its row after the button's own click handlers have run. The page handles what the action does.
- **R9.** At most one row in a list is open. Opening a row, by any route, closes the open one.
- **R10.** In a right-to-left page, the actions sit at the left, and a swipe toward the right reveals them.
- **R11.** Under `prefers-reduced-motion: reduce`, the content still follows the finger during a swipe, but a release, the toggle, focus and Escape open and close the row without animating.
- **R12.** Opening or closing a row fires a bubbling `expressive:swipetoggle` event from the list, with `{ row, open }` in its `detail`, and runs the `onToggle` option. The instance's `open(row)` and `close()` methods open and close rows from script.
- **R13.** `destroy()` removes every listener, closes any open row without firing an event, and clears the swipe offset and `aria-expanded` it set. A later swipe opens nothing.
- **R14.** `llm.md` gains a "Swipe actions" section under Lists, and a docs page documents the markup, options, methods, event and the toggle with a live example. `semantics.json` gains a rule that flags a `.swipeable` row without a `[data-swipe-toggle]` button. The component decisions data, the changelog's Unreleased section and the hand-written web extensions review get entries, and `npm run build:skill` regenerates the derived files.
- **R15.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, and the capability `sourceRevision` pin names a commit on `master`.

### Exclusions

- Actions on the inline-start side, revealed by a swipe toward the inline end.
- A full swipe that runs the first action. The user chose reveal-only, so an accidental long swipe cannot delete anything.
- Refactoring `sheetDrag.ts` into a shared drag module.
- Swipe actions outside `.list`, such as on cards or table rows.
- A separate automated check for pen input. As in Phase 36, browsers fire touch events for a stylus where they report it as touch, and the tests drive touch only.
- Regression cases beyond the acceptance check as merge conditions. Validation lists them, but the user made only the acceptance check a merge condition.
- Manual checks on real phones, and manual visual, forced-colors and screen reader checks.
- Running `npm run verify`, the MCP tests and `verify:packages` locally as a merge condition. The repository's required CI checks stand in for them.

## Decisions

### Confirmed with the user on 2026-10-24

- A swipe only reveals the actions. Nothing runs until a person presses an action button.
- The component has its own small touch handler, modeled on `pullToRefresh.ts`, and does not reuse `sheetDrag.ts`, which is tied to dialogs and dismissal.
- Actions are real buttons in the row, at the inline end, mirrored in right-to-left pages. The list opts in with a class on `.list`.
- The non-swipe path is a required `[data-swipe-toggle]` button in each row, for single-pointer users, plus focus: tabbing into an action opens its row.
- Touch events drive the gesture, as in Phase 36.
- The work splits into three groups: the swipe and its acceptance test; then the toggle, keyboard path and edge cases; then docs and checks.
- The merge condition is the acceptance test passing in Chromium, Firefox and WebKit, plus the repository's required CI checks and review.

### Proposals for implementation

These are open to change in review.

- Markup. The toggle is the row's trailing action, and the actions group is its last child.

  ```html
  <ul class="list swipeable" aria-label="Inbox">
    <li>
      <span class="material-symbols" aria-hidden="true">mail</span>
      Weekly report
      <button type="button" class="icon-button" data-swipe-toggle aria-label="Actions for Weekly report">
        <span class="material-symbols" aria-hidden="true">more_horiz</span>
      </button>
      <span class="swipe-actions">
        <button type="button" class="icon-button" aria-label="Archive Weekly report">
          <span class="material-symbols" aria-hidden="true">archive</span>
        </button>
        <button type="button" class="icon-button" aria-label="Delete Weekly report">
          <span class="material-symbols" aria-hidden="true">delete</span>
        </button>
      </span>
    </li>
  </ul>
  ```

- Layout. The Sass places `.swipe-actions` absolutely at the row's inline end, outside the grid, and clips the row. Every other child of the row moves by a `translate` on one custom property, `--swipe-offset`, which the script sets in pixels while a finger is down. A `.swipe-open` class on the `<li>` sets the open offset to the group's width; the close and open animate with a CSS transition on the default spatial spring token, which reduced motion turns off.
- Focus opening (R6) can be pure CSS, `li:has(.swipe-actions :focus-visible)`, with the script only syncing `aria-expanded` and closing the other open row on `focusin`.
- The component sets `aria-controls` on the toggle, generating an `id` on the group when it has none. `aria-expanded` and `aria-controls` are dynamic state the framework owns; the author writes the toggle's name.
- Gesture input follows `pullToRefresh.ts`: a passive `touchstart` and a non-passive `touchmove` on the list, registered for the instance's life, that calls `preventDefault()` only once a move past the 4px slop is more horizontal than vertical. Flick velocity and the flick window reuse the values in `sheetDrag.ts` (0.5px per millisecond, 100ms). No component imports from `behaviors/` today, so both constants move to `core/` and `sheetDrag.ts` imports them from there.
- Register the component in `components/registry.ts` as `SwipeActions` with the `.list.swipeable` selector, since a list-wide non-passive `touchmove` belongs on the list rather than on the document.
- The `semantics.json` rule sits in the existing `list` row: `.swipeable > li:has(.swipe-actions):not(:has([data-swipe-toggle]))`.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.

### Deferred

None.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work follows `src/sass/README.md`. `components/` imports from `core/`, never the reverse.
- Listeners that last as long as the instance take `this._events.signal`.
- Text- and icon-holding boxes use `rem()`; the swipe offset stays in pixels.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency.

## Dependencies

- None from the roadmap. The component reuses the list grid, `Component._notify()`, the spatial spring motion tokens and the touch approach from Phase 36.
