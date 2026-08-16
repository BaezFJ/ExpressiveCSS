# ExpressiveCSS

ExpressiveCSS is a Material Design 3 front-end framework built with Sass and
TypeScript. It provides theme tokens, layout and utility classes, styled form
controls, and JavaScript components in browser, ES module, and CommonJS builds.

> ExpressiveCSS is currently at version `0.1.0` and under active development.

## Features

- Material Design 3 color and typography tokens
- Light and dark themes using CSS custom properties
- Responsive grid and utility classes
- Buttons, cards, forms, navigation, and other styled components
- Interactive components including carousels, collapsibles, date pickers,
  dropdowns, side navigation, tabs, tooltips, and more
- ES module, CommonJS, browser IIFE, CSS, and TypeScript declaration outputs
- Automatic component initialization with an opt-out mechanism

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- npm
- Python 3.14 or newer and [uv](https://docs.astral.sh/uv/) to run the local
  documentation site

Python is not required to build or use the framework itself.

## Getting started

Clone the repository and install the JavaScript dependencies:

```sh
npm install
npm run build
```

The compiled assets are written to `dist/`:

```text
dist/
├── css/
│   ├── expressive.css
│   └── expressive.min.css
├── js/
│   ├── expressive.cjs
│   ├── expressive.js
│   ├── expressive.min.js
│   └── expressive.mjs
└── types/
```

Source maps are produced alongside the CSS and JavaScript bundles.

## Usage

### Browser bundle

Include the compiled stylesheet and browser bundle, then initialize components
after the page has loaded:

```html
<link rel="stylesheet" href="dist/css/expressive.min.css">

<ul class="collapsible">
  <li>
    <div class="collapsible-header">Details</div>
    <div class="collapsible-body">ExpressiveCSS is ready.</div>
  </li>
</ul>

<script src="dist/js/expressive.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    Expressive.AutoInit();
  });
</script>
```

The browser bundle exposes the framework as the global `Expressive` object.

### ES modules

Import the framework or individual components from the module build:

```js
import { AutoInit, Tooltip } from './dist/js/expressive.mjs';

AutoInit();

const element = document.querySelector('.custom-tooltip');
Tooltip.init(element, { position: 'top' });
```

`AutoInit()` scans `document.body` by default. Pass a container to limit the
scan, or add the `no-autoinit` class to an element that should be initialized
manually:

```js
AutoInit(document.querySelector('#app'), {
  Tooltip: { position: 'top' }
});
```

Importing the JavaScript bundle installs the framework's shared document
behaviors, but it does not call `AutoInit()` automatically.

### Sass

Use the framework's Sass entry point in another Sass project:

```scss
@use "expressivecss/src/sass/expressive";
```

When working directly in this repository, the entry point is
`src/sass/expressive.scss`.

### Themes

ExpressiveCSS uses the `theme` attribute on the root element:

```html
<html lang="en" theme="light">
```

Switch themes at runtime by updating the attribute:

```js
document.documentElement.setAttribute('theme', 'dark');
```

## Development

Available npm commands include:

| Command | Purpose |
| --- | --- |
| `npm run build` | Build all CSS, JavaScript, and declaration files |
| `npm run build:css` | Build expanded and minified CSS |
| `npm run build:js` | Build ESM, CommonJS, and browser bundles |
| `npm run build:types` | Generate TypeScript declarations |
| `npm run watch` | Watch Sass and TypeScript sources |
| `npm run typecheck` | Check the TypeScript source without emitting files |
| `npm test` | Build the ESM bundle and run the test suite |
| `npm run clean` | Remove generated build output |

Run the local documentation and smoke-test site in a second terminal:

```sh
uv sync
uv run python docs/app.py
```

Then open `http://127.0.0.1:5000`. The Flask app serves assets directly from
`dist/`, so changes made by `npm run watch` appear after a browser refresh.

## Project structure

```text
src/
├── sass/        Design tokens, utilities, base styles, and component styles
└── ts/          Core APIs, behaviors, plugins, and interactive components
docs/            Local Flask documentation and build smoke test
tests/           Node test runner and jsdom tests
dist/            Generated distributable files
```

See [`src/sass/README.md`](src/sass/README.md) for Sass architecture and
[`src/ts/README.md`](src/ts/README.md) for component conventions and testing
guidance.

## Testing

Run the complete automated suite with:

```sh
npm test
npm run typecheck
```

Tests use Node's built-in test runner and jsdom. Because jsdom does not perform
layout, component tests focus on DOM structure, classes, content, and lifecycle
behavior rather than geometry or visual transitions.

## Contributing

Keep generated files out of commits, add tests for behavior changes, and run
both the test suite and type checker before submitting a change. New JavaScript
components must be exported from `src/ts/components/index.ts`; components that
support automatic initialization must also be registered in
`src/ts/components/registry.ts`.
