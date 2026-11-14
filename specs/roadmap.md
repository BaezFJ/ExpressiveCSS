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
- **Dialogs:** `Dialogs.confirm()` asks a yes-or-no question and returns a promise that resolves to the answer.
- **Page helpers:** `.defer-render` skips layout and paint for a long list's off-screen rows. A `.loading-overlay` with `aria-busy="true"` blocks input under a scrim. A `hover-card-trigger` link shows its card after a delay, `.back-to-top` appears past a scroll threshold and returns to the top, and `.show-more` expands clamped text from a button that hides while the text fits.
- **AutoInit:** starts every registered component in the page, with a `no-autoinit` opt-out. A `data-<name>-options` attribute supplies a component's options from markup. With `{ watch: true }`, AutoInit also starts components in markup added later and destroys those whose markup is removed.
- **MCP server:**
  - Lists and searches the catalogue.
  - Returns complete rules and the documented Options and Methods within response limits.
  - Serves the shipped catalogue and component guides as versioned resources with name completion.

## Up next

1. [Milestone: apps that feel finished](#milestone-apps-that-feel-finished)

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

No dependencies. The quality inspector in `expressivecss-review` checks loading feedback, recovery from destructive actions, URL state and the form submit flow, and reports a finding for each problem it sees.

Completion check: reviewing a page that disables its submit button before any input, deletes a row without Undo and keeps its selected tab out of the URL produces one finding for each.

Open for spec: whether the rubric's rules live in `semantics.json` or only in the inspector's agent file.

### Phase 78: record a finished-app baseline from three fixed prompts

Depends on phase 77. An agent builds one app from each of three fixed prompts with the current skill: a settings form, a list with destructive delete, and a filtered dashboard. The quality inspector's finished-app findings for each app become the baseline.

Completion check: the prompts, the generated apps and their finding counts are committed, so a later phase can rerun the prompts and compare.

Open for spec: which agent and model build the apps, and how many runs per prompt smooth out variation between runs.

### Phase 79: guide loading feedback on buttons

Depends on phase 78. The button guide tells agents that a command button keeps its label while its request runs, shows progress beside the label and doesn't run the command twice. A spinner waits a moment before it appears and then stays for a minimum time, and an in-progress label ends with the `…` character.

Completion check: rebuilt from the baseline prompt, the settings form keeps its button label during submission, and the quality inspector reports no loading-feedback finding.

### Phase 80: guide destructive actions to an Undo snackbar

Depends on phase 78. The snackbar and list guides tell agents to remove an item at once and offer Undo as the snackbar's action. A confirmation dialog stays for actions that can't be undone.

Completion check: in the rebuilt destructive-delete app, deleting a row removes it and offers Undo, and pressing Undo restores the row in place.

### Phase 81: guide tabs, filters and pages into the URL

Depends on phase 78. The tabs and data table guides tell agents to keep the selected tab, filter text and page in the URL, so reloading, sharing a link and going Back all restore the same view.

Completion check: in the rebuilt dashboard, reloading after choosing a tab, a filter and a page restores all three.

Open for spec: whether any component needs an option to take its initial state from the URL, or the existing markup and `expressive:*` events are enough.

### Phase 82: guide the form submit flow

Depends on phase 78. The form and text field guides tell agents to leave submit enabled until submission starts, let Enter submit, show each error beside its field and focus the first one, set `name`, `autocomplete`, `type` and `inputmode`, turn spellcheck off for codes and emails, allow paste, and write placeholders as examples ending in `…`. This phase closes the guidance stage.

Completion check: submitting the rebuilt settings form empty leaves the submit button enabled and moves focus to the first invalid field.

### Phase 83: ship a button loading state that keeps its label

Depends on phase 79. An opt-in loading state on `.button` shows progress beside the label, reports busy to assistive technology and stops a repeat press from running the command. Existing buttons don't change, and the button guide from phase 79 points at the shipped state. A minimum spinner duration stays guidance and is not runtime behavior.

Completion check: in Chromium, Firefox and WebKit, a button in the loading state keeps its accessible name, reports busy, and a second press doesn't reach its handler.

Open for spec: class or attribute, and whether the state needs runtime code or CSS alone.

### Phase 84: offset anchored headings below sticky bars

No dependencies. A heading reached through a fragment link comes to rest below a sticky app bar instead of behind it. This phase closes the framework stage.

Completion check: following a link to a heading on a page with a sticky app bar leaves the whole heading visible below the bar.

Open for spec: whether every heading with an `id` gets the offset by default or authors opt in, given the product rule on changing how existing markup behaves, and whether it reuses the scrollspy offset token.

### Phase 85: lint flags `transition: all`

No dependencies. `expressivecss-lint` reports `transition: all` in the markup it checks.

Completion check: a fixture with `transition: all` in a `style` attribute gets one finding, and the same fixture listing its transitioned properties gets none.

Open for spec: whether the check also reads `<style>` blocks and linked stylesheets.

### Phase 86: lint flags disabled zoom

No dependencies. `expressivecss-lint` reports a viewport meta tag that stops people from zooming, through `user-scalable=no` or `maximum-scale=1`.

Completion check: fixtures with either setting get a finding, and the standard `width=device-width, initial-scale=1` viewport gets none.

### Phase 87: lint flags paste blocking

No dependencies. `expressivecss-lint` reports a text field whose inline handler blocks paste. This phase closes the lint stage and the milestone's final baseline comparison.

Completion check: a field with `onpaste="return false"` gets a finding, and a field whose paste handler doesn't cancel the event gets none.

## Deferred work

No phases yet:

- A shared mixin for the overflow, ellipsis and nowrap declarations that 15 rules write by hand. It would not change the compiled CSS.
