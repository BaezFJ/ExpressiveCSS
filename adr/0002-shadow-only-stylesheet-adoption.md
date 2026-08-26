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

Eleven rules carry a `:host` twin, `[icon-style]`, the three `[theme]`
selectors and the grid's two `body` rules included, so a shadow tree can be
pinned to a theme or an icon style the way a page can, and a grid in one has a
gutter. `:host` matches nothing in a document, so none of this
changes what a normally-loaded sheet does.

The commitment is bounded to what CSS alone can honour. Adopting the sheet does
not carry the JavaScript with it: components still need `Expressive.AutoInit()`
against the right root, and nothing here claims a shadow tree is auto-initialized.

`:host` has no effect on specificity — it is one pseudo-class, the same weight
as `:root` — so pairing an anchor cannot shift which rule wins.
