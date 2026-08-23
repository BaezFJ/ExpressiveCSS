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
