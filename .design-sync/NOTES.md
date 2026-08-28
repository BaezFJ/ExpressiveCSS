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
- **1 component ships the floor card**: AutoInit, which is a function and has
  no visual form. Everything else is authored. This line has been wrong twice —
  it once said 18, then 6 — so read `.render-check.json`'s `fallbackCard` flag
  rather than trusting the number written here.

## 2026-08-28 re-sync

- The framework gained `ExpandingCard` and `NavigationDrawer` as bundle exports
  and dropped `Parallax` and `Waves`; the diff removed 12 remote paths for the
  latter two. Both new components were authored rather than left on the floor
  card — `NavigationDrawer` because it is the canonical M3 name whose *alias*
  (`Sidenav`) already had a rich card, which reads backwards in the picker.
- **`navigation-drawer-fixed` is the docked form**, the same trick
  `Sidenav.tsx` uses: `position: static; transform: none` on the `<ul>` so it
  renders in place instead of waiting on `open()`.
- **ExpandingCard's resting state is the compact article.** Its
  `<dialog class="expanding-card-dialog">` renders nothing while closed, so the
  full contract can stay in the preview and the card still shows the feed item.
- The class audit (compare every `class="..."` token in `conventions.md`
  against `ds-bundle/_ds_bundle.css`) ran clean: 27/27 resolve. Only
  `aria-selected` and the spacing infixes `t`/`b`/`l`/`r`/`x`/`y` fail the
  naive backtick sweep, and neither is a class. Watch `.expanding-card*` and
  `.navigation-drawer*` on the next run — they are new vocabulary.

## 2026-08-28, later: the floor cards came off

Five of the six floor cards were authored. The blocker recorded above —
"plugin-driven state does not render in cards" — was **too broad**. It is true
that the `Init()` entry points run at import, before a card's React tree
mounts. It does not follow that the plugin cannot run: a preview can call the
component's own `init()` from a `useEffect`, which drives the real plugin after
mount. That is not a lookalike and does not violate the skill's rule against
hand-written stand-ins — it is the shipped component initializing itself, one
tick later than usual.

The pattern, in every one of the five:

```tsx
const ref = useRef<HTMLElement>(null);
useEffect(() => {
  const inst = (window as any).Expressive.<Component>.init(ref.current, options);
  return () => inst?.destroy?.();
}, []);
```

`window.Expressive` is guaranteed present: `emit.mjs` loads `_ds_bundle.js`
before `_preview/<Name>.js`, and React effects run well after both.

Per component:

- **Carousel** — `Carousel.init()` on mount. The three layouts (multi-browse,
  hero, uncontained) then render as three visibly different item ladders.
- **Datepicker** — no init trick needed beyond `openByDefault: true`, which
  llm.md already documents as "the reliable way to show it". The claim above
  that it could only ever be a lookalike was wrong; the option was always there.
  Use a fixed `defaultDate` so the card does not change month on every capture.
- **Timepicker** — the default options already show the clock inline. Init on
  mount is the whole fix.
- **FormSelect** — init fixes the garbled overlap at the root, because the
  overlap *was* the un-enhanced state. `inst.menu.open()` opens the generated
  menu, which is the half of Select worth showing.
- **Tooltip** — no plugin needed. The bubble is gated on
  `:hover, :focus-visible, :focus-within` (`_tooltip.scss`), and a programmatic
  `.focus()` satisfies `:focus-within`. One activator per cell, since only one
  element can hold focus.

**AutoInit keeps its floor card and always will** — it is a function, not a
visual component. Any card for it would be a fabrication.

### What cost a cycle

- **A variant cell that renders identically to another is a failed cell**, not a
  sparse one. `disableWeekends: true` looks exactly like the plain calendar
  because the sheet does not style disabled days distinctly; it was replaced
  with `isDateRange`, which shows the highlighted band. Check the axis actually
  varies before grading.
- **The `left`-positioned tooltip is clipped** by the default stage padding —
  it needs ~140px of inline room, not 24px.
- **`.timepicker-container` does not stretch to contain its dial.** At a
  constrained wrapper width the dial sits outside the panel's background; 460px
  and 620px produced byte-identical captures, so the wrapper is not what
  controls it. Left unconstrained, where the panel and the input agree. This is
  a **framework finding**, not a preview problem — the panel should size to its
  content.

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
  `btn-floating halfway-fab` example in llm.md's Cards section and the
  Transitions section.

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

## The one component that keeps the floor card

**AutoInit** — a function, not a visual component. There is nothing to render
and any card would be a fabrication. It stays on the floor permanently.

The other five that used to sit here — FormSelect, Carousel, Datepicker,
Timepicker, Tooltip — were all authored on 2026-08-28 using the init-on-mount
pattern documented above. The reasoning that kept them here ("the plugin builds
the DOM, so a static card can only be a lookalike") conflated *the plugin has
not run* with *the plugin cannot run*. A preview can run it.
