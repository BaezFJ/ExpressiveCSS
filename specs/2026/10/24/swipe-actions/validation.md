# Validation: swipe actions on list rows

Roadmap phase: Phase 37, swipe actions on list rows. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

No check has run yet; every result is pending. Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V8 are Playwright cases in a new file, `tests/swipe-actions-browser.test.js`, run with `node --test tests/swipe-actions-browser.test.js` (command not yet verified) in Chromium, Firefox and WebKit. Each case closes its page in a `finally` block and calls `destroy()` on any instance it started.

Touch input follows `tests/pull-to-refresh-browser.test.js`: Chromium drives real touches through CDP `Input.dispatchTouchEvent` in a `hasTouch` context. Firefox and WebKit get `touchstart`, `touchmove` and `touchend` events dispatched from the page in a `hasTouch` context, as a `TouchEvent` whose `touches` list is defined on the event, because WebKit has no `Touch` constructor.

Fixture: a `.list.swipeable` list of 10 rows in a 360px wide box, each row with a label, a `[data-swipe-toggle]` button and a `.swipe-actions` group of two buttons, started by `AutoInit()`. Each action button counts its clicks, and a listener counts `expressive:swipetoggle` events.

V1 is the acceptance check from the roadmap and the only automated merge condition. V2 to V8 cover the remaining behavior; the user did not make them merge conditions, so a failure there is reported but does not block the merge on its own.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R4, R5, R6 | The fixture. | Swipe row 2 by 150px toward the inline start and release. Then reload, focus row 3's toggle with Tab and press Enter, then Tab to its first action and press Enter. | After the swipe, row 2's actions are inside its bounding box and visible, the toggle has `aria-expanded="true"`, and no action click was counted. From the keyboard, Enter on the toggle opens row 3, Tab reaches its first action while it is visible, and Enter runs that action once. Seen failing before group 1. | Pending |
| V2 | R1, R2 | The fixture. | Swipe row 2 by 20px and release. Swipe 400px and read the offset before release. On the open row, swipe 150px toward the inline end. On a closed row, swipe 150px toward the inline end. | The 20px swipe closes the row. The offset never passes the actions' width. The swipe toward the inline end closes the open row and leaves the closed row closed. | Pending |
| V3 | R3 | The fixture inside a 300px tall scrolling box. | Drag 150px down then 30px sideways. Drag 150px sideways with the mouse. Swipe past half, then put a second finger down. Swipe past half and send `touchcancel`. | The vertical drag opens nothing (and, in Chromium, scrolls the box). The mouse drag opens nothing. The second finger and `touchcancel` leave the row closed. | Pending |
| V4 | R5, R7, R8 | The fixture. | Click row 2's toggle, then click it again. Open row 2, tap row 5's label. Open row 2, Tab to its first action and press Escape. Open row 2, click an action. | The toggle opens and closes the row and keeps `aria-expanded` in step. The tap outside closes row 2. Escape closes it and moves focus to the toggle. Clicking the action counts one click, then the row closes. | Pending |
| V5 | R9, R12 | The fixture. | Open row 2 by swipe, then row 4 by its toggle, then call `open(row6)` and `close()`. | One row is open at a time. Each open and close fires one `expressive:swipetoggle` with the right `{ row, open }`, and `onToggle` sees the same detail. | Pending |
| V6 | R10 | The fixture with `dir="rtl"` on the page. | Swipe row 2 by 150px toward the right. Swipe row 3 by 150px toward the left. | Row 2 opens with its actions at its left edge. Row 3 stays closed. | Pending |
| V7 | R11 | The fixture under `prefers-reduced-motion: reduce`, with the documented `:root` override setting `--md-sys-motion-spring-default-spatial-duration` to 500ms. | Swipe row 2 by 150px, read the offset mid-drag, release. Close it by toggle. | The offset follows the finger mid-drag. Release and toggle reach their end state on the next frame with no running transition. | Pending |
| V8 | R13 | An instance with row 2 open, then one with a finger down mid-swipe. | Call `destroy()`, then swipe row 3 past half and click its toggle. | The open row closes with no event, `--swipe-offset` and `aria-expanded` are cleared, and the later swipe and toggle open nothing. | Pending |

Where a case passes on code that already handles its behavior, a source mutation run stands in for the failing run, as in Phase 36.

## Regression and generation checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | R15 | Run `node --test tests/selective-builds.test.js tests/autoinit.test.js` and the component decisions test after each group that changes a bundle. | The budget test passes with reviewed JavaScript and CSS lines naming this change, AutoInit starts the new fixture, and the `sourceRevision` pin is an ancestor of `HEAD` on `master`. | Pending |
| V10 | R14 | After plan group 3, run `npm run build:semantics`, `npm run build:skill` and `npm run check:generated`, then `node --test tests/expressivecss-skill.test.js` and the semantics tests. Read the new docs. | Generation is clean, the guide counts match, the semantics rule accepts the documented markup and flags a `.swipeable` row without a `[data-swipe-toggle]` button, and `llm.md`, the docs page, the decisions entry, the web extensions review and the changelog describe the component. | Pending |

A failure in a file this change does not touch is rerun alone before anyone debugs it.

## Manual checks

None required. The user left manual phone, visual, forced-colors and screen reader checks out of the merge conditions.

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit, and was seen failing before the change. Pending.
- The repository's required CI checks pass on the pull request, which covers V9 and V10 through the budget, AutoInit, semantics and generated-file tests. Pending.
- Review passes on the pull request. Pending.
