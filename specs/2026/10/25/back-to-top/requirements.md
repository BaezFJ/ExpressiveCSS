# Back-to-top button

Date: 2026-10-25
Roadmap phase: Phase 44, back-to-top button
Branch: `feature/2026-10-25-back-to-top`
Base: `origin/master` at `a9bbf77ad9edd0f44ce584e71f07a485fe6f2933` (#425)
Status: implemented 2026-10-25; merged as #433

Follow the [mission's agreed scope for components and behaviors](../../../../mission.md#agreed-scope), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 44](../../../../roadmap.md#phase-44-back-to-top-button). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked Phase 44. Phases 42 to 51 are being specified in parallel threads, so this spec skips the earliest-unfinished-phase pick. Phase 44 has no dependencies, and no later phase depends on it. This spec leaves the roadmap's completion state unchanged.

## Current behavior

These facts come from the base commit.

- Nothing in `src/ts`, `src/sass` or `docs/src` provides a back-to-top control. A page that wants one writes its own scroll listener, styles and focus handling.
- `AppBar` in `src/ts/components/appBar.ts` reacts to page scroll without a scroll listener. It inserts a zero-height, `aria-hidden` sentinel after the header and watches it with an `IntersectionObserver`. `ScrollSpy` also uses `IntersectionObserver`.
- `Tabs`, `Tooltip`, `MessageScroller`, `Confetti` and `LineChart` read `prefers-reduced-motion: reduce` through `matchMedia`. `tabs.ts` picks `'instant'` or `'smooth'` from it.
- A FAB is `button.circle.extra` (56dp). `.fab-menu` is `position: fixed` at `inset-inline-end` and `bottom` of `--md-comp-fab-menu-offset` (16px), with `--md-comp-fab-menu-z` (997).
- The docs layout already has a skip link, `a.visually-hidden-focusable.button.filled.docs-skip-link` with `href="#docs-main"`, and `<main id="docs-main" tabindex="-1">`.
- Following an in-page link scrolls to its target but does not move focus to a target that is not focusable. Without `tabindex="-1"` on the target, focus stays on the link.
- Components join AutoInit through one line in `src/ts/components/registry.ts`, and `tests/fixtures.js` holds hand-written AutoInit fixtures.

## Scope

### Requirements

- R1. Markup is an in-page link: `<a class="back-to-top button circle extra" href="#main" aria-label="Back to top">` with an icon. The FAB classes give it the look. Without the script it is an ordinary visible link that jumps to its target.
- R2. A `BackToTop` component, started by `AutoInit()` from `.back-to-top`, keeps the link hidden while the window's scroll position is above the `threshold` option. Hidden means not painted, not reachable by Tab, not hit by the pointer and absent from the accessibility tree. The link appears once the page scrolls past the threshold and hides again when the page scrolls back above it.
- R3. The component watches the threshold with an `IntersectionObserver` on a sentinel, like `AppBar`, and adds no scroll listener.
- R4. `threshold` defaults to one viewport height and can be set from markup through `data-back-to-top-options` or from `BackToTop.init(el, options)`.
- R5. Activating the link by click, Enter or a screen reader's activation scrolls the window to the top and moves focus to the element the `href` names. Focus moves without a second scroll jump, and the next Tab reaches the first focusable element after the target. If the target is not focusable, the component makes it focusable for this move only, so the target's Tab behavior does not change afterward.
- R6. The scroll is smooth, and instant under `prefers-reduced-motion: reduce`. The link fades in and hides at once; under reduced motion it also appears at once.
- R7. Styles: the link is fixed at the window's bottom inline-end corner, with offset and stacking custom properties so a page can move it away from a `.fab-menu` or a navigation bar. Its icon-holding box is sized in `rem()`.
- R8. `destroy()` removes the sentinel, disconnects the observer, removes every attribute the component added, and leaves the markup as authored.
- R9. `semantics.json` gains a `back-to-top` entry: the link needs an accessible name, and the hidden state is the framework's, so authors must not write it. `npm run build:semantics` and `npm run build:skill` regenerate the derived copies.
- R11. A focused link stays shown until it loses focus, so pressing Home on it does not drop focus to the body. Found in the code review on 2026-10-25.
- R12. A click with Ctrl, Meta, Shift or Alt, or one a page handler already prevented, is left to the browser. Found in the code review on 2026-10-25.
- R13. A `threshold` that is not a CSS length falls back to `'100vh'` with a console warning. Found in the code review on 2026-10-25.
- R10. A docs page, the `llm.md` section, the changelog's Added entry and a reviewed gzip budget line in `tests/selective-builds.test.js` document and account for the component.

### Exclusions

- Scroll containers. The component watches the window only. A pane, dialog or `.scroll-area` that scrolls on its own is out of scope; the docs say so.
- A `<button>` form. A link works without the script and names its own focus target.
- A scroll listener, scroll-driven animations or a progress ring that fills with the scroll position.
- Hiding the link while the person scrolls down and showing it while they scroll up. It depends on position only.
- Window-size prefixes. The control does not change the page layout.

## Decisions

### Confirmed in the interview on 2026-10-25

- Plan: start with a three-engine probe, then the component, styles, tests and docs in five groups. WebKit scrolls asynchronously and a `focus()` call can cancel a smooth scroll, so engine behavior shapes the activation code before tests are written.
- Markup and behavior: an enhanced in-page link (R1), hidden until the window scrolls past `threshold`, default one viewport height (R2, R4), watched by a sentinel `IntersectionObserver` (R3). Activation scrolls to the top, instantly under reduced motion, and focuses the `href` target (R5, R6). Window scrolling only.
- Merge requires the three-engine roadmap test, the hidden-state checks, the reduced-motion check and the jsdom lifecycle tests, on top of the standard gates: docs, `llm.md`, the budget line, `build:skill`, `npm run verify`, the MCP tests and `npm run verify:packages`.

### Proposals for implementation

These follow from the code and can change during implementation if the probe or the code disagrees.

- `threshold` is a CSS length string, default `'100vh'`, applied as the sentinel's `top`. The sentinel then tracks viewport resizes without script. The probe confirms that an absolutely positioned sentinel at the start of `<body>` measures from the document's top in all three engines.
- The hidden state is the `inert` attribute, which takes the link out of the tab order, the pointer and the accessibility tree in one step. CSS styles `.back-to-top[inert]` as `visibility: hidden` with `opacity: 0`, so a page without the script never hides the link. Showing removes `inert`.
- Activation calls `preventDefault()`, then `target.focus({ preventScroll: true })`, then `window.scrollTo({ top: 0, behavior })`. The probe found both orders work. If the target has no `tabindex` and is not focusable, the component sets `tabindex="-1"` and removes it on the target's next `blur`.
- An `href` of `#` or `#top`, or one that names no element, scrolls to the top and focuses `document.body` through the same temporary `tabindex`. The docs recommend naming the main landmark.
- Custom properties: `--md-comp-back-to-top-offset` (16px, matching the FAB menu) and `--md-comp-back-to-top-z` (997). The docs show raising the offset when a `.fab-menu` shares the corner.
- Semantics rules: `require-accessible-name` on `.back-to-top`, and a `forbid` rule on `.back-to-top[inert]`. Whether a rule can also check that the `href` fragment names an id needs a look at the `require-idref` kind, which reads the attribute value as a bare id. If that needs a new rule kind, group 5 leaves it to the docs and records why.
- Component options: `threshold` only. No `i18n`, since the author writes the accessible name.

### Found during implementation on 2026-10-25

- The link takes its look from the FAB classes `button circle extra` instead of copying FAB styles into `_back-to-top.scss`. The partial only places and hides the link. FABs are in the buttons' fixed-slot list, so they get no common-button transition for the fade to override.
- A third semantics rule, `back-to-top-is-an-in-page-link`, flags a `.back-to-top` that is not an `<a>` with an `href` starting with `#`. That covers most of what an `href` id check would, without a new rule kind. A fragment that names no element is not flagged; the script falls back to the body.
- The `semantics.json` row landed with the styles in group 3, because the roster test fails for a Sass component without one.
- The jsdom test landed with the component in group 2.
- `component-decisions.json` pins `sourceRevision` to the group 4 commit `3945c159a`, the first that holds both source files and the browser test. The capability test requires the browser test at that revision. A squash merge drops branch commits, so the pin needs a follow-up re-pin to the merge commit, as Phases 36 and 37 needed.
- The JavaScript gzip size rose from 95,306 to 95,790 bytes (+484), and the CSS from 86,844 to 86,966 (+122), both measured against a build of the merge-base `a9bbf77ad`.

### Found in the code review on 2026-10-25

- The `[inert]` rule faded the link out, so a script that started after the first paint showed the link in the corner of an unscrolled page, then faded it out. Delaying `AutoInit()` by 300ms left opacity between 0.06 and 0.19 one frame later in all three engines. The link now fades in and hides at once (R6). Before the script starts the link is still visible, which a page without the script needs; the docs say to call `AutoInit()` before the first paint.
- Pressing Home with focus on the link scrolled to the top, the link turned inert, and focus dropped to the body. In WebKit the next Tab then went to the browser's own UI. The link now stays while focused and hides on blur (R11).
- An invalid `threshold` was dropped by the style setter, which left the sentinel at the top of the body and showed the link after a few pixels (R13). jsdom's setter rejects the same values, so the fallback has a jsdom test.
- Modified and already prevented clicks were taken over (R12). `Utils.plainKey` leaves out Shift on purpose, and Shift-click opens a new window, so the check is a local helper.
- A 2,000px threshold on a short page did not add scrollable space in any engine; the zero-size sentinel adds no overflow.
- The JavaScript gzip size rose to 95,929 bytes (+139) and the CSS fell to 86,955 (−11).

### Open decisions

None.

## Technical constraints

- New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate.
- `components/` imports from `core/`, never the reverse. The component gets one export line in `components/index.ts` and one registry line.
- Listeners take `this._events.signal`. The temporary `blur` listener on the target gets its own controller from `controllerFor(el)`.
- jsdom has no layout or `IntersectionObserver` geometry, so jsdom tests cover structure and lifecycle. Visibility, scrolling and focus are browser tests.
- `inert` hides the link from find-in-page as well as from the accessibility tree. That is acceptable for a control with no text of its own.

### Probe results on 2026-10-25

Plan group 1 ran in Playwright's Chromium, Firefox and WebKit on a bare page three viewports tall (800 by 600), without the framework.

- With `tabindex="-1"` on `<main>`, both orders worked in every engine: `focus({ preventScroll: true })` before `scrollTo({ top: 0, behavior: 'smooth' })`, and after it. The page reached `scrollY` 0, `<main>` kept focus, and the next Tab focused the first button inside it. The smooth scroll took about 800ms in Chromium and Firefox and about 380ms in WebKit, and `scrollend` fired in all three. The component focuses first, so a focus side effect cannot interrupt the scroll that follows.
- Two frames into a smooth scroll from 2,000px, `scrollY` was still above 1,500 in every engine, so V3 can tell smooth from instant by sampling frames.
- `document.body` with a temporary `tabindex="-1"` took focus in every engine, and the next Tab reached the first button.
- An absolutely positioned, zero-height sentinel at `top: 100vh` as the first child of an unpositioned `<body>` intersected at `scrollY` 0 and 300 and stopped at 700, with `boundingClientRect.top` at -100. Under `position: relative` with a 40px top margin on `<body>`, a `400px` sentinel stopped intersecting at 450 with `top` at -10, so it sat at 440px. A positioned `<body>` measures the threshold from the body's top edge; the docs say so.
- `inert` on the fixed link removed it from Tab order and from `elementFromPoint` in every engine. Playwright's `ariaSnapshot()` still listed the inert link in all three, because Playwright computes the tree itself. The hidden-state test therefore depends on the `visibility: hidden` rule, which the snapshot does honor.

## Dependencies

None. No later phase depends on this one.
