# Scroll area page bar: requirements

- Feature: `ScrollArea` on `<html>` hides the page's native vertical scrollbar and draws its own
- Date: 2026-11-16
- Roadmap phase: [Phase 99: draw a custom vertical bar for the page](../../../../roadmap.md#phase-99-draw-a-custom-vertical-bar-for-the-page), the first phase of the milestone "custom scrollbars". No dependencies. The [mission](../../../../mission.md#product-rules) requires a change to existing markup's behavior to be opt-in, and the [tech stack](../../../../tech-stack.md#framework-stack) asks for native platform features first, with a fallback where an engine lacks one.
- Branch: `feature/2026-11-16-milestone-custom-scrollbars`. The milestone ships as one pull request, so this phase adds no branch.
- Base: `644c91760`

## Current behavior and need

`.scroll-area` is a CSS utility (`src/sass/utilities/_scroll-area.scss`, 33 lines). It sets `overflow: auto`, `scrollbar-width: thin` and `scrollbar-color` from `--scroll-area-thumb-color` and `--scroll-area-track-color`, with a `::-webkit-scrollbar` fallback for engines without `scrollbar-color`, and it restores the system bar under forced colors. On `<html>` it themes the page's own bar. There is no `ScrollArea` export and no runtime.

The native bar takes its shape and width from the operating system, so a themed page still shows a bar that the theme can only recolor. The milestone replaces it with a bar the framework draws. This phase covers the page's vertical bar and nothing else: later phases add dragging (100), containers (101), the horizontal bar (102), the hover spring (103), idle hiding (104), section marks (105) and the drag label (106).

## Scope

- A `ScrollArea` component, exported and registered for AutoInit, that acts on `<html class="scroll-area custom">`.
- Styles for the drawn bar and for hiding the native bar, in the existing utility partial.
- Docs in the scroll area page and `llm.md`, the hand-written skill reference, a `semantics.json` row, a CHANGELOG entry and gzip budget lines.
- jsdom and browser tests in Chromium, Firefox and WebKit.

## Exclusions

- Pointer interaction with the bar. The bar ignores the pointer until phase 100.
- Scroll containers other than the page. On any other element the component draws nothing (R12) until phase 101.
- The horizontal bar, hover growth, idle hiding, marks and labels.
- Pages whose scroller is `<body>` or another element because `<html>` has `overflow: hidden`. The component reads `<html>` only.
- Roadmap completion state, which the milestone records after merge.

## Decisions

Every decision here was made under delegation from project evidence. The user has not reviewed them.

| Decision | Status | Reason |
| --- | --- | --- |
| The modifier is `.custom`, so the page opts in with `<html class="scroll-area custom">` (the roadmap's open question) | Decided from evidence | It matches the milestone's name and the words authors search for. No rule in `src/sass` uses `.custom`, and it is not a color helper, which would out-rank the utility. The whole milestone ships in one PR, so the name can still change before release. |
| The bar keeps clear of fixed controls by being narrower than their inset, not by moving them (the roadmap's open question) | Decided from evidence | `.back-to-top` and `.fab-menu` both sit `16px` from the inline-end edge (`--md-comp-back-to-top-offset`, `--md-comp-fab-menu-offset`). A 12px bar leaves a 4px gap without touching either component. The width is the custom property `--scroll-area-bar-size`, which a page's own edge control can add to its inset. |
| The bar stacks at `--expressive-z-scroll-area: 999`, above toolbars, app bars and the modal rail, below non-modal sheets | Decided from evidence | A sticky top app bar spans the window at `--expressive-z-app-bar: 997` and would cover the thumb at the top of the page if the bar were lower. A side sheet at the inline-end edge has its own scrollbar on the same edge, so the page bar goes under it. `src/sass/tokens/_stacking.scss` documents the order and the override. |
| The bar element is a child of `<html>`, after `<body>` | Decided from evidence | Body-child selectors already carry meaning in the framework (`body > header` in `_navbar.scss`, the scaffold's regions) and in author CSS (`body > :last-child`). A fixed child of `<html>` matches none of them, and the AutoInit watcher on `<body>` never sees it. |
| The native bar hides through CSS that tests for the bar element, `html.scroll-area.custom:has(> .scroll-area-bar)`, with no state class | Decided from evidence | Removing the element on `destroy()` restores the native bar with no second write to undo, and a page without the runtime never matches. `:has()` is already used in `_navbar.scss` and is inside the browserslist. |
| Forced colors and coarse pointers are handled in CSS media queries, on the primary pointer (`pointer: coarse`) | Decided from evidence | The roadmap says "a coarse pointer". `any-pointer: coarse` would turn the drawn bar off on every laptop with a touch screen. A media query needs no script and follows a change while the page is open. |
| Thumb position comes from `animation-timeline: scroll(root block)` under `@supports`, and from a passive `scroll` listener that writes one custom property elsewhere | Decided from evidence | The roadmap names both paths. `_navbar.scss` already guards a root scroll timeline with `@supports (animation-timeline: scroll())`, and its comment explains why the guard is required. |
| Thumb length comes from script, from a `ResizeObserver` on `<html>` and `<body>`, with a public `refresh()` for layouts neither observation sees | Decided from evidence | CSS has no value for the ratio of window to document. A body with a fixed height whose content overflows doesn't resize either box, so the page needs a way to ask for a new measurement. Three components already name that method `refresh()`. |
| The thumb is never shorter than 48px | Decided from evidence | A proportional thumb on a page 200 windows tall would be 4px long. Phase 100 makes the thumb a drag target, and 48px is the framework's target size. |
| `AutoInit()` with its default context also starts `ScrollArea` on `<html>`, and no other component | Decided from evidence | `claimed()` in `src/ts/components/registry.ts` runs `querySelectorAll` on `document.body`, which never returns `<html>`. The mission's initialization goal is that markup starts components without page script. Checking only this entry keeps every other component's behavior on existing pages. |
| No options and no events in this phase | Decided from evidence | Nothing in the phase is configurable. Phases 104 and 105 decide their own options. |
| The styles stay in `utilities/_scroll-area.scss` | Decided from evidence | The modifier belongs to the utility, and a selective build that includes the utility must get the bar. The partial's capability pin changes with it (R15). |

## Technical constraints

- `ScrollArea` extends `Component`, takes listeners on `this._events.signal`, and reads the document and window through `this.el.ownerDocument`, as `BackToTop` does, so it works in an iframe.
- Each new function stays below cyclomatic complexity 5 (the fallow pre-commit gate).
- A custom property that only script sets needs a `var()` fallback, or `tests/tokens.test.js` fails.
- The bar holds no text or icon, so its sizes are in pixels.
- `color-mix`, if used, mixes in `oklab` (`tests/color-roles` rule).
- Tests run against the built bundles and tear instances down in `finally` blocks.

## Requirements

Markup and structure

- **R1** `ScrollArea.init(document.documentElement)` on `<html class="scroll-area custom">` appends one `<div class="scroll-area-bar" aria-hidden="true">` holding one `<div class="scroll-area-thumb">` as the last child of `<html>`. Neither element is focusable, and the bar has `pointer-events: none`, so a click at the inline-end edge reaches the content under it.
- **R2** While the bar element exists, the page's native vertical bar is hidden: the same rule sets `scrollbar-width: none` on `<html>` and `display: none` on its `::-webkit-scrollbar`, with no `@supports` guard, so an engine that has one property and lacks `scrollbar-color` is covered too. Wheel, keyboard, touch, find-in-page and fragment links keep scrolling the page, because the component never sets a scroll position and never cancels an event.
- **R3** A page with `<html class="scroll-area custom">` and no `ScrollArea` instance keeps the utility's themed native bar (`scrollbar-width: thin`). Removing the `custom` class from `<html>` while an instance exists also brings the native bar back and stops displaying the drawn bar.

Geometry

- **R4** The bar is `position: fixed`, spans the window's block size, sits at the inline-end edge (the left edge under `dir="rtl"`), and is `var(--scroll-area-bar-size, 12px)` wide. The thumb is 8px wide with fully rounded ends, colored by `--scroll-area-thumb-color` with the utility's default, over a track colored by `--scroll-area-track-color`.
- **R5** The thumb's length is the track's length times `clientHeight / scrollHeight` of `<html>`, and never less than 48px. On a page three windows tall the thumb is a third of the track's length.
- **R6** The thumb's offset from the track's start is `scrollTop / (scrollHeight - clientHeight)` times the track's length minus the thumb's length, with the ratio clamped to 0 through 1 so an overscroll bounce doesn't move the thumb off the track. At the end of the page the thumb's end touches the track's end. An instance that starts on a page already scrolled, after a reload or a fragment URL, shows the right offset before any scroll event.
- **R7** Where `CSS.supports('animation-timeline: scroll()')` is true, the position comes from a CSS animation on the root scroll timeline and the component adds no `scroll` listener. Elsewhere the component adds one passive `scroll` listener that writes the position at most once per animation frame. Both paths give the same geometry within 1px.
- **R8** With `prefers-reduced-motion: reduce`, the thumb still follows the scroll position in both paths. The position is information, so the reduced-motion rules must not freeze it.

Updates

- **R9** When the size of `<html>` or `<body>` changes, or the window resizes (a shorter window resizes neither box when `<html>` has auto height, so the component also listens for `resize`), the thumb's length and position update without a scroll. `refresh()` measures again on request. The docs name the case that needs it: content that overflows a fixed-height body.
- **R10** When the page cannot scroll, because `scrollHeight` is not greater than `clientHeight` or because the computed `overflow-y` of `<html>` is `hidden` or `clip` at a measurement, the bar has the `hidden` attribute. It loses the attribute at the next measurement that finds the page scrollable. The framework's own scroll lock, `html:has(dialog:modal) { overflow: hidden }` in `_dialog.scss`, triggers no measurement, so a CSS rule hides the bar while a modal dialog is open and shows it again on close. A page that locks scrolling its own way calls `refresh()`.

Fallbacks and placement

- **R11** Under `forced-colors: active`, `pointer: coarse` or print, the drawn bar has `display: none`. Under forced colors and a coarse pointer the native bar shows as the utility defines it for that mode, with an instance present.
- **R12** `ScrollArea.init()` on an element other than the document element appends nothing, adds no listener or observer, and leaves the element's native bar alone. `destroy()` on such an instance is safe.
- **R13** With default offsets, the bar's box does not intersect the box of `.back-to-top` or of `.fab-menu`, in `ltr` and `rtl`. The bar's `z-index` is `var(--expressive-z-scroll-area)`, declared as 999 in `_stacking.scss`, listed in that file's order comment, and added between `modal-rail` and `sheet` in the order list of the stacking test in `tests/tokens.test.js`. The docs tell authors to add `var(--scroll-area-bar-size, 12px)` to the inset of a fixed control they place closer than 12px to the inline-end edge.

Lifecycle

- **R14** `destroy()` removes the bar element, disconnects the observers and removes the listener, and the native bar returns. Initializing twice leaves one bar and one instance, because the base constructor destroys the earlier one. `AutoInit(context)` starts `ScrollArea` on a matching `<html>` when `context` is that document's `<body>`, whether the argument was passed or defaulted, since `AutoInit(document.body, options)` is the documented way to pass options. `.no-autoinit` on `<html>` opts out. A later `AutoInit()` replaces the instance as it does for every component, and one bar remains. No other component starts on `<html>`, even when `<html>` carries its selector, and a context other than the body does not touch `<html>`.

Project records

- **R15** The phase updates every record that reads the utility or the export list:
  - `semantics.json` gets a scroll area row, written before the registry entry, saying the bar and its `aria-hidden` are the framework's and must not be authored. `npm run build:semantics` regenerates `SEMANTICS.md`.
  - `docs/src/data/nav.ts` adds `exports: ["ScrollArea"]` to the scroll area entry. `docs/src/pages/scroll-area.astro` and `llm.md` document the modifier, `refresh()`, `--scroll-area-bar-size`, `--expressive-z-scroll-area`, the forced-colors, coarse-pointer and print fallbacks, the fixed-control guidance, the one-time widening of the page on systems with classic scrollbars when the native bar hides, and the page-only limit. Both AutoInit tables in `llm.md` and `docs/src/pages/auto-init.astro` list the component.
  - `skills/expressivecss/expressivecss-usage/references/helpers.md` is hand-written and gets the same facts. Its sentence "It requires no initialization" stays true for the plain utility and gains the modifier's exception.
  - `tests/fixtures.js` gets a fixture and the hardcoded counts move (`AUTO_INIT_FIXTURES.length` in `tests/autoinit.test.js`, and the guide and reading-budget counts in the skill tests if the generator's output changes them).
  - `CHANGELOG.md` gets an Added entry. No migration note is needed, because pages without the modifier don't change.
  - `tests/selective-builds.test.js` gets reviewed gzip budget lines for the CSS and the JS, measured against the merge base `644c91760`, and its existing assertion on the utility's first declarations still passes.
  - `docs/src/data/component-decisions.json` re-pins `src/sass/utilities/_scroll-area.scss` and `tests/scroll-area-browser.test.js` only if their pins matched at the base, and pins any `sourceRevision` to a commit on this branch that holds the new files.
  - `npm run build:skill` runs after the last edit.
- **R16** `npm run verify` and `npm test --prefix mcp/expressivecss` pass, with the three existing scroll area browser tests unchanged and passing.

## Risks considered

- Two at once. Two `init` calls, or `AutoInit()` after an explicit `init`, are R14. Two documents (an iframe) each get their own bar through `ownerDocument`, which V1 checks.
- Bad input. A non-root element is R12. A page that cannot scroll or has `overflow: hidden` is R10. `init` before `<body>` exists works, because the bar is a child of `<html>` and the body observation starts only if a body exists; the docs say to call `refresh()` after the body arrives, or to use `AutoInit()`.
- Refusal. The phase adds no permission or data boundary.
- Readers. `tests/scroll-area-browser.test.js`, `tests/selective-builds.test.js`, `tests/expressivecss-skill.test.js` (names it expects in the skill), the docs pages that link the utility (`back-to-top`, `lists`, `helpers`, `javascript`), the capability pins and the generated skill and MCP copies are covered by R15 and R16. `BackToTop` and `ScrollSpy` read the window's scroll through `IntersectionObserver`, which the phase doesn't change. The top app bar's scroll-timeline animation reads `scroll(root)` and shares no name with the thumb's keyframes.
- UI states. Without JavaScript is R3. RTL is R4 and R13. Reduced motion is R8. Forced colors, coarse pointers and print are R11. Enlarged text changes the document's height, which R9 covers. A narrow window keeps the 12px bar, and coarse-pointer phones get the native bar.
- Layout shift. On a system with classic scrollbars, hiding the native bar widens the page once when the instance starts. The CSS cannot hide it earlier without breaking R3, so the docs state it (R15).
- Content under the bar. The bar overlays the last 12px of the window, as an overlay scrollbar does. That includes about 8px of a top app bar's trailing icon button, which sits 4px from the edge. The bar takes no pointer events in this phase, so nothing under it is blocked. Phase 100 makes the bar a pointer target and must keep that button usable.
- Smooth scrolling. `scroll-behavior: smooth` changes how the page reaches a position, and both paths read the position each frame, so the thumb follows it.
- Contrast. The thumb's default color is `on-surface-variant`, which meets 3:1 on the surface roles. Over author content at the edge the framework can't promise a ratio, the same as a native overlay bar, and the docs say so with the color properties.
- Pinch zoom moves the visual viewport, not the layout viewport. The bar stays with the layout viewport, as fixed elements do, and this phase leaves it there.
- `specs/checklist.md`: the project has none.
