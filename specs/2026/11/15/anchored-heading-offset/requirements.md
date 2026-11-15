# Anchored heading offset: requirements

- Feature: a heading reached through a fragment link comes to rest below a sticky top app bar
- Date: 2026-11-15
- Roadmap phase: [Phase 84: offset anchored headings below sticky bars](../../../../roadmap.md#phase-84-offset-anchored-headings-below-sticky-bars), in the milestone "apps that feel finished". No dependencies; it closes the framework stage, so it reruns the phase 78 prompts. The [mission](../../../../mission.md#product-rules) requires a change to existing markup's behavior to be opt-in or carry a migration note.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch at `d762107f7`, after phase 83

## Current behavior and need

Every top app bar (`header:has(> .bar)` or a bare `nav` in a header, `_navbar.scss`) is `position: sticky; top: 0`, 64dp tall, or 112 and 120dp for the flexible `.medium` and `.large` bars (136 and 152 with a subtitle). A fragment link scrolls its target to the top of the viewport, under the bar, so the heading it names is hidden. Only `.scrollspy` sections carry an offset (`--md-comp-scrollspy-offset`, 200px, as `scroll-margin`).

## Scope

- On a page whose `body > header` is a top app bar, headings `h1` to `h6` with an `id`, outside dialogs, get `scroll-margin-block-start: var(--md-comp-top-app-bar-anchor-offset)`, defined on the root: the bar's height plus 8px, in `rem()`.
- Docs in `llm.md` and the app bar page, a CHANGELOG entry with a migration note, a browser test in all three engines, a CSS gzip budget line.
- The framework-stage rerun of all three prompts, like phase 82's, recorded as `2026-11-15-framework-stage`.

## Exclusions

- Elements other than headings, and pages without a sticky top app bar: unchanged.
- `.scrollspy` sections keep their own offset.
- Other sticky surfaces (status bar, bottom toolbars, sheets).

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Default on for headings with an `id`, but only on a page that has a sticky top app bar (the roadmap's open question) | Decided from evidence | The bar is sticky by default, so every such page hides its anchored headings today; that is a defect, not a style choice. Pages without a top app bar don't change. The CHANGELOG carries a migration note, which the mission allows for a change to existing behavior. |
| A new `--md-comp-top-app-bar-anchor-offset` token on the root, not the scrollspy token | Decided from evidence (the roadmap's open question) | The scrollspy token lives on `.scrollspy` sections with a 200px default that the scrollspy script rewrites per instance; reusing it would tie every heading to one scrollspy's value. A root token is read by any heading and is easy to override for a custom bar. |
| `scroll-margin` on headings, not `scroll-padding` on the root | Decided from evidence | Root `scroll-padding` would add to `.scrollspy` sections' own `scroll-margin` and move every existing scrollspy target further down. |

## Requirements

- **R1** `html:has(> body > header:has(> <bar>))` defines `--md-comp-top-app-bar-anchor-offset`: `rem(72px)` for a small or collapsed bar; for an uncollapsed `.medium` bar `rem(120px)`, or `rem(144px)` with a subtitle (`hgroup > p`); for an uncollapsed `.large` bar `rem(128px)`, or `rem(160px)` with a subtitle. `:where(h1, h2, h3, h4, h5, h6)[id]` on such a page, outside dialogs and panes (`.pane`, `.list-pane`, `.primary-pane`, `.detail-pane`, `.supporting-pane`, which scroll themselves), gets `scroll-margin-block-start` from it. The rules have zero specificity, so a page's own `:root` token or heading `scroll-margin` wins. Pages whose only app bars sit deeper (demos in articles, cards or dialogs) don't change. The docs say to override the token for a taller bar: a larger container height, a small bar whose destinations wrap, or a flexible bar whose title wraps to two lines.
- **R2** A browser test in Chromium, Firefox and WebKit (CSS only, no AppBar script): on a page with a sticky small top app bar and long content, opening `#target` leaves the whole `h2#target` visible below the bar; the same holds for a `.medium` and a `.large` bar, each with and without a subtitle, and a collapsed `.large` bar; a page whose only `.medium` bar is a demo inside an article keeps headings at the top; a page without a bar puts the heading at the top; a heading in a dialog or a pane gets no offset; a `.scrollspy` section's offset is unchanged; setting the token to 0 on `:root` turns the offset off.
- **R3** `llm.md` and `docs/src/pages/navbar.astro` describe the offset and the token; CHANGELOG has an entry with a migration note telling sites that already set `scroll-padding-top` on `html` to remove it or set the token to 0; the CSS gzip budget line is raised with a reviewed comment; `npm run build:skill` runs last.
- **R4** The framework-stage rerun: each prompt rebuilt twice under the procedure, reviewed with the baseline trees, each checked by its script, recorded as `2026-11-15-framework-stage` with six rows. A regression is recorded and reported for the phase 87 stage, not used to revise this phase.
- **R5** Verify and the MCP smoke test pass.

## Risks considered

- Two at once, bad input, refusal: not applicable.
- Readers: the scrollspy (its sections keep their own margin), docs pages with a sticky header that link to headings (`npm run docs:verify` and the docs tests cover them), gzip budgets.
- UI states: enlarged text (the token is in px; the docs say to override it for a taller bar), RTL (block start is unaffected).
- `specs/checklist.md`: the project has none.
