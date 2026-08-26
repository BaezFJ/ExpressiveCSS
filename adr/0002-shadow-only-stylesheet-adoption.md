# The sheet is supported as a shadow root's only stylesheet

`dist/css/expressive.css` may be adopted into a shadow root
(`shadowRoot.adoptedStyleSheets = [expressive]`) **with no copy in the
document**, and everything in it works. That is a support commitment, not a
styling preference, which is why it is recorded here rather than only in
`src/sass/README.md`.

It follows that every rule declaring a token has to be reachable from inside a
shadow root. `:root` matches the document element and nothing else, and a
shadow root contains no `html` or `body` either, so a rule anchored on one of
those never fires there and the tokens it declares are simply absent. The rule
this obliges is one line long and lives in `src/sass/README.md`: **pair the
anchor with its `:host` twin** — `:root` with `:host`, `:root[theme='dark']`
with `:host([theme='dark'])`, `[vibrant]` with `:host([vibrant])`, `body` with
`:host`. `tests/shadow-dom.test.js` fails any rule that does not.

## Why this needed deciding at all

The convention already existed and was half-applied, which is the worst of both
answers. Three blocks carried `:host` — `tokens/_theme.scss`,
`tokens/_state.scss`, `tokens/_vibrant.scss` — and five did not, among them the
entire reference layer at 338 declarations. So the sheet simultaneously
asserted that shadow-only loading was supported and that it was not, and a
reviewer had to catch the gap by hand on a new token in #37 rather than a test
catching it.

It was not only the token layer. `base/_grid.scss` declared `--gap-size` on
`body`, and `.row` reads it with no fallback, so every grid in a shadow-only
load had an invalid `gap` rather than a default one — found by the review of
this change, after the first pass had narrowed the rule to `:root`.

The half that was defined was defined in terms of the half that was not:
`tokens/_theme.scss` resolves every role as
`light-dark(var(--md-sys-color-<role>-light), …)`, and both pairs came from the
`:root`-only block. An undefined custom property makes its whole declaration
invalid at computed-value time, so a shadow-only load did not lose 338 tokens
and keep the rest — it lost every colour in the sheet.

## The failure, measured

A page that adopts the sheet into a shadow root and nowhere else, reading
computed values off a `.button`, a `.row` and a `<span class="material-symbols">`
inside it. Left, the sheet at `fb76d2f`; right, after the pairing:

| | before | after |
| --- | --- | --- |
| button `background-color` | `rgba(0, 0, 0, 0)` | `oklch(0.8263 0.123 212.611)` |
| `.row` `gap` | `normal` | `24px` |
| icon `font-family` | `system-ui` | `"Material Symbols Outlined"` |
| `--md-sys-color-primary` | *empty* | `light-dark(oklch(…), oklch(…))` |

The last row is the one to read twice. That token was *declared* — its block
already carried `:host` — and it still computes to nothing, because substituting
an undefined `var()` into a custom property makes its computed value the
guaranteed-invalid value. Half the sheet defined in terms of the other half is
not half-broken.

## Considered options

**Drop the three `:host` rules instead.** Cheaper in one sense: it is fewer
selectors, and the broken configuration is one nobody develops in, because
custom properties inherit through shadow boundaries and the ordinary setup
(framework in the document, *also* adopted into components) was never affected.
Rejected because the cost of the opposite answer is a `:host` compound per
token-declaring rule — currently nine of them — while the cost of withdrawing
support is a capability the sheet already advertised, aimed squarely at the
users least able to work around it. A web component that ships its own shadow
styles and does not control the host page is the case that needs this most.

**Support it, but by documentation.** Rejected on the evidence above: the
convention was documented, in a comment in `tokens/_vibrant.scss` explaining
precisely why `:host` was there, and five later blocks were written without it
anyway. A convention nothing checks decays at the rate components are added.

## Consequences

Nineteen rules in the compiled sheet carry a `:host` arm, `[icon-style]`, the
three `[theme]` selectors and the grid's two `body` rules included, so a shadow
tree can be pinned to a theme or an icon style the way a page can, and a grid in
one has a gutter. `:host` matches nothing in a document, so none of this
changes what a normally-loaded sheet does.

## What the commitment does not cover

It is a commitment about the **stylesheet**, and it stops where the stylesheet
does. Two bounds, and the second is sharper than it first looks.

Adopting the sheet does not carry the JavaScript with it: components still need
`Expressive.AutoInit()` against the right root, and nothing here claims a shadow
tree is auto-initialized.

The second bound used to be sharper: **six places built an element and appended
it to `document.body`**, so the node landed outside the shadow root and its
adopted sheet could not match it. That is fixed. `Utils.portalRoot(el)` returns
`el.getRootNode()` when that is a shadow root and `document.body` otherwise, and
every portal goes through it:

| Site | Portal | Selector that was left unmatched |
| --- | --- | --- |
| `tooltip.ts` | the tooltip surface | `.tooltip` |
| `snackbar.ts` | the snackbar container | `#snackbar-container` |
| `lightbox.ts` | the caption | `.lightbox-caption` |
| `navigationDrawer.ts` | the edge drag target | `.drag-target` |
| `datepicker.ts` (x2) | the month and year menus, moved to a container | `.menu` |

**Escaping to `document.body` was deliberate, and following the root gives that
up.** A portal on the body escapes an ancestor's `overflow: hidden` and any
ancestor stacking context; inside a shadow root neither is escaped, because the
host's own ancestors are still in the flattened tree. The concrete consequences,
since nothing here recomputes coordinates: `.tooltip` is `position: absolute` and
is written document coordinates, so a **positioned** ancestor above the host
re-anchors it; `#snackbar-container`, `.lightbox-caption` and `.drag-target` are
`position: fixed`, so a **transformed** (or `filter`/`perspective`/`contain`)
ancestor above the host re-anchors those. Both are properties of where the host
was placed, and a component cannot see past its own root to fix them. A page that
puts its shadow host inside such an ancestor wants the portals in the document —
which is what it gets by not using a shadow root for that subtree.

The snackbar needed more than a lookup: `Snackbar._container` is a single static
shared by every snackbar, and a snackbar has no originating element to read a
root from. It takes a `root` option (any element in the target tree) and, because
only one snackbar shows at a time, the one container **moves** between roots
rather than becoming one container per root.

Native `<dialog>` is unaffected and always was. A top-layer element is painted
outside the document's paint order but stays in its own tree, so style scoping
still reaches it.

`tests/portals.test.js` covers both halves — light-DOM portals still land on
`document.body`, shadow-DOM portals stay in their root and leak nothing to the
document.

Pairing does move specificity, which is worth stating because the obvious
assumption is that it does not. Bare `:host` weighs (0,1,0), the same as
`:root`; but `:host(<compound>)` takes `:host`'s weight **plus** its argument's,
so `[vibrant]` at (0,1,0) pairs with `:host([vibrant])` at (0,2,0). Nothing in
the sheet is affected, because the two arms of a pair match disjoint elements —
one only in a document, the other only a shadow host — so they never compete.
The trap is a rule that would need to *lose* to a `:host`-paired one inside a
shadow tree.
