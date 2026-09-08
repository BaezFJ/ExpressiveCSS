# Complete interface examples

These fictional Common Ground examples use ExpressiveCSS 0.8.0. Each has the
same content and behavior in restrained and expressive treatments. Open **Why
these treatments?** for annotations about the product context, action size,
containment, typography, semantic color pairs, and shape.

| Example | Primary task | When restraint fits | When more expression fits |
| --- | --- | --- | --- |
| [Workspace settings](settings.html) | Choose updates and save preferences | Frequent administrative adjustments | A first visit focused on choosing a manageable routine |
| [Newsletter editor](editor.html) | Write, format, preview, and save a draft | A coordinator's weekly writing | Helping first-time community writers check their work |
| [Reading list and detail](list-detail.html) | Select a story and mark it read | Scanning a reference collection | Giving one selected story attention during a reading session |

## Run in this repository

Build the framework once with `npm run build`, then run one example:

```sh
node scripts/preview-expressivecss-examples.mjs settings
node scripts/preview-expressivecss-examples.mjs editor
node scripts/preview-expressivecss-examples.mjs list-detail
```

Run one command at a time. Open its printed localhost URL. The existing evaluator
creates a temporary consumer, copies the selected example and built package,
and serves only its public assets. Ctrl+C closes the server and removes that
consumer. Changes to the running copy are disposable; edit these source files
when improving an example. Preview has the evaluator's 1,000-request limit;
restart it if that limit is reached.

Use the Treatment control or `?treatment=expressive` to compare styles. Theme
supports system, light, and dark. Try 375px and 1280px, keyboard input, reduced
motion, and long text. Reading panes switch at 840px. Controls retain their
values when treatments change; reloading resets the sample.

## Use with an installed skill

The three HTML files and shared `app.css`/`app.js` are plain browser sources;
they do not need a frontend build tool. Copy the selected HTML into a separate
example page in your existing development server. Mount the shared files at
`/src/app.css` and `/src/app.js` and the matching package's `dist` at
`/node_modules/@expressivecss/expressive/dist`, or adjust those URLs to your
project's asset paths. Serve over localhost HTTP. The repository preview command
is a contributor convenience and is not part of the portable skill bundle.

Use the installed version's resolver and component contracts before copying
markup into a different package version. Settings and reading use CSS-only
components plus small application handlers. Only the editor loads framework
JavaScript and initializes its own ButtonGroup. None sends requests or persists
an account, publishes a newsletter, or saves status across reloads.

## Learn the relationships

Expression belongs to a task. The larger action and headline, tonal focal
region, and rounder container work together to identify one decision. Other
controls keep their size and hierarchy. Both treatments preserve accessible
names, native form state, feedback, and focus paths. The application corner
choices are scoped overrides, not a framework-wide Material shape scale. The
examples add no motion system or claim complete Google specification parity.

Read the selected component guide for its contract: [buttons](../../components/buttons.md),
[fieldsets](../../components/fieldsets.md), [checkboxes](../../components/checkboxes.md),
[text fields](../../components/text-fields.md), [button groups](../../components/button-groups.md),
[panes](../../components/panes.md), and [lists](../../components/lists.md).
Use [typography](../../expressivecss-theming/references/typography.md) and
[shape](../../expressivecss-theming/references/shape.md) for supported overrides.

## Evaluation reuse

The existing evaluator exposes `example-settings`, `example-editor`, and
`example-list-detail` through `materializeProjectFixture`. It copies these exact
sources, shared styles and handlers into the standard consumer fixture. The
example tree participates in the fixture provenance hash, so an edited example
invalidates a frozen comparison. Review prompts live in
`tests/fixtures/expressivecss-skill-evals/expression-examples.json` in the repository.
Browser regression checks exercise both treatments and the complete task paths;
passing those checks does not replace a visual review of a consuming product.
