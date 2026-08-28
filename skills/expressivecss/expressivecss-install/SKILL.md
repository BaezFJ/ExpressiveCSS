---
name: expressivecss-install
description: Install and load ExpressiveCSS correctly.
---

## Install ExpressiveCSS

Read the target version's [getting-started documentation](https://www.expressivecss.com/index.html.md) before changing an existing setup.

1. Inspect the project's manifest and lockfile first. Preserve its package manager and pinned ExpressiveCSS version.
2. For a new npm installation, use `terminal(command="npm install @expressivecss/expressive", timeout=600)`.
3. Load only the surfaces the application uses.

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

Load the compiled stylesheet, then the IIFE JavaScript bundle near the end of `<body>`. Call `Expressive.AutoInit()` after the component markup exists. The IIFE global is `Expressive`, not `M`.

A complete page also needs:

- `<meta name="viewport" content="width=device-width, initial-scale=1">`;
- Material Symbols when icon-font markup is used;
- the chosen text fonts or overrides for the framework font tokens.

ExpressiveCSS does not ship font files.

## Rules

- Do not import unpublished TypeScript source.
- Do not load compiled CSS and the Sass entry point together.
- Do not initialize a registry component before its markup exists.
- Do not silently upgrade an existing project to a different framework release.

## Verification

Confirm the installed version from the lockfile, run the consuming app's build, load a real page, and verify that styles, fonts, icons, and any initialized component work without console errors.
