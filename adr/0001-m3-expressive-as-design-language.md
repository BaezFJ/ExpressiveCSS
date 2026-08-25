# Material 3 Expressive is the design language, not the component roster

ExpressiveCSS targets **Material 3 Expressive** as its normative spec — tokens,
shape, motion and component naming all follow it, and where a component exists
in M3 Expressive its anatomy and token families are the standard we implement
against. But the *roster* is ours. M3 is a cross-platform, application-oriented
spec; ExpressiveCSS is a web framework whose users build documents as well as
apps, and a framework that cannot render a breadcrumb because M3 does not
define one is worse for its users than one that diverges deliberately.

## Considered options

**M3 as implementation.** Treat M3's component list as ExpressiveCSS's list:
anything outside it is out of charter and removed by default. There is real
precedent for this reading — the legacy Materialize palette was cut on exactly
these grounds, for "expressing a design opinion the framework does not hold".
Rejected because the same argument deletes Breadcrumb, Pagination, Lightbox and
Page footer, none of which M3 declines to define on principle; it simply is not
a document-shaped spec.

**M3 as aesthetic only.** Follow M3's look but keep naming and structure free.
Rejected because it forfeits the thing the token layer is for: `--md-sys-*`
names, the generated tonal ramps and the M3 component naming are what let a
reader carry knowledge between M3 implementations.

## Consequences

A non-M3 component stays only if it is **(i)** a genuine web-document need M3
does not address, and **(ii)** expressible in M3's tokens and shape system
without inventing a parallel design opinion. Applied: Breadcrumb, Pagination,
Page footer, Panes, Lightbox and Expanding card stay. Parallax and Pulse go —
both fail (ii), being decorative motion opinions that M3 Expressive's
`MotionScheme` contradicts. Slideshow goes for a different reason, folding into
Carousel as a duplicate concept.

Adopting Expressive over baseline M3 is cheap, and that is a fact worth
recording because it is not obvious: diffing Google's generated token sets
(DSP v0.192, 84 `md-comp-*` families, against DSP 34.0.21, 177) shows **93
families added and 2 removed**. Baseline and Expressive names coexist
deliberately — `menu` and `menus`, `navigation-rail` and `nav-rail`,
`elevated-button` and `button-elevated`. Expressive is additive at the token
layer, so this is not a migration off baseline.

Adopting M3 Expressive as normative does **not** license shipping a composite
role whose keyboard contract is unimplemented. SEMANTICS rule 2 continues to
outrank the spec's opinion: M3 Expressive promotes Toolbars to a first-class
component, and `.toolbar` still withholds `role="toolbar"` until its keyboard
model exists. That withholding is tracked as conformance debt, not as an
exemption.

## A caveat on sourcing

Every claim above about M3's contents is derived from the generated token
families vendored in `material-components/material-web`
(`tokens/versions/latest/sass`), which is the only primary source that proved
fetchable — `m3.material.io` is JS-only and returns nothing useful. Token
families over-count components: they include size axes, baseline/Expressive
name pairs, and primitives such as `scrim` and `divider` that are not
components at all. **No verified source for M3's canonical component list or its
category grouping was found.** Do not treat a count of token families as a count
of components, and do not trust a component list that does not say where it came
from.
