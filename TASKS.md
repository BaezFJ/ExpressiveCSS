# TASKS: Sass review fixes for src/sass

Fix the issues found by the 2026-10-26 CSS review of `src/sass` (140 partials, branch `t3/spec-next-roadmap-phase-3`). Work one task per iteration, highest priority first.

## Context

- The stylesheet uses ExpressiveCSS's own Sass system. It has no Tailwind or Bootstrap. Utilities live in `src/sass/utilities/`, and shared mixins live in `src/sass/abstracts/`.
- Read `src/sass/README.md` before editing. It covers the cascade layers, the `!important` policy, the `:root`/`:host` pairing and the `@extend` rule.
- A box that holds text or an icon is sized with `rem()` from `abstracts/_mixins.scss`, written as `#{rem(24px)}` inside a custom property. Borders, gaps and insets stay in px. `tests/css.js` has a matching `rem()` helper for assertions.
- `abstracts` is forwarded to consumers. Do not remove or rename a mixin, mixin parameter or `!default` variable. Before cutting one, compile a one-line consumer probe against a HEAD copy of the tree.
- A worktree without `node_modules` needs `npm ci` first.

## Validation (every task)

1. `npm run build:css` compiles without warnings.
2. Run the tests that cover the touched partial, for example `node --test tests/<component>*.test.js`. Then run `npm run verify` once per task group. Never run two test suites at once.
3. Any change to the compiled CSS size needs its gzip line in `tests/selective-builds.test.js` updated and reviewed.
4. Look at the touched component on its docs page at 16px and at a 200% browser font size. Do not report a visual check that did not run.
5. Commit with a Conventional Commit message and no AI attribution.

## HIGH priority

- [x] **H1. Icon glyphs sized in px.** The base icon rule uses `font-size: rem(24px)` (`components/_icons-material-design.scss:40`), but these icon rules use px, so their icons don't grow with the reader's font size. Change each to `rem(<same px>)`, and change the matching `width`/`height` on the same box where it sizes the icon:
  - `abstracts/_mixins.scss:213` (`header-icon-action`, 24px)
  - `components/_alert.scss:63` (24px)
  - `components/_command-palette.scss:90` (20px)
  - `components/_dialog.scss:99-101` (24px font, width and height)
  - `components/_list.scss:113` (20px)
  - `components/_map.scss:173` (20px, MapLibre popup close button)
  - `components/_message.scss:105` (20px)
  - `components/_snackbar.scss:127`, `:196` (24px)
  - `components/_timeline.scss:104` (18px)
  - `components/_tree.scss:59` (20px)
  - `components/forms/_drop-zone.scss:44` (32px)
  - `components/forms/_fieldset.scss:54` (18px)
  - `components/forms/_file-input.scss:45` (20px)

  Done when no `font-size: <n>px` remains under `src/sass/components` or `abstracts` apart from `$root-font-size`, and any test that asserted the old px value now asserts the `rem()` string.
- [ ] **H2. Chip text box in px.** `components/_chips.scss:9` sets `--font-size: 14px`, `:10` sets `--font-size-icon: 18px`, `:22` sets `min-height: 32px`, and the chip input at `:172-173` uses `font-size: 16px; height: 32px`. Change the label size to `var(--md-sys-typescale-label-large-font-size)`, which is 14px at the default root size. Change the icon size, the 32px heights and the input font size to `rem()`. Keep the `24px` avatar and delete-target boxes at `:91` and `:105` in step with the icon size.
- [x] **H3. Timepicker tick text in px.** `components/_timepicker.scss:177` sets `font-size: 15px` on `.timepicker-tick`. Change it to `rem(15px)`. Leave the 40px tick box and the 270px plate at `:146-147` and `:173-174` alone, because the Timepicker script positions ticks from `dialRadius` in px.

## MEDIUM priority

- [ ] **M1. Map popup shadow skips the elevation token.** `components/_map.scss:143` writes `box-shadow: map.get($elevations, "2") !important`, which inlines the literal shadow, so a theme that overrides `--md-sys-elevation-level2` does not reach the popup. Replace it with `@include z-depth("2", true);`, which emits `var(--md-sys-elevation-level2) !important`. The flag stays because MapLibre sets its own `!important` shadow.
- [ ] **M2. Hand-written type roles missing letter-spacing.** `components/_navbar.scss:255-258` writes body-large and `components/_cards.scss:317-320` writes title-medium as four separate declarations, which leaves out the role's `letter-spacing`. Replace each group with `@include typescale("body-large")` and `@include typescale("title-medium")`. Check the navbar search field and the card media overlay text visually, since letter-spacing changes.
- [ ] **M3. Chart base repeated for every chart type.** `@mixin chart($name)` (`abstracts/_mixins.scss:580-793`) emits about 5.9 KB of rules per chart. Eleven partials include it (line, column, bar, pie, radar, scatter, mixed, heatmap, funnel, treemap, sankey). Most of those rules don't depend on `$name`: the legend, labels, tooltip, cursor and visually hidden table. The review estimated the gzip cost of the repetition at about 2.9 KB of the 90 KB sheet. That is an upper bound, so measure before changing anything.
  1. Measure the real saving. Hoist the name-independent rules into a private mixin that writes once, the same way `$_chart-toggle-written` already handles `_chart-toggle` (`:526-584`). Key its selectors on `:is(.line-chart, .column-chart, ...)` with every chart name listed.
  2. Keep the change only if it saves at least 1 KB gzip and `tests/selective-builds.test.js` still passes for a build that loads a single chart. Otherwise revert and record the measured numbers in the learnings log.
  3. Each `:is()` must contain only single-class arguments, so specificity stays (0,1,0) per chart.

## LOW priority

- [ ] **L1. Generic custom property names on `.chip`.** `components/_chips.scss:9-11` declares `--padding`, `--font-size` and `--font-size-icon`. Every other component uses `--md-comp-<name>-*`, and these generic names inherit into everything inside a chip. Rename them to `--md-comp-chip-padding`, `--md-comp-chip-label-text-size` and `--md-comp-chip-icon-size`. A search of the docs and `llm.md` found no use of the old names, but add a CHANGELOG line because a page may have overridden them.
- [ ] **L2. Motion durations outside the tokens.** `components/_timepicker.scss:217` uses `transition: opacity 175ms` and `components/_expanding-card.scss:156` uses `transition-delay: 180ms`. Use `var(--md-sys-motion-duration-short3)` (150ms) for the timepicker. For the expanding card, read the card's existing `--md-comp-expanding-card-content-duration` token or add a delay token next to it. Keep the reduced-motion overrides working.
- [ ] **L3. Ellipsis triple written by hand 15 times.** `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` appears in `components/_panes.scss:257`, `_treemap-chart.scss:89`, `_navbar.scss:117`, `:449`, `:464`, `_calendar.scss:116`, `forms/_select.scss:167`, `_heatmap-chart.scss:108`, `_bar-chart.scss:234`, `_radial-chart.scss:184`, `:260`, `_pie-chart.scss:183`, `:260`, and `abstracts/_mixins.scss:710`, `:870`. This is optional. Add `@mixin truncate` next to `visually-hidden` in `abstracts/_mixins.scss` and include it at those sites. The compiled CSS stays the same, so skip this task if the iteration budget is tight.

## Reviewed and left alone

These matched the review's patterns but are intentional:

- `!important` in utilities, reduced-motion resets, print rules, `.scale-transition`, the forced-colors button rule and the MapLibre overrides. `src/sass/README.md` documents each one.
- `#snackbar-container` and `#lightbox-overlay`. Scripts create these IDs, and they are public markup.
- `button.drag-handle`, `table.calendar` and `img.responsive-img`. They are qualified on purpose, and the comment at `_drag-handle.scss:95` explains why.
- `@extend` of same-file placeholders in `_navbar.scss` and `_shapes.scss`, which the README allows.
- Single-use mixins and variables. They are forwarded consumer API (`btn-*`, `bp-between`), loop helpers (`_window`, `_path`) or named data URLs and selector lists. `$motion-fast-spatial` stays for compatibility.
- The long `$_not-btn` exclusion list in `_buttons.scss`. It sits inside `:where()` and adds no specificity.
- The literal shadow in `menu.grouped`'s `drop-shadow()`, because a filter cannot take a multi-layer `box-shadow` token. The color picker's `#fff` and `#000` and the aura's rainbow hues are meant to be literal.

## Learnings log

Record anything a later iteration needs: tests that asserted px values, gzip deltas, visual regressions, and tasks reverted with the reason.

- 2026-10-26, H1 and H3 (roadmap Phase 52, branch `fix/rem-icon-font-sizes`). One test asserted a px value: `tests/regressions.test.js` expected `font-size: 24px` on the side sheet header icon, which comes from `header-icon-action`. It now expects `1.5rem`.
- `components/forms/_file-input.scss` had no `@use "../../abstracts" as *;`, so Sass read `rem(20px)` as the CSS remainder function and failed with "2 arguments required". Check the import before adding `rem()` to a partial.
- A rem badge needs rem clearances. The timeline row padding and connector offsets and the map popup's end padding became `calc()` of px and `rem()`, or text overlapped the grown badge and close button.
- CSS gzip went from 90,048 to 90,074 bytes (+26).
- The Codex review found two short timeline events overlapping their grown badges by 8px at a 32px root. The icon row got `min-block-size: calc(rem(32px) + 8px)`, which is 40px at 16px, the old height. The guard test now also catches a px `font:` shorthand.
- The Sass edits made seven current `capabilityReview` pins stale (tree, message, scatter-chart through `_mixins.scss`, timeline, alert, command-palette, drop-zone). They were re-pinned to the branch file hashes. Stale pins were left alone.
- H2 (chips) remains. `tests/rem-font-sizes.test.js` exempts `components/_chips.scss` until it lands.
