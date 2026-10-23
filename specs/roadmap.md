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
- **Data tables:** a sticky header, `data-sort` sorting and a select-all box.
- **Utilities:** layout helpers take `medium:`, `expanded:`, `large:` and `extra-large:` prefixes, and spacing uses the same window sizes.
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

No dependencies. Authors can cut a block of text to a set number of lines that ends in an ellipsis. Carousel and navbar already clamp their own text, but no class offers it.

Completion check: a browser test renders a long paragraph with each clamp class and finds its height equal to that many line boxes in Chromium, Firefox and WebKit.

Open for spec: which line counts to ship, and whether they take window-size prefixes.

### Phase 26: position and inset helpers

No dependencies. Authors can position an element absolutely or fixed and stretch it over its positioned ancestor from markup. Only `.relative` and `.sticky-top` exist today.

Completion check: a browser test places an inset element inside a `.relative` parent and finds its box equal to the parent's padding box, in left-to-right and right-to-left pages.

Open for spec: whether these join the window-size prefixed map, and how a fixed element relates to the `--expressive-z-*` stacking scale.

### Phase 27: auto-fill grid utility

No dependencies. Authors can lay out a grid that fits as many columns of a minimum width as its container allows, with the minimum set by a custom property.

Completion check: a browser test resizes the container and counts the expected columns at three widths.

Open for spec: whether calendar, cards, stat and mega menu, which each write their own `repeat(auto-fill/auto-fit, minmax(...))`, move onto the shared rule with unchanged layout.

### Phase 28: pointer utilities

No dependencies. Authors can let pointer input pass through an element, and can show the pointer cursor on a clickable element that isn't a link or button.

Completion check: a browser test clicks an overlay that has the pass-through class, and the element underneath receives the click.

### Phase 29: opacity utilities

No dependencies. Authors can dim an element to a fixed set of opacity steps.

Completion check: a browser test reads the computed opacity of each class and finds the documented value.

Open for spec: whether the steps follow M3's disabled and state-layer opacities or a plain percentage scale.

### Phase 30: unstyled lists

No dependencies. A list can drop its markers and indentation and keep its list semantics.

Completion check: a browser test finds no marker and no inline-start padding, and the accessibility tree still reports a list with its items.

Open for spec: WebKit drops the list role from a list with `list-style: none`, so the docs may need to tell authors to add `role="list"`.

## Milestone: data table and chart gaps

Data tables handle wide data, and charts can plot one measure against another.

### Phase 31: data table sticky first column

No dependencies. A wide data table can keep its first column in view while the other columns scroll sideways.

Completion check: a browser test scrolls a wide table sideways and finds the first column pinned to the wrapper's inline-start edge in left-to-right and right-to-left pages, with the corner header cell above the scrolled cells.

### Phase 32: data table column resize

No dependencies. People can resize a column by pointer or keyboard, and the page hears the new width through an `expressive:*` event. A keyboard path is required because WCAG 2.5.7 asks for a pointer alternative to dragging, as pane resizing already provides.

Completion check: a browser test drags a column edge, then presses an arrow key on it, and each action changes the width and fires one event.

Open for spec: the minimum column width, and whether widths survive a reload.

### Phase 33: data table column visibility

Depends on phase 11. People can hide and show columns from a menu of checkbox items, and each column's header and cells change together.

Completion check: unchecking a column's menu item hides its header and every cell in that column, and checking it shows them again.

Open for spec: whether the framework or the page owns the hidden state. Today the data table draws state and only `data-sort` changes the table.

### Phase 34: scatter chart

No dependencies. A scatter chart plots each table row as a point from two numeric columns. It follows the other charts for the source table, `update()`, `data-watch`, legend toggling, tooltips and keyboard focus.

Completion check: a browser test renders a two-series table and finds one focusable point per row at the position its values give.

Open for spec: how much of the line chart code it reuses.

### Phase 35: bubble sizes on the scatter chart

Depends on phase 34. A third numeric column sets each point's area.

Completion check: a browser test finds each point's area proportional to its value in the third column.

## Milestone: touch and input gaps

Touch gestures that mobile frameworks offer work in ExpressiveCSS, each with a non-gesture alternative, and text fields can format what people type.

### Phase 36: pull-to-refresh

No dependencies. Pulling down past a threshold at the top of a scroll container shows the M3 Expressive loading indicator and fires an event, and the indicator stays until the page reports that the refresh finished.

Completion check: a touch-emulated browser test pulls past the threshold, gets one event and a visible indicator, and sees the indicator hide once the page reports the refresh finished.

Open for spec: the non-gesture way to refresh, and how to keep the browser's own pull-to-refresh from also firing.

### Phase 37: swipe actions on list rows

No dependencies. Swiping a list row sideways reveals its actions, and people who don't swipe can reach the same actions from the row.

Completion check: a touch-emulated swipe reveals a row's actions, and a keyboard user reaches the same actions from that row.

Open for spec: whether it reuses the sheet drag code, and whether a full swipe runs the first action.

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
