---
name: expressivecss-install
description: Installs and configures @expressivecss/expressive: package versions, imports, assets, fonts, and build integration. Use for setup, package changes, version problems, or uncertainty about which contract source applies. Not for visual refinement, or for markup changes when the project already loads the target version.
---

# Install ExpressiveCSS

## Steps

Reuse the root version resolution, or run its bundled resolver if this guide was loaded directly. This bundled guide covers the setup below. Consult the [getting-started documentation](https://www.expressivecss.com/index.html.md) only for missing details, and treat the public site's version as unverified until provenance proves it. For an older installed version, inspect `node_modules/@expressivecss/expressive` and the matching repository tag or commit before applying contract-dependent changes.

1. Read the project's manifest and lockfile. Keep its package manager and any pinned ExpressiveCSS version.
2. Add the package only when the task includes setup and the project does not already depend on it. Use the command for the lockfile you found:

   | Lockfile | Command |
   | --- | --- |
   | `package-lock.json` or none | `npm install @expressivecss/expressive` |
   | `pnpm-lock.yaml` | `pnpm add @expressivecss/expressive` |
   | `yarn.lock` | `yarn add @expressivecss/expressive` |

   Report the command before running it. If the task forbids dependency changes, or the install fails, stop and report instead of editing the lockfile by hand.
3. Load only the surfaces the application uses, with one of the three paths below.

### ES modules

```js
import '@expressivecss/expressive/css';
import { AutoInit } from '@expressivecss/expressive';

AutoInit();
```

Importing the JavaScript bundle installs shared behaviors but does not call `AutoInit()`. Omit the JavaScript import and initialization when the page uses only CSS components.

### Sass

```scss
@use "@expressivecss/expressive/src/sass/expressive";
```

The package also exports `@expressivecss/expressive/scss` and individual `scss/*` paths. Follow the target version's documented Sass resolution for the consuming build tool.

### Browser build

Load the compiled stylesheet, then the IIFE JavaScript bundle near the end of `<body>`. Call `Expressive.AutoInit()` after the component markup exists. The IIFE global is `Expressive`, not `M`. For a complete page, copy the bundled [starter page](../assets/templates/starter.html) beside `dist/`. The minimum document is:

```html
<!doctype html>
<html lang="en" theme="auto">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="dist/css/expressive.min.css">
  </head>
  <body>
    <main class="container">
      <!-- ExpressiveCSS markup -->
    </main>
    <script src="dist/js/expressive.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        Expressive.AutoInit();
      });
    </script>
  </body>
</html>
```

The `theme` attribute only works on `<html>` (or a shadow host). Drop both `<script>` tags on a CSS-only page. For persistent navigation, start from the matching layout template: [compact](../assets/templates/layout-compact.html), [navigation rail](../assets/templates/layout-rail.html), [expanded rail](../assets/templates/layout-expanded.html), [list-detail](../assets/templates/layout-list-detail.html), or [dashboard](../assets/templates/layout-dashboard.html). The screen recipes in the [design rules](../references/design-rules.md) explain when each fits.

The compiled stylesheet ships `@font-face` rules for Material Symbols (outlined, rounded, sharp), Roboto 400/500, and Noto Sans 400/500. Keep `dist/fonts/` next to `dist/css/` so the relative `url(../fonts/...)` paths resolve. Override the brand and plain typeface tokens when the page uses different typefaces. `.material-icons` is a compatibility alias that uses Symbols; do not load the older Material Icons stylesheet.

## Rules

- Do not import unpublished TypeScript source.
- Use one CSS delivery path: never load compiled CSS and the Sass entry point together.
- Use one initialization owner, and initialize a registry component only after its markup exists.
- Do not upgrade an existing project to a different framework release unless the user asks.
- Use the bundled fonts or intentional replacements without duplicate external font stylesheets. A CSS-only page needs no JavaScript bundle.

## Verification

Copy this checklist and mark each item from observed output:

- [ ] The lockfile or `node_modules/@expressivecss/expressive/package.json` shows the expected version.
- [ ] The consuming app's build command exits 0.
- [ ] A real page loads styles, fonts, and icons with no 404s for CSS, fonts, or scripts.
- [ ] The network panel shows no duplicate CSS or font stylesheets.
- [ ] Each initialized component works, and the console shows no errors.

If an item fails, fix the cause and rerun the whole list. Mark items you could not observe as unverified.
