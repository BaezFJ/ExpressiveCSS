# ExpressiveCSS roadmap

Work toward the [mission](mission.md) within the [technical constraints](tech-stack.md). Each numbered phase has one observable outcome and fits one focused work session.

## Current state

Later phases build on these:

- **Components and events:** components report changes through `expressive:*` events alongside their option callbacks.
- **Tabs:** an opt-in ARIA tablist with a roving tab stop.
- **Charts:**
  - `update()` redraws from a changed table, keeping focus and the highlighted row.
  - A `.toggle` legend shows and hides series.
- **Data tables:** `data-sort` sorting and a select-all box.
- **Pickers:** Datepicker and Timepicker follow the page's `lang` and read typed dates in their own format.
- **Chips:** submit their values under the input's `name`, with `required` and reset support.
- **Menus:** Home and End keys, `placement`, and anchored menus that open on whichever side fits. Checkbox items toggle and keep the menu open, and radio items check within a named group.
- **Autocomplete:** `searchDelay` waits for typing to pause before calling `onSearch`, and a text change aborts the running search's signal.
- **Tooltips:** open on a long press on touch.
- **Forms:** `.validate` fields set `aria-invalid` and are described by their error text.
- **AutoInit:** starts every registered component in the page, with a `no-autoinit` opt-out.
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

No dependency. With an opt-in option, a value that matches no suggestion offers an "Add 'x'" row as the last option. Choosing it fires an event with the typed text, and Chips can add it as a chip.

Completion check: a test types a new value, chooses "Add 'x'" by keyboard, and receives the event. A value that exactly matches a suggestion offers no "Add" row.

Open for spec: the row's text in `i18n`, and how Chips with `autocompleteOnly` treat it.

### Phase 15: autocomplete visible no-results row

No dependency. When a search returns nothing, the list shows a "No results" row that isn't an option. That way sighted users see what screen reader users already hear.

Completion check: a browser test searches for text with no match and sees the row. The row can't be focused or chosen, and it leaves the list when a match appears.

### Phase 16: timepicker seconds

No dependency. An option adds a seconds field to the Timepicker. The written value includes seconds, and the field steps like the hour and minute fields.

Completion check: a test sets 14:30:45 through the fields and reads it back from the input, in both 12-hour and 24-hour modes.

Open for spec: whether the dial gets a seconds view or only the field does.

### Phase 17: timepicker time range

Depends on phase 16. `minTime` and `maxTime` bound the times a person can choose. Times outside the range are disabled on the dial and refused when typed.

Completion check: a test with a 09:00 to 17:30 range can't select 08:00 or 18:00 by dial, field or typing, and accepts 17:30.

### Phase 18: tooltip shared delay

No dependency. After one tooltip closes, another opened within a short window shows at once without its `enterDelay`, as tooltips in a toolbar do.

Completion check: a test hovers one trigger, then a second within the window, and sees the second open at once. After the window, the second waits its delay.

### Phase 19: tooltip click trigger

No dependency. An opt-in option opens a tooltip on click instead of hover, and a second click, Escape or a click elsewhere closes it.

Completion check: a browser test opens and closes a click tooltip by mouse and keyboard. With the option on, hover doesn't open it.

Open for spec: the option's name, and how it relates to the touch long press.

### Phase 20: AutoInit options from data attributes

No dependency. AutoInit reads a component's options from attributes on its element, so markup can configure a component without page script. Options passed to `init` still win.

Completion check: a test starts two components through AutoInit with options written in markup, and reads them back from the instances. An invalid value falls back to the default.

Open for spec: one JSON attribute or one attribute per option, and how option names map to attribute names.

### Phase 21: AutoInit for markup added later

Depends on phase 20. An opt-in mode watches the page and starts components in markup added after load. It also destroys components whose elements are removed.

Completion check: a browser test adds a menu trigger to the page and opens it without calling `init`, then removes it and finds its instance destroyed.

Open for spec: how the mode is turned on, and how it treats shadow roots.

## Milestone: deferred polish

These came up while closing earlier gaps and were set aside on purpose.

### Phase 22: chart transitions between datasets

No dependency. `update()` animates lines, areas and bars from their old values to the new ones, and respects reduced motion.

Completion check: a browser test updates a line chart and samples the path mid-transition, between the old and new shapes. With reduced motion, the final shape appears at once.

### Phase 23: charts that follow their table

No dependency. An opt-in chart watches its `<table>` and calls `update()` when the data changes. Page script no longer has to do it.

Completion check: a browser test edits a cell and adds a row, and the chart redraws once per change batch without an explicit call.

### Phase 24: Chips as a form-associated element

No dependency. Chips form values move to a form-associated custom element, so the browser handles reset, validity and disabled state natively. This closes the two documented limits: validity that settles one microtask after `form.reset()`, and a page error set while the field is disabled that has to be set again after enabling it.

Completion check: the Chips form tests pass with checks in the same task as `reset()`, and with a page error set while the field is disabled.

Open for spec: the element's name, since it is the framework's first custom element, and how the existing markup stays compatible.
