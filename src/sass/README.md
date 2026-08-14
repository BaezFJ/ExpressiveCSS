# src/sass

```
routeplate.scss     entry point - decides load order, nothing else
abstracts/          variables, functions, mixins        (emits no CSS)
tokens/             M3 design tokens as :root custom properties
utilities/          single-purpose helper classes
base/               normalize, element defaults, typography, grid
components/         one file per widget (+ components/forms/)
```

## Two rules

**1. Every partial starts with the same line.**

```scss
@use "../abstracts" as *;   // components/, base/, tokens/, utilities/
@use "../../abstracts" as *;  // components/forms/
```

That single line brings in `$colors` + `colorFunc()`, the Sass variables
(breakpoints, grid, font sizes), `z-depth()`, and the `btn-*` mixins. There is
never a second project-local `@use` to work out — if you find yourself adding
one, see rule 2.

**2. Nothing outside `abstracts/` is ever imported by another partial.**

Layers point one way: everything depends on `abstracts`, `abstracts` depends on
nothing. This is what keeps `routeplate.scss` the only place load order is
decided.

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

## Translucent colors

```scss
// no - tokens are hex, not channels; the browser drops the whole declaration
background-color: rgba(var(--md-sys-color-primary), 0.06);

// yes
background-color: color-mix(in srgb, var(--md-sys-color-primary) 6%, transparent);
```

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

## Load order

`routeplate.scss` forwards `tokens → utilities → base → components`, and that is
the order rules appear in the compiled file. Note utilities are emitted *before*
components, so a component rule beats a helper class at equal specificity — the
legacy `.red`/`.blue` palette classes carry `!important` to get around this, the
token-driven ones in `utilities/_colors.scss` do not.
