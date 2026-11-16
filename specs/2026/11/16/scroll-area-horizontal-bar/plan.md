# Scroll area horizontal bar: plan

Phase 102: add the horizontal bar. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Base `d039e1e96`.

Build before testing, and run one test suite at a time. Run `npm ci` in the worktree first if `node_modules` is a symlink. jsdom cases go in `tests/scroll-area.test.js`. Browser cases go in a new file, `tests/scroll-area-horizontal-browser.test.js`, which the runner puts in the browser suite by its name. The cases of phases 99 to 101 stay in their files.

`d039e1e96` stays the phase base for the spec and for reviews. Before group 1, record the commit that implementation starts from in [validation.md](validation.md). V1, V16 and V17 and the budget lines compare against a clean build of that commit.

Five statements in the requirements rest on engine behavior that no check has run yet. Groups 2 and 3 probe each one before the code that depends on it, and record the result in validation.md. If a probe disagrees with the spec, change the requirement and its check under "Decisions made while building" before writing the code.

- The root's inline scroll timeline runs from the right in RTL (group 2).
- `scrollLeft` is 0 at the start and negative toward the end in RTL, on a container and on the page (group 2).
- `anchor(self-start)` and `anchor(self-end)` follow the bar's own `dir` on the inline axis, as `anchor(self-end)` already does for the vertical bar (group 2).
- The computed `inline-size` of a bar without a box is a pixel length, with the bar size in pixels and in `rem` (group 2).
- Firefox or WebKit can be made to show classic native gutters under automation (group 3).

## 1. Second bar and lifecycle

Outcome: every instance that draws a bar owns a vertical and a horizontal bar, and `destroy()` removes both. Prerequisites: none. Covers R1, R2, R18. Checks V1.

- [ ] Add the jsdom structure and lifecycle cases (V1) and watch them fail. Change the locators R21 names in `tests/scroll-area.test.js` from `lastElementChild` and a count of one to `.scroll-area-bar:not(.horizontal)` and a count of two. Change the `.scroll-area-bar` locators and `querySelector` calls in the two existing browser files to the same selector. Leave every other assertion as it is.
- [ ] In `src/ts/components/scrollArea.ts`, build the second bar with the function that builds the first, with the class `scroll-area-bar horizontal`. Append it after the vertical bar on the page path and in `_wrap()`.
- [ ] Register the click, pointer and, for a container, wheel listeners on both bars with one loop over the two elements, on `this._events.signal`.
- [ ] Give the container's horizontal bar the instance's `position-anchor`.
- [ ] Remove both bars in `destroy()`, and keep the early return in `_wrap()` for an instance that a custom element destroyed during the move. Keep `_saveState()` around the move, so phase 101's R5 holds with three nodes in the wrapper.
- [ ] Keep each function below complexity 5. A two-entry table of axis names, such as the client, scroll and offset property names and the pointer coordinate, keeps the axis out of the branches.

Completion check: V1 passes, and the existing jsdom cases pass with the changed locators.

## 2. Two-axis geometry, corner and direction

Outcome: under the drawn bar's media conditions, each displayed bar has the right box and thumb on the page and on a container, in `ltr` and `rtl`, and neither enters the corner. Prerequisites: group 1. Covers R3, R4, R5, R6, R7, R8. Checks V2, V3, V4, V5.

- [ ] Probe the root's inline scroll timeline in each engine that supports scroll timelines: on a page that overflows sideways under `dir="rtl"`, animate a test element from `translateX(0)` to `translateX(-100px)` on `scroll(root inline)`, scroll to the end, and read its transform and the document's `scrollLeft` at the start and at the end. Record the result.
- [ ] Probe `anchor(self-start)` on a bar with `dir="rtl"` beside an `ltr` parent in each engine, and record the result.
- [ ] Probe the computed `inline-size` of the vertical bar in each engine while it has `hidden`, with `--scroll-area-bar-size` at `14px` and at `1rem`, and record the result. If an engine doesn't return pixels there, read the width with a bar unhidden on both paths, and record that under "Decisions made while building".
- [ ] Add the browser cases (V2, V3, V4, V5) and watch V2, V3 and V4 fail.
- [ ] In `src/sass/utilities/_scroll-area.scss`, after the page bar's rule and without repeating `position: fixed`, add the page's horizontal rule: block-start inset `auto`, which undoes the base rule's `inset-block: 0`, block-end inset 0, inline insets 0, `block-size: var(--scroll-area-bar-size, 12px)` and an automatic inline size. No horizontal rule declares `display`. After the container bar's rule, add the container's horizontal rule: the block-end inset from `anchor(bottom)` plus the block-end border offset, the inline insets from `anchor(self-start)` and `anchor(self-end)` plus their border offsets, the bar's block size, and an explicit inline size from `anchor-size(width, 0px)` so that a missing anchor collapses the bar as it does the vertical one.
- [ ] Add the corner rules: while the other bar of the same parent lacks `hidden`, the vertical bar's block-end inset and the horizontal bar's inline-end inset each grow by `var(--scroll-area-bar-size, 12px)`, and the container bars' explicit sizes shrink by the same length. On the page the rules also require that no modal dialog is open.
- [ ] Style the horizontal thumb: 8px tall, centered in the bar, `inline-size` from the thumb length property, a `max-inline-size` of 100% for a container, and a transform on the x axis. Under `@supports (animation-timeline: scroll())`, give the page's horizontal thumb its own keyframes on `scroll(root inline)`.
- [ ] Copy `--scroll-area-border-inline-start` with the other border offsets, and apply `_copyContainerStyle` to both bars.
- [ ] Turn `_metrics` into a per-axis read: client size, scroll size, scroll offset and the corner. The corner is the vertical bar's computed `inline-size` when neither bar has `hidden`, and 0 otherwise. The track is the client size minus the corner and never less than 0, and the thumb's length is the smaller of the track and the larger of 48 and the proportional length.
- [ ] Write each bar's length, travel and offset properties. For the horizontal bar, sign the offset and the travel by the computed `direction`, read from the container, or from `<html>` for the page.
- [ ] Leave `_listenForScroll` as it is: the container's listener and the page's fallback listener already fire for both axes.

Completion check: V2 through V5 pass in Chromium, Firefox and WebKit, and the roadmap's check holds: a container that overflows both ways shows both bars with neither thumb in the corner square, and under `dir="rtl"` the horizontal thumb starts at the right end of its track.

## 3. Visibility, native bars and the candidate state

Outcome: each bar hides by its own axis, a container's native bars hide while either drawn bar shows, and the measurement stays stable with classic scrollbars. Prerequisites: group 2. Covers R9, R10, R11, R12, R13. Checks V6, V7, V8, V9.

- [ ] Add the jsdom two-axis gutter cases of V7 and the browser cases (V6, V7, V8, V9). Watch V6 and the jsdom arm of V7 fail. For the jsdom arm, see it fail with the horizontal bar left out of the candidate state.
- [ ] In `_containerHidden`, clear `hidden` on one bar before any read when both bars have it, and keep that step ahead of the metric reads in `_measure`.
- [ ] Commit both `hidden` attributes after the reads, writing each only when its value changes: the vertical one from the block range and `overflow-y`, the horizontal one from the inline range and `overflow-x`, and both from the container's visibility and parent. End a drag only when its own bar is hidden.
- [ ] Change the container's native-bar rule to match while any following sibling bar lacks `hidden`, and the display rule to match both bars. Leave the page rule `html.scroll-area.custom:has(> .scroll-area-bar)` and its body alone.
- [ ] Update the phase 101 browser case for the sideways-only container and the bundle test's container selector, as R21 names.
- [ ] Repeat phase 101's Chromium classic-scrollbar probe with two axes: launch without `--hide-scrollbars` and with overlay scrollbars disabled, confirm real gutters, and sample 12 frames in each state of V7, with its border, `overflow: scroll` and `scrollbar-gutter` arms. Record the log paths.
- [ ] Probe whether Firefox with the preference `ui.useOverlayScrollbars` set to 0, or WebKit with any launch option, shows native gutters under Playwright. If one does, run V7's native arm there and mark V22 as covered by it in validation.md. If neither does, record that and leave V22 pending.

Completion check: V6 through V9 pass in all three engines, and the Chromium native probe shows no alternation and no idle measurement.

## 4. Pointer and wheel

Outcome: the horizontal bar drags, pages and, on a container, takes the wheel, and an instance runs one drag at a time. Prerequisites: groups 2 and 3. Covers R14, R15, R16, R18. Checks V10, V11, V12, V13, V15.

- [ ] Add the jsdom cases (V11, and the jsdom arms of V13 and V15) and the browser cases (V10, V12, V13, V15), and watch V10, V11 and V12 fail.
- [ ] Record the pressed bar and its axis in the drag. In `_press`, read the pointer coordinate and the bar's edge for that axis, and call `scrollBy` with `top` or `left` and the matching client size.
- [ ] In the move handler, call `scrollTo` with only the dragged axis's key and `behavior: 'instant'`.
- [ ] Make `_dragBlocked` and the capture calls use the dragged bar.
- [ ] Confirm that `_handleWheel` and `_canWheel` need no change for the horizontal bar, and that neither page bar has a `wheel` listener.

Completion check: V10 through V13 and V15 pass in all three engines.

## 5. Block-end clearance

Outcome: `.back-to-top` and `.fab-menu` keep clear of the page's horizontal bar and the corner. Prerequisites: group 2. Covers R17. Checks V14.

- [ ] Add the browser case (V14) and watch it fail at the 18px inset.
- [ ] In `src/sass/components/_back-to-top.scss:20` and `src/sass/components/_fab-menu.scss:54`, change `bottom` to read `var(--_page-bar-inset, <the offset property>)`, as the line above each already does for `inset-inline-end`.
- [ ] Run `tests/back-to-top.test.js`, `tests/back-to-top-browser.test.js`, `tests/shadow-dom.test.js` and the page cases of `tests/scroll-area-bar-browser.test.js`. Change only a case that reads a block-end inset beside a page instance.

Completion check: V14 passes in all three engines, and the four named files pass.

## 6. Docs, semantics and records

Outcome: every reader in R19 and R20 agrees with the code. Prerequisites: groups 1 to 5. Covers R19, R20. Checks V16.

- [ ] Update `docs/src/pages/scroll-area.astro`: the two-axis example, the page and container prose, items 7 and 11 of the container limits, the block-end clearance guidance and the styling table row.
- [ ] Update the scroll area section and the stacking row of `llm.md`, and `skills/expressivecss/expressivecss-usage/references/helpers.md`, with the same facts.
- [ ] Update the clearance sentences in `docs/src/pages/back-to-top.astro`, `docs/src/pages/floating-action-button.astro` and their `llm.md` sections.
- [ ] Reword the `semantics.json` note and run `npm run build:semantics`.
- [ ] Reword the class comment in `scrollArea.ts` and extend the Unreleased `ScrollArea` entry in `CHANGELOG.md`.
- [ ] Measure the JS and CSS gzip sizes against a clean build of the start commit and add reviewed budget lines to `tests/selective-builds.test.js`.
- [ ] For `_scroll-area.scss`, `_back-to-top.scss` and `_fab-menu.scss`, re-pin in `docs/src/data/component-decisions.json` only a pin that equals its file's hash at the start commit. Leave `sourceRevision`.
- [ ] Run `npm run build:skill` last, then diff the generated guides.

Completion check: V16 passes.

## 7. Suite

Outcome: the repository's required local checks pass on the phase's last commit. Prerequisites: group 6. Covers R21. Checks V17.

- [ ] `npm run verify`, with a long timeout.
- [ ] `npm test --prefix mcp/expressivecss`, after `npm ci --prefix mcp/expressivecss`, then `npm run verify:packages`, one after the other.
- [ ] `VISUAL_BASE=<start commit> npm run test:visual -- --grep 'scroll-area'`. Its screenshot differences are advisory, and the report goes to the maintainer for V20.
- [ ] Rerun alone any failing test the phase doesn't touch before treating it as a failure, then run the verify steps the failure skipped.
- [ ] Record each result in [validation.md](validation.md) from the run's last line. Leave V18 through V22 pending with what each needs.

Completion check: `npm run verify`, the MCP tests and `npm run verify:packages` pass, or each failure is in a test the phase doesn't touch and passes alone.
