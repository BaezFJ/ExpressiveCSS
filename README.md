# ExpressiveCSS

ExpressiveCSS is a Material Design 3 front-end framework written in Sass and
TypeScript. It gives you theme tokens, layout and utility classes, styled form
controls, and JavaScript components.

> Version `0.19.0` is under active development.

Documentation: [www.expressivecss.com](https://www.expressivecss.com)

## What's included

- Material Design 3 color and typography tokens
- Light and dark themes built on CSS custom properties
- A responsive grid and utility classes
- Buttons, cards, forms, navigation, and other styled components
- Interactive components such as carousels, date pickers, menus, side
  navigation, tabs, and tooltips
- CSS, ES module, CommonJS, browser (IIFE), and TypeScript declaration builds
- One `AutoInit()` call to start every component, with a per-element opt-out

## Quick start

You need [Node.js](https://nodejs.org/) 20 or newer and npm.

```sh
npm ci
npm run build
```

Then add the built files to a page:

```html
<link rel="stylesheet" href="dist/css/expressive.min.css">

<a class="button tooltipped" data-tooltip="ExpressiveCSS is ready.">Hover</a>

<script src="dist/js/expressive.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    Expressive.AutoInit();
  });
</script>
```

Keep `dist/fonts/` next to `dist/css/` so the fonts load.

To build from an application's own templates and JavaScript imports, run the
package CLI from that app:

```sh
npm install -D esbuild
npx expressive-build index.html src --entry src/ui.ts
```

This writes the selected CSS, bundled browser entry and fonts to
`public/expressive/`. Omit `--entry` for CSS alone. Add `--check` to verify
committed assets in a pre-commit hook. See [Smaller builds](docs/guides/smaller-builds.md).

## Guides

- [Getting started](docs/guides/getting-started.md): build output, starter
  templates, ES modules, and Sass
- [Themes and frosted glass](docs/guides/theming.md): switch themes and blur
  floating surfaces
- [Smaller builds](docs/guides/smaller-builds.md): import single components,
  compile only the Sass you need, and subset icon fonts
- [Working on ExpressiveCSS](docs/guides/development.md): npm commands, tests,
  and where things live in the repository

## MCP server for AI tools

`mcp/expressivecss/` holds a local MCP server that walks an AI assistant from
setup through design to quality checks. To run it:

```sh
cd mcp/expressivecss
npm ci
node server.js
```

Point your MCP client at `node mcp/expressivecss/server.js`, or at
`node ./server.js` with `mcp/expressivecss` as the working directory. A sample
config is in `mcp/expressivecss/mcp.json`, and the tools are described in the
[server's README](mcp/expressivecss/README.md).

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Ask questions and propose ideas in
[Discussions](https://github.com/BaezFJ/ExpressiveCSS/discussions); use
[Issues](https://github.com/BaezFJ/ExpressiveCSS/issues) for accepted work and
bugs you can reproduce. Also see the [governance](GOVERNANCE.md),
[code of conduct](CODE_OF_CONDUCT.md), [security policy](SECURITY.md), and
[release workflow](RELEASING.md).
