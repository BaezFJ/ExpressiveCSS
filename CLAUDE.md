# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

ExpressiveCSS is a new front-end framework being grown out of a vendored copy of MaterializeCSS v2.2.2 source (`src/ts` + `src/sass`), with a Flask app in `docs/` intended to become the documentation/showcase site.

The public surface is rebranded. Instances are stashed on elements as `el['Expressive_<Component>']`, the IIFE global is `Expressive`, `src/ts/index.ts` exports `version = '0.1.0'` (tracking package.json), and the Materialize-branded markup classes are gone:

| Upstream | Expressive |
| --- | --- |
| `Materialbox` / `.materialboxed` / `#materialbox-overlay` | `Lightbox` / `.lightboxed` / `#lightbox-overlay` |
| `.materialize-textarea` | `.expressive-textarea` |
| `.materialize-red` (+ shades) | `.expressive-red` |
| `el['M_<Component>']`, global `M` | `el['Expressive_<Component>']`, global `Expressive` |

**`.material-icons` and `.material-symbols-*` are deliberately untouched** — they are Google's icon-font class names, not Materialize's. Consumers load Google's stylesheet, which defines them; renaming ours would only desynchronize the two. The `--md-sys-*` / `--md-ref-*` tokens are Material Design 3 spec names for the same reason, as is `components/_icons-material-design.scss`.

Links to `github.com/materializecss/materialize` issues in code comments are real upstream references and should stay.

## Build commands

Framework build is npm-based (dart-sass + esbuild + tsc). `npm install` first.

```bash
npm run build          # css + js + type declarations -> dist/
npm run build:css      # sass -> dist/css/expressive.css (+ .min.css, source maps)
npm run build:js       # esbuild -> dist/js/expressive.{mjs,cjs,js,min.js}
npm run build:types    # tsc --emitDeclarationOnly -> dist/types/
npm run typecheck      # tsc --noEmit, no output
npm test               # rebuild the ESM bundle, then run the jsdom suite
npm run test:run       # run tests against the existing dist/ bundle
npm run watch          # sass --watch + esbuild --watch in parallel
npm run clean          # remove dist/
```

`npm test` runs a single test file with `node --test path/to/file.test.js`, or filter by name with `node --test --test-name-pattern "Collapsible"`.

Entry points are `src/sass/expressive.scss` and `src/ts/index.ts`. The IIFE bundle exposes the global `Expressive` for `<script>` usage (`Expressive.AutoInit()`, `Expressive.Modal.getInstance(el)`).

Docs site (uv + Flask, Python ≥ 3.14):

```bash
uv sync
uv run flask --app docs/app.py run --debug         # http://127.0.0.1:5000
```

Notes:

- Tests are `node:test` + jsdom in `tests/`, run against the **built** `dist/js/expressive.mjs` — so a stale bundle tests stale code; `npm test` rebuilds first. `tests/setup.js` owns the jsdom environment and its shims (`innerText`, `matchMedia`, element constructors); `tests/fixtures.js` is a hand-written table of markup per auto-init component, deliberately independent of `components/registry.ts` so a wrong selector fails the suite. Beyond the per-component tests: `teardown.test.js` (does `destroy()` hand back every window/document/body listener), `hot-paths.test.js` (work per event — rect reads per scroll tick, draws per click), `injection.test.js` (author-controlled values must not become markup or selector syntax), `regressions.test.js` (one test per fixed bug).
- **A test that leaves a live timer wedges the whole run.** `node --test` waits for the event loop to drain and Toast/Slider/Carousel own intervals, so a failed assertion that skipped teardown hangs the file with *no output at all* rather than failing. Tear down in a `finally`.
- jsdom does no layout — `getBoundingClientRect()` and every `offset*`/`client*` read returns 0. Geometry-dependent tests stub the rect on the element (`regressions.test.js`), and counting stubbed rect calls is how the scroll-path tests assert layout work. jsdom also lazily attaches its own `handleFocusEvent`/`handleKeyboardEvent`/`handleMouseEvent` to `window` once a form control is involved; listener-leak tests filter those by name.
- To confirm a new test actually catches the bug it names: `git stash push -- src/ts`, `npm run build:js`, run the one file, `git stash pop` — **as separate Bash calls**, so a hung run can't strand the stash.
- There is no linter. Several files carry `@typescript-eslint` disable comments inherited from upstream with no ESLint config behind them.
- `useDefineForClassFields` is deliberately `false` in `tsconfig.json`: the vendored components declare fields that the constructor assigns after `super()`, and define semantics would reset them to `undefined`.
- `watch:js` uses `--watch=forever`; plain `--watch` makes esbuild quit as soon as stdin closes, which silently kills it under `run-p`.
- The build targets `es2020` and emits no vendor prefixes — no autoprefixer/postcss step exists. Browser support is the last 5 Chrome and last 5 Firefox versions, no IE, declared in `package.json` under `browserslist`; nothing reads it automatically, it documents the baseline every judgement call is made against. The Sass relies on modern CSS directly and without fallbacks: `@layer`, `light-dark()`, `color-mix()`, `clamp()`, `aspect-ratio`, `inset`, and media-query range syntax. A vendor prefix is only justified for a non-standard property with no unprefixed form (`-webkit-tap-highlight-color`, `-webkit-font-smoothing`) or an engine-private pseudo-element (`::-webkit-slider-thumb`, `::-moz-range-track`); everything else was removed.

## Sass architecture

**Read `src/sass/README.md` before touching styles** — it is the working guide (layer map, the two rules, where new code goes). Summary:

`src/sass/expressive.scss` is the entry point. It declares `@layer tokens, base, components, utilities;` and pulls each one in with `meta.load-css()` (`@forward` cannot appear inside `@layer`), plus `@forward "abstracts"` for the Sass API — `abstracts` is inert and is not a cascade layer. Each layer has an `_index.scss` that forwards its own files; the entry file is the only place cascade order is decided.

Utilities are emitted **after** components now, and win by layer order rather than specificity. Their `!important` flags are deliberately retained: a normal declaration inside a layer loses to any *unlayered* consumer declaration, so dropping the flag would silently stop `.hide` beating a consumer's own `display`. The `!important` in `components/` (`.pushpin`, `.tap-target`, preloader) guards JS-driven geometry and also stays.

Two hard invariants, both learned from bugs:

- **Partials import `abstracts` and nothing else** (`@use "../abstracts" as *;`, one line, every file). `abstracts/` must never emit a selector.
- **No `@extend` across files.** `@extend` only resolves if the extending file loads the defining module, which is why components used to `@use` CSS-emitting files and let the dependency graph — not the entry point — decide output position. Use `@include z-depth("1")` or write the declaration directly. Same-file `@extend` and placeholders are fine.

Two color systems coexist:

1. **Material Design 3 tokens** — `tokens/_reference.scss` **generates** five of the six tonal ramps (`--md-ref-palette-primary40`) from `--md-source` using relative color syntax (`oklch(from var(--md-source) …)`), then resolves them into the `--md-sys-color-*-light` / `-dark` pairs. Setting `--md-source` re-themes everything at runtime, no rebuild.

   The generation hinges on the `$tones` table, and the reason is easy to get wrong: **M3 "tone" is CIELAB L\*, not OKLCH lightness**. Tone 40 is L\* 40 but OKLCH L 48.14%, so `oklch(40% c h)` drifts a mean ΔEok of 0.063 (max 0.147) — several times the ~0.02 JND, turning `#006495` into `#004d74`. Going through the table brings that to mean 0.0026, max 0.0069. The table is shared by all ramps because the mapping is near enough hue-independent.

   The **error ramp is deliberately literal hex, not generated** — M3 fixes the error hue rather than deriving it, and it is also the highest-chroma ramp, where OKLab and CIELAB lightness diverge most (it was the only ramp to exceed JND when generated). Do not add `"error"` to `$ramps`.

   `tests/color-drift.test.js` reads the constants out of the Sass, recomputes every ramp entry, and fails if any moves more than `DRIFT_BUDGET` (0.010) from the checked-in Material Theme Builder values in `tests/m3-reference-ramps.js`. It reports each ramp's remaining headroom as a diagnostic. If headroom shrinks toward zero, re-fit the constants — minimising **worst-case** drift, not mean — rather than raising the budget. `tokens/_theme.scss` maps those onto the live `--md-sys-color-*` names once, via `light-dark()` in an `@each` over `$sys-color-roles`, and `:root[theme='light'|'dark']` only set `color-scheme`. The `-light`/`-dark` pairs are public API (the docs' Themes page documents overriding them) and must stay. `light-dark()` resolves against the element's used `color-scheme` at the point of use, so `color-scheme` is load-bearing and a subtree can be re-themed on its own. `utilities/_colors.scss` exposes the live names as utility classes (`.primary`, `.on-surface-text`, …). New styling should consume `--md-sys-color-*` — never the `-light`/`-dark` pair, which locks the rule to one theme.
2. **Legacy Materialize palette — removed.** `abstracts/_palette.scss` (`$colors`, `colorFunc()`) and `utilities/_palette-classes.scss` (`.red.lighten-2`) are gone: 532 rules, 18% of the compiled sheet, expressing a design opinion the framework does not hold, and never theme-aware. The framework consumed exactly one value from it (`$link-color`), now `var(--md-sys-color-primary)`. There is deliberately no Sass color function — a build-time function cannot follow a theme the user switches at runtime. Do not reintroduce one.

All `color-mix()` uses `in oklab`, never `in srgb`: sRGB interpolation dips in lightness through the midtones, so the same percentage reads differently per hue. `oklab` rather than `oklch` because `oklch` interpolates the hue angle and can swing a tint through unrelated hues.

Other things worth knowing:

- `abstracts/_mixins.scss` (`btn`, `btn-filled`, `btn-tonal`, `btn-outlined`, `btn-flat`, `btn-disabled`, `focus-visible`) builds states with `color-mix()` over `--md-sys-color-*`.
- **Translucent colors use `color-mix(in srgb, var(--token) N%, transparent)`, never `rgba(var(--token), 0.N)`.** The tokens hold hex colors, not comma-separated channels, so the `rgba(var(…))` form is invalid and the browser drops the declaration silently — it accounted for every dead rule found so far (hover tints, disabled inputs, medium-emphasis text).
- `abstracts/_elevation.scss` owns the shadow map; the `.z-depth-*` classes in `base/_global.scss` are generated from it, so the classes and the `z-depth()` mixin cannot drift.
- `abstracts/_breakpoints.scss` owns the three breakpoints (`small` 601px, `large` 993px, `xlarge` 1201px) and the `bp-up()` / `bp-down()` / `bp-between()` mixins, which emit media-query range syntax (`@media (width >= 601px)`). The old interpolated strings (`$medium-and-up`…) are kept as deprecated aliases producing the same queries; nothing in the framework uses them. The `600.99px`/`992.99px` values they needed are gone — range syntax has an exclusive comparator.
- `abstracts/_variables.scss` holds the remaining Sass-time knobs (12-col grid, header font sizes, `$root-font-size`, the flow-text bounds) — mostly `!default`, several now aliasing CSS custom properties.
- `base/_normalize.scss` is normalize.css v8.0.1 trimmed to the support baseline: every rule whose own comment named IE, Edge Legacy or Chrome 57- is gone, and the removals are listed in a header comment so nobody re-adds them. `::-webkit-file-upload-button` became the standard `::file-selector-button`.
- `base/_global.scss` (181 lines, down from 433) is element defaults only — box-sizing, `body`, form-control fonts, links, blockquote, icons, tables. Every selector in it is a bare element; helper classes live in `utilities/`, and component-owned rules in that component's partial (`components/_parallax`, `_pushpin`, `_page-footer`, `_docked-display`, `_transitions`).
- `utilities/_typescale.scss` generates the 15 `.display-large` … `.title-small` classes from a `$typescale-roles` list. Every property it sets must map to a token `tokens/_reference.scss` actually defines — a `var()` pointing at an undefined custom property invalidates the whole declaration silently, which is how these classes previously did nothing. `font-style` is deliberately not set: the `-font-family-style` token holds "Regular"/"Medium", which are weights, not CSS font-style keywords.

## TypeScript architecture

**Read `src/ts/README.md` before adding code** — layout, the add-a-component steps, and the Component contract. Layers: `core/` (base class, `Utils`, types) ← `components/` (per-element widgets) and `behaviors/` (document-level enhancers: `Forms`, `Waves`); `plugins/` holds non-`Component` helpers; `index.ts` is the public entry.

`src/ts/core/component.ts` defines the `Component<O extends BaseOptions>` base class. Every component follows the same shape (see `components/collapsible.ts`, `components/carousel.ts` for full examples):

```ts
export interface XOptions extends BaseOptions { /* … */ }
const _defaults = { /* … */ };
export class X extends Component<XOptions> {
  constructor(el, options) { super(el, options, X); this.el['Expressive_X'] = this; this.options = {...X.defaults, ...options}; }
  static get defaults() { return _defaults; }
  static init(els, options = {}) { return super.init(els, options, X); }   // overloaded for element vs NodeList
  static getInstance(el) { return el['Expressive_X']; }
  destroy() { this.el['Expressive_X'] = undefined; /* remove handlers */ }
}
```

The base constructor destroys any pre-existing instance found via `getInstance`, so re-initializing an element is safe. `getInstance`/`destroy` throw by default — a subclass that omits them is broken.

`src/ts/components/registry.ts` holds `AUTO_INIT_COMPONENTS`, a table of `{ component, selector }` keyed by name. It is the single source of truth: the exported `AutoInitOptions` type is a mapped type over it, and `AutoInit(context, options)` loops it (each entry gets a `.no-autoinit` opt-out). Components absent from the table are never auto-started (`Toast`, `CharacterCounter`, `Range`).

`src/ts/index.ts` re-exports `components/`, `Forms`, `Waves`, `AutoInit` and `version`, and runs the import-time side effects: `Forms.Init()`, `Chips.Init()`, `Waves.Init()`, `Range.Init()`, `Cards.Init()`, plus document-level keyboard/focus listeners from `Utils`.

**Adding a component** touches: the new `src/ts/components/<name>.ts`, one export line in `components/index.ts`, one line in `components/registry.ts` if it auto-inits, and a `src/sass/components/_<name>.scss` partial `@forward`ed from `components/_index.scss`.

Supporting files: `core/utils.ts` (shared `Utils` statics — `_setAbsolutePosition`, `checkPossibleAlignments`, `_repositionWithinScreen`, `throttle`, `guid`, `onDocumentReady`, global key/focus state); `core/bounding.ts` and `core/edges.ts` are type-only; `plugins/dockedDisplayPlugin.ts` wraps an element in a `.display-docked` container and positions/animates it (used for picker-style popovers).

`components/modal.ts` is intentionally gutted — marked "Obsolete for versions > 2.1.1", with empty method bodies and an experimental `static create()` building a native `<dialog>`. Its empty methods are a rewrite in progress, not bugs to patch.

### Cross-cutting invariants

These were all learned from bugs in the vendored source:

- **Shared document/window listeners need a stable function identity.** ScrollSpy registers its scroll/resize/click handlers once for all instances; registering with one instance's bound arrow and unregistering with another's is a silent no-op that leaks the listener for the life of the page. That is why those handlers are `static`.
- **`Utils.onDocumentReady(fn)`, never a bare `DOMContentLoaded` listener** — the event has already fired when the bundle is loaded async or by dynamic import, and the listener then never runs. All five `Init()` entry points (`Forms`, `Chips`, `Waves`, `Range`, `Cards`) go through it.
- **Never build markup out of values the page author controls.** `optgroup` labels, option text, ids and i18n strings reach the DOM as nodes (`textContent`, `setAttribute`, `getElementById`) — not via `innerHTML` or an interpolated `#${…}` selector, which also throws on any id that is not a bare identifier. `Datepicker.draw()` is the exception: it still assembles an HTML string, so every i18n value it splices in goes through `Datepicker._escape()`.
- **`Datepicker.draw()` is batchable.** One input click legitimately reaches it three times (through `setDate`, directly for the unparseable-input case, and through the trailing `gotoDate`), and each draw destroys and rebuilds two `FormSelect`s. `_batchDraws()` collapses them to one. It is deliberately synchronous — callers read `calendarEl` immediately after `init()`.
- **`Utils.throttle` returns the throttled function; assign it once.** `x = Utils.throttle(fn, 200)` is right; `x = () => Utils.throttle(fn, 200)` builds a fresh closure per event and never calls it, which is how resize handling was dead in three components.
- Scroll and touch handlers that never call `preventDefault()` are registered `{ passive: true }`, and anything running per pointer-move or per scroll reads layout before it writes style.

## docs/

The Flask app serves the npm build **directly out of `dist/`** via the `dist_file` route (`/dist/<path:filename>`) — there is no copy step, so `npm run watch` + browser reload is the dev loop. `docs/static/` holds only docs-site chrome (`docs.css`, `docs.js`), never framework styles.

An `inject_build_assets` context processor exposes `css_url` / `js_url` to templates and picks unminified assets when `app.debug` is set, minified otherwise; it also sets `build_missing`, which renders a "run npm run build" banner in `base.html` when `dist/` is absent. Debug responses are sent with `max-age=0` so rebuilt assets aren't cached.

The bundle only self-initializes Forms/Chips/Waves/Range/Cards — `docs/static/docs.js` calls `Expressive.AutoInit()` on `DOMContentLoaded` for everything else, and toggles `<html theme="light|dark">` to exercise the token layer.
