# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

RoutePlateCSS is a new front-end framework being grown out of a vendored copy of MaterializeCSS v2.2.2 source (`src/ts` + `src/sass`), with a Flask app in `docs/` intended to become the documentation/showcase site.

The public surface is rebranded. Instances are stashed on elements as `el['RoutePlate_<Component>']`, the IIFE global is `RoutePlate`, `src/ts/index.ts` exports `version = '0.1.0'` (tracking package.json), and the Materialize-branded markup classes are gone:

| Upstream | RoutePlate |
| --- | --- |
| `Materialbox` / `.materialboxed` / `#materialbox-overlay` | `Lightbox` / `.lightboxed` / `#lightbox-overlay` |
| `.materialize-textarea` | `.routeplate-textarea` |
| `.materialize-red` (+ shades) | `.routeplate-red` |
| `el['M_<Component>']`, global `M` | `el['RoutePlate_<Component>']`, global `RoutePlate` |

**`.material-icons` and `.material-symbols-*` are deliberately untouched** — they are Google's icon-font class names, not Materialize's. Consumers load Google's stylesheet, which defines them; renaming ours would only desynchronize the two. The `--md-sys-*` / `--md-ref-*` tokens are Material Design 3 spec names for the same reason, as is `components/_icons-material-design.scss`.

Links to `github.com/materializecss/materialize` issues in code comments are real upstream references and should stay.

## Build commands

Framework build is npm-based (dart-sass + esbuild + tsc). `npm install` first.

```bash
npm run build          # css + js + type declarations -> dist/
npm run build:css      # sass -> dist/css/routeplate.css (+ .min.css, source maps)
npm run build:js       # esbuild -> dist/js/routeplate.{mjs,cjs,js,min.js}
npm run build:types    # tsc --emitDeclarationOnly -> dist/types/
npm run typecheck      # tsc --noEmit, no output
npm test               # rebuild the ESM bundle, then run the jsdom suite
npm run test:run       # run tests against the existing dist/ bundle
npm run watch          # sass --watch + esbuild --watch in parallel
npm run clean          # remove dist/
```

`npm test` runs a single test file with `node --test path/to/file.test.js`, or filter by name with `node --test --test-name-pattern "Collapsible"`.

Entry points are `src/sass/routeplate.scss` and `src/ts/index.ts`. The IIFE bundle exposes the global `RoutePlate` for `<script>` usage (`RoutePlate.AutoInit()`, `RoutePlate.Modal.getInstance(el)`).

Docs site (uv + Flask, Python ≥ 3.14):

```bash
uv sync
uv run flask --app docs/app.py run --debug         # http://127.0.0.1:5000
```

Notes:

- Tests are `node:test` + jsdom in `tests/`, run against the **built** `dist/js/routeplate.mjs` — so a stale bundle tests stale code; `npm test` rebuilds first. `tests/setup.js` owns the jsdom environment and its shims (`innerText`, `matchMedia`, element constructors); `tests/fixtures.js` is a hand-written table of markup per auto-init component, deliberately independent of `components/registry.ts` so a wrong selector fails the suite.
- There is no linter. Several files carry `@typescript-eslint` disable comments inherited from upstream with no ESLint config behind them.
- `useDefineForClassFields` is deliberately `false` in `tsconfig.json`: the vendored components declare fields that the constructor assigns after `super()`, and define semantics would reset them to `undefined`.
- `watch:js` uses `--watch=forever`; plain `--watch` makes esbuild quit as soon as stdin closes, which silently kills it under `run-p`.
- The build targets `es2020` and emits no vendor prefixes — no autoprefixer/postcss step exists. The Sass already relies on modern CSS (`color-mix()`, custom properties).

## Sass architecture

**Read `src/sass/README.md` before touching styles** — it is the working guide (layer map, the two rules, where new code goes). Summary:

`src/sass/routeplate.scss` is the entry point and forwards five layers in cascade order: `abstracts` (inert) → `tokens` → `utilities` → `base` → `components`. Each layer has an `_index.scss` that forwards its own files; the entry file is the only place load order is decided.

Two hard invariants, both learned from bugs:

- **Partials import `abstracts` and nothing else** (`@use "../abstracts" as *;`, one line, every file). `abstracts/` must never emit a selector.
- **No `@extend` across files.** `@extend` only resolves if the extending file loads the defining module, which is why components used to `@use` CSS-emitting files and let the dependency graph — not the entry point — decide output position. Use `@include z-depth("1")` or write the declaration directly. Same-file `@extend` and placeholders are fine.

Two color systems coexist:

1. **Material Design 3 tokens** — `tokens/_reference.scss` declares raw ramps (`--md-ref-palette-primary40`) plus resolved `--md-sys-color-*-light` / `-dark` pairs; `tokens/_theme.scss` maps those onto the live `--md-sys-color-*` names three times: `:root, :host` default (light), `@media (prefers-color-scheme: dark)`, and explicit `:root[theme='light'|'dark']` overrides. `utilities/_colors.scss` exposes them as utility classes (`.primary`, `.on-surface-text`, …). New styling should consume `--md-sys-color-*`.
2. **Legacy Materialize palette** — `abstracts/_palette.scss` holds the `$colors` map and `colorFunc($color, $type)`; `utilities/_palette-classes.scss` generates the `.red.lighten-2` helpers from it. Consolidating these two systems is the next open decision.

Other things worth knowing:

- `abstracts/_mixins.scss` (`btn`, `btn-filled`, `btn-tonal`, `btn-outlined`, `btn-flat`, `btn-disabled`, `focus-visible`) builds states with `color-mix()` over `--md-sys-color-*`.
- **Translucent colors use `color-mix(in srgb, var(--token) N%, transparent)`, never `rgba(var(--token), 0.N)`.** The tokens hold hex colors, not comma-separated channels, so the `rgba(var(…))` form is invalid and the browser drops the declaration silently — it accounted for every dead rule found so far (hover tints, disabled inputs, medium-emphasis text).
- `abstracts/_elevation.scss` owns the shadow map; the `.z-depth-*` classes in `base/_global.scss` are generated from it, so the classes and the `z-depth()` mixin cannot drift.
- `abstracts/_variables.scss` holds Sass-time knobs (breakpoint strings `$medium-and-up`…, 12-col grid, header font sizes) — mostly `!default`, several now aliasing CSS custom properties.
- `base/_global.scss` (181 lines, down from 433) is element defaults only — box-sizing, `body`, form-control fonts, links, blockquote, icons, tables. Every selector in it is a bare element; helper classes live in `utilities/`, and component-owned rules in that component's partial (`components/_parallax`, `_pushpin`, `_page-footer`, `_docked-display`, `_transitions`).
- `utilities/_typescale.scss` generates the 15 `.display-large` … `.title-small` classes from a `$typescale-roles` list. Every property it sets must map to a token `tokens/_reference.scss` actually defines — a `var()` pointing at an undefined custom property invalidates the whole declaration silently, which is how these classes previously did nothing. `font-style` is deliberately not set: the `-font-family-style` token holds "Regular"/"Medium", which are weights, not CSS font-style keywords.

## TypeScript architecture

**Read `src/ts/README.md` before adding code** — layout, the add-a-component steps, and the Component contract. Layers: `core/` (base class, `Utils`, types) ← `components/` (per-element widgets) and `behaviors/` (document-level enhancers: `Forms`, `Waves`); `plugins/` holds non-`Component` helpers; `index.ts` is the public entry.

`src/ts/core/component.ts` defines the `Component<O extends BaseOptions>` base class. Every component follows the same shape (see `components/collapsible.ts`, `components/carousel.ts` for full examples):

```ts
export interface XOptions extends BaseOptions { /* … */ }
const _defaults = { /* … */ };
export class X extends Component<XOptions> {
  constructor(el, options) { super(el, options, X); this.el['RoutePlate_X'] = this; this.options = {...X.defaults, ...options}; }
  static get defaults() { return _defaults; }
  static init(els, options = {}) { return super.init(els, options, X); }   // overloaded for element vs NodeList
  static getInstance(el) { return el['RoutePlate_X']; }
  destroy() { this.el['RoutePlate_X'] = undefined; /* remove handlers */ }
}
```

The base constructor destroys any pre-existing instance found via `getInstance`, so re-initializing an element is safe. `getInstance`/`destroy` throw by default — a subclass that omits them is broken.

`src/ts/components/registry.ts` holds `AUTO_INIT_COMPONENTS`, a table of `{ component, selector }` keyed by name. It is the single source of truth: the exported `AutoInitOptions` type is a mapped type over it, and `AutoInit(context, options)` loops it (each entry gets a `.no-autoinit` opt-out). Components absent from the table are never auto-started (`Toast`, `CharacterCounter`, `Range`).

`src/ts/index.ts` re-exports `components/`, `Forms`, `Waves`, `AutoInit` and `version`, and runs the import-time side effects: `Forms.Init()`, `Chips.Init()`, `Waves.Init()`, `Range.Init()`, `Cards.Init()`, plus document-level keyboard/focus listeners from `Utils`.

**Adding a component** touches: the new `src/ts/components/<name>.ts`, one export line in `components/index.ts`, one line in `components/registry.ts` if it auto-inits, and a `src/sass/components/_<name>.scss` partial `@forward`ed from `components/_index.scss`.

Supporting files: `core/utils.ts` (shared `Utils` statics — `_setAbsolutePosition`, `checkPossibleAlignments`, `_repositionWithinScreen`, `throttle`, `guid`, global key/focus state); `core/bounding.ts` and `core/edges.ts` are type-only; `plugins/dockedDisplayPlugin.ts` wraps an element in a `.display-docked` container and positions/animates it (used for picker-style popovers).

`components/modal.ts` is intentionally gutted — marked "Obsolete for versions > 2.1.1", with empty method bodies and an experimental `static create()` building a native `<dialog>`. Its empty methods are a rewrite in progress, not bugs to patch.

## docs/

The Flask app serves the npm build **directly out of `dist/`** via the `dist_file` route (`/dist/<path:filename>`) — there is no copy step, so `npm run watch` + browser reload is the dev loop. `docs/static/` holds only docs-site chrome (`docs.css`, `docs.js`), never framework styles.

An `inject_build_assets` context processor exposes `css_url` / `js_url` to templates and picks unminified assets when `app.debug` is set, minified otherwise; it also sets `build_missing`, which renders a "run npm run build" banner in `base.html` when `dist/` is absent. Debug responses are sent with `max-age=0` so rebuilt assets aren't cached.

The bundle only self-initializes Forms/Chips/Waves/Range/Cards — `docs/static/docs.js` calls `RoutePlate.AutoInit()` on `DOMContentLoaded` for everything else, and toggles `<html theme="light|dark">` to exercise the token layer.
