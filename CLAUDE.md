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
npm run build:llms     # NAV + package.json -> llms.txt (needs uv)
npm run test:visual    # screenshot the merge base, then this tree, and diff
npm run clean          # remove dist/
```

`npm test` runs a single test file with `node --test path/to/file.test.js`, or filter by name with `node --test --test-name-pattern "Sidenav"`.

Entry points are `src/sass/expressive.scss` and `src/ts/index.ts`. The IIFE bundle exposes the global `Expressive` for `<script>` usage (`Expressive.AutoInit()`, `Expressive.Sidenav.getInstance(el)`).

Docs site (uv + Flask, Python ≥ 3.14):

```bash
uv sync
uv run flask --app docs/app.py run --debug --port 5055   # http://127.0.0.1:5055
```

The Astro documentation build runs beside it (ADR 0003) and renders whatever
sits in `docs/src/pages/` -- the converted pages, growing one issue at a time:

```bash
npm run docs:dev       # build the framework, then its watchers beside astro dev
npm run docs:build     # -> _site/ (gitignored)
npm run docs:preview   # serve what docs:build wrote
```

`.claude/launch.json` is gitignored, so a fresh clone has none and the
editor's preview pane has no server to start. Recreate it with the same
command — the `port` field must match the `--port` argument, or the pane
opens on a port nothing is listening to:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "docs",
      "runtimeExecutable": "uv",
      "runtimeArgs": ["run", "flask", "--app", "docs/app.py", "run", "--debug", "--port", "5055"],
      "port": 5055
    }
  ]
}
```

Notes:

- Tests are `node:test` + jsdom in `tests/`, run against the **built** bundles — so a stale bundle tests stale code; `npm test` rebuilds first. Two artifacts are needed, not one: `tests/setup.js` imports `dist/js/expressive.mjs`, and `bundle.test.js` reads the IIFE `dist/js/expressive.js`. That is why `test` runs `build:js` (all four formats) rather than `build:js:esm` — building only the ESM bundle passes locally off a warm `dist/` and fails on a clean checkout. `test` also runs `build:css`, because `regressions.test.js` asserts against the compiled `dist/css/expressive.css`; the same warm-`dist/` trap sank the v0.4.0 publish, which CI missed because `ci.yml` runs a full `npm run build` before `test:run` while `release.yml` runs `npm test`. `tests/setup.js` owns the jsdom environment and its shims (`innerText`, `matchMedia`, element constructors); `tests/fixtures.js` is a hand-written table of markup per auto-init component, deliberately independent of `components/registry.ts` so a wrong selector fails the suite. Beyond the per-component tests: `teardown.test.js` (does `destroy()` hand back every window/document/body listener), `hot-paths.test.js` (work per event — rect reads per scroll tick, draws per click), `injection.test.js` (author-controlled values must not become markup or selector syntax), `regressions.test.js` (one test per fixed bug).
- **A test that leaves a live timer wedges the whole run.** `node --test` waits for the event loop to drain and any pending timer keeps it alive, so a failed assertion that skipped teardown hangs the file with *no output at all* rather than failing. No component calls `setInterval` any more — the one that did, `slideshow.ts`, is gone — but `carousel.ts` re-arms a `setTimeout` after every auto-advance, which holds the loop open in precisely the same way: a repeating timer is the hazard, not the function that made it. The hazard is wider than that one, because eight more schedule one-shot `setTimeout`s — `menu`, `timepicker`, `carousel`, `tooltip`, `autocomplete`, `lightbox`, `snackbar`, `expandingCard`. Tear down in a `finally`.
- jsdom does no layout — `getBoundingClientRect()` and every `offset*`/`client*` read returns 0. Geometry-dependent tests stub the rect on the element (`regressions.test.js`), and counting stubbed rect calls is how the scroll-path tests assert layout work. jsdom also lazily attaches its own `handleFocusEvent`/`handleKeyboardEvent`/`handleMouseEvent` to `window` once a form control is involved; listener-leak tests filter those by name.
- To confirm a new test actually catches the bug it names: `git stash push -- src/ts`, `npm run build:js`, run the one file, `git stash pop` — **as separate Bash calls**, so a hung run can't strand the stash.
- There is no linter. Several files carry `@typescript-eslint` disable comments inherited from upstream with no ESLint config behind them.
- `useDefineForClassFields` is deliberately `false` in `tsconfig.json`: the vendored components declare fields that the constructor assigns after `super()`, and define semantics would reset them to `undefined`.
- `watch:js` uses `--watch=forever`; plain `--watch` makes esbuild quit as soon as stdin closes, which silently kills it under `run-p`.
- The build targets `es2020` and emits no vendor prefixes — no autoprefixer/postcss step exists. Browser support is the last 5 Chrome and last 5 Firefox versions, no IE, declared in `package.json` under `browserslist`; nothing reads it automatically, it documents the baseline every judgement call is made against. The Sass relies on modern CSS directly and without fallbacks: `@layer`, `light-dark()`, `color-mix()`, `clamp()`, `aspect-ratio`, `inset`, and media-query range syntax. A vendor prefix is only justified for a non-standard property with no unprefixed form (`-webkit-tap-highlight-color`, `-webkit-font-smoothing`) or an engine-private pseudo-element (`::-webkit-slider-thumb`, `::-moz-range-track`); everything else was removed.

## Releasing

`package.json` holds the version, but nine files state it and only two derive it. The docs **footers** are the derived ones, one per generator: Flask's reads `package.json` through the `version` context variable, which is why it stopped needing a manual bump after v0.6.0, and Astro's `BaseLayout.astro` reads the same file directly. Because they read the raw version they also see prereleases, so each appends "(prerelease)" when the version carries one (`'-' in VERSION`) — otherwise the site advertises a version `npm install` does not hand out. The other seven drift silently — nothing fails if you miss one.

**Which files you bump depends on whether `latest` moves.** They fall into two groups:

- *Must match the tag*, always: `package.json` and `src/ts/index.ts` (`export const version`) — `release.yml` compares the tag against `package.json` and aborts on a mismatch, and the version export is what the built bundle reports. Plus the line in **this file** naming what `index.ts` exports, so it stays true.
- *Tells a reader which version to install*: `README.md`, `llm.md` (two places — the header and the "Getting started" prose), and the Getting Started page, which states it in prose under **both** generators — `docs/templates/start/index.html` and `docs/src/pages/index.astro` — until the cutover deletes the first.

For a **full release** both groups move. For a **prerelease** only the first moves: `latest` stays on the last stable version, so prose announcing the prerelease as "the project is at version x" would send readers to something `npm install` does not give them. That leaves `package.json` deliberately ahead of the prose for the life of the prerelease — e.g. `0.7.0-rc.0` in `package.json` against `0.6.0` in the prose. **That gap is intended; do not "fix" it.** It closes when the matching full release goes out and both groups move together.

Then: add the CHANGELOG entry (`## [x.y.z] - YYYY-MM-DD`, plus the two compare links at the bottom of the file), `npm run typecheck` and `npm test`, commit, annotated tag `vx.y.z`, push the branch *and* the tag, and `gh release create vx.y.z --notes-file <notes>` — **plus `--prerelease` for a prerelease**. That flag is the only thing routing the publish to the `next` dist-tag: `DIST_TAG` in `release.yml` reads `github.event.release.prerelease`, so a release cut without it publishes to `latest` no matter what the version string says. An `-rc` suffix does not protect you; the flag does.

Publishing is `release.yml` on `release: published`. The job declares `environment: npm-publish`, which has a required reviewer, so **it pauses before any step runs** — approve it in the Actions tab. Note what that means: you are approving "attempt this release", not "the tests passed". The gates come after the click — it aborts if the tag disagrees with `package.json`, if that version is already on the registry, or if typecheck or the suite fails. Full releases go to `latest`, prereleases to `next`.

There is no npm token anywhere. Publishing is trusted publishing over OIDC, and npm matches a three-part identity: repository `BaezFJ/ExpressiveCSS`, workflow file `release.yml`, environment `npm-publish`. Read it with `npm trust list @expressivecss/expressive`. **Change any one of the three — rename the workflow, rename the environment, drop the `environment:` line — and the publish fails at the very last step**, after every test has passed, with an identity mismatch. npm permits exactly one entry per repository + workflow file (a second POST returns 409), so correcting it is `npm trust revoke --id=<id>` followed by `npm trust github … --env npm-publish --allow-publish`, which leaves a brief window with no trusted publisher.

A successful publish triggers `pages.yml`, which rebuilds `dist/`, re-freezes `website/`, commits it, and deploys to `www.expressivecss.com`.

Repository rules constrain the recovery paths. Rulesets block force pushes and deletions on master and on `refs/tags/v*`, with **no bypass actors, including the owner**. Tag *creation* stays open so a release works, but a pushed tag can never be moved or deleted — a wrong tag is fixed by releasing the next patch, not by rewriting history. To force-push legitimately, disable the ruleset in Settings → Rules, push, re-enable.

## Visual regression

`npm run test:visual` photographs the merge base, then this working tree, and
reports every page that moved. `npm run test:visual:report` opens the diffs.
`visual/run.mjs` is the orchestrator and its header states the usage; the CI
job is `visual.yml`, pull requests only.

- **No baselines are committed, on purpose.** 65 pages x 4 variants of
  full-page PNG is 100+ MB per revision. Each run instead builds the base
  revision in a throwaway git worktree (`.visual-base/`, node_modules
  symlinked so both passes use the same sass and esbuild), photographs it into
  `visual/__shots__/`, then compares. Nothing binary enters git, there is no
  "update the snapshots" ritual to forget, and the comparison is always the
  branch against its own merge base rather than against whatever was blessed
  months ago. The cost is one extra build per run.
- **The tolerance is `maxDiffPixels`, never a ratio.** These are full-page
  screenshots of long pages, and 0.001 of a 1440x9000 page is 12,960 pixels --
  enough to swallow a 20px -> 4px corner radius on every button on the buttons
  page, which is exactly what it did when this was first written. Real changes
  are small in absolute terms and the pages they sit on are enormous, so a
  ratio scales the tolerance with the wrong thing.
- **It serves the Flask app, not `website/`.** The frozen pages use
  root-absolute URLs that only resolve inside the `_site` tree `pages.yml`
  assembles. The page *list* still comes from `website/*.html`, so it covers
  exactly what ships. A page this branch adds has no baseline: the base pass
  skips it on the 404, the head pass skips it on the missing file.
- **Every non-font third party is stubbed.** picsum.photos serves 51 demo
  images and is fulfilled with an SVG of exactly the requested size; the live
  YouTube iframe and MDN video on `media-css.html` are aborted; cdnjs is
  aborted because highlight.js rewrites every code block after load and
  `code-blocks.js` already guards on `window.hljs`. An image landing between
  two stabilisation captures changes the page height, which is precisely how
  the first CI run failed (1440x8729 against 1440x8786). The icon font is the
  one exception: icon sizing is a regression this exists to catch (24px ->
  18px shipped once), so Google Fonts loads and `document.fonts.ready` is
  awaited before the shutter.
- **`page.clock.install()` then `runFor`, never `setFixedTime`.** The pickers
  open on *now*, so the clock has to be pinned or the minute digit ticks over
  between the two passes. But freezing `Date` outright breaks
  `Carousel._autoScroll`, which eases by `amplitude * exp(-elapsed /
  duration)` over a `Date.now()` delta: with `elapsed` permanently 0 the
  easing never decays below its threshold and the carousel never reaches its
  target. A fake clock that advances *on command* gives both -- one fixed
  instant at init, then a fixed number of milliseconds of animation, the same
  on any machine.
- **Freeze layout reactions at the shutter, and stabilise the base pass by
  hand.** Two separate races, both of which failed a different page on every
  run with no source change between the revisions. First: a full-page
  screenshot resizes the viewport to reach beyond it, Carousel observes its
  element with a ResizeObserver and recomputes item offsets on a throttled
  resize, and whether that lands before the pixel readback is a coin flip. The
  spec records every observer and `resize` listener as they register and
  disconnects them once the page has settled -- the settled state is what is
  worth photographing, and the mid-capture resize is the tool perturbing the
  page. Second, and subtler: `toHaveScreenshot` re-captures until two
  consecutive frames agree, *but only when it has something to compare
  against*. Writing a missing snapshot under `--update-snapshots` is a single
  shot with no loop, so a baseline could be an unsettled frame while the head
  pass, which does loop, was settled -- a stable-but-wrong diff of 11,711
  pixels on collections, 2,733 on range. The base pass now loops on its own
  until two captures match.
- **The docs chrome is taken out of the picture, and how differs per element.**
  `macros/nav.html` renders the sidenav *and* the footer from `NAV`, so
  documenting one component relinked every page and failed the whole suite.
  The footer is **hidden**, not masked: the failure was a *dimension* mismatch
  (388x7118 against 388x7166, one link row taller), and a mask paints pixels
  without changing the image size, so the page stays 48px taller and still
  fails. The sidenav is **masked** instead -- its box is viewport-height either
  way so it costs no height, and `display: none` on a fixed drawer risks
  reflowing the content beside it.

  **Both selectors have to match the base revision too.** The spec is always the
  head's, but the base pass serves the base worktree's `docs/app.py`, so a hook
  added to a template exists on one side only and the footer would be hidden in
  one pass and not the other. `body > footer` is the chrome's own shape on any
  revision -- a sibling of `<main>`, while the Footer page's demo footers sit
  inside it -- and `#nav-mobile` already existed.

  **Masking the chrome costs no component coverage, but check that rather than
  assuming it.** The Sidenav page's `.navigation-drawer-demo` is made static
  with `transform: none` by `docs.css`, so it sits in flow and is photographed;
  the two `#slide-out` drawers beside it are off-canvas and never were. A
  deliberate restyle of `.navigation-drawer, .sidenav` fails `sidenav` at all
  four widths with the mask on, and a restyled footer fails `footer` at all
  four. Probing this needs a `background-color`, not an `outline` - an outline
  draws outside the element box, escapes the mask, and fails 175 shots that are
  perfectly fine.

- **`transition-duration: 0s` does not stop a transition that is already
  running.** Per spec a running transition keeps the timing it started with, so
  changing its duration afterwards has no effect on it; only removing
  `transition-property` cancels it and snaps the value to its target. The
  stabilisation style tag sets both. The carousel showed why: its hero item's
  `flex-basis` was caught mid-interpolation at the shutter, one pass at weight
  1.2e-09 and the other at 1.07e-03 -- 40px against 40.09px, which resamples
  every edge and placeholder diagonal across three items and lands at 210
  pixels, just past the 100 the tolerance allows.

  **That fix alone did not make the carousel deterministic, and the cause
  recorded here was wrong.** This file used to say the residual flake was the
  hero's small items sitting on a `clamp()` boundary, flipping between 40px and
  40.09px. Measured, that is not what happens: across six runs on an unchanged
  tree under contention, every item's box, its `flex-basis` and every track's
  `scrollLeft` are identical to four decimal places. The only value that moves
  is the parallax translate on three hero images -- 8.34111px, 8.34167px,
  8.34278px, then 8.58722px -- and a quarter of a pixel there resamples every
  diagonal in the placeholder image behind it, which is the 184 to 1,432 pixels
  the page failed by. Measuring the items is exactly why this was missed for so
  long: the items are fine.

- **`reducedMotion: 'reduce'` in the Playwright config never reached the page**,
  and that was the carousel's fourth race. As of Playwright 1.62.1 the `use`
  option does not survive to `matchMedia`, while `newContext({ reducedMotion })`
  and `page.emulateMedia()` both do -- verified with a config carrying nothing
  else. `Carousel._updateParallax` zeroes every item's offset when that query
  matches and otherwise writes one derived from the scroll position, recomputed
  at most once per animation frame by a `requestAnimationFrame`-coalesced scroll
  handler and never again once scrolling stops. The photographed value was
  therefore whatever the last frame to render after the last scroll event had
  computed, and how many frames the machine managed decided which. The spec now
  calls `emulateMedia` and **asserts it landed** -- the assertion is the point,
  since this failed silently for as long as the config line has existed. Every
  page is now photographed in the reduced-motion state the config always
  claimed.

  **Do not settle this by driving the component from the spec.** Dispatching
  `scroll` on each track does force the recompute and does make the parallax
  deterministic -- and it also re-enters `_handleFlatScroll`'s index sync, which
  scrolls the track, which schedules another recompute: `carousel @ expanded`
  then fails "never settled" on every run instead of flaking on some.

  **A component-side fix cannot stabilise this suite on the change that
  introduces it**, which is the general rule the above is one instance of. The
  spec is always the head's, but the base pass runs the *base* revision's
  `dist/`, so a fix written in a component leaves the base pass exactly as
  nondeterministic as it was and the comparison keeps failing. Only something
  in `visual/` reaches both revisions.

  **What reduce costs, stated plainly.** Twelve partials carry a
  `prefers-reduced-motion` block, and every page is now photographed on the
  `reduce` side of them: spinners stop animating, sheets and menus stop
  transitioning, and the one `no-preference` rule -- scrollspy's smooth
  scrolling -- is not exercised at all. That is a state most real users do not
  see. It is the right trade for a screenshot suite: every one of those rules exists to remove motion, and
  motion is the thing a shutter cannot photograph twice the same way. Sizing,
  spacing, colour and token regressions -- what this suite is for -- are
  unaffected by any of them.

  **Reproduce contention with `taskset -c 0,1 env CI=1 npm run test:visual`.**
  The config runs 4 workers under CI against a 2-core runner, and that
  starvation is the whole difference -- none of this reproduces on a 32-core
  machine at default worker counts. Instrument with care: adding a
  `page.evaluate()` before the layout freeze inserts enough delay to hide the
  failure, so a probe can make a flake look fixed.

- **`visual/serve.py`, not `flask --app`.** Werkzeug logs ~1,400 access lines a
  pass, which buries the results; the wrapper quiets that logger so stderr
  stays free for real failures. Silencing stderr wholesale was the first
  attempt and it hid a server that would not start at all -- Playwright could
  only report "Exit code: 1". The wrapper registers the module in
  `sys.modules` *before* executing it, because `Flask(__name__)` resolves its
  template root through `sys.modules[import_name].__file__` and otherwise
  points it at the cwd, where no template is found.

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
   (`<nav>` + anchors + `aria-current`), not a tablist — a role it *withholds*
   until the keyboard model exists.

   **Carousel is not the same case, though this file long said it was.**
   `carousel.ts` implements arrows plus Home/End with focus movement and is
   tested for it, so nothing is owed. It declines `tablist` because it writes
   the ARIA carousel pattern instead — `aria-roledescription` on a group, with
   independent indicator controls. That is a *rejected* role, and conflating the
   two puts a false statement about the code into `semantics.json`: debt says
   "coming once the code catches up", and Carousel's code is not behind.
3. **Never tell an icon from a label by its element.** `$icon` and `$icon-label`
   in `abstracts/_variables` are the one place that distinction is made; five
   selectors used to make it themselves with `i` versus `span`, and all five
   broke silently the day the canonical icon became a `<span>` — icon+label
   buttons lost their leading inset, icon-only toolbar actions turned into text
   pills. `i` stays in `$icon` for pre-0.8.0 markup.

   Icons are `<span class="material-symbols">`, and each one declares itself:
   `aria-hidden="true"` for decoration (the usual case, with the enclosing
   control carrying the name) or `role="img"` plus a label when the icon reports
   something no neighbouring text does. **Hiding an icon hides everything inside
   it** — that is how a badge count nested in an icon becomes inaudible, and
   `aria-hidden="false"` on the descendant does not rescue it. The ligature is
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

   The rule is written with three carve-outs — `article nav`, `.tooltip nav`,
   `.toolbar` — each an action row that should not be `<nav>` at all, where
   *labelling* it would entrench the error. **Delete each carve-out with the sweep
   that owns it.** Two hosts are element-locked and are why those sweeps are
   separate: `article > nav:not(.tabs)` in `_cards.scss`, and the `$_toolbar`
   variable in `_toolbar.scss` — `:is(nav.toolbar, .toolbar:not(.fixed-action-btn):not(.fab))`,
   written that way deliberately, to miss `div.fixed-action-btn.toolbar`.

   The app bar took the same treatment: `$_bar` in `_navbar.scss` is
   `:is(nav:not(…), .bar)`, so a bar holding only a title and controls is a
   `.bar` rather than an empty landmark. **Wrap any such variable in `:is()`** —
   interpolating a bare comma-separated list breaks out of its context, and
   `header.medium > #{$_bar}` duly emitted a top-level `.bar` rule that styled
   every `.bar` on the page. Same trap as `$_icon`.
5. Every user-facing string the framework generates gets an `i18n` option
   (Datepicker and Timepicker already had one; Chips now does).

`tests/semantics.test.js` enforces the rules against the three surfaces that state
markup — `llm.md`, `docs/templates/**`, `tests/fixtures.js`. `website/` is
generated from the templates, so checking it would check the same thing twice.
Notes that matter when working on it:

- **The sweep is complete: 51 of 51 rows enforced, 48 of them components.** Chips,
  then forms, then navigation, then the rest (`input-fields`,
  `fieldset`, `checkboxes`, `radio-buttons`, `switches`, `select`,
  `file-input`, `range`, `autocomplete`, `character-counter`; then `landmarks`,
  `navbar`, `navigation-bar`, `navigation-rail`, `sidenav`, `breadcrumb`,
  `pagination`, `tabs`, `menu`, `scrollspy`, `page-footer`; then icons,
  badges, buttons, cards, toolbar, list, tooltip, preloader, dialog, panes,
  carousel, lightbox, icon-buttons, and nine rows that state no markup of their
  own and say so in their note). **The exempt list is empty — keep it that way.** A
  new component ships enforced or the roster test fails.
- **A row is a component unless it says otherwise.** `kind` names the exception
  and the vocabulary is `rowKinds`, which restates CONTEXT.md: a `foundation`
  has no markup of its own (`transitions`), a `behavior` attaches to markup the
  author already wrote and generates whatever element it needs
  (`docked-display`, `character-counter`). The rules of a non-component row run
  exactly as a component's do — a kind says what the row *is*, not whether it is
  checked — so reclassifying costs no coverage, which is the whole reason the
  roster can be honest without deleting anything.
- **Four rule kinds, and the last two exist for opposite reasons.** `forbid` and
  `require-attr` are selector-level. `require-accessible-name` is not, because
  whether a control ends up named depends on text *nodes* and CSS cannot see
  them. `:has(> .icon:only-child)` counts elements, so it flags
  `<a><span icon/>Five</a>`. Reach for it only when that is genuinely the
  problem.

  `forbid-composite-roles` **is** selector-level — it is a macro. The rule
  states the component's own selector and the checker expands it over
  `compositeRoles`, so the ten roles are named once in `semantics.json` rather
  than once per component, and adding one tightens every such rule instead of
  leaving each a role short. It exists because the alternative had already
  failed: Carousel and Toolbar each named a single role and left the other nine
  legal. Expansion is root-only and the base selector must be the component's
  root with no `:not()` or `:has()` — a conditional or descendant base would
  report blocking all ten while enforcing something narrower, and the invariant
  that every declaring component blocks every composite role rests on it.
- **`website/` is checked as whole pages, not as a fourth surface.** Its
  fragments come from the templates and checking those twice would be
  pointless, but a composed page answers questions a fragment cannot: `<main>`
  nesting, whether a dialog is named, and whether two landmarks on the same
  page share a name — that last has no rule behind it, because there is no
  fragment to write one against. It found 31 landmarks called "Main" on the
  navbar page. 65 pages, under a second.
- **Docs pages are demos, and a demo is a specimen.** A page stacking ten app
  bar examples needs ten distinguishable names, so the live demos are labelled
  by their section (`Main — Center-aligned`) while the `code()` samples keep the
  plain canonical name a reader should copy. The chrome owns the unqualified
  one.
- **`m3-guidelines.md` is a fourth surface, checked differently.** It states
  markup as inline code spans in prose, not as fenced examples, so only rules
  marked `fragmentSafe` run against it — the ones that fire on a *wrong thing
  present*. That is **not** the same as `kind: "forbid"`:
  `fieldset:not(:has(> legend))` forbids, but what it detects is an omission,
  and a fragment omits by nature.
- **The extractor keys on the fence tag**, so a markup sample written as
  ` ```text ` is invisible to it. 37 blocks were in that state, Fieldsets
  entirely. A test now fails any non-`html` fence containing markup — walk the
  fences line by line if you touch it, because an "opening fence" regex also
  matches every closing one.
- A component is `enforced` or `exempt`. **Exempt is the backlog and only ever
  shrinks.** The roster test asserts `semantics.json` rows match the sass partials
  plus `additional`, minus `notComponents`, exactly — so a new component cannot
  ship without a row, which is what makes it enforced from its first commit.
  **`notComponents` is the only way a partial gets out of the roster, and it is
  guarded**: every entry must name a partial that still exists and state why it
  is not a component, so it cannot become a quiet exemption list. One entry sits
  there — `table_of_contents`, whose list is Scrollspy's markup; the partial
  stays in the sheet and `scrollspy` owns the rule for it.
- The check **must never initialize a component**. It parses with jsdom and reads
  the DOM. Components schedule timers (`carousel` a repeating one, eight others
  `setTimeout`s), and a live timer wedges the whole `node --test` run with no
  output.
- One example can opt out with a stated reason: ` ```html ignore-semantics: why `
  in Markdown, `code(check=false, reason="why")` in a template. A reason is
  required — the test fails on a bare opt-out.
- Legacy markup breaks **silently**. No runtime warnings: 26+ components are
  CSS-only and could not emit them, so coverage would be partial and the absence
  of a warning would read as conformance. Migration lives in the CHANGELOG.

## Component naming

Component names follow **Material 3's**, and the divergences that remain are
deliberate:

| M3 | ExpressiveCSS | Note |
| --- | --- | --- |
| Slider | `.slider` / `Slider` | Held the image slideshow until 0.8.0; sole owner of the class since 1.0.0 |
| Navigation drawer | `.navigation-drawer` / `NavigationDrawer` | `.sidenav` / `Sidenav` alias |
| FAB | `.fab` | `.fixed-action-btn` alias |
| Progress indicators | `.progress`, `.progress.circular` | `.preloader` alias |
| Date / Time pickers | `.date-picker`, `.time-picker` | Unhyphenated forms alias |
| Drag handle | `.drag-handle` | `.handle` alias, the bottom sheet's pre-1.0 slot class |
| Text fields | `.field` | **Deliberately not `.text-field`** — the same container wraps `<select>`, autocomplete and file inputs, so the M3 name would be wrong for most of its uses |

Every rename is **additive**: the old class stays in the selector list, the old
export stays as an alias, and `tests/m3-naming.test.js` asserts both — it walks
every rule mentioning an old class and fails if the new one is not on it, which
is how it caught `$_toolbar` excluding `.fixed-action-btn` but not `.fab`.

**One rename changed meaning rather than adding a name.** `Slider` was the image
slideshow and is now the range control, because that is what M3 calls a slider.
Aliasing it would have defeated the rename, so for 0.8.0 the two shared `.slider`
and were told apart by content — `:has([type='range'])` against
`:not(:has([type='range']))`. **That discrimination is gone as of 1.0.0**, with
the slideshow it existed for: M3 has no slideshow and Carousel covers the case,
so `.slider` is the range control and nothing else, and no selector anywhere has
to ask what a `.slider` contains. `Expressive.Slider` in *script* did change
meaning — that one is a documented break, as is the removal itself: there is no
`Slideshow` alias, because an alias would keep both concepts alive while
pretending one had died.

**The button size classes changed meaning too, and could not be aliased
either.** `.small` was 32dp and `.large` 56dp; M3 names those `xsmall` and
`medium`, and its `small` — 40dp — is the default size. Holding `.small` at
32dp would put two names on one rung and leave M3's small with none, so the
whole ladder would be off by one. `.extra` still resolves to the 56dp
geometry, so `class="button extra"` is unchanged; `.small` and `.large` are
breaks, recorded in the CHANGELOG's migration notes. This is a 1.0 change, and
the only reason it is not a `.slider`-style content test is that a size has no
content to tell it apart by.

**`.button.circle` follows the *button* ladder, not the icon-button one** (#72).
It is a common button wearing a round shape — `.icon-button` is the real M3
icon button, with its own token families, its own ladder and its own colours —
so its glyph is `--md-comp-filled-button-icon-size` like every other button's.
The two ladders genuinely disagree at 40dp, which is the size almost every
`.circle` on a page is: M3 gives a 40dp *icon button* a 24dp glyph and a 40dp
*common button* a 20dp one, and `.circle` used to pin the former at every rung
— so it took the size class's box and left the glyph behind, a 24px glyph
adrift in a 136dp `xlarge` disc. Anyone who wanted the icon-button number wants
`.icon-button`. `.circle.extra` / `.circle.large` are the FAB and read
`--md-comp-fab-icon-size`, which is a third ladder and stays one.

## Sass architecture

**Read `src/sass/README.md` before touching styles** — it is the working guide (layer map, the two rules, where new code goes). Summary:

`src/sass/expressive.scss` is the entry point. It declares `@layer tokens, base, components, utilities;` and pulls each one in with `meta.load-css()` (`@forward` cannot appear inside `@layer`), plus `@forward "abstracts"` for the Sass API — `abstracts` is inert and is not a cascade layer. Each layer has an `_index.scss` that forwards its own files; the entry file is the only place cascade order is decided.

Utilities are emitted **after** components now, and win by layer order rather than specificity. Their `!important` flags are deliberately retained: a normal declaration inside a layer loses to any *unlayered* consumer declaration, so dropping the flag would silently stop `.hide` beating a consumer's own `display`.

Three hard invariants, all learned from bugs:

- **Partials import `abstracts` and nothing else** (`@use "../abstracts" as *;`, one line, every file). That means no second *project-local* `@use`, which is what `src/sass/README.md` states and what keeps `expressive.scss` the only place cascade order is decided; a Sass built-in (`sass:map`, `sass:math`) is not a partial and carries no CSS, so it does not count — `utilities/_z-depth.scss` and `components/_icon-buttons.scss` both take one. `abstracts/` must never emit a selector.
- **No `@extend` across files.** `@extend` only resolves if the extending file loads the defining module, which is why components used to `@use` CSS-emitting files and let the dependency graph — not the entry point — decide output position. Use `@include z-depth("1")` or write the declaration directly. Same-file `@extend` and placeholders are fine.

- **A rule that declares a token pairs its anchor with a `:host` twin** — `:root` with `:host`, `:root[theme='dark']` with `:host([theme='dark'])`, `[vibrant]` with `:host([vibrant])`, `body` with `:host`. The sheet is supported as a shadow root's *only* stylesheet (`adr/0002-shadow-only-stylesheet-adoption.md`), and `:root` matches the document element and nothing else — nor are `html` and `body` reachable — so an unpaired anchor leaves its tokens undefined there — which takes every declaration reading one down with it, invalid at computed-value time. `color-scheme` counts as a token: `light-dark()` resolves against the element's used value. This was half-applied for a long time and nothing caught it; `tests/shadow-dom.test.js` does now.

Two color systems coexist:

1. **Material Design 3 tokens** — `tokens/_reference.scss` **generates** five of the six tonal ramps (`--md-ref-palette-primary40`) from `--md-source` using relative color syntax (`oklch(from var(--md-source) …)`), then resolves them into the `--md-sys-color-*-light` / `-dark` pairs. Setting `--md-source` re-themes everything at runtime, no rebuild.

   The generation hinges on the `$tones` table, and the reason is easy to get wrong: **M3 "tone" is CIELAB L\*, not OKLCH lightness**. Tone 40 is L\* 40 but OKLCH L 48.14%, so `oklch(40% c h)` drifts a mean ΔEok of 0.063 (max 0.147) — several times the ~0.02 JND, turning `#006495` into `#004d74`. Going through the table brings that to mean 0.0026, max 0.0069. The table is shared by all ramps because the mapping is near enough hue-independent.

   The **error ramp is deliberately literal hex, not generated** — M3 fixes the error hue rather than deriving it, and it is also the highest-chroma ramp, where OKLab and CIELAB lightness diverge most (it was the only ramp to exceed JND when generated). Do not add `"error"` to `$ramps`.

   `tests/color-drift.test.js` reads the constants out of the Sass, recomputes every ramp entry, and fails if any moves more than `DRIFT_BUDGET` (0.010) from the checked-in Material Theme Builder values in `tests/m3-reference-ramps.js`. It reports each ramp's remaining headroom as a diagnostic. If headroom shrinks toward zero, re-fit the constants — minimising **worst-case** drift, not mean — rather than raising the budget. `tokens/_theme.scss` maps those onto the live `--md-sys-color-*` names once, via `light-dark()` in an `@each` over `$sys-color-roles`, and `:root[theme='light'|'dark']` only set `color-scheme`. The `-light`/`-dark` pairs are public API (the docs' Themes page documents overriding them) and must stay. `light-dark()` resolves against the element's used `color-scheme` at the point of use, so `color-scheme` is load-bearing and a subtree can be re-themed on its own. `utilities/_colors.scss` exposes the live names as utility classes (`.primary`, `.on-surface-text`, …). New styling should consume `--md-sys-color-*` — never the `-light`/`-dark` pair, which locks the rule to one theme.
2. **Legacy Materialize palette — removed.** `abstracts/_palette.scss` (`$colors`, `colorFunc()`) and `utilities/_palette-classes.scss` (`.red.lighten-2`) are gone: 532 rules, 18% of the compiled sheet, expressing a design opinion the framework does not hold, and never theme-aware. The framework consumed exactly one value from it (`$link-color`), now `var(--md-sys-color-primary)`. There is deliberately no Sass color function — a build-time function cannot follow a theme the user switches at runtime. Do not reintroduce one.

All `color-mix()` uses `in oklab`, never `in srgb`: sRGB interpolation dips in lightness through the midtones, so the same percentage reads differently per hue. `oklab` rather than `oklch` because `oklch` interpolates the hue angle and can swing a tint through unrelated hues.

Other things worth knowing:

- `abstracts/_mixins.scss` (`btn`, `btn-filled`, `btn-tonal`, `btn-outlined`, `btn-flat`, `btn-disabled`, `focus-visible`) builds states with `color-mix()` over `--md-sys-color-*`.
- **Translucent colors use `color-mix(in oklab, var(--token) N%, transparent)`, never `rgba(var(--token), 0.N)`.** The tokens hold hex colors, not comma-separated channels, so the `rgba(var(…))` form is invalid and the browser drops the declaration silently — it accounted for every dead rule found so far (hover tints, disabled inputs, medium-emphasis text).
- `abstracts/_elevation.scss` owns the shadow map; the `.z-depth-*` classes in `base/_global.scss` are generated from it, so the classes and the `z-depth()` mixin cannot drift.
- `abstracts/_breakpoints.scss` owns the exact M3 window size classes: Compact `< 600px`, Medium `600–839px`, Expanded `840–1199px`, Large `1200–1599px`, and Extra-large `>= 1600px`. The canonical Sass keys are `compact`, `medium`, `expanded`, `large`, and `extra-large`; `bp-up()` / `bp-down()` / `bp-between()` emit media-query range syntax. Grid prefixes remain `.s` / `.m` / `.l` / `.xl` / `.xxl` in that order. At Extra-large the container cap is 1920px; `.container.wide` caps at 2400px and `.container.max` has no cap.
- `abstracts/_variables.scss` holds the remaining Sass-time knobs (`$root-font-size`, the flow-text bounds, `$font-stack`, `$gutter-width`) — mostly `!default`, several now aliasing CSS custom properties. Typography leaves the browser root size untouched and converts M3's sp values to rem on the standard 16px basis. The type-scale roles choose `--md-ref-typeface-brand` or `--md-ref-typeface-plain`; both default to Roboto and append the Noto Sans fallback.
- Partials renamed with their components in 0.8.0: `_sidenav` → `_navigation-drawer`, `forms/_range` → `forms/_slider`, `_preloader` → `_progress`. `_slider` became `_slideshow` in the same pass and was deleted in 1.0.0.
- `base/_normalize.scss` is normalize.css v8.0.1 trimmed to the support baseline: every rule whose own comment named IE, Edge Legacy or Chrome 57- is gone, and the removals are listed in a header comment so nobody re-adds them. `::-webkit-file-upload-button` became the standard `::file-selector-button`.
- `base/_global.scss` (181 lines, down from 433) is element defaults only — box-sizing, `body`, form-control fonts, links, blockquote, icons, tables. Every selector in it is a bare element; helper classes live in `utilities/`, and component-owned rules in that component's partial (`components/_page-footer`, `_docked-display`, `_transitions`).
- `utilities/_typescale.scss` generates the 15 `.display-large` … `.title-small` classes from a `$typescale-roles` list. Every property it sets must map to a token `tokens/_reference.scss` actually defines — a `var()` pointing at an undefined custom property invalidates the whole declaration silently, which is how these classes previously did nothing. `font-style` is deliberately not set: the `-font-family-style` token holds "Regular"/"Medium", which are weights, not CSS font-style keywords.

## TypeScript architecture

**Read `src/ts/README.md` before adding code** — layout, the add-a-component steps, and the Component contract. Layers: `core/` (base class, `Utils`, types) ← `components/` (per-element widgets) and `behaviors/` (document-level enhancers: `Forms`, `Dialogs`); `plugins/` holds non-`Component` helpers; `index.ts` is the public entry.

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

`src/ts/index.ts` re-exports `components/`, `Forms`, `Dialogs`, `BottomSheets`, `SideSheets`, `AutoInit` and `version`, and runs the import-time side effects: `Forms.Init()`, `Chips.Init()`, `Slider.Init()`, `Cards.Init()`, `ExpandingCard.Init()`, `Dialogs.Init()`, `BottomSheets.Init()`, `SideSheets.Init()`, plus document-level keyboard/focus listeners from `Utils`.

**Adding a component** touches: the new `src/ts/components/<name>.ts`, one export line in `components/index.ts`, one line in `components/registry.ts` if it auto-inits, and a `src/sass/components/_<name>.scss` partial `@forward`ed from `components/_index.scss`.

Supporting files: `core/utils.ts` (shared `Utils` statics — `_setAbsolutePosition`, `checkPossibleAlignments`, `_repositionWithinScreen`, `throttle`, `guid`, `onDocumentReady`, global key/focus state); `core/bounding.ts` and `core/edges.ts` are type-only; `plugins/dockedDisplayPlugin.ts` wraps an element in a `.display-docked` container and positions/animates it (used for picker-style popovers). Dialogs are native `<dialog>` plus `behaviors/dialogs.ts` for light-dismiss — there is no `Modal` plugin.

### Cross-cutting invariants

These were all learned from bugs in the vendored source:

- **Shared document/window listeners need a stable function identity.** ScrollSpy's IntersectionObserver callback is `static` for the same reason: one observer for all instances, disconnect when the last is destroyed.
- **`Utils.onDocumentReady(fn)`, never a bare `DOMContentLoaded` listener** — the event has already fired when the bundle is loaded async or by dynamic import, and the listener then never runs. All eight `Init()` entry points (`Forms`, `Chips`, `Slider`, `Cards`, `ExpandingCard`, `Dialogs`, `BottomSheets`, `SideSheets`) go through it.
- **Never build markup out of values the page author controls.** `optgroup` labels, option text, ids and i18n strings reach the DOM as nodes (`textContent`, `setAttribute`, `getElementById`) — not via `innerHTML` or an interpolated `#${…}` selector, which also throws on any id that is not a bare identifier. `Datepicker.draw()` is the exception: it still assembles an HTML string, so every i18n value it splices in goes through `Datepicker._escape()`.
- **`Datepicker.draw()` is batchable.** One input click legitimately reaches it three times (through `setDate`, directly for the unparseable-input case, and through the trailing `gotoDate`), and each draw destroys and rebuilds two `FormSelect`s. `_batchDraws()` collapses them to one. It is deliberately synchronous — callers read `calendarEl` immediately after `init()`.
- **`Utils.throttle` returns the throttled function; assign it once.** `x = Utils.throttle(fn, 200)` is right; `x = () => Utils.throttle(fn, 200)` builds a fresh closure per event and never calls it, which is how resize handling was dead in three components.
- Scroll and touch handlers that never call `preventDefault()` are registered `{ passive: true }`, and anything running per pointer-move or per scroll reads layout before it writes style.

## docs/

**Every class the docs teach must exist in the sheet**, or be a deliberate hook
(a JS selector like `.tooltipped`, or a documented style-free one like
`chips-initial`). Three ways this rots, all of which have happened: a class is
removed from the Sass and the prose keeps teaching it; the prose asserts an
alias "still works" when nothing matches it (`.page-footer`, `.footer-copyright`,
`carousel-slider`, `.prev` / `.next` were all claimed and all inert); or a code
block is swept and the sentence around it is not. Grep the compiled
`dist/css/expressive.css` for a class before documenting it.

The Flask app serves the npm build **directly out of `dist/`** via the `dist_file` route (`/dist/<path:filename>`) — there is no copy step, so `npm run watch` + browser reload is the dev loop. `docs/static/` holds only docs-site chrome (`docs.css`, `docs.js`), never framework styles.

An `inject_build_assets` context processor exposes `css_url` / `js_url` to templates and picks unminified assets when `app.debug` is set, minified otherwise; it also sets `build_missing`, which renders a "run npm run build" banner in `base.html` when `dist/` is absent. Debug responses are sent with `max-age=0` so rebuilt assets aren't cached.

The bundle only self-initializes Forms/Chips/Slider/Cards — `docs/static/docs.js` calls `Expressive.AutoInit()` on `DOMContentLoaded` for everything else, and toggles `<html theme="light|dark">` to exercise the token layer.

Templates are macro-driven; hand-writing the chrome is what caused every docs bug found so far. `NAV` in `app.py` is the single source for the sidenav *and* the footer (the `<details open>` test reads a derived endpoint list), and the footer version comes from `package.json`. A page declares `page_name` / `page_blurb` and `docs.html` builds the `<title>`, the app bar heading and the banner from them. `macros/page.html` holds the rest: `section(id, label)` registers itself in `toc_sections` (a fresh list per render, from the context processor) so `toc()` can generate the table of contents — write a section once and its TOC entry follows; `page_body()` wraps the standard two-column scaffold and emits that TOC; `code()` escapes a sample so you write real markup instead of `&lt;`. `macros/api.html` owns the Options/Properties/Tokens table headers and the methods `instance_note`. `{% do %}` is enabled for the registration, and the page macros must be imported `with context` because they read `toc_sections`.

`llms.txt` is generated too, by `scripts/gen_llms.py` (`npm run build:llms`,
which needs `uv`). It is the [llms.txt](https://llmstxt.org) link index for the
site: an H1, a summary, then one `##` section per `NAV` group with one link per
page, each link's note being that page's own `page_blurb`. Nothing in it is
authored — the page list is `NAV`, the version and base URL are `package.json`,
so **adding a page to `NAV` adds it here and nowhere else**. It is committed at
the repo root, and `pages.yml` regenerates and commits it beside `website/`
rather than checking it, because it states the version and a release commit
would otherwise leave it stale. `tests/llms.test.js` asserts the property
regenerating restores: every `NAV` page linked once, under its own group, at a
URL `website/` actually has.

`/llms-full.txt` is *not* generated — the route concatenates `m3-guidelines.md`
and `llm.md` per request, in that reading order, so there is no third copy to
keep in step. All four LLM URLs (`/llms.txt`, `/llms-full.txt`, `/llm.md`,
`/m3-guidelines.md`) are Flask routes so `flask run` serves what the site
serves; the three large ones are gitignored under `website/` the way
`website/dist/` is, since they duplicate files already in the repo. **Two views,
not one view with two rules** — Frozen-Flask writes one file per *endpoint*, so
a shared view silently freezes only one of its URLs.

`website/` is generated, which makes it the regression test for any template change: `uv run python freeze.py`, then diff. Modulo whitespace the output must be identical — that is how all five macro refactors were verified.

### The Astro build

`docs/astro.config.mjs` is a second generator running beside Flask (ADR 0003).
Every page under `docs/src/pages/` is one that has been converted; the rest of
the site is still Jinja. Output goes to a gitignored `_site/`. Flask is still
production and still the thing to compare against: a converted page is right
when it is *structurally identical* to the frozen one.

- **Compare `<main>`, not the whole document.** The chrome legitimately differs
  on every converted page — the landing link is `/` rather than
  `/getting-started.html`, and Astro drops the empty `class=""` Jinja leaves on
  an inactive drawer item — so a whole-page diff reports ~238 lines on a page
  that is in fact byte-equivalent where it matters. Parse both to a
  whitespace-insensitive tag/attribute dump, slice out `<main>`, and diff that;
  it is 0 lines on every converted page, and a chrome-only residue confirms the
  rest.
- **The docs toolchain needs Node >= 22.12, the package still needs >= 20.**
  That is astro 7's own `engines`, and it is a *contributor* requirement:
  `package.json`'s `engines` describes what a consumer needs to run the built
  bundle, which is unchanged. There is no `.npmrc`, so `engine-strict` is off
  and `npm ci` on Node 20 warns rather than failing — every `docs:*` script
  then dies on a version error instead. CI's matrix comment carries the same
  note, because a docs step added to the Node 20 leg is how this gets
  rediscovered.
- **`npm run docs:build` builds the framework first, and has to.** The two
  `dist` symlinks dangle on a clean checkout, and Vite's public-dir copy
  `stat`s every entry, so the build dies with `ENOENT` *before* emitting a
  page — the `buildMissing` banner cannot help, because there is nothing to put
  it on. (It still fires under `astro dev`, which serves `public/` lazily and
  just 404s the asset.) `docs:dev` builds first for the same reason, which is
  also what ADR 0003 asks for.
- **`build.format: 'file'` is what keeps the flat `.html` URLs.** Astro's
  default would publish `/buttons.html` as `/buttons/`, and those URLs are in
  search results.
- **`compressHTML: false`, and it is load-bearing.** The pages are
  hand-authored HTML, and the compressor deletes the newline between a word and
  the `<code>` after it — which is a rendered space, not formatting.
  ``The\n<code>min</code> means`` came out as `Themin means` on the Getting
  Started page.
- **`docs/public/` holds three symlinks**, and they are the whole of what keeps
  the site's established asset URLs: `static` to `docs/static`, and
  `dist/css` / `dist/js` to the framework build. Vite's public-dir copy `stat`s
  each entry, so a symlinked directory is followed and lands in `_site/` as real
  files; the dev server serves through them too, which is why `npm run watch`
  shows up on a browser reload exactly as it does under Flask.

  **`dist` is two symlinks rather than one, deliberately.** Linking the whole of
  `dist/` published `dist/types/**` as well — 180 KB of `.d.ts` on a website —
  because a symlinked tree is followed entire. `pages.yml` copies exactly
  `dist/css` and `dist/js`, and these mirror it. The cost is that `.gitignore`'s
  `dist/` now swallows the real `docs/public/dist/` directory before git looks
  inside it, so that one path is re-included by name.
- **`import.meta.url` inside a component points at the emitted chunk**, not at
  the source file, so it cannot address the repository. The repo root is
  stamped in as `__REPO_ROOT__` by `astro.config.mjs`, which is not bundled.
  `BaseLayout.astro` reads `package.json` and checks for `dist/` through it.
- **The landing page is the one page whose route the generator changes.** The
  catalogue records `/getting-started.html`, because that is what the freeze
  publishes; Astro makes the site root canonical instead.
  `docs/src/lib/catalogue.ts` owns that single divergence, and it is also the
  only place the site looks a page up by id: both accessors throw on an unknown
  one the way `url_for` does, so a mistyped link fails the build instead of
  publishing a 404.
- **A page declares its sections once.** `defineSections()` returns them keyed
  by id and in order: `<PageBody>` builds the table of contents from it and each
  `<Section {...S.download}>` is spread from the same object, so a heading and
  its entry cannot drift. Astro has no render-order side channel, which is what
  the Jinja `section()` macro used. `Section` throws on a missing id, because a
  mistyped key spreads *nothing* rather than failing.
- **`<Code code={`…`} />` takes the sample as an explicit template literal**, so
  its whitespace is the author's. It escapes angle brackets and ampersands and
  leaves quotes alone, matching the Jinja filter. `check={false}` plus a
  `reason` is the same opt-out, and `tests/semantics.test.js` reads it — the
  Astro pages are a surface of their own there (`docs/src`), because a
  conversion is exactly the moment markup goes quietly wrong.
- **A page needing its own `<head>` content puts `slot="head"` on the element.**
  That is the Jinja `extra_head` block; `DocsLayout` forwards the named slot to
  `BaseLayout`, which renders it last in the head, where the block was. The
  Typography page's extra Roboto weights are the only use today.
- **`scripts/jinja-to-astro.mjs` is temporary and is deleted with Flask.** It
  moves the predictable syntax and reports what it could not, with a line
  number; macro-heavy pages are finished by hand. One thing it has to do that
  is not obvious: an expression in a quoted attribute is a *literal string* in
  Astro, so `href="{route('grid')}"` publishes those eleven characters and the
  whole attribute has to become an expression.

`tests/docs-astro.test.js` holds the pages to the catalogue — that each
publishes at the route the catalogue gives it, and that its declared and
rendered sections agree — and pins the hooks the duplicated chrome shares with
the Jinja macros, for as long as both exist.

**One check does not follow the migration, and it is the one a fragment cannot
answer.** The composed-page pass in `semantics.test.js` — `<main>` nesting, and
two landmarks on a page sharing a name, the check that found 31 landmarks called
"Main" — reads `website/`, which only the freeze writes. Astro pages are never
in it and `_site/` is not committed, so `docs/src` gets the fragment-level rules
only. The seam that closes this is the build-level verification #83 plans;
until then the guard is that a converted page stays structurally identical to
its frozen counterpart, and that is checked by hand.

**There are two page inventories right now, and that is temporary.**
`docs/src/data/nav.ts` is the shared catalogue the Astro site will be generated
from (`adr/0003`): every canonical page's id, group, label, title, description,
published route and legacy aliases, in one file. `docs/app.py` is still the
running site, so both exist, and `tests/docs-nav-catalogue.test.js` holds them
together — it re-derives the whole contract from the Flask sources and fails on
any disagreement in either direction. **Adding or moving a page means changing
both**, until the cutover deletes the Flask side. That test's comments carry the
derivation rules; the one worth knowing before you read them is that a page's
published route is the **last** `@app.route` above the view, not the first,
which is why `sliders` publishes as `/slider.html`.

**The six legacy routes are not redirect stubs in `website/`.** Frozen-Flask
followed each 301 and wrote a full copy of the target page at the alias URL, so
`dropdown.html` is today a byte-for-byte second Menu page — which is why the
published count is 65 rather than 59, and why the Astro plan replaces them with
canonical-tagged redirects.

The catalogue is typechecked — `tsconfig.json` includes `docs/src`, while
`tsconfig.build.json` keeps its own `include` so nothing from the site reaches
`dist/types`. The test imports the `.ts` file directly and relies on Node's type
stripping, so keep it to erasable syntax: no enums, no namespaces, no parameter
properties. Node 20 cannot strip types, which costs nothing only because
`ci.yml` already skips `test:run` there for jsdom's sake — if that skip is ever
lifted, this import needs a build step.

## Agent skills

### Issue tracker

GitHub Issues on `BaezFJ/ExpressiveCSS`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name. None of them exist in the repo yet — they are created on first use. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the repo root, ADRs in `adr/` — **not** `docs/adr/`, because `docs/` is the Flask docs-site app. See `docs/agents/domain.md`.
