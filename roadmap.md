# TypeScript bug-fix roadmap

All 17 phases are implemented. Automated behavior and package checks pass.
The visual comparison is recorded below for human review before a PR.

This plan covers all 17 findings from the 2026-09-30 review of the current
TypeScript at `e3426db`. Phase numbers match the findings in that review.
Phases 1 through 16 are P2; phase 17 is P3. The review confirmed correctness
defects and did not confirm a security vulnerability.

Progress: **17 of 17 fixes complete.** Validation results are recorded below. Estimates are
rough implementation time with dependencies installed, excluding full-suite
runtime. Each checkbox is a separate stopping point.

## Implementation order

1. Phases 1 through 5 correct Datepicker values, events, and reinitialization.
2. Phases 6 through 10 correct Timepicker and Autocomplete state.
3. Phases 11 through 13 correct Chips and native select behavior.
4. Phases 14 through 17 correct dismissal and manual opening.
5. Run final validation after the focused checks pass.

Phases 2 and 3 build on phase 1's shared input handling. Complete those three
in order. The remaining fixes can be implemented independently, but keep changes
to the same component sequential.

## Prepare once

Allow 15 minutes, plus dependency and browser downloads if needed.

- [x] Follow [CONTRIBUTING.md](CONTRIBUTING.md) for Node 24 and `npm ci` if dependencies are missing.
- [x] Build current assets with `npm run build:js` and `npm run build:css`. Tests consume `dist/`.
- [x] Record the current result of each phase's focused test file before changing that component.

For each phase, add the smallest regression that fails on the existing code,
fix the shared implementation, and rebuild before rerunning it. Reuse existing
test files. A new helper or dependency needs a concrete reason. Preserve public
exports, markup, accessibility, and existing valid behavior.

Use `node --test tests/<file>.test.js` for a focused file after rebuilding.
Use a browser for focus, visibility, event retargeting, and pointer behavior.
Destroy components and release timers in `finally` blocks. Run builds, test
suites, and package verification sequentially because they share build output.

## Phase 1. Honor custom date parsers

Estimate 30 minutes. Work in [datepicker.ts](src/ts/components/datepicker.ts),
starting at `setDateFromInput` and `_handleInputChange`.

- [x] Add a day/month parser regression in [regressions.test.js](tests/regressions.test.js) using `05/10/2026`.
- [x] Reuse one parsing path for change, click-open, and Enter-open. Inspect initialization callers so a supplied parser is applied consistently.
- [x] Verify that all opening paths and confirmation preserve October 5, 2026. Retain default parsing when no custom parser is supplied.

## Phase 2. Reject reversed date ranges on every input path

Estimate 30 minutes. Depends on phase 1. Work in
[datepicker.ts](src/ts/components/datepicker.ts), in the shared input handling.

- [x] Add a case in [datepicker-range.test.js](tests/datepicker-range.test.js) with September 20 as the start and September 1 typed as the end.
- [x] Apply the existing range-order rule through the shared path, including Enter before the input loses focus.
- [x] Verify that change, click, and Enter cannot confirm a reversed range. Keep valid ranges and entering the end field first working.

## Phase 3. Clear an emptied single-date selection

Estimate 20 minutes. Depends on phase 1. Work in
[datepicker.ts](src/ts/components/datepicker.ts), at the blank-input branch.

- [x] Add a single-date case in [regressions.test.js](tests/regressions.test.js) that selects a date, clears the input, reopens, and confirms.
- [x] Clear the internal single-date selection through the existing date-state methods when the input is blank.
- [x] Verify that the input stays empty and no old day remains selected. Rerun the range-clearing cases in [datepicker-range.test.js](tests/datepicker-range.test.js).

## Phase 4. Dispatch date changes from the updated input

Estimate 15 minutes. Work in [datepicker.ts](src/ts/components/datepicker.ts),
at `setInputValue`.

- [x] Add start-input, end-input, and delegated form listeners to a range regression in [datepicker-range.test.js](tests/datepicker-range.test.js).
- [x] Dispatch the existing change event from the input being updated. Preserve its detail, bubbling, and composed behavior.
- [x] Confirm a range and verify that each input receives its own event. The form must observe the correct targets without recursive updates.

## Phase 5. Keep generated date inputs out of AutoInit

Estimate 25 minutes. Work in [datepicker.ts](src/ts/components/datepicker.ts),
at `createDateInput`. Use the existing `.no-autoinit` convention.

- [x] Add a scoped range-picker case in [autoinit.test.js](tests/autoinit.test.js) that calls `AutoInit` twice.
- [x] Mark picker-owned clones so AutoInit does not initialize them as independent components.
- [x] Verify that repeated initialization and destruction leave the expected inputs, with no exception, detached-instance initialization, or duplicate generated controls.

## Phase 6. Refresh Timepicker from the host input

Estimate 25 minutes. Work in [timepicker.ts](src/ts/components/timepicker.ts),
at `_updateTimeFromInput` and the opening handlers.

- [x] Add a regression in [regressions.test.js](tests/regressions.test.js) that changes `09:30 AM` to `11:45 PM` after initialization.
- [x] Reuse `_updateTimeFromInput` when opening, before the clock and editable fields consume the selected time.
- [x] Verify that click-open and Enter-open show and confirm `11:45 PM`. Keep existing default-time and 24-hour behavior working.

## Phase 7. Cancel obsolete delayed clock updates

Estimate 40 minutes. Work in [timepicker.ts](src/ts/components/timepicker.ts),
at `resetClock`, view changes, and teardown.

- [x] Add a regression that schedules a minute-view reset, switches to hours, and enters `04` before the timer fires.
- [x] Track and cancel the obsolete reset when the view or input changes. Cancel it on destruction using the component's existing timer-cleanup pattern.
- [x] Verify that `04:30` remains unchanged after the delay, including a real browser interaction in [docked-picker-browser.test.js](tests/docked-picker-browser.test.js). Cover destruction in [teardown.test.js](tests/teardown.test.js).

## Phase 8. Keep Autocomplete's open state accurate

Estimate 30 minutes. Work in [autocomplete.ts](src/ts/components/autocomplete.ts),
at `open`, `_renderMenu`, and `_resetAutocomplete`.

- [x] Add assertions in [forms-generated.test.js](tests/forms-generated.test.js) for the public `isOpen` state after rendering, rerendering, and closing.
- [x] Prevent rendering from clearing an active open state. Account for selection and Menu-driven dismissal when synchronizing state.
- [x] Verify that the flag matches the menu and that Chips gives Enter to the open suggestions without inserting an unintended chip.

## Phase 9. Handle preselected IDs without loaded data

Estimate 25 minutes. Work in [autocomplete.ts](src/ts/components/autocomplete.ts),
at `_setupMenu` and its initial selected-value display.

- [x] Add a case in [forms-generated.test.js](tests/forms-generated.test.js) with `selected: [42]` and `data: []`.
- [x] Reuse the existing selected-entry fallback and text-or-ID display behavior instead of dereferencing a missing match.
- [x] Verify that initialization preserves ID `42` without throwing or displaying `undefined`. Check a matching entry with optional text omitted and the existing later-data update path.

## Phase 10. Bubble Autocomplete change events

Estimate 15 minutes. Work in [autocomplete.ts](src/ts/components/autocomplete.ts),
at `_triggerChanged`.

- [x] Add direct-input and delegated-form listeners in [forms-generated.test.js](tests/forms-generated.test.js), attached after initialization.
- [x] Use the existing form-component event convention so a selection change bubbles. Preserve the Autocomplete callback contract.
- [x] Verify that one selection reaches both listeners once, with the input as its target, and calls the selection callback once.

## Phase 11. Allow addChip with default options

Estimate 20 minutes. Work in [chips.ts](src/ts/components/chips.ts), at `addChip`.

- [x] Add a case in [chips.test.js](tests/chips.test.js) that calls `addChip` with `allowUserInput: false`.
- [x] Insert into the container when no editable input exists. Retain insertion before the input in editable mode.
- [x] Verify that the DOM, `chipsData`, and chip-element array agree in both modes. Check that the add callback runs once.

## Phase 12. Accept numeric zero as a chip ID

Estimate 20 minutes. Work in [chips.ts](src/ts/components/chips.ts), at
`_renderChip` and `_isValidAndNotExist`.

- [x] Add initialization and `addChip` cases for `{ id: 0, text: 'Zero' }` in [chips.test.js](tests/chips.test.js).
- [x] Replace the truthiness checks with explicit ID validation that accepts zero while preserving duplicate rejection.
- [x] Verify that zero renders through both paths and adding a duplicate zero does not create another chip.

## Phase 13. Select duplicate-valued options independently

Estimate 20 minutes. Work in [select.ts](src/ts/components/select.ts), at
`_isValueSelected` and its toggle caller.

- [x] Add two distinct options with the same value to a multiple-select case in [forms-generated.test.js](tests/forms-generated.test.js).
- [x] Read the native option's own selected state when deciding whether to toggle it.
- [x] Verify independent selection and deselection of both options. Their generated checkboxes and `aria-selected` values must match the native options.

## Phase 14. Recognize clicks inside shadow-root menus

Estimate 30 minutes. Work in [menu.ts](src/ts/components/menu.ts), at
`_handleDocumentClick` and the submenu-trigger check.

- [x] Add a shadow-root menu case with `closeOnClick: false` in [shadow-dom.test.js](tests/shadow-dom.test.js).
- [x] Use the composed event path to determine whether a click came from inside the menu. Preserve submenu handling and real outside-click dismissal.
- [x] Confirm in a browser that internal clicks keep the menu open and outside clicks close it. Cover `closeOnClick: true` and ordinary light-DOM menus in [menu-field-browser.test.js](tests/menu-field-browser.test.js).

## Phase 15. Respect Escape handled by a nested menu

Estimate 20 minutes. Work in [navigationRail.ts](src/ts/components/navigationRail.ts),
at `_onKeyDown`.

- [x] Add an expanded modal rail containing an open menu in [navigation-rail.test.js](tests/navigation-rail.test.js).
- [x] Ignore an Escape event that the nested component has already handled, following the existing `defaultPrevented` convention.
- [x] Verify that the first Escape closes only the menu. A second, unhandled Escape must collapse the rail, with focus restored to the appropriate trigger at each step.

## Phase 16. Repair Tooltip's manual-open contract

Estimate 25 minutes. Work in [tooltip.ts](src/ts/components/tooltip.ts), at `open`.

- [x] Add cases for `open()` and `open(true)` on an unfocused, unhovered trigger in [tooltip.test.js](tests/tooltip.test.js).
- [x] Use a default argument that accepts the documented zero-argument call and preserves an explicitly supplied boolean.
- [x] Verify both manual calls in a browser, retain automatic hover/focus behavior, and compile the zero-argument call against the emitted public declarations using the existing package consumer checks.

## Phase 17. Expire stale snackbar swipe velocity

Estimate 25 minutes. Work in [snackbar.ts](src/ts/components/snackbar.ts), at
`_onDragMove` and `_onDragEnd`.

- [x] Add a controlled-time case in [snackbar.test.js](tests/snackbar.test.js) for a short fast drag followed by a two-second pause before release.
- [x] Disregard stale velocity at release. Follow the existing sheet-drag expiry rule while preserving distance-based dismissal.
- [x] Verify that the paused short drag snaps back, an immediate flick dismisses, and a long drag still dismisses after a pause. Retain gesture-cancellation tests.

## Final validation

Allow 30 minutes to prepare and inspect results, plus measured command runtime.
Keep these checks separate from the small implementation phases.

- [x] Update affected API examples and the changelog. Regenerate committed guidance with `npm run build:semantics` and `npm run build:skill` as required by [CONTRIBUTING.md](CONTRIBUTING.md).
- [x] Run `npm run verify` after the last source change. Run `npm run test:browser` with Chromium, Firefox, and WebKit installed, or use the documented container workflow. Record skips and failures explicitly.
- [x] Run the separate MCP and package checks from CONTRIBUTING.md if regenerated MCP guidance or package declarations changed. Run a visual comparison if rendering changes; record any required human review separately.
- [x] Confirm that every phase's regression passes and mark its checkboxes complete. Record the final revision and actual validation results below.

### Results on 2026-09-30

Final revision: `e3426dbf92e408331dce7d00513394e01e0e6b70` plus these uncommitted
working-tree changes on `t3code/review-typescript-security`. Each phase reproduced
its reported defect before the fix and passed its focused checks afterward.
Independent review also led to regressions and corrections for function date
formatters, empty autocomplete suggestions, nested Chips inputs, and callback
focus inside a child shadow root.

| Check | Result |
| --- | --- |
| `npm run build:semantics` and `npm run build:skill` | Passed; component guidance and MCP contracts regenerated. |
| `npm run verify`, with CPU affinity limited to cores 0–3 | Passed: 1,388 tests, no failures, three optional SDK checks skipped; typechecking, generated-file checks, docs build and site verification passed. |
| `npm run test:browser` | Passed in Chromium, Firefox and WebKit: 343 tests, no failures, the same three SDK checks skipped. |
| MCP and package checks | `npm ci --prefix mcp/expressivecss`, `npm test --prefix mcp/expressivecss`, and `npm run verify:packages` passed. Both tarballs worked in isolated consumers; Tooltip's public declarations accepted all three call forms. After SDK installation, `node --test tests/expressivecss-eval-browser.test.js` passed all seven tests with no skips, including the three previously skipped checks. |
| Focused visual comparison | All 36 baseline and 36 current screenshots captured successfully. All 36 comparisons reported differences. See the review note below. |

The first unrestricted contributor run had 1,386 passes, two failures, and three
SDK skips. The failures were the existing WebKit Carousel drag check and Chromium
ScrollSpy anchor check. Both passed immediately in isolation and in the complete
repeat run above. Their implementation and assertions were unchanged.

The minified JavaScript bundle measures **44,893 gzip bytes**, up **251 bytes**
from the base revision's measured 44,642 bytes. The reviewed budget is 44,895
bytes. CSS is unchanged.

Validation logs are `/tmp/expressivecss-roadmap-verify-bounded.log`,
`/tmp/expressivecss-roadmap-browser.log`, `/tmp/expressivecss-roadmap-mcp.log`,
`/tmp/expressivecss-roadmap-sdk-browser.log`, and
`/tmp/expressivecss-roadmap-packages.log`. The first-run failures remain in
`/tmp/expressivecss-roadmap-verify.log`.

### Visual review before a PR

Ran `npm run test:visual -- --grep '(autocomplete|chips|datepicker|menu|navigation-rail|select|snackbar|timepicker|tooltips) @' --workers 4`.
This covers nine pages in compact, expanded, large, and large-dark layouts.
The initial anchored filter matched no tests; the corrected command above
captured and compared all 36 views.

Every page has changed API prose. The comparison exited with status 1 for
screenshot differences, with no failed captures.
Spot checks of NavigationRail, Menu, and Tooltip expected/actual pairs found
changes starting at the edited paragraphs and shifting the following content.
This is not a visual approval of all 36 views. Per CONTRIBUTING.md, the intended
differences still need BaezFJ's review recorded in a future PR.

Open [the visual report](visual/report/index.html) or run
`npm run test:visual:report`. Screenshots are in `visual/results/`; the command
log is `/tmp/expressivecss-roadmap-visual.log`. These artifacts are ignored by Git.

## Next action

Open the visual report and inspect the first expected/actual pair. Allow two minutes.
