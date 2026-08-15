# src/sass

```
routeplate.scss     entry point - decides cascade order, nothing else
abstracts/          variables, functions, mixins        (emits no CSS)
tokens/             M3 design tokens as :root custom properties
base/               normalize, element defaults, typography, grid
components/         one file per widget (+ components/forms/)
utilities/          single-purpose helper classes
```

## Browser support

The last 5 versions of Chrome and Firefox. No IE, no Edge Legacy. Declared in
`package.json` under `browserslist` - nothing reads it automatically, since
there is no autoprefixer or postcss step, but it is the baseline every
judgement call in here is made against.

That baseline is what licenses `@layer`, `light-dark()`, `color-mix()`,
`aspect-ratio`, `clamp()`, `inset` and media-query range syntax to be used
directly, with no fallback. A vendor prefix is only justified now if the
property is non-standard with no unprefixed equivalent
(`-webkit-tap-highlight-color`, `-webkit-font-smoothing`) or the selector is an
engine's private pseudo-element (`::-webkit-slider-thumb`, `::-moz-range-track`).
Everything else was removed.

## Two rules

**1. Every partial starts with the same line.**

```scss
@use "../abstracts" as *;   // components/, base/, tokens/, utilities/
@use "../../abstracts" as *;  // components/forms/
```

That single line brings in the breakpoint mixins, the Sass variables (grid,
font sizes), `z-depth()`, and the `btn-*` mixins.
There is never a second project-local `@use` to work out — if you find yourself
adding one, see rule 2.

**2. Nothing outside `abstracts/` is ever imported by another partial.**

Dependencies point one way: everything depends on `abstracts`, `abstracts`
depends on nothing. This is what keeps `routeplate.scss` the only place cascade
order is decided. (This is the Sass dependency graph, not the CSS `@layer`
list — they happen to be described by the same word.)

The trap is `@extend`: it only resolves if the extending file loads the module
that defines the class, so `@extend .z-depth-1` used to force components to
`@use` a CSS-emitting file, and whichever partial got loaded first silently
decided where its CSS landed in the output. Use a mixin instead:

```scss
// no
@extend .z-depth-1;
@extend .surface-variant;

// yes
@include z-depth("1");
background-color: var(--md-sys-color-surface-variant);
```

`@extend` within a single file (placeholders, `.btn-large { @extend .btn; }`) is
fine — it crosses no boundary.

## Breakpoints

Three of them, in `abstracts/_breakpoints.scss`, reached through mixins:

```scss
@include bp-up("small")   { }   // @media (width >= 601px)
@include bp-down("large") { }   // @media (width < 993px)
@include bp-between("small", "large") { }
```

Names are `small` (601px), `large` (993px), `xlarge` (1201px) — the boundary a
query sits on, not the size of the screen it targets. Range syntax has an
exclusive comparator, so the old `600.99px` / `992.99px` values used to stop
`max-width` and `min-width` both matching on the boundary pixel are gone, and
each boundary is written once.

The interpolated-string form (`@media #{$medium-and-up}`) still compiles and now
produces the same range queries, but it is deprecated and unused in here.

## Theming

`tokens/_reference.scss` **generates** five of the six M3 tonal ramps from
`--md-source` with relative color syntax, then resolves them into a
`--md-sys-color-<role>-light` / `-dark` pair per role. `tokens/_theme.scss` maps
each pair onto the live `--md-sys-color-<role>` name with `light-dark()`, in one
`@each` over `$sys-color-roles`.

The shipped seed is `#006A79`, a teal. It is chosen, not arbitrary: the error
ramp is pinned at hue 27.7°, and both primary and tertiary (source + 62°) derive
from the seed, so the seed has to keep both clear of red. Warm "appetising" hues
(0–60°) put primary on top of error — ΔEok 0.07–0.12 against ~0.28 for teal.
Green is avoided so it stays available for a "settled/paid" role, which Material
does not supply. See the comment above `$md-source`.

Setting `--md-source` re-themes the whole system at runtime, with no rebuild:

```css
:root { --md-source: #6750a4; }   /* everything but the error ramp follows */
```

Two things about that file are load-bearing and non-obvious. **M3 "tone" is
CIELAB L\*, not OKLCH lightness** — `oklch(40% c h)` is not tone 40, and using it
drifts far past the just-noticeable difference; the `$tones` table is the
conversion. And the **error ramp is literal hex on purpose**, because Material
fixes the error hue rather than deriving it. `tests/color-drift.test.js` enforces
both.

The pairs are public API — the docs' Themes page tells people to override them —
so they stay. Consume the live name:

```scss
// no - locks the rule to one theme
border-bottom: 1px solid var(--md-sys-color-surface-variant-light);

// yes
border-bottom: 1px solid var(--md-sys-color-surface-variant);
```

`light-dark()` resolves against the element's used `color-scheme` at the point
of *use*, not where the custom property was declared. So `:root[theme='dark']`
only has to set `color-scheme: dark` and all 30 tokens re-resolve — and setting
`color-scheme` on any subtree re-themes just that subtree. `color-scheme` is
load-bearing now; changing it is not cosmetic.

## Translucent colors

```scss
// no - tokens are hex, not channels; the browser drops the whole declaration
background-color: rgba(var(--md-sys-color-primary), 0.06);

// yes
background-color: color-mix(in oklab, var(--md-sys-color-primary) 6%, transparent);
```

Mix `in oklab`, not `in srgb`. sRGB interpolation darkens and desaturates
through the midtones, so a 50% tint reads muddier than either endpoint; OKLab is
perceptually uniform, so a 16% state layer looks like 16% on every hue. Use
`oklab` rather than `oklch` for mixing: `oklch` interpolates the hue *angle*,
which can swing a tint through unrelated hues on its way between two colors.

A `var()` that names an undefined custom property fails the same silent way, so
a typo costs you the rule with no warning at build time. To audit the compiled
sheet, compare every `var(--x)` reference against every `--x:` definition — the
names use hyphens, and a regex of `[\w-]+` (not `[a-z-]+`) will also catch
stragglers written with underscores.

## Where things go

| Adding | Goes in | Then |
| --- | --- | --- |
| A component | `components/_thing.scss` | add `@forward "thing";` to `components/_index.scss` |
| A helper class | `utilities/` — `_z-depth`, `_spacing`, `_visibility`, `_helpers`, `_colors` | add to `utilities/_index.scss` if it is a new file |
| A shared value or mixin | `abstracts/` | add to `abstracts/_index.scss` |
| An element default | `base/_global.scss` | — |

A rule is a **utility** when it is one job, one class, and independent of any
component (`.hide`, `.m-3`, `.truncate`). It belongs in **base** when it styles
bare elements (`a`, `table`, `blockquote`), and in **components** when it only
exists to serve one widget — including widgets whose CSS is driven by
JavaScript rather than by a user-applied class (`.pinned`, `.display-docked`,
`ul.staggered-list li`). If a selector in `base/` names a component, it is in
the wrong file.
| A colour/type token | `tokens/_reference.scss` | wire it up in `tokens/_theme.scss` |

Anything under `abstracts/` that emits a selector is a bug: it would put CSS in
the output at a position `routeplate.scss` does not control.

## Cascade layers

`routeplate.scss` declares `@layer tokens, base, components, utilities;` and
loads each layer with `meta.load-css()` — `@forward` cannot appear inside
`@layer`, which is the only reason the entry file uses a different mechanism
from every other index file.

Three consequences worth knowing:

**Utilities beat components, without specificity.** Layer order outranks
specificity entirely, so `.hide` wins over `.collection .collection-item` even
though it is less specific. Utilities used to be emitted *before* components and
had to out-shout them; they are now last.

**Unlayered CSS beats every layer.** A consumer overriding the framework writes
plain `.btn { … }` and wins — no specificity war, no dependence on where
RoutePlate sits in their bundle. This is the main thing layers buy.

**`!important` is deliberately kept on utilities.** It looks redundant now, and
it is not. Layer order *reverses* for important declarations, but the rule that
matters here is simpler: a normal declaration inside a layer loses to any
unlayered declaration. Drop the flag from `.hide` and it stops beating a
consumer's own `display` — silently, and in the common case. Classes whose whole
job is to be unconditional (`.hide`, `.m-3`, the palette classes) keep it.

The `!important` in `components/` is a different thing again: `.pushpin`,
`.tap-target` and the preloader set JS-driven geometry that must not be
overridable. Those stay too.
