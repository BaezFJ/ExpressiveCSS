# design-sync notes — ExpressiveCSS

## What this repo is, for sync purposes

ExpressiveCSS is a **class-based CSS framework**, not a React component library.
There is no React anywhere in `src/ts` or `dist/types`. The 26 PascalCase exports
are DOM-attaching classes (`Sidenav extends Component`, constructed with
`(el, options)`), so the value this design system carries is the **stylesheet,
the M3 token layer, and the guidelines** — not importable components.

- Previews are authored as **plain JSX with framework classes**
  (`<button className="tonal">`), which is exactly how a design consumes the
  framework. They never import from the package.
- `--node-modules` points at `./.ds-sync/node_modules`, not the repo's. The repo
  has no React; the converter needs it to vendor the preview runtime. This is the
  skill's documented scratch-dir fallback.
- Run every converter command **from the repo root** — config paths
  (`cssEntry`, previews) are resolved relative to CWD, and running from a
  subdirectory silently discovers zero previews.

## Gotchas that cost a debugging cycle

- **Fonts.** The framework deliberately ships no Material Symbols font files
  (CLAUDE.md explains why). Designs receive only the `styles.css` @import
  closure, so every icon rendered as its ligature text. `.design-sync/build-css.mjs`
  prepends the Google Fonts @imports to a generated copy of the compiled CSS and
  `cssEntry` points at that. Regenerate it whenever `dist/css` changes — it is
  part of `buildCmd`.
- **CSS-only patterns cannot be cards.** `package-validate.mjs` fails
  `[BUNDLE_EXPORT]` for any component not exported on `window.Expressive`, with
  no config escape. Button, List, Badge, Table, Grid and Panes therefore have no
  card; they are covered by `guidelines/` and the conventions header. A working
  Button preview was built and rendered before hitting this gate — it is kept at
  `.design-sync/rejected/Button.tsx` if the constraint ever changes.
- **Dialogs and sheets need a sized, positioned wrapper.** `dialog` sets
  `max-height: min(70vh, calc(100% - 48px))`; with no containing block that
  computes negative and the dialog collapses to a sliver. Every dialog-based
  preview wraps in a `position: relative` stage with an explicit height.
- **Slider variants live on the `.range` wrapper**, not the input. `s`/`m`/`l`/
  `xl`, `centered` and the inset icon all go on the wrapper; putting them on the
  `<input>` renders identically to plain and reads as "variants render
  identically".
- **Plugin-driven state does not render in cards.** `Range.Init()` (and the other
  `Init()` entry points) run at import, before a card's React tree mounts, so
  anything depending on runtime-set custom properties is never initialized. That
  is why the slider `stops` cell was dropped: its ticks are drawn from
  `--md-comp-slider-active-fraction`, which the plugin sets.
- **Off-canvas components** (`.sidenav` without `sidenav-fixed`, snackbars,
  tooltips, open menus) need `open()` and cannot render statically. Prefer the
  docked/static form where one exists.

## Known render warns

- `[FONT_REMOTE]` naming `"Regular"` and `"Medium"` — **false positives**. Those
  strings are only ever *values* of `--md-sys-typescale-*-font-family-style`
  tokens and are never used in a `font-family`; the Sass says so explicitly.
- `[FONT_REMOTE]` naming `"Oxygen-Sans"` — also expected: one entry in the
  `$font-stack` system stack.
- 20 components ship the **floor card** by design (the niche plugin surface:
  AutoInit, Waves, Forms, ScrollSpy, CharacterCounter, Parallax, Lightbox,
  Autocomplete, FormSelect, Datepicker, Timepicker, Carousel, Menu, Snackbar,
  Tooltip, FloatingActionButton, Range). They are authorable on any re-sync.

## Re-sync risks

- `.design-sync/.cache/expressive-ds.css` is **generated and gitignored**. A
  fresh clone must run `node .design-sync/build-css.mjs` before the converter, or
  `cssEntry` will not exist. It is in `buildCmd`, so running that is enough.
- The Google Fonts URL in `build-css.mjs` pins the Material Symbols axis ranges.
  If the framework's icon axes change, that URL needs updating or icons will load
  without the right variation settings.
- The scratch React (`.ds-sync/node_modules`) is a converter dependency only and
  is never shipped to consumers. Do not add React to the repo's own deps because
  of it.
- Previews use inline `style` only for layout scaffolding (stages, grids). All
  component appearance comes from framework classes — if a preview ever needs
  inline styling to look right, that is a framework finding, not a preview fix.

## Framework findings surfaced by this sync

- **`llm.md` documents `.btn-floating`, which does not exist.** It appears 16
  times in `llm.md` (including the claim at line 1798 that it is "the class the
  Floating Action Button menu looks up") but **0 times in `dist/css/expressive.css`
  and 0 times in `src/ts/`**. The docs site was migrated to the real vocabulary —
  `button extra circle` (56dp) and `button extra circle small` (40dp) — and
  `llm.md` was not. Authoring the FAB preview from `llm.md` produced unstyled
  square swatches. Because `llm.md` ships as a guideline document, an agent
  following it emits FABs that render unstyled. Same applies to the
  `btn-floating halfway-fab` example in llm.md's Cards section and the Pulse and
  Transitions sections.

## Why ~26 components have no card

`package-validate.mjs` fails `[BUNDLE_EXPORT]` for any component that is not a
function on `window.Expressive`, and there is no config override (it is a bare
`fail()` in the script). ExpressiveCSS's CSS-only surface — App bar, Navigation
bar, Panes, Footer, Breadcrumbs, Pagination, Buttons, Lists, Badges, Toolbars,
Preloader, Table, Grid, Typography, Color, Icons, Elevation, Helpers, and the
form controls — exports nothing, so none of it can have a preview card. A
working Button card was built and rendered before being rejected by that gate;
it is kept at `.design-sync/rejected/Button.tsx` (committed, with a README explaining why).

The decision (Javier, 2026-08-21) was **not** to add a design-system-only React
wrapper layer to unlock cards — it would create a second API surface that drifts
from the framework. Instead the conventions header carries the canonical markup
for each of those components inline, so the design agent has the exact pattern
without a card. That is why `conventions.md` is ~7k characters rather than the
2-4k the skill suggests: the "Patterns with no preview card" section is doing
the job a card gallery would.

**If you revisit this**: the header is the thing to keep current. Any markup
change to a CSS-only component must be mirrored there, because nothing validates
it against the framework automatically — run the class audit in this file's
history (compare every `class="..."` token in conventions.md against
`ds-bundle/_ds_bundle.css`) after editing.

## The seven components that keep the floor card

Authoring was attempted or considered for every one; these are the ones where a
static card would have been misleading rather than merely sparse:

- **FormSelect** — the plugin *replaces* the native `<select>` with a generated
  `.field` + `<menu>`. Un-enhanced, the floating label sits on top of the
  selected value and renders as garbled overlapping text. A preview was built,
  seen to be wrong, and withdrawn. The same select was removed from the Forms
  preview for the same reason.
- **Carousel** — `.carousel-item`s are positioned by the plugin. Statically they
  stack, so a three-image carousel renders as one image and reads as a plain
  picture. Withdrawn after seeing it.
- **Datepicker / Timepicker** — the calendar and clock dial are built into the
  DOM by the plugin. Reproducing that markup by hand would be a lookalike, which
  the skill explicitly rules out.
- **Tooltip** — the tooltip element is created on hover.
- **Waves** — a ripple that exists only during interaction; a static card would
  be indistinguishable from a plain button.
- **AutoInit** — a function, not a visual component.

Everything else is authored. If any of these gains a static resting state in the
framework, it becomes authorable on the next re-sync.
