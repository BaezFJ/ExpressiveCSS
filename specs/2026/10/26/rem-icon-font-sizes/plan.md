# Size the remaining px font sizes in rem plan

Roadmap phase: [Phase 52, size the remaining px font sizes in rem](../../../../roadmap.md#phase-52-size-the-remaining-px-font-sizes-in-rem)
Branch: `fix/rem-icon-font-sizes`
Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md).

The groups run in order. Groups 2 to 4 are one-line Sass edits and take about 20 minutes each. Group 5 takes about an hour, most of it waiting on `npm run verify`.

## 1. Failing guard test

Prerequisites: none.

- [x] Add `tests/rem-font-sizes.test.js` (`node:test`). It reads every `.scss` file under `src/sass/components` and `src/sass/abstracts`, skips `components/_chips.scss`, and fails on any `font-size:` declaration whose value is a px number. The failure message lists each file and line.
- [x] Ignore Sass variable declarations such as `$root-font-size: 16px` and comment lines.
- [x] Run `node --test tests/rem-font-sizes.test.js` and confirm it fails and lists the fifteen declarations from the requirements table.

Completion check: the test fails on the base commit with fifteen listed declarations, and none of them is in `_chips.scss`.

Covers R5. Checks V1.

## 2. Shared and overlay rules

Prerequisites: group 1.

- [x] In `src/sass/abstracts/_mixins.scss`, change the `header-icon-action` icon's `font-size`, `width`, `height` and `line-height` from 24px to `rem(24px)`. Leave the 48px button box alone.
- [x] In `components/_dialog.scss`, do the same for `dialog > icon:first-child`. Leave its 24px margin alone.
- [x] In `components/_snackbar.scss`, do the same for the leading icon and the close button's icon. Leave the 40px close button box alone.
- [x] In `components/_alert.scss`, change the icon's `font-size` to `rem(24px)` and its `line-height` to `rem(20px)`.
- [x] Run `npm run build:css` and the tests for the touched partials, such as `node --test tests/alert*.test.js tests/regressions.test.js`.

Completion check: the guard test lists only the declarations from groups 3 and 4, and the build has no warnings.

Covers R1, R2, R6. Checks V1, V10.

## 3. Content components

Prerequisites: group 2.

- [x] Change the icon `font-size` to `rem()` at the same px value in `components/_command-palette.scss`, `_list.scss`, `_message.scss` and `_tree.scss`.
- [x] In `components/_map.scss`, change the close button's `font-size` to `rem(20px)` and its `inline-size` and `block-size` to `rem(32px)`. Leave the 4px insets and the `!important` flags alone.
- [x] In `components/_timeline.scss`, change the badge icon's `font-size` to `rem(18px)` and its `width` and `height` to `rem(32px)`.
- [x] Convert the clearances that depend on those boxes (R8): the timeline row's start padding and connector offsets, and the map popup content's end padding, as `calc()` of px and `rem()`. Added during implementation.
- [x] Rebuild the CSS and run the tests for the touched partials.

Completion check: the guard test lists only the declarations from group 4.

Covers R1, R2, R6, R8. Checks V1, V10.

## 4. Forms and the Timepicker tick

Prerequisites: group 3.

- [x] In `components/forms/_fieldset.scss`, change the legend icon's `font-size`, `width`, `height` and `line-height` from 18px to `rem(18px)`. Leave the 8px margin alone.
- [x] In `components/forms/_drop-zone.scss`, change the icon's `font-size` to `rem(32px)`.
- [x] In `components/forms/_file-input.scss`, change the hidden input's `font-size` to `rem(20px)`.
- [x] In `components/_timepicker.scss`, change `.timepicker-tick`'s `font-size` to `rem(15px)`. Leave its 40px `width`, `height` and `line-height` and the 270px plate alone.
- [x] Rebuild the CSS and run `node --test tests/rem-font-sizes.test.js tests/timepicker*.test.js`.

Completion check: the guard test passes.

Covers R1, R2, R3, R4, R5, R6. Checks V1, V10.

## 5. Browser test, budget and verify

Prerequisites: group 4.

- [x] Add `tests/rem-font-sizes-browser.test.js`. For Chromium, Firefox and WebKit, it loads `dist/css/expressive.css` with static markup for every rule in the requirements table, measures computed sizes at a 16px root, sets `document.documentElement.style.fontSize = '32px'`, and measures again. Close each browser in `finally`. Static markup is enough; no component needs to start.
- [x] Assert the R1, R2, R3 and R8 values at both root sizes, that the Timepicker tick box and plate don't change, and that a click on the file input's label opens a file chooser (R4).
- [x] Run the new test against the base commit's CSS and confirm it fails, then against the branch build and confirm it passes.
- [x] Add a `### Fixed` entry under `## [Unreleased]` in `CHANGELOG.md` that says these icons and the Timepicker tick text now grow with the browser's font size.
- [x] Measure the CSS gzip change and add a reviewed budget line to `tests/selective-builds.test.js`.
- [x] Run `npm run build:skill` after the last edit, then `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time.
- [x] Record the gzip delta and any flaky test reruns in the `TASKS.md` learnings log, and tick H1 and H3.

Completion check: every V check in [validation.md](validation.md) has a recorded result.

Covers R1, R2, R3, R4, R6, R7, R8. Checks V2 to V9, V11.
