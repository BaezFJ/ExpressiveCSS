# Getting started

You need [Node.js](https://nodejs.org/) 20 or newer and npm.

## Build the framework

Clone the repository, then install and build:

```sh
npm ci
npm run build
```

The build writes everything to `dist/`:

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

Source maps sit next to the CSS and JavaScript bundles. The stylesheet loads its
fonts from `../fonts/`, so keep `dist/fonts/` next to `dist/css/` wherever you
copy the files.

## Start from a template

Copy the [basic starter](../public/starter.html) and the built files into a new
folder:

```sh
mkdir my-site
cp docs/public/starter.html my-site/index.html
cp -R dist my-site/dist
```

Open `my-site/index.html` in a browser. The starter has an app bar, responsive
cards, a tooltip set up with `AutoInit()`, and light and dark themes that follow
the system setting. Change the title and content from there.

For full app layouts, browse the [layout gallery](https://www.expressivecss.com/layouts.html).
Its templates live in `docs/public/layout-*.html`: compact, navigation rail,
expanded rail, list-detail, and dashboard. Copy any of them as `index.html` next
to the same `dist/` folder.

## Load it in a page

Link the stylesheet and the browser bundle, then start the components once the
page has loaded:

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

The browser bundle puts the whole framework on a global `Expressive` object.

## Use ES modules

Import the framework, or single components, from the module build:

```js
import { AutoInit, Tooltip } from './dist/js/expressive.mjs';

AutoInit();

const element = document.querySelector('.custom-tooltip');
Tooltip.init(element, { position: 'top' });
```

`AutoInit()` scans `document.body` unless you pass a container. Give an element
the `no-autoinit` class to skip it and set it up yourself:

```js
AutoInit(document.querySelector('#app'), {
  Tooltip: { position: 'top' }
});
```

Importing the bundle adds the framework's shared page behaviors, but it never
calls `AutoInit()` for you.

To ship only the components a page uses, see [smaller builds](smaller-builds.md).

## Use the Sass source

From another Sass project:

```scss
@use "@expressivecss/expressive/src/sass/expressive";
```

Inside this repository, the entry file is `src/sass/expressive.scss`.

## Next steps

- [Themes and frosted glass](theming.md)
- [Smaller builds](smaller-builds.md)
- [Full documentation](https://www.expressivecss.com)
