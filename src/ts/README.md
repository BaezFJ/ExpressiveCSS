# src/ts

```
index.ts        public entry: re-exports, version, import-time side effects
modular.ts      optional public entry: exports only, explicit initialization
core/           Component base class, Utils, the shared form-associated control
components/     per-element widgets, + index.ts (barrel) and registry.ts
behaviors/      document-level enhancers (Forms, Dialogs) - no per-element instances
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
explicitly (`Snackbar`, `CharacterCounter`).

## The Component contract

```ts
export interface ThingOptions extends BaseOptions { /* … */ }
const _defaults = { /* … */ };

export class Thing extends Component<ThingOptions> {
  static key = 'Expressive_Thing';                            // instance lookup key
  constructor(el: HTMLElement, options: Partial<ThingOptions>) {
    super(el, options);                                       // sets this.options and el.Expressive_Thing
    this.el.addEventListener('click', this._onClick, { signal: this._events.signal });
  }
  static get defaults() { return _defaults; }
  destroy() { /* undo DOM changes */ super.destroy(); }       // aborts _events, clears el.Expressive_Thing
}
```

Listeners that last as long as the instance take `this._events.signal`, so
destroy() needs no removeEventListener calls. Listeners that come and go while
the instance lives, such as an open menu's document handlers or a drag, get
their own `controllerFor(el)` from `core/utils`. It builds the AbortController
from the element's window, because jsdom rejects a signal from another one.

The base class reads `key` to set, look up and clear the instance:
`Thing.getInstance(el)` is inherited and typed on `this`, so it returns a
`Thing`. The base constructor destroys any existing
instance first, so re-initializing an element is safe, then spreads `options`
over `new.target.defaults`. It also spreads `options.i18n` over the default
`i18n`, so passing one string keeps the others. Options read from markup go
into the object passed to `super()`.

`Thing.init(el | els, options)` is inherited. The base `init` is typed on
`this`, so `Thing.init(el)` returns a `Thing`, a list returns `Thing[]`, and the
element and options types come from Thing's constructor and `options`. Type the
constructor's `el` as the widest element `init` should accept.

The `el['Expressive_Thing']` stashing backs `Expressive.Thing.getInstance(el)`,
and page code can read `el.Expressive_Thing` directly. The key was `M_Thing`
in older versions, so anything written against the old
property name needs updating. A WeakMap in the base class would hide it, but
would drop the read-it-off-the-element access that key provides.

## Gotchas

- **Importing the root bundle has side effects.** `index.ts` calls `Forms.Init()`, `Chips.Init()`,
  `Slider.Init()`, `Cards.Init()`, `ExpandingCard.Init()`, `Dialogs.Init()`,
  `BottomSheets.Init()`, `SideSheets.Init()`. Order matters; the delegated
  listeners those install are what several components rely on. `Dialogs.Init()`
  light-dismisses an open `<dialog>` only when both ends of a pointer gesture
  land outside its box — a drag that starts on the dialog cannot close it.
- **Document listeners read `Utils.eventTarget(e)`, not `e.target`.** At the
  document, `e.target` is the shadow host, so delegation that reads it never
  sees an open shadow root's content. Look ids up with `Utils.getElementById`
  and query `el.getRootNode()` rather than `document` for the same reason.
- **The modular entry is inert.** Consumers initialize selected components and
  behaviors explicitly. `scripts/build-esm.mjs` builds both ESM entries and
  internal modules together so constructors are shared across entries and unused
  modules can be removed by consumer bundlers. Keep internal chunks free of
  document setup; package side-effect declarations deliberately exclude them.
  Do not flatten the ESM graph: ES2020 static-field assignments prevent unused
  classes in the same file from being removed. IIFE and CommonJS remain bundled.
- **`AutoInit()` is not automatic.** Callers invoke it themselves (the docs site
  does it on `DOMContentLoaded`). Elements opt out with `.no-autoinit`.
- **Dialogs are native `<dialog>`.** Open with `showModal()`, close with
  `close()`. `Dialogs.Init()` light-dismisses. There is no `Modal` plugin.
  Basic is the default surface; `dialog.max` is the full-screen variant
  (64dp header, no scrim).
- **Bottom sheets are native `<dialog class="bottom-sheet">`.**
  `showModal()` is modal (scrim); `show()` is standard (no scrim).
  `BottomSheets.Init()` drag-dismisses from the top 48dp handle.
  Compact/medium layout; 640dp max, 56dp inset from `small`.
- **Side sheets are native `<dialog class="side-sheet">`.**
  `show()` is standard (divider, no scrim); `showModal()` is modal
  (28dp inner corners, scrim). A `<header>` holds optional back,
  headline, and close. `SideSheets.Init()` drag-dismisses from the
  header or the inner 24dp edge.
- **Carousel defaults to Material 3 multi-browse.** `.uncontained`, `.hero`,
  `.hero.center-aligned`, and `.full-screen` select the other M3 layouts.
  Native tracks use container-aware sizing, fine-pointer dragging, and
  keyboard navigation. Full-screen automatically becomes a horizontal hero
  in landscape or at Expanded widths.
  `destroy()` removes generated labels, size roles, indicators, and wrappers.
- **Menu nested menus are markup.** A `<menu>` inside an `<li>`
  is a flyout. Hover on `(hover: hover) and
  (pointer: fine)`; `.open` is the tap/keyboard switch. Flyouts
  fade and scale; the active surface uses 12dp corners and the parent
  contracts to 8dp. Do not start a second Menu. `closeOnClick` ignores the
  parent row of a submenu. `.selected` / `aria-checked="true"` is the
  tertiary selected item. `.vibrant` is the tertiary color style.
  Standard is the default continuous surface. Add `.grouped` and separate
  item runs with `.gap` to render distinct coplanar surfaces; `.label` is a
  32dp heading. Standard and grouped menus receive
  `menu` / `menuitem` roles, focus their first item when opened (not when
  opened by hover), and keep disabled items focusable but inert.
- **FAB menus use .fab-menu.** JS owns expanded state, click activation, Escape,
  outside dismissal and focus recovery. Hidden actions are inert. Motion is CSS.
- **ScrollSpy is IntersectionObserver.** No window scroll listener and
  no click hijack. Offset is `scroll-margin-block-start` /
  `--md-comp-scrollspy-offset`. Default link lookup compares `href`
  attributes — do not interpolate the section id into a selector.
- **Card reveal is CSS.** `aside` / `.card-reveal` rests at
  `translateY(100%)` (clipped). `aria-expanded="true"` slides it to
  cover the card. Do not write `transform` / `display` / `overflow`.
  `inDuration` / `outDuration` are accepted and ignored.
- **FormSelect is a text field + menu.** The native `<select>` stays
  the form value. JS reuses a parent `.field` or creates one. The
  caret is a CSS-masked `.caret`, not an SVG. `refresh()` rebuilds
  the option list from the native control; it does not tear down
  the Menu. `.browser-default`
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

## Incremental strict checking

`npm run typecheck` also runs `tsconfig.strict.json`. The image URL and spring
utilities currently pass strict checking. Add modules to that config as their
callers and null handling are corrected; the main config still supports legacy
components. Keep `useDefineForClassFields: false` in both configurations.
