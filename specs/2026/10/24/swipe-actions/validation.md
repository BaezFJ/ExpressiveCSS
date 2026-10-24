# Validation: swipe actions on list rows

Roadmap phase: Phase 37, swipe actions on list rows. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

The agent ran every check below on 2026-10-24 on branch `feature/2026-10-24-swipe-actions`. All 8 cases pass in all three engines, 24 runs in total. Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V8 are Playwright cases in a new file, `tests/swipe-actions-browser.test.js`, run with `node --test tests/swipe-actions-browser.test.js` in Chromium, Firefox and WebKit. Each case closes its page in a `finally` block and calls `destroy()` on any instance it started.

Touch input follows `tests/pull-to-refresh-browser.test.js`: Chromium drives real touches through CDP `Input.dispatchTouchEvent` in a `hasTouch` context. Firefox and WebKit get `touchstart`, `touchmove` and `touchend` events dispatched from the page in a `hasTouch` context, as a `TouchEvent` whose `touches` list is defined on the event, because WebKit has no `Touch` constructor.

Fixture: a `.list.swipeable` list of 10 rows in a 360px wide box, each row with a label, a `[data-swipe-toggle]` button and a `.swipe-actions` group of two buttons, started by `AutoInit()`. Each action button counts its clicks, and a listener counts `expressive:swipetoggle` events.

V1 is the acceptance check from the roadmap and the only automated merge condition. V2 to V8 cover the remaining behavior; the user did not make them merge conditions, so a failure there is reported but does not block the merge on its own.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R4, R5, R6 | The fixture. | Swipe row 2 by 150px toward the inline start and release. Then reload, focus row 3's toggle with Tab and press Enter, then Tab to its first action and press Enter. | After the swipe, row 2's actions are inside its bounding box and visible, the toggle has `aria-expanded="true"`, and no action click was counted. From the keyboard, Enter on the toggle opens row 3, Tab reaches its first action while it is visible, and Enter runs that action once. Seen failing before group 1. | Passed 2026-10-24 in Chromium, Firefox and WebKit. Seen failing before group 1 in Chromium: the actions were visible at rest. |
| V2 | R1, R2 | The fixture. | Swipe row 2 by 20px and release. Swipe 400px and read the offset before release. On the open row, swipe 150px toward the inline end. On a closed row, swipe 150px toward the inline end. | The 20px swipe closes the row. The offset never passes the actions' width. The swipe toward the inline end closes the open row and leaves the closed row closed. | Passed 2026-10-24 in all three engines. The short swipe rests 150ms before release: a 20px synthetic swipe arrives in about 10ms in Firefox and WebKit and reads as a flick, which opens the row as R1 says. A flick check was tried and dropped, because CDP delivers moves too slowly in Chromium for the same swipe to count as one. |
| V3 | R3 | The fixture inside a 300px tall scrolling box. | Drag 150px down then 30px sideways. Drag 150px sideways with the mouse. Swipe past half, then put a second finger down. Swipe past half and send `touchcancel`. | The vertical drag opens nothing (and, in Chromium, scrolls the box). The mouse drag opens nothing. The second finger and `touchcancel` leave the row closed. | Passed 2026-10-24 in all three engines. Only Chromium asserts that the box scrolled. |
| V4 | R5, R7, R8 | The fixture. | Click row 2's toggle, then click it again. Open row 2, tap row 5's label. Open row 2, Tab to its first action and press Escape. Open row 2, click an action. | The toggle opens and closes the row and keeps `aria-expanded` in step. The tap outside closes row 2. Escape closes it and moves focus to the toggle. Clicking the action counts one click, then the row closes. | Passed 2026-10-24 in all three engines. Also checks that focus on a closed row's action opens it, and that an action whose own handler removes its row closes that row at once; that assertion failed on the group 2 code, which fired the close only on the next outside tap. |
| V5 | R9, R12 | The fixture. | Open row 2 by swipe, then row 4 by its toggle, then call `open(row6)` and `close()`. | One row is open at a time. Each open and close fires one `expressive:swipetoggle` with the right `{ row, open }`, and `onToggle` sees the same detail. | Passed 2026-10-24 in all three engines. |
| V6 | R10 | The fixture with `dir="rtl"` on the page. | Swipe row 2 by 150px toward the right. Swipe row 3 by 150px toward the left. | Row 2 opens with its actions at its left edge. Row 3 stays closed. | Passed 2026-10-24 in all three engines. |
| V7 | R11 | The fixture under `prefers-reduced-motion: reduce`, with the documented `:root` override setting `--md-sys-motion-spring-default-spatial-duration` to 500ms. | Swipe row 2 by 150px, read the offset mid-drag, release. Close it by toggle. | The offset follows the finger mid-drag. Release and toggle reach their end state on the next frame with no running transition. | Passed 2026-10-24 in all three engines. |
| V8 | R13 | An instance with row 2 open, then one with a finger down mid-swipe. | Call `destroy()`, then swipe row 3 past half and click its toggle. | The open row closes with no event, `--swipe-offset` and `aria-expanded` are cleared, and the later swipe and toggle open nothing. | Passed 2026-10-24 in all three engines. Failed on the group 1 code: `destroy()` during a swipe left the row's offset behind. |

V2 to V7 passed on the group 1 code, which already handled their behavior, so a source mutation run on 2026-10-24 stood in for the failing run, in Chromium. Each of 12 mutations failed at least one case: removing the slide cap (V2, V6), treating `touchcancel` as a release (V3), swiping on any drag direction (V3), dropping the outside-tap close (V4), Escape (V4) or the close after an action (V4), letting two rows open (V5), ignoring right-to-left pages (V6), removing the reduced-motion rule (V7), skipping the cleanup in `destroy()` (V8), dropping focus opening (V4, after its assertion was added) and not setting `aria-expanded` (V1, V2, V4). Under the mutation loop the reduced-motion case also failed for mutations unrelated to it; run alone five times, it passed every time, so those were load failures.

## Regression and generation checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V9 | R15 | Run `node --test tests/selective-builds.test.js tests/autoinit.test.js` and the component decisions test after each group that changes a bundle. | The budget test passes with reviewed JavaScript and CSS lines naming this change, AutoInit starts the new fixture, and the `sourceRevision` pin is an ancestor of `HEAD` on `master`. | Passed 2026-10-24 on the branch. JavaScript went from 92,556 to 93,587 gzip bytes and CSS from 86,567 to 86,736, in reviewed lines. The `sourceRevision` pin is `de14a41ac`, the group 1 commit, because no commit on `master` holds the new files. A squash merge drops it, so a follow-up must re-pin it to the merge commit. The pin `master` carried, `aaf6ac5e8` from #419, was not an ancestor of `master` either, and failed this test before any change here. |
| V10 | R14 | After plan group 3, run `npm run build:semantics`, `npm run build:skill` and `npm run check:generated`, then `node --test tests/expressivecss-skill.test.js` and the semantics tests. Read the new docs. | Generation is clean, the guide counts match, the semantics rule accepts the documented markup and flags a `.swipeable` row without a `[data-swipe-toggle]` button, and `llm.md`, the docs page, the decisions entry, the web extensions review and the changelog describe the component. | Passed 2026-10-24. `build:skill` wrote 87 guides and `check:generated` is clean. The guide counts moved from 86 to 87 and the remaining-review count from 79 to 80. The basic-button reading budget grew 327 bytes to 45,320 for the new decision row. |

A failure in a file this change does not touch is rerun alone before anyone debugs it.

`npm run verify` ran on 2026-10-24 after group 3: 2,744 of 2,747 tests passed with no failures (the other 3 did not run), then `check:generated`, `docs:build:astro` and `docs:verify` (124 pages) passed. `npm test --prefix mcp/expressivecss` (the MCP smoke test) passed. `verify:packages` did not run.

## Manual checks

None required. The user left manual phone, visual, forced-colors and screen reader checks out of the merge conditions.

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit, and was seen failing before the change. Met locally on 2026-10-24.
- The repository's required CI checks pass on the pull request, which covers V9 and V10 through the budget, AutoInit, semantics and generated-file tests. Met locally on 2026-10-24; pending in CI, since no pull request is open.
- Review passes on the pull request. Pending: no pull request is open.
