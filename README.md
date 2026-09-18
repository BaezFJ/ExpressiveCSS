# ExpressiveCSS

ExpressiveCSS is a Material Design 3 front-end framework built with Sass and
TypeScript. It provides theme tokens, layout and utility classes, styled form
controls, and JavaScript components in browser, ES module, and CommonJS builds.

> ExpressiveCSS version `0.10.0` is under active development.

Documentation: [www.expressivecss.com](https://www.expressivecss.com)

## Features

- Material Design 3 color and typography tokens
- Light and dark themes using CSS custom properties
- Responsive grid and utility classes
- Buttons, cards, forms, navigation, and other styled components
- Interactive components including carousels, date pickers, menus,
  side navigation, tabs, tooltips, and more
- ES module, CommonJS, browser IIFE, CSS, and TypeScript declaration outputs
- Automatic component initialization with an opt-out mechanism

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- npm

Use Node 24 for repository development, selected by `.nvmrc`. The framework still
supports its existing runtime compatibility range. See [CONTRIBUTING.md](CONTRIBUTING.md)
for setup, checks, and the community workflow.

## MCP server for AI workflows

A local MCP server at `mcp/expressivecss/` provides an ExpressiveCSS design-to-QA
workflow:

- Setup Expert
- Rules Enforcer
- Creative Director
- Page Arcjitect (`page_arcjitect`, with conventional `page_architect` compatibility)
- Component Syntax Expert
- Quality Inspector

The MCP entry point is `mcp/expressivecss/server.js`, with sample config in
`mcp/expressivecss/mcp.json`.

Start the server:

```sh
cd mcp/expressivecss
npm ci
node server.js
```

Configure your MCP client with either command:

- `node mcp/expressivecss/server.js`
- or `node ./server.js` from `mcp/expressivecss` as the working directory.

## Getting started

Clone the repository and install the JavaScript dependencies:

```sh
npm ci
npm run build
```

The build writes compiled assets to `dist/`:

```text
dist/
├── css/
│   ├── expressive.css
│   └── expressive.min.css
├── fonts/
│   ├── material-symbols-outlined.woff2
│   ├── material-symbols-rounded.woff2
│   ├── material-symbols-sharp.woff2
│   ├── roboto-latin-400.woff2
│   ├── roboto-latin-500.woff2
│   ├── noto-sans-latin-400.woff2
│   └── noto-sans-latin-500.woff2
├── js/
│   ├── expressive.cjs
│   ├── expressive.js
│   ├── expressive.min.js
│   └── expressive.mjs
└── types/
```

The build writes source maps beside the CSS and JavaScript bundles. The stylesheet
loads fonts from `../fonts/`, so keep `dist/fonts/` next to `dist/css/`.

## Usage

### Browser bundle

Load the compiled stylesheet and browser bundle, then initialize components after
the page loads:

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

The browser bundle exposes the framework as the global `Expressive` object.

### ES modules

Import the framework or individual components from the module build:

```js
import { AutoInit, Tooltip } from './dist/js/expressive.mjs';

AutoInit();

const element = document.querySelector('.custom-tooltip');
Tooltip.init(element, { position: 'top' });
```

`AutoInit()` scans `document.body` by default. Pass a container to limit the scan.
Add the `no-autoinit` class to any element you want to initialize manually:

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
@use "@expressivecss/expressive/src/sass/expressive";
```

For work in this repository, the Sass entry point is `src/sass/expressive.scss`.

### Reduce page downloads

Use the optional ESM entry so a bundler can remove unused components:

```ts
import { Tabs } from '@expressivecss/expressive/modular';
import type { TabsOptions } from '@expressivecss/expressive/modular';

const tabs = Tabs.init(document.querySelector('.tabs'));
```

The type import supports TypeScript consumers. Initialize Tabs after its markup
exists, and call `tabs.destroy()` when removing it. The modular entry does not
initialize components on import. `AutoInit` remains available, but calling it
includes the full registry. The root entry retains the existing shared behaviors.
Both ESM entries share constructors. Copy the entire `dist/js` directory when
hosting ESM files directly. Direct browser imports do not remove unused exports.
The existing single-file IIFE and CommonJS builds remain available.

| Feature | Initialization with the modular entry |
| --- | --- |
| AppBar, Autocomplete, FloatingActionButton, ButtonGroup, Carousel, CharacterCounter, Datepicker, Menu, Lightbox, ScrollSpy, FormSelect, NavigationRail, Tabs, Timepicker, Tooltip | Call the component's `.init(element, options)` |
| Cards, ExpandingCard, Slider | Call `.init(element, options)` for owned elements, or `.Init()` once to discover matching document elements |
| Chips | Call `.init()` for managed chips; use `Chips.Init()` once for removal of static chips |
| Snackbar | Use the existing Snackbar constructor |
| Input validation, textarea resize, file input paths | Call `Forms.Init()` once after choosing these enhancements |
| Dialog light dismissal | Call `Dialogs.Init()` once |
| Bottom-sheet drag dismissal | Call `BottomSheets.Init()` once; add `Dialogs.Init()` for light dismissal |
| Side-sheet drag dismissal | Call `SideSheets.Init()` once; add `Dialogs.Init()` for light dismissal |

`Range` retains its Slider alias. Component initializers include internal
dependencies such as Menu in FormSelect, FormSelect in Datepicker, and Carousel in
swipeable Tabs. Do not initialize those instances separately. Document behaviors
apply to the whole page, so do not repeat their `.Init()` calls on route changes or
alongside the root entry.

Choose Sass partials with the custom entry. With Sass's Node package importer,
compile using `sass --pkg-importer=node app.scss app.css`:

```scss
@use "pkg:@expressivecss/expressive/scss/custom" with (
  $components: ("icons-material-design", "tabs", "carousel"),
  $utilities: ()
);
```

This Tabs recipe includes styling for the swipeable option. For FormSelect and
Datepicker, use this complete recipe instead:

```scss
@use "pkg:@expressivecss/expressive/scss/custom" with (
  $components: ("icons-material-design", "buttons", "menu", "forms", "datepicker"),
  $utilities: ()
);
```

```js
import { Forms, FormSelect, Datepicker } from '@expressivecss/expressive/modular';

Forms.Init();
const select = FormSelect.init(document.querySelector('#choice'));
const datepicker = Datepicker.init(document.querySelector('#date'), { openByDefault: true });
```

Destroy both component instances when removing that view. Add `"docked-display"`
before `"forms"` if using the picker's optional docked display plugin.

Tokens and base styles are always included. Lists load in the order written within
the original cascade layers. Partial names are relative to `components/` or
`utilities/`, without underscores or extensions. Keep icons first and follow the
order in the corresponding `_index.scss` when combining recipes. Add the supporting
partials required by your markup. For example, `$utilities: ("spacing",
"visibility")` includes those helpers. A `null` list includes the complete group by
default; `()` omits it. An unknown partial fails compilation.

Bundlers that resolve Sass package paths can use
`@expressivecss/expressive/scss/custom`; plain Sass with a `node_modules` load path
can use `@expressivecss/expressive/src/sass/custom`. Import one framework Sass
entry per stylesheet. The original full entry and compiled CSS are unchanged.

#### Smaller icon fonts

Browsers fetch only the font families used on the page. Using outlined icons alone
avoids downloading the rounded and sharp fonts. To reduce the outlined font, create
a subset with your own font tooling and turn off the bundled font declarations:

```scss
@use "pkg:@expressivecss/expressive/scss/custom" with (
  $components: ("icons-material-design", "tabs", "carousel"),
  $utilities: (),
  $expressive-include-fonts: false
);

@font-face {
  font-family: "Material Symbols Outlined";
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url("/assets/icons-outlined-subset.woff2") format("woff2");
}

@font-face {
  font-family: "Roboto";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/assets/roboto-latin-400.woff2") format("woff2");
}

@font-face {
  font-family: "Roboto";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/assets/roboto-latin-500.woff2") format("woff2");
}

@font-face {
  font-family: "Noto Sans";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/assets/noto-sans-latin-400.woff2") format("woff2");
}

@font-face {
  font-family: "Noto Sans";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/assets/noto-sans-latin-500.woff2") format("woff2");
}
```

Copy the four text fonts from `dist/fonts` into `/assets`, along with their license
notices. Turning off the bundled faces also disables the text fonts. The declarations
above restore their existing names and weights. Supply corresponding subset faces
for rounded or sharp icons if the site uses them. Retain ligature shaping and the
`opsz`, `wght`, `FILL`, and `GRAD` axes in each variable subset.

Include icon names from templates, dynamic content, and framework-generated UI:

| Source | Required icon name |
| --- | --- |
| Chips removal buttons | `close`, using the configurable `closeIconClass` family |
| Snackbar dismissal button | `close` when the dismissal button is enabled |
| Expandable navigation rail summaries | `expand_more`, generated by CSS |

FormSelect uses CSS masks for its caret and selection marks. Datepicker uses text
for its configurable previous/next labels. By default, neither requires an
icon-font glyph. Custom markup and option values may add requirements. Subsets do
not cover new icons automatically, so retain full fonts for unrestricted icon names.

After building, run `node --test tests/selective-builds.test.js`. It records raw,
gzip, and Brotli sizes in `.cache/selective-builds/sizes.json`. The browser suite
records font requests and full/selective screenshots separately in that directory.

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

The repository provides these npm commands:

| Command | Purpose |
| --- | --- |
| `npm run build` | Build all CSS, JavaScript, and declaration files |
| `npm run build:css` | Build expanded and minified CSS |
| `npm run build:js` | Build ESM, CommonJS, and browser bundles |
| `npm run build:types` | Generate TypeScript declarations |
| `npm run watch` | Watch Sass and TypeScript sources |
| `npm run verify` | Build, typecheck, test, check generated data, and verify docs |
| `npm run typecheck` | Check the TypeScript source without emitting files |
| `npm test` | Build all JavaScript bundles and CSS, then run the test suite |
| `npm run clean` | Remove generated build output |
| `npm run docs:dev` | Build the framework, then watch it beside the docs server |
| `npm run docs:build` | Build the documentation site into `_site/` and verify it |
| `npm run docs:preview` | Serve what `docs:build` wrote |

Run the documentation and smoke-test site:

```sh
npm run docs:dev
```

This command builds the framework, then starts the Sass and esbuild watchers with
the documentation server. Refresh the browser to see source changes. Astro prints
the server URL.

The documentation source lives in `docs/src/` and is published at
[www.expressivecss.com](https://www.expressivecss.com).

## Project structure

| Location | Purpose | Tracked? |
| --- | --- | --- |
| `src/sass`, `src/ts` | Framework source | Yes |
| `docs/src` | Astro documentation and examples | Yes |
| `mcp/expressivecss` | Independently versioned MCP package | Yes |
| `skills/expressivecss` | Agent guidance and generated component references | Yes |
| `scripts`, `tests`, `visual` | Generators, verification, and test tooling | Source only |
| `semantics.json`, `llm.md`, `m3-guidelines.md` | Markup rules, API reference, design guidance | Yes |
| `SEMANTICS.md`, generated skill/MCP data | Derived files checked for drift | Yes |
| `dist`, `_site`, visual reports and caches | Build output | No |
| `.design-sync` | Optional external design previews | Configuration and source only |

See [Sass architecture](src/sass/README.md), [TypeScript conventions](src/ts/README.md),
and [development notes](docs/development-notes.md).

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

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Use
[Discussions](https://github.com/BaezFJ/ExpressiveCSS/discussions) for questions and
proposals, and [Issues](https://github.com/BaezFJ/ExpressiveCSS/issues) for accepted
work and reproducible bugs. Read our [governance](GOVERNANCE.md),
[code of conduct](CODE_OF_CONDUCT.md), [security policy](SECURITY.md), and
[release workflow](RELEASING.md).
