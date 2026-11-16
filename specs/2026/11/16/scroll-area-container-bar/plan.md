# Scroll area container bar: plan

Phase 101: draw the bar on a scroll container. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Base `40ab4fb74`.

Build before testing, and run one test suite at a time. Run `npm ci` in the worktree first if `node_modules` is a symlink. jsdom cases go in `tests/scroll-area.test.js`. Browser cases go in a new file, `tests/scroll-area-container-browser.test.js`, which the runner puts in the browser suite by its name. Page cases in `tests/scroll-area-bar-browser.test.js` stay where they are.

The milestone run merges master into the branch after this spec is committed and before group 1 starts. `40ab4fb74` stays the phase base for the spec and for reviews. Record the commit that implementation starts from in [validation.md](validation.md) before group 1. V1, V19 and V20 and the budget lines compare against a clean build of that commit.

## 1. Wrap and restore

Outcome: a container instance wraps its element without moving any box, and `destroy()` puts the nodes back. Prerequisites: none. Covers R1, R2, R3, R4, R5, R17, R20. Checks V1, V2, V3, V13.

- [x] Add the jsdom structure and restoration cases (V1, V13) and the browser layout and state cases (V2, V3). Turn "ScrollArea leaves a container unchanged" into the unsupported case, with `supports` stubbed to return false. Watch V1, V2's author-rule arm and V13 fail. V3 passes before the change, because an instance that doesn't move the container keeps its state, so run it to see it pass after.
- [x] In `src/ts/components/scrollArea.ts`, replace the early return at line 20 with two paths. The page path is today's code. The container path runs only when the element has a parent node, isn't `<body>`, and `this._window.CSS?.supports?.('anchor-name: --a')` is true, read per instance as line 97 reads scroll timelines.
- [x] Wrap: record `scrollTop`, `scrollLeft` and the active element when it is the container or inside it. Insert the wrapper with `el.before(wrapper)`, append the container and the bar, copy `slot`, then put the offsets back with `scrollTo({ behavior: 'instant' })` and focus back with `focus({ preventScroll: true })`.
- [x] Add the instance's anchor name to the container with `Utils.setAnchorName` and a `Utils.guid()` name, and set the bar's inline `position-anchor`.
- [x] `destroy()`: record the same state, remove the bar, call `wrapper.replaceWith(...wrapper.childNodes)` as `unwrapControl` does in `core/formControl.ts`, remove the anchor name, remove a `style` attribute that is empty and was absent before `init`, and put the state back. Keep it safe for an instance that never wrapped and for one a later instance replaced.
- [x] In `src/sass/utilities/_scroll-area.scss`, add `.scroll-area-wrapper { display: contents !important; }` outside every media query.
- [x] Keep each function below complexity 5: one helper for the guard, one for the saved state, one for the wrap.

Completion check: V1, V2, V3 and V13 pass in Chromium, Firefox and WebKit, and the third part of the roadmap's check holds: after `destroy()` the container's parent is its original parent.

## 2. Bar geometry and tracking

Outcome: under the drawn bar's media conditions, the bar sits on the container's inline-end edge with a proportional thumb that follows the container's scroll. Prerequisites: group 1. Covers R6, R7, R8, R9, R10, R11, and R17's clause on a container moved out of its wrapper. Checks V4, V5, V6, V7.

- [x] Add the browser cases (V4, V5, V6, V7) and the jsdom listener case of V5, and watch V4, V5 and V7 fail.
- [x] Inside the existing `@media screen and (forced-colors: none) and (not (pointer: coarse))` block, after the page rule, display the bar that follows a `.scroll-area.custom` container in a wrapper. Outside the block the base rule `.scroll-area-bar { display: none }` applies, so forced colors, coarse pointers and print need no new rule. Keep `[hidden]` winning.
- [x] Add the container bar's own rule, after the page bar's and separate from it: `position: absolute`, the block insets and the inline-end inset from `anchor()` on the default anchor, each plus a border offset the script sets as a custom property with a `0px` fallback, the width, `touch-action: none` and the track color. Leave the page bar's rule as it is.
- [x] Limit the `animation-timeline: scroll(root block)` rule to the page bar's thumb.
- [x] In `_measure()`, for a container, also set the bar's `dir` from the computed `direction`, the border offsets from the computed border widths, the bar's `z-index` when the container's isn't `auto`, and the three custom properties of R6 when the container's computed value is not empty, removing each otherwise. Hide the bar when the container's `visibility` isn't `visible` or its parent isn't the wrapper.
- [x] Listen for `scroll` on the container, passive, in every engine. Leave the window listener and its `CSS.supports` test to the page path.
- [x] Observe the container and its element children with the existing `ResizeObserver`, and watch the container's `childList` with a `MutationObserver` that observes the new children and queues a measurement. `refresh()` on a container re-observes and measures, and skips the body and modal observers.
- [x] Probe the frame after the container gets `display: none`: read the bar's and thumb's rects in the next frame in each engine. If either has a box, add a rule that removes it, such as `position-visibility: anchors-valid`, add the read to V7, and record the result in validation.md. If neither has one, record that.

Completion check: V4 through V7 pass in all three engines, and the first part of the roadmap's check holds: a 300px-tall container with 900px of content shows a 100px thumb in a 300px track.

## 3. Native bar, media and clipping

Outcome: the native bar hides only while the drawn bar shows, and the framework's scrolling bodies clip the bar. Prerequisites: group 2. Covers R2, R12, R13, R24. Checks V8, V16, V17.

- [x] Add the browser cases (V8, V16, V17) and extend the bundle test with the container rules, and watch V8 and V16 fail.
- [x] Inside the same media block, hide the native bar of `.scroll-area-wrapper > .scroll-area.custom:has(+ .scroll-area-bar:not([hidden]))`, with the `::-webkit-scrollbar` twin.
- [x] Set no `--scroll-area-bar-clearance` on the wrapper or the container.
- [x] Read the computed `position` of the scaffold's pane, a dialog's body and a pane's body at the start commit. Where it is `static`, add `position: relative` under `:has(.scroll-area-wrapper)` in the owning partial, on the selectors at `_scaffold.scss:225`, `_dialog.scss:135` and `_panes.scss:262`. Where a body is already positioned, add nothing and record that. Run the scaffold selector ownership case of `tests/scaffold-browser.test.js`.
- [x] Probe a `position: sticky` container in each engine: scroll its parent through the sticky range and compare the bar's rect with the padding box. If the bar stays on the edge in all three, add the arm to V6 and drop sticky from item 10 of R22. Otherwise keep the limit. Record the result either way.

Completion check: V8, V16 and V17 pass in all three engines.

## 4. Pointer, wheel and instances

Outcome: the container's bar drags, pages and takes the wheel, never scrolls the page, and instances don't interfere. Prerequisites: groups 2 and 3. Covers R14, R15, R16, R19. Checks V9, V10, V11, V12, V15.

- [x] Add the jsdom cases (V10, and the delta arm of V11) and the browser cases (V9, V11, V12, V15), and watch V9, V10 and V11 fail.
- [x] Give the instance one scroll target: the window on the page path and the container on the container path. `_startDrag`, the move handler and `_press` call `scrollTo` and `scrollBy` on it.
- [x] In `_press`, subtract the bar's `getBoundingClientRect().top` from `clientY` before the hit test and the direction test. The page bar's top is 0, so its results don't change.
- [x] Add the `wheel` listener on a container's bar, not passive, with the instance's signal. It returns for Ctrl and for an event whose larger delta the container can't follow. Otherwise it cancels the event and calls `scrollBy({ top, left, behavior: 'instant' })` with the deltas scaled by `deltaMode`. Use a three-entry table for the scale to stay below complexity 5.
- [x] Widen the drag observer to the document element's subtree with `class`, `open`, `hidden` and `inert`, and end the drag when the bar has no box, when an open modal dialog doesn't contain it, or when it has an `inert` ancestor. If V12 shows an engine that needs another signal, add it and record it in validation.md.

Completion check: V9 through V12 and V15 pass in all three engines, and the second part of the roadmap's check holds: dragging the thumb scrolls the container while `window.scrollY` stays where it was.

## 5. AutoInit

Outcome: AutoInit and its watcher behave as R18 says. Prerequisites: group 1. Covers R18. Checks V14.

- [x] Add the jsdom AutoInit cases and the browser watch arm (V14). No registry change is expected. If a case fails, fix the component and leave `registry.ts` alone.
- [x] Confirm `tests/autoinit.test.js` and `tests/autoinit-watch-browser.test.js` pass unmodified, with the `div` fixture now wrapped in jsdom.

Completion check: V14 passes.

## 6. Semantics, docs and records

Outcome: every reader in R21 and R22 agrees with the code. Prerequisites: groups 1 to 5. Covers R21, R22. Checks V18, V19.

- [ ] Audit the child-combinator rules in `src/sass` for parents whose rule sets a generic child's size, placement, overflow or padding. Start from `_dialog.scss:135`, `_scaffold.scss:225`, `_panes.scss:71` and `:262`, `_accordion.scss:104`, `_defer-render.scss:9`, `_prose.scss:14`, `_message-scroller.scss:40` and `forms/_fieldset.scss:61`, and list the parents found in validation.md.
- [ ] Write the new forbid rule's selector from that list and from R21's HTML parents. Update the note and the existing rule in `semantics.json`, then run `npm run build:semantics`.
- [ ] Update `docs/src/pages/scroll-area.astro`, the scroll area section and both AutoInit tables of `llm.md`, `docs/src/pages/auto-init.astro` and `skills/expressivecss/expressivecss-usage/references/helpers.md` with the contract and the eleven limits of R22. Put container prose after the page paragraphs.
- [ ] Change the phrase list at `tests/expressivecss-skill.test.js:611` from `page-only` to `scroll-area-wrapper`.
- [ ] Reword the class comment in `scrollArea.ts` and extend the Unreleased `ScrollArea` entry in `CHANGELOG.md`.
- [ ] Measure the JS and CSS gzip sizes against a clean build of the start commit and add reviewed budget lines to `tests/selective-builds.test.js`.
- [ ] Leave the `_scroll-area.scss` pin in `docs/src/data/component-decisions.json`. For `_scaffold.scss`, `_dialog.scss` and `_panes.scss`, re-pin only a pin that equals its file's hash at the start commit. Leave `sourceRevision`.
- [ ] Run `npm run build:skill` last, then diff the generated guides.

Completion check: V18 and V19 pass.

## 7. Suite

Outcome: the repository's required local checks pass on the phase's last commit. Prerequisites: group 6. Covers R23. Checks V20.

- [ ] `npm run verify`, with a long timeout.
- [ ] `npm test --prefix mcp/expressivecss`, after `npm ci --prefix mcp/expressivecss`, then `npm run verify:packages`, one after the other.
- [ ] `VISUAL_BASE=<start commit> npm run test:visual -- --grep 'scroll-area'`. Its screenshot differences are advisory, and the report goes to the maintainer for V23.
- [ ] Rerun alone any failing test the phase doesn't touch before treating it as a failure, then run the verify steps the failure skipped.
- [ ] Record each result in [validation.md](validation.md) from the run's last line. Leave V21 through V24 pending with what each needs.

Completion check: `npm run verify`, the MCP tests and `npm run verify:packages` pass, or each failure is in a test the phase doesn't touch and passes alone.
