# Changelog

Notable changes to ExpressiveCSS. Versions follow [semver](https://semver.org/);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Start of the HTML semantics sweep. Component markup is being corrected so that
the element states what a component is, with the ARIA that element choice
implies. Scope is deliberately bounded: keyboard interaction, focus management
and colour contrast are **not** part of it.

The sweep is breaking, and lands over several changes before 0.8.0. Legacy
markup keeps rendering — nothing warns at runtime — so each **Migration** entry
below is the whole story for that component.

### Added

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

  **Migration.** `.searchbar`, the pre-1.0 Materialize navbar search field,
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
  | (not an M3 component) | `.slider` / `Slider` | `.slideshow` / `Slideshow` |

- **`Slider` changed meaning, and that one is a break.** It was the image
  slideshow; it is now the range control, because that is what M3 calls a
  slider. Aliasing it would have defeated the rename. In *markup* nothing
  breaks — a `.slider` holding a range input is the slider, one holding
  `.slides` is still the slideshow, so both kinds of pre-0.8.0 markup keep
  working. In *script*, `Expressive.Slider.init()` now starts a range control
  rather than a slideshow: call `Expressive.Slideshow` instead.
  `Expressive.Range` still resolves, to the renamed `Slider`.
- **`.field` deliberately did not become `.text-field`.** M3 names the
  component "Text fields", but the same container wraps `<select>`,
  autocomplete and file inputs, so the M3 name would be wrong for most of what
  it does.
- Sass partials moved with their components: `_sidenav` → `_navigation-drawer`,
  `_slider` → `_slideshow`, `forms/_range` → `forms/_slider`, `_preloader` →
  `_progress`.
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

- **Slideshow is gone, and Carousel takes the case.** Charter work for 1.0.0,
  like Parallax and Pulse below. M3 has no slideshow — its Carousel is the
  component for a band of media — and once Carousel could advance on its own
  the two expressed one concept in 590 lines of duplicate. Deleted outright:
  `components/_slideshow.scss`, `components/slideshow.ts`, the `slideshow`
  `semantics.json` row, and the docs coverage on the Media page.
  `Expressive.Slideshow` no longer resolves. **There is no alias**, because an
  alias keeps both concepts alive while pretending one of them died.

  **`.slider` is unambiguous again**, which is the bonus worth stating. 0.8.0
  gave `.slider` to M3's range control while the slideshow still held it, so
  the two were told apart by what they contained —
  `.slider:has([type='range'])` against `.slider:not(:has([type='range']))`.
  Both halves are gone with the component: `.slider` is the range control and
  nothing else, and nothing in the sheet asks what a `.slider` holds. The range
  control itself is otherwise untouched.

  **Migration.** Carousel with a fixed `height` reproduces the layout — the
  height sizes the track and the indicators take their own row beneath it:

  ```html
  <!-- before -->
  <div class="slideshow">
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
  Expressive.Slideshow.init(el, { height: 400, indicators: true, interval: 6000 });
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

- **Parallax and Pulse are gone**, with no successor. This is charter work for
  1.0.0 rather than part of the semantics sweep above. Both were decorative
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
  new check below. The time picker's AM/PM buttons referenced Materialize's
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
  tools and models read, and several sections still carried Materialize-era
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

The release that finishes moving the vendored Materialize surface onto Material
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

[Unreleased]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.6.0...v0.7.0
[0.7.0-rc.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.6.0...v0.7.0-rc.0
[0.6.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/BaezFJ/ExpressiveCSS/compare/v0.4.0...v0.5.0
