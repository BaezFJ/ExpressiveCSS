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

1. [Milestone: scaffold app shells](#milestone-scaffold-app-shells)

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

A `.scaffold` container places an app's bars, rails, panes and trailing controls, so pages stop hand-writing a shell grid. Each region holds a component the framework already ships, and the scaffold only positions it. The default layout follows Gmail on the web: the app bar spans the top and holds the rail's menu button, and the rail, pane and trailing toolbar sit below it. The shell fills the window and only the pane scrolls. The decisions come from a design discussion on 2026-11-15.

### Phase 88: lay out the scaffold's default regions

No dependencies. A `.scaffold` places its direct children by component: a `header` app bar across the top, a `.navigation-rail` at the leading edge, `main` as the pane area, and a vertical `.toolbar` at the trailing edge. The shell is as tall as the window, and only the pane area scrolls. Region classes place custom content that isn't one of those components. The component ships with its docs page, `llm.md` section, semantics entry and skill guide, and the design skill's [scaffold reference](../skills/expressivecss/expressivecss-design/references/scaffold.md) maps each region to it.

Completion check: at 1280px, a scaffold with all four regions shows the app bar above the rail, pane and toolbar. Scrolling a long pane leaves the bar, rail and toolbar in place, and under `dir="rtl"` the rail and toolbar swap sides.

Open for spec: the region class names, whether `.panes` can be the pane area directly or sits inside `main`, and how the rail's own `100dvh` height and fixed positioning give way inside the grid.

### Phase 89: run the rail the full height

Depends on phase 88. A modifier on `.scaffold` runs the rail from the top of the window to the bottom, and the app bar sits over the pane area only, as the current layout templates do.

Completion check: with the modifier, the rail starts at the top edge and the app bar starts at the rail's inline end. Without it, the layout matches phase 88.

Open for spec: the modifier's name.

### Phase 90: toggle the rail from outside it

No dependencies. A button outside a `.navigation-rail` that names the rail in `aria-controls` expands and collapses it and keeps its own `aria-expanded` in sync. When Escape closes a modal rail, focus returns to that button. A rail without an outside button keeps using its first-child toggle.

Completion check: clicking an app bar button whose `aria-controls` holds the rail's id expands the rail and sets `aria-expanded="true"` on the button. Pressing Escape inside the modal rail then collapses it and focuses the button.

Open for spec: whether a rail can have an outside toggle and its own first-child toggle at once, and how AutoInit's `watch` mode connects a button added after the rail started.

### Phase 91: overlay the expanded rail on medium windows

Depends on phases 88 and 90. In a scaffold at 840px and wider, an expanded rail narrows the pane. From 600px to 839px it opens over the pane with a scrim, and Escape or a scrim tap collapses it.

Completion check: at 1024px, expanding the rail narrows the pane by the difference between the expanded and collapsed widths. At 700px the pane keeps its width, a scrim appears, and tapping the scrim collapses the rail.

Open for spec: whether the medium overlay reuses the rail's `modal` state, and whether CSS or the runtime sets it, since the rail goes modal only on compact windows today.

### Phase 92: scroll the document on compact windows

Depends on phase 90. Under 600px the scaffold scrolls the document instead of the pane, so mobile browsers can collapse their address bar. The app bar stays pinned, a footer `.navigation-bar` shows at the bottom, and the rail stays hidden until the app bar's menu button opens it as a modal.

Completion check: at 390px, scrolling moves the document while the app bar and navigation bar stay in place. The rail is off-screen and out of the tab order until the menu button opens it with a scrim.

Open for spec: whether scaffold rules or the existing `hide-on-*` helpers swap the rail and the navigation bar.

### Phase 93: float the trailing toolbar on compact windows

Depends on phase 92. Under 600px the trailing vertical toolbar turns horizontal and floats, centered, above the navigation bar. Its buttons keep their keyboard order.

Completion check: at 390px the toolbar is horizontal and sits above the navigation bar without covering it, and the end of the page can scroll clear of the toolbar.

Open for spec: whether CSS overrides the toolbar's `vertical` class or the markup carries a second class, and how the scaffold reserves room at the end of the page.

### Phase 94: add a status bar region

Depends on phase 88. A `.status-bar` child of a scaffold spans the full width along the bottom, below the rail, pane and toolbar. Under 600px it is hidden.

Completion check: at 1280px the status bar is as wide as the scaffold and sits below the pane. At 390px it isn't displayed.

Open for spec: whether the status bar keeps its own sticky placement inside the scaffold or the grid places it.

### Phase 95: float the pane on a surface

Depends on phase 88. From 600px up, the scaffold's background uses `surface-container`, and the pane area sits on a rounded `surface` with a gap around it. Under 600px the pane stays flat against the background.

Completion check: at 1024px the pane area's background color differs from the scaffold's and its corners are rounded. At 390px both backgrounds match and the corners are square.

Open for spec: whether the floating surface is the default or a modifier, given the product rule on changing existing markup, and how it combines with `.panes.separated`.

### Phase 96: open a side sheet as a third column

Depends on phase 88. A standard `.side-sheet` child opens as a column between the pane and the trailing toolbar and narrows the pane while it is open. Closing it gives the width back to the pane.

Completion check: at 1440px, opening the sheet narrows the pane by the sheet's width and leaves the toolbar at the window edge. Closing the sheet restores the pane's width.

Open for spec: what the sheet does below 840px, and whether the column width follows the sheet's open and close motion.

### Phase 97: keep regions inside safe areas

Depends on phases 88 and 92. The scaffold pads its outer regions by `env(safe-area-inset-*)`, so the app bar, rail, navigation bar and toolbar stay clear of a notch or home indicator. Insets that a component already applies are not added twice.

Completion check: with nonzero safe-area insets on every side, no region's controls overlap an inset, and the navigation bar's bottom padding equals one inset.

Open for spec: how tests supply inset values, since desktop browsers report zero.

### Phase 98: move the bundled templates to `.scaffold`

Depends on phases 88 to 97. The six bundled layout templates in `skills/expressivecss/assets/templates/` use `.scaffold` and drop their inline layout CSS. This phase closes the milestone.

Completion check: none of the six templates has a `<style>` block for shell layout, and each one renders the same regions at 390px, 700px and 1280px as before.

## Deferred work

No phases yet:

- A shared mixin for the overflow, ellipsis and nowrap declarations that 15 rules write by hand. It would not change the compiled CSS.
