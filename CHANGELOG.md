# Changelog

Notable changes to ExpressiveCSS. Versions follow [semver](https://semver.org/);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Timepicker's `showSeconds` option adds a seconds field after the
  minutes. It is a spin button named by the new `i18n.seconds`, it steps
  and takes typed values like the minute field, and the picker writes
  `HH:MM:SS`, with AM or PM on a 12-hour clock. The dial keeps its hours
  and minutes views. A `type="time"` input needs `step="1"` to hold the
  seconds without a step mismatch. The default of `false` keeps `HH:MM`.
- Autocomplete's `allowCreate` option ends the list in an `Add "text"` row
  when the typed text matches no suggestion exactly, ignoring case and
  surrounding spaces. Choosing it with Enter or a click calls `onCreate` with
  the trimmed text and fires `expressive:create` with `{ text }`. The
  selection does not change; the page adds the entry. `i18n.create` sets the
  row's label. Chips add the text as a chip, in an `autocompleteOnly` field
  too.
- Autocomplete's `searchDelay` option waits that many milliseconds after
  typing pauses before calling `onSearch`, so a remote search runs once per
  pause instead of once per key. A text change aborts the running search's
  signal right away. A search on focus runs at once, and blur, `destroy()`
  or choosing a single result cancels a pending one. The default of `0`
  keeps the search on every input. Chips take it through
  `autocompleteOptions`.
- A menu item with `role="menuitemradio"` checks itself and unchecks the
  other radio items in its group. A group is a `<ul role="group">` with an
  `aria-label` inside an `<li role="none">`; radio items outside a group form
  one group per menu. Rows in a group are styled and reached by arrow keys
  and type-ahead like any other row. A click or Enter checks the item and
  closes the menu while `closeOnClick` is on. Space now checks it and keeps
  the menu open, where it used to close the menu. A change fires
  `expressive:change` from the trigger with `{ item, checked: true }`, after
  `onItemClick` and `expressive:select`; choosing the checked item fires no
  change. Page code that synced `aria-checked` on radio items can go. It
  writes the same values, so leaving it in place does no harm.
- A menu item with `role="menuitemcheckbox"` toggles its own
  `aria-checked`. A click or Space flips it and keeps the menu open, so
  several items can be toggled in a row; Enter flips it and closes the menu
  while `closeOnClick` is on. Each toggle fires `expressive:change` from the
  trigger with `{ item, checked }`, after `onItemClick` and
  `expressive:select`. Migration: a page that flipped `aria-checked` itself
  in `onItemClick` or a click listener must remove that code, or the two
  flips cancel out.
- A `.validate` field sets `aria-invalid="true"` along with `invalid`, and
  clears both once the value passes, so a screen reader hears the error
  state the color shows. Its `[data-error]` supporting text joins the
  input's `aria-describedby`, keeping the ids already there, so the error
  message is read with the field. An empty `data-length` no longer marks a
  field invalid.
- Tooltips show on a long press on touch, as Android does: after half a
  second held, without `enterDelay`, staying for a second and a half after the finger lifts. A
  tap used to show the tooltip through its compatibility mouse events and
  leave it up until the next tap elsewhere; a tap now shows nothing, and a
  press that turns into a scroll shows nothing. The click a long press's
  release sends is consumed, so it does not press the button or follow the
  link.
- Menus take `placement: 'top'` to open above the trigger when they fit
  there, as for a trigger in a bottom bar, and Home and End jump to the
  first and last rows. An anchored menu that does not fit below its trigger
  now opens above it when there is more room there. Its height was capped
  to the room below, so it shrank and scrolled instead of flipping.
- Chips submit a form value. Give the field's `<input>` a `name` and the
  chips submit under it, one `id` per chip, as a multiple select does. The
  text input gives its name up so half-typed text is not submitted, and the
  values follow its form, `form` attribute and `disabled` state when the form
  gathers its data. A `required` input makes the field valid once it has a
  chip, and says the new `i18n.required` until then, with
  `aria-required="true"` on the input. A form reset puts back the starting
  chips at the next microtask, once it can no longer be canceled. `destroy()` gives the
  input its name and `required` back. Pasting text that lists values, split
  by commas, tabs or new lines, adds a chip for each, up to `limit`.
- Data tables sort and select. With `data-sort` on a `.data-table`, a
  button in a header cell reorders the rows by its column and moves
  `aria-sort`. A `numeric` column compares numbers, other columns compare
  text in the page's language, `data-value` stands in for a cell's text, and
  a detail row moves with its row. A cancelable `expressive:sort` lets a
  server-paged table sort the rows itself. A checkbox in the first header
  cell now selects every enabled row and shows mixed for some, and each
  change fires `expressive:change` with the selected rows.
  `Expressive.DataTables.sync()` updates the select-all box after rows are
  checked from script. Pages that sort with their own script and no
  `data-sort` are unaffected.
- Charts with a series legend take `.toggle`. Each legend item becomes a
  button with `aria-pressed` that shows or hides its series, and the scale
  refits to the series left. The other series keep their colors, the last
  one shown with data cannot be hidden, and a hidden series stays hidden
  through `update()`. Line, column, bar, mixed and radar charts have it.
  Without the class the legend stays decorative.
- The Auto Init page documents Alpine.js. A short `x-expressive` directive
  starts a component each time Alpine renders its element, including inside
  `x-if` and `x-for`, and destroys it when Alpine removes the element. The
  page also shows how to keep a Select in sync with `x-model` by calling
  `refresh()`. A browser test runs the directive against Alpine in Chromium,
  Firefox and WebKit.
- Charts have `update()`, which redraws a chart from its changed table in
  place. Before, the way to redraw was to call `init()` again, which dropped
  keyboard focus and the highlighted row. Now focus stays on the chart, the
  highlighted row stays where the table still has it, and a scrolled heatmap
  stays scrolled. A chart set up with an empty table draws once it has rows.
- Tabs can be a tablist. A strip the page writes as `role="tablist"`, with
  `role="tab"` links naming their panel in `aria-controls`, gets the ARIA
  tabs pattern: Tabs keeps `aria-selected` and a roving `tabindex`, so the
  strip is one Tab stop, and Left, Right, Home and End select as they move.
  Link tabs with `aria-current` stay the default. `semantics.json` allows the
  roles only when the markup is complete: named, on a `<div>`, every tab a
  `role="tab"` with `aria-controls`. In either mode an overflowing bar
  scrolls the selected tab into view, without scrolling the page, and with
  no `.active` tab or matching hash the first enabled tab is selected rather
  than a disabled first one.

- A `data-draggable` map marker moves without a drag (WCAG 2.5.7). A tap
  picks it up and sets `aria-pressed`, and the next tap on the map drops it
  there. `Escape` or a second tap puts it back, and the arrow keys nudge a
  focused one. A marker that is not a `<button>` gets `role="button"` and
  `tabindex="0"` while the map runs.
- Map controls take `pan-up`, `pan-down`, `pan-left` and `pan-right` actions,
  which move the view a third of the map's size, so it pans without a drag.

- Menu, Lightbox, NavigationRail, Cards and ExpandingCard fire
  `expressive:open` and `expressive:close` DOM events from the element
  they were initialized on. Menu, Lightbox and NavigationRail then fire
  `expressive:opened` and `expressive:closed`. The events bubble and cross
  shadow roots, and each follows its `on…` callback, which still works.

- Choices and changes fire events too, with what was chosen in `detail`:
  `expressive:change` from Tabs (`{ panel }`) and Carousel
  (`{ item, dragged }`), `expressive:select` from Menu items (`{ item }`),
  Datepicker (`{ date }`) and Timepicker (`{ hours, minutes }`),
  `expressive:confirm` and `expressive:cancel` from both pickers,
  `expressive:autocomplete` (`{ values }`), and `expressive:chip-add`,
  `chip-select` and `chip-delete` (`{ chip }`). A callback that changes the
  choice again leaves only the event for the final one. Tabs now calls
  `onShow` after hiding the old panel, and Chips callbacks get the instance
  as `this`, as every other component's do.

- The rest report too: Tooltip fires `expressive:open` and
  `expressive:close` when it shows and hides; Snackbar fires `open`,
  `action`, `close` and `closed`; ButtonGroup fires `change` with
  `{ button, pressed }`; ScrollSpy fires `change` from the section with
  `{ link }`; Tour fires `open`, `change` with `{ step, index }` and `close`
  with `{ completed }`; and copy buttons fire `expressive:copy` with
  `{ text, copied }`. `Tour.end(el, completed)` takes the flag from script.

- Sheets spring back with the finger's speed: a bottom or side sheet
  released short of dismissing solves its spring at run time from where
  it is and how fast it moves, and a press while it springs catches it in
  place. Each motion spring gains `-damping` and `-stiffness` tokens.

- Arabic, Hebrew and Thai text: Noto Sans Arabic, Noto Sans Hebrew and
  Noto Sans Thai ship at 400, 500 and 700, each limited to its script's
  `unicode-range` so a page fetches one only when it shows that script,
  and `--md-ref-typeface-fallback` lists them before `sans-serif`.

- Autocomplete `onSearch` gets an `AbortSignal` as its third argument. It
  aborts when a newer search starts or the autocomplete is destroyed, so a
  page that passes it to `fetch()` drops stale responses.

- Linear progress `.stop` puts a dot in the indicator colour at the
  track's end, and `.wavy` draws the indicator as a wave over a thin track,
  on `<progress>`, `.determinate` and bare bars, and a circular indicator
  takes `.wavy` too: a wave round the ring over a thin track. New tokens:
  `--md-comp-progress-stop-size` and `--md-comp-progress-wavelength`.

- Common button shapes: `square` takes the size's squared corner, every
  common button morphs to its size's pressed corner while pressed, and
  `aria-pressed` makes a button a toggle that swaps round and square when
  selected and takes the M3 selected colours for its style.

- Questionnaire extras, each opt-in on the form: `data-shortcuts` lets a
  letter or digit pick an answer, `data-summary` adds a review step that
  lists every answer with an Edit button before submitting, and
  `data-save="key"` keeps the answers and the shown question in
  localStorage until the form is submitted.

- Keypad and keyboard keys: `data-key="CapsLock"` holds capitals until
  pressed again, and `data-key="Layer"` shows the elements whose
  `data-layer` matches its `value`, such as a row of symbols. A hardware
  key held down in the field presses the matching on-screen key. The
  keypad now checks `minlength` on its own edits, with the
  `i18n.tooShort` message.

- Radial chart fills: `data-segments` splits each ring into segments filled
  whole, and `.gradient` shades each fill along its ring, from a light
  tint at the start to its full color where the fill ends.

- Range columns and bars: a series header with the class `range` reads
  cells such as `120–480`, `3 to 14` or `data-value="120 480"` and floats a
  column or bar between the two ends, rounded at both.

- Mixed chart stacking: `.stacked` stacks the column series into one
  column per row, with the `end` scale's columns in their own column
  beside it. Lines and areas keep their own values.
- Line and mixed chart `.points` marks every value on a line with a dot,
  and `.straight` draws straight lines between values instead of a curve.

- Heatmap scales: `data-mid` makes the scale diverge from that value, with
  values below it shading towards the new
  `--md-comp-heatmap-chart-low-color` (`tertiary`), and `data-steps` groups
  the shades into bands, with a swatch per band under the grid.
- Wide heatmaps scroll: cells keep `--md-comp-heatmap-chart-cell-min-width`
  (12px), and a grid too wide for its figure scrolls its cells sideways
  instead of narrowing them, while the row labels stay in view. The arrow
  keys scroll the cell they move to into view.

- Pie chart grouping: `data-other="5"` turns every row under 5% of the
  whole into one last slice with their sum and share, named by
  `data-other-label` ("Other" by default). The table keeps every row.
- Radial chart names: `.labels` draws the rings three quarters of the way
  round and writes each row's name in the empty top left quarter, beside
  its ring's start. Names shrink to fit crowded rings. On a gauge, the names
  hang under the base line, a row per ring with the innermost on top, each
  after a line down from its ring's start. A sparkline ignores it.
- Pie chart names: `.labels` writes each slice's row name outside the pie,
  beside its slice. Names that would touch move apart along their side, a
  line leads from each name back to its slice, and the pie shrinks to leave `--md-comp-pie-chart-label-width` (96px), or a
  quarter of a narrow figure, on each side.
- Expandable bottom sheets: `dialog.bottom-sheet.expandable` opens at
  `--md-comp-bottom-sheet-partial-height` (50% of the viewport) and
  `.expanded` grows it to the full height. A drag up expands it, a drag
  down collapses it before it dismisses, and a handle `<button>` switches
  between the heights with `aria-expanded` kept current.
- Arrow keys for tabs and lists: Left, Right, Home and End move focus
  between tabs, wrapping and skipping disabled ones, and Up, Down, Home and
  End move it between the rows of a `.list` whose rows are each one link or
  button. Tabs and rows stay links and Tab stops; focus moves without
  choosing. The list keys come from the new `Lists` behavior.
- Modal date and time pickers: `displayPlugin: 'modal'` opens the picker in
  a modal `<dialog class="display-modal">` drawn as a basic dialog, named by
  the input's label. Ok writes the input; Cancel, Escape and a press on the
  scrim close it without a change and call `onCancel`. Focus moves into the
  dialog and back to the input. Selective Sass builds add `"dialog"` and
  `"modal-display"`.
- Value axes for charts: `.axis` on a line, column, bar or mixed chart
  labels its value scale at round values, with a grid line at each, and
  widens an end the chart chose to the next round value. The labels repeat
  the cells' currency or percent sign and shorten large numbers. A mixed
  chart labels its `end` scale on the far side and stretches it so both
  label sets share the grid lines. On a radar chart, `.axis` rings the grid
  at round values and labels the rings.
- Non-Latin text faces: Roboto and Noto Sans now ship Latin Extended,
  Cyrillic, Cyrillic Extended, Greek, Greek Extended and Vietnamese subsets,
  and Noto Sans adds Devanagari, at 400, 500 and 700. Each face has a
  `unicode-range`, so a browser downloads only the scripts a page renders.
- Cut corners: `--md-sys-shape-corner-family` (`round` or `bevel`), a
  `corners="cut"` switch that cuts the corners of cards, dialogs, sheets,
  menus, fieldsets, buttons, chips, alerts, snackbars, tooltips, popovers and
  outlined fields, and a `.corner-cut` utility. Built on CSS `corner-shape`;
  browsers without it keep rounded corners.
- Spring motion tokens from Material 3 Expressive:
  `--md-sys-motion-spring-{fast,default,slow}-{spatial,effects}` with a
  `-duration` token each, solved at compile time into `linear()` easings.
  `motion="expressive"` on the root or a subtree selects the expressive
  spatial springs. The Sass `spring($damping, $stiffness)` and
  `spring-duration()` functions build custom ones.
- Emphasized type roles from Material 3 Expressive: `.{role}-emphasized`
  classes for all fifteen roles and
  `--md-sys-typescale-emphasized-{role}-font-weight` tokens, at `500` for
  display, headline, title-large and body and `700` for title-medium,
  title-small and label. Roboto and Noto Sans now ship a `700` face, fetched
  only when a page renders that weight.
- A "Design tokens" documentation page at `/tokens.html` lists every token
  family, its prefix and the page that documents it, with an override
  example.
- Material 3 motion tokens: `--md-sys-motion-easing-*` for the standard,
  emphasized and linear curves and `--md-sys-motion-duration-short1` to
  `extra-long4`. Components now read them wherever they used an on-scale
  curve or time, so `:root { --md-sys-motion-duration-short4: 150ms; }`
  speeds up every 200ms transition. Computed values are unchanged.
- Material 3 corner tokens: `--md-sys-shape-corner-none` to `full`, with the
  Expressive `large-increased`, `extra-large-increased` and
  `extra-extra-large` steps. Component shape tokens on the scale read them,
  so `:root { --md-sys-shape-corner-medium: 8px; }` squares off every medium
  corner. Computed values are unchanged.
- Elevation tokens: `--md-sys-elevation-level0` to `level5` and
  `level1-half`, generated from the `$elevations` map. The `z-depth()`
  mixin, the `.z-depth-*` classes and every component read them, so a theme
  can change a shadow level at runtime. Computed values are unchanged.
- `--expressive-z-*` properties name the stacking order of fixed and floating
  surfaces, from `toolbar` (996) to `confetti` (10001). Components read them
  instead of literal `z-index` values, and the Shadow page lists them.
- Layout helpers take a window-size prefix: `.medium:`, `.expanded:`,
  `.large:` and `.extra-large:` versions of the display, flex direction and
  wrap, `justify-*`, `align-*`, text alignment, `.gap-*`, margin and padding
  classes, and `.hide`, apply from that size class up, so
  `flex flex-column expanded:flex-row` stacks until Expanded.
- More helpers: `.block`, `.inline-block`, `.grid`, `.inline-grid`,
  `.contents`, `.relative`, `.sticky-top`, `.flex-row`, `.flex-nowrap`,
  `.justify-around`, `.justify-evenly`, `.align-baseline`, `.self-*`,
  `.order-first`, `.order-last`, `.shrink-0`, `.w-full`, `.h-full`,
  `.max-w-full`, `.aspect-1x1`, `.aspect-4x3`, `.aspect-16x9`,
  `.object-cover`, `.object-contain`, `.bordered`, `.border-top`,
  `.border-bottom`, `.border-start`, `.border-end`, `.corner-none` to
  `.corner-full`, `.text-balance` and `.text-pretty`.
- Print styles. Paper uses the light scheme and hides navigation rails,
  navigation bars, the FAB menu, snackbars and tooltips. External links in running text print their address, headings
  stay with what follows, and table headers repeat on each page.
  `.hide-on-print` and `.print-only` cover the rest.
- `.prose` styles a container of bare HTML, such as rendered Markdown: a
  70-character measure, heading and list spacing, underlined links in lists
  and headings, and a surface for inline code and `<pre>`. It only touches
  elements without a class and sits in the base layer, so components inside
  it keep their own look.
- `.query-container` makes an element a query container. Horizontal cards
  and description lists inside one stack when it is narrower than 600px, so
  they adapt to a sidebar or pane on a wide window.
- Contrast levels: `contrast="medium"` and `contrast="high"` on the root or
  a subtree select M3's medium and high contrast schemes. Accents, their
  containers, `on-surface-variant` and outlines move to tones that reach
  about 4.5:1 and 7:1 against the surface. `prefers-contrast: more` applies
  the high scheme unless a `contrast` attribute is set, and
  `contrast="standard"` opts out.
- Color swatches component: a `fieldset.color-swatches` of radios in
  labels with visually hidden names, each drawn as a round chip of the color
  set in `--md-comp-color-swatch-color`, with a ring around the checked one.
  An `<input type="color">` at the end adds a custom value. CSS only.
- Number stepper: two trailing `.icon-button.suffix` buttons with
  `data-step="down"` and `data-step="up"` in a `.field` step its
  `<input type="number">` within `min`, `max` and `step`, and fire `input`
  and `change`. The browser's spin buttons are hidden. The Forms behavior
  handles it, so there is nothing to initialize.
- Color picker component: `ColorPicker` enhances a `.color-picker` around an
  `<input type="color">` with a saturation and brightness area, the
  framework's slider as a hue control, and a hex field. The native input stays
  the form value and fires `input` and `change`. The area is a keyboard
  slider with a spoken value. AutoInit starts it.
- A "Frosted glass" documentation page at `/glass.html` covers the
  `--expressive-glass`, `-blur` and `-opacity` properties, the Sass defaults,
  the surfaces that frost, and the reduced-transparency fallback, with live
  demos. A button in the docs app bar turns glass on across the site.
- A navigation rail destination can open a `.navigation-rail-panel` side
  panel of more links. Make the destination a `<button popovertarget>` and
  put the panel popover right after it. The panel docks beside the rail at
  full height, a click toggles it, and with a mouse hovering the destination
  opens it. `<details>` groups inside the panel are its dropdowns.
- `.org-chart` draws a reporting line top down, with each person as a card
  under their manager. Write nested lists; a manager's card is the
  `<summary>` of a `<details>` that folds the team away. Cards take an
  `.org-chart-role` band, an `.avatar` and an `.org-chart-name`. A wide
  chart scrolls sideways. CSS only.
- The `expressivecss-migration` agent skill moves a project from Materialize
  or an older 0.x release to current names in eight steps: package and
  assets, JavaScript API, removed components, classes and markup, the aliases
  1.0 removes, silent visual changes, and verification. Each step ends with a
  search for the names it replaces, and the skill installs on its own with
  `npx skills add BaezFJ/ExpressiveCSS`.
- An "AI agents" documentation page at `/ai.html` lists the plain-text docs,
  the install command for the agent skills, the MCP server configuration and
  the `expressivecss-lint` command. Its skills table is read from each
  `skills/<name>/SKILL.md`, so a new skill appears without editing the page.
- Menubar component: a `.menubar` of `.menu-trigger` buttons gets the menubar
  and menuitem roles, one Tab stop, Left, Right, Home and End along the bar,
  and Left and Right between open menus. Each item opens an ordinary Menu.
  AutoInit starts it.
- Mega menu component: a `nav.mega-menu` of links and buttons whose
  `.mega-menu-panel` popovers open wide panels of grouped links below the bar.
  CSS only, on native popovers.
- Tour component: a `.tour` manual popover walks through `<section>` steps
  beside each `data-tour-target`, with Back, Next, Done, progress text,
  skipped missing targets, Escape and focus return. `Expressive.Tour` adds
  `start()`, `go()` and `end()`.
- Image compare component: a `.image-compare` reveals its second image up to
  a native range input's value. The `ImageCompare` behavior moves the
  divider, and Slider no longer initializes that range.
- Calendar component: a page-rendered `table.calendar` draws a month grid
  with weekday headers, today, outside days and event chips. CSS only.
- Sortable lists: a `.sortable` list reorders by dragging an item's
  `.drag-handle` or with its `[data-move]` buttons, announces each move and
  fires `change` with `{ item, from, to }`. Semantics require the buttons.
- `<input type="color">` is drawn as a round swatch of its color.
- Description list component: `dl.description-list` lays out label and value
  pairs in two columns with a divider per pair, stacking each label above its
  value at Compact widths. CSS only.
- Error summary: an `.error-summary` alert in a `novalidate` form stops an
  invalid submit, lists one link per invalid field with its label and the
  browser's message, and takes focus. Each link focuses its field. Part of
  the Forms behavior.
- Resizable panes: a `<button class="drag-handle">` between the two panes of
  a list-detail or supporting layout resizes them by drag, arrow keys, Home
  and End, or a click that steps through narrow, middle and wide. The
  `PaneResize` behavior writes `--md-comp-pane-list-width` or
  `--md-comp-pane-supporting-width`.
- Data table bulk actions and row expansion: a `.data-table-actions` bar
  joins the table's top edge and takes the selected color while rows are
  selected, and a `tr.data-table-detail` shows while the row before it holds
  a button with `aria-expanded="true"`. CSS only; the page flips the state.
- Alert component: `.alert` is a persistent message in the page flow with an
  optional leading icon, a heading and text, an `.alert-actions` row and a
  close button. `critical` switches to the error container colors. CSS only.
  It replaces the banner as the answer for persistent, nonblocking messages,
  and the banner migration page now points to it.
- `<meter>` gets an 8px bar on a `secondary-container` track. The fill is
  `primary` in the optimum region, `tertiary` one region away and `error` two
  away, from the native `low`, `high` and `optimum` attributes. No class is
  needed, so existing meters change appearance and fill their container's
  width; set `width` on a meter to keep it inline.
- Copy buttons: `data-copy-for="id"` copies a field's value or an element's
  text, and `data-copy="text"` copies the text itself. A snackbar confirms the
  result. `Expressive.Copy.i18n` and `data-copy-message` / `data-copy-error`
  replace its texts.
- Theme switch: `data-theme-set="light|dark|auto"` on any control writes the
  `theme` attribute, saves the choice to `localStorage` and marks the current
  control with `aria-pressed` or `aria-checked`. `Expressive.Theme` adds
  `set()`, `get()` and `sync()`. Restoring a saved choice before first paint
  stays with the page's inline script.

### Fixed

- Timepicker reads AM or PM wherever it appears in a value, so
  `02:30:45 PM` opens at 2:30 PM. The period was looked for only after the
  first colon, so such a value, or one like `2 PM`, opened as AM.
- With a query typed, the first Escape in the command palette clears it and
  the next closes the palette, in every engine. Chromium and Firefox already
  did this for a search input; WebKit closed at once, and so did every
  engine for a text input. An Escape that cancels an IME composition is left
  to the IME.
- In forced colors, a filled keypad key such as Call has a 3px edge. The
  fill that set it apart is dropped there, so it looked like every digit.
- In forced colors, a determinate circular progress draws its track as a
  thin line through the ring, so the value and the track differ in shape.
  Both were full-width rings, told apart only by GrayText against
  CanvasText, which Night sky sets close together.
- A narrow heatmap shows whole column labels. Like the line, column and
  mixed charts, it keeps every second label (or every third, and so on)
  when each is wider than its column, instead of cutting all of them to
  "W…". Labels the author already spaced out with empty `data-label`
  cells, such as a year of weeks named once a month, are left as written.
  The labels are now measured where they sit, so the columns' gaps and
  right-to-left grids are counted.
- Pie slices 5 and 6 stand out from the surface. They took
  `primary-container` and `tertiary-container`, which are 1.3:1 on the
  surface in light mode and 2:1 in dark, under the 3:1 a slice needs. Each is
  now its container role mixed 45% with `on-surface`: the same hue, at 5:1
  in light and 6.8:1 in dark. `.values` text on them is `surface`. A page
  that sets `--md-comp-pie-chart-color-5` or `-6` keeps its own colors.
- In forced colors, an invalid checkbox has a dashed edge. Forced colors
  drop the error color, so it looked like any other box. A checked invalid
  box used to paint the author's error red and on-error mark, because the
  error rules outranked the forced-colors ones; it now takes Highlight and
  HighlightText like any checked box, and a disabled one stays GrayText.
- Chart cards in the docs keep their contents off the border, and the
  period switch sits beside the stat instead of on a row of its own. The
  column chart page now says a card needs `p-4` around its stat and chart,
  as the line chart page already did.
- A narrow line, column or mixed chart shows whole row labels. When each
  label is wider than its column, the chart keeps every second label (or
  every third, and so on) and hides the rest, rather than cutting all of
  them to "J…". Twelve months on a 320px phone show as six. The chart
  re-checks as it resizes, and the full text stays in the tooltip and the
  table.
- A top app bar whose destinations do not fit beside the title wraps them
  onto a second row. Before, the title shrank to one letter and an
  ellipsis. On one row the bar is unchanged.
- In WebKit, the keyboard can scroll a docs code sample that is wider than
  its block. Chromium and Firefox already put such a block in the Tab
  order; WebKit skipped it.
- The Carousel page shows the Show all action it recommends, opening a
  full-screen dialog of the same items. It is the single-pointer way
  through a carousel (WCAG 2.5.7), and no demo had it.
- The Enter that confirms an IME candidate no longer acts on a field. In
  the date picker it moved focus into the calendar and read the unfinished
  text; the time picker, the autocomplete's active option and the color
  picker's hex field also took it. The date picker, time picker and
  autocomplete now skip every key of a composition, so the arrows and
  Escape used to pick a candidate leave them alone too.
  `Utils.isComposing(e)` checks `isComposing` and Safari's keyCode 229, and
  Chips, Command palette, Menu and Questionnaire now share it, so Menu and
  Questionnaire also skip Safari's confirming Enter.
- A keyboard-focused slider handle takes the shared 3px focus ring. Its only
  cue was a 10% tint around the handle, about 1.1:1 against the surface.
- In a browser without CSS anchor positioning, a popover is centered in the
  viewport. It used to land in the top-left corner, far from its button.
- A scrolling marquee no longer restyles every item on each frame. The
  reset's `box-sizing: inherit` tied each item's style to its moving group,
  so on a page that also drew every frame, each frame restyled every item
  as well as the groups. Items now set `box-sizing: border-box` themselves.
- A dot map marker takes taps in a 48dp circle around its 16dp dot. It was
  a 16px target on a map that is itself a target, under WCAG 2.5.8's 24px
  minimum.
- A snackbar with `displayLength: Infinity` gets its close button by
  default, as one with an action does. Without an action it could otherwise
  only be swiped away. An explicit `dismissible: false` is kept.
- A `nowrap` breadcrumb scrolls sideways as documented. Its crumbs used to
  shrink below their text, so each separator sat on the last letter of the
  crumb before it.
- A list row's trailing `span.badge` or `span.meta` stays in the last
  column. The label rule matched it and outranked the trailing rule, so a
  bare-text label like "Inbox" was pushed after the badge.
- Controls grow with their text. Type is set in `rem`, but buttons, icon
  buttons, FABs, badges, avatars, keypad keys, text fields, selects, the
  app bar, the search bar and the slider's inset icon used `px` boxes. With
  a larger browser font size or 200% text-only zoom, their labels and icons
  spilled out or were cut, and a field's floating label sat on its value.
  Those sizes are now `rem` (a new `rem()` Sass function), so pages render
  the same at the default 16px. A field's clearance for its prefix, suffix,
  password toggle and number stepper grows with them.
- Charts, cards, stats, KPIs and the org chart grow with their text too:
  - the chart height, y-axis width, bar and heatmap row heights, pie label
    room, radar label room and tooltip width;
  - the small, medium and large card heights;
  - the stat tile minimum;
  - the KPI icon box;
  - the org chart card width.
  At 200% text, axis labels no longer shrink to "8…" or "$…", a pie or
  radial total stays inside its ring, and stat tiles wrap instead of
  breaking "$48.2k".
- A trigger with both a Tooltip and a Menu keeps both anchors. Each wrote
  the whole `anchor-name` property, so the second replaced the first, and
  destroying either removed the other's. Tour targets share the same list.

- Timepicker on an `<input type="time">` writes 24-hour `HH:mm`. A
  12-hour picker wrote `02:15 PM`, which a time input rejects by emptying
  itself.

- Tab closes an open Lightbox. The image zooms in place rather than in a
  modal, so Tab used to move focus to the page behind the overlay.

- The data table page's sort script compares numeric columns as numbers
  and reads `data-value` first, so `$1,200.00` sorts after `$87.00`.

- Forced colors (Windows contrast themes) paint every fill as Canvas, and a
  few controls drew nothing else:
  - Filled, tonal and elevated buttons, filled and tonal icon buttons,
    keypad keys, the keyboard, the questionnaire's footer buttons, the bar
    chart track and the search bar now get an outline.
  - A pressed toggle takes the Highlight fill.
  - The select caret and check, the submenu chevron and the bottom sheet
    handle, all glyphs masked from a fill, paint in CanvasText.
  - Slider stops come back, and the inactive track is CanvasText, so
    GrayText now means only disabled.
  - Disabled checkboxes, radios and their labels turn GrayText.
  - FABs (`.extra`, `.extend`, `.large.circle`) and `.button` get the
    outline too, the column chart track is outlined like the bar chart's,
    the color picker area gets an edge, and every aura variant, rainbow and
    glow included, is the solid Highlight ring its docs describe.
- Blockquotes, table cells and the stacked `.responsive-table` header use
  logical properties, so the quote bar, cell alignment and header border
  mirror in a right-to-left page.
- The lightbox opens above a non-modal bottom or side sheet. Its overlay and
  zoomed image were at `z-index: 1000`, under the sheets' 1100; they now use
  `--expressive-z-lightbox` (1200).
- Swipeable tabs no longer jump back to the previous panel when you pick a
  new one while the last scroll is still running. The track released its
  target as soon as its position rounded to the new panel, so the rest of
  the old scroll selected the panel it was heading to and fired `onShow`
  for it. The target now holds until the track arrives.
- Static chip close buttons work again after `AutoInit()`. The fallback
  handler stepped aside for any `.chips` with an instance, and an instance
  without `allowUserInput` never handled the click. Chips also copy their
  initial `data`, ignore Enter during IME composition, and mirror arrow keys
  in right-to-left text.
- Menu clears its old highlight when it closes or moves, so reopening no
  longer leaves two rows active. A `.menu-trigger` whose target id does not
  resolve now warns and stays inert instead of inserting the text "null".
  Menubar arrow keys skip disabled items.
- A multi-select's checkbox stays checked when the box itself is clicked, and
  a disabled option in a single select no longer closes the menu.
- Autocomplete keeps the active row when a multi-select option is toggled and
  doesn't search again. It returns focus to the field after a single-select
  click, and takes Escape only when it closes the list, so an enclosing dialog
  stays open. Results set before the field is focused don't open the list.
  `destroy()` removes the combobox attributes it added.
- Datepicker sorts multiple dates the same way in every browser, puts the tab
  stop on today when nothing is selected, keeps focus on the year or month
  select across a redraw, and no longer changes the caller's `minDate` and
  `maxDate`. A typed date in multiple-selection mode joins the selection.
  `destroy()` removes the date input's painted value.
- Tabs find panels whose ids contain non-ASCII characters or sit in a shadow
  root, and a shown panel keeps its CSS `display` instead of becoming
  `block`.
- Carousel leaves Alt, Ctrl, Meta and Shift shortcuts alone, as well as arrow
  keys aimed at sliders, menus, tab lists and media controls inside a slide.
- A snackbar swipe made within one millisecond no longer counts as a flick.
- A textarea hidden at load (in a closed dialog or an inactive tab) gets its
  height when it is first focused or typed in instead of staying 0px tall. A
  `.file-field` without a path input no longer throws.
- Tour skips steps whose target has been removed. A side sheet starts a drag
  only from its own header. Escape during a sortable drag no longer closes
  the dialog around the list.
- Lightbox returns focus to the image when it closes and doesn't open an
  image it can't measure. Particles uses the latest visibility entry,
  repaints still dots after a theme change, and follows reduced motion as it
  changes. MapView skips `data-lng-lat` values with an empty part and
  handles cluster zooms and fullscreen requests that finish after
  `destroy()`.
- A keypad initialized before it is in the document works once inserted. The
  slider's value label follows its host when the host resizes.
- RichTextEditor logs invalid toolbar `data-attributes` JSON instead of
  throwing. A required editor blocks submit while empty and takes focus,
  where the hidden textarea used to block it with no message.
- The character counter shows a prefilled value's count and invalid state
  without waiting for focus. ExpandingCard calls `onClose` when its dialog is
  closed natively. Card reveals and the app bar's search view work inside a
  shadow root. ExpandingCard, AppBar, the FAB menu and CharacterCounter undo
  their ARIA and tabindex changes on `destroy()`, and an `<a>` FAB trigger
  without `href` is focusable.
- A navigation rail `<button>` destination is now as tall as a link
  destination instead of the default button's 40px.
- A side panel destination that comes first in a navigation rail is laid out
  as a destination, and `NavigationRail` no longer treats it as the menu
  toggle.
- The navigation rail side panel keeps its 12px padding. The global
  `[popover]` reset in the menu styles had cleared it.
- A modal or compact NavigationRail no longer collapses when blank space
  inside it is tapped. Its scrim is the rail's own `::before`, so those taps
  looked like scrim taps; only a tap beside the rail collapses it now.
- Touch drags on a bottom sheet's `.drag-handle` and a side sheet's
  `<header>` now dismiss the sheet. Without `touch-action` the browser took
  the drag as a pan and cancelled the pointer, so the sheet snapped back. The
  bottom sheet's built-in handle band and the side sheet's inner edge have no
  element of their own to carry `touch-action`, so on touch screens the
  explicit handle and the header are the drag areas.
- A docked Datepicker for a date range now opens from its end input, and a
  click on that input no longer closes it. The plugin counted the end input
  as outside.
- Menus listen for outside clicks on the document instead of `<body>`, so a
  click below the content of a page shorter than the window closes them.
- A MapView marker or popup whose `data-lng-lat` is not "longitude,latitude",
  such as Google's latitude-first order, is skipped with a warning. MapLibre
  threw on it after the map was created, which leaked the map and stopped
  the rest of that `init()` call.
- Restarting a running Tour releases the step it was showing, so only one
  target carries the highlight.
- Autocomplete results that arrive after the user left the field update the
  list without opening it under the input.
- A date typed into a Datepicker that the calendar would not offer, outside
  `minDate`/`maxDate`, a disabled weekend or refused by `disableDayFn`, now
  puts the input back to the selected date. A date before `minDate` used to
  become `minDate` in the picker while the input, and the submitted form
  value, kept the typed text.
- A Datepicker input's initial value is now the selection, as it already was
  once the input was clicked. `instance.date` was undefined until then, and a
  multiple selection started empty.
- A form reset now resets a Datepicker: the inputs added for extra dates in
  multiple selection are removed, and the selection is read back from the
  reset values. A refused date typed into one of those inputs restores that
  input's own date. A Slider's fill and value label also follow a form reset.
- Skipping a Questionnaire question clears its error. A skipped question
  whose answer had been wrong still showed the error when the user went back.
- A tooltip opened by hover still closes on Escape but no longer takes the key
  from the focused control, so the same Escape also closes the dialog or menu
  the user is in. On its own trigger, Escape stays the tooltip's.
- A hover menu no longer moves focus into itself when the pointer passes its
  trigger, which pulled focus out of the field being typed in. Space, Enter or
  an arrow key on the trigger moves focus into the open menu, and Escape
  closes it from wherever focus is.
- Clicking inside an open Autocomplete input, for example to move the caret,
  no longer closes its list. A trigger's own click is no longer treated as an
  outside click by Menu.
- Enter in a Timepicker hour or minute field writes the typed time, after an
  emptied field takes its default as it would on leaving. With the
  default `autoSubmit` there is no Ok button, so a keyboard user could type a
  time but never set it.
- Chips selection follows focus. Arrow keys used to move from the highlighted
  chip while Backspace deleted the focused one, and the highlight stayed after
  focus left the field.
- Behaviors that listen on the document now work inside an open shadow root.
  Copy, Theme, Dialogs light dismiss, bottom and side sheet dragging, the
  bottom sheet handle button, ImageCompare, PaneResize, Sortable, Tour
  controls, the password toggle, error summary links and drop zones read the
  event's `composedPath()` instead of its target, which the document sees as
  the shadow host. Sortable keeps focus on a moved item's button there, Theme
  marks the controls in the clicked control's shadow root, and a sheet closed
  there in the middle of a drag reopens without the drag offset.
  Menubar moves between open menus, ScrollSpy marks links, and a card reveal
  trigger named by `aria-labelledby` is accepted in a shadow root too. A
  tooltip under a positioned shadow host now sits next to its trigger instead
  of offset by the host's position. `change`, `submit`, `reset` and `toggle`
  events do not leave a shadow root, so file lists, field validation, the
  error summary and Tour's own toggle handling still need light DOM.
- Focused read-only text fields now show the focus underline. The field's
  focus styles skipped `[readonly]`, and FormSelect makes its combobox input
  read-only, so a focused select had no visible focus indicator.
- `@use "expressive" with ($md-source: …)` now sets the theme seed, as the
  changelog for 0.13.0 and the migration skill describe. The variable moved
  to `abstracts/_variables.scss`; before, Sass rejected the configuration
  because the tokens layer is loaded with `meta.load-css()`.
- The time picker's clock face is sized from `dialRadius`. It was a fixed
  260px while the hand and numbers centred on the default 135px radius, so
  the hand sat 5px off centre, further with a custom `dialRadius`.
- Menus, context menus and select dropdowns open next to their trigger in
  right-to-left pages. The menu kept the browser's `[popover]` `inset: 0`,
  so with its explicit width the right edge won over `left`, and the menu
  opened against the right side of its container.
- Unlayered CSS can set a shadow on any component again. Thirteen component
  rules that remove a shadow (text buttons, disabled buttons, docked
  toolbars, filled and outlined cards, full-screen dialogs, separated panes,
  the search view's bar) used `box-shadow: none !important`, and a layered
  `!important` beats every unlayered rule. Only the `.z-depth-0` utility
  keeps the flag. A focused disabled `a.button` with an `href` no longer
  shows the enabled fill, a disabled FAB takes the disabled fill instead of
  the primary container, and an `elevated` pane in a separated or floating
  layout now shows its elevation. Disabled FAB menu items and toolbar FABs,
  including `aria-disabled="true"` ones, paint as disabled and no longer lift
  or tint on focus; `aria-disabled` ones still take hover, so a tooltip can
  say why. `.hoverable` no longer lifts a disabled element.
- A shadow root that adopts the sheet as its only stylesheet now inherits the
  page defaults: `border-box` sizing, the body-medium type role and the
  on-surface text color. These were set only on `html` and `body`, which a
  shadow tree cannot reach, so its elements were `content-box` with the
  browser's default text color.
- With reduced motion requested, the floating label, switch handle, icon
  button shape, slider value label, chips, time picker dial and the open card
  reveal panel no longer animate.
- A carousel that reaches the end of its track keeps the item you moved to.
  Items past the end share that scroll position, and a one-pixel rounding
  difference in WebKit could select a later one in a right-to-left carousel.
- Selection and checked states stay visible with forced colors (Windows High
  Contrast). Tabs, navigation bar and rail destinations, pagination, toolbar
  actions, menu and list items, mega menu links and filter chips mark the
  selected item with a Highlight outline. Checkboxes, radios and switches draw
  their checked state in system colors and get an outline on keyboard focus.
  The datepicker marks today, the selected day and the range. Small badges,
  the loading indicator and carousel dots keep their shape. A keyboard-focused
  tab also gets the focus ring instead of only a faint tint.
- Right-to-left pages lay out text fields, checkboxes and more on the correct
  side. The floating label, prefix and suffix icons, trailing icon button,
  character counter and the select caret's inset follow the reading
  direction, as do the checkbox mark, the date range band, the modal
  navigation rail, the snackbar container and its padding, the dialog header
  form, menu item text and the nested menu's entry slide, and the map popup's
  close button. A field's label, icons and icon clearance follow the field's
  `dir`, so an input with `dir="auto"` or its own `dir` keeps its text clear
  of the icon. Fields and the character counter read `dir`; a page that sets
  only the CSS `direction` property renders them left to right. Known issue:
  the date picker's `isRTL` option reverses the cells in script, so the range
  band points the wrong way with it on, and on an RTL page it turns the
  calendar back to left to right. On an RTL page, leave `isRTL` off.
- The modular entry now exports the option types of `CommandPalette`,
  `Confetti`, `Particles`, `Keypad`, `MessageScroller`, `RichTextEditor` and
  `MapView`, as it already did for the other components.
- The docs now cover the styled native `<meter>` on the progress page, the
  `onOpen` and `onClose` callbacks of cards and expanding cards, the
  timepicker's `dialRadius`, `outerRadius`, `innerRadius` and `tickRadius`
  options, `PaneResize.width()` and `PaneResize.setWidth()`,
  `Copy.textFor()`, and the `.overline` helper.
- A JavaScript tooltip whose trigger sits in a shadow root now starts hidden
  and absolutely positioned. The tooltip goes into that shadow root, where
  neither `body > .tooltip` nor `:not(body) > .tooltip` matched it, so it
  showed in the page flow before it was ever opened. `:host > .tooltip` now
  gets the same rule as `body > .tooltip`.
- A tap on a menu item after scrolling the menu by touch closes the menu
  again. The scroll flag was cleared only by a click, and a touch scroll
  ends without one, so the next tap was ignored as part of the scroll.
- Datepicker's previous and next month buttons have accessible names. The
  `previousMonth` and `nextMonth` i18n strings were never read; they now label
  the buttons and default to `'Previous month'` and `'Next month'`.
- A drag that starts on a bottom sheet's `.drag-handle` now moves the sheet
  wherever the handle sits. The drag check looked only for the pre-1.0
  `.handle` class.

### Removed

- **Breaking (1.0).** Most names kept for markup written before 0.8.0 are
  gone. Each one has a replacement that has been documented since 0.8.0;
  see Migration below. A few stay: `.breadcrumb` and `.breadcrumb-wrapper`,
  a bare `ul.pagination`, and checkbox `input + span`, which multiple Select
  still emits.
- **Breaking (1.0).** The remaining compatibility paths are gone too: the
  `.range` and `.range-field` slider hosts, a switch whose `.switch` class
  sits on a wrapper around the label, the `.extra` size on a common button,
  radio `input + span` and switch `input + span` / `.lever` drawing, the
  `li.tab` wrapper, a chip's `.active`, Carousel's `.flat` layout, `fullWidth`
  option and `.carousel-fixed-item`, and the `background`, `on-background`,
  `surface-variant` and `surface-tint` color roles with their `-light`/`-dark`
  pairs and utility classes.
- Selectors and code that never matched or never ran. The date and time
  picker rules no longer carry hyphenated twins of their generated parts,
  such as `.date-picker-container`; the script only ever emitted the
  unhyphenated names. The root `.date-picker` and `.time-picker` classes
  still start the components. Also gone: the `.tabbed` focus class, which
  every rule already paired with `:focus-visible`; the `.halfway-fab`,
  `.searchbar.has-sidebar` and `.prefix ~ .chips` offsets; the
  picker footer rules for buttons the script never created; and the
  normalize rules for `h1`, `b`, `strong`, `small` and `kbd`, which the
  typography rules already override.
- Datepicker's `startRange` and `endRange` options. Nothing set them, and the
  `is-startrange`, `is-endrange` and `is-inrange` classes they produced had
  no styles. Use `isDateRange` for range selection.

### Changed

- A runtime tooltip that opens while a tooltip is closing, or within 300 ms
  after that one's `exitDelay` ends, shows without waiting its
  `enterDelay`, so moving along a toolbar shows each tooltip at once. Only
  pages that set `enterDelay` above `0` see a difference. The first tooltip
  still waits its delay, and a tooltip that stays open does not shorten the
  others'. The window is fixed and has no option.
- A Chips field whose text `<input>` has a `name` now submits its chips
  under that name, one `id` each, instead of the text being typed. A page
  that read the draft text from the form should read `chips.getData()`, or
  take the `name` off the input to keep the old behavior.
- Datepicker and Timepicker follow the page's language. With a `lang` on
  the input or around it, the calendar takes that language's month and
  weekday names from `Intl` and its first day of the week where the browser
  knows it, and the clock defaults to 12- or 24-hour as that language does.
  Options the page passes still win, and the button words stay English
  unless passed. A page with no `lang` is unchanged. To keep the English
  calendar on a page with another `lang`, pass the English names in `i18n`.
  A typed date in the picker's own `format` is now read with its names, so
  the localized value it writes reads back, and `05/10/2026` in
  `dd/mm/yyyy` is 5 October rather than what `Date.parse` guessed.
- A full-screen `dialog.search-view` opens on a click, Enter or ArrowDown
  in the app bar's search field, not on focus. Tabbing through the bar used
  to open the modal each time, so every keyboard pass needed an Escape
  (WCAG 3.2.1). A docked view still opens on focus. The bar shows the
  shared focus ring while its field is focused, since its input clears its own.

- Snackbars queue. A new snackbar waits until the one on screen is dismissed,
  then shows, as Material asks, instead of replacing it at once. Migration:
  pass `replace: true` where a snackbar should still take over immediately,
  as copy buttons now do. A queued snackbar fires `expressive:open` and
  captures focus when it appears, `dismissAll()` clears the queue too, and a
  snackbar built from `snackbarId` has no `el` until it shows. A persistent
  snackbar whose container a re-render removed no longer blocks the next.

- Time picker hours step round the day: in 12-hour time, Up from 11 AM
  gives 12 PM and Down from 12 PM gives 11 AM, so AM and PM follow the
  hour.
- Radar chart gaps: a missing value breaks the outline instead of joining
  the spokes either side, as a line chart's does. With `.area`, each
  unbroken run fills as a wedge from the middle, drawn by a new
  `.radar-chart-area` path, and a value between two gaps is a dot.
- A sheet drag that moves against the dismissing direction now counts as
  a drag, so the click that ends it no longer activates a handle button.
- The time picker's hour and minute fields are spin buttons
  (`role="spinbutton"` with their range). Up and Down step them by one and
  Page Up and Page Down by five, wrapping round the dial, and the clock hand
  follows. Code that found them by the `textbox` role needs `spinbutton`.
- The `Tooltip` plugin anchors its bubble with CSS anchor positioning where
  the browser supports it: the tooltip stays beside its activator through
  page and container scrolling and flips at the viewport edge. Anchored
  tooltips fade in without sliding, and `transitionMovement` joins the gap.
  Other browsers keep the measured position.
- Menus opened from a trigger, including Select, Autocomplete, the menubar
  and the date picker's menus, anchor with CSS anchor positioning where
  supported: they follow the trigger through scrolling, flip at the viewport
  edge and scroll when taller than the room on that side. Context menus and
  `coverTrigger: true` keep the measured placement.
- The tabs indicator moves on the default spatial spring
  (`--md-comp-tabs-indicator-easing` and `-duration`), and now stops under
  reduced motion. The `Tabs` `duration` option defaults to `null`; a number
  keeps the old ease-out timing for that instance. Switch handles slide on
  the fast spatial spring (`--md-comp-switch-motion` and `-motion-duration`),
  and the chip set's border and shadow change on the fast effects spring.
- Button groups and the keypad press on the fast spatial spring tokens
  instead of the hand-sampled `$motion-fast-spatial` curve, through
  `--md-comp-button-group-motion` and `--md-comp-keypad-motion` with new
  `-motion-duration` pairs, so `motion="expressive"` reaches them. The press
  settles in 182ms instead of a 200ms window. `$motion-fast-spatial` stays
  for Sass that still names it.
- Reduced motion now reaches every component through the tokens: under
  `prefers-reduced-motion: reduce`, all `--md-sys-motion-duration-*` and
  spring `-duration` tokens are `0s`. Lists, the data table, the navigation
  bar, the mega menu, checkboxes, radios, pagination, tabs, the
  questionnaire and the lightbox had no rule of their own and animated
  before. No `!important`, so a page can opt an element back in.
- Bottom and side sheets slide in and snap back on the default spatial
  spring (`--md-comp-bottom-sheet-motion`, `--md-comp-side-sheet-motion` and
  their `-motion-duration` tokens) instead of a 280ms ease, so
  `motion="expressive"` applies to them. Each sheet now extends 24px past its
  docked edge, with matching padding, so a spring's overshoot never uncovers
  the page.
- The navigation rail expands and collapses on the default spatial spring
  (`--md-comp-nav-rail-motion` and `-motion-duration`). Its width, min-width
  and padding no longer follow `--md-comp-nav-rail-duration`, which now
  times only the indicator color.
- FAB menu actions move on the fast spatial spring and fade on the fast
  effects spring. `--md-comp-fab-menu-easing` and `-duration` now default to
  the spatial spring, and the new `--md-comp-fab-menu-effects-easing` and
  `-effects-duration` time the fade.
- Basic dialogs now animate in: they fade on the fast effects spring and grow
  from 96% on the default spatial spring (`--md-comp-basic-dialog-easing`,
  `-duration`, `-effects-easing` and `-effects-duration`). They still close
  at once. Sheets, `dialog.max` and the expanding card's dialog are
  unchanged, and reduced motion opens without moving.
- The expanding card morphs on the slow spatial spring:
  `--md-comp-expanding-card-motion-duration` and `-motion-easing` now default
  to it instead of 500ms on the standard curve. New `-content-duration`,
  `-content-easing`, `-fade-duration` and `-fade-easing` tokens time the close
  button and detail content. Close cleanup still follows the actual clip
  transition.
- Headings balance their lines and paragraphs avoid a one-word last line
  (`text-wrap-style: balance` and `pretty`). The longhand leaves wrapping
  itself alone, so `.truncate` and `.text-nowrap` still work.
- A link without a class inside a `p`, `dd`, `blockquote`, `figcaption` or
  `td` is underlined, so links in running text no longer rely on color alone
  (WCAG 1.4.1). Links with a class, and links in lists, menus and navigation,
  are unchanged.
- The documentation's category rail opens each group's pages in a side
  panel on hover or click, with each section as a dropdown. The section
  holding the current page starts open. The panel replaces the page list that
  sat beside the rail from Large up.
- Snackbar's generated close button holds its icon in a
  `<span class="material-symbols">` instead of an `<i>`. Styles that targeted
  `.snackbar i` need `.snackbar .material-symbols`.
- Swipeable tabs no longer use Carousel. The panels move into a full-width
  `.tabs-content` scroll-snap track, so touch and trackpad swipes are native
  scrolling. Only the shown panel is reachable by keyboard; the others are
  `inert`. The track re-aligns when its width changes, so a tab bar started
  in a closed dialog or sheet shows the current panel once opened. Dragging
  the panels with a mouse no longer switches tabs; click the tab instead.
- Components that read `surface-variant` now read
  `surface-container-highest`, as Material 3 maps it: the unselected switch
  track, the time picker's clock face and hour and minute inputs, the date
  picker's header rule and focused month and year field, and disabled cards.
  In dark mode those surfaces are a little darker and more neutral. Rules
  that read `background` or `on-background` now read `surface` and
  `on-surface`, which resolve to the same colors.

### Migration

- Sass: `@include z-depth("0")`, `btn-flat` and `btn-disabled` no longer emit
  `box-shadow: none !important`. A stylesheet that relied on the flag to
  cancel its own higher-specificity or inline shadow needs the flag itself.
  The `.z-depth-0` class keeps it. Because the utility layer outranks those
  resets, `.hoverable` on a text button now lifts it on hover, and a pressed
  `.filled` or `.outlined` card with `.hoverable` keeps the hover shadow.

- Icons: write `<span class="material-symbols" aria-hidden="true">`. A bare
  `<i>` is no longer treated as an icon inside buttons, lists, menus, chips,
  bars or fields, and `.material-icons` is gone; use `.material-symbols`
  (or the `-outlined`, `-rounded` and `-sharp` variants).
- Field icons: name the side with `.prefix` or `.suffix`. The positional
  `i:first-of-type` / `i:last-of-type` fallback is gone.
- Visibility helpers: replace `.hide-on-small-only` and
  `.hide-on-small-and-down` with `.hide-on-compact-only`, `.hide-on-med-only`
  with `.hide-on-medium-only`, `.hide-on-xxl-only` with
  `.hide-on-extra-large-only`, `.show-on-small` with `.show-on-compact`, and
  `.show-on-xxl` with `.show-on-extra-large`.
- Replace `.no-padding` with `.p-0` and `.center-block` with `.mx-auto` plus a
  `display: block` of your own. `.no-select` has no replacement class; set
  `user-select: none` in your own CSS.
- Progress: replace `.preloader` with `.progress.circular`.
- Date and time pickers: AutoInit starts `.date-picker` and `.time-picker`
  only. Rename `class="datepicker"` and `class="timepicker"` on the inputs.
- Search: replace `.searchbar` with `.search-bar`.
- Sheets: replace `dialog.bottom` with `dialog.bottom-sheet`, and the sheet's
  `.handle` with `.drag-handle`. Replace side sheet `dialog.right` and
  `dialog.right-sheet` with `dialog.side-sheet`, and `dialog.left` and
  `dialog.left-sheet` with `dialog.side-sheet.start`.
- Toolbar: replace host `.max` with `.docked` and host `.filled` with
  `.vibrant`. A `.filled` action and a `.max` spacer inside the bar are
  unchanged.
- Tooltip: replace `.tooltip.max` with `.tooltip.rich`.
- Menus: replace a bare `<hr>` between items with
  `<li class="divider" role="separator">`.
- File input: the trigger is a `<label class="button">` wrapping the
  `<input type="file">`. A `<button>` or `.btn` trigger is no longer styled.
- Script: replace `Expressive.Range` with `Expressive.Slider`.
- Buttons: replace `class="button extra"` on a common button with
  `class="button medium"`. Its label grows from `label-large` (14px) to
  `title-medium` (16px). `circle extra` is still the FAB. A navigation
  rail FAB is a plain `.button`.
- Radios and switches: drop the `<span>` or `.lever` after the input; the
  input draws the control and the label text sits beside it. Put `.switch`
  on the `<label>` itself: `<div class="switch"><label>` now draws a
  checkbox.
- Sliders: replace a `.range` or `.range-field` host with `.slider`, or wrap
  the input in a `<label>`.
- Tabs: put the `<a>` links directly in `nav.tabs`, without `ul` and
  `li.tab`.
- Chips: replace `.active` with `.selected`.
- Carousel: replace `.flat` or `fullWidth: true` with an M3 layout such as
  `.hero` or `.uncontained`. A `.carousel-fixed-item` child is now an
  ordinary item; position a fixed overlay in your own CSS.
- Color: replace `--md-sys-color-background` with `surface`, `on-background`
  with `on-surface`, `surface-variant` with `surface-container-highest` and
  `surface-tint` with `primary`, in variables and in the `.x` / `.x-text`
  utility classes. Overrides of the `-light`/`-dark` pairs move the same
  way.

## [0.15.0] - 2026-10-14

### Added

- The agent skill has a layout guide, `expressivecss-layout`. It covers
  Material's layout principles, the five breakpoints with their grid
  prefixes and Sass mixins, the canonical layout starting points,
  right-to-left support, and where each Material layout term lives in
  ExpressiveCSS. Its breakpoints reference lists the panes and components
  for each breakpoint and walks through Material's five questions for the
  next size: what to reveal, divide, resize, reposition or swap. Its
  canonical layouts reference covers feed, list-detail and supporting pane
  layouts, including list-detail behavior when the window crosses 840px and
  a grid fallback for supporting content that must stack on narrow windows.
  Its grids and spacing reference maps Material's 4, 8 and 12 column grids
  onto the 12-track `.row`, rulers onto containers and pane margins, and
  covers grouping, rhythm and opt-in density with 48px targets. The design
  guide's scaffold reference now lists the recommended pane count for each
  breakpoint, the 50% split-pane rule with a navigation rail, the
  three-pane limit, drag-handle toggling and persistent resizing, and the
  co-planar, floating and docked ways to show more than one pane.
- The scroll area docs show `.scroll-area` on `<html>` for a themed page
  scrollbar. A browser test covers page scrolling and theme colors.
- `.keypad` and `.keyboard` are on-screen keys that type into the text
  field named by `aria-controls`. A keypad is three columns of round keys for
  PINs, codes and dial pads; a keyboard is rows of keys sized from a column
  count, with an optional `.numbers` row of shorter digit keys that
  `hidden` drops. Keys with a `value` type at the caret and fire `input`; `data-key`
  keys handle Backspace, Enter and a one-shot Shift. Keys square their
  corners on press, and a `wide` key spans two cells. A key inside the
  field's `.field`, such as a trailing Backspace, works too. Browsers skip
  `minlength` for scripted edits, so the docs give a minimum length as
  `pattern`. `Keypad` is in `AutoInit()` and takes an `onKey` option.

### Changed

- The `expressivecss` skill is version 0.11.0. It adds the
  `expressivecss-layout` guide and component guides for keypad and keyboard.

### Fixed

- Reference tables on the docs site scroll sideways inside their own box on
  narrow windows. At 375px, 22 docs pages used to scroll the whole page
  sideways, mostly because of tables with long token names and defaults.
  Three pages still do, because their demos (the 12-column grid, the large
  icon and the extra-large split button) are wider than a phone.

- A snackbar dismissed by a swipe now slides off the side it was swiped
  toward, starting from where the pointer let go. It used to jump to the
  right at once, even after a swipe to the left, because the dismiss
  transition replaced the transform transition before it could run.
- Date picker days outside `minDate`/`maxDate`, weekends under
  `disableWeekends`, days rejected by `disableDayFn`, and the adjacent-month
  days from `showDaysInNextAndPreviousMonths` now use the M3 disabled text
  color and ignore the pointer. The rule looked for the state class on the
  day button, but the picker puts it on the cell, so these days looked
  selectable.
- A footer whose only child is a plain `<nav>` link column now gets the full
  page footer styles. When the navigation bar arrived, only the first footer
  rule was narrowed to a lone `.navigation-bar`. The grid, `.filled`, link
  and legal bar rules still skipped any footer with a lone `<nav>`. Pane
  footers use the same guard, so they keep their flex action row.
- Map markers and the column, bar and mixed chart hover layers mix
  `in oklab` like the rest of the framework. Each mix is with `transparent`,
  so the rendered colors do not change.
- The date picker's unused `.year-text` no longer sets `on-primary`, a
  leftover from the removed primary header.
- A `data-tooltip-id` that names no element now logs an error and shows the
  `data-tooltip` text. A `.tabs` bar with no links logs an error, and
  swipeable tabs whose links reach no panel act as normal tabs. Each of these
  used to throw, which stopped `AutoInit()` before the components after it.
- Reopening a date picker no longer re-reads a value it wrote itself. Without
  a custom `parse`, `Date.parse` read a `dd/mm/yyyy` value of `05/10/2026` as
  10 May and passed that to `onSelect`.
- Space and Enter reach an autocomplete's text field while the list is
  closed. The menu's trigger keys cancelled them, so a space typed after
  Escape was lost and Enter could not submit the form. ArrowUp and ArrowDown
  open the list with the current matches.
- Autocomplete fires `change` and `onAutocomplete` only when the selection
  changes, as documented, instead of after every search. `setMenuItems` no
  longer replaces `options.data`, so the documented custom `onSearch` filter
  keeps searching the full data set.
- A chart cell such as `e5` or `1e400` is a gap. These passed the number
  check but read as `NaN` or `Infinity`, so one such cell turned every point
  in the chart into `NaN` and nothing was drawn.

## [0.14.1] - 2026-10-11

### Fixed

- The capability roadmap's source links point at a commit on `master`. The
  0.14.0 links pointed at a pull request commit that the squash merge left
  off `master`, which stopped the 0.14.0 release before it reached npm. A
  test now fails when the pinned commit is not an ancestor of the checkout.
  0.14.1 contains the 0.14.0 changes below.

## [0.14.0] - 2026-10-11

### Added

- The `expressivecss-review` agent skill reviews a page, template, fragment
  or screenshot with five specialist subagents (theme and tokens, layout,
  component markup, lifecycle and accessibility, framework rules). It reuses
  the `expressivecss` guides, version resolver and `expressivecss-lint`, and
  returns one report scored out of 100 with five 20-point sections. One or two
  critical findings cap the score at 69, and three or more at 49.
- `.map` is an interactive map built on MapLibre. The page installs
  `maplibre-gl` and passes the module to `MapView.init()`; ExpressiveCSS does
  not bundle it. `.map-marker` children sit at their `data-lng-lat`, can open
  a `.map-popup` named by `aria-controls`, show a `.map-marker-label` and be
  dragged with `data-draggable`. `.map-controls` buttons zoom, reset north,
  locate the reader and go full screen. `addRoute()`, `addArcs()` and
  `addClusters()` draw data in theme colors. The default OpenFreeMap style
  follows the light or dark theme.
- `.confetti` bursts theme-colored confetti. A button with the class bursts
  from its center over the page when clicked, a `<canvas class="confetti">`
  bursts inside its own box, and `Expressive.Confetti.fire(options)` bursts
  over the page from script. Options cover the count, angle, spread, speed,
  gravity, drift, colors, shapes and size. The page canvas draws above an
  open modal dialog and lets clicks through. Nothing is drawn when the reader
  prefers reduced motion.
- `<canvas class="particles">` fills its positioned ancestor with drifting
  dots in the theme's on-surface color that lean toward the pointer. Options
  cover the count, size, color, drift and how far and how fast the dots
  follow the pointer. The canvas lets clicks through, and under reduced
  motion the dots are drawn once and stay still.

### Changed

- The docs site has a new shell. A rail holds the five catalogue groups from
  840px, with the current group's pages beside it from 1200px. Below 1200px
  the menu button opens the catalogue in a side sheet. Each page opens with a
  breadcrumb, title, description and a "View as Markdown" link, and the table
  of contents sits in a sticky column. Page content and URLs are unchanged.
- The `expressivecss` skill is version 0.10.0. It adds guides for map,
  confetti and particles. Its version resolver sizes file reads to the file
  and reports a file that grows during a read as changed.

### Fixed

- Idle components no longer listen to the whole document. Carousel attaches
  its pointer listeners while a mouse press is down, Tooltip listens for Escape
  while open, and the docked date picker listens for outside clicks while
  shown.
- Calling `Forms.Init()`, `BottomSheets.Init()` or `SideSheets.Init()` again,
  as a page that loads both the root and `/modular` entries can, no longer
  adds a second set of document listeners.
- `Menu.destroy()` no longer throws when the menu's target element is missing,
  which used to leave its listeners attached.
- `Utils.throttle` times calls with `performance.now()`, so a system clock
  change cannot hold a call back.
- More hot-path fixes:
  - ScrollSpy skips the document-wide link lookup while the same section
    stays current.
  - MapView finds its zoom buttons once, not on every `move` event.
  - PieChart reuses one percent formatter per legend instead of making one
    per row.
  - Snackbar measures its width once per swipe, not on every pointer move.
  - Slider updates once per drag frame. Its `pointermove` update also ran
    before the browser moved the value.
  - The heatmap tooltip measures its cell before writing to the page.
  - Datepicker checks each calendar row's markup once.
- Less work on hot paths:
  - Datepicker arrow keys inside the shown month move focus without
    redrawing the grid.
  - Autocomplete renders the result list once per keystroke while its menu is
    open. It used to render the previous results first, and twice more with
    `isMultiSelect`.
  - Particles stop animating and tracking the pointer while the canvas is off
    screen.
  - Carousel reads all item positions before writing parallax offsets and works
    out item sizes before setting them, so scrolling no longer forces a style
    recalculation per item.
  - Tabs throttle their window resize handling.
  - `Utils.throttle` no longer stalls when the system clock moves backwards.
- Autocomplete with `allowUnsafeHTML` highlights the typed text inside the
  label's text only. It used to insert the highlight into the HTML string, so a
  match inside an attribute value could close the attribute and turn the rest
  of the sanitized label into markup.
- Table-of-contents links are 48dp tall, the Material touch target, instead
  of 32dp. `--md-comp-toc-item-height` sets a denser height.
- In Firefox, a carousel that moved several items while its item sizes were
  still changing could slide back to an earlier item after it had settled.
  Firefox re-snapped the track to whichever item it had passed mid-move.
  Snapping is now off while the carousel scrolls to an item and comes back
  once the item is in place.

## [0.13.1] - 2026-10-08

### Fixed

- The capability roadmap's source links point at a commit on `master`. The
  0.13.0 links pointed at a pull request commit that no longer exists, which
  stopped the 0.13.0 release before it reached npm. 0.13.1 contains the
  0.13.0 changes below.

## [0.13.0] - 2026-10-08

### Added

- `.rich-text-editor` turns a `<textarea>` into a Tiptap editor with a
  docked toolbar. The page installs Tiptap and passes its `Editor` class and
  extensions to `RichTextEditor.init()`; ExpressiveCSS does not bundle it.
  A toolbar button's `data-command` names a Tiptap command and
  `data-attributes` holds its JSON argument. Buttons are disabled when their
  command cannot run, and `toggle` commands set `aria-pressed` and `.active`.
  The textarea keeps the editor's HTML, so it submits with its form, and
  names the editable textbox.
- `.marquee` scrolls a row of logos, images or text without end. Write
  the items in two `.marquee-content` groups, the second marked
  `aria-hidden="true"`. `vertical`, `reverse` and `fade` change the
  direction and edges, `paused` stops it, and hover or focus inside pauses
  it. Reduced motion stops the scroll and hides the copy. CSS only.
- `<mark>` highlights part of a text in the tertiary container colors,
  with no padding so a match inside a word keeps its spacing.
  `::highlight(mark)` paints ranges registered with the CSS Custom
  Highlight API the same way.
- `.message-scroller` scrolls a conversation. While the reader is at the
  end it follows streamed replies, and scrolling up releases it. A message
  appended with `data-scroll-anchor` starts a turn and is scrolled to the
  top, leaving 64px of the previous message in view. Messages added above
  keep the reader's place. A transcript can open at its end, its start or
  its last turn, `scrollToMessage(id)` jumps to any message, and an optional
  `.message-scroller-button` scrolls to the latest message.
- `form.questionnaire` asks one question at a time. Each `<fieldset>` is a
  question with radio, checkbox or text answers, and footer buttons marked
  `value="previous"`, `"skip"` and `"next"` move between them. The component
  adds a progress row, checks each question with the browser's validation
  (`data-required` asks for at least one checkbox), shows the question's
  `.questionnaire-error`, offers Skip on optional questions and leaves out
  disabled ones so pages can branch. The form submits normally, and without
  JavaScript every question shows at once.
- KPI component: `article.kpi` is a card for one key figure, with its
  label and value in a `<dl>`, a `.kpi-trend` chip that takes `up`, `down`
  and `negative`, an optional `.kpi-icon`, a `.kpi-actions` corner button,
  a sparkline chart, a progress bar and a `.kpi-footer`. A `negative` trend
  also turns the sparkline to the error color. CSS only.
- `.countdown` shows a whole number from 0 to 999 and rolls its digits up
  or down when `--md-comp-countdown-value` changes. The element's text is
  the value screen readers read. `--md-comp-countdown-digits` pads with
  leading zeros, and reduced motion turns the roll off. CSS only.
- `.aura` wraps one button, card or panel and runs a light around a ring
  just outside it, to mark the one thing a screen most needs the user to
  see. `dual`, `rainbow` and `glow` change the light, and tokens set its
  color, width, corners and speed. The ring is fully rounded around a
  button, stops turning under reduced motion and stays out of the
  accessibility tree.
- The agent skill gains an `expressivecss-charts` guide for building charts
  and chart dashboards. It covers choosing a chart for the question asked,
  table cells the charts can read, chart cards with stats, tokens,
  sparklines and redrawing. Its recipes cover a period switch, a KPI row,
  a donut with its total, a budget meter, a gauge, a heatmap and a
  dashboard section. The root skill routes chart work to it.
- `.mixed-chart` draws a `<figure>`'s data table as columns, lines and
  areas on one plot, chosen by each series header's class: `column`,
  `area`, or a line by default, with `dashed` lines. A series with `end`
  is drawn against a second scale, set by `data-end-min` and
  `data-end-max`, for values in other units. The tooltip, cursor points,
  legend and `sparkline` work as in the line chart.
- `.radial-chart` draws a `<figure>`'s data table as rings, one per row,
  filled clockwise from the top as a share of `data-max` (100 by default),
  with a legend, tracks, and a tooltip that follows the pointer across the
  rings or the arrow keys. `gauge` draws half circles, a `<tfoot>` row shows
  in the middle, and `sparkline` is a small chart. Ring width, gap and track
  color are tokens.
- `.heatmap-chart` draws a `<figure>`'s data table as a grid of cells shaded
  from the lowest value to the highest, with the row headers beside it, the
  column headers below and a scale naming the lowest and highest cells. A
  tooltip follows the pointer or the arrow keys from cell to cell. `values`
  writes each cell's text on it in black or white, whichever reads on the
  shade; `data-label` shortens or hides a header on the grid; `data-min` and
  `data-max` fix the scale.
- `.radar-chart` draws a `<figure>`'s data table as shapes on spokes from a
  shared middle, one spoke per row clockwise from the top and one shape per
  series, with each row's label past its spoke, a legend, and a tooltip that
  follows the pointer round the chart or the arrow keys. `area` fills the
  shapes, `points` marks each value, and `sparkline` is a small chart.
- `.pie-chart` draws a `<figure>`'s data table as slices of a whole,
  clockwise from the top, with a legend of each row's cell and share and a
  tooltip that follows the pointer round the pie or the arrow keys. `donut`
  cuts a hole and shows a `<tfoot>` total in it, `values` writes each share
  on its slice, and `sparkline` is a small pie. Further value columns show in
  the tooltip.
- `.bar-chart` draws a `<figure>`'s data table as horizontal bars from zero,
  with each row's label beside it, a legend, and a highlight band and tooltip
  that follow the pointer or the up and down arrows. The plot grows with its
  rows. `stacked`, `split`, `track`, `values` and `sparkline` vary it: `values`
  writes each cell from its bar's base, running past a short bar, and a
  stacked, split row on a track with `data-max` is a meter. It shares the column chart's runtime and markup, and
  the bars grow leftwards in a right-to-left page.
- Line, column and bar charts: a tap on a touch screen shows the tapped row
  instead of the first, keeps it when the finger lifts, and hides it when the
  page scrolls.
- `.column-chart` draws a `<figure>`'s data table as columns from zero, one
  group per row, with x labels, a legend, and a highlight band and tooltip that
  follow the pointer or the arrow keys. `stacked`, `fade`, `track` and
  `sparkline` vary it, and negative values hang below zero. It shares the line
  chart's runtime, markup and accessibility; the table stays as the text
  alternative and the no-JavaScript fallback.
- Line chart: `stacked` draws each series on the total of the ones before it
  and fills the band between them, from a zero baseline. The tooltip still
  shows each cell, and an empty cell breaks the series above it. The docs add chart card layouts with a period switch, a
  compact chart and a side sparkline.

- Message component: `.message` lays out one message in a conversation with an
  optional `.message-avatar`, `.message-header` and `.message-footer` around a
  `.message-bubble`. `end` moves a message to the sender's side,
  `.message-group` stacks consecutive messages and joins their corners, and
  `.message-bubble.outlined` holds attachments. CSS only.
- Accordion component: `.accordion` stacks native `<details>` items as joined
  tiles with a turning chevron. A shared `name` keeps one item open, and
  opening animates where the engine can transition to `auto` height. CSS only.
- Data table component: `.data-table` wraps a native `<table>` in a scrolling,
  outlined container with a sticky header row. `numeric` aligns number columns,
  `dense` shortens rows, `aria-sort` on a header draws its sort arrow, and a
  checked checkbox in the first cell selects the row. The page owns sorting.
  CSS only.
- Avatar component: `.avatar` shows a person as a circular image, initials or
  icon in `small`, default and `large` sizes. `.avatar-group` overlaps avatars
  with a surface ring. CSS only.
- Skeleton component: `.skeleton` draws placeholder boxes, `text` lines and
  `circle` shapes with a shimmer that stops under reduced motion. CSS only.
- Empty state component: `.empty-state` centers an icon or illustration, a
  heading, supporting text and an `.empty-state-actions` row. CSS only.
- Popover component: `.popover` styles a native `[popover]` panel opened by a
  `popovertarget` button and places it with CSS anchor positioning, below the
  button by default or with `top`, `start` and `end`, flipping to stay on
  screen. Use it for toggletips and small action panels. CSS only.
- Stepper component: `ol.stepper` numbers a fixed sequence of steps.
  `aria-current="step"`, `complete` and `invalid` mark each step's state, and
  the complete and invalid states are spoken through translatable tokens.
  `vertical` stacks the steps and takes a `.stepper-content` panel. CSS only.
- Drop zone component: `.drop-zone` stretches a native file input over a large
  labelled target. The Forms behavior marks a drag with `dragover` and lists
  each chosen file's name and size in `.drop-zone-files`.
- Text fields take a trailing `.icon-button.suffix` as a clickable control.
  `password-toggle` on that button shows and hides the password and reports
  its state with `aria-pressed`. `input.otp` draws one native input as a row of
  one-time code cells.
- Menu `contextMenu` option, also set by `data-context-menu` on the trigger:
  the trigger is a region, and its menu opens at the pointer on right-click,
  long-press, the menu key or Shift+F10, flipping to stay on screen.
- Timeline component: `ol.timeline` marks each event with a dot joined to the
  next by a line, or with a leading icon in a tonal circle. CSS only.
- Stat component: `dl.stats` lays out key figures as wrapping tiles, with a
  `.stat-change` line that takes `up`, `down` and `negative`. CSS only.
- Tree component: `ul.tree` nests lists of native disclosures and links with
  guide lines, turning chevrons and an `aria-current` row. It takes no tree
  role. CSS only.
- Rating component: `fieldset.rating` draws native radios as stars that fill
  up to the choice and preview on hover; `.rating[role="img"]` with
  `--md-comp-rating-value` shows a score, halves included. CSS only.
- Command palette component: `dialog.command-palette` with a search input and
  a list of link or button commands. `CommandPalette` filters by text and
  `data-keywords`, moves the active command with the arrow keys, runs it with
  Enter and opens on Ctrl+K or Command+K. `AutoInit()` starts it.
- `<kbd>` is drawn as a keycap; an outer `<kbd>` around a combination stays
  plain.
- `.line-chart` draws a `<figure>`'s data table as smooth SVG lines with x
  labels, a legend, and a cursor and tooltip that follow the pointer or the
  arrow keys. `area`, `fade`, `sparkline` and `<th class="dashed">` vary it.
  The table stays as the text alternative and the no-JavaScript fallback.
- `.scroll-area` styles native scrollbars with theme-aware colors and thin
  sizing, with a WebKit fallback and system scrollbars in forced-colors mode.
- `.shape-*` cuts images, videos, buttons, and other elements to twenty
  rounded shapes after the M3 Expressive shape library, such as
  `.shape-scallop-6`, `.shape-spark`, and `.shape-bloom-4`. Focused shapes draw
  their focus ring inside the edge. CSS only.
- Frosted glass for floating surfaces. `--expressive-glass: true` on `:root` or
  a wrapper turns it on. `--expressive-glass-blur` (default `16px`) sets the
  frost thickness, and `--expressive-glass-opacity` (default `72%`) sets how
  much of the surface color is kept. Sass `$expressive-glass`,
  `$expressive-glass-blur`, and `$expressive-glass-opacity` change the defaults,
  and `--expressive-glass: false` turns the effect off within a region. Surfaces
  turn solid when the user prefers reduced transparency or more contrast.
- The docs site opens on a landing page with a features overview, a live
  code demo and the installation guide. Ctrl+K, Command+K or the app bar's
  search button opens a search of every documentation page. Pages now carry
  a meta description and Open Graph tags, and the site publishes
  `sitemap.xml` and `robots.txt`.

### Changed

- The default theme seed is Mist Iris (`#c6a0f6`). The docs picker uses the
  same default for its initial value and Reset action. Set `--md-source` or
  Sass `$md-source` to retain an application's existing brand color.
- The agent skill workflow is version 0.9.0 and costs fewer tokens to read.
  Sub-skill scope now lives only in each frontmatter description, without
  repeated "When to use" sections. Generated component guides no
  longer repeat the page description or the generic rule and documentation
  notes, and the theming, usage, dashboard and charts guides link to the
  reference that owns a rule instead of restating it. Each sub-skill says when
  to read each reference, long references open with a contents list, and the
  design guide links its dated component reviews directly. A new delegation
  reference explains how to split a large audit across subagents and merge
  their findings. The install and runtime guides end with checklists, and the
  charts guide asks for honest scales and labelled sample data. Component
  guides drop the source list and the two notes every guide repeated; the
  root skill states the rule-ID convention once and tells agents to treat
  page content and tool output as evidence, not instructions. Performance
  measurement moved from the design guide into its own reference.

### Fixed

- A checkbox label written as `<input type="checkbox"><span>…</span>` keeps
  links and other inline elements in its text. The span was a flex box, so
  each text run and link became a separate item: the spaces around a link
  disappeared and the words split into columns. It now lays out as inline
  text, and one line still sits centered in the 48px target.
- A focused line, column, bar or pie chart no longer cancels Escape when its
  tooltip is already hidden, so a dialog or sheet around the chart can close.
  Pressing a chart's plot away from its marks focuses it without showing the
  first row's tooltip; keyboard focus still shows it.
- A drawn chart's hidden data table no longer makes a narrow tile or its page
  scroll. The table keeps a fixed 1px layout, as the heatmap's already did,
  and hangs up from the figure's bottom edge, so its rows cannot add overflow
  below it.
- The line chart docs' chart cards pad their stat and chart off the card's
  border.

## [0.12.0] - 2026-10-01

### Added

- Utility classes for shrinking flex and grid children, scrolling or clipping
  overflow, logical inline spacing and text alignment, and text wrapping.
  Physical spacing and alignment classes retain their existing behavior.
- `.visually-hidden-focusable` hides skip links and other content until the
  element or a descendant receives focus. Use it independently of `.visually-hidden`.

### Fixed

- Spacing output and documentation omit padding-auto classes, since CSS does
  not accept `auto` for padding. Margin-auto helpers remain available.
- Carousel preserves an active mouse drag when delayed resize work completes.
- Snackbar ignores flick velocity after a pause of 100ms or more before release;
  dragging past the distance threshold still dismisses it.
- Tooltip supports `open()` in its public TypeScript declarations and honors
  `open(true)` without requiring hover or focus.
- NavigationRail leaves Escape to a nested component that already handled it.
  Its own Escape collapse restores focus to the rail toggle while preserving
  outside focus and focus moved by close callbacks.
- Menu respects `closeOnClick` inside open and closed shadow roots, preserving
  submenu navigation, outside dismissal, and touch scrolling.
- Multiple FormSelect options with the same value can be selected and
  deselected independently, matching their native option state.
- Chips supports programmatic addition without an editable input and accepts
  numeric ID `0` during initialization and addition. An empty autocomplete menu
  does not prevent adding a custom chip.
- Autocomplete keeps its open state synchronized with its Menu, accepts
  preselected IDs before data loads, and bubbles selection changes to form
  listeners. Chips lets an open suggestion menu handle Enter.
- Timepicker reloads edited host values when opened and cancels obsolete clock
  updates, so delayed transitions cannot overwrite newer edits or update a
  destroyed instance.
- Datepicker honors custom parsers during initialization and reopening, rejects
  reversed range edits through every input path, and preserves an empty
  single-date selection after clearing.
- Each Datepicker range input emits its own change event. Generated date inputs
  opt out of AutoInit so repeated initialization cannot create duplicate pickers.
- Component `init()` methods return an empty array for empty element collections,
  matching their TypeScript return types.
- Datepicker can reopen a range when only its end date is set. Clearing
  either endpoint preserves the other and removes incomplete range shading.
- A cancelled Snackbar swipe cannot carry its velocity into the next gesture.
- Bottom and side sheets recognize a recent flick when the release coordinates
  match the last pointer move, while paused or reversed short drags stay open.
- Carousel preserves ordinary button and link clicks inside slides while keeping
  mouse dragging available, including in swipeable tab panels.
- Chips autocomplete preserves the query while filtering and clears it after
  an item is selected.
- Destroying a Timepicker cancels pending automatic submission, so an old
  instance cannot overwrite a replacement input value.
- Datepicker and Timepicker confirmation buttons invoke their callbacks once
  per Enter press. Both TypeScript option interfaces accept `autoSubmit: false`.
- Closing a Menu preserves focus on an outside input or another control.
- Docked Datepicker and Timepicker popovers account for their positioning
  parent, including `.field` wrappers and scrolled containers.
- Destroying Chips also destroys its owned Autocomplete and Menu.
- Tooltip teardown restores authored rich content and preserves existing
  description associations, allowing the same content to be initialized again.
- Snackbars can reuse an element supplied through `snackbarId` without deleting
  it or retaining callbacks and controls from an earlier instance.
- A vertical touch swipe that starts on a carousel scrolls the page again, and
  pinch-zoom works over it. The carousel tracks no longer restrict
  `touch-action`.
- In Firefox the top app bar is `surface` at rest instead of
  `surface-container`. The scroll fill now runs only where `animation-timeline`
  is supported.
- `.slider.stops` draws its dots. Each dot sits at a step position on the
  active track, including centered and right-to-left sliders. Vertical and
  two-handle sliders show no dots.
- In Firefox an indeterminate `<progress class="progress">` shows its track and
  a moving 40% bar, which stays still under reduced motion.
- In Firefox a date input with a Datepicker shows its value. The formatted
  overlay only applies in engines that render it.
- Mouse drag moves the carousel track again in the horizontal full-screen
  layout and in `.uncontained.snap`. Snapping used to pull the track back on
  every move.
- Editing or clearing a Datepicker `<input type="date">` with the keyboard
  updates the formatted date painted over the field in Chrome and Safari.
  After the field lost focus it used to show the previous date.
- Clicking a Datepicker date input no longer opens the browser's date picker on
  top of a visible Datepicker calendar (`openByDefault` or `container`). When
  the calendar is hidden, the default, the browser picker still opens.
- Leading `.prefix` and trailing `.suffix` icons stay visible on a Datepicker
  date input in Chrome and Safari. The input's filled background used to cover
  them.
- `.slider.stops` puts each dot at `min` plus a whole number of steps, so a
  `step` that does not divide the range no longer spreads the dots over the
  whole track. With no `step`, `step="any"`, or a zero or negative step, the
  slider shows no dots. Dots follow the range input's direction and leave the
  inset icon uncovered.
- `Slider.destroy()` removes the custom properties it set on the input and its
  host, so stop dots and the track fill no longer stay painted. Inline values
  set before init come back.
- A `<header>` that holds only a `nav.tabs` is no longer styled as a top app
  bar, so it no longer sticks to the top of the page or takes the app bar fill.
- Medium and large app bars no longer send the page back to the top when they
  collapse. A short or slow scroll near the top used to snap back and leave the
  bar switching between sizes. The bar now collapses once the page has
  scrolled by the height it gives up, and expands when the page returns to the
  top of the bar.

### Changed

- The ExpressiveCSS skill bundles the starter page and the five layout
  templates under `assets/templates/`, and the Install and Design guides point
  to them. The Install guide gives a plain `npm install` command, and its
  minimum page no longer puts the page heading in an app bar without
  destinations.
- Skill guides put their steps under their own headings instead of under
  "Do not use when". The framework contribution path moved to
  `references/contributing.md`.
- Component guides list the API reference subsections they leave out. Their
  examples use real link targets, and menu actions are buttons. The Buttons
  reference calls `circle` a round common button and points icon buttons to
  `.icon-button`.
- Documentation examples no longer use `href="#!"` in copyable code. Menu,
  split-button, app-bar and tooltip actions are `<button type="button">`,
  and code samples link to realistic paths. Live navigation demos on the docs
  site keep `#!`. The app-bar Search icon is a button. The API reference drops
  rendered demo text that had been copied into it, and the Lightbox guide
  includes its options and methods.
- The footer partial no longer carries sticky-footer rules. Their nested
  `:has()` selector was invalid, so browsers had always dropped them. The
  Footer page now gives the two rules to add yourself, as the API reference
  already did.
- The Auto Init page and the API reference list every component `AutoInit()`
  starts. They add AppBar and ExpandingCard, give Cards its real selector, and
  list both picker spellings, `.datepicker, .date-picker` and
  `.timepicker, .time-picker`. Both name all eight
  behaviors the bundle starts on import, including Dialogs, BottomSheets and
  SideSheets, and call the range control Slider instead of Range.
- Documentation code samples match their demos and the current framework. The
  Date picker and Time picker samples select `.date-picker` and `.time-picker`,
  the Slider samples and the M3 guidelines use `Expressive.Slider`, and card
  samples drop the unstyled `supporting-text` class. The Grid, circular image,
  character counter, snackbar dismiss and full-screen dialog samples now match
  the demos next to them. The Scrollspy sample uses the canonical
  `hide-on-compact-only` instead of the legacy `hide-on-small-only` alias.
- Documentation no longer describes removed classes or markup. Typography
  names `body-large`, `body-medium` and `body-small`, and Select describes the
  `.field` wrapper the plugin reuses or creates instead of `.select-wrapper`.
  Tabs no longer mentions `tabs-horizontal`, and Tooltips no longer says the
  plugin adds `.material-tooltip`. Grid offsets use the Compact through
  Extra-large breakpoint names.
- Getting started lists `fonts/` and `modular.mjs` in the `dist/` tree and
  the minified files in the project tree. Its README link opens the "Reduce
  page downloads" section.
- On the docs site, the Start navigation item opens the landing page again.
  Slider demos keep their stop dots, and carousel demo links no longer point
  at anchors that do not exist.

## [0.11.0] - 2026-09-30

### Added

- `.visually-hidden` hides an element from sight and keeps it in the
  accessibility tree, so screen readers still announce it. It exposes the
  existing `visually-hidden` mixin, which now also clears the border and takes
  an `$important` flag for the utility. The filter chip's checkbox uses the
  mixin instead of its own copy.
- `fieldset.plain` groups radios or checkboxes inside a surface that already
  frames them. It has no outline, fill, padding, or margin from a preceding
  fieldset, and its legend starts flush with the content.
- The docs ship a downloadable starter page (`docs/public/starter.html`) and five
  copyable responsive layouts: compact, navigation rail, expanded rail,
  list-detail and dashboard.

### Changed

- Common buttons (`button`, `a.button`, `label.button`, every size and style)
  reflow a label that does not fit. The label wraps between words, the button
  grows from its size's container height, which is now a minimum, and it never
  grows wider than its parent. A label that fits renders at the same size as
  before; 4dp of block padding keeps wrapped lines off the edges. Circle
  buttons, FABs, extended FABs, the chip delete button, carousel dots, Timepicker
  AM/PM controls, and buttons in button groups, split buttons, toolbars, top app
  bars, dialog and
  sheet headers, navigation bars and rails, tabs, pagination and snackbars keep
  one line at a fixed height. The file input trigger grows from its 48dp
  minimum the same way. Dialog action rows drop their own copy of this rule.
- Chips add 4dp of block padding, so a wrapped label no longer touches the
  chip's edges. A chip that fits on one line keeps its 32dp height.
- Every top app bar is pinned to the top of the page with `position: sticky`.
  It no longer needs the `fixed` class.

### Migration

- A common button's container height is now a `min-height`. A rule that gives
  a button a smaller `height` must also set `min-height`, or set
  `--md-comp-filled-button-container-height` instead.
- Remove `fixed` from top app bar headers; it has no effect. To let a bar
  scroll away with the page, set `position: static` on its `<header>`.

### Fixed

- ScrollSpy honors per-section offsets and active classes, isolates tables of
  contents through shared `getActiveElement` callbacks, and restores authored
  offset styles on teardown. Native anchor navigation remains unchanged.

- Carousel ignores stale scroll-completion events from earlier navigation, so
  selecting a swipeable tab immediately after initialization keeps that selection.

- FormSelect preserves every associated label when enhanced, including naming
  order, label activation and authored naming overrides. Teardown restores label
  attributes and removes generated label IDs.

- FormSelect hides the native control from assistive technology, leaving one
  named combobox. Required and custom validation errors appear beside the visible
  field; the native select retains form values and validation rules. Static
  validity checks preserve focus, and interactive validation forwards native
  focus to the visible field, including in forms with mixed native controls.

- Tabs resolves panel IDs directly, so numeric IDs and IDs containing dots,
  colons or brackets work in normal and swipeable modes without selector errors
  or accidental matches against other elements.

- Autocomplete searches on input events, including paste, replacement and deletion
  without key events. Keyboard typing does not repeat the search on keyup.

- FormSelect restores the authored label and node order during teardown and
  reinitialization, including when it creates the field wrapper.

- Datepicker treats `YYYY-MM-DD` input as a local calendar date during
  initialization, editing and reopening, so dates no longer shift backward in
  timezones west of UTC. Impossible dates such as `2023-02-29` are rejected.

## [0.10.1] - 2026-09-22

### Added

- Flex helpers: `.flex`, `.inline-flex`, `.flex-column`, `.flex-wrap`,
  `.justify-start|center|end|between`, `.align-start|center|end|stretch`,
  `.flex-1`, `.flex-none`, and `.gap-0` to `.gap-6` on the spacing scale. One
  declaration per class, in the utilities layer; the helpers page, `llm.md`,
  and the skill's helper reference document them.

### Changed

- **Offline design context for the ExpressiveCSS skill.** The generator now
  copies the hard rules, window-size tables, component chooser, screen recipes,
  anatomy cheat sheet, and retired name map from `m3-guidelines.md` into
  `skills/expressivecss/references/design-rules.md`, and the root, Design,
  Usage, and Install guides route to it. JavaScript component guides inline the
  options table and method names from `llm.md`. The Install guide carries a
  complete page skeleton. The Design guide states the framework spacing scale
  and control-text rules. Six catalogue entries that repeated their page tagline
  as the selection rule now say when to use the component.

- The ExpressiveCSS skill tells agents without an MCP client to run
  `expressivecss-lint` from `@expressivecss/mcp-server` on the markup files they
  touched before finishing.

## [0.10.0] - 2026-09-18

### Fixed

- Connected button groups preserve equal-width items when translated labels
  exceed the available width. The group expands inside an overflow container
  instead of letting labels overlap adjacent controls.

- Bottom and floating sheets keep long bodies scrollable and action rows reachable
  at compact widths with enlarged text. Shared dialog headings and action labels
  wrap instead of overflowing their inset container without resizing icon buttons
  or FABs.

- Datepicker initializes multiple-date defaults safely, keeps generated inputs
  synchronized when selections shrink or grow, and preserves the original input
  when cleared. Range-end inputs supplied by applications receive input and
  keyboard handlers. Teardown removes generated fields and their listeners.

- Timepicker digital fields synchronize native input events, including paste,
  without depending on keyup. Invalid edits restore the last valid value on blur;
  empty fields display the same fallback values they submit. Twelve-hour defaults
  handle midnight, noon, 24-hour input strings and lowercase AM/PM consistently.

- Lightbox cancels interrupted transitions, honors mounted reduced-motion changes,
  preserves teardown focus and releases shared ancestor overflow after the last
  open instance closes. Canceled transitions no longer report completion.
  Overlay dismissal stays closed inside button triggers, and shadow-root teardown
  respects focus moved outside the root by application handlers.

- Enhanced selects synchronize native form resets, selection semantics and
  refreshed disabled states. Disabled optgroups cannot be selected, and refresh
  preserves focus on a surviving option in an open menu and rebinds reset handling
  after form-owner changes.

- Pane layouts use the nearest ancestor query-container width, with viewport
  fallback, for columns, compact visibility, margins and dividers. Long footer
  actions wrap without changing application-owned pane selection or icon-button sizes.

- App-bar search dialogs stay closed during native focus restoration and reopen
  on a fresh focus or click. Teardown removes the search activation listeners.

- Tabs keep swipe selection, `aria-current`, and the `onShow` panel synchronized
  without duplicate callbacks. Swipeable teardown restores panel positions and
  owned state; initialization above `responsiveThreshold` uses ordinary panels.
  Initial hash selection takes precedence over stale authored panel state.

- Side sheets mirror dragging, entry motion and modal corners in RTL while
  preserving logical start/end aliases. Long headings and action rows wrap.
  Side and bottom sheets ignore secondary-pointer cancellation and clear drag
  state when closed, removed, or interrupted by another primary press, including
  close/reopen and remove/reattach sequences within one JavaScript task.

- Carousel mirrors horizontal navigation and scroll placement in RTL, leaves
  editable keys alone, and keeps auto-advance suspended during internal focus
  moves. Mounted reduced-motion changes preserve explicit pause and stop
  in-flight smooth scrolling. Native gestures cancel deferred recentering. Teardown
  cancels scroll-completion timers and listeners. The docs demonstrate an
  application-owned pause/resume button using the existing methods.

- Slider labels and track gaps account for native handle travel in LTR, RTL and
  vertical layouts. Paired inputs accept native track clicks and their vertical
  track resizes with the inputs. Application input events update values without
  dragging, and forced-colors tracks use system colors.

- Chips delete the focused token with Backspace/Delete and recover focus without
  overriding deletion callbacks. Destroying one instance preserves other instances'
  keyboard handlers. Input chips no longer inherit floating-label positioning;
  long labels wrap without shrinking their delete controls.

- Closing menus immediately exclude their content from keyboard focus and
  preserve focus moved by close callbacks. Nested keyboard navigation and
  typeahead stay in their active menu; RTL flyouts mirror their keys and avoid
  either viewport edge. Returning focus to a parent no longer reopens a flyout.

- Native and custom progress indicators use system colors in forced-colors mode.
  Empty linear tracks remain outlined, circular values retain a visible track,
  and the legacy preloader stops rotating under reduced motion.

- Custom linear progress fills and indeterminate motion follow the inherited
  text direction, including RTL and nested direction overrides. Reduced-motion
  static fills use the same starting edge.

- Autocomplete exposes localized loading, result and multi-selection updates
  through a polite live region. Teardown removes owned status elements and Menu
  listeners, and late results after destruction are ignored.

- Date picker calendars support a single Tab stop, arrow keys, Home/End,
  PageUp/PageDown and Shift for year navigation. Redraws preserve calendar focus,
  and disabled days expose their unavailable state without allowing selection.

- Time picker hour/minute inputs have localized accessible names. Native AM/PM
  buttons expose selected state and support Enter and Space without submitting
  forms. Docked opening focuses the visible hour input; 24-hour entry accepts 00.

### Migration

- Snackbars with `action` now default to `displayLength: Infinity` and
  `dismissible: true`. Explicit options still override these defaults. Custom
  template controls need these options explicitly. Timed feedback needs an
  equivalent persistent message in the application.

- Replace `circle extra small` with `circle extra` for the 56dp FAB.
  Extended FABs require an explicit size: replace sizeless `extend` with
  `extend small`, or choose `extend medium` or `extend large`.
  Use primary, secondary or tertiary container colors instead of surface-colored
  FABs. General surface utilities remain available for other components.

- Replace FAB speed-dial wrappers `.fab` and `.fixed-action-btn` with
  `.fab-menu` and labelled actions. Remove `direction`, `hoverEnabled`,
  `toolbarEnabled` and their markup switches. Use a toolbar for persistent
  commands instead of FAB-to-toolbar expansion.

- Replace banners with native inline messages for persistent nonblocking issues,
  snackbars for temporary feedback, or dialogs for blocking decisions.
  Remove banner classes, tokens and custom Sass imports. The existing
  `/banners.html` route now explains the migration.

- Replace `.floating-sheet` with a dialog for blocking work, a bottom sheet on
  compact layouts, or a side sheet for optional content on wider layouts.

- Replace `.bottom-app-bar` with `.toolbar.docked` or `.toolbar.fixed`. Place an
  adjacent FAB in `.toolbar-group` when the layout needs one.
- Replace `.navigation-drawer`, `.sidenav`, `NavigationDrawer`, and `Sidenav`
  with `NavigationRail`. Use a navigation bar on compact layouts when the same
  hierarchy fits; use a native full-screen dialog for a larger compact menu.
- Replace `.segmented-button` with `.button-group.connected`. Keep native radio
  or checkbox inputs when form submission is required, and synchronize button
  state with those inputs in application code.

### Changed

- Escape dismisses a focused snackbar without closing its parent dialog.
  Dismissal and replacement recover focus when it remains inside the snackbar;
  closing controls are inert, and application-directed focus is preserved.

- The documentation shell now uses a five-category rail with a page list on
  wide layouts and a native full-screen navigation dialog on compact layouts.
  Removed component URLs redirect to their replacement documentation.

### Removed

- The 40dp small FAB and baseline sizeless extended FAB styling. Current small
  extended FABs, medium/large FABs and FAB menus remain supported.

- FAB speed-dial styling, hover/directional layouts, toolbar expansion, and
  legacy AutoInit selectors. The `FloatingActionButton` API now serves FAB menus.

- Banner Sass, component semantics, generated component guides and variant tests.

- Floating sheet Sass, documentation, semantics, generated guides and tests.

- Bottom app bar Sass, navigation drawer Sass and runtime APIs, segmented
  button Sass, their documentation pages, semantics, generated guides, and
  component-specific tests.

## [0.9.1] - 2026-09-08

Includes the fixes from [#140](https://github.com/BaezFJ/ExpressiveCSS/pull/140).

### Migration from 0.9.0

Custom Datepicker row renderers must return calendar rows, cells, and day buttons
with supported attributes. Use `renderDay` to generate cells and set
`type="button"` on custom day buttons. Unsupported HTML now throws `TypeError`.

### Fixed

- Validate enhanced-select icon URLs and encode calendar identifiers and day values.
- Restrict Datepicker's low-level row renderers to calendar rows, cells, and day buttons. Custom renderers must use supported attributes and `type="button"`; unsupported HTML now throws `TypeError`.
- Preserve special characters in generated semantics tables and correct the documentation-script and floating-sheet test patterns.

## [0.9.0] - 2026-09-08

### Migration from 0.8.0

- Replace card-reveal `.activator` headings and separate close controls with a
  native `<button type="button" class="card-reveal-trigger" aria-controls="details">`.
  Its closest card must contain exactly one direct reveal panel with the matching
  `id="details"`. Use unique IDs for each card and give every trigger an accessible
  name. The runtime owns `aria-expanded`; legacy triggers no longer toggle panels.
- Use `<div class="actions">` for card command groups instead of `<nav>`.
- Review layouts that depend on medium or large app-bar heights and typography;
  their flexible-bar sizes now follow the mappings listed below.
- Include `dist/fonts/` beside `dist/css/` when copying the compiled distribution.
  Sass consumers that load their own fonts can set `$expressive-include-fonts: false`.

### Added

- Community contribution and security policies, required CI, independently versioned MCP releases, and stable-release documentation deployment. Tracks [#134](https://github.com/BaezFJ/ExpressiveCSS/issues/134).
- **Self-hosted fonts.** The compiled stylesheet ships `@font-face` rules and `dist/fonts/` holds the woff2 files the tokens name: variable Material Symbols (outlined, rounded, sharp), Latin Roboto 400/500, and Latin Noto Sans 400/500. Keep `dist/fonts/` next to `dist/css/`. Sass consumers can set `$expressive-font-path` or `$expressive-include-fonts: false`.
- **M3 Expressive Button Groups.** Standard groups now redistribute a pressed item's 15% width growth from adjacent items; connected groups support native-button single and multiple selection through `data-selection` and `aria-pressed`. All five sizes support common and icon buttons, explicit child-size overrides, fast-spatial shape motion, 48dp minimum targets, selected color/shape/icon cues, and optional required selection.
- **M3 Expressive app bar.** `.medium` and `.large` are the flexible bars: 112dp / `headline-medium` and 120dp / `display-small`. A subtitle is `<hgroup>` plus a `<p>` (136dp / 152dp). Titles wrap to two lines. `center` works on all three sizes. The search app bar is a `<search class="search-bar">` in the header. `AppBar` collapses the flexible bars on scroll and opens the related search view when the search field is selected.
- **ExpressiveCSS design and review skill.** The workflow now uses explicit Implement, Refine, Redesign, Critique, and Audit modes; turns product and brand decisions into Material 3 Expressive components and tokens; covers every reachable state and relevant localization or offline behavior; and closes with responsive browser evidence, an independent finish review when delegation is available, and a non-numeric review matrix with pass, intentional-adaptation, fail, and not-applicable outcomes.
- **Deterministic skill review evidence.** Critique, Audit, and component-contract checks now use stable criterion IDs, falsifiable claims, criterion-owned evidence rules, a fixture-owned state and responsive-boundary ledger, explicit `Blocked` handling, and exact matched captures collected before Refine or Redesign edits.
- **Versioned skill contracts and component decisions.** Generated guides now carry framework version, stable component-rule IDs, and source-hash provenance across every contract input. A portable resolver requires a direct dependency, selects one active lockfile, records structured conflicts, and fails closed on ambiguous, malformed, symbolic-linked, or unreadable npm, pnpm, or Yarn metadata. Contract equality follows SemVer precedence, so build metadata does not create a false mismatch. One structured catalogue owns guide extraction and selection guidance for all 46 components.
- **Behavioral skill evaluations.** Root-only replay cases count exact-path guide reads from tool traces and fail closed on missing, duplicate, unknown, or unevaluated critical invariant IDs. Mutation cases verify no-edit modes, required reads, evidence and event order, fixture-owned states, matched captures, older-version handling, token-based branding, dynamic ARIA, runtime ownership, and scoped MCP claims. Root-skill, case, and replay reads are descriptor-bounded; nested keys and values are capped; matched-capture chronology is bound to the first trusted edit. The runner rejects executable regular-expression assertions. Reports and adapter failures redact credential-shaped keys and values, authorization headers, credential-bearing URLs, and local paths before storage or display.
- **Bounded MCP evidence.** MCP setup, rule, syntax, and quality steps work independently and report checks performed, evidence sources, inspected and uninspected files, unchecked areas, coverage, blocked checks, and contract compatibility. Static checks detect retired markup, duplicate initialization, missing teardown evidence tied to the initialized variable, raw authored colors, and semantics violations. MCP guide content comes only from its synchronized package data and is checked against the bundled contract; local framework-source contracts affect source provenance but cannot replace package guidance or diverge from its version and source hash. Installed and locked versions outside their direct manifest range are blocked. Missing inputs, failed commands, timeouts, stale or divergent provenance, unresolved contracts, aggregate file limits, and partial static scans block instead of producing a broad pass. Command execution requires an operator allowlist, uses a credential-free environment, and has bounded input and runtime limits. A command timeout still force-kills the process group after SIGTERM.

### Fixed

- Menu cancels superseded transition and deferred event callbacks on reversal and destruction, preserving visibility, focus and end-callback ownership.
- Menu installs keyboard handlers before moving initial focus, so Escape works immediately after a zero-duration opening.
- Filled enhanced selects reserve label space so enlarged and multiline RTL/LTR labels do not overlap the selected value.

- Scale transitions now honor reduced-motion preferences, including changes during motion.
- Expanding-card close cleanup follows the CSS container transition instead of a fixed timer. Reopening, cancellation, native close, and teardown cannot leave stale cleanup closing a new dialog or moving focus.

- Tooltip teardown now cancels pending entry, exit, and animation callbacks.
- FormSelect retains ownership of its generated Menu during repeated AutoInit, preventing a retained Menu registry entry.

- **Card reveal accessibility.** Reveal panels now use a native `.card-reveal-trigger` button with a verified `aria-controls` relationship, runtime-owned `aria-expanded`, `inert` closed content, Escape handling, and focus return. AutoInit skips incomplete or disabled-only disclosures, and explicit initialization no longer hides a panel when it lacks a usable enabled `type="button"` trigger or exactly one identified direct panel. Closed-panel CSS is activated only after successful runtime setup, so rejected disclosures remain visible without JavaScript-managed state. This is a markup change: legacy `.activator` headings and separate heading-based close controls no longer toggle the panel.
- **App bar search dialog.** Closing a full-screen search view no longer reopens it when focus returns to the field.
- **Badge hosts.** Sibling badges on the stacked navigation bar and collapsed rail use logical inset and flip in RTL. Tabs nest a badge in the destination icon.
- **Card action semantics.** Material 3 card anatomy now uses `<div class="actions">` for command buttons instead of creating a false `<nav>` landmark.
- **Card layout and state parity.** Elevated, filled, and outlined cards now keep their Material variant elevations through hover, press, drag, and disabled states; dragged and picked-up elevation plus the 16% state layer take precedence over retained hover or active pointer state. Horizontal cards, including directly actionable cards and fixed-size helpers, keep intrinsic or specified heights when expanded and stack below 600px with fixed heights reset to content. Reveal content is no longer capped in browsers without intrinsic-size interpolation.
- **Nested card disclosure isolation.** Reveal triggers and Escape handling now belong to their closest card, so nested cards—including a complete card inside an outer reveal panel—retain their own disclosure ownership and cannot initialize, open, or close the outer card.

## [0.8.0] - 2026-08-27

Completes the HTML semantics sweep. Component markup is corrected so that
the element states what a component is, with the ARIA that element choice
implies. Scope is deliberately bounded: keyboard interaction, focus management
and colour contrast are **not** part of it.

The sweep is breaking, and lands in 0.8.0. Legacy markup covered by the
semantics sweep keeps rendering — nothing warns at runtime — so each
**Migration** entry below is the whole story for that component.

### Added

- **Split button** (`div.split-button`, the five button sizes), one of M3
  Expressive's headline components. One action the user will take most of the
  time, next to a menu of the ones they might take instead: a leading button
  and a trailing `.menu-trigger`, 2dp apart, round on the outside, square-ish
  on the seam between them.

  M3 states this as **five token families**
  (`md.comp.split-button.{xsmall…xlarge}`, DSP 34.0.21). They collapse to one
  family here the way the button's own ladder does - the size class rewrites
  the tokens and the two halves map them onto the button tokens once. The
  height, the leading half's outer inset and the outline width are the button
  ladder's own, so they are not restated; `between-space` is 2dp in all five
  families, so it is written once.

  **There is no new script.** The trailing half *is* a Menu trigger, so
  `AutoInit()` starts it, `data-target` names the surface, and Menu's keyboard
  model is unchanged. `aria-expanded` is Menu's to write (SEMANTICS rule 1),
  which is what lets the expanded shape - the chevron turned over, the seam
  swollen to fully round - be drawn from a selector alone. Never author it: the
  shape is drawn from the attribute, so an authored `"true"` draws an open split
  button over a closed menu.

  **The halves are matched with `:where()`, not `:is()`.** `:is()` takes the
  specificity of its heaviest argument, and `a.button` put the hover morph one
  class above the expanded rule - so hovering an open split button collapsed the
  seam Material says stays round for as long as the menu is up.

  The container declares no role. `toolbar` is *rejected* rather than withheld:
  the two halves are independent commands reached with Tab, so there is no
  arrow-key model to write. The one composite widget here is the `<menu>`, and
  Menu owns its contract.

- **Button groups** (`div.button-group`, `.connected`, the five button sizes),
  one of M3 Expressive's headline components. A row of
  related buttons that reads as one control without becoming one: standard
  keeps each item's round shape and closes the gap as the buttons grow
  (18/12/8/8/8dp), connected sits every item 2dp apart with round ends and
  squared joins that square one step further while pressed.

  M3 states this as **ten token families** (`md.comp.button-group.{standard,
  connected}.{xsmall…xlarge}`, DSP 34.0.21). They collapse to one family here
  the way the button's own ladder does — the size class rewrites the tokens, and
  only the numbers that actually differ (the standard gap, the connected corners
  at `large` and `xlarge`) are named twice.

  **The size goes on the group, not on every button.** A group sets the button
  tokens its items inherit, so `<div class="button-group medium">` sizes the row;
  an item carrying its own size class still wins for itself. That is what moved
  the size ladder out of `components/_buttons.scss` and into
  `abstracts/_variables.scss` as `$button-sizes`, with `button-size()` beside the
  other mixins: two partials read the table now, and a partial may not `@use`
  another partial. No class, token or value changed.

  **An icon-only item is `<button class="button circle">`, not an
  `.icon-button`.** That component sets its own size ladder, insets and pressed
  shape on the element itself, so a group can neither size it by handing its
  items tokens nor reshape it without fighting the morph it already draws. A
  `.circle` grows by its width on press, where a label item grows by its
  insets - padding inside a stated width would squeeze the icon rather than
  widen the button.

  **The item contract is enforced, not just documented.** A group item is a
  `<button>` or an `<a class="button" href>` - a bare `<a href>` passes for a
  control and renders as a link, reaching none of the group's shape or sizing -
  and an `.icon-button` is refused outright. Both are `semantics.json` rules, so
  markup that would render wrong fails the suite rather than the eye.

  **No selection, deliberately.** M3's connected group draws a selected state,
  and holding one takes a control that remembers the answer — which is
  `.segmented-button`, a `<fieldset>` of radios or checkboxes. A row of
  `<button>`s has nothing to read it off, so the selected shape is the segmented
  button's and the group stays a set of commands.

  **No composite role, and it is rejected rather than withheld.** Toolbar's
  `toolbar` waits on a keyboard model somebody still has to write; a button
  group is not a composite widget at all — its items are independent commands
  reached with Tab. A group that needs a name takes `role="group"` with an
  `aria-label`, which promises no keyboard contract.

  The press-time growth of a standard group's item is M3's 15%, taken from the
  item's height rather than its width and with the items beside it sliding
  rather than compressing: compression needs each item's measured width, which
  is script. The token holds the figure as a ratio because CSS cannot multiply
  a length by a percentage.

- **Scrim** (`--md-comp-scrim-color`), the wash a modal surface paints behind
  itself, defined once. The dialog, the navigation drawer and the navigation
  rail were each mixing `scrim` at 32% themselves — four rules across three
  partials, none of which knew about the others. All four now read the token.

  Both sheets are consumers but needed no edit: they never had a value of their
  own, taking the modal wash from the `dialog::backdrop` rule they already
  share and only suppressing it for the standard variant.

  A **foundation**, not a component: there is no markup an author writes to get
  one, so `semantics.json` carries it with `kind: "foundation"` and no rules,
  the way `transitions` is carried. Its consumers already own the rows for the
  markup that ends up wearing it.

  It is declared on `:root, :host` rather than per surface because four of the
  five consumers paint into `::backdrop`, which has no box of its own to hang a
  token on — only the rail uses a `::before`. `::backdrop` inherits from the
  element it belongs to, so setting `--md-comp-scrim-color` on one `<dialog>`
  dims just that one, and setting it on the root rethemes every scrim on the
  page. `:host` is there for the reason `tokens/_theme.scss` and
  `tokens/_state.scss` carry it: a sheet loaded inside a shadow root cannot
  reach its own host with `:root`, and an undefined token would take
  `background-color` down with it and leave the surface with no scrim at all.

  **One thing narrows, deliberately.** The mix resolves at `:root`, so
  `--md-sys-color-scrim` is substituted there and overriding *that* token on a
  subtree no longer reaches a scrim below it. Override it at the root to move
  every scrim, or set `--md-comp-scrim-color` on a surface to move one. A scrim
  is painted by a top-layer or fixed box covering the viewport, so there is no
  meaningful subtree for it to have followed.

  Blur is deliberately not folded in. Only the basic dialog frosts what is
  behind it (`--md-comp-basic-dialog-scrim-blur`, unchanged); the drawer and the
  rail slide over the page and would smear it. Nothing changes visually — all
  four sites computed `oklab(0 0 0 / 0.32)` before and after.
- **Floating sheet** (`dialog.floating-sheet`), the third member of M3's sheet
  family: secondary content on a surface detached from every window edge, where
  a bottom sheet docks to the bottom and a side sheet to one side. `show()` is
  standard (no scrim, the page stays interactive), `showModal()` is modal.

  **No behavior module.** It does not drag, so the only dismissal it needs
  beyond Escape and its action row is a scrim tap — which `Dialogs.Init()`
  already gives every `<dialog>`. `BottomSheets` and `SideSheets` exist for the
  drag gesture; a floating sheet has none, so adding a third module would have
  been a parallel copy of light dismiss.

  It is a `<dialog>` and reuses the dialog slots rather than restating them: the
  partial re-points `--md-comp-basic-dialog-container-*` at its own tokens and
  overrides placement, elevation and the standard variant's scrim. Its action
  row keeps sheet buttons instead of the dialog's text buttons, like the other
  two sheets.

  Tokens are `md.comp.sheet.floating` (DSP 34.0.21), which publishes exactly
  three values: `surface-container-low`, 28dp corners, elevation 1. **Placement
  is not in the spec**, so the 24dp inset and 400dp cap are this framework's and
  are custom properties (`--md-comp-floating-sheet-inset`,
  `--md-comp-floating-sheet-container-max-width`) rather than fixed numbers.

  **There are deliberately no edge modifier classes.** `.bottom` already selects
  a bottom sheet and `.left` / `.right` a side sheet, so a floating sheet
  borrowing those names would match two sheets' rules at once. Anchor it to a
  corner with `inset` / `margin` instead.

- **Bottom app bar** (`.bottom-app-bar`), an 80dp row of the current screen's
  commands at the bottom edge, with an optional FAB. CSS only.

  **It is not the navigation bar, and the markup is where that is settled.** A
  navigation bar holds destinations that do not change per screen and is a
  `<nav>` landmark; this holds the actions of the screen the reader is already
  on, so it is not a `<nav>` and takes no landmark (rule 4). It takes no
  `role="toolbar"` either — that is a composite role promising arrow-key
  navigation nothing here implements (rule 2), so it is *withheld*, the same
  account the toolbar gives. `semantics.json` enforces both, plus a name on
  every icon-only action.

  This component existed once before, keyed on `footer:has(> nav:only-child)`,
  and was removed with the navigation bar's arrival because an element-driven
  host claimed the landmark from the markup alone and left the two bars one slip
  apart. The host is a class now, and the rule forbids every landmark element,
  `<footer>` included — not just `<nav>`.

  **Nothing in it collides with `nav.navigation-bar`.** Material says never show
  both; a page that does anyway gets two intact bars rather than one broken one,
  and `tests/bottom-app-bar.test.js` asserts no selector on either side reaches
  the other.

  Tokens are `md.comp.bottom-app-bar.*` (DSP 34.0.21): 80dp,
  `surface-container`, elevation 2, square. One height with or without a FAB —
  the 72dp `with-fab` height is deprecated. The 4dp inline padding is Compose's
  `16.dp - 12.dp`: a 48dp action already insets its 24dp glyph by 12, so the
  glyph lands 16dp from the container edge. The in-bar FAB is flat and
  `secondary-container` per `BottomAppBarDefaults`, not the free-standing FAB's
  lifted `primary-container`, and `margin-inline-start: auto` puts it at the end
  with no spacer element.

  M3 Expressive's docked toolbar (`.toolbar.docked`) is the newer 64dp answer to
  the same problem and is unchanged. Both ship.

- **A bottom sheet's handle dismisses it when the handle is a `<button>`.** The
  slot was pointer-only: `BottomSheets` bound `pointerdown`/`move`/`up`, so a
  handle written as `<button aria-label="Dismiss">` — which the docs taught —
  did nothing on Enter. The label promised an action no code performed, and
  dragging is a pointer gesture, so the only keyboard route to the same outcome
  was Escape, which the button did not advertise. Activation now closes the
  sheet. A handle written as any other element stays decoration and stays inert.

  **The click that ends a drag is told apart from a tap**, because a drag
  finishes with a `click` on the element it started on and would otherwise
  dismiss the sheet the drag had just declined to dismiss. Movement past 4px
  marks the sequence as a drag, and the flag is cleared on `pointerdown` so an
  abandoned sequence cannot leave it set. Keyboard activation does not consult
  that flag at all — a `click` carrying `detail: 0` came from Enter or Space, so
  a stale drag can never swallow a key press.

  `tests/bottom-sheet.test.js` covers both directions: activation dismisses
  through either spelling of the class, a snapped-back drag's trailing click
  does not, a keyboard activation still lands after one, and a decorative handle
  is not a control.

- **Drag handle** (`.drag-handle`), the affordance that makes something legible
  as draggable. CSS only, no plugin, no registry entry.

  **Which element you write is the whole semantic.** A
  `<span class="drag-handle" aria-hidden="true">` is decoration, which is the
  usual case — the handle draws a bar and holds no text, so exposed it arrives
  in the reading order as an unlabelled blank. A `<button>` with an `aria-label`
  is a control, and is written only when activating it does something.
  `semantics.json` enforces both directions, including the trap in the middle:
  `aria-hidden` on a button hides it from assistive technology without taking it
  out of the tab order. The hover, focus and pressed states key off
  `button.drag-handle` for that reason, so a decorative handle stays inert under
  a pointer merely crossing it — and that scoping is only correct *because* the
  rule holds every other element to `aria-hidden`.

  **Nothing here drags, and the docs say so rather than implying otherwise.**
  Dragging is a pointer gesture, so an outcome reachable only by dragging is
  unreachable without a pointer. No reordering behaviour ships to hang off this
  handle; a page that builds one owes it a keyboard path of its own, and
  `llm.md`, `m3-guidelines.md` §6.4 and the docs page each state that plainly.

  **`md.comp.drag-handle` is the *vertical* handle**, which is easy to mistake
  for the bottom sheet's grabber and is not it. Material tokenised the bar that
  sits in the gutter between two panes — Compose's `VerticalDragHandle` — 4×48dp
  in a 24dp hit target, swelling to 12×52dp on a 12dp corner while held. The
  sheet's grabber is a different component with its own token set,
  `md.comp.sheet-bottom.docked.drag-handle`, horizontal and 32×4dp at 40%
  `on-surface-variant`. So one class serves both hosts and neither one's values
  are invented: inside a sheet, `_bottom-sheet.scss` supplies the geometry and
  suppresses the vertical bar this partial draws in `::before`, which would
  otherwise print across the sheet's own.

  The bar is a pseudo-element rather than the box because the box is the hit
  target — 4dp of anything is not something a pointer can be asked to find — and
  because the state layer needs a surface the bar's own shape does not clip. The
  container is sized to the *pressed* bar, so holding the handle moves nothing
  beside it.

  **`.handle` is the pre-1.0 name for the bottom sheet's slot and still works.**
  The rename is additive in the usual way and `tests/m3-naming.test.js` asserts
  it: every rule reaching `.handle` reaches `.drag-handle` too.

- **Banners** (`.banner`, `.banner.rich`), Material 3 Expressive's persistent
  in-flow message. A `<div class="banner">` holding a `<p>`, an optional leading
  icon, an optional `.actions` row of text buttons and an optional close icon
  button; `rich` adds a heading and takes an 80dp `<img>` in place of the icon.
  Two colour variants (`vibrant` for `primary-container`) and one shape
  modifier (`square`). CSS only — closing a banner is removing it from the page,
  so there is nothing to initialize and nothing to tear down.

  **It is the third way of talking back, and the docs say which of the three to
  reach for.** Snackbar is transient and floats; banner is persistent and sits
  in the flow; dialog blocks. A message nobody needs to dismiss is a snackbar,
  and a message the user is allowed to ignore is not a dialog — `llm.md`,
  `m3-guidelines.md` §3.3 and §7.5, and the docs page all state the trade the
  same way, because shipping the third one without that guidance is how
  component sprawl starts.

  A banner is **not** `role="banner"`, which is the page header landmark; a page
  has one of those and may have several banners. `semantics.json` blocks both
  spellings of the confusion — `<header class="banner">` and the role on the
  container. Its action row is `.actions` and never a `<nav>` (rule 4).

  The basic and rich layouts are scoped `:not(.rich)` and `.rich` rather than
  left to source order, so they tie on specificity and neither reaches into the
  other. The rich layout is a named grid, so the five parts can be written in
  any order and a missing one collapses its track. Values are
  `md.comp.banners.*`, `md.comp.banners.basic.*` and `md.comp.banners.rich.*` at
  DSP 34.0.21; the four the sheet does not spend — the `two-lines` height, both
  `body-text.trailing-space` close-button reserves, and
  `rich.leading-element.trailing-space` — are named in the partial with the
  reason each is unspendable in CSS.

- **Loading indicator** (`.loading-indicator`), M3 Expressive's indicator for a
  wait under about five seconds: a shape that morphs through a circle and four
  cookie shapes while it rotates. One empty `<span>`, CSS-only, no plugin.
  `contained` puts it on a `secondary-container` circle for backgrounds the
  plain indicator would be lost against.

  **It supersedes the indeterminate circular case of `.progress`** — write it
  anywhere you would have written `<span class="progress circular">` with no
  value. `.progress` is unchanged and keeps both linear bars and every
  determinate case, including the determinate circular one. Neither is
  deprecated; the docs, `llm.md` and `m3-guidelines.md` all state which is the
  default for which wait.

  The morph is `clip-path` keyframes, which interpolate vertex by vertex and so
  need every shape to have the same vertex count. Each is 24 points on a polar
  curve, generated by `_petal-shape()` in the partial: 24 divides 4, 6, 8 and
  12, so every cusp lands on a vertex. `prefers-reduced-motion: reduce` stops
  both animations and leaves the circle. The element reports nothing on its own,
  so the author gives it `role="status"` and a name — not `role="progressbar"`,
  which promises an `aria-valuenow` an indeterminate indicator does not have.

- **The vibrant emphasis axis is a foundation, not a component variant.** The
  `vibrant` attribute remaps the surface family of `--md-sys-color-*` roles for
  its whole subtree onto an accent container, so a component needs no vibrant
  code of its own to sit on one — the same inheritance trick `tokens/_theme.scss`
  uses for `light-dark()`. It points at the live role names rather than the
  `-light` / `-dark` pair, so a runtime theme switch reaches it. There is one
  ramp, tertiary, which is what Material uses for the axis: accent and outline
  roles are deliberately left alone, since pointing the surfaces at primary or
  secondary would erase every component whose own fill is that container, and
  deriving outline from the text colour would turn every checkbox, radio and
  switch border in the subtree translucent. Nothing is restyled by default.
  `:host([vibrant])` is matched alongside `[vibrant]`, so a shadow-DOM host can
  carry it — a sheet loaded in a shadow root cannot reach its own host with a
  descendant selector. The elevation ladder collapses inside a vibrant subtree
  — every `surface-container` rung resolves to the one container colour, which
  is what a vibrant surface is in Material, and `on-surface-variant` collapses
  onto `on-surface` with it — so it belongs on a component, not a page.

  The `.vibrant` classes on Menu and Toolbar keep the colours Material's own
  per-component token sets give each one, and Toolbar's is untouched. Menu's
  now also answers to `[vibrant]`: a selected menu item is filled with
  `tertiary-container`, the very colour the attribute paints the menu with, so
  selection would otherwise disappear into its own surface. Material's
  `menus-vibrant` moves selection to solid `tertiary`, which the class already
  did, and FormSelect's option fill reads the same token so it follows.
- **The extended FAB took Material 3's size and colour axes.** `extend medium`
  is 80dp with a 28dp icon, 20dp corners and a `title-large` label; `extend
  large` is 96dp with a 36dp icon, 28dp corners and a `headline-small` label.
  The container colour is a role rather than a value — `primary-container` is
  the default, `secondary-container` and `tertiary-container` are the other
  two — and each sets `--md-comp-extended-fab-container-color` and
  `--md-comp-extended-fab-label-text-color` together, so the hover and focus
  state layers, which mix one into the other, follow the role with it. The
  three colour utilities that name those roles step aside for `.extend`
  (`.primary-container:not(.extend)`, and the same for the other two):
  utilities win by layer rather than weight, so a bare role class on an
  extended FAB would have repainted the container and left the label colour
  and both state layers behind. The other 46 roles are untouched — a role the
  component does not name has nothing to lose.

  **Migration.** `extend small` carries the `title-medium` label Material
  gives it, where it used to keep `label-large` from the sizeless `extend`.
  A sizeless `extend` is unchanged.
- **Search bar and search view.** `search.search-bar` is Material 3's search
  bar — 56dp on a full corner, `surface-container-high` at elevation 3, holding
  a bare `<input type="search">` with none of the text-field chrome. Values are
  `md.comp.search-bar.*` / `md.comp.search-view.*` at DSP 34.0.21. End spacing
  reads the bar's own children: 16dp beside a bare glyph, 4dp beside an icon
  button, which already insets its glyph by 12dp. The `<search>` element is the
  landmark, so there is no `role="search"` to author.

  `.search-view` is the surface the bar expands into, and it is two different
  native elements because the variants want two different behaviours. Docked,
  it is a plain element inside the bar, toggled with `hidden`: a modeless
  `<dialog>.show()` moves focus into the dialog and would take the caret out of
  the input being typed in. Full-screen, it is a
  `dialog.search-view.full-screen` opened with `showModal()`, so Escape and
  light dismiss come from the platform and `behaviors/dialogs.ts`. Its header
  is another `.search-bar` with the pill and shadow taken off — the same markup
  either way. No JavaScript component ships with it.

  **Suggestions stay Autocomplete's.** `class="autocomplete"` on the bar's
  input gives the combobox, its listbox and the keyboard contract already
  implemented and tested there, so nothing here duplicates them. The search
  view itself *rejects* `listbox` rather than owing it: its contents are links
  and buttons reached with Tab, and a second suggestion listbox here would be
  the same promise with no keyboard model behind it. `semantics.json` records
  the rejection.

  **Migration.** `.searchbar`, the pre-1.0 navbar search field,
  is now an alias of `.search-bar` and moves out of `forms/_input-fields.scss`
  into `components/_search.scss`. Old markup keeps working and picks up the M3
  container; `tests/m3-naming.test.js` holds the alias to every rule.
- **FAB menu.** `fab-menu` is Material 3 Expressive's FAB menu: a FAB that
  expands into a list of labelled pills — 56dp tall, full corner, 24dp insets,
  a `title-medium` label — and morphs into the close button while it is open.
  The colour axis is the same three roles as the extended FAB, and one class
  moves both halves: the actions take `<role>-container` and the close button
  the solid `<role>`, which is the pairing Material specifies. Expanded state
  is the framework's — the constructor stamps `aria-expanded` and `open()` /
  `close()` move it with the `active` class, and `semantics.json` forbids
  authoring either.

  It runs on the existing `FloatingActionButton` rather than a second class,
  so `AutoInit()`, `open()`, `close()`, `isOpen` and `destroy()` all work
  unchanged; `direction` and `hoverEnabled` are inert on it, because a FAB
  menu opens upward and on click and both are decided in CSS. It does not
  touch the `.fab` speed dial or the `.fab.toolbar` transition: `.fab` is a
  whole class name and never matches `.fab-menu`.
- **Segmented buttons.** A `fieldset.segmented-button` of `<input>` and
  `label.segment` pairs is Material 3's outlined segmented button — 40dp on
  a full corner, equal columns filling the width it is given, a 1dp outline
  with dividers between segments, 12dp insets, an
  optional 18dp icon, and `secondary-container` / `on-secondary-container` for
  the chosen one. Radios make the group single-select and checkboxes make it
  multi-select; the input type is the entire difference between the two
  variants.

  There is no plugin. The control is the label's sibling and not its child,
  the way a filter chip is written: a `<label>` wrapping a radio or a checkbox
  *is* one to `forms/_radio-buttons` and `forms/_checkboxes`, which would paint
  a 20dp ring on the control and stretch the label to a 48dp row. Selection is
  read off the control with `input:checked + .segment`, so `checked` states
  the initial value and the browser owns it from there — there is no class to
  keep in sync and no ARIA copy to go stale, and `semantics.json` refuses
  `aria-checked`,
  `aria-selected` and `aria-pressed` on a segment. The composite role is
  *rejected* rather than withheld, which is Carousel's case and not Tabs':
  rule 2 asks for an implemented keyboard contract before a component claims a
  composite role, and a `<fieldset>` of radios already has one the browser
  implements — so `radiogroup` is declined because the element already carries
  it, not deferred. `forbid-composite-roles` keeps that and the other nine out
  of the markup. What the rules enforce instead is that the markup stays
  native: a `<div>` root, a `<button>` segment or a radio without the shared
  `name` takes the group name, the arrow keys and the checked state with it. The `<legend>` names the group and is
  hidden, since Material's anatomy has no visible group label. Nothing shows
  it: the root is both the fieldset and the grid of segments, so a legend back
  in flow is another column beside them, and a group that needs a visible label
  writes one before the fieldset.
- **Carousel can advance on its own, with a pause contract that cannot be
  switched off.** An `interval` (milliseconds, `0` and off by default) cycles
  the track; `pause()` and `start()` stop and resume it. The gap follows each
  transition rather than containing it, so a full cycle takes
  `duration + interval`; each rest is armed by the move before it rather than
  running on a fixed phase, so a rest can never end on a move still animating
  nor be cut to the remainder of one that did. Auto-advancing content
  is WCAG 2.2.2 territory, so unlike the Slideshow it replaces, Carousel offers
  no `pauseOnHover` / `pauseOnFocus` booleans to turn off — an interval always
  pauses while the pointer is over the carousel, while focus is inside it, and
  while the tab is hidden, and `prefers-reduced-motion: reduce` suppresses
  auto-advance entirely.
- Carousel takes a fixed `height` in pixels, reproducing the Slideshow layout:
  the height sizes the track and the indicators take their own row below it
  (`--md-comp-carousel-indicator-allowance`, 40px) instead of covering the
  media. Markup can ask for the same layout on its own, by carrying
  `.fixed-height` and setting `--carousel-height`. An explicit `noWrap: true`
  stops auto-advance after one pass rather than looping.

### Changed

- **`.button.circle` sizes its glyph from the button ladder.** It used to pin
  24px whatever size class it wore, so it got the size's *box* and a fixed
  glyph in it: 24px in a 32dp `xsmall` disc, and — the visible one — 24px
  adrift in a 136dp `xlarge` disc. The glyph is now
  `--md-comp-filled-button-icon-size` like every other button's, which is
  20 / 20 / 24 / 32 / 40dp across the five rungs. `.circle.extra` and
  `.circle.large` are the FAB and are unaffected: they read
  `--md-comp-fab-icon-size` and always did.

  **Migration.** The default `<button class="button circle">` carries no size
  class, so it is the `small` rung and its glyph moves **24px → 20px**. That is
  a visible change on every page using one. 24px in a 40dp disc is the *icon
  button's* number (`md.comp.icon-button.small.icon-size`), not the common
  button's, so the control that keeps it is `.icon-button` — which is the real
  M3 icon button, with the whole ladder and its own colours:

  ```html
  <!-- 40dp box, 20dp glyph (the button ladder) -->
  <button class="button circle" aria-label="Add">…</button>
  <!-- 40dp box, 24dp glyph (the icon-button ladder) -->
  <button class="icon-button" aria-label="Add">…</button>
  ```

  Or state the rung you meant: `.circle.medium` is 56dp with a 24dp glyph.

  One host is worth checking by eye: the **top app bar** sizes its own
  icon-only actions at 24dp but steps aside for anything that styles itself,
  `.circle` included — so a `.button.circle` in a bar now shows a 20dp glyph
  beside the bar's 24dp ones. The bar's own spelling is a bare
  `<button class="navigation-drawer-trigger">` with no `.button`, which the bar
  sizes itself; `.icon-button` is the other 24dp answer.

  This subsumes the button-group-local override shipped with button groups,
  which handed a group's `.circle` items the token so a sized group would not
  get the wrong glyph. That rule and its test are gone; the fix is general now.

- **Toolbars are the four M3 Expressive variants, from two independent axes.**
  A *shape* — floating or docked — and a *colour style* — standard or vibrant —
  now compose freely, and their values come from the 34.0.21 sets
  `md.comp.toolbar.{standard, vibrant, docked, floating, floating.fab}` rather
  than from the prose the component was first written against. Nothing in the
  markup contract moves: the bar is still not a `<nav>`, and it still withholds
  `role="toolbar"` (rule 2), which `semantics.json` still enforces.

  Both defaults are written as the *absence* of the other side rather than as
  a selector of their own, which is what makes `.floating` and `.standard`
  writable without four rules or two inert ones — a bar naming either still
  matches the default arm. `.filled` and `.max` keep their old meanings.

  The corrected values: a floating bar lifts to elevation **3** (was 2) and
  takes **8dp** end insets (was 12dp), 16dp from the viewport edge and 24dp
  when vertical. A docked bar takes **16dp** end insets and spaces its actions
  between 4dp and 32dp apart as it widens, instead of `space-around`, which
  honoured neither bound. Action icons and labels are **`on-surface-variant`**
  (was `on-surface`), and a vibrant bar's selected action is
  **`surface-container`** (was `surface`).

  `.vibrant` stays M3's own toolbar-vibrant set and deliberately does *not*
  also answer to the `vibrant` attribute. That attribute is the emphasis
  foundation, whose one ramp is tertiary; a bar inside it is repainted by the
  foundation alone, with no toolbar-specific code, because every colour the
  component draws is now a `--md-comp-toolbar-*` token pointed at a
  `--md-sys-color-*` role. Matching the attribute here as well would render
  one variant two ways and would contradict `tokens/_vibrant.scss`.

  The companion FAB in `.toolbar-group` takes `md.comp.toolbar.floating.fab`:
  `secondary-container` beside a standard bar, `tertiary-container` beside a
  vibrant one, at elevation 1 where the bar is at 3. Mark only the bar. Docs
  that hand-applied colour utilities to that FAB no longer need to.

- **The FAB no longer claims to be a menu.** `FloatingActionButton` used to set
  `role="menu"` on the action list and `aria-haspopup="menu"` on the trigger.
  A menu is a composite widget whose items are reached with the arrow keys, and
  this component has no such keyboard model, so both were a promise it does not
  keep (SEMANTICS rule 2). They are gone; `aria-expanded` stays, which is what a
  disclosure actually is. `semantics.json` records `menu` as withheld pending
  the keyboard model rather than leaving the gap unaccounted for.

  **Migration.** A script or stylesheet selecting `.fab [role="menu"]` needs a
  different selector. Nothing about the markup an author writes changes.
- **Buttons took Material 3 Expressive's two modifier axes.** Five styles
  (`filled`, `tonal`, `outlined`, `elevated`, `text`) and five sizes
  (`xsmall`, `small`, `medium`, `large`, `xlarge`) are now independent classes
  on `.button`, and any style combines with any size — nine classes, not
  twenty-five, because the size rules set tokens and the style rules set
  colour. `filled` is new, and is what the styleless default already was.

  **Migration.** Three things behave differently:

  - `small` is 40dp now, not 32dp — M3's small *is* the default size, so
    writing it changes nothing. The old 32dp button is `xsmall`.
  - `large` is 96dp, not 56dp. The old 56dp button is `medium`, and `extra`
    still resolves to it, so `class="button extra"` is unchanged. `circle
    extra`, `circle large`, `extend` and every FAB size are untouched.
  - Spacing is symmetric at every size. Expressive dropped the old "24dp
    inset, but 16dp next to an icon" asymmetry, so a button with an icon is
    no longer inset differently on the icon's side, and the default inset is
    16dp rather than 24dp. The default icon is 20dp (was 18dp) and corners
    are fully round at every size.

  An `outlined` button's border also thickens with the size — 1dp up to
  medium, 2dp large, 3dp extra large — from the new
  `--md-comp-filled-button-outline-width` token.

- Pane layouts now use M3 spacing: 16dp inline margins on Compact, then
  24dp margins and 24dp spacers on Medium through Extra-large.
- **Responsive breakpoints now match Material 3 exactly.** Compact is below
  600px, Medium is 600–839px, Expanded is 840–1199px, Large is
  1200–1599px, and Extra-large starts at 1600px. The Sass keys are now
  `compact`, `medium`, `expanded`, `large`, and `extra-large`; consumers that
  used `small`, `xlarge`, or `xxlarge` must migrate, and code that used
  `bp-up("large")` for the old desktop boundary should use
  `bp-up("expanded")`. Grid markup keeps `.s` / `.m` / `.l` / `.xl` /
  `.xxl`, mapped to those five classes in order. Visibility helpers now name
  and isolate the same M3 ranges; legacy `small`, `med`, and `xxl` spellings
  remain aliases where their meaning is unambiguous.
- **Components took the names Material 3 uses for them.** Every rename is
  additive — the old class stays in the selector list, the old export stays as
  an alias — with one exception, called out below.

  | M3 | was | now |
  | --- | --- | --- |
  | Slider | `.range` / `Range` | `.slider` / `Slider` |
  | Navigation drawer | `.sidenav` / `Sidenav` | `.navigation-drawer` / `NavigationDrawer` |
  | FAB | `.fixed-action-btn` | `.fab` |
  | Progress indicators | `.preloader` | `.progress.circular` |
  | Date / Time pickers | `.datepicker` / `.timepicker` | `.date-picker` / `.time-picker` |

- **`Slider` changed meaning, and that one is a break.** It was the image
  slideshow; it is now the range control, because that is what M3 calls a
  slider. Aliasing it would have defeated the rename. Before 0.8.0, `.slider`
  markup and `Expressive.Slider.init()` started the slideshow; both now name the
  range control. Migrate slideshow markup and script to Carousel using the
  removal guide below. `Expressive.Range` still resolves to the renamed
  `Slider`.
- **`.field` deliberately did not become `.text-field`.** M3 names the
  component "Text fields", but the same container wraps `<select>`,
  autocomplete and file inputs, so the M3 name would be wrong for most of what
  it does.
- Sass partials moved with their components: `_sidenav` → `_navigation-drawer`,
  `forms/_range` → `forms/_slider`, and `_preloader` → `_progress`. The old
  slideshow partial, `_slider`, was deleted with that component.
- **The semantics roster stopped counting things that are not components.** A
  component is a part of the framework an author writes markup for, and four of
  the 45 rows in `semantics.json` were not one. Three now state a `kind`
  instead: `transitions` is a foundation, `docked-display` and
  `character-counter` are behaviors. `table_of_contents` left the file — the
  list it styles is Scrollspy's markup, so `scrollspy` took its rule, and the
  partial is recorded under the new `notComponents` map, which is the only way
  a partial leaves the roster and which requires a live partial and a stated
  reason. The standard now reads **44 of 44 rows enforced, 41 of them
  components**, and the exempt list is still empty.

  Nothing was deleted to get there: no Sass, no script, no markup, and no rule
  stopped running — a non-component row is checked exactly as a component's is.
  The data file's `components` key is now `rows`, since it never held only
  components.

### Removed

- **The retired Flask documentation pipeline is gone.** Astro is the sole
  documentation generator, so the Flask application and Jinja templates,
  Frozen-Flask configuration, Python environment, migration script, committed
  `website/` snapshot and generated root `llms.txt` have been removed. The
  documentation site now builds, verifies and publishes from a clean checkout
  with Node alone; visual regression builds both revisions through that same
  Astro production path.

- **Waves is gone, replaced by state layers.** Material 3 has no ink ripple; it
  has a state layer, and the framework's is complete — a `md.sys.state` opacity
  per state, documented on the State layers page, painted by the components
  themselves. Keeping a second, script-driven feedback system beside it meant
  two answers to one question, so the ripple is deleted rather than deprecated:
  `behaviors/waves.ts`, the import-time `Waves.Init()`, the `Expressive.Waves`
  export, and the Waves docs page. The bundle no longer attaches a delegated
  `click` listener to `document.body`.

  **Migration.** `.waves-effect`, `.waves-light` and `.waves-circle` never
  matched a style rule — they were hooks the script read — so markup carrying
  them still renders exactly as it does today, minus the ripple. **Delete
  them**; nothing reads them any more. There is no replacement class to add,
  because a state layer is not authored: an interactive component paints its
  own. `Expressive.Waves.renderWaveEffect()` has no successor.

  Five surfaces relied on Waves for their only press feedback and now carry a
  pressed state layer of their own: the media-covering `.card-reveal-trigger`
  and `.expanding-card-trigger` buttons, the actions inside a `.fab.toolbar`,
  navigation drawer rows, and pagination items. The last two matter most on
  touch, where hover never fires and both already suppressed the tap
  highlight. The two card triggers read the card's own
  `--md-comp-card-*-state-layer-*` tokens, so overriding a card still reaches
  them; the other three have no component token and read `--md-sys-state-*`.

- **Slideshow is gone, and Carousel takes the case.** M3 has no slideshow — its
  Carousel is the component for a band of media — and once Carousel could
  advance on its own,
  the two expressed one concept in 590 lines of duplicate. Deleted outright:
  `components/_slideshow.scss`, `components/slideshow.ts`, the `slideshow`
  `semantics.json` row, and the docs coverage on the Media page.
  `Expressive.Slideshow` no longer resolves. **There is no alias**, because an
  alias keeps both concepts alive while pretending one of them died.

  **`.slider` is unambiguous again**, which is the bonus worth stating. The
  intermediate content-discrimination selectors are gone with the component:
  `.slider` is the range control and nothing else, and nothing in the sheet asks
  what a `.slider` holds. The range control itself is otherwise untouched.

  **Migration.** Carousel with a fixed `height` reproduces the layout — the
  height sizes the track and the indicators take their own row beneath it:

  ```html
  <!-- before -->
  <div class="slider">
    <ul class="slides">
      <li><img src="1.jpg" alt="First"><div class="caption"><h3>One</h3></div></li>
      <li><img src="2.jpg" alt="Second"><div class="caption"><h3>Two</h3></div></li>
    </ul>
  </div>

  <!-- after -->
  <div class="carousel">
    <div class="carousel-item">
      <img src="1.jpg" alt="First">
      <div class="carousel-item-content"><h3>One</h3></div>
    </div>
    <div class="carousel-item">
      <img src="2.jpg" alt="Second">
      <div class="carousel-item-content"><h3>Two</h3></div>
    </div>
  </div>
  ```

  `.carousel-item-content` is the caption slot and is not optional: the item
  clips its overflow and the media fills its height, so a heading left as a
  bare sibling is pushed out of the box rather than laid over the image the way
  `.caption` was. It is also what the small and medium size roles hide and trim
  against.

  ```js
  // before
  Expressive.Slider.init(el, { height: 400, indicators: true, interval: 6000 });
  // after
  Expressive.Carousel.init(el, { height: 400, indicators: true, interval: 6000, fullWidth: true });
  ```

  Four options do not carry over cleanly.

  - `duration` exists on both but means the transition, not the crossfade —
    and Carousel's rest **follows** each transition, so a cycle takes
    `duration + interval`. `interval: 6000` above therefore paces at 6.2s
    rather than 6s; subtract `duration` to keep the old cadence exactly.
  - `pauseOnHover` and `pauseOnFocus` have no equivalent and are not needed: an
    auto-advancing carousel always pauses under the pointer, while focus is
    inside it, and while the tab is hidden — WCAG 2.2.2 territory, so it is not
    switchable.
  - `indicatorLabelFunc` is replaced by two new `i18n` keys, `indicators` and
    `slide`, which name the indicator row and prefix each dot. They are new in
    this release: those were the last two strings Carousel generated in
    hardcoded English, and SEMANTICS rule 5 wants every generated string on an
    `i18n` option. The replacement is a pair of strings rather than a callback,
    so a label that varied per index — "Go to slide 3 (Current)" — has no
    equivalent; the current dot already carries `aria-current="true"`, which is
    what that suffix was standing in for.

  **`fullscreen` has no exact equivalent, and `.carousel.full-screen` is not
  it.** A `fullscreen` slideshow filled its positioned ancestor and stayed
  horizontal at every size. `.carousel.full-screen` is M3's immersive feed:
  `100dvh`, square corners, and **vertical**, turning horizontal on its own in
  landscape or at an expanded width (the component adds
  `.full-screen-horizontal` from the rendered geometry, so setting that class
  by hand does not stick). It also sizes itself, ignoring the `height` option.
  Take it for an edge-to-edge feed; for a fixed horizontal band, keep the
  `height` above and leave `full-screen` off.

- **The coverflow carousel layout is gone.** `.coverflow` was the 3D
  perspective tween inherited from the older source, and
  Material 3 defines it at no layout and no size. It hand-wrote a momentum
  simulation the browser already performs — velocity smoothing over a
  `Date.now()` delta, exponential-decay easing toward a target, modular index
  wrapping, per-item opacity and z-translation recomputed every frame — and ran
  a second set of pointer handlers on the same element as the snap track's, so
  a reader of the component had to establish which of two drag models was live
  before tracing a gesture. Deleted with it: the `.carousel.coverflow` Sass
  block, and the `dist`, `shift`, `padding` and `numVisible` options.

  Every `:not(.coverflow)` guard elsewhere in the partial is now unconditional
  — the reduced-motion block, the fixed-height indicator row, the contained
  edge fades and the grab cursor state their intent directly rather than by
  exclusion. `.carousel` is the Material 3 carousel and nothing else.

  **Migration.** Delete the class. The nearest Material 3 equivalent to
  coverflow's centred, overlapping look is the **hero** layout, which shows one
  large item flanked by small previews:

  ```html
  <!-- before -->
  <div class="carousel coverflow">
    <a class="carousel-item" href="#one"><img src="1.jpg" alt="One"></a>
    <a class="carousel-item" href="#two"><img src="2.jpg" alt="Two"></a>
  </div>

  <!-- after -->
  <div class="carousel hero center-aligned">
    <a class="carousel-item" href="#one"><img src="1.jpg" alt="One"></a>
    <a class="carousel-item" href="#two"><img src="2.jpg" alt="Two"></a>
  </div>
  ```

  The four removed options are deleted rather than accepted and ignored, so
  passing one is a type error instead of silence. There is no runtime warning
  and no shim: a shim keeps both concepts alive while pretending one has died.

  **`duration` and `noWrap` survive and mean what they always did for a snap
  track.** `duration` bounds how long the component waits for `scrollend`
  before assuming a programmatic scroll landed, and is added to `interval` to
  time each auto-advance rest; `noWrap` stops auto-advance after one pass
  instead of looping. Auto-advance — `interval`, `duration`, `noWrap` — behaves
  exactly as it did.

- **Parallax and Pulse are gone**, with no successor. This removal is separate
  from the semantics sweep above. Both were decorative
  motion opinions of our own, and M3 Expressive ships a `MotionScheme` of
  spring specs that says something different — the same reasoning that removed
  the legacy palette. Deleted outright: the `.parallax` and `.pulse` styles,
  the `Parallax` component and its registry entry (so `AutoInit()` no longer
  claims `.parallax`, and `Expressive.Parallax` no longer resolves), and both
  docs pages.

  **Migration.** For a `.pulse` halo, write the animation yourself or use a
  component that already reports what it means — a badge for a count, a
  progress indicator for work in progress. For a `.parallax` hero, the markup
  it wrapped is an image in a container: keep the `<img>` with
  `object-fit: cover` and a fixed container height. Restoring the motion takes
  more than one property — the container needs `view-timeline-name`, the image
  needs to be taller than its clip (`height: calc(100% + 2 * travel)`) and to
  run a `translateY` keyframe pair through `animation-timeline` with
  `animation-range: cover`. Copy the deleted `_parallax.scss` out of the
  history if you want it. A carousel is the M3 component for a scrolling band
  of media.

### Fixed

- **The sheet is now usable as a shadow root's only stylesheet.** Token
  declarations were split between `:root, :host` and `:root` alone — three
  blocks paired, five not, among them the whole reference layer at 338
  declarations. A sheet adopted only into a shadow root
  (`shadowRoot.adoptedStyleSheets`, no document-level copy) therefore lost every
  one of those tokens, and because `tokens/_theme.scss` resolves each role as
  `light-dark(var(--md-sys-color-<role>-light), …)` out of the `:root`-only
  pairs, it lost every colour in the sheet rather than only the missing tokens.
  Every token-declaring rule now carries its `:host` twin, `[icon-style]`, the
  three `[theme]` selectors and the grid's `--gap-size` on `body` included — so
  a shadow tree can be pinned to a theme or an icon style the way a page can,
  and a `.row` in one has a gutter instead of an invalid `gap`.
  `adr/0002-shadow-only-stylesheet-adoption.md` records the commitment and
  `tests/shadow-dom.test.js` enforces it. The ordinary setup — framework in the
  document, also adopted into components — was never affected, because custom
  properties inherit through shadow boundaries.

- **Runtime-created elements now stay in the tree that created them.** Six
  places built an element and appended it to `document.body` — the tooltip
  surface, the snackbar container, the lightbox caption, the drawer's edge drag
  target, and the datepicker's two month/year menus. A sheet adopted into a
  shadow root cannot match a node outside that root, so every one of them
  arrived unstyled in the shadow-only setup the previous entry made possible.
  `Utils.portalRoot(el)` returns `el.getRootNode()` when that is a shadow root
  and `document.body` otherwise, and each site goes through it. The lightbox's
  ancestor-overflow walk hops the shadow boundary through the host instead of
  throwing on the root.

  **This gives up an escape hatch on purpose.** A portal on `document.body`
  escapes an ancestor's `overflow: hidden` and stacking context; inside a shadow
  root it escapes neither, because the host's ancestors are still in the
  flattened tree. Nothing recomputes coordinates, so a positioned ancestor above
  the host re-anchors the `absolute`-positioned tooltip and a transformed one
  re-anchors the three `fixed` portals. `adr/0002` states the bound; behaviour in
  a plain document is unchanged.

  Native `<dialog>` was never affected — a top-layer element is painted outside
  the document's paint order but stays in its own tree.

  **Migration:** `Snackbar` has no originating element, so it takes a new `root`
  option — any element in the target tree. Without it the container still goes to
  `document.body`, exactly as before. Because only one snackbar shows at a time,
  the one shared container moves between roots rather than being duplicated.

- **A trigger and its target in the same shadow root can find each other.** The
  mirror of the portal fix: four places resolved an id with
  `document.getElementById` — the menu's target, the tooltip's rich content, the
  snackbar's template and the drawer's trigger — and an id inside a shadow root
  is invisible to the document, so every one of those lookups returned null.
  `Utils.getElementById(el, id)` resolves against `el.getRootNode()`.

- **Two ancestor walks stepped onto a shadow root and threw.** `Menu` looks for
  the nearest clipping ancestor with `getComputedStyle`, which rejects a
  non-Element, so a menu whose container was a shadow root could not open;
  `Lightbox` read `.style` on the same node. Both now step over the root to its
  host, so the clipping ancestors above it are still found. `Lightbox` also put
  every ancestor back to `''` rather than to the value it found, discarding an
  author's inline `overflow` the first time a lightbox opened under it — it now
  records and restores the original.

- **A menu opened from a trigger narrower than 112dp is sized to its own
  content.** `constrainWidth` wrote the trigger's width onto the surface and the
  surface's own `min-width: 112px` then overrode it, so any trigger under that
  floor left the menu at exactly 112dp with every item inside it wrapped. An
  icon button is 40dp and a split button's chevron is 48dp, so both were always
  in that state. The constraint now applies only to a trigger wide enough to
  mean something; a wider trigger still constrains as before.

- **The renames reached the styling and stopped short of the behaviour.** The
  Sass alias made `.navigation-drawer-fixed` *look* docked while the component
  still read only `sidenav-fixed`, so at the Expanded breakpoint a canonically
  named drawer kept its drag target live and `open()` could turn it into a
  modal. `_host()` in Slider knew only the legacy classes, so a dual-handle
  control in a `.slider` host never clamped its handles and never tracked the
  interval.
- **A circular indicator also matched the bare linear-progress rule**, drawing
  a linear fill over the conic one — `<span class="progress circular">` is not
  a `<progress>` and has no determinate child, so it fell through to the
  fallback.
- **Four documented snippets kept the old names in script** — `.sidenav`
  queries that matched nothing, and `Expressive.Slider.init` still being used
  to start slideshows after `Slider` became the range control. A new check
  reads every `Expressive.X` and every selector string in the docs and fails on
  a name the bundle or the sheet does not have.
- **`.fab` was not excluded from the toolbar selector** the way
  `.fixed-action-btn` is, so a FAB-to-toolbar transition written with the new
  name picked up toolbar styling. Found by the rename test itself, which walks
  every rule naming an old class and fails if the new one is missing from it.
- **`llm.md` documented a token that does not exist** — `--sidenav-width`. The
  real one is `--md-comp-nav-drawer-width`.
- **The top app bar told an icon from a label by its element.** The 48dp
  circular target was keyed on `<i>`, and the canonical icon is a
  `<span class="material-symbols">` — so every bar written the way the docs
  teach, this site's own header included, lost the rule outright. The leading
  action fell through to the generic button pill (72×40, tonal fill), the
  trailing icon links were swept up by the *text-destination* rule and drawn at
  `label-large` with 12dp padding, and the headline sat 76px from the edge
  instead of the spec's 56. Keyed on the shared `$icon` list now, the way
  `_buttons` and `_toolbar` already were.
- **Five more tokens were declared or referenced but not both**, found by the
  new check below. The time picker's AM/PM buttons referenced retired
  `--btn-padding` and `--btn-border-radius`, which no longer exist — the
  declarations were invalid at computed-value time, which does *not* fall back
  to the rule underneath, so the padding rendered as 0 while a base button rule
  offered 24px. They now say the 0 they have always rendered as. The checkbox
  and radio `state-layer-size` tokens were declared and read by nothing, with
  the 40dp geometry written out as pre-computed `11px` / `10px` shadow spreads;
  the spreads derive from the tokens now, to the same pixel.

- **The app bar's trailing icon token was declared and used by nothing.**
  Both icon actions took the *leading* token, so the documented way to opt into
  the spec's muted trailing icons changed nothing. The two are told apart the
  way the rest of the bar is — by DOM order, leading before the headline and
  trailing after it — and each token now colours its own side.
- **The medium and large app bars missed their spec insets**, and a
  title-only one put the headline where the icons belong. The expanded
  headline sat 20dp from the inline edge rather than 16, medium left 16dp
  above the container bottom rather than 20, and the icon row sat 4dp high
  instead of centred in the 64dp row the bar collapses to. Separately, a bar
  with no icons has a single flex line, and `align-content: space-between`
  packs one line to the *top* — so the headline rose to the icon row. The top
  row now has a height of its own and the headline a basis that cannot share
  a line with it.
- **Ten more components had the same defect as the app bar above.** The
  canonical icon is `<span class="material-symbols">`, but the navigation bar,
  dialog, panes, list, tabs, pagination, side sheet, toolbar, menu and
  fieldset legend each still asked `> i`. Nothing warned; the rules simply stopped applying —
  the navigation bar lost its active-indicator pill, a tab with an icon kept
  the short container, menu icons rendered at 24dp instead of 20dp.

  Three of them broke twice over, because the rule on the *other* side of the
  question over-matched instead. `:has(> i:only-child)` failing meant the
  dialog's close button fell into the `:not(:has(…))` **text button** branch
  and rendered as an auto-width 40dp pill rather than a 48dp circle; in a
  list, `> span { grid-column: 2 }` swallowed the leading icon
  and drew it inside the text column. Icons now go through `$icon` and labels
  through `$icon-label`, which is what those variables are for.
- **A labelled header action was squeezed into the icon-button circle.**
  `:only-child` counts elements, not text nodes, so
  `<button><span icon/> Save</button>` reads as icon-only and took the 48dp
  circle with its label overflowing — while the complementary
  `:not(:has(…))` branch excluded it from the text-button treatment, leaving
  no way to write it at all. CSS cannot see the text node, so `.button` is now
  the author's opt-out on dialog and pane headers, matching the escape hatch
  the app bar already had. Writing the label as its own `<span>` works too, and
  always did.
- **The navigation bar's active indicator was the navigation rail's.**
  `md.comp.navigation-bar.active-indicator.width` is 64dp and
  `md.comp.navigation-rail.active-indicator.width` is 56dp; both were 56 here.
  The rail is unchanged; the bar is now 64×32.
- **The remaining four components, and the cascade bug hiding underneath
  them.** `_buttons`, `_navigation-rail`, `_snackbar` and `forms/_slider` asked
  `> i` the same way. Two failed harder than the rest: the navigation rail
  hides its FAB *label* with `> :not(i)`, so once the icon became a `<span>`
  that rule hid the icon instead and the FAB rendered as an empty 56dp box;
  and the FAB toolbar's collapsed actions kept `opacity: 0`.

  Fixing `_buttons` exposed a second defect. A component icon rule and the base
  `.material-symbols` rule both carry a class, so they tie on specificity and
  source order alone decides — and `icons-material-design` was forwarded
  *after* `buttons`, `list` and `badges`. Those three silently lost the tie, so
  a button drew an 18px box around a 24px glyph. Icons now load first, which is
  the order every other component already had. **A standard button's icon is
  now 18dp** (`--md-comp-filled-button-icon-size`) rather than the 24dp font
  default; circle, FAB and extended buttons stay 24dp. `list` and `badges` are
  unchanged — their tokens already matched the default.

### Added

- **A token liveness check** (`tests/tokens.test.js`). Two failure modes, both
  silent — no syntax error, nothing in a browser console. A `var()` naming a
  token nothing declares makes its whole declaration invalid at computed-value
  time: it still wins the cascade and *then* resolves to unset, so the property
  falls to inherited-or-initial rather than to the rule underneath. And a token
  declared and read by nobody is a promise the sheet does not keep. Only
  `--md-comp-*` is checked for being read — `--md-sys-*` and `--md-ref-*` are
  the public palette, where 111 unread ramp entries are the point. Unread
  component tokens can be exempted with a stated reason, and the check fails on
  a stale exemption too, so the list can only shrink.

- **The sweep is finished — 45 of 45 components enforced.** The last pass takes
  the remaining 23: icons, badges, buttons, cards, toolbar, list, tooltip,
  preloader, dialog, panes, carousel, parallax, lightbox, and the ten that
  state no markup of their own and now say so in writing.
- Two ways to account for a composite role a component keeps out of its markup.
  **Conformance debt** (`conformance`) is a promise deferred until the code can
  keep it — Tabs and Toolbar withhold `tablist` and `toolbar` pending a keyboard
  model. A **rejected role** (`rejects`) is a promise declined: Carousel's
  keyboard contract is implemented and tested, and it writes the ARIA carousel
  pattern instead, so `tablist` is not owed. Both link to the rule that enforces
  them, and the suite refuses either without the other in both directions, so a
  role cannot be withheld silently and debt cannot be recorded without teeth.
- A fourth rule kind, **`forbid-composite-roles`**. The rule states the
  component's own selector and the checker expands it over the composite-role
  vocabulary, so the ten roles are named once rather than once per component and
  adding one tightens every such rule. It replaced two hand-written rules that
  each named a single role and left the other nine legal.
- A third rule kind, **`require-accessible-name`**. It is the one question a
  selector cannot ask: whether a control ends up with a name depends on text
  *nodes*, and CSS cannot see them — `:has(> .icon:only-child)` counts
  elements, so it flags `<a><span icon/>Five</a>`, a link that is perfectly
  well named. The check reads the content instead.
- **Navigation is the third sweep** — `landmarks`, `navbar`, `navigation-bar`,
  `navigation-rail`, `sidenav`, `breadcrumb`, `pagination`, `tabs`, `menu`,
  `table_of_contents`, `page-footer`. **22 of 45 components are now enforced;
  23 remain.**
- **`m3-guidelines.md` is checked**, against `fragmentSafe` rules only. It
  states markup as inline code spans in prose rather than as fenced examples,
  so a rule may run against it only if it fires on a *wrong thing present*. A
  fragment cannot be wrong about what it omits — omitting is what a fragment
  is for.
- `landmarks`, a component row for the cross-cutting rules that belong to no
  single component: every `<nav>` carries a name, and `<main>` does not nest.
- **Forms are the second sweep** — `input-fields`, `fieldset`, `checkboxes`,
  `radio-buttons`, `switches`, `select`, `file-input`, `range`, plus
  `autocomplete` and `character-counter`. **11 of 44 components are now
  enforced; 33 remain.**
- `Autocomplete` announces itself. The input is a `combobox` with
  `aria-autocomplete="list"` and `aria-controls`; the suggestion list is a
  `listbox`; every entry is an `option` with an id and `aria-selected`; and
  arrowing sets `aria-activedescendant`. It previously had **none** of these -
  the highlight moved with a class nothing but a sighted user could follow.
  Rule 2 permits the roles because the keyboard contract was already there.
- `CharacterCounter` writes into a polite, atomic live region, so the remaining
  count is announced instead of silently running out.
- A test fails any markup sample in `llm.md` fenced as ` ```text ` instead of
  ` ```html `. The extractor keys on the tag, so 37 blocks - including every
  Fieldsets example - were markup no check could see.
- **`SEMANTICS.md`**, the normative per-component markup standard, generated
  from `semantics.json` by `npm run build:semantics`. `CONTEXT.md` defines the
  vocabulary it uses.
- **`tests/semantics.test.js`** enforces it against all three surfaces that
  state markup: `llm.md`, `docs/templates/**` and `tests/fixtures.js`. A
  component is `enforced` or `exempt`; the exempt list is the remaining backlog
  and only shrinks. A component cannot be added without a row, so anything new
  is checked from its first commit. A single example can opt out with a stated
  reason (` ```html ignore-semantics: why `, or `code(check=false, reason=…)`).
- `Chips` gains an `i18n` option (`{ remove: 'Remove' }`) for the delete
  button's accessible name.

### Changed

- **An icon is a `<span>`, and it says whether it is decoration or an image.**
  465 `<i class="material-icons">` became
  `<span class="material-symbols" aria-hidden="true">`. `<i>` means idiomatic
  text and an icon is none of those; more to the point the glyph comes from a
  ligature, so the icon's content is real text and was being read out — every
  icon-only button announced itself twice, as "add, Add". An icon is now
  either `aria-hidden` with the control carrying the name, or `role="img"`
  with a label of its own.
- **Hiding every icon exposed the controls that had nothing else.** 47
  icon-only links and buttons had no accessible name at all once the glyph
  stopped being read; they carry one now.
- **A badge nested in an icon is hidden with it.** `aria-hidden` covers the
  subtree and `aria-hidden="false"` on a descendant does not undo that, so a
  count that lived only inside a decorative icon was a count nobody heard.
  Inside a control the name carries it (`aria-label="Inbox, 3 unread"`);
  standing alone the icon becomes the image.
- A **toolbar is a `<div class="toolbar">`**, not a `<nav>` — it holds
  commands, not destinations — and not `role="toolbar"` either, which is a
  composite role promising arrow keys nothing here implements.
- A **card's action row is a `<div class="actions">`**. A row of buttons is not
  a landmark, and one per card floods the landmark list.
- A **`<dialog>` is named**, by `aria-labelledby` pointing at the heading it
  already has. Including the one `Sidenav` builds: it copies the drawer's name
  onto the dialog, because once that dialog opens modally the `<nav>` holding
  the label is outside it.
- A **`<div class="progress">` reports progress** with `role="progressbar"`, and
  a determinate one reports `aria-valuenow` too — a progressbar with no value
  *is* an indeterminate one, which is a lie if the bar visibly shows 70%.
  `<progress>` reports itself; a div drawn with CSS reports nothing.
- A **CSS-only `.tooltip` is referenced with `aria-describedby`.** Inside its
  control it was swallowed — with an `aria-label` present the label wins and
  the tooltip was never announced at all.
- **`.lightboxed` images are operable.** They open an overlay on click, which
  makes them controls, and a bare `<img>` is not focusable. The keypress
  handler was already there; only `tabindex` and a role were missing.
- `aria-selected` came off plain `<li>`, and a pane is a `<section>`, not a
  second `<main>`.
- **Every `<nav>` now carries a name, and things that are not navigation
  stopped claiming to be.** A row of radios or checkboxes is a
  `<div class="inline">`, not a `<nav>` — it was a flex hook wearing a
  landmark. The icons page used `<nav>` to mean "any element that inherits";
  that is a `<div>`. A footer column with no links is a `<section>`. A top app
  bar that holds only a title and controls — as the docs chrome does — is a
  `.bar`, because an empty navigation landmark is worse than none.
- **Breadcrumbs are an ordered list.** `<nav aria-label="Breadcrumb"><ol>`,
  with `aria-current="page"` on the last crumb. The flat run of
  `<a class="breadcrumb">` gave no count and no position. The Sass already
  supported the `<ol>` form; only the documentation was behind.
- **Pagination lives in a labelled `<nav>`** with `<ol>`, `aria-current="page"`
  on the current link, and a `<span>` rather than an `<a href>` for a disabled
  prev/next — a disabled link is still focusable and still navigates.
- Tabs, the navigation bar and the navigation rail mark the active destination
  with `aria-current="page"`, not just a class.
- A `<menu>` separator is `<li class="divider" role="separator">`. `<menu>` is
  a list and its content model permits only `<li>`, so a bare `<hr>` between
  entries was invalid. It still renders.
- The sidenav and the table of contents sit inside a labelled `<nav>`.
- **Form markup now says what it is.** `.field` is the container; `.input-field`
  never was one (the only rule matching it is `.chips.input-field`). Field icons
  are `<span class="material-symbols" aria-hidden="true">` and name their side
  with `prefix` or `suffix`. Supporting text carries an `id` and the control
  points at it with `aria-describedby`, or it is never read out with the field.
  Radios live in a `<fieldset>` with a `<legend>` naming the question. A file
  input is a `<label>` pointing at the input rather than a `<button>` wrapping
  it, and the path field is `readonly`. Switch on/off captions are
  `aria-hidden`, because as bare text they made the switch announce itself as
  "Off On".
- **Chips are the first component swept.** Each kind of chip is now written
  with the element that says what it is — the four Material 3 types plus a
  non-interactive display chip, across three root elements: display is
  `<span class="chip">`, assist and suggestion are
  `<button type="button" class="chip">`, filter is
  `<input type="checkbox" class="chip-input">` + `<label class="chip">`, and an
  input chip is a `<span class="chip">` holding a
  `<button type="button" class="close" aria-label>`. A filter chip's state is
  `:checked`, so it needs no JavaScript.
- Selection is the `selected` class rather than `:focus`, which previously had
  to stand in for it. `active` still works.
- Icons inside a chip are `<span class="material-symbols" aria-hidden="true">`.
  The ligature is real text and was being read out next to the label.
- The icon modifiers `.left`, `.right`, `.tiny`, `.small`, `.medium` and
  `.large` no longer depend on the element being `<i>`. They were keyed on `i`
  in `base/_global.scss`, so writing an icon as a `<span>` silently dropped
  them; `.left` and `.right` moved onto the icon class list, where the sizes
  already were.

### Fixed

- **The footer's legal bar was unstyled whenever the footer used `.container`.**
  `.container` is a supported columns wrapper — the column rules already reach
  through it — but the copyright-bar selector only matched a direct
  `footer > small`, so the documented grid layout produced a bare copyright
  row. The docs' own chrome had it on every page.
- **The docs taught four classes that do not exist.** `.page-footer` and
  `.footer-copyright` were described as aliases that "stay" — nothing in the
  sheet matches either; `carousel-slider` was said to still enable flat mode,
  but only `.flat` and `fullWidth` are read; and `btn-large`, removed three
  releases ago, was still used in a waves example. `.prev` / `.next` are
  accepted but inert, and the responsive-pagination prose still described the
  10%/80% split they used to drive, which `.nowrap` scrolling replaced.
- **`m3-guidelines.md` declared `nav.toolbar` five times** — a shape
  `semantics.json` forbids — plus the toolbars page prose, which still called
  the bar a `<nav>` after the markup beside it had been changed. The fragment
  reader could not see any of it: it looks for `<tag …>` forms, and a
  selector-style mention in a sentence or an anatomy table has no angle
  brackets. A check now derives every `tag.class` shape from the fragment-safe
  forbid rules and fails when a document names one, allowing a deliberate
  negation so a rename can still be recorded.
- **Icon anatomy prose omitted `aria-hidden`** on three pages while the next
  sentence claimed the icon was hidden — so a reader following it would build
  a button announced as "add Create".
- **Prose lagged the sweeps.** The code blocks were rewritten mechanically and
  the sentences around them were not: a dozen places still called the icon an
  `<i>`, cards still described a `<nav>` action row, lists and menus still
  taught `aria-selected` on a plain `<li>`, and the pickers told you to wrap an
  input in `.input-field` — four sections after `llm.md` says that class is not
  the container and never was.
- **A docs page could carry 31 landmarks called "Main."** Every app bar demo on
  a page is a specimen, and they all had the canonical label. The live demos
  are named by their section now; the samples a reader copies keep the plain
  name.
- **Off-screen carousel slides were hidden but still focusable.** A slide is an
  `<a>`, and `aria-hidden` alone left the tab stop in place — focus landed on a
  link the user had no way to perceive. They are `inert` now, which removes
  them from the tab order, from assistive technology and from hit-testing.
- **The drawer wrapper became a second app bar.** Wrapping the sidenav in a
  `<nav>` while it still lived inside `<header>` made it a direct child of an
  app bar host, so the navbar rules gave it `display: flex`, full width and a
  64dp minimum — an empty bar-sized band under the real one, on every docs
  page. The drawer is a sibling of the bar now, which is what
  `m3-guidelines.md` said all along: the trigger may live in the bar, the
  drawer must not.
- **A `header.fixed` whose bar is a `.bar` kept its looks but lost its
  behaviour.** The fixed selector still required a `nav` child, so such a
  header got the app bar's appearance without `position: sticky`, its z-index
  or the scroll-fill.
- **A row of checkboxes stacked vertically.** `_radio-buttons.scss` learned
  `.inline`; `_checkboxes.scss` did not, and each label is `display: flex`.
- **Tabs announced the wrong tab as current.** `aria-current` was written into
  the markup and then never moved: the class changed on click, the attribute
  did not. Its value changes with interaction, so maintaining it is the
  component's job — `Tabs` now moves the class and the attribute together, on
  click and on a hash-selected init.
- **`.bar` escaped its selector and styled every element that used it.** The
  new app bar host was interpolated as a bare comma-separated list, so
  `header.medium > #{$_bar}` expanded to `header.medium > nav:not(…), .bar` —
  a top-level `.bar` rule applying app bar layout page-wide. Wrapping the
  variable in `:is()` keeps it one compound selector, and the specificity
  where it was. The existing app bar tests caught it.
- **A field icon written as a `<span>` inherited the floating label's
  position** - 16px from the edge with `pointer-events: none`, i.e. indented
  past its own padding. Five hand-copied "everything that is not the label"
  exclusion lists had already drifted from each other; they are now one
  `$_not-label` variable, which is what stops the sixth from being missed.
- The field icon modifiers were keyed on `i` with `:first-of-type` /
  `:last-of-type`. Those count elements of the same *type*, so they could not
  be widened to spans at all - a field is full of other spans. The documented
  markup names the side instead; the positional `i` rules stay for old markup.
- **The file input trigger is a `<label>` wrapping its control**, not a label
  pointing at a sibling. `label.button` joins the button selector list, and the
  floating-label rule now excludes it — without both, the trigger rendered as
  invisible, unclickable field furniture. Wrapping also scopes the invisible
  input to the button, so the picker no longer opens from a click anywhere in
  the field.
- **The trailing field icon swallowed clicks.** Excluding the icons from the
  floating-label rule took `pointer-events: none` with it; `.prefix` restated
  it, `.suffix` did not.
- **`aria-selected` no longer doubles as the highlight.** Active and selected
  are different things: folding the arrow-key highlight into `aria-selected`
  announced a committed multi-select choice as unselected the moment the user
  arrowed past it. The highlight is `aria-activedescendant` alone.
- **`Autocomplete.destroy()` left a timer running.** `open()` defers
  `menu.open()` to `setTimeout(0)`; destroying in the same tick let it fire
  against a menu whose element was gone. It surfaced only as an uncaught
  error *after* the test had passed. Calling `open()` twice before the callback
  fired also orphaned the first timer, which `destroy()` could not then cancel.
- **A rendered chip was a `<div tabindex="0">` with no role and no accessible
  name** — in the tab order, announcing nothing. The chip is no longer a
  control; its delete button is, and that button carries the name.
- The chip delete affordance was an `<i class="close">`: not focusable, not
  labelled, and unreachable without a mouse. It is now a real
  `<button type="button">`.
- `.chip:focus` set `outline: none`, which would have removed the focus
  indicator from the newly focusable chips. Focus now goes through the
  `focus-visible` mixin.
- `closeIconClass` was documented with a default of `'material-icons'`; the
  code has always defaulted to `'material-symbols'`.

### Migration

- `<i class="material-icons">add</i>` →
  `<span class="material-symbols" aria-hidden="true">add</span>`, and the
  control around it needs an `aria-label` if the icon was its only content.
- `<nav class="toolbar">` → `<div class="toolbar">`.
- A card's `<nav>` action row → `<div class="actions">`.
- `<dialog>` → add `aria-labelledby` pointing at its heading.
- `<div class="progress">` → add `role="progressbar"`, plus `aria-valuenow`
  when it is determinate.
- `<img class="lightboxed">` → add `tabindex="0" role="button"`.
- `<li aria-selected="true">` → `<li class="selected">`.
- Every `<nav>` needs `aria-label` (or `aria-labelledby`).
- `<nav>` used to lay out radios, checkboxes or switches →
  `<div class="inline">`.
- `<nav class="breadcrumb-wrapper">` with `<a class="breadcrumb">` →
  `<nav aria-label="Breadcrumb"><ol><li><a>`, last crumb `aria-current="page"`.
- `<ul class="pagination">` → `<nav class="pagination" aria-label="Pagination"><ol>`.
  The bare list still renders.
- `<hr>` inside a `<menu>` → `<li class="divider" role="separator"></li>`.
- `<ul class="sidenav">` → wrap it in `<nav aria-label="…">`.
- A top app bar with no destinations → `<div class="bar">` instead of `<nav>`.
- `<div class="input-field">` → `<div class="field">`.
- `<i class="material-icons">place</i>` in a field →
  `<span class="material-symbols prefix" aria-hidden="true">place</span>`. The
  side is now required.
- `<small>help</small>` in a field → give it an `id` and add
  `aria-describedby` to the control.
- Radios → wrap the group in `<fieldset><legend>`.
- `<button><input type="file"></button>` →
  `<label class="button" for="x">File</label><input id="x" type="file">`, and
  add `readonly` to `input.file-path`.
- `<div class="chip">` → `<span class="chip">`, or `<button type="button"
  class="chip">` if it is actionable. A filter chip becomes a checkbox and its
  label.
- `<i class="close material-icons">close</i>` →
  `<button type="button" class="close" aria-label="Remove …"><span
  class="material-symbols" aria-hidden="true">close</span></button>`.
- `.chip.active` still works; `.chip.selected` is the name going forward.
- Old chip markup still renders. It is no longer documented.

## [0.7.0] - 2026-08-21

Promotes 0.7.0-rc.0 to `latest`. The framework itself is **unchanged** from
0.6.0 — `src/ts` and `src/sass` carry no commits between the tags, so the built
`dist/` is identical. What changed is around it: package metadata, the
LLM-facing documentation, and the docs site's own templates.

### Fixed

- **`llm.md` taught classes that do not exist.** It is the markup contract other
  tools and models read, and several sections still carried retired
  names the Material Design 3 rewrite removed. Each replacement was verified
  against `dist/css/expressive.css` and `src/ts`:
  - `.btn-floating`, `.btn-large` and `.btn-small` (16 references) — a FAB is
    `circle extra`, 40dp is `circle extra small`, `extend` is the extended FAB,
    and `circle large halfway-fab` anchors one to card media. On an `<a>` the
    `button` class is required, since the size rules only match
    `:where(button, a.button)`.
  - The circular preloader was documented as the old nested `preloader-wrapper`
    / `spinner-layer` / `circle-clipper` / `gap-patch` tree with Google brand
    colors. It is one `<span class="preloader">` with `small` / `big` /
    `determinate` and `--md-comp-progress-value`.
  - `page-footer` and `footer-copyright` are gone — a bare `<footer>` with
    `<nav>` columns and a trailing `<small>` is the component.
  - The claim that `.card` and `.card-panel` "remain as aliases" was false;
    `_cards.scss` is `$_card: "article"`.
  - `carousel-slider` was renamed `flat`.

  An audit of all 213 classes `llm.md` teaches now leaves four, all correct: the
  three `chips-*` selector hooks it documents as having no styles of their own,
  and a `custom-class` placeholder.

### Changed

- `homepage` in `package.json` points at <https://www.expressivecss.com>.
  Registry metadata is fixed per version, so 0.6.0 keeps the old link.
- The docs templates moved onto a macro layer: navigation renders from one table
  instead of being written three times, each page names itself once, the table
  of contents is generated from the sections that register themselves, and code
  samples are written as real markup rather than 2,256 hand-typed entities.
  This fixed a real drift — three sections in the grid page were missing the
  `section` class and had lost their spacing.


## [0.7.0-rc.0] - 2026-08-21

A prerelease on the `next` dist-tag. `latest` stays on 0.6.0.

The framework itself is **unchanged** from 0.6.0 — `src/ts` and `src/sass` carry
no commits between the two tags, so the built `dist/` is identical. This exists
to exercise the publish pipeline end to end: the `npm-publish` approval gate and
the trusted-publisher identity, which now includes the environment name and had
never been used for a real publish.

### Changed

- `homepage` in `package.json` points at <https://www.expressivecss.com> instead
  of the GitHub readme. Registry metadata is fixed per version, so 0.6.0 keeps
  the old link.


## [0.6.0] - 2026-08-21

Adds the Material 3 canonical pane layouts and an LLM-oriented Material 3
guidelines document. No breaking changes.

### Added

- **Panes** (`.panes`, `.list-detail`, `.supporting-pane-layout`, `.pane-layout`,
  CSS only) — the M3 canonical adaptive layouts. List-detail (360dp list + 1fr
  detail), supporting pane (1fr primary + 360dp supporting, leading or trailing),
  equal, and three-pane. Below 840px one pane shows at a time — the first, or the
  one marked `.active`. The container is an inline-size query container, so a
  layout nested in a narrow column collapses on its own width rather than the
  viewport's. Coplanar by default (full-bleed with an `outline-variant` divider)
  or `.separated` / `.floating` (16dp `surface-container-low` cards, 24dp gap,
  with per-pane `.elevated` and `.outlined`). Panes have anatomy: a `header` is a
  64dp title bar, `main` is the scrolling body, `footer` is a 56dp action bar.
  Sized by `--md-comp-pane-*` tokens.
- **`m3-guidelines.md`** — a companion to `llm.md` covering Material 3 usage,
  anatomy, placement, adaptive design, and component behaviors: what to reach for
  and when, rather than which classes to write.
- A **Panes** documentation page, and a `Panes` section in `llm.md`.

### Fixed

- Badges anchored to an icon mirrored to the wrong side in RTL. The badge is
  positioned with logical `inset-inline-end`, but the `translate(50%, -50%)` that
  centres it on the icon corner is physical, so it pushed the badge inward. It is
  now negated under `:dir(rtl)`.

## [0.5.0] - 2026-08-19

The release that finishes moving the older component set onto Material
Design 3 Expressive. Components with no M3 counterpart are gone, several were
renamed to their M3 names, and the color layer now carries the full role set.
Pre-1.0, so the breaking changes below are not gated behind a deprecation cycle
— but every retired docs URL still 301s to its replacement.

### Added

- **Menu** (`Menu`, `.menu-trigger` + `<menu>`) — M3 vertical menus, replacing
  `Dropdown`. Nested flyout submenus, a selected-item state, a vibrant color
  mode, and per-menu sizing.
- **Navigation bar** (`.navigation-bar`, CSS only) and **navigation rail**
  (`NavigationRail`, `.navigation-rail`, auto-inits) — compact and medium/large
  navigation, with stacked, horizontal, collapsed, expanded, and modal layouts.
- **Bottom sheets** (`.bottom-sheet`, started by `BottomSheets.Init()`) — modal
  and standard variants with drag-to-dismiss; 28dp top corners, 640dp max width.
- **Side sheets** (`.side-sheet`, started by `SideSheets.Init()`) — modal and
  standard variants, 400px wide, drag-to-dismiss from the header or the inner
  24dp edge.
- **Lists** (`.list`) — standard and segmented variants, replacing `.collection`.
- **Dialogs** — basic and full-screen variants on native `<dialog>`, on M3 tokens
  (`surface-container-high`, `on-surface-variant`).
- **Snackbar** (`Snackbar`) — `Toast` under its M3 name, with a reworked options
  object: `snackbarId` replaces `toastId`, `displayLength` accepts `Infinity` to
  stay until the user acts, and defaults to 10000 when an `action` is set.
- **Widescreen layout** — an `xxlarge` breakpoint at 1601px, the `.xxl` grid
  prefix, wider container caps (1920px at `xxlarge`, `.container.wide` 2400px,
  `.container.max` uncapped), and `.hide-on-xxl-only` / `.show-on-xxl`.
- **Slider variants** — `.centered` (active track grows from the midpoint),
  dual-handle ranges in one host, sizes `.s` / `.m` / `.l` / `.xl`, `.stops`
  discrete ticks, and an optional inset leading icon.
- **M3 Expressive color roles** — the surface containers
  (`surface-container-lowest` … `surface-container-highest`), `surface-dim`,
  `surface-bright`, the fixed roles, and `outline-variant`. Utility classes are
  generated from the role list, so every role has both `.role` (fill) and
  `.role-text` (foreground).
- **Badges** — M3 anatomy: a 6dp dot and a 16dp stadium with a label, positioned
  against navigation, list, and sidenav icons.

### Changed

- **Breaking:** `Autocomplete`'s `menuOptions.onItemClick` now receives the clicked
  `li` and is called on the `Menu` instance, matching the documented `MenuOptions`
  contract. It previously received the autocomplete's `<input>` element, so a
  handler written against the documented signature got the wrong node. Handlers
  that used the argument need updating; handlers that ignored it are unaffected.
- App bars separate from the body on scroll with a `surface-container` fill
  instead of elevation, interpolated through the new
  `--md-comp-top-app-bar-scrolled-container-color`.
- The sidenav trigger stays visible at every breakpoint; it used to be hidden at
  `large`, which left an M3 app bar with no leading navigation control.
- Collapsible sections inside the sidenav are now `<details>` / `<summary>`.
- Components were repointed at accurate M3 container roles rather than
  `surface-variant` aliases, which is what fixes their dark-mode contrast.
- **Breaking for direct Sass importers:** component partials were renamed to
  match the components they now hold — `components/_modal.scss` →
  `_dialog.scss`, `_dropdown.scss` → `_menu.scss`, `_collection.scss` →
  `_list.scss`, `_toast.scss` → `_snackbar.scss`. `_collapsible.scss`,
  `_pushpin.scss`, and `_tapTarget.scss` are gone. Only code that `@use`s a
  partial by path is affected — the renames themselves change nothing about the
  compiled CSS, and importing `expressive.scss` still pulls in everything.
- Retired docs routes 301 to their replacements: `/dropdown` → `/menu`,
  `/collections` → `/lists`, `/modals` → `/dialogs`, `/toasts` → `/snackbar`,
  `/range` → `/sliders`, `/collapsible` → `/sidenav`,
  `/feature-discovery` is gone.

### Removed

Every entry here is breaking. The replacement is named where there is one; there
are no compatibility aliases.

- `Dropdown` and `.dropdown-trigger` / `.dropdown-content` — use `Menu` and
  `.menu-trigger`.
- `Toast` — use `Snackbar`.
- `.collection` and its modifiers — use `.list`.
- `Collapsible` and `.collapsible` — use native `<details>` / `<summary>`.
- `Pushpin` and `.pushpin` / `.pin-*` — use `position: sticky`.
- Feature Discovery (`TapTarget`, `.tap-target`). It is not an M3 component.
- `.modal` and its modifiers — dialogs are native `<dialog>` elements.
- `dialog.top` / `dialog.top-sheet`. M3 has no top sheet; use a side sheet or a
  bottom sheet. The unused `--md-comp-basic-dialog-sheet-width` token is gone
  with them.
- `.tabs` nested in a header or app bar as a secondary row. `.tabs` is a
  standalone component; the `.tabs.transparent` app bar variant is gone with it.

[Unreleased]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.15.0...HEAD
[0.15.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.14.1...v0.15.0
[0.14.1]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.14.0...v0.14.1
[0.14.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.13.1...v0.14.0
[0.13.1]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.13.0...v0.13.1
[0.13.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.6.0...v0.7.0
[0.7.0-rc.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.6.0...v0.7.0-rc.0
[0.6.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.4.0...v0.5.0
