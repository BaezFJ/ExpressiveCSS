# Smaller builds

The full CSS and JavaScript bundles include every component. If a page uses only
a few, you can ship less in three ways: import components one at a time, compile
only the Sass you need, and serve smaller icon fonts.

## Import only the components you use

The `modular` entry lets a bundler drop components you never import:

```ts
import { Tabs } from '@expressivecss/expressive/modular';
import type { TabsOptions } from '@expressivecss/expressive/modular';

const tabs = Tabs.init(document.querySelector('.tabs'));
```

The `import type` line is for TypeScript users. Start Tabs after its markup is in
the page, and call `tabs.destroy()` when you remove it.

Things to know about this entry:

- Importing it starts nothing. You initialize each component yourself.
- `AutoInit` still exists, but calling it pulls in every component.
- The root entry keeps its shared page behaviors. Both ESM entries use the same
  constructors.
- If you serve the ESM files straight to the browser, copy the whole `dist/js`
  folder. Browsers don't drop unused exports; only a bundler does.
- The single-file IIFE and CommonJS builds are still available.

### How to start each feature

| Feature | With the modular entry |
| --- | --- |
| AppBar, Autocomplete, FloatingActionButton, ButtonGroup, Carousel, CharacterCounter, Datepicker, Menu, Lightbox, ScrollSpy, FormSelect, NavigationRail, Tabs, Timepicker, Tooltip | Call the component's `.init(element, options)` |
| Cards, ExpandingCard, Slider | Call `.init(element, options)` for elements you own, or `.Init()` once to find matching elements in the document |
| Chips | Call `.init()` for managed chips; call `Chips.Init()` once so static chips can be removed |
| Snackbar | Use the existing Snackbar constructor |
| Input validation, textarea resize, file input paths | Call `Forms.Init()` once after choosing these enhancements |
| Dialog light dismissal | Call `Dialogs.Init()` once |
| Bottom-sheet drag dismissal | Call `BottomSheets.Init()` once; add `Dialogs.Init()` for light dismissal |
| Side-sheet drag dismissal | Call `SideSheets.Init()` once; add `Dialogs.Init()` for light dismissal |

Some components start others they depend on. FormSelect starts its own Menu, and
Datepicker starts its own FormSelect, so don't initialize those separately. The
`.Init()` document behaviors apply to the whole page: call each one once, not
again on route changes, and not at all if you also load the root entry.

## Compile only the Sass you need

The `custom` Sass entry takes a list of component and utility partials. With
Sass's Node package importer, compile with
`sass --pkg-importer=node app.scss app.css`:

```scss
@use "pkg:@expressivecss/expressive/scss/custom" with (
  $components: ("icons-material-design", "tabs"),
  $utilities: ()
);
```

That recipe covers Tabs, including the swipeable option. FormSelect and
Datepicker need more partials:

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

Destroy both instances when you remove that view. If you use the picker's
optional docked display plugin, add `"docked-display"` before `"forms"`.

How the lists work:

- Tokens and base styles are always included.
- Partial names are relative to `components/` or `utilities/`, without the
  underscore or the file extension. An unknown name fails the build.
- Partials load in the order you list them, inside the framework's usual cascade
  layers. Keep icons first. When you combine recipes, follow the order in the
  matching `_index.scss`.
- Add any supporting partials your markup needs. For example,
  `$utilities: ("spacing", "visibility")` adds those helpers.
- `null` includes the whole group (the default). `()` leaves it out.

Bundlers that resolve Sass package paths can use
`@expressivecss/expressive/scss/custom`. Plain Sass with `node_modules` on its
load path can use `@expressivecss/expressive/src/sass/custom`. Import only one
framework Sass entry per stylesheet. The full entry and the compiled CSS don't
change.

## Serve smaller icon fonts

Browsers download only the font families a page uses, so if you use outlined
icons only, the rounded and sharp fonts never load. To shrink the outlined font
too, make a subset with your own font tooling and turn off the bundled font
declarations:

```scss
@use "pkg:@expressivecss/expressive/scss/custom" with (
  $components: ("icons-material-design", "tabs"),
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

`$expressive-include-fonts: false` turns off the text fonts as well, so the
example declares them again with their usual names and weights. Copy those four
text fonts from `dist/fonts` into `/assets`, with their license notices. If the
site uses rounded or sharp icons, add matching subset faces for them. Keep
ligature shaping and the `opsz`, `wght`, `FILL`, and `GRAD` axes in every
variable subset.

Your subset must include icon names from templates, dynamic content, and UI the
framework generates:

| Source | Icon name needed |
| --- | --- |
| Chips removal buttons | `close`, using the configurable `closeIconClass` family |
| Snackbar dismissal button | `close` when the dismissal button is enabled |
| Expandable navigation rail summaries | `expand_more`, generated by CSS |

FormSelect draws its caret and check marks with CSS masks, and Datepicker's
previous and next labels are configurable text, so by default neither needs an
icon glyph. Custom markup and option values can add names. A subset won't pick up
new icons on its own, so keep the full fonts if icon names aren't fixed.

## Measure the result

After building, run `node --test tests/selective-builds.test.js`. It writes raw,
gzip, and Brotli sizes to `.cache/selective-builds/sizes.json`. The browser suite
saves font requests and full versus selective screenshots in the same folder.
