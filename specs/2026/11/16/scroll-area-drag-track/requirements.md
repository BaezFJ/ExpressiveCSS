# Scroll area drag and track press: requirements

- Feature: the page bar's thumb can be dragged, and a press on the track scrolls one window toward the press
- Date: 2026-11-16
- Roadmap phase: [Phase 100: drag the thumb and page from the track](../../../../roadmap.md#phase-100-drag-the-thumb-and-page-from-the-track), the second phase of the milestone "custom scrollbars". It depends on phase 99. The [mission](../../../../mission.md#product-rules) keeps accessibility contracts stable and lets Material and WCAG win over other guidance, and the [tech stack](../../../../tech-stack.md#framework-stack) asks for native platform features before script.
- Branch: `feature/2026-11-16-milestone-custom-scrollbars`. The milestone ships as one pull request, so this phase adds no branch.
- Base: `df7ba6d3b`. Phase 99 is built, reviewed and pushed at this commit, and it merges with the rest of the milestone. Its [spec](../scroll-area-page-bar/requirements.md) is the accepted baseline here, and the roadmap keeps its unfinished label until the merge.

## Current behavior and need

`ScrollArea` on `<html class="scroll-area custom">` appends a fixed 12px bar with an 8px thumb at the inline-end edge (`src/ts/components/scrollArea.ts`, 94 lines, and `src/sass/utilities/_scroll-area.scss`). The thumb's length and position follow the document. The bar has `pointer-events: none`, so the pointer can't move the page with it, and a click on the last 12px of the window reaches the content under the bar.

A scrollbar that can't be dragged is only an indicator. People who scroll with a mouse and no wheel, or who want to cross a long page in one move, need the thumb and the track to respond. Phases 101 and 102 give containers and the horizontal bar "the same thumb, drag and track behavior", so this phase defines that behavior once.

Making the bar a pointer target has two costs. Phase 99 recorded the first: a top app bar's trailing icon button is 48px wide and sits 4px from the window's edge, so its last 8px lie under the 12px bar. The second is target size. WCAG 2.2 success criterion 2.5.8 exempts a scrollbar the browser draws, and its [Understanding document](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) says a scrollbar whose dimensions the author changed needs passing spacing from neighboring targets, with a back-to-top link beside a scrollbar as its example. The 12px bar is narrower than 24px, so a 24px circle centered on it reaches 6px past its inner edge, and `.back-to-top` and `.fab-menu` sit 4px from it. This phase has to keep every framework control at the edge fully usable and 6px clear.

## Scope

- Pointer handling in `ScrollArea` for the page bar: thumb drag and track press.
- Styles that make the bar a pointer target, in the utility partial.
- One clearance property, set in the utility partial while the bar element exists, and one declaration each in `_navbar.scss`, `_back-to-top.scss` and `_fab-menu.scss` that reads it.
- Docs in the scroll area, app bar, back-to-top and floating action button pages and `llm.md`, the hand-written skill reference, the `semantics.json` note, the CHANGELOG entry and gzip budget lines.
- jsdom and browser tests in Chromium, Firefox and WebKit, in the two test files phase 99 added.

## Exclusions

- Repeating the page scroll while the press is held (decided below).
- A press that jumps the thumb to the pointer, as Shift-click does on some native bars.
- Keyboard or screen reader access to the bar. It stays `aria-hidden` and unfocusable, and keyboard scrolling stays native.
- Hover and pressed appearance (phase 103), idle hiding (104), containers (101), the horizontal bar (102), marks (105) and the drag label (106).
- New options, events or public methods.
- The bar's size, the 48px minimum thumb and the stacking token, settled in phase 99. The insets of `.back-to-top`, `.fab-menu` and the app bar don't change on a page without the drawn bar.
- `Component.init` called from a parent window on an element of another window. Phase 99 recorded that limit of the base class, and an instance started inside its own iframe works.
- Roadmap completion state, which the milestone records after merge.

## Decisions

Every decision here was made under delegation from project evidence. The user has not reviewed them.

| Decision | Status | Reason |
| --- | --- | --- |
| Holding a press on the track does not repeat the scroll (the roadmap's open question) | Decided from evidence | The phase's text and completion check ask for one window per press. Repeating needs a start delay, an interval, a stop when the thumb reaches the pointer, and cancellation on release, cancel and `destroy()`, and nothing in `src/ts` has a hold-to-repeat helper to reuse. A single press behaves the same with or without repeat, so a later phase can add it without changing this contract. Phases 101 and 102 copy this behavior, so every extra rule is built three times. |
| The drag maps the pointer's travel to the thumb's travel, not to the track's length | Decided from evidence | Phase 99's R6 places the thumb at `progress × (track − thumb)`. The thumb stays under the pointer only if the document scrolls `range ÷ (track − thumb)` for each pixel the pointer moves. The roadmap's check says "half the track's length". Read literally, on a page three windows tall that would move the thumb two thirds as far as the pointer. V4 reads it as half of the thumb's travel, which scrolls half the scrollable distance. |
| The bar captures the pointer with `setPointerCapture`, and the listeners take the instance's signal | Decided from evidence | Capture is the platform's way to keep `pointermove` coming after the pointer leaves the element or the window. `colorPicker.ts` and `core/resizeHandle.ts` already use it. `dragHandle` in `resizeHandle.ts` reads horizontal travel and waits 4px before moving, so it doesn't fit, and the phase adds no helper. |
| A drag sets the position with `scrollTo({ behavior: 'instant' })`. A track press calls `scrollBy` without a behavior. | Decided from evidence | `_scrollspy.scss` sets `scroll-behavior: smooth` on `html:has(.scrollspy)`, and a smooth scroll would start a new animation at every pointer move. A track press is one step, so it follows the page's own `scroll-behavior`, which the framework only sets to smooth under `prefers-reduced-motion: no-preference`. `backToTop.ts` also scrolls through its window's `scrollTo`. |
| The drag keeps the ratio it measured at the press | Decided from evidence | A page that loads more content when the drag nears the end grows mid-drag. A ratio read at every move would jump the page at the next move. With the press ratio the page keeps moving at the same rate, and the thumb catches up with the pointer at the next press. |
| A press on the bar leaves focus and the selection alone | Decided from evidence | A native scrollbar doesn't blur a text field or clear a selection. The bar is not focusable, so an uncancelled press would move focus to the body. |
| The bar sets `touch-action: none` and treats mouse, pen and touch alike | Decided from evidence | The drawn bar shows when the primary pointer is fine, which includes a pen and a laptop with a touch screen. Without the property the browser takes a pen or touch drag for a pan and ends it with `pointercancel`. |
| While the bar element exists, `<html>` carries `--scroll-area-bar-clearance`, the distance from the inline-end edge that keeps a target clear of the bar: `max(var(--scroll-area-bar-size, 12px), calc(var(--scroll-area-bar-size, 12px) / 2 + 12px))`, 18px by default | Decided from evidence | WCAG 2.5.8's spacing exception draws a 24px circle on the center of an undersized target, and the circle must not reach another target. The bar's center is half its width from the edge, so the circle ends 12px further in. The Understanding document applies this to an author-sized scrollbar beside a back-to-top link. Spacing is the smallest fix. A 24px-wide bar or hit strip would cover twice the content and would overlap the 16px controls. |
| The page-level top app bar, `.back-to-top` and `.fab-menu` read the property, each with its current value as the fallback | Decided from evidence | The M3 app bar spec puts a 48dp target 4dp from the container's edge, and phase 99 found 8px of that target under the bar. A native classic scrollbar keeps these controls clear the same way, by taking the edge. One inherited property needs no second copy of the media conditions, and a page without the drawn bar resolves every fallback to today's value, so the change is opt-in. The alternatives each fail. Leaving the overlap blocks part of a target and fails the spacing rule. Stacking the bar under the app bar hides the thumb at the top of the page, which phase 99 ruled out. A gutter on `<html>` narrows every page and reverses phase 99's overlay decision. Passing presses through the track needs a hit test on every press. |
| The property is set whenever the bar element exists under the drawn bar's media conditions, whether or not the bar has `hidden` | Decided from evidence | `_measure()` sets `hidden` when a modal dialog locks the page and a resize or `refresh()` measures during the lock, and when the page can't scroll. A clearance tied to `hidden` would shift the app bar's actions and the fixed controls in both cases. Tied to the element, they never move after the instance starts, as with `scrollbar-gutter: stable`. An unscrollable page, and a scaffold on a wide window where the panes scroll, keep 18px of clearance they don't need. |
| A drag ends when the bar stops being displayed | Decided from evidence | A modal dialog locks the page with `overflow: hidden`, and script can still scroll a locked page. The capture outlives `display: none`, so without this rule a drag in progress would scroll the page behind a dialog that opened on a timer. |
| No options, events or methods | Decided from evidence | Nothing here is configurable, and phase 99 made the same call. Phases 104 to 106 decide their own. |

The thumb and the track are one scrollbar and share the bar's box, so the circle is measured from the bar. Scrolling stays available by wheel, keyboard and touch, and the thumb's drag has the track press as its single-pointer alternative (2.5.7).

## Technical constraints

- Listeners go on the bar element with `this._events.signal`. A per-drag controller, if one is used, comes from `controllerFor`, as in `colorPicker.ts`.
- The component reads the document and window through `this.el.ownerDocument`, and scrolls through that window's `scrollTo` and `scrollBy`.
- The component adds no `wheel`, `touchstart` or `keydown` listener and cancels no scroll.
- Each new function stays below cyclomatic complexity 5 (the fallow pre-commit gate), and the phase exports nothing new.
- The bar holds no text or icon, so its sizes stay in pixels.
- jsdom has no pointer capture, no `scrollTo` and no layout, so the jsdom tests stub the first two, and the hit test of R4 reads no element box. Tests run against the built bundles and tear instances down in `finally` blocks.

## Requirements

Pointer target

- **R1** While the drawn bar is displayed, the bar takes pointer input. The rule `html.scroll-area.custom > .scroll-area-bar` no longer sets `pointer-events: none`, and it sets `touch-action: none`. The bar keeps `aria-hidden="true"`, and neither it nor the thumb is focusable. This replaces the last clause of phase 99's R1: a click on the bar no longer reaches the content under it. Wherever the bar has no box (no instance, no `custom` class, the `hidden` attribute, an open modal dialog, forced colors, a coarse pointer, print), content at the edge gets the pointer as before.
- **R2** Only the primary button of the primary pointer acts on the bar, and mouse, pen and touch act alike. Any other button, a primary press with Ctrl held (the context-menu press on macOS), a second pointer, and a press that starts while a drag is in progress do nothing, and the component doesn't cancel `contextmenu`, so a right-click still opens the menu. A press, a drag and a release on the bar leave `document.activeElement` and the document's selection unchanged, and a drag selects no text.
- **R3** With the pointer over the bar, the wheel scrolls the page.

Thumb drag

- **R4** A press starts a drag when its `clientY` falls inside the thumb's block range, anywhere across the bar's width, so the 2px beside the 8px thumb drag too. The component works the range out at the press from the document's live `scrollTop`, `scrollHeight` and `clientHeight` with the formulas of phase 99's R5 and R6, because the timeline path stores no current offset. At the press the component captures the pointer on the bar and records the scroll position, the pointer's `clientY` and the ratio `(scrollHeight − clientHeight) ÷ (track length − thumb length)`. Each pointer move sets the document's block scroll position to the recorded position plus the pointer's travel times that ratio, and leaves the inline position alone. When the thumb has no travel, because the track is no longer than the 48px minimum, a press on it does nothing. The thumb stays under the pointer within 1px, one frame later on the listener path. Dragging through half of the thumb's travel scrolls half of the scrollable distance, with the proportional thumb and with the 48px minimum thumb.
- **R5** The drag continues while the pointer is outside the bar and outside the window. It ends on release, on `pointercancel` and when the bar loses the capture, wherever the pointer is. After it ends, pointer moves don't scroll.
- **R6** A drag past either end stops at that end, and bringing the pointer back to where the press started restores the position the page had at the press. A wheel or key scroll during a drag doesn't move that anchor, so the next pointer move puts the page back on the drag's mapping, as a native bar does.
- **R7** The drag sets the position without animation when `<html>` has `scroll-behavior: smooth`.
- **R8** When the document's height changes during a drag, the next move still uses the ratio recorded at the press.
- **R9** When the bar stops being displayed during a drag (a modal dialog opens, `custom` is removed, the page stops being scrollable), the drag is over: no pointer move scrolls the page while the bar is not displayed, and none scrolls it after the bar is displayed again, until a new press.

Track press

- **R10** A press on the bar outside the thumb's block range, found as in R4, scrolls the document by `clientHeight`: toward the start when the press is before the thumb, toward the end when it is after. Each press scrolls once. Holding the press doesn't repeat it, and moving the pointer while it is held scrolls nothing more and starts no drag. The step follows the page's `scroll-behavior`, and a step past either end stops at that end.
- **R11** After a drag or a track press, the thumb's length and position still satisfy phase 99's R5 and R6 on the timeline path and on the listener path.

Clearance

- **R12** Under `screen and (forced-colors: none) and (not (pointer: coarse))`, `html.scroll-area.custom:has(> .scroll-area-bar)` sets `--scroll-area-bar-clearance` to `max(var(--scroll-area-bar-size, 12px), calc(var(--scroll-area-bar-size, 12px) / 2 + 12px))`. That is 18px by default, 19px for a 14px bar and 30px for a 30px bar. The property stays set while the bar has `hidden`, including through a `refresh()` or a resize with a modal dialog open and on a page that can't scroll. It is unset without an instance, without `custom`, after `destroy()`, under forced colors, with a coarse pointer and in print.
- **R13** Three framework controls read the property. The bar of a page-level top app bar has `padding-inline-end: var(--scroll-area-bar-clearance, 4px)`, in the small, medium and large variants. Page-level means `body > header` or the scaffold's `body > .scaffold > header`, whose document scrolls on compact windows. `.back-to-top` and `.fab-menu` keep their existing `inset-inline-end` declarations and gain a second one, `max(<their offset property>, var(--scroll-area-bar-clearance, 0px))`, under `html.scroll-area.custom:has(> .scroll-area-bar)` only, so an offset an author wrote as a unitless `0` still works on every page without the bar element. With the bar displayed, the box of the trailing icon button, of `.back-to-top` and of `.fab-menu` with its open menu each end at least 12px from the bar's center line, 6px from a 12px bar. The criterion draws one circle at the center of the bar's box, and this rule is stricter: it holds along the bar's whole length, because the thumb moves. It holds in `ltr` and `rtl`, and a press anywhere in each control reaches it. An offset an author raised above the clearance is kept. Where the property is unset, the three computed values are the 4px, 16px and 16px they are today, and any other app bar, such as one in an article or a dialog, keeps 4px in every case.

Lifecycle

- **R14** `destroy()` during a drag ends it and removes the bar and its listeners. Later pointer moves scroll nothing and throw nothing. A new instance drags and pages as the first did. An instance on an element other than the document element adds no pointer listener (phase 99's R12). An instance in an iframe scrolls the iframe's window and never the parent's.
- **R15** `ScrollArea` gains no option, event or public method, and `refresh()` and AutoInit behave as phase 99 specified.

Project records

- **R16** The phase updates every record that describes the bar:
  - `docs/src/pages/scroll-area.astro`, the scroll area section of `llm.md` and `skills/expressivecss/expressivecss-usage/references/helpers.md` say "ignores pointer input" today. They describe the thumb drag, the one-window track press without repeat, and that a press keeps focus and the selection. They document `--scroll-area-bar-clearance` and replace the fixed-control guidance: the default 16px inset becomes 18px beside the drawn bar, the app bar's 4px becomes 18px, and an author's own edge control uses `max(<its inset>, var(--scroll-area-bar-clearance, 0px))` to stay 6px clear. They also say that `--scroll-area-bar-size` and `dir` belong on `<html>`, and that the two offset properties need a length with a unit beside the drawn bar. The phrases `tests/expressivecss-skill.test.js` expects (`ScrollArea`, `refresh()`, `page-only`, `16px inset`, `classic scrollbars`) stay.
  - `docs/src/pages/navbar.astro`, `docs/src/pages/back-to-top.astro`, `docs/src/pages/floating-action-button.astro` and their sections of `llm.md` each say that the control keeps clear of the custom page bar.
  - `semantics.json` keeps its rule. Its note stops calling the bar decorative. `npm run build:semantics` regenerates `SEMANTICS.md`, and `npm run check:generated` passes for every generated copy, `mcp/expressivecss/semantics-data.json` included.
  - The class comment in `scrollArea.ts` stops saying "decorative".
  - `CHANGELOG.md`: the Unreleased `ScrollArea` entry gains the drag, the track press and the edge clearance. Phase 99 is unreleased, so no migration note is needed.
  - `tests/selective-builds.test.js` gets reviewed gzip budget lines for the JS and the CSS, measured against `df7ba6d3b`.
  - `docs/src/data/component-decisions.json`: the pins for `_scroll-area.scss`, `_navbar.scss` and `_fab-menu.scss` already differ from their files at the base, so they stay as they are. The pin for `_back-to-top.scss` matches its file at the base, so it is re-pinned to the changed file. The phase adds no file, so `sourceRevision` stays.
  - `npm run build:skill` runs after the last edit.
- **R17** `npm run verify` and `npm test --prefix mcp/expressivecss` pass. The existing scroll area tests pass with one intended change. The phase 99 browser test "page bar opt-in restores native scrolling and ignores pointer" clicks through the bar to an edge button. It now expects the click to stay on the bar, its title and the jsdom test title that says "decorative" change to match, and its later assertions allow for the page the two clicks scroll.

## Risks considered

- Two at once. A second pointer or a second press during a drag is R2. Two instances are phase 99's R14, and `destroy()` during a drag is R14 here. Two documents each scroll their own window (R14).
- Bad input. A non-primary button is R2. A page that stops being scrollable or gets locked during a drag is R9. A drag past the ends is R6. A press on an unscrollable page can't happen, because the bar has no box (R1).
- Refusal. The phase adds no permission or data boundary.
- Readers. The three hand-written docs, the semantics note, the skill test's expected phrases, the budget lines and the capability pins are R16. The phase 99 test that asserted click-through is R17. `tests/app-bar.test.js`, `tests/app-bar-js.test.js`, `tests/back-to-top.test.js` and `tests/back-to-top-browser.test.js` run without a `ScrollArea` instance, so the values they see are unchanged, and R17 runs them. Phase 99's V9 asserts only that the fixed controls don't intersect the bar, which still holds at 18px. `BackToTop` and `ScrollSpy` watch the scroll through `IntersectionObserver` and see a drag as any other scroll. The top app bar's scroll-timeline fill reads the same root scroll.
- UI states. RTL changes the edge, covered by R13, and leaves the drag's axis alone. Reduced motion: the component animates nothing, and the track step follows the page's `scroll-behavior`. Forced colors, coarse pointers and print show no bar (R1). Without JavaScript there is no bar. Enlarged text changes the document's height, which phase 99's R9 measures before the next press.
- Other content at the edge. A docked toolbar pads its actions 16px from the edge, and a fixed toolbar is centered, so a docked toolbar whose last action reaches its padding edge is 2px short of the clearance. A fixed `.navigation-bar` and the modal rail also reach the edge under the bar. A snackbar, 8px from the edge on compact windows, and a bottom sheet stack above the bar and cover it while they show. The docs give the property for an author's own edge controls (R16), and this phase changes only the three controls R13 names. Page content in the last 12px is under the bar, as it is under a native overlay bar, and the docs say that the bar takes the press there.
- Layout shift. The three controls move once, when the instance starts, together with the page's one-time widening that phase 99 documents. They don't move when a dialog opens or when the page starts or stops being scrollable (R12).
- Smooth scrolling is R7 and R10. An overscroll bounce can't start from a drag, because `scrollTo` clamps.
- An iframe. Capture keeps the drag alive when the pointer leaves the frame, the same as leaving the window (R5).
- Other listeners. The bar doesn't stop propagation, so a document-level outside-press listener, such as an open menu's, treats a press on the bar as a press outside it.
- Direction. The bar's side follows `dir` on `<html>`, as in phase 99. A page that sets `dir` only on `<body>` or on the header gets the clearance on that element's own inline-end side, which this phase doesn't correct.
- A track step is a full `clientHeight`, as the roadmap asks, so a sticky app bar covers the first lines of each new page. `scroll-snap-type` on `<html>` snaps after each instant `scrollTo`, as it does after any script scroll. Neither is changed here.
- Two quick track presses during a smooth scroll each call `scrollBy`, and the browser resolves them as it does for any script scroll.
- Pinch zoom. The bar stays with the layout viewport, as in phase 99, and `clientY` is in the same coordinates.
- Target size is R12 and R13, measured in V9.
- `specs/checklist.md`: the project has none.
