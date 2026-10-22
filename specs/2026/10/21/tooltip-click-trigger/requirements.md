# Tooltip click trigger

Date: 2026-10-21
Roadmap phase: Phase 19, tooltip click trigger
Branch: `feature/2026-10-21-tooltip-click-trigger`
Base: `origin/master` at `8d45c2c4af6b6ccf0be918a4b2f325fae3978fb0`, rebased onto `774b0d27` (#380), then merged with `origin/master` at `76781860` (#381, Phase 18) before the pull request
Status: implemented and locally verified 2026-10-21; required CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 19](../../../../roadmap.md#phase-19-tooltip-click-trigger). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection and delegation

The user assigned Phase 19 directly and asked to skip the earliest-unfinished-phase rule, because other roadmap phases are being built in parallel. Phase 19 has no dependency. Phase 18, tooltip shared delay, changes the same component in a parallel branch, so this change stays narrow and expects a merge with it later.

The user delegated the plan, requirements and validation choices to the agent through the feature-spec-auto workflow. Nobody interviewed the user, and nobody has reviewed these documents. The decisions below come from project evidence, and each one names that evidence.

## Current behavior

These facts come from `src/ts/components/tooltip.ts` at the base commit.

- Mouse hover (`mouseenter` on the trigger or the tooltip) and keyboard focus that matches `:focus-visible` open the tooltip after `enterDelay`. `mouseleave` and `blur` close it after `exitDelay` unless the other one still holds it.
- `open()` adds a capturing `keydown` listener on the owner document for Escape, and `close()` removes it. Escape closes the tooltip at once, without `exitDelay`. It stops the key only when focus is on the trigger or inside the tooltip.
- On touch, a press held for 500 ms (`LONG_PRESS`) opens the tooltip at once, without `enterDelay`. It lingers 1500 ms after the finger lifts. The click the release sends is consumed in a capturing `click` listener on the trigger, `_handleClick`, so the long press does not press the button. A tap shows nothing, and a `mouseenter` that echoes a tap within 800 ms is ignored.
- No option opens the tooltip on click. A page that wants a click tooltip, also called a toggletip, has to call `open()` and `close()` from its own listeners and fight the hover and focus handlers that still run.
- `TooltipOptions` is documented in the options tables of `llm.md` and `docs/src/pages/tooltips.astro`. `npm run build:skill` copies the `llm.md` table into `skills/expressivecss/components/tooltips.md` and the MCP guides.

## Decisions

### Recorded project evidence

- Menu has a boolean `hover` option, default `false`, that switches its opening gesture from click to hover, and a boolean `closeOnClick`. Booleans named for the gesture are the project's pattern for this kind of switch.
- The mission's product rules make any change to existing markup's behavior opt-in.
- Menu dismisses on an outside click with a bubble-phase `click` listener on the document that reads `composedPath()`. It adds that listener one task after opening, so the click that opened the menu does not reach it, and its menu marks its own clicks so the listener can tell them apart even when it cannot see inside a shadow root (`_setupTemporaryEventHandlers` and `_menuClickTargets` in `src/ts/components/menu.ts`).
- In jsdom 30, a listener added to the document during a click's dispatch still runs for that click, and from the document a closed shadow root's `composedPath()` starts at the host. The spec reviewer confirmed both by running them.
- The long press already opens the tooltip at once, without `enterDelay`, because the press itself is the delay.
- Phase 20 reads options from data attributes for every component through AutoInit.

### Agent decisions under delegation

- Name: `openOnClick`, a boolean with default `false`. It follows Menu's `closeOnClick` and reads as what it does. A bare `click`, mirroring Menu's `hover`, reads like a handler. A `trigger: 'hover' | 'click'` string would add a second way to spell the default, and "trigger" already names the activator element throughout the docs.
- Touch: with `openOnClick`, a tap is the click, so a tap opens and closes the tooltip and the long press is off. The long press exists because a tap had no tooltip meaning. In click mode a tap has one, and a press held to read the tooltip would otherwise open it, swallow the release click and then close it 1.5 s later on its own. With the long press off, the tap also reaches the trigger's own click handlers, as a mouse click does.
- A click, or Enter or Space on a button trigger, opens the tooltip at once, ignoring `enterDelay`, as the long press does. A second click, Escape and a click elsewhere close it at once, ignoring `exitDelay`, as Escape already does. Each of them is an explicit request, and the delays exist to tell intent from a pointer passing over.
- Keyboard focus does not open a click tooltip. If it did, Enter would close the tooltip that focus had just opened.
- When focus moves to another element outside the trigger and the tooltip, the tooltip closes at once. A keyboard user who tabs on does not leave a stale tooltip behind. Closing at once also keeps an outside click on a focusable control consistent across engines: Chromium and Firefox focus a clicked button, so its mousedown blurs the trigger before the click arrives, while WebKit does not. A blur with no new focus target does not close it: pressing on the text of a rich tooltip moves focus to the body, and that press is inside.
- The outside-click listener is a bubble-phase `click` listener on the owner document, added one task after the tooltip opens, as Menu does. The click that opened it, whether on the trigger or on a page button that calls `open()`, therefore never reaches it. A click on the trigger while it is open toggles it closed, and `close()` removes the listener during that same dispatch, so a removed listener never sees it.
- A click inside the tooltip, such as on a rich tooltip's action, does not close it. The tooltip marks its own clicks, as Menu's menu does, so this also holds in a closed shadow root.
- A click toggles on what is showing, not on `isOpen`. After `open()` with a long `enterDelay`, `isOpen` is already true while nothing shows, and a click then shows the tooltip at once instead of cancelling it.
- No data attribute. Phase 20 adds markup options for every component, and the existing `data-tooltip`, `data-position` and `data-tooltip-id` attributes stay as they are.
- Keyboard use needs a trigger that turns Enter or Space into a click, such as a `<button>`. The docs say so.
- No `aria-expanded` and no live region. The trigger keeps `aria-describedby`, which names the tooltip whether it shows or not, and `role="tooltip"` does not take `aria-expanded`.

### Merge with Phase 18

Phase 18, tooltip shared delay, merged first as #381. A tooltip that opens while another is closing, or within 300 ms after that one's `exitDelay` ends, skips its `enterDelay`, and `close()` on a showing tooltip opens that window. The two features compose without new code:

- A click opens a click tooltip at once whether or not the window is open, because `_showNow` clears the enter timer either way.
- A click tooltip that closes while showing opens the window like any other tooltip, so a hover tooltip opened right after it shows at once. That follows Phase 18's rule that any closing tooltip opens the window.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Tooltip accepts an `openOnClick` option, a boolean with default `false`. It appears in `TooltipOptions` with a doc comment and in `_defaults`. |
| R2 | With `openOnClick: false`, behavior is unchanged: hover, focus, Escape, the long press, its click swallowing and every existing Tooltip test behave as at the base commit. |
| R3 | With `openOnClick: true`, a click on the trigger shows a hidden tooltip at once, without waiting for `enterDelay`, and a click on a showing one hides it at once, without waiting for `exitDelay`. Enter or Space on a button trigger toggles it the same way, since the browser sends a click. The click still reaches the page's own click handlers. |
| R4 | With `openOnClick: true`, mouse hover on the trigger or the tooltip neither opens nor closes it, and keyboard focus on the trigger does not open it. |
| R5 | With `openOnClick: true`, a click anywhere outside the trigger and the tooltip closes an open tooltip at once. A click inside the tooltip leaves it open. This also holds when the trigger and tooltip sit in an open or a closed shadow root. The document listener is added one task after opening, exists only while the tooltip is open, and `close()` and `destroy()` remove it. |
| R6 | With `openOnClick: true`, Escape closes an open tooltip at once, as it does today. |
| R7 | With `openOnClick: true`, when focus leaves the trigger and the tooltip for another element, the tooltip closes at once. A blur with no new focus target leaves it open. |
| R8 | With `openOnClick: true`, a touch press neither starts the long press nor lingers, and the click that follows a tap toggles the tooltip like any click. The release click is not consumed. |
| R9 | `open()` and `close()` keep their documented behavior in both modes. In click mode, a tooltip opened with `open()` also closes on an outside click, and one opened from a page button's click handler stays open after that click. |
| R10 | Docs and generated guidance describe the option. The options tables in the Tooltips section of `llm.md` and in `docs/src/pages/tooltips.astro` list `openOnClick` with its type, default and behavior, the touch paragraph on the docs page and in `llm.md` says how click mode replaces the long press, the `open()` method text says a click tooltip also closes on an outside click, and the option's description says keyboard use needs a button trigger. The unreleased changelog lists the option under Added. `npm run build:skill` regenerates the derived files and `npm run check:generated` passes. |
| R11 | The bundle size change is recorded in a reviewed gzip budget line in `tests/selective-builds.test.js`. New and changed functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- Keep the change in `src/ts/components/tooltip.ts`. Read `this.options.openOnClick` in the handlers at event time, as the handlers already read `enterDelay`, so no listeners are added or removed when the option changes.
- Reuse the long press's open-at-once steps and the Escape handler's close-at-once steps instead of copying them.
- Phase 18 edits the same file. Leave `_setEnterDelayTimeout`, `_setExitDelayTimeout` and `_animate` alone so the merge stays small.
- `openOnClick` is a runtime option, so `semantics.json` and the CSS-only tooltip do not change.
- Tests run against built bundles. Build before testing, and tear instances and mocked timers down in `finally` blocks.

## Known limits

- An outside click whose handler calls `stopPropagation()` before it reaches the document does not close the tooltip. Menu has the same limit.
- iOS Safari does not send a tap on a non-interactive area to a document `click` listener, so such a tap may not close the tooltip there. A second tap on the trigger, Escape and moving focus still close it.
- Focus that leaves the page, or moves into an iframe, blurs with no new focus target, so the tooltip stays open.
- A page button whose click handler calls `open()` on a click tooltip that is already open closes it with that same click: `open()` does nothing, and the click is outside.
- `open(false)` never shows a click tooltip, since hover and focus never hold it.

## Out of scope

- A data attribute for the option.
- A `trigger` option that combines gestures, such as click and focus, or a manual mode.
- Click mode for CSS-only tooltips.
- Toggletip announcements through a live region, and `aria-expanded`.
- Closing on scroll or on window blur.
- Roadmap edits, release and publication.

## Open decisions

None. The agent decisions above stand unless the user changes them in review.
