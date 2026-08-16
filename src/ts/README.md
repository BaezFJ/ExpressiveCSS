# src/ts

```
index.ts        public entry: re-exports, version, import-time side effects
core/           Component base class, Utils, Bounding/Edges types
components/     per-element widgets, + index.ts (barrel) and registry.ts
behaviors/      document-level enhancers (Forms, Waves) - no per-element instances
plugins/        helpers that are not Components (DockedDisplayPlugin)
```

Imports point one way: `components/` and `behaviors/` reach into `core/`, never
the reverse. Cross-component imports (`./dropdown` from `select.ts`) are fine.

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
explicitly (`Toast`, `CharacterCounter`, `Range`).

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
  `Range.Init()`, `Cards.Init()`. Order matters; the delegated listeners those
  install are what several components rely on.
- **`AutoInit()` is not automatic.** Callers invoke it themselves (the docs site
  does it on `DOMContentLoaded`). Elements opt out with `.no-autoinit`.
- **`modal.ts` is deliberately gutted** — marked obsolete for versions > 2.1.1,
  with empty method bodies and an experimental `static create()` building a
  native `<dialog>`. Those empty methods are a rewrite in progress, not bugs.
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
