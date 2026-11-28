# ExpressiveCSS Extras

`@expressivecss/extras` holds the ExpressiveCSS components that are not part
of the Material Design 3 component set. It builds on the core package,
[`@expressivecss/expressive`](https://www.npmjs.com/package/@expressivecss/expressive),
and needs the same minor version.

Documentation: [www.expressivecss.com](https://www.expressivecss.com), under
Additional components.

## Install

```sh
npm install @expressivecss/expressive @expressivecss/extras
```

## Script tags

Load core first, then extras, for both the CSS and the JavaScript:

```html
<link rel="stylesheet" href="node_modules/@expressivecss/expressive/dist/css/expressive.min.css">
<link rel="stylesheet" href="node_modules/@expressivecss/extras/dist/css/extras.min.css">

<script src="node_modules/@expressivecss/expressive/dist/js/expressive.min.js"></script>
<script src="node_modules/@expressivecss/extras/dist/js/extras.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    Expressive.AutoInit();
  });
</script>
```

The extras script exposes its exports as `ExpressiveExtras` and adds its
components to `Expressive.AutoInit()`. It reads the core API from
`Expressive.core`, so it throws if `expressive.js` has not loaded.

## ES modules

```js
import { AutoInit } from '@expressivecss/expressive';
import '@expressivecss/extras';

AutoInit();
```

Importing `@expressivecss/extras` registers its components with core's
`AutoInit` and starts its document behaviors. For explicit initialization,
import from `@expressivecss/extras/modular` instead, which has no side effects.
Extras imports core through `@expressivecss/expressive/core` and
`@expressivecss/expressive/modular` (for `Menu`, `FormSelect` and `Forms`), so both packages share one
copy of core. `require('@expressivecss/extras')` works the same way: the CommonJS
build requires `@expressivecss/expressive` and uses its `core` export.

```js
import '@expressivecss/expressive/css';
import '@expressivecss/extras/css';
```

## Sass

The extras partials use core's Sass helpers. Put core's Sass folder on the
load path:

```sh
sass --load-path=node_modules/@expressivecss/expressive/src/sass \
  node_modules/@expressivecss/extras/src/sass/extras.scss extras.css
```

Compile core's `expressive.scss` as well, and load its output first.

## License

MIT. See [LICENSE](LICENSE).
