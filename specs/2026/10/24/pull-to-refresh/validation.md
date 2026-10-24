# Validation: pull-to-refresh

Roadmap phase: Phase 36, pull-to-refresh. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending, since nothing is built yet. Tests run against built bundles, so run `npm run build` first, and run suites one at a time, since parallel browser runs flake.

## Automated checks

V1 to V7 are Playwright cases in a new file, `tests/pull-to-refresh-browser.test.js`, run with `node --test tests/pull-to-refresh-browser.test.js` in Chromium, Firefox and WebKit. Each case destroys its component and clears its timers in a `finally` block.

Touch input: Chromium drives real touches through CDP `Input.dispatchTouchEvent` in a `hasTouch` context, as `tests/sheet-touch-browser.test.js` does. Firefox and WebKit get `touchstart`, `touchmove` and `touchend` events dispatched from the page in a `hasTouch` context. A probe on 2026-10-24 found Firefox has the `Touch` constructor and WebKit does not, so both get a `TouchEvent` whose `touches` list is defined on the event.

Fixture: a `.pull-to-refresh` list of 40 rows in a 400 by 300px box with `overflow-y: auto`, holding a contained loading indicator and a `[data-refresh]` button, started by `AutoInit()`. A second copy has no scroll of its own inside a 3000px page. A listener counts `expressive:refresh` events.

V1 is the acceptance check from the roadmap. V2 to V7 are the short regression cases the user asked for, one per behavior.

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R4, R7 | The fixture at a scroll position of 0. The listener calls `event.detail.waitUntil()` with a promise the test resolves. | Pull down 150px and release. Read the indicator, then resolve the promise. Repeat with a listener that calls `complete()` instead. | One event fires. The indicator is visible and the container has `aria-busy="true"` until the promise resolves, then the indicator hides and `aria-busy` is gone. `complete()` gives the same result. The container's computed `overscroll-behavior-y` is `contain`. Seen failing before group 1. | Pending |
| V2 | R2, R3 | The fixture. | Pull down 40px and release. Pull 150px and send `touchcancel`. Scroll the list to 200px and pull 150px. Drag 150px with the mouse at a scroll position of 0. | No event fires in any of the four, and the indicator is hidden again each time. The scrolled-down pull scrolls the list. | Pending |
| V3 | R5 | The fixture, with a listener that never settles its promise. | Pull past the threshold, then pull again, click the button and call `refresh()`. Then call `complete()`. | One event in total. `aria-busy="true"` holds until `complete()`, then is removed, and a new pull fires a second event. | Pending |
| V4 | R6 | The fixture. | Click the button. After the finish, focus it and press Enter, then Space. Then call `refresh()`. | Each fires one event and shows the indicator until the finish, four events in all. | Pending |
| V5 | R8 | The copy without its own scroll, in a page at `scrollY` 0, then at `scrollY` 500. | Pull 150px at each position. | The pull at 0 fires one event. The pull at 500 scrolls the page and fires nothing. The root's computed `overscroll-behavior-y` is `contain`. | Pending |
| V6 | R9 | The fixture under `prefers-reduced-motion: reduce`. | Pull 40px and release, then pull past the threshold and finish. | The short pull's indicator is hidden on the next frame with no running transition. The full pull still fires one event and shows the indicator. | Pending |
| V7 | R10 | The fixture with a refresh running. | Call `destroy()`, then pull past the threshold and click the button. | `aria-busy`, `.pulling` and the offset properties are cleared, the indicator is hidden, and no event fires after `destroy()`. | Pending |

## Regression and generation checks

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V8 | R12 | Run `node --test tests/selective-builds.test.js tests/autoinit.test.js` and the component decisions test after each group that changes a bundle. | The budget test passes with reviewed JavaScript and CSS lines naming this change, AutoInit starts the new fixture, and the `sourceRevision` pin is an ancestor of `HEAD` on `master`. | Pending |
| V9 | R11 | After plan group 3, run `npm run build:semantics`, `npm run build:skill` and `npm run check:generated`, then `node --test tests/expressivecss-skill.test.js` and the semantics tests. Read the new docs. | Generation is clean, the guide counts match, the semantics row accepts the documented markup and rejects a container without a `[data-refresh]` button, and `llm.md`, the docs page, the decisions entry, the web extensions review and the changelog describe the component. | Pending |

A failure in a file this change does not touch is rerun alone before anyone debugs it.

## Manual checks

None required. The user left manual phone, visual, forced-colors and screen reader checks out of the merge conditions.

## Merge conditions

- V1 passes in Chromium, Firefox and WebKit, and was seen failing before the change.
- V2 to V7 pass in all three engines.
- V8 and V9 pass, and `npm run build:skill` ran after the last edit.
- The repository's required CI checks and review pass on the pull request.
