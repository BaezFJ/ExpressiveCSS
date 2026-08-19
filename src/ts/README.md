# src/ts

```
index.ts        public entry: re-exports, version, import-time side effects
core/           Component base class, Utils, Bounding/Edges types
components/     per-element widgets, + index.ts (barrel) and registry.ts
behaviors/      document-level enhancers (Forms, Waves) - no per-element instances
plugins/        helpers that are not Components (DockedDisplayPlugin)
```

Imports point one way: `components/` and `behaviors/` reach into `core/`, never
the reverse. Cross-component imports (`./menu` from `select.ts`) are fine.

## Adding a component

1. Write `components/thing.ts` (see the contract below).
2. Add one line to `components/index.ts`:
   `export { Thing } from './thing';`
3. If it should start automatically, add one line to `components/registry.ts`:
   `Thing: { component: Components.Thing, selector: '.thing' },`

That is the whole wiring. The `AutoInitOptions` type and the `AutoInit()` calls
are both derived from the registry table, so there is no parallel list to keep
in sync — the old barrel had four hand-synchronized edit sites, and forgetting
one failed silently at runtime.

Leave a component out of the registry when it should only ever be constructed
explicitly (`Snackbar`, `CharacterCounter`, `Range`).

## The Component contract

```ts
export interface ThingOptions extends BaseOptions { /* … */ }
const _defaults = { /* … */ };

export class Thing extends Component<ThingOptions> {
  constructor(el: HTMLElement, options: Partial<ThingOptions>) {
    super(el, options, Thing);
    this.el['Expressive_Thing'] = this;                       // instance lookup key
    this.options = { ...Thing.defaults, ...options };
  }
  static get defaults() { return _defaults; }
  static init(els, options = {}) { return super.init(els, options, Thing); }
  static getInstance(el: HTMLElement): Thing { return el['Expressive_Thing']; }
  destroy() { this.el['Expressive_Thing'] = undefined; /* remove handlers */ }
}
```

`getInstance` and `destroy` throw in the base class — a subclass that omits
them is broken, not defaulted. The base constructor destroys any existing
instance first, so re-initializing an element is safe.

The `el['Expressive_Thing']` stashing backs `Expressive.Thing.getInstance(el)`,
and page code can read `el.Expressive_Thing` directly. The key was `M_Thing`
while this was a Materialize fork, so anything written against the upstream
property name needs updating. It is duplicated in every component; replacing it
with a WeakMap in the base class would be cleaner, but would drop the
read-it-off-the-element access that key provides.

## Gotchas

- **Importing the bundle has side effects.** `index.ts` attaches document-level
  key/focus listeners and calls `Forms.Init()`, `Chips.Init()`, `Waves.Init()`,
  `Range.Init()`, `Cards.Init()`, `Dialogs.Init()`, `BottomSheets.Init()`.
  Order matters; the delegated
  listeners those install are what several components rely on. `Dialogs.Init()`
  light-dismisses an open `<dialog>` only when both ends of a pointer gesture
  land outside its box — a drag that starts on the dialog cannot close it.
- **`AutoInit()` is not automatic.** Callers invoke it themselves (the docs site
  does it on `DOMContentLoaded`). Elements opt out with `.no-autoinit`.
- **Dialogs are native `<dialog>`.** Open with `showModal()`, close with
  `close()`. `Dialogs.Init()` light-dismisses. There is no `Modal` plugin.
- **Bottom sheets are native `<dialog class="bottom-sheet">`.**
  `showModal()` is modal (scrim); `show()` is standard (no scrim).
  `BottomSheets.Init()` drag-dismisses from the top 48dp handle.
  Compact/medium layout; 640dp max, 56dp inset from `small`.
- **Parallax motion is CSS.** `animation-timeline: view()` on the clip; the
  component class is AutoInit/getInstance/destroy only and attaches no
  scroll listener.
- **Carousel has two layouts.** `.flat` (and `.carousel-slider` / `fullWidth`)
  is a CSS scroll-snap track. The default remains the 3D coverflow, driven
  by pointer events and a shared resize listener. `destroy()` removes
  generated indicators.
- **Sidenav nested sections are HTML.** `<details>` / `<summary>` inside
  a `.sidenav`; same `name` is an accordion. There is no Collapsible
  plugin — the drawer styles the summary as a destination row.
- **Tap target (Feature Discovery) is a popover + CSS.** JS writes
  `--md-comp-tap-target-x` / `-y` / `-origin-size` and `data-edge` from
  one origin rect. The wrapper uses `popover="auto"` when the platform
  has it. Do not build a `#${data-target}` selector.
- **Menu nested menus are markup.** A `<menu>` inside an `<li>`
  is a flyout. Hover / `:focus-within` on `(hover: hover) and
  (pointer: fine)`; `.open` is the tap/keyboard switch. Flyouts
  fade and scale; the open surface rounds up and the parent rounds
  down. Do not start a second Menu. `closeOnClick` ignores the
  parent row of a submenu. `.selected` / `aria-selected` is the
  tertiary selected item. `.vibrant` is the tertiary color style.
  `.gap` groups items; `.label` is a 32dp heading.
- **FAB speed dial is CSS.** `.active` (and `:hover` when the pointer
  can hover) opens the menu. `.click-to-toggle` and `.direction-*` are
  markup switches. JS toggles the class, Escape, and click-outside.
  Do not write `transform` / `opacity` onto the children. Toolbar mode
  is `.toolbar.active` — no backdrop scale math.
- **ScrollSpy is IntersectionObserver.** No window scroll listener and
  no click hijack. Offset is `scroll-margin-block-start` /
  `--md-comp-scrollspy-offset`. Default link lookup compares `href`
  attributes — do not interpolate the section id into a selector.
- **Sidenav overlay is a modal `<dialog>`.** JS wraps a `ul.sidenav` in
  `dialog.sidenav-overlay` (or the element is already a dialog).
  `showModal()` / `::backdrop` / Escape replace the overlay div, body
  overflow lock, and tabindex carpet bomb. Drag writes
  `--md-comp-nav-drawer-shift`; do not write `transform` or `opacity`.
  `.sidenav-fixed` is `matchMedia('(width >= 993px)')`, not a resize
  `open()`. `inDuration` / `outDuration` / `preventScrolling` are
  accepted and ignored.
- **Card reveal is CSS.** `aside` / `.card-reveal` rests at
  `translateY(100%)` (clipped). `aria-expanded="true"` slides it to
  cover the card. Do not write `transform` / `display` / `overflow`.
  `inDuration` / `outDuration` are accepted and ignored.
- **FormSelect is a text field + menu.** The native `<select>` stays
  the form value. JS reuses an existing `.field` / `.input-field` or
  creates `.select-wrapper.field`. The caret is a CSS-masked `.caret`,
  not an SVG. `refresh()` rebuilds the option list from the native
  control; it does not tear down the Menu. `.browser-default`
  skips JS; `@supports (appearance: base-select)` only paints that
  native path. Do not give menu checkboxes the 56dp field chrome.
- There is no linter config, though some files still carry `@typescript-eslint`
  disable comments from upstream.

## Tests

`npm test` (jsdom + `node:test`, in `tests/`). It runs against the built
`dist/js/expressive.mjs`, so the script rebuilds the ESM bundle first.

A new auto-initialized component needs one entry in `tests/fixtures.js` with the
minimal markup it expects — that table is written by hand rather than derived
from `registry.ts`, so a wrong selector or a mis-bound class fails the suite
instead of being mirrored by it.

jsdom has no layout engine: assert on classes, structure and text, never on
measured geometry, transitions or visibility. Environment gaps are shimmed in
`tests/setup.js` (notably `innerText`, which jsdom does not implement and
`FormSelect` relies on).
