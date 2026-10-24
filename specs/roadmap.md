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
- **Touch gestures:** a `.pull-to-refresh` container refreshes on a pull down at its top or from its `[data-refresh]` button. In a `.list.swipeable`, a swipe reveals a row's `.swipe-actions`, which its `[data-swipe-toggle]` button and the keyboard also reach.
- **Data tables:** a sticky header, `data-sort` sorting and a select-all box. `.sticky-column` pins the first column, a `.drag-handle` resizes a column by pointer or keyboard and fires `expressive:resize`, and menu checkbox items with `data-column` hide and show columns.
- **Utilities:** layout helpers take `medium:`, `expanded:`, `large:` and `extra-large:` prefixes, and spacing uses the same window sizes. Line clamp, opacity, pointer, position and inset helpers, `.grid-auto-fill` and `.list-unstyled` cover text, layout and list patterns without page CSS.
- **Pickers:** Datepicker and Timepicker follow the page's `lang` and read typed dates in their own format. Timepicker's `showSeconds` adds a seconds field, and `minTime` and `maxTime` bound the times a person can choose.
- **Chips:** submit their values under the input's `name` through the form-associated `expressive-chips-control` element, so the browser handles reset, validity and disabled state.
- **Menus:** Home and End keys, `placement`, and anchored menus that open on whichever side fits. Checkbox items toggle and keep the menu open, and radio items check within a named group.
- **Autocomplete:** `searchDelay` waits for typing to pause before calling `onSearch`, and a text change aborts the running search's signal. `allowCreate` ends the list in an `Add "text"` row, and a search with no match shows a "No results" row.
- **Tooltips:** open on a long press on touch, or on a click with `openOnClick`. A tooltip opened just after another closes skips its `enterDelay`.
- **Forms:** `.validate` fields set `aria-invalid` and are described by their error text.
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

No dependencies. A text field can format typed or pasted characters to a pattern, such as a phone or card number.

Completion check: a browser test types and pastes digits into a masked field, sees the pattern applied with the caret after the last digit, and finds the value in the form data.

Open for spec: whether the form gets the raw or the formatted value, and how the mask waits for IME composition to end.

### Phase 39: currency formatting in text fields

No dependencies; it may share code with phase 38. A field shows a typed amount in the page's locale and currency through `Intl.NumberFormat` when it loses focus, and the form submits the plain number.

Completion check: under `lang="de"` with euros, typing 1234.5 shows "1.234,50 €" after blur, and the form data holds 1234.5.

## Milestone: lower-value gaps

These came from the same review but are rarer in apps. Each phase stands alone unless it names a dependency.

### Phase 40: deferred rendering for long lists

No dependencies. Authors can mark a long list or table so the browser skips layout and paint for rows off screen, using `content-visibility` instead of a virtual list.

Completion check: in a browser test with a 5,000-row list, `checkVisibility({ contentVisibilityAuto: true })` returns false for an off-screen row and true once it scrolls into view.

Open for spec: whether any use case still needs a true virtual list.

### Phase 41: loading overlay

No dependencies. A region the page marks busy shows the loading indicator over a scrim and takes no pointer or keyboard input until the page clears it.

Completion check: while the region is busy, a click on a button inside it does nothing and Tab skips its controls.

### Phase 42: show-more text collapse

Depends on phase 25. Long text shows a set number of lines and a control that expands it, and the control hides when the text already fits.

Completion check: activating the control shows the full text and sets `aria-expanded="true"` on it.

### Phase 43: promise-based confirm dialog

No dependencies. A script can ask a yes-or-no question in an M3 dialog and await the answer.

Completion check: the returned promise resolves true on confirm and false on cancel or Escape, and focus returns to the element that opened it.

Open for spec: the `i18n` defaults for the button labels.

### Phase 44: back-to-top button

No dependencies. After the page scrolls past a set distance, a button appears that returns to the top and moves focus there.

Completion check: a browser test scrolls past the distance, activates the button, and finds the page at the top with focus at its start.

### Phase 45: hover card

No dependencies. Hovering over or focusing a link shows a non-modal card of preview content after a delay, and the card stays open while the pointer is over it.

Completion check: a browser test hovers the link, waits past the delay, moves the pointer onto the card, and finds the card still open.

Open for spec: whether interest invokers (`interestfor`) work in all three engines, or the card reuses the tooltip's delay code.

### Phase 46: transfer list

No dependencies. People can move options between an available list and a chosen list with buttons or the keyboard, and the form submits the chosen options.

Completion check: moving two options to the chosen list puts both in the form data, in order.

### Phase 47: tree select

No dependencies. A select's options can form a tree that people expand with the keyboard, as the ARIA tree pattern describes, and the form submits the chosen leaf.

Completion check: a browser test opens the select, expands a node with ArrowRight, chooses a leaf, and finds its value in the form data.

### Phase 48: cascader

No dependencies. People pick a path through nested options shown in columns, where each choice opens the next column, and the form submits the full path.

Completion check: choosing an option in each of three columns submits the three values as one path.

Open for spec: whether it shares code with phase 47.

### Phase 49: funnel chart

No dependencies. A funnel chart draws each table row as a stage whose width follows its value, with the other charts' table, tooltip and keyboard conventions.

Completion check: a browser test finds each stage's width proportional to its value, in table order.

### Phase 50: treemap chart

No dependencies. A treemap draws each table row as a rectangle whose area follows its value, filling the chart.

Completion check: a browser test finds the rectangle areas proportional to their values and summing to the plot area.

### Phase 51: sankey chart

No dependencies. A sankey chart draws flows between nodes from a table of source, target and value columns.

Completion check: a browser test finds each link's width proportional to its value, and each node's height equal to the larger of its incoming and outgoing totals.
