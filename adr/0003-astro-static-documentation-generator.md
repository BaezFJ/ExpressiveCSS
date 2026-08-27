# Astro generates the documentation site, and nothing generated is committed

The documentation site was authored in Flask and Jinja, frozen into a committed
`website/` tree by Frozen-Flask, and then reshaped again by the Pages workflow —
three representations of one site, two of them generated, all three in Git.
**Astro is now the sole static generator for `docs/`**, its output is ignored,
and the Pages job uploads the built artifact directly.

This was recorded before implementation, because the parts of it that are easy to
undo by accident — the custom site, the ignored output, the custom domain — are
exactly the parts a later contributor would "fix" without knowing they were
decided.

## What is decided

**Astro, producing a static site.** No server-side rendering in production, no
client-side routing, no hydration islands, and no UI framework. The documentation
already has its own browser JavaScript and its own component demonstrations; a
generator's job here is to emit HTML that the framework's own bundle then brings
to life. Astro's file-format output keeps the flat `.html` URLs the site already
publishes, which is the property that makes the swap invisible to readers.

The one URL that changed owner is the root. Astro makes `/` the canonical
landing page and `/getting-started.html` a compatibility alias. `/index.html`
is the root document written by Astro's file-format build, not another alias.

**The custom site is preserved, not replaced by a documentation theme.**
Starlight and its peers are prose-shaped: sidebar, article, next/previous. This
site is a showcase — 59 pages of live components, theme and source-colour
controls, hundreds of runnable examples — and it is also the framework's own
largest smoke test. A theme would turn the interactive documentation into a
generic prose site, which is a redesign wearing a migration's clothes.

**`https://www.expressivecss.com` stays canonical**, declared in the
documentation's own public assets rather than only in the repository's Pages
settings, so the configuration is visible to a reader of the source. The
GitHub project-subpath address is not supported alongside it. Supporting both is
what forced the deploy-time URL rewriting that this migration removes.

**Generated output is never committed.** No frozen page tree, no generated LLM
documents, no site artifact. Committing them buys a reviewable diff of machine
output and costs a duplicated copy of the repository's content, regeneration
commits racing ordinary development, and a deployment workflow holding write
access to the default branch. The build artifact goes straight to Pages, and the
workflow drops to read-only contents.

**One catalogue is the page inventory.** `docs/src/data/nav.ts` records every
canonical page's id, navigation group, label, title, description, published route
and legacy aliases, and everything that needs a page list — the drawer, the
footer, the `llms.txt` index, the alias redirects, the tests — reads it. The
replaced system split that inventory among Flask routes, Jinja templates and a
committed generated site, which agreed only by hand.

**Documentation build terminology stays out of `CONTEXT.md`.** The glossary
defines the framework's domain — components, tokens, semantics. "Catalogue",
"alias", "artifact" are implementation vocabulary for how this repository builds
a website, and a glossary that absorbs its own build tooling stops being a
glossary.

## Considered options

**Keep Flask and stop committing `website/`.** The cheapest change, and it fixes
the duplication but not the split: contributors would still need Python for
documentation alone, tests would still be coupled to Flask routes, and the
deploy would still have to reconcile the live URL shape against Pages' static
one. Rejected because the committed tree is a symptom.

**A documentation theme (Starlight or similar).** Rejected above: the site is a
component showcase, and no prose theme renders one.

**A Node generator with no framework — a script emitting HTML from the
catalogue.** Genuinely tempting, and it is roughly what `freeze.py` already is.
Rejected because the parts that are not "loop over pages" — layouts, per-page
sections and the table of contents built from them, the code-sample component,
asset handling, a development server with reload — are the whole job, and they
are what Astro already is.

## Consequences

The migration landed as one atomic change on the default branch: two competing
documentation systems must never both be present there, because the second one
to be updated is the one that quietly goes stale. It was developed as ordered
commits on a branch, including this ADR and the catalogue. Once Astro became the
documentation path the catalogue became the sole inventory, and the temporary
parity test went with the agreement it existed to check.

Tests describe published behaviour rather than the generator. The seam is the
built site: pages, aliases, assets and LLM endpoints enumerated from the
catalogue and checked on disk. Checks that only proved Flask routes, Jinja
templates and frozen files agreed with each other have nothing left to prove and
go with them.

Visual regression keeps its merge-base comparison and its 100-pixel tolerance.
Both revisions are built with `npm run docs:build` and served from `_site/`, so
the suite compares the same published Astro seam on each side. Byte formatting
of the HTML is explicitly not compared, only the rendered result.

Python has left the repository's documentation path entirely. A clean checkout
builds, tests and publishes the site with Node alone.
