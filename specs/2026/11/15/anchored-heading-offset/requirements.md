# Anchored heading offset: requirements

- Feature: a heading reached through a fragment link comes to rest below a sticky top app bar
- Date: 2026-11-15
- Roadmap phase: [Phase 84: offset anchored headings below sticky bars](../../../../roadmap.md#phase-84-offset-anchored-headings-below-sticky-bars), in the milestone "apps that feel finished". No dependencies; it closes the framework stage, so it reruns the phase 78 prompts. The [mission](../../../../mission.md#product-rules) requires a change to existing markup's behavior to be opt-in or carry a migration note.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch at `d762107f7`, after phase 83

## Current behavior and need

Every top app bar (`header:has(> .bar)` or a bare `nav` in a header, `_navbar.scss`) is `position: sticky; top: 0`, 64dp tall, or 112 and 120dp for the flexible `.medium` and `.large` bars (136 and 152 with a subtitle). A fragment link scrolls its target to the top of the viewport, under the bar, so the heading it names is hidden. Only `.scrollspy` sections carry an offset (`--md-comp-scrollspy-offset`, 200px, as `scroll-margin`).

## Scope

- On a page whose body holds a sticky top app bar, headings `h1` to `h6` with an `id` get `scroll-margin-block-start: var(--expressive-anchor-offset)`, defined on the root for that page: 64px plus 8px of breathing room for a small bar, 120px for `.medium`, 128px for `.large`, and 16px more with a subtitle `hgroup`.
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
| A new `--expressive-anchor-offset` token on the root, not the scrollspy token | Decided from evidence (the roadmap's open question) | The scrollspy token lives on `.scrollspy` sections with a 200px default that the scrollspy script rewrites per instance; reusing it would tie every heading to one scrollspy's value. A root token is read by any heading and is easy to override for a custom bar. |
| `scroll-margin` on headings, not `scroll-padding` on the root | Decided from evidence | Root `scroll-padding` would add to `.scrollspy` sections' own `scroll-margin` and move every existing scrollspy target further down. |

## Requirements

- **R1** `html:has(body header:has(> <bar>))` defines `--expressive-anchor-offset`: 72px for a small bar, 120px with `.medium`, 128px with `.large`, each 16px more when the header holds an `hgroup`. `:where(h1, h2, h3, h4, h5, h6)[id]` on such a page gets `scroll-margin-block-start: var(--expressive-anchor-offset)`. Pages without a top app bar don't change.
- **R2** A browser test in Chromium, Firefox and WebKit: on a page with a sticky small top app bar and long content, opening `#target` leaves the whole `h2#target` visible below the bar; the same holds for a `.medium` bar; a page without a bar puts the heading at the top; a `.scrollspy` section's offset is unchanged.
- **R3** `llm.md` and the app bar docs page describe the offset and the token; CHANGELOG has an entry with a migration note; the CSS gzip budget line is raised with a reviewed comment; `npm run build:skill` runs last.
- **R4** The framework-stage rerun: each prompt rebuilt twice under the procedure, reviewed with the baseline trees, each checked by its script, recorded as `2026-11-15-framework-stage` with six rows. A regression is recorded and reported for the phase 87 stage, not used to revise this phase.
- **R5** Verify and the MCP smoke test pass.

## Risks considered

- Two at once, bad input, refusal: not applicable.
- Readers: the scrollspy (its sections keep their own margin), docs pages with a sticky header that link to headings (`npm run docs:verify` and the docs tests cover them), gzip budgets.
- UI states: enlarged text (the token is in px; the docs say to override it for a taller bar), RTL (block start is unaffected).
- `specs/checklist.md`: the project has none.
