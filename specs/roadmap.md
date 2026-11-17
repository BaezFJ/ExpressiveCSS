# ExpressiveCSS roadmap

Work toward the [mission](mission.md) within the [technical constraints](tech-stack.md). Each numbered phase has one observable outcome and fits one focused work session.

## Current state

Later phases build on these:

- **Components and events:** components report changes through `expressive:*` events alongside their option callbacks.
- **Tabs:** an opt-in ARIA tablist with a roving tab stop.
- **Charts:**
  - `update()` redraws from a changed table, keeping focus and the highlighted row. Lines, areas and bars move from their old values to the new ones.
  - `data-watch` redraws a chart whenever its table changes.
  - A `.toggle` legend shows and hides series.
  - A `.scatter-chart` plots each row as a point from an x column and one or more y columns, and `.bubble` sizes each point by a third column.
  - A `.funnel-chart` draws each row as a stage as wide as its value, and a `.treemap-chart` as a rectangle whose area follows its value. A `.sankey-chart` draws flows between nodes from source, target and value columns.
- **Touch gestures:** a `.pull-to-refresh` container refreshes on a pull down at its top or from its `[data-refresh]` button. In a `.list.swipeable`, a swipe reveals a row's `.swipe-actions`, which its `[data-swipe-toggle]` button and the keyboard also reach.
- **Data tables:** a sticky header, `data-sort` sorting and a select-all box. `.sticky-column` pins the first column, a `.drag-handle` resizes a column by pointer or keyboard and fires `expressive:resize`, and menu checkbox items with `data-column` hide and show columns.
- **Utilities:** layout helpers take `medium:`, `expanded:`, `large:` and `extra-large:` prefixes, and spacing uses the same window sizes. Line clamp, opacity, pointer, position and inset helpers, `.grid-auto-fill` and `.list-unstyled` cover text, layout and list patterns without page CSS. Row and column gaps, flex sizing, self-alignment and visual order also take window-size prefixes.
- **Pickers:** Datepicker and Timepicker follow the page's `lang` and read typed dates in their own format. Timepicker's `showSeconds` adds a seconds field, and `minTime` and `maxTime` bound the times a person can choose.
- **Chips:** submit their values under the input's `name` through the form-associated `expressive-chips-control` element, so the browser handles reset, validity and disabled state.
- **Menus:** Home and End keys, `placement`, and anchored menus that open on whichever side fits. Checkbox items toggle and keep the menu open, and radio items check within a named group.
- **Autocomplete:** `searchDelay` waits for typing to pause before calling `onSearch`, and a text change aborts the running search's signal. `allowCreate` ends the list in an `Add "text"` row, and a search with no match shows a "No results" row. Entries can be disabled or grouped under labelled headings.
- **Selects:** an opt-in search filters a FormSelect's options in single and multiple selection, and the native select still submits the value.
- **Tooltips:** open on a long press on touch, or on a click with `openOnClick`. A tooltip opened just after another closes skips its `enterDelay`.
- **Forms:** `.validate` fields set `aria-invalid` and are described by their error text. `data-mask` formats typed and pasted text to a pattern. `data-currency` shows an amount in the page's locale and currency after blur, and the form submits the plain number.
- **Choosing values:** a `.transfer-list` moves checkbox rows between an available and a chosen list and submits the chosen ones in order. A `select[data-tree]` opens an ARIA tree and submits one leaf, and a `.field.cascader` picks a path through nested options in columns and submits every level.
- **Buttons:** `aria-busy="true"` keeps a button's label, reports busy and shows a delayed spinner, and `BusyButtons` ignores presses until it clears.
- **App shells:** a `.scaffold` places an app's bar, rail, pane, trailing toolbar, side sheet and status bar, and rearranges them on compact and medium windows.
- **App bars:** a heading reached through a fragment link rests below a page-level sticky top app bar, through `--md-comp-top-app-bar-anchor-offset`.
- **Dialogs:** `Dialogs.confirm()` asks a yes-or-no question and returns a promise that resolves to the answer.
- **Page helpers:** `.defer-render` skips layout and paint for a long list's off-screen rows. A `.loading-overlay` with `aria-busy="true"` blocks input under a scrim. A `hover-card-trigger` link shows its card after a delay, `.back-to-top` appears past a scroll threshold and returns to the top, and `.show-more` expands clamped text from a button that hides while the text fits.
- **AutoInit:** starts every registered component in the page, with a `no-autoinit` opt-out. A `data-<name>-options` attribute supplies a component's options from markup. With `{ watch: true }`, AutoInit also starts components in markup added later and destroys those whose markup is removed.
- **App behavior guidance:** the buttons, snackbar, lists, tabs, data table and text field guides say how to show loading, offer Undo, keep the view in the URL and submit forms. `Expressive.DataTables.showPage()` restores a local page from the URL.
- **Finished-app evaluation:** the `expressivecss-review` quality inspector labels `finished-app:` findings, and [three fixed prompts](../docs/agents/finished-app-evals.md) measure them against a baseline.
- **MCP server:**
  - Lists and searches the catalogue.
  - Returns complete rules and the documented Options and Methods within response limits.
  - Serves the shipped catalogue and component guides as versioned resources with name completion.
  - `expressivecss-lint` reports `transition: all`, a viewport that stops zoom and an inline handler that always blocks paste.

## Up next

1. [Milestone: custom scrollbars](#milestone-custom-scrollbars)

## Milestone: MCP authoring guidance

### Phase 1: complete component rules

Completed 2026-10-04. See [spec](2026/10/04/mcp-complete-component-rules/).

### Phase 2: requested runtime options

Completed 2026-10-04. See [spec](2026/10/04/mcp-runtime-options/).

### Phase 3: requested runtime methods

Completed 2026-10-04. See [spec](2026/10/04/mcp-runtime-methods/).

### Phase 4: compact catalogue listing

Completed 2026-10-05. See [spec](2026/10/05/mcp-compact-catalogue/).

### Phase 5: catalogue search

Completed 2026-10-05. See [spec](2026/10/05/mcp-catalogue-search/).

### Phase 6: selectable response detail

Completed 2026-10-05. See [spec](2026/10/05/mcp-selectable-response-detail/).

### Phase 7: aggregate response limits and recovery

Completed 2026-10-05. See [spec](2026/10/05/mcp-aggregate-response-limits/).

### Phase 8: versioned catalogue resource

Completed 2026-10-06. See [spec](2026/10/06/mcp-versioned-catalogue-resource/).

### Phase 9: versioned component resources

Completed 2026-10-06. See [spec](2026/10/06/mcp-component-resources/).

### Phase 10: resource argument completion

Completed 2026-10-06. See [spec](2026/10/06/mcp-resource-completion/).

## Milestone: component gaps

### Phase 11: menu checkbox items

Completed 2026-10-21. See [spec](2026/10/21/menu-checkbox-items/).

### Phase 12: menu radio groups

Completed 2026-10-21. See [spec](2026/10/21/menu-radio-groups/).

### Phase 13: autocomplete search debounce

Completed 2026-10-21. See [spec](2026/10/21/autocomplete-search-debounce/).

### Phase 14: autocomplete create option

Completed 2026-10-21. See [spec](2026/10/21/autocomplete-create-option/).

### Phase 15: autocomplete visible no-results row

Completed 2026-10-21. See [spec](2026/10/21/autocomplete-no-results-row/).

### Phase 16: timepicker seconds

Completed 2026-10-21. See [spec](2026/10/21/timepicker-seconds/).

### Phase 17: timepicker time range

Completed 2026-10-21. See [spec](2026/10/21/timepicker-time-range/).

### Phase 18: tooltip shared delay

Completed 2026-10-21. See [spec](2026/10/21/tooltip-shared-delay/).

### Phase 19: tooltip click trigger

Completed 2026-10-21. See [spec](2026/10/21/tooltip-click-trigger/).

### Phase 20: AutoInit options from data attributes

Completed 2026-10-21. See [spec](2026/10/21/autoinit-data-options/).

### Phase 21: AutoInit for markup added later

Completed 2026-10-21. See [spec](2026/10/21/autoinit-watch/).

## Milestone: deferred polish

### Phase 22: chart transitions between datasets

Completed 2026-10-21. See [spec](2026/10/21/chart-transitions/).

### Phase 23: charts that follow their table

Completed 2026-10-21. See [spec](2026/10/21/chart-table-sync/).

### Phase 24: Chips as a form-associated element

Completed 2026-10-21. See [spec](2026/10/21/chips-form-associated/).

## Milestone: utility gaps

### Phase 25: line clamp utilities

Completed 2026-10-23. See [spec](2026/10/23/line-clamp-utilities/).

### Phase 26: position and inset helpers

Completed 2026-10-23. See [spec](2026/10/23/position-inset-helpers/).

### Phase 27: auto-fill grid utility

Completed 2026-10-23. See [spec](2026/10/23/auto-fill-grid-utility/).

### Phase 28: pointer utilities

Completed 2026-10-23. See [spec](2026/10/23/pointer-utilities/).

### Phase 29: opacity utilities

Completed 2026-10-23. See [spec](2026/10/23/opacity-utilities/).

### Phase 30: unstyled lists

Completed 2026-10-23. See [spec](2026/10/23/unstyled-lists/).

## Milestone: data table and chart gaps

### Phase 31: data table sticky first column

Completed 2026-10-23. See [spec](2026/10/23/data-table-sticky-column/).

### Phase 32: data table column resize

Completed 2026-10-23. See [spec](2026/10/23/data-table-column-resize/).

### Phase 33: data table column visibility

Completed 2026-10-24. See [spec](2026/10/23/data-table-column-visibility/).

### Phase 34: scatter chart

Completed 2026-10-24. See [spec](2026/10/24/scatter-chart/).

### Phase 35: bubble sizes on the scatter chart

Completed 2026-10-24. See [spec](2026/10/24/bubble-sizes/).

## Milestone: touch and input gaps

### Phase 36: pull-to-refresh

Completed 2026-10-24. See [spec](2026/10/24/pull-to-refresh/).

### Phase 37: swipe actions on list rows

Completed 2026-10-24. See [spec](2026/10/24/swipe-actions/).

### Phase 38: pattern input mask

Completed 2026-10-25. See [spec](2026/10/24/input-mask/).

### Phase 39: currency formatting in text fields

Completed 2026-10-25. See [spec](2026/10/25/currency-input/).

## Milestone: lower-value gaps

### Phase 40: deferred rendering for long lists

Completed 2026-10-25. See [spec](2026/10/25/deferred-rendering/).

### Phase 41: loading overlay

Completed 2026-10-25. See [spec](2026/10/25/loading-overlay/).

### Phase 42: show-more text collapse

Completed 2026-10-25. See [spec](2026/10/25/show-more/).

### Phase 43: promise-based confirm dialog

Completed 2026-10-25. See [spec](2026/10/25/confirm-dialog/).

### Phase 44: back-to-top button

Completed 2026-10-25. See [spec](2026/10/25/back-to-top/).

### Phase 45: hover card

Completed 2026-10-25. See [spec](2026/10/25/hover-card/).

### Phase 46: transfer list

Completed 2026-10-25. See [spec](2026/10/25/transfer-list/).

### Phase 47: tree select

Completed 2026-10-26. See [spec](2026/10/25/tree-select/).

### Phase 48: cascader

Completed 2026-10-25. See [spec](2026/10/25/cascader/).

### Phase 49: funnel chart

Completed 2026-10-25. See [spec](2026/10/25/funnel-chart/).

### Phase 50: treemap chart

Completed 2026-10-25. See [spec](2026/10/25/treemap-chart/).

### Phase 51: sankey chart

Completed 2026-10-25. See [spec](2026/10/25/sankey-chart/).

## Milestone: stylesheet review fixes

### Phase 52: size the remaining px font sizes in rem

Completed 2026-10-26. See [spec](2026/10/26/rem-icon-font-sizes/).

### Phase 53: size chips in rem

Completed 2026-10-26. See [spec](2026/10/26/chips-rem/).

### Phase 54: read the elevation token in the map popup

Completed 2026-10-26. See [spec](2026/10/26/map-popup-elevation-token/).

### Phase 55: use the type role mixin where type is written by hand

Completed 2026-10-26. See [spec](2026/10/26/shared-type-roles/).

### Phase 56: name chip custom properties under `--md-comp-chip`

Completed 2026-10-26. See [spec](2026/10/26/chip-custom-properties/).

### Phase 57: read motion tokens for hardcoded transition timings

Completed 2026-10-26. See [spec](2026/10/26/motion-token-timings/).

### Phase 58: share chart base rules across chart types

Completed 2026-10-26. See [spec](2026/10/26/chart-base-rules/).

## Milestone: responsive layout refinements

### Phase 59: axis-specific gap utilities

Completed 2026-10-26. See [spec](2026/10/26/axis-specific-gap-utilities/).

### Phase 60: responsive child sizing

Completed 2026-10-26. See [spec](2026/10/26/responsive-child-sizing/).

### Phase 61: responsive self-alignment

Completed 2026-10-26. See [spec](2026/10/26/responsive-self-alignment/).

### Phase 62: responsive visual ordering

Completed 2026-10-26. See [spec](2026/10/26/responsive-visual-ordering/).

## Milestone: filtered choices

### Phase 63: filter single-select options

Completed 2026-10-26. See [spec](2026/10/26/single-select-filtering/).

### Phase 64: filter multiple-select options

Completed 2026-10-27. See [spec](2026/10/27/multiple-select-filtering/).

### Phase 65: autocomplete disabled choices

Completed 2026-10-27. See [spec](2026/10/27/autocomplete-disabled-choices/).

### Phase 66: autocomplete option groups

Completed 2026-10-27. See [spec](2026/10/27/autocomplete-option-groups/).

## Milestone: filtered table pages

### Phase 67: data table text filtering

Completed 2026-10-27. See [spec](2026/10/27/data-table-text-filtering/).

### Phase 68: server-owned table filtering

Completed 2026-10-27. See [spec](2026/10/27/server-table-filtering/).

### Phase 69: data table paging

Completed 2026-10-27. See [spec](2026/10/27/data-table-paging/).

### Phase 70: data table page size

Completed 2026-10-27. See [spec](2026/10/27/data-table-page-size/).

### Phase 71: server-owned table paging

Completed 2026-10-27. See [spec](2026/10/27/server-table-paging/).

## Milestone: validated file choices

### Phase 72: drop-zone type validation

Completed 2026-10-27. See [spec](2026/10/27/drop-zone-type-validation/).

### Phase 73: drop-zone size limit

Completed 2026-10-27. See [spec](2026/10/27/drop-zone-size-limit/).

### Phase 74: drop-zone count limit

Completed 2026-10-27. See [spec](2026/10/27/drop-zone-count-limit/).

## Milestone: searchable tree choices

### Phase 75: tree-select filtering

Completed 2026-10-27. See [spec](2026/10/27/tree-select-filtering/).

### Phase 76: tree-select multiple leaf selection

Completed 2026-10-27. See [spec](2026/10/27/tree-select-multiple/).

## Milestone: apps that feel finished

Apps that agents build with the skill handle loading, mistakes, sharing and forms the way people expect. The ideas come from a review of Vercel's Web Interface Guidelines on 2026-11-14. Skill guidance comes first, then framework defaults, then lint checks. The last phase of each stage reruns the phase 78 prompts and records the change.

### Phase 77: add a finished-app rubric to the quality inspector

Completed 2026-11-15. See [spec](2026/11/15/finished-app-rubric/).

### Phase 78: record a finished-app baseline from three fixed prompts

Completed 2026-11-15. See [spec](2026/11/15/finished-app-baseline/).

### Phase 79: guide loading feedback on buttons

Completed 2026-11-15. See [spec](2026/11/15/button-loading-guidance/).

### Phase 80: guide destructive actions to an Undo snackbar

Completed 2026-11-15. See [spec](2026/11/15/undo-snackbar-guidance/).

### Phase 81: guide tabs, filters and pages into the URL

Completed 2026-11-15. See [spec](2026/11/15/url-state-guidance/).

### Phase 82: guide the form submit flow

Completed 2026-11-15. See [spec](2026/11/15/submit-flow-guidance/).

### Phase 83: ship a button loading state that keeps its label

Completed 2026-11-15. See [spec](2026/11/15/button-loading-state/).

### Phase 84: offset anchored headings below sticky bars

Completed 2026-11-15. See [spec](2026/11/15/anchored-heading-offset/).

### Phase 85: lint flags `transition: all`

Completed 2026-11-15. See [spec](2026/11/15/lint-transition-all/).

### Phase 86: lint flags disabled zoom

Completed 2026-11-15. See [spec](2026/11/15/lint-disabled-zoom/).

### Phase 87: lint flags paste blocking

Completed 2026-11-15. See [spec](2026/11/15/lint-paste-blocking/).

## Milestone: scaffold app shells

### Phase 88: lay out the scaffold's default regions

Completed 2026-11-15. See [spec](2026/11/15/scaffold-default-regions/).

### Phase 89: run the rail the full height

Completed 2026-11-15. See [spec](2026/11/15/scaffold-tall-rail/).

### Phase 90: toggle the rail from outside it

Completed 2026-11-15. See [spec](2026/11/15/rail-outside-toggle/).

### Phase 91: overlay the expanded rail on medium windows

Completed 2026-11-15. See [spec](2026/11/15/scaffold-medium-rail-overlay/).

### Phase 92: scroll the document on compact windows

Completed 2026-11-15. See [spec](2026/11/15/scaffold-compact-scroll/).

### Phase 93: float the trailing toolbar on compact windows

Completed 2026-11-15. See [spec](2026/11/15/scaffold-compact-toolbar/).

### Phase 94: add a status bar region

Completed 2026-11-15. See [spec](2026/11/15/scaffold-status-bar/).

### Phase 95: float the pane on a surface

Completed 2026-11-15. See [spec](2026/11/15/scaffold-floating-pane/).

### Phase 96: open a side sheet as a third column

Completed 2026-11-15. See [spec](2026/11/15/scaffold-side-sheet-column/).

### Phase 97: keep regions inside safe areas

Completed 2026-11-15. See [spec](2026/11/15/scaffold-safe-areas/).

### Phase 98: move the bundled templates to `.scaffold`

Completed 2026-11-15. See [spec](2026/11/15/scaffold-templates/).

## Milestone: custom scrollbars

`ScrollArea` replaces the native scrollbar with a themed bar drawn by the framework, on the page and on scroll containers. The browser still does the scrolling, so wheel, touch, keyboard, find-in-page and anchor links behave as before. The component opts in through a modifier on the existing `.scroll-area` utility, and without the runtime the utility's themed native bar stays. Forced colors and coarse pointers keep the native bar, and the drawn bar is hidden from assistive technology because keyboard scrolling stays native. The decisions come from a design discussion on 2026-11-16.

### Phase 99: draw a custom vertical bar for the page

No dependencies. With `ScrollArea` on `<html>`, the page's native vertical bar is hidden and a fixed bar at the inline-end edge shows a thumb whose length and position follow the document's scroll. The thumb tracks scrolling in every engine, through a scroll timeline where the engine has one and a scroll listener where it doesn't, and its length updates when the content grows or shrinks. Under forced colors or a coarse pointer the native bar shows and the drawn bar doesn't.

Completion check: on a page three windows tall, the thumb is a third of the track's length, and after scrolling to the end it touches the track's end. With forced colors emulated, the native bar is back and the drawn bar isn't displayed.

Open for spec: the modifier's name, and how the bar keeps clear of fixed page controls such as `.back-to-top` and the floating action button.

Implemented in `feat/custom-scrollbars`; see [decisions and validation](2026/11/16/scroll-area-page/requirements.md).

### Phase 100: drag the thumb and page from the track

Depends on phase 99. Dragging the page bar's thumb scrolls the document in proportion, and the drag continues when the pointer leaves the bar or the window. A press on the track outside the thumb scrolls one window toward the press.

Completion check: dragging the thumb half the track's length scrolls the document half its scrollable distance, and a press below the thumb scrolls down by the window's height.

Open for spec: whether holding a press on the track repeats the page scroll, as native bars do.

Implemented in `feat/custom-scrollbars`; see [decisions and validation](2026/11/16/scroll-area-drag/requirements.md).

### Phase 101: draw the bar on a scroll container

Depends on phase 100. `ScrollArea` on a scroll container wraps it in an element and draws the same bar beside it, with the same thumb, drag and track behavior as the page bar. Destroying the component removes the wrapper and leaves the container where it was.

Completion check: a 300px-tall container with 900px of content shows a thumb a third of the track's length, and dragging it scrolls the container, not the page. After `destroy()`, the container's parent is its original parent again.

Open for spec: how the wrapper takes over the container's flex or grid placement and outer margins.

Implemented in `feat/custom-scrollbars`; see [decisions and validation](2026/11/16/scroll-area-container/requirements.md).

### Phase 102: add the horizontal bar

Depends on phase 101. On the page and on containers, content that overflows sideways gets a horizontal bar along the block-end edge with the same thumb, drag and track behavior. Under `dir="rtl"` the thumb starts at the right, and when both bars show they don't overlap at the corner.

Completion check: a container wider than its viewport in both directions shows both bars, and neither thumb enters the corner square. Under `dir="rtl"` the horizontal thumb starts at the right end of the track.

Implemented in `feat/custom-scrollbars`; see [decisions and validation](2026/11/16/scroll-area-horizontal/requirements.md).

### Phase 103: grow the thumb on hover with a spring

Depends on phase 99. The thumb is thin at rest, grows when the pointer is over the bar, and returns to its thin size with an M3 Expressive spring when the pointer leaves or a drag ends. With reduced motion, the size changes without animation.

Completion check: hovering the bar widens the thumb to its hover size, and leaving returns it to its rest size. With `prefers-reduced-motion: reduce` emulated, the change has no transition.

Open for spec: whether the spring reuses the motion tokens or the runtime `Spring` helper.

Implemented in `feat/custom-scrollbars`; see [decisions and validation](2026/11/16/scroll-area-spring/requirements.md).

### Phase 104: hide the bar while idle

Depends on phase 99. The bar fades out after about a second without scrolling and comes back when the content scrolls or the pointer nears its edge. It stays visible while the pointer is over it or a drag is in progress. With reduced motion, it hides and shows without a fade.

Completion check: one second after scrolling stops, the bar is hidden. Moving the pointer to the bar's edge shows it again, and it stays visible for as long as the pointer stays over it.

Open for spec: whether the idle delay is an option, and how near the edge counts as near.

Implemented in `feat/custom-scrollbars`; see [decisions and validation](2026/11/16/scroll-area-idle/requirements.md).

### Phase 105: mark sections on the track

Depends on phase 99. Headings or elements the author names get tick marks on the track at their scroll positions, and the marks move when the layout changes the targets' positions. The marks reuse the targets Scrollspy reads where a page already has them.

Completion check: on a page with four named sections, the track shows four marks, and each mark's position along the track matches its section's scroll offset as a share of the scrollable distance.

Open for spec: how authors name the targets, and whether a click on a mark scrolls to its section.

Implemented in `feat/custom-scrollbars`; see [decisions and validation](2026/11/16/scroll-area-sections/requirements.md).

### Phase 106: label the thumb while dragging

Depends on phases 100 and 105. While the thumb is dragged, a label beside it shows the name of the section at the current scroll position, and it disappears when the drag ends. Pages without marked sections show no label.

Completion check: dragging the thumb into the third section shows that section's heading text beside the thumb, and releasing the pointer hides it.

Open for spec: whether the label can show text other than a heading, such as a date, and whether screen readers hear it.

## Deferred work

No phases yet:

- A shared mixin for the overflow, ellipsis and nowrap declarations that 15 rules write by hand. It would not change the compiled CSS.
