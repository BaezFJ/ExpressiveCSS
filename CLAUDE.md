# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

ExpressiveCSS is a new front-end framework being grown out of a vendored copy of MaterializeCSS v2.2.2 source (`src/ts` + `src/sass`), with a Flask app in `docs/` intended to become the documentation/showcase site.

LLM-oriented docs: `llm.md` is markup and JavaScript APIs; `m3-guidelines.md` is Material 3 usage, anatomy, placement, adaptive design, and behaviors for those components.

The public surface is rebranded. Instances are stashed on elements as `el['Expressive_<Component>']`, the IIFE global is `Expressive`, `src/ts/index.ts` exports `version = '0.7.0'` (tracking package.json), and the Materialize-branded markup classes are gone:

| Upstream | Expressive |
| --- | --- |
| `Materialbox` / `.materialboxed` / `#materialbox-overlay` | `Lightbox` / `.lightboxed` / `#lightbox-overlay` |
| `.materialize-textarea` | `.expressive-textarea` |
| `el['M_<Component>']`, global `M` | `el['Expressive_<Component>']`, global `Expressive` |

Icons are Material Symbols, outlined by default (`--md-icon-font`). Style (outlined / rounded / sharp) is the font family — switch it with the `icon-style` attribute or `--md-icon-font`. Fill, weight, grade, and optical size are variation axes (`--md-icon-fill`, `--md-icon-weight`, `--md-icon-grade`, `--md-icon-optical-size`). The font files are **not** shipped: three variable families would dwarf the sheet, and most pages only need outlined. `.material-icons` is a compat alias that now uses Symbols. The `--md-sys-*` / `--md-ref-*` tokens stay Material Design 3 spec names.

Links to `github.com/materializecss/materialize` issues in code comments are real upstream references and should stay.

## Build commands

Framework build is npm-based (dart-sass + esbuild + tsc). `npm install` first.

```bash
npm run build          # css + js + type declarations -> dist/
npm run build:css      # sass -> dist/css/expressive.css (+ .min.css, source maps)
npm run build:js       # esbuild -> dist/js/expressive.{mjs,cjs,js,min.js}
npm run build:types    # tsc --emitDeclarationOnly -> dist/types/
npm run typecheck      # tsc --noEmit, no output
npm test               # rebuild every JS bundle + the CSS, then run the jsdom suite
npm run test:run       # run tests against the existing dist/ bundle
npm run watch          # sass --watch + esbuild --watch in parallel
npm run build:semantics # semantics.json -> SEMANTICS.md
npm run clean          # remove dist/
```

`npm test` runs a single test file with `node --test path/to/file.test.js`, or filter by name with `node --test --test-name-pattern "Sidenav"`.

Entry points are `src/sass/expressive.scss` and `src/ts/index.ts`. The IIFE bundle exposes the global `Expressive` for `<script>` usage (`Expressive.AutoInit()`, `Expressive.Sidenav.getInstance(el)`).

Docs site (uv + Flask, Python ≥ 3.14):

```bash
uv sync
uv run flask --app docs/app.py run --debug         # http://127.0.0.1:5000
```

Notes:

- Tests are `node:test` + jsdom in `tests/`, run against the **built** bundles — so a stale bundle tests stale code; `npm test` rebuilds first. Two artifacts are needed, not one: `tests/setup.js` imports `dist/js/expressive.mjs`, and `bundle.test.js` reads the IIFE `dist/js/expressive.js`. That is why `test` runs `build:js` (all four formats) rather than `build:js:esm` — building only the ESM bundle passes locally off a warm `dist/` and fails on a clean checkout. `test` also runs `build:css`, because `regressions.test.js` asserts against the compiled `dist/css/expressive.css`; the same warm-`dist/` trap sank the v0.4.0 publish, which CI missed because `ci.yml` runs a full `npm run build` before `test:run` while `release.yml` runs `npm test`. `tests/setup.js` owns the jsdom environment and its shims (`innerText`, `matchMedia`, element constructors); `tests/fixtures.js` is a hand-written table of markup per auto-init component, deliberately independent of `components/registry.ts` so a wrong selector fails the suite. Beyond the per-component tests: `teardown.test.js` (does `destroy()` hand back every window/document/body listener), `hot-paths.test.js` (work per event — rect reads per scroll tick, draws per click), `injection.test.js` (author-controlled values must not become markup or selector syntax), `regressions.test.js` (one test per fixed bug).
- **A test that leaves a live timer wedges the whole run.** `node --test` waits for the event loop to drain and Snackbar/Slider/Carousel own intervals, so a failed assertion that skipped teardown hangs the file with *no output at all* rather than failing. Tear down in a `finally`.
- jsdom does no layout — `getBoundingClientRect()` and every `offset*`/`client*` read returns 0. Geometry-dependent tests stub the rect on the element (`regressions.test.js`), and counting stubbed rect calls is how the scroll-path tests assert layout work. jsdom also lazily attaches its own `handleFocusEvent`/`handleKeyboardEvent`/`handleMouseEvent` to `window` once a form control is involved; listener-leak tests filter those by name.
- To confirm a new test actually catches the bug it names: `git stash push -- src/ts`, `npm run build:js`, run the one file, `git stash pop` — **as separate Bash calls**, so a hung run can't strand the stash.
- There is no linter. Several files carry `@typescript-eslint` disable comments inherited from upstream with no ESLint config behind them.
- `useDefineForClassFields` is deliberately `false` in `tsconfig.json`: the vendored components declare fields that the constructor assigns after `super()`, and define semantics would reset them to `undefined`.
- `watch:js` uses `--watch=forever`; plain `--watch` makes esbuild quit as soon as stdin closes, which silently kills it under `run-p`.
- The build targets `es2020` and emits no vendor prefixes — no autoprefixer/postcss step exists. Browser support is the last 5 Chrome and last 5 Firefox versions, no IE, declared in `package.json` under `browserslist`; nothing reads it automatically, it documents the baseline every judgement call is made against. The Sass relies on modern CSS directly and without fallbacks: `@layer`, `light-dark()`, `color-mix()`, `clamp()`, `aspect-ratio`, `inset`, and media-query range syntax. A vendor prefix is only justified for a non-standard property with no unprefixed form (`-webkit-tap-highlight-color`, `-webkit-font-smoothing`) or an engine-private pseudo-element (`::-webkit-slider-thumb`, `::-moz-range-track`); everything else was removed.

## Releasing

`package.json` holds the version, but seven files state it and only one derives it. The docs **footer** is the derived one: it reads `package.json` through the `version` context variable, which is why it stopped needing a manual bump after v0.6.0. Because it reads the raw version it also sees prereleases, so it appends "(prerelease)" when `IS_PRERELEASE` is set (`'-' in VERSION`) — otherwise the site advertises a version `npm install` does not hand out. The other six drift silently — nothing fails if you miss one.

**Which files you bump depends on whether `latest` moves.** They fall into two groups:

- *Must match the tag*, always: `package.json` and `src/ts/index.ts` (`export const version`) — `release.yml` compares the tag against `package.json` and aborts on a mismatch, and the version export is what the built bundle reports. Plus the line in **this file** naming what `index.ts` exports, so it stays true.
- *Tells a reader which version to install*: `README.md`, `llm.md` (two places — the header and the "Getting started" prose), and `docs/templates/start/index.html`.

For a **full release** both groups move. For a **prerelease** only the first moves: `latest` stays on the last stable version, so prose announcing the prerelease as "the project is at version x" would send readers to something `npm install` does not give them. That leaves `package.json` deliberately ahead of the prose for the life of the prerelease — e.g. `0.7.0-rc.0` in `package.json` against `0.6.0` in the prose. **That gap is intended; do not "fix" it.** It closes when the matching full release goes out and both groups move together.

Then: add the CHANGELOG entry (`## [x.y.z] - YYYY-MM-DD`, plus the two compare links at the bottom of the file), `npm run typecheck` and `npm test`, commit, annotated tag `vx.y.z`, push the branch *and* the tag, and `gh release create vx.y.z --notes-file <notes>` — **plus `--prerelease` for a prerelease**. That flag is the only thing routing the publish to the `next` dist-tag: `DIST_TAG` in `release.yml` reads `github.event.release.prerelease`, so a release cut without it publishes to `latest` no matter what the version string says. An `-rc` suffix does not protect you; the flag does.

Publishing is `release.yml` on `release: published`. The job declares `environment: npm-publish`, which has a required reviewer, so **it pauses before any step runs** — approve it in the Actions tab. Note what that means: you are approving "attempt this release", not "the tests passed". The gates come after the click — it aborts if the tag disagrees with `package.json`, if that version is already on the registry, or if typecheck or the suite fails. Full releases go to `latest`, prereleases to `next`.

There is no npm token anywhere. Publishing is trusted publishing over OIDC, and npm matches a three-part identity: repository `BaezFJ/ExpressiveCSS`, workflow file `release.yml`, environment `npm-publish`. Read it with `npm trust list @expressivecss/expressive`. **Change any one of the three — rename the workflow, rename the environment, drop the `environment:` line — and the publish fails at the very last step**, after every test has passed, with an identity mismatch. npm permits exactly one entry per repository + workflow file (a second POST returns 409), so correcting it is `npm trust revoke --id=<id>` followed by `npm trust github … --env npm-publish --allow-publish`, which leaves a brief window with no trusted publisher.

A successful publish triggers `pages.yml`, which rebuilds `dist/`, re-freezes `website/`, commits it, and deploys to `www.expressivecss.com`.

Repository rules constrain the recovery paths. Rulesets block force pushes and deletions on master and on `refs/tags/v*`, with **no bypass actors, including the owner**. Tag *creation* stays open so a release works, but a pushed tag can never be moved or deleted — a wrong tag is fixed by releasing the next patch, not by rewriting history. To force-push legitimately, disable the ruleset in Settings → Rules, push, re-enable.

## HTML semantics

`SEMANTICS.md` is the normative markup standard: which element each component is
written with, and the ARIA that element choice implies. It is **generated** from
`semantics.json` — edit the JSON, run `npm run build:semantics`, commit both.
`CONTEXT.md` is the glossary for the terms it uses (*static semantics*, *dynamic
state*, *composite role*, *display chip*); it is a glossary and nothing else.

Scope is element choice, landmarks, and implied ARIA. Keyboard interaction, focus
management and contrast are deliberately **out**, which is what rule 2 below turns
on. The five rules:

1. Static semantics are the author's, dynamic state is the framework's. Element,
   role, landmark, `aria-hidden` on decoration and the *presence* of a label go in
   the markup; only a state's changing *value* (`aria-expanded="true"`) is the
   component's. Label *text* is authored content — hence rule 5.
2. **A component may declare a composite role only if its keyboard contract is
   implemented and tested.** `role="tablist"` promises arrow-key navigation; a
   component that promises and does not deliver is worse than one that says
   nothing. `tabs.ts` has no keyboard handling at all, so Tabs are navigation
   (`<nav>` + anchors + `aria-current`), not a tablist. Same for Carousel.
3. Icons are `<span class="material-symbols" aria-hidden="true">`. The ligature is
   real text and is announced. `<i>` still works and is undocumented. The size and
   float modifiers hang off the `$_icon` class list in
   `components/_icons-material-design.scss`, never off the `i` element — they were
   keyed on `i` in `base/_global.scss`, which meant the canonical `<span>` form
   silently lost them.

   **Inside a `.field` this bites twice.** The old icon rules used
   `:first-of-type` / `:last-of-type`, which count elements of the same *type* —
   unwidenable to spans, because a field is full of other spans. So a field icon
   must name its side with `.prefix` / `.suffix`; the positional `i` rules remain
   for old markup. And every "the label, or the span standing in for it" rule
   must exclude the icons, or they inherit the floating label's position. That
   exclusion is `$_not-label` in `forms/_input-fields.scss` — **one variable, five
   rules**. It was five hand-copied lists that had already drifted, and adding
   `.prefix` / `.suffix` to four of the five is exactly how the leading icon ended
   up indented past its own padding.
4. `<nav>` for genuine navigation only, each with a required `aria-label`. A card's
   action row is buttons, not destinations, and a toolbar holds commands. Note what
   rule 2 forbids here: `role="toolbar"` is a *composite* role and promises arrow-key
   navigation, so a toolbar drops `<nav>` without gaining `role` until someone builds
   that keyboard model.
5. Every user-facing string the framework generates gets an `i18n` option
   (Datepicker and Timepicker already had one; Chips now does).

`tests/semantics.test.js` enforces the rules against the three surfaces that state
markup — `llm.md`, `docs/templates/**`, `tests/fixtures.js`. `website/` is
generated from the templates, so checking it would check the same thing twice.
Notes that matter when working on it:

- **Swept so far: chips, then the form components** (`input-fields`,
  `fieldset`, `checkboxes`, `radio-buttons`, `switches`, `select`,
  `file-input`, `range`, `autocomplete`, `character-counter`). `SEMANTICS.md`
  carries the running count.
- **The extractor keys on the fence tag**, so a markup sample written as
  ` ```text ` is invisible to it. 37 blocks were in that state, Fieldsets
  entirely. A test now fails any non-`html` fence containing markup — walk the
  fences line by line if you touch it, because an "opening fence" regex also
  matches every closing one.
- A component is `enforced` or `exempt`. **Exempt is the backlog and only ever
  shrinks.** The roster test asserts `semantics.json` rows match the sass partials
  plus `additional` exactly, so a new component cannot ship without a row — which
  is what makes it enforced from its first commit.
- The check **must never initialize a component**. It parses with jsdom and reads
  the DOM. Chips/Snackbar/Slider own intervals, and a live timer wedges the whole
  `node --test` run with no output.
- One example can opt out with a stated reason: ` ```html ignore-semantics: why `
  in Markdown, `code(check=false, reason="why")` in a template. A reason is
  required — the test fails on a bare opt-out.
- Legacy markup breaks **silently**. No runtime warnings: 26+ components are
  CSS-only and could not emit them, so coverage would be partial and the absence
  of a warning would read as conformance. Migration lives in the CHANGELOG.

## Sass architecture

**Read `src/sass/README.md` before touching styles** — it is the working guide (layer map, the two rules, where new code goes). Summary:

`src/sass/expressive.scss` is the entry point. It declares `@layer tokens, base, components, utilities;` and pulls each one in with `meta.load-css()` (`@forward` cannot appear inside `@layer`), plus `@forward "abstracts"` for the Sass API — `abstracts` is inert and is not a cascade layer. Each layer has an `_index.scss` that forwards its own files; the entry file is the only place cascade order is decided.

Utilities are emitted **after** components now, and win by layer order rather than specificity. Their `!important` flags are deliberately retained: a normal declaration inside a layer loses to any *unlayered* consumer declaration, so dropping the flag would silently stop `.hide` beating a consumer's own `display`.

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
- `abstracts/_breakpoints.scss` owns the four breakpoints (`small` 601px, `large` 993px, `xlarge` 1201px, `xxlarge` 1601px) and the `bp-up()` / `bp-down()` / `bp-between()` mixins, which emit media-query range syntax (`@media (width >= 601px)`). The `600.99px`/`992.99px` values they needed are gone — range syntax has an exclusive comparator. `xxlarge` is M3 extra-large; the grid’s `.xxl` prefix and the container’s 1920px cap live there. `.container.wide` caps at 2400px, `.container.max` has no cap.
- `abstracts/_variables.scss` holds the remaining Sass-time knobs (`$root-font-size`, the flow-text bounds, `$font-stack`, `$gutter-width`) — mostly `!default`, several now aliasing CSS custom properties.
- `base/_normalize.scss` is normalize.css v8.0.1 trimmed to the support baseline: every rule whose own comment named IE, Edge Legacy or Chrome 57- is gone, and the removals are listed in a header comment so nobody re-adds them. `::-webkit-file-upload-button` became the standard `::file-selector-button`.
- `base/_global.scss` (181 lines, down from 433) is element defaults only — box-sizing, `body`, form-control fonts, links, blockquote, icons, tables. Every selector in it is a bare element; helper classes live in `utilities/`, and component-owned rules in that component's partial (`components/_parallax`, `_page-footer`, `_docked-display`, `_transitions`).
- `utilities/_typescale.scss` generates the 15 `.display-large` … `.title-small` classes from a `$typescale-roles` list. Every property it sets must map to a token `tokens/_reference.scss` actually defines — a `var()` pointing at an undefined custom property invalidates the whole declaration silently, which is how these classes previously did nothing. `font-style` is deliberately not set: the `-font-family-style` token holds "Regular"/"Medium", which are weights, not CSS font-style keywords.

## TypeScript architecture

**Read `src/ts/README.md` before adding code** — layout, the add-a-component steps, and the Component contract. Layers: `core/` (base class, `Utils`, types) ← `components/` (per-element widgets) and `behaviors/` (document-level enhancers: `Forms`, `Waves`); `plugins/` holds non-`Component` helpers; `index.ts` is the public entry.

`src/ts/core/component.ts` defines the `Component<O extends BaseOptions>` base class. Every component follows the same shape (see `components/carousel.ts`, `components/sidenav.ts` for full examples):

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

`src/ts/components/registry.ts` holds `AUTO_INIT_COMPONENTS`, a table of `{ component, selector }` keyed by name. It is the single source of truth: the exported `AutoInitOptions` type is a mapped type over it, and `AutoInit(context, options)` loops it (each entry gets a `.no-autoinit` opt-out). Components absent from the table are never auto-started (`Snackbar`, `CharacterCounter`, `Range`).

`src/ts/index.ts` re-exports `components/`, `Forms`, `Waves`, `Dialogs`, `BottomSheets`, `SideSheets`, `AutoInit` and `version`, and runs the import-time side effects: `Forms.Init()`, `Chips.Init()`, `Waves.Init()`, `Range.Init()`, `Cards.Init()`, `Dialogs.Init()`, `BottomSheets.Init()`, `SideSheets.Init()`, plus document-level keyboard/focus listeners from `Utils`.

**Adding a component** touches: the new `src/ts/components/<name>.ts`, one export line in `components/index.ts`, one line in `components/registry.ts` if it auto-inits, and a `src/sass/components/_<name>.scss` partial `@forward`ed from `components/_index.scss`.

Supporting files: `core/utils.ts` (shared `Utils` statics — `_setAbsolutePosition`, `checkPossibleAlignments`, `_repositionWithinScreen`, `throttle`, `guid`, `onDocumentReady`, global key/focus state); `core/bounding.ts` and `core/edges.ts` are type-only; `plugins/dockedDisplayPlugin.ts` wraps an element in a `.display-docked` container and positions/animates it (used for picker-style popovers). Dialogs are native `<dialog>` plus `behaviors/dialogs.ts` for light-dismiss — there is no `Modal` plugin.

### Cross-cutting invariants

These were all learned from bugs in the vendored source:

- **Shared document/window listeners need a stable function identity.** ScrollSpy's IntersectionObserver callback is `static` for the same reason: one observer for all instances, disconnect when the last is destroyed.
- **`Utils.onDocumentReady(fn)`, never a bare `DOMContentLoaded` listener** — the event has already fired when the bundle is loaded async or by dynamic import, and the listener then never runs. All eight `Init()` entry points (`Forms`, `Chips`, `Waves`, `Range`, `Cards`, `Dialogs`, `BottomSheets`, `SideSheets`) go through it.
- **Never build markup out of values the page author controls.** `optgroup` labels, option text, ids and i18n strings reach the DOM as nodes (`textContent`, `setAttribute`, `getElementById`) — not via `innerHTML` or an interpolated `#${…}` selector, which also throws on any id that is not a bare identifier. `Datepicker.draw()` is the exception: it still assembles an HTML string, so every i18n value it splices in goes through `Datepicker._escape()`.
- **`Datepicker.draw()` is batchable.** One input click legitimately reaches it three times (through `setDate`, directly for the unparseable-input case, and through the trailing `gotoDate`), and each draw destroys and rebuilds two `FormSelect`s. `_batchDraws()` collapses them to one. It is deliberately synchronous — callers read `calendarEl` immediately after `init()`.
- **`Utils.throttle` returns the throttled function; assign it once.** `x = Utils.throttle(fn, 200)` is right; `x = () => Utils.throttle(fn, 200)` builds a fresh closure per event and never calls it, which is how resize handling was dead in three components.
- Scroll and touch handlers that never call `preventDefault()` are registered `{ passive: true }`, and anything running per pointer-move or per scroll reads layout before it writes style.

## docs/

The Flask app serves the npm build **directly out of `dist/`** via the `dist_file` route (`/dist/<path:filename>`) — there is no copy step, so `npm run watch` + browser reload is the dev loop. `docs/static/` holds only docs-site chrome (`docs.css`, `docs.js`), never framework styles.

An `inject_build_assets` context processor exposes `css_url` / `js_url` to templates and picks unminified assets when `app.debug` is set, minified otherwise; it also sets `build_missing`, which renders a "run npm run build" banner in `base.html` when `dist/` is absent. Debug responses are sent with `max-age=0` so rebuilt assets aren't cached.

The bundle only self-initializes Forms/Chips/Waves/Range/Cards — `docs/static/docs.js` calls `Expressive.AutoInit()` on `DOMContentLoaded` for everything else, and toggles `<html theme="light|dark">` to exercise the token layer.

Templates are macro-driven; hand-writing the chrome is what caused every docs bug found so far. `NAV` in `app.py` is the single source for the sidenav *and* the footer (the `<details open>` test reads a derived endpoint list), and the footer version comes from `package.json`. A page declares `page_name` / `page_blurb` and `docs.html` builds the `<title>`, the app bar heading and the banner from them. `macros/page.html` holds the rest: `section(id, label)` registers itself in `toc_sections` (a fresh list per render, from the context processor) so `toc()` can generate the table of contents — write a section once and its TOC entry follows; `page_body()` wraps the standard two-column scaffold and emits that TOC; `code()` escapes a sample so you write real markup instead of `&lt;`. `macros/api.html` owns the Options/Properties/Tokens table headers and the methods `instance_note`. `{% do %}` is enabled for the registration, and the page macros must be imported `with context` because they read `toc_sections`.

`website/` is generated, which makes it the regression test for any template change: `uv run python freeze.py`, then diff. Modulo whitespace the output must be identical — that is how all five macro refactors were verified.
