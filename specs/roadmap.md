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
- **Utilities:** layout helpers take `medium:`, `expanded:`, `large:` and `extra-large:` prefixes, and spacing uses the same window sizes. Line clamp, opacity, pointer, position and inset helpers, `.grid-auto-fill` and `.list-unstyled` cover text, layout and list patterns without page CSS.
- **Pickers:** Datepicker and Timepicker follow the page's `lang` and read typed dates in their own format. Timepicker's `showSeconds` adds a seconds field, and `minTime` and `maxTime` bound the times a person can choose.
- **Chips:** submit their values under the input's `name` through the form-associated `expressive-chips-control` element, so the browser handles reset, validity and disabled state.
- **Menus:** Home and End keys, `placement`, and anchored menus that open on whichever side fits. Checkbox items toggle and keep the menu open, and radio items check within a named group.
- **Autocomplete:** `searchDelay` waits for typing to pause before calling `onSearch`, and a text change aborts the running search's signal. `allowCreate` ends the list in an `Add "text"` row, and a search with no match shows a "No results" row.
- **Tooltips:** open on a long press on touch, or on a click with `openOnClick`. A tooltip opened just after another closes skips its `enterDelay`.
- **Forms:** `.validate` fields set `aria-invalid` and are described by their error text. `data-mask` formats typed and pasted text to a pattern. `data-currency` shows an amount in the page's locale and currency after blur, and the form submits the plain number.
- **Choosing values:** a `.transfer-list` moves checkbox rows between an available and a chosen list and submits the chosen ones in order. A `select[data-tree]` opens an ARIA tree and submits one leaf, and a `.field.cascader` picks a path through nested options in columns and submits every level.
- **Dialogs:** `Dialogs.confirm()` asks a yes-or-no question and returns a promise that resolves to the answer.
- **Page helpers:** `.defer-render` skips layout and paint for a long list's off-screen rows. A `.loading-overlay` with `aria-busy="true"` blocks input under a scrim. A `hover-card-trigger` link shows its card after a delay, `.back-to-top` appears past a scroll threshold and returns to the top, and `.show-more` expands clamped text from a button that hides while the text fits.
- **AutoInit:** starts every registered component in the page, with a `no-autoinit` opt-out. A `data-<name>-options` attribute supplies a component's options from markup. With `{ watch: true }`, AutoInit also starts components in markup added later and destroys those whose markup is removed.
- **MCP server:**
  - Lists and searches the catalogue.
  - Returns complete rules and the documented Options and Methods within response limits.
  - Serves the shipped catalogue and component guides as versioned resources with name completion.

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

These close the second tier of the TypeScript gap review. Each phase stands alone unless it names a dependency.

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

These came up while closing earlier gaps and were set aside on purpose.

### Phase 22: chart transitions between datasets

Completed 2026-10-21. See [spec](2026/10/21/chart-transitions/).

### Phase 23: charts that follow their table

Completed 2026-10-21. See [spec](2026/10/21/chart-table-sync/).

### Phase 24: Chips as a form-associated element

Completed 2026-10-21. See [spec](2026/10/21/chips-form-associated/).

## Milestone: utility gaps

Authors can build common layout and text patterns from utility classes without page CSS. This milestone and the three after it come from the framework gap review of 2026-10-23, which compared ExpressiveCSS with Bootstrap, Tailwind, Materialize, MUI, Vuetify, Quasar, Ant Design, shadcn/ui and Mantine.

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

Data tables handle wide data, and charts can plot one measure against another.

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

Touch gestures that mobile frameworks offer work in ExpressiveCSS, each with a non-gesture alternative, and text fields can format what people type.

### Phase 36: pull-to-refresh

Completed 2026-10-24. See [spec](2026/10/24/pull-to-refresh/).

### Phase 37: swipe actions on list rows

Completed 2026-10-24. See [spec](2026/10/24/swipe-actions/).

### Phase 38: pattern input mask

Completed 2026-10-25. See [spec](2026/10/24/input-mask/).

### Phase 39: currency formatting in text fields

Completed 2026-10-25. See [spec](2026/10/25/currency-input/).

## Milestone: lower-value gaps

These came from the same review but are rarer in apps. Each phase stands alone unless it names a dependency.

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

Text and icons grow with the reader's font size, and components read the shared theme tokens instead of copying their values. These phases come from the `src/sass` review of 2026-10-26. Each phase stands alone unless it names a dependency.

Deferred with no phase: a shared mixin for the overflow, ellipsis and nowrap declarations that 15 rules write by hand. It would not change the compiled CSS.

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

Authors can control each gap axis and adapt individual children to the window size. These phases cover G1 and G2 from the framework gap review.

### Phase 59: axis-specific gap utilities

No dependencies. Authors set row and column gaps independently on the existing spacing scale, with the same window-size prefixes as other spacing helpers.

Completion check: a wrapping grid combines a base gap with an axis-specific breakpoint override, and its computed row and column gaps match the requested values on either side of that breakpoint.

### Phase 60: responsive child sizing

No dependencies. Existing flex sizing helpers gain window-size variants, so a child can change how it shares available space without page CSS.

Completion check: a flex child changes from its base sizing to a prefixed sizing at the selected breakpoint while its sibling retains its requested space.

Open for spec: which reset values are needed to reverse the existing sizing helpers without changing their unprefixed behavior.

### Phase 61: responsive self-alignment

No dependencies. Authors override an individual child's alignment at a window-size breakpoint and can return it to the parent's alignment.

Completion check: one child follows its base self-alignment below a breakpoint and the requested prefixed alignment above it, without changing its siblings' alignment.

### Phase 62: responsive visual ordering

No dependencies. Authors change a child's visual order at a window-size breakpoint and can restore its normal order. DOM and keyboard order stay unchanged.

Completion check: a child moves to its requested visual position across a breakpoint while keyboard focus still follows the authored DOM order.

## Milestone: filtered choices

Authors can search native select options and present richer autocomplete results. These phases cover G3 and G4 from the framework gap review.

### Phase 63: filter single-select options

No dependencies. An opt-in search narrows a FormSelect's single-choice list while the native select continues to own its submitted value.

Completion check: a person filters a grouped select, chooses a matching option and submits the form; the submitted value is the option's value, not the search query.

Open for spec: whether search edits the combobox or uses a separate popup field, including its keyboard and ARIA contract.

### Phase 64: filter multiple-select options

Depends on phase 63. The same opt-in search works with multiple selection, retaining choices that the current query does not show.

Completion check: a person selects an option, changes the query and selects another; the native multiple select submits both values.

### Phase 65: autocomplete disabled choices

No dependencies. Autocomplete entries can remain visible while unavailable for selection. Pointer, keyboard and programmatic selection follow the same disabled policy.

Completion check: attempting to select a disabled suggestion through each selection path leaves the chosen values unchanged.

### Phase 66: autocomplete option groups

Depends on phase 65. Autocomplete results can have labelled groups whose headings are excluded from selection and result counts.

Completion check: keyboard navigation crosses a group heading to reach the next selectable result, with the active option and announced result count identifying only actual choices.

Open for spec: group metadata and the labelled listbox structure.

## Milestone: filtered table pages

Authors can filter and page records through the existing data table, with application-owned server operations when needed. These phases cover G5 and G6 from the framework gap review.

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

Authors can reject invalid file selections through the existing drop zone and form feedback. These phases cover G7 from the framework gap review. Validation is opt-in, treats browse and drop consistently, and invalidates the whole selection when any file fails. Uploading files and filtering a FileList are outside this milestone; the server still validates received files.

### Phase 72: drop-zone type validation

Completed 2026-10-27. See [spec](2026/10/27/drop-zone-type-validation/).

### Phase 73: drop-zone size limit

Completed 2026-10-27. See [spec](2026/10/27/drop-zone-size-limit/).

### Phase 74: drop-zone count limit

Completed 2026-10-27. See [spec](2026/10/27/drop-zone-count-limit/).

## Milestone: searchable tree choices

Authors can filter a hierarchy and choose multiple leaves through the existing tree select. These phases cover G8 and G9 from the framework gap review.

### Phase 75: tree-select filtering

Completed 2026-10-27. See [spec](2026/10/27/tree-select-filtering/).

### Phase 76: tree-select multiple leaf selection

Completed 2026-10-27. See [spec](2026/10/27/tree-select-multiple/).

## Completion evidence for phases 67-76

The [requirement audit](2026/10/27/roadmap-completion/audit.md) maps all 64 requirements to current source and assertions. [Primary GitHub records](2026/10/27/roadmap-completion/merge-evidence.json) identify each merged PR, exact successful head and resolved conversations. Physical capability limits remain explicit; no package was published.
