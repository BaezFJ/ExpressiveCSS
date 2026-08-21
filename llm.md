# ExpressiveCSS - Complete Documentation for AI/LLM Systems

ExpressiveCSS is a Material Design 3 front-end framework built with Sass and TypeScript. It provides design tokens, light and dark themes, a responsive grid, utilities, styled controls, and interactive browser components.

This file consolidates the ExpressiveCSS framework documentation for code-generation systems. It describes version `0.7.0`, which is under active development.

- Package: `@expressivecss/expressive`
- Runtime target: modern browsers; the last five Chrome and Firefox versions
- JavaScript formats: ES module, CommonJS, and browser IIFE
- Styles: compiled CSS, minified CSS, and Sass sources
- Design system: [Material Design 3](https://m3.material.io/)

This file is the markup and JavaScript API contract. For **when** to use a component, its anatomy, placement, adaptive behavior, and common mistakes, read [`m3-guidelines.md`](m3-guidelines.md) first.

---

# Documentation contents

### Design guidelines

- Material 3 component guidelines (`m3-guidelines.md`) — usage, anatomy, placement, adaptive design, behaviors. Use this file (`llm.md`) for classes, markup, and APIs.

### Getting started

- Getting started

### CSS foundations

- Themes
- Color
- Grid
- Helpers
- Media Styles
- Pulse
- Shadow
- Table
- Transitions
- Typography
- Waves

### CSS components

- Badges
- Breadcrumbs
- Buttons
- Cards
- Carousel
- Lists
- Floating Action Button
- Footer
- Icons
- Navbar
- Navigation bar
- Navigation rail
- Pagination
- Panes
- Parallax
- Preloader

### JavaScript components

- Auto Init
- Navigation rail
- Menu
- Media
- Dialogs
- Bottom sheet
- Side sheet
- Scrollspy
- Sidenav
- Tabs
- Snackbar
- Tooltips
- Toolbars

### Forms

- Date Picker
- Time Picker
- Text Inputs
- Fieldsets
- Switches
- Select
- Sliders
- Radio Buttons
- Chips
- Checkboxes
- Autocomplete

---

# Core guidance for generated code

## Framework principles

ExpressiveCSS combines semantic HTML with component classes and single-purpose utilities. Choose components using [`m3-guidelines.md`](m3-guidelines.md) (window size class, one navigation pattern, one high-emphasis action, dialog vs snackbar vs sheet). Use the documented HTML structure for a component, then add helpers for spacing, alignment, visibility, color, and elevation instead of duplicating those rules in custom CSS.

- Start with the native HTML element when the documentation does so, especially for buttons, links, inputs, selects, tables, and dialogs.
- Preserve required child classes and ID relationships. JavaScript components query those selectors directly.
- Use the 12-column responsive grid classes instead of inventing a second layout convention.
- Use Material Design color roles such as `primary`, `surface`, and `error`; do not hard-code colors when a documented role or token applies.
- Add accessible labels, button types, alt text, and keyboard-compatible elements. A visual icon is not an accessible name.
- Initialize interactive components after their markup exists.
- Do not initialize an element twice. Add `no-autoinit` when manually initializing an element that `AutoInit()` would otherwise claim.
- Do not assume importing JavaScript calls `AutoInit()`. Import-time behaviors are installed, but registry components require an explicit `AutoInit()` or component `init()` call.

## Installation and builds

Install the published package:

```sh
npm install @expressivecss/expressive
```

Or build the repository sources:

```sh
npm install
npm run build
```

The build writes expanded and minified CSS, ESM, CommonJS, IIFE browser bundles, source maps, and TypeScript declarations under `dist/`.

## Package entry points

| Import | Purpose |
| --- | --- |
| `@expressivecss/expressive` | JavaScript module and TypeScript declarations |
| `@expressivecss/expressive/css` | Expanded compiled stylesheet |
| `@expressivecss/expressive/css/min` | Minified compiled stylesheet |
| `@expressivecss/expressive/scss` | Sass entry point |
| `@expressivecss/expressive/scss/*` | Individual Sass source paths |

## Minimal browser setup

```html
<!doctype html>
<html lang="en" theme="light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap">
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

The IIFE bundle exposes the global `Expressive` object. The two Google Fonts stylesheets above are the same ones the docs site loads: variable Material Symbols (outlined, rounded, and sharp, with the opsz / wght / FILL / GRAD axes) and Roboto 400 / 500. The framework does not ship those font files. Drop the Symbols link only if the page has no icon-font markup; drop Roboto only if you override the type-scale font. The older Material Icons stylesheet is optional and is not required for `.material-symbols`.

## ES module setup

```js
import '@expressivecss/expressive/css';
import { AutoInit, Tooltip } from '@expressivecss/expressive';

AutoInit();

const element = document.querySelector('.custom-tooltip');
if (element) Tooltip.init(element, { position: 'top' });
```

## Sass setup

```scss
@use "@expressivecss/expressive/src/sass/expressive";
```

The Sass entry point emits four cascade layers in this order: `tokens`, `base`, `components`, and `utilities`. Utilities therefore override component-layer declarations without selector-specificity escalation. Unlayered application CSS overrides normal declarations in all framework layers.

## Themes and color roles

Set `theme="light"` or `theme="dark"` on the root element:

```html
<html lang="en" theme="dark">
```

Switch at runtime by changing the attribute:

```js
document.documentElement.setAttribute('theme', 'dark');
```

The live Material tokens use the `--md-sys-color-<role>` naming scheme. Override `--md-source` to generate the primary, secondary, tertiary, neutral, and neutral-variant ramps at runtime. Use the live role token in component CSS rather than a `-light` or `-dark` source token.

```css
:root {
  --md-source: #6750a4;
}

.custom-panel {
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface);
}
```

## Responsive model

ExpressiveCSS uses a 12-column grid. Its named boundaries are small at `601px`, large at `993px`, and extra-large at `1201px`. Grid classes use prefixes such as `s`, `m`, `l`, and `xl`; the Grid section below is authoritative for exact sizing and offset syntax.

## JavaScript initialization

Initialize all registered components in a context:

```js
Expressive.AutoInit();

Expressive.AutoInit(document.querySelector('#app'), {
  Tooltip: { position: 'top' }
});
```

Opt an element out when it needs manual options:

```html
<a class="button tooltipped no-autoinit" data-tooltip="Hi">Hover</a>
```

`AutoInit()` recognizes these public components and selectors:

| Component | Selector |
| --- | --- |
| `Autocomplete` | `.autocomplete` |
| `Cards` | `article:has(> aside)` |
| `Carousel` | `.carousel` |
| `Chips` | `.chips` |
| `Datepicker` | `.datepicker` |
| `Menu` | `.menu-trigger` |
| `Lightbox` | `.lightboxed` |
| `NavigationRail` | `.navigation-rail` |
| `Parallax` | `.parallax` |
| `ScrollSpy` | `.scrollspy` |
| `FormSelect` | `select` |
| `Sidenav` | `.sidenav` |
| `Tabs` | `.tabs` |
| `Timepicker` | `.timepicker` |
| `Tooltip` | `.tooltipped` |
| `FloatingActionButton` | `.fixed-action-btn` |

`Snackbar`, `CharacterCounter`, and `Range` are intentionally not in the registry. Construct or initialize them through their documented APIs. Importing the bundle also installs document-level keyboard/focus handlers and initializes the shared Forms, Chips, Waves, Range, and Cards behaviors.

## Component lifecycle

Most per-element JavaScript components share this pattern:

```js
const element = document.querySelector('.component');
const instance = Expressive.ComponentName.init(element, options);
const current = Expressive.ComponentName.getInstance(element);
current?.destroy();
```

`init()` also accepts a NodeList and returns component instances for the provided elements. Re-initializing an element destroys its previous instance first. Component-specific sections below define additional methods, properties, callbacks, and option defaults.

## Public JavaScript surface

The main bundle exports:

- `AutoInit`, `Forms`, `Waves`, and `version`
- `Dialogs`, `BottomSheets`, and `SideSheets`
- `Autocomplete`, `FloatingActionButton`, `Cards`, `Carousel`, and `CharacterCounter`
- `Chips`, `Datepicker`, `Menu`, and `Lightbox`
- `Parallax`, `Range`, and `ScrollSpy`
- `FormSelect`, `Sidenav`, `NavigationRail`, `Slider`, and `Tabs`
- `Timepicker`, `Snackbar`, and `Tooltip`

---

# Getting started

## Getting started

Learn how to start using Expressive and integrate it into your project.

### Download

Expressive comes in two different forms. You can select which version you want depending on your preference and expertise. The project is at version `0.7.0` and is still growing, so the usual path is to build from the repository.

#### Expressive

This is the standard version that comes with both the minified and unminified CSS and JavaScript files. After you build the project, copy the files from `dist/`. This option requires little to no setup. Use this if you are unfamiliar with Sass.

#### Sass

This version is the source SCSS in `src/sass`. By choosing this version you have more control over which layers to include. You will need a Sass compiler if you choose this option.

#### From source

Clone the repository and build the compiled CSS and JavaScript:

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

#### NPM

The package name is `@expressivecss/expressive`. This release contains source files as well as the compiled CSS and JavaScript files.

```sh
npm install @expressivecss/expressive
```

#### Yarn

Or you can add the package with yarn.

```sh
yarn add @expressivecss/expressive
```

### Setup

#### Project Structure

After building, copy the compiled files into the directory where your website is located. Your directory will look something like this.

You'll notice that there are two sets of the files. The `min` means that the file is compressed to reduce load times. These minified files are usually used in production while it is better to use the unminified files during development.

```text
MyWebsite/
  |--css/
  |  |--expressive.css
  |
  |--js/
  |  |--expressive.js
  |
  |--index.html
```

#### HTML Setup

Next you just have to make sure you link the files properly in your webpage. Generally it is wise to import JavaScript files at the end of the body to reduce page load time. Follow the example below on how to import Expressive into your webpage.

```html
<!DOCTYPE html>
<html lang="en" theme="light">
  <head>
    <!--Import Google Icon Font-->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <!--Import expressive.css-->
    <link rel="stylesheet" href="css/expressive.min.css">
    <!--Let browser know website is optimized for mobile-->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
    <!--JavaScript at end of body for optimized loading-->
    <script src="js/expressive.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        Expressive.AutoInit();
      });
    </script>
  </body>
</html>
```

#### Initialize JavaScript

The browser bundle exposes the framework as the global `Expressive` object. Importing the JavaScript installs shared document behaviors (forms, waves, and a few others), but it does not call `AutoInit()` automatically. Call it after the page has loaded so components such as sidenavs, tooltips, and tabs start themselves.

`AutoInit()` scans `document.body` by default. Pass a container to limit the scan, or add the `no-autoinit` class to an element that should be initialized manually.

```js
Expressive.AutoInit();

Expressive.AutoInit(document.querySelector('#app'), {
  Tooltip: { position: 'top' }
});
```

#### ES modules

Import the framework or individual components from the module build:

```js
import { AutoInit, Tooltip } from './js/expressive.mjs';

AutoInit();

const element = document.querySelector('.custom-tooltip');
Tooltip.init(element, { position: 'top' });
```

#### Themes

Expressive uses the `theme` attribute on the root element. The default is light. Switch themes at runtime by updating the attribute.

```html
<html lang="en" theme="light">
```

```js
document.documentElement.setAttribute('theme', 'dark');
```

### Templates

Start from a documented layout instead of an empty page. These two pages show how Expressive structures content, and you can copy the markup they use.

#### Grid

#### Helpers

### Sass Setup

This section is only relevant if you chose to use the Sass sources.

#### Compiling Sass

Instead of only a CSS folder, the repository contains many `.scss` files which contain the styles of individual layers and components. The browser cannot interpret Sass, so you must compile `src/sass/expressive.scss` into a regular CSS file. At this point you can link this newly outputted file in your HTML page.

From the repository, the npm script does that for you:

```sh
npm run build:css
```

In another Sass project, use the framework's Sass entry point:

```scss
@use "@expressivecss/expressive/src/sass/expressive";
```

When working directly in this repository, the entry point is `src/sass/expressive.scss`.

```text
MyWebsite/
|--css/
|  |--expressive.css <-- compiled from scss/expressive.scss
|
|--js/
|  |--expressive.js
|
|--scss/
|  |--expressive.scss
|  |--abstracts/
|  |--tokens/
|  |--utilities/
|  |--base/
|  |--components/
|
|--index.html
```

---

# CSS foundations

## Themes

Light and dark schemes, the theme attribute, and custom tokens.

Expressive maps Material Design 3 color tokens onto live `--md-sys-color-*` custom properties. Components, buttons, and the color utilities all read those live names, so flipping the scheme recolors the page without extra classes.

Three rules decide which pair is live, in this order:

1. Default: :root and :host use the -light pair.
2. If the user prefers dark and you have not set a theme attribute, @media (prefers-color-scheme: dark) uses the -dark pair.
3. :root[theme='light'] and :root[theme='dark'] override both of the above.

The attribute also sets `color-scheme` so native controls follow the same scheme. `:host` is there for shadow-DOM consumers; the docs site and a normal page use `:root`.

This site always starts as `<html lang="en" theme="light">`. The moon icon in the navbar flips that attribute between `light` and `dark`. It does not read `prefers-color-scheme` and it does not persist to `localStorage`.

### Reading the theme

Put a short inline script in `<head>`, before the stylesheet paints, if you want to restore a saved choice and avoid a flash of the wrong scheme. The framework itself does not run this — you own persistence.

Without a `theme` attribute the CSS already follows `prefers-color-scheme`. Once you set the attribute, that media query no longer wins. The snippet below reads a stored value first, then falls back to the OS preference, then writes the attribute so the override is explicit.

```html
<script>
  function getTheme() {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    const prefersDark = window.matchMedia
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('theme', theme);
    localStorage.setItem('theme', theme);
  }

  setTheme(getTheme());
</script>
```

Keep this inline rather than in an external file so it runs before the first paint. Setting `theme="light"` in the HTML and never changing it — as this docs site does — locks the page to light until JavaScript flips the attribute.

### Changing the theme

Switch schemes by writing the attribute. That is the entire public API — there is no `Expressive.theme` helper.

```js
document.documentElement.setAttribute('theme', 'dark');
document.documentElement.setAttribute('theme', 'light');
```

Bind that to a control. The navbar moon on this site does exactly that and swaps its icon; it does not write `localStorage`. A consumer app that wants the choice to stick can reuse `setTheme` from the snippet above:

```js
document.getElementById('theme-toggle').addEventListener('click', (event) => {
  event.preventDefault();
  const next = document.documentElement.getAttribute('theme') === 'dark'
    ? 'light'
    : 'dark';
  setTheme(next);
});
```

Toggle theme

The same control lives in the top-right of every docs page. After a reload this site is light again.

### Creating a theme

Customize by overriding the Material Design 3 tokens. Do not set `--background-color`, `--primary-color`, or other pre-2.1 names — those are not wired in Expressive.

Three layers exist. `tokens/_reference.scss` generates the tonal ramps from `--md-source`, then resolves them into the pairs (`--md-sys-color-primary-light`, `--md-sys-color-primary-dark`, and the rest). `tokens/_theme.scss` collapses each pair into the live `--md-sys-color-*` name with `light-dark()`. Components only read the live names.

Override the `-light` and `-dark` pairs so both schemes stay consistent. Load your sheet **after** Expressive so equal-specificity `:root` rules win.

```css
:root {
  --md-sys-color-primary-light: #6750a4;
  --md-sys-color-on-primary-light: #ffffff;
  --md-sys-color-primary-container-light: #eaddff;
  --md-sys-color-on-primary-container-light: #21005d;

  --md-sys-color-primary-dark: #d0bcff;
  --md-sys-color-on-primary-dark: #381e72;
  --md-sys-color-primary-container-dark: #4f378b;
  --md-sys-color-on-primary-container-dark: #eaddff;
}
```

To restyle only one scheme, set the live names on the attribute selector. A bare `:root { --md-sys-color-primary: … }` loses to `:root[theme='dark']` because the attribute rule is more specific.

```css
:root[theme='dark'] {
  --md-sys-color-primary: #d0bcff;
  --md-sys-color-on-primary: #381e72;
  --md-sys-color-surface: #1c1b1f;
  --md-sys-color-on-surface: #e6e1e5;
}
```

The same custom properties inherit, so a wrapper can preview a palette without touching the rest of the page:

```html
<div style="
  --md-sys-color-primary: #6750a4;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #eaddff;
  --md-sys-color-on-primary-container: #21005d;
">
  <a class="btn filled">Filled</a>
</div>
```

In Sass, consume the live token. The values are hex, so `rgba(var(--md-sys-color-primary), 0.06)` is invalid and the browser drops it. Mix with transparency instead:

```css
.my-surface {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}

.my-overlay {
  background-color: color-mix(in oklab, var(--md-sys-color-primary) 6%, transparent);
}
```

`--md-source` is the seed the ramps are generated from, and it is live: set it and every generated ramp — and every system color that resolves to one — recolors at runtime, with no rebuild. Expressive ships `#006A79`.

```css
:root {
  --md-source: #6750a4;   /* one line; the whole theme follows */
}
```

Five of the six ramps are derived this way with `oklch(from var(--md-source) …)`. The **error** ramp is deliberately not: Material fixes the error hue rather than deriving it, because "this went wrong" should not change color when you change your brand color.

Overriding an individual `-light`/`-dark` pair still works and still wins — that is the more surgical tool. `--md-source` is the blunt one.

Where the shipped seed `#006A79` lands, for the roles you will most often replace. These are *resolved* values: the stylesheet ships the `oklch()` expression, and the browser computes the color — including gamut-mapping the entries whose target chroma sRGB cannot reach — so treat them as accurate to about a rounding step rather than as literals to paste back in.

| Token | Light | Dark |
| --- | --- | --- |
| `primary` | #006a7a | #4fdbf5 |
| `on-primary` | #ffffff | #003740 |
| `primary-container` | #aaf0ff | #00505c |
| `on-primary-container` | #002026 | #aaf0ff |
| `secondary` | #4b6369 | #b1cbd3 |
| `secondary-container` | #cde8ef | #344b51 |
| `tertiary` | #535c7f | #bac4ed |
| `error` | #ba1a1a | #ffb4ab |
| `background` | #fafdff | #1a1c1d |
| `surface` | #fafdff | #1a1c1d |
| `on-surface` | #1a1c1d | #e0e3e4 |
| `surface-variant` | #d9e5e8 | #3f484b |
| `outline` | #6f797c | #889296 |

`error` is the one row that does not move when you change the seed — it is the ramp that is not generated.

The full list of role utilities lives on the Color page. Pair a fill with its `on-*` text class so contrast stays correct when the scheme flips.

---

## Color

One system: the Material Design 3 theme tokens.

Color in Expressive is the Material Design 3 Expressive roles — CSS custom properties on `:root` named `--md-sys-color-*`, exposed as utility classes like `.primary` and `.on-surface-text`. There are 26 standard roles in six groups (primary, secondary, tertiary, error, surface, outline), plus optional add-ons for fixed accents and the surface container scale.

The 2014 Material palette that shipped with earlier versions (`.red`, `.blue.lighten-2`, `colorFunc()`) has been removed. It generated 532 utility classes — 18% of the stylesheet — expressing a design opinion this framework does not hold, and it did not follow the page theme. Replace a palette class with the role it was standing in for: `.red` → `.error`, `.blue` → `.primary`, `.green` → `.tertiary`, and pair each fill with its `on-*` text class.

Token values follow the page theme. The docs site sets `<html theme="light">` or `theme="dark"`. Without that attribute, the tokens follow `prefers-color-scheme`.

A background class sets `background-color`. Append `-text` for `color`. Pair roles as the spec intends so contrast stays at least 3:1: primary for the FAB and filled buttons, secondary for filter chips and selected nav pills, tertiary for contrasting accents, error for error states, surface for page backgrounds, surface-container* for cards/sheets/dialogs/menus. `on-*` is text and icons on that fill. Container roles are fills, not text.

```html
<div class="primary on-primary-text">.primary</div>
<span class="on-surface-text">.on-surface-text</span>
```

Every role name is a background class. The same name plus `-text` is the foreground class (`.on-surface-text`). Prefer the `on-*` text class on its paired fill.

Standard pairs: `primary` / `on-primary`, `primary-container` / `on-primary-container`, and the same for secondary, tertiary, and error. Surface: `surface`, `surface-dim`, `surface-bright`, `surface-container-lowest` … `surface-container-highest`, `on-surface`, `on-surface-variant`. Outline: `outline`, `outline-variant`. Inverse: `inverse-surface` / `inverse-on-surface`, `inverse-primary`. Overlay: `scrim`, `shadow`. Optional fixed accents (`primary-fixed`, `primary-fixed-dim`, `on-primary-fixed`, `on-primary-fixed-variant`, and the secondary/tertiary copies) stay the same in light and dark. `background`, `on-background`, `surface-variant`, and `surface-tint` remain as aliases.

In Sass, consume the token directly. Do not write `rgba(var(--md-sys-color-primary), 0.06)` — the tokens hold hex colors, so that form is invalid. Mix with transparency instead:

```css
.my-tint {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.my-overlay {
  background-color: color-mix(in oklab, var(--md-sys-color-primary) 6%, transparent);
}
```

Mix `in oklab`, not `in srgb`. sRGB interpolation dips in lightness through the midtones, so the same percentage reads muddier on some hues than others; OKLab is perceptually uniform, so a 16% state layer looks like 16% everywhere.

### Every role

A role is a job, not a color: `error` means "this went wrong", and what that looks like is the theme's business.

##### #

##### Line and overlay

### Sass

Do not `@extend` these classes across files — that is how the old stylesheet lost control of cascade order. In a component partial, read the token directly.

```css
.my-panel {
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
}
```

There is no Sass color function any more. `colorFunc()` and the `$colors` map were removed with the palette — a Sass function resolves at build time, which cannot follow a theme the user switches at runtime. The custom property can.

---

## Grid

Use Expressive's CSS Grid system to format a page in an ordered, comfortable way.

We are using a standard 12 column fluid responsive grid system. The grid helps you layout your page in an ordered, easy fashion.

### Container

The container class is not strictly part of the grid but is important in laying out content. It allows you to center your page content. The `container` class is set to ~70% of the window width. It helps you center and contain your page content. We use the container to contain our body content.

#### Demo

Try the button below to see what the page looks like without containers.

To add a container just put your content inside a `<div>` tag with a `container` class. Here's an example of how your page might be set up.

```html
<body>
  <div class="container">
    <!-- Page Content goes here -->
  </div>
</body>
```

### Introduction

Take a look at this section to quickly understand how the grid works!

#### 12 Columns

Our standard grid has 12 columns. No matter the size of the browser, each of these columns will always have an equal width.

To get a feel of how the grid is used in HTML, take a look at the code below which will produce a similar result to the one above.

```html
<div class="row">
  <div class="s1">1</div>
  <div class="s1">2</div>
  <div class="s1">3</div>
  <div class="s1">4</div>
  <div class="s1">5</div>
  <div class="s1">6</div>
  <div class="s1">7</div>
  <div class="s1">8</div>
  <div class="s1">9</div>
  <div class="s1">10</div>
  <div class="s1">11</div>
  <div class="s1">12</div>
</div>
```

Note: For now, just know that the `s1` stands for small-1 which in plain English means "1 column on small screens".

#### Columns live inside Rows

Remember when you are creating your layout that all columns must be contained inside a row. Size each inner div with a screen-prefix class such as `s12` or `m6`.

```html
<div class="row">
  <div class="s12">This div is 12-columns wide on all screen sizes</div>
  <div class="s6">6-columns (one-half)</div>
  <div class="s6">6-columns (one-half)</div>
</div>
```

### Offsets

To offset, simply add `offset-s2` to the class where `s` signifies the screen class-prefix (s = small, m = medium, l = large) and the number after is the number of columns you want to offset by.

Attention! Offsets are calculated absolutely starting from the left. If you need relative offsets, add empty columns to the row.

```html
<div class="row">
  <div class="s12">This div is 12-columns wide on all screen sizes</div>
  <div class="s6 offset-s6">6-columns (offset-by-6)</div>
</div>
<div class="row">
  <div class="l6">l6 column</div>
  <div class="l4 offset-l8">l4 column (offset-l8)</div>
</div>
<div class="row">
  <div class="l2 offset-l3">offset-l3</div>
  <div class="l2 offset-l6">offset-l6</div>
  <div class="l2 offset-l9">offset-l9</div>
</div>
<div class="row">
  <div class="l2">col</div>
  <div class="l2"></div>
  <div class="l2">relative offset 2</div>
</div>
```

### Gaps

There is a default gap between the columns (g-3). You can easily change the gap with the gap classes. Simply add `g-0` to `g-5` to the element with the `row` class.

Standard Gaps (g-3)

No Gap (g-0)

Bigger Gap (g-4)

```html
<div class="row g-4">
  <div class="s3">1</div>
  <div class="s3">2</div>
  <div class="s3">3</div>
  <div class="s3">4</div>
</div>
```

### Push and Pull

Deprecated. CSS Grid is used now — use offsets, or empty columns, to change placement.

Older versions reordered columns with `push-s2` or `pull-s2`, where `s` is the screen class-prefix and the number is how many columns to push or pull by. Those classes are no longer part of the grid.

### Creating Layouts

Here we will show you how to create some commonly used layouts with our grid system. Hopefully these will get you more comfortable with laying out elements. To keep these demos simple, the ones here will not be responsive.

#### Section

The section class is used for simple top and bottom padding. Just add the `section` class to your divs containing large blocks of content.

#### Divider

Dividers are 1 pixel lines that help break up your content. Just add the `divider` class to a div in between your content.

#### Example Sections and Dividers

#### Section 1

Stuff

#### Section 2

Stuff

#### Section 3

Stuff

```html
<div class="divider"></div>
<div class="section">
  <h5>Section 1</h5>
  <p>Stuff</p>
</div>
<div class="divider"></div>
<div class="section">
  <h5>Section 2</h5>
  <p>Stuff</p>
</div>
<div class="divider"></div>
<div class="section">
  <h5>Section 3</h5>
  <p>Stuff</p>
</div>
```

#### Example Promotion Table

If we want 3 divs that are equal size, we define the divs with a width of 4-columns, as 4+4+4 nicely adds up to 12. Inside those divs, we can put our content.

Speeds up development

Most of the heavy lifting is done for you to provide default stylings that incorporate our custom components. We also refined animations and transitions to provide a smoother experience for developers.

User Experience Focused

By utilizing elements and principles of Material Design, we were able to create a framework that focuses on User Experience.

Easy to work with

We have provided detailed documentation as well as specific code examples to help new users get started.

```html
<div class="row">
  <div class="s4">
    <!-- Promo Content 1 goes here -->
  </div>
  <div class="s4">
    <!-- Promo Content 2 goes here -->
  </div>
  <div class="s4">
    <!-- Promo Content 3 goes here -->
  </div>
</div>
```

#### Example Side Navigation Layout

You can see how easy it is to create layouts using the grid system. Just remember to make sure your column numbers add up to 12 for an even layout.

```text
<!-- Navbar goes here -->
<!-- Page Layout here -->
<div class="row">
  <div class="s3">
    <!-- Grey navigation panel -->
  </div>
  <div class="s9">
    <!-- Teal page content -->
  </div>
</div>
```

### Creating Responsive Layouts

Above we showed you how to layout elements using our grid system. Now we'll show you how to design your layouts so that they look great on all screen sizes.

#### Screen Sizes

|  | Mobile Devices <= 600px | Tablet Devices > 600px | Desktop Devices > 992px | Large Desktop Devices > 1200px |
| --- | --- | --- | --- | --- |
| **Class Prefix** | `.s` | `.m` | `.l` | `.xl` |
| **Container Width** | 90% | 85% | 70% | 70% |
| **Number of Columns** | 12 | 12 | 12 | 12 |

#### Adding Responsiveness

In the previous examples, we only defined the size for small screens using `s12`. This is fine if we want a fixed layout since the rules propagate upwards. By just saying s12, we are essentially saying `s12 m12 l12`. But by explicitly defining the size we can make our website more responsive.

```html
<div class="row">
  <div class="s12">I am always full-width (s12)</div>
  <div class="s12 m6">I am full-width on mobile (s12 m6)</div>
</div>
```

#### Responsive Side Navigation Layout

In this example below, we take the same layout from above, but we make it responsive by defining how many columns the div should take up on each screen size. Try resizing your browser and watch the layout change below.

```text
<!-- Navbar goes here -->
<!-- Page Layout here -->
<div class="row">
  <div class="s12 m4 l3">
    <!-- Grey navigation panel
          This content will be:
      3-columns-wide on large screens,
      4-columns-wide on medium screens,
      12-columns-wide on small screens -->
  </div>
  <div class="s12 m8 l9">
    <!-- Teal page content
          This content will be:
      9-columns-wide on large screens,
      8-columns-wide on medium screens,
      12-columns-wide on small screens -->
  </div>
</div>
```

#### More Responsive Grid Examples

```html
<div class="row">
  <div class="s12">s12</div>
  <div class="s12 m4 l2">s12 m4 l2</div>
  <div class="s12 m4 l8">s12 m4 l8</div>
  <div class="s12 m4 l2">s12 m4 l2</div>
</div>
<div class="row">
  <div class="s12 m6 l3">s12 m6 l3</div>
  <div class="s12 m6 l3">s12 m6 l3</div>
  <div class="s12 m6 l3">s12 m6 l3</div>
  <div class="s12 m6 l3">s12 m6 l3</div>
</div>
```

---

## Helpers

An overview of the helper classes for alignment, visibility, spacing, and common CSS properties.

### Alignment

Easy-to-use classes to help you align your content.

#### Vertical Align

You can easily vertically center things by adding the class `valign-wrapper` to the container holding the items you want to vertically align.

```html
<div class="valign-wrapper">
  <h5>This should be vertically aligned</h5>
</div>
```

#### Text Align

These classes are for horizontally aligning content: `.left-align`, `.right-align` and `.center-align`. `.center` is an alias of `.center-align`.

#### This should be left aligned

#### This should be right aligned

#### This should be center aligned

```html
<div>
  <h5 class="left-align">This should be left aligned</h5>
</div>
<div>
  <h5 class="right-align">This should be right aligned</h5>
</div>
<div>
  <h5 class="center-align">This should be center aligned</h5>
</div>
```

To center text on mobile only, add `center-on-small-only`.

#### Quick Floats

Quickly float things by adding the class `left` or `right` to the element. `!important` is used to avoid specificity issues.

```html
<div class="left">...</div>
<div class="right">...</div>
```

### Hiding/Showing Content

We provide easy to use classes to hide/show content on specific screen sizes.

| Class | Screen Range |
| --- | --- |
| `**.hide**` | Hidden for all Devices |
| `**.hide-on-small-only**` | Hidden for Mobile Only |
| `**.hide-on-med-only**` | Hidden for Tablet Only |
| `**.hide-on-med-and-down**` | Hidden for Tablet and Below |
| `**.hide-on-med-and-up**` | Hidden for Tablet and Above |
| `**.hide-on-large-only**` | Hidden for Desktop Only |
| `**.hide-on-extra-large-only**` | Hidden for Large Desktop Only |
| `**.show-on-small**` | Show for Mobile Only |
| `**.show-on-medium**` | Show for Tablet Only |
| `**.show-on-large**` | Show for Desktop Only |
| `**.show-on-extra-large**` | Show for Large Desktop Only |
| `**.show-on-medium-and-up**` | Show for Tablet and Above |
| `**.show-on-medium-and-down**` | Show for Tablet and Below |

`.hide-on-small-and-down` is an alias of `.hide-on-small-only`.

#### Usage

```html
<div class="hide-on-small-only"></div>
```

### Spacing

These classes help space elements with margin and padding helpers for all directions. This works by combining a margin/padding prefix, a direction infix and value suffix.

#### Prefix margin and padding modifiers

| Prefix | Modifies |
| --- | --- |
| `**m***` | Modifies the margin according to the infix and suffix values. If no infix is provided, it will be applied to all directions. |
| `**p***` | Modifies the padding according to the infix and suffix values. If no infix is provided, it will be applied to all directions. |

#### Infix direction modifiers

| Infix | Direction |
| --- | --- |
| `***t**` | Applies modifier to the top side of the element |
| `***r**` | Applies modifier to the right side of the element |
| `***b**` | Applies modifier to the bottom side of the element |
| `***l**` | Applies modifier to the left side of the element |
| `***x**` | Applies modifier to the left and right sides of the element |
| `***y**` | Applies modifier to the top and bottom sides of the element |

#### Suffix values

Any margin or padding modifier must be appended with one of these value suffixes.

| Suffix | Value |
| --- | --- |
| `***-0**` | `**0**` |
| `***-1**` | `**0.25rem**` |
| `***-2**` | `**0.5rem**` |
| `***-3**` | `**0.75rem**` |
| `***-4**` | `**1rem**` |
| `***-5**` | `**1.5rem**` |
| `***-6**` | `**3rem**` |
| `***-auto**` | `**auto**` |

#### Tables of all spacing helpers

All margin helpers

| Property | Prefix | Classes |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `**margin**` | `**m**` | `**m-0**` | `**m-1**` | `**m-2**` | `**m-3**` | `**m-4**` | `**m-5**` | `**m-6**` | `**m-auto**` |
| `**margin-top**` | `**mt**` | `**mt-0**` | `**mt-1**` | `**mt-2**` | `**mt-3**` | `**mt-4**` | `**mt-5**` | `**mt-6**` | `**mt-auto**` |
| `**margin-right**` | `**mr**` | `**mr-0**` | `**mr-1**` | `**mr-2**` | `**mr-3**` | `**mr-4**` | `**mr-5**` | `**mr-6**` | `**mr-auto**` |
| `**margin-bottom**` | `**mb**` | `**mb-0**` | `**mb-1**` | `**mb-2**` | `**mb-3**` | `**mb-4**` | `**mb-5**` | `**mb-6**` | `**mb-auto**` |
| `**margin-left**` | `**ml**` | `**ml-0**` | `**ml-1**` | `**ml-2**` | `**ml-3**` | `**ml-4**` | `**ml-5**` | `**ml-6**` | `**ml-auto**` |
| `**margin-top**` and `**margin-bottom**` | `**my**` | `**my-0**` | `**my-1**` | `**my-2**` | `**my-3**` | `**my-4**` | `**my-5**` | `**my-6**` | `**my-auto**` |
| `**margin-left**` and `**margin-right**` | `**mx**` | `**mx-0**` | `**mx-1**` | `**mx-2**` | `**mx-3**` | `**mx-4**` | `**mx-5**` | `**mx-6**` | `**mx-auto**` |
| Values | 0 | 0.25rem | 0.5rem | 0.75rem | 1rem | 1.5rem | 3rem | auto |  |

All padding helpers

| Property | Prefix | Classes |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `**padding**` | `**p**` | `**p-0**` | `**p-1**` | `**p-2**` | `**p-3**` | `**p-4**` | `**p-5**` | `**p-6**` | `**p-auto**` |
| `**padding-top**` | `**pt**` | `**pt-0**` | `**pt-1**` | `**pt-2**` | `**pt-3**` | `**pt-4**` | `**pt-5**` | `**pt-6**` | `**pt-auto**` |
| `**padding-right**` | `**pr**` | `**pr-0**` | `**pr-1**` | `**pr-2**` | `**pr-3**` | `**pr-4**` | `**pr-5**` | `**pr-6**` | `**pr-auto**` |
| `**padding-bottom**` | `**pb**` | `**pb-0**` | `**pb-1**` | `**pb-2**` | `**pb-3**` | `**pb-4**` | `**pb-5**` | `**pb-6**` | `**pb-auto**` |
| `**padding-left**` | `**pl**` | `**pl-0**` | `**pl-1**` | `**pl-2**` | `**pl-3**` | `**pl-4**` | `**pl-5**` | `**pl-6**` | `**pl-auto**` |
| `**padding-top**` and `**padding-bottom**` | `**py**` | `**py-0**` | `**py-1**` | `**py-2**` | `**py-3**` | `**py-4**` | `**py-5**` | `**py-6**` | `**py-auto**` |
| `**padding-left**` and `**padding-right**` | `**px**` | `**px-0**` | `**px-1**` | `**px-2**` | `**px-3**` | `**px-4**` | `**px-5**` | `**px-6**` | `**px-auto**` |
| Values | 0 | 0.25rem | 0.5rem | 0.75rem | 1rem | 1.5rem | 3rem | auto |  |

#### Usage

```html
<div class="p-2">
  <h5 class="mt-1">The div has a padding 0.5rem and the h5 has a margin-top of 0.25rem</h5>
</div>
```

### Formatting

These classes help format various content on your site.

#### Truncation

To truncate long lines of text in an ellipsis, add the class `truncate` to the tag which contains the text. See an example below of a header being truncated inside a card.

#### This is an extremely long title that will be truncated

```text
<h4 class="truncate">This is an extremely long title that will be truncated</h4>
```

#### Hover

The `hoverable` class adds an animation for box shadow as seen below. It can be used on most elements, but is meant for use on cards.

```html
<article class="hoverable">Hoverable Card</article>
```

### Browser Defaults

Because we override many of the default browser styles and elements, we provide the `.browser-default` class to opt those elements out of the framework treatment.

| Name of Element | Reverted Style |
| --- | --- |
| SELECT | Browser default select element |
| INPUT | Browser default input |

```html
<select class="browser-default">
  <option value="" disabled selected>Choose your option</option>
  <option value="1">Option 1</option>
</select>
<input class="browser-default" type="text">
```

---

## Media Styles

Responsive images and videos ready to be seen on many devices.

### Images

Images can be styled in different ways using Expressive.

#### Responsive Images

To make images resize responsively to page width, you can add the class `responsive-img` to your image tag. It will now have a `max-width: 100%` and `height: auto`.

```html
<img class="responsive-img" src="cool_pic.jpg">
```

#### Circular images

To make images appear circular, simply add `class="circle"` to them.

```html
<div class="s12 m8 offset-m2 l6 offset-l3">
  <article>
    <div class="row valign-wrapper">
      <div class="s2">
        <img src="portrait.jpg" alt="" class="circle responsive-img">
      </div>
      <div class="s10">
        <span>
          This is a square image. Add the "circle" class to it to make it appear circular.
        </span>
      </div>
    </div>
  </article>
</div>
```

### Videos

We provide a container for embedded videos that resizes them responsively.

#### Responsive Embeds

To make your embeds responsive, wrap them with a containing div which has the class `video-container`.

```html
<div class="video-container">
  <iframe src="https://www.youtube.com/embed/Q8TXgCzxEnw?rel=0" allowfullscreen></iframe>
</div>
```

#### Responsive Videos

To make your HTML5 videos responsive just add the class `responsive-video` to the video tag.

```html
<video class="responsive-video" controls>
  <source src="movie.mp4" type="video/mp4">
</video>
```

---

## Pulse

Draw attention to floating buttons with a subtle, repeating pulse.

Draw attention to your buttons with this subtle but captivating effect. Just add the class `pulse` to your button. Note: This is meant for floating buttons, so it may not work perfectly with every component.

#### Pulse HTML Structure

```html
<a class="button circle pulse"><i class="material-icons">menu</i></a>
<a class="button circle extra pulse"><i class="material-icons">cloud</i></a>
<a class="button circle extra secondary on-secondary-text pulse"><i class="material-icons">edit</i></a>
```

---

## Shadow

Raise or flatten an element with the z-depth elevation classes.

In material design, everything should have a certain z-depth that determines how far raised or close to the page the element is.

You can easily apply this shadow effect by adding a `class="z-depth-2"` to an HTML tag. In Sass, include the mixin rather than extending the class: `@include z-depth("2")`. A `z-depth-0` can be used to remove shadows from elements that have z-depths by default.

```html
<div class="row">
  <div class="s12 m4 l3">
    <div class="z-depth-0">0</div>
  </div>
  <div class="s12 m4 l3">
    <div class="z-depth-1">1</div>
  </div>
  <div class="s12 m4 l3">
    <div class="z-depth-2">2</div>
  </div>
  <div class="s12 m4 l3">
    <div class="z-depth-3">3</div>
  </div>
  <div class="s12 m4 l3">
    <div class="z-depth-4">4</div>
  </div>
  <div class="s12 m4 l3">
    <div class="z-depth-5">5</div>
  </div>
</div>
```

#### Sass

The class list is generated from the same map as the mixin, so they cannot drift. Prefer the mixin inside component styles; `@extend .z-depth-2` across files is not supported.

```css
.my-panel {
  @include z-depth("2");
}
```

There is also `z-depth-1-half`, used by some components for an in-between hover elevation.

---

## Table

Organize data with a few utility classes on a standard HTML table.

Tables are a nice way to organize a lot of data. We provide a few utility classes to help you style your table as easily as possible.

| Name | Item Name | Item Price |
| --- | --- | --- |
| Alvin | Eclair | $0.87 |
| Alan | Jellybean | $3.76 |
| Jonathan | Lollipop | $7.00 |
| Shannon | KitKat | $9.99 |

```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Item Name</th>
      <th>Item Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alvin</td>
      <td>Eclair</td>
      <td>$0.87</td>
    </tr>
    <tr>
      <td>Alan</td>
      <td>Jellybean</td>
      <td>$3.76</td>
    </tr>
    <tr>
      <td>Jonathan</td>
      <td>Lollipop</td>
      <td>$7.00</td>
    </tr>
  </tbody>
</table>
```

### Striped Table

Add `class="striped"` to the table tag for a striped table.

| Name | Item Name | Item Price |
| --- | --- | --- |
| Alvin | Eclair | $0.87 |
| Alan | Jellybean | $3.76 |
| Jonathan | Lollipop | $7.00 |
| Shannon | KitKat | $9.99 |

### Highlight Table

Add `class="highlight"` to the table tag for a highlight table.

| Name | Item Name | Item Price |
| --- | --- | --- |
| Alvin | Eclair | $0.87 |
| Alan | Jellybean | $3.76 |
| Jonathan | Lollipop | $7.00 |
| Shannon | KitKat | $9.99 |

### Centered Table

Add `class="centered"` to the table tag to center align all the text in the table.

| Name | Item Name | Item Price |
| --- | --- | --- |
| Alvin | Eclair | $0.87 |
| Alan | Jellybean | $3.76 |
| Jonathan | Lollipop | $7.00 |
| Shannon | KitKat | $9.99 |

### Responsive Table

Add `class="responsive-table"` to the table tag to make the table horizontally scrollable on smaller screen widths.

| Name | Item Name | Item Price |
| --- | --- | --- |
| Alvin | Eclair | $0.87 |
| Alan | Jellybean | $3.76 |
| Jonathan | Lollipop | $7.00 |
| Shannon | KitKat | $9.99 |

---

## Transitions

Animate content in and out with a few CSS classes.

We've made some custom animation classes that will transition your content with only CSS. Each CSS transition consists of a base class that applies the necessary styles and additional classes that control the state of the transition.

#### Scale

Use this to scale in and out elements. Make sure to add the base transition class `scale-transition`. Then add the class `scale-out` to scale the element down until it is hidden. To start something as hidden, add the class `scale-out` first, and then add the class `scale-in` to scale the element up until it is shown.

```text
<!-- Scaled in -->
<a id="scale-demo" href="#!" class="button circle extra scale-transition">
  <i class="material-icons">add</i>
</a>
<!-- Scaled out -->
<a id="scale-demo" href="#!" class="button circle extra scale-transition scale-out">
  <i class="material-icons">add</i>
</a>
```

---

## Typography

Material Design 3 type, from the HTML.

The type scale is the HTML. `<h1>`–`<h6>` are display and headline roles, `<p>` is body-large, `<small>` is body-small. You do not need a class unless the element cannot carry the role — a `<span class="label-large">`, or a `<p class="display-large">` used as a hero numeral.

Tokens follow the [M3 type system](https://m3.material.io/styles/typography/overview). Each role sets family, size, weight, line-height, and letter-spacing from `--md-sys-typescale-*`. They do not set `font-style` — the token named `-font-family-style` holds “Regular” / “Medium”, which are weights, not CSS `font-style` keywords.

Those tokens name Roboto. The framework does not ship the font files. This page loads Roboto so the samples match the spec; your app should do the same if you want the scale as designed. Body copy falls back to the system stack if Roboto is missing.

### Semantic map

### Heading 2

### Heading 3

#### Heading 4

#### Heading 5

##### Heading 6

A paragraph uses body-large. It is for longer reading, not chrome.

Small print and figcaptions use body-small.

```text
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<p>A paragraph uses body-large.</p>
<small>Small print.</small>
```

| Element | Role | Size | Weight |
| --- | --- | --- | --- |
| `h1` | display-small | 36px | 400 |
| `h2` | headline-large | 32px | 400 |
| `h3` | headline-medium | 28px | 400 |
| `h4` | headline-small | 24px | 400 |
| `h5` | title-large | 22px | 400 |
| `h6` | title-medium | 16px | 500 |
| `p` | body-large | 16px | 400 |
| `small`, `figcaption` | body-small | 12px | 400 |
| `body` | body-medium | 14px | 400 |

### The fifteen roles

When the tag cannot say the role, use the class. Display-large and display-medium have no heading — they are for short, important numerals and hero lines.

Display Large

Display Medium

Display Small

Headline Large

Headline Medium

Headline Small

Title Large

Title Medium

Title Small

Body Large

Body Medium

Body Small

Label Large

Label Medium

Label Small

```text
<p class="display-large">Display Large</p>
<span class="label-large">Label</span>
```

| Class | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| `display-large` | 57px | 400 | 64px | −0.25px |
| `display-medium` | 45px | 400 | 52px | 0 |
| `display-small` | 36px | 400 | 44px | 0 |
| `headline-large` | 32px | 400 | 40px | 0 |
| `headline-medium` | 28px | 400 | 36px | 0 |
| `headline-small` | 24px | 400 | 32px | 0 |
| `title-large` | 22px | 400 | 28px | 0 |
| `title-medium` | 16px | 500 | 24px | 0.15px |
| `title-small` | 14px | 500 | 20px | 0.10px |
| `body-large` | 16px | 400 | 24px | 0.50px |
| `body-medium` | 14px | 400 | 20px | 0.25px |
| `body-small` | 12px | 400 | 16px | 0.40px |
| `label-large` | 14px | 500 | 20px | 0.10px |
| `label-medium` | 12px | 500 | 16px | 0.50px |
| `label-small` | 11px | 500 | 16px | 0.50px |

### Emphasis

`<em>` is italic. `<strong>` and `<b>` are weight 500 (M3 Medium). Helpers cover the rest when the tag is already taken.

*Emphasized*, **strong**, italic, bold, light, thin, underline, upper, capitalize this.

```text
<em>Emphasized</em>
<strong>strong</strong>
<span class="bold">bold</span>
<span class="upper">upper</span>
```

`large-text`, `medium-text`, and `small-text` apply the three body roles to an element that is not a `<p>` or `<small>`.

### Blockquotes

Blockquotes emphasize a quote or citation. The left bar uses `--md-sys-color-primary`.

> This is an example quotation that uses the blockquote tag. Here is another line to make it look bigger.

```text
<blockquote>
  This is an example quotation that uses the blockquote tag.
</blockquote>
```

### Flow Text

Toggle flow-text

`flow-text` scales font size with the viewport so line length stays readable. Resize the window and watch the sample change, or use the button to compare with unscaled body text.

To see Flow Text in action, slowly resize your browser and watch the size of this text body change. Use the button above to toggle flow-text off and on to see the difference.

```text
<p class="flow-text">I am Flow Text</p>
```

### Font stack

Body type uses a system stack. Roboto is a name on the type-scale tokens, not a file the package serves. Override `$font-stack` in Sass, or set `font-family` in your own CSS:

```text
html,
button, input, optgroup, select, textarea {
  font-family: GillSans, Calibri, Trebuchet, sans-serif;
}
```

The default stack is `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif`. Form controls inherit that stack. Root `font-size` is 14px on small screens, 14.5px from the large breakpoint, and 15px from xlarge, so rem-based lengths grow slightly on wider viewports. Headings use the token sizes in px, so they do not follow that ladder.

---

## Waves

The Material Design ink ripple, included in the Expressive JavaScript bundle.

#### Introduction

Waves creates the ink effect outlined in Material Design. It is included in the Expressive JavaScript bundle and starts itself when the bundle loads. Click the button to try it.

#### Applying Waves

The waves effect can be applied to any element. To put the waves effect on buttons, you just have to put the class `waves-effect` on to the buttons. If you want the waves effect to be white instead, add both `waves-effect waves-light` as classes.

```html
<a class="button large waves-effect waves-light" href="#">Wave</a>
```

#### Customization

There are several ways to customize waves. You can use the pre-created classes, or define your own color by calling the API.

#### Available Classes

To use these, just add the corresponding class to your button. Play around with changing the background color of buttons and the waves effect to create something cool!

```html
<a href="#!" class="btn waves-effect">Send</a>
```

#### Call programmatically

You can create a wave on a specific element programmatically. Here you can set a custom color and position. Click the button to try it.

```js
// Trigger a red wave from the center
Expressive.Waves.renderWaveEffect(
  document.querySelector('.wave-demo'), // Target element
  null,                                 // Position {x, y}, or null for center
  { r: 255, g: 0, b: 0 }                // RGB color
);
```

#### Circle

If you want waves to form to a non-rectangular shape, there is an option for circular waves. Just add `waves-circle` in addition to `waves-effect`.

#### HTML Markup

```html
<a href="#!" class="button circle waves-effect waves-circle waves-light">
  <i class="material-icons">add</i>
</a>
```

---

# CSS components

## Badges

Notifications, counts, or status on navigation items and icons.

A `<span class="badge">` is the badge. Empty is the **small** 6dp dot; text is the **large** 16dp stadium. Nest it in the icon so it sits on the upper trailing edge of the 24dp glyph. Limit the label to four characters, including `+`. The default mapping is `error` / `on-error`.

```html
<i class="material-symbols">mail<span class="badge"></span></i>
<i class="material-symbols">mail<span class="badge">1</span></i>
<i class="material-symbols">mail<span class="badge">999+</span></i>
```

### Small

Leave the badge empty. It is a 6dp circle with no label.

### Large

Put a number or short label in the badge. Height is 16dp, corners are a stadium, inset is 4dp. Use `999+` when the count is larger than 999.

### On navigation

Nest the badge in the destination icon, or leave it as a sibling — the bar and rail place a sibling on the icon’s upper trailing corner.

```html
<a href="#!">
  <i class="material-symbols">inbox<span class="badge">3</span></i>
  Inbox
</a>
```

### In a list or sidenav

A trailing `.badge` in a list or drawer row stays in flow on the end.

```html
<ul class="list">
  <li>
    <i class="material-symbols">inbox</i>
    Inbox
    <span class="badge">3</span>
  </li>
</ul>
```

### Color

Default is `error` / `on-error`. Override with a fill + `on-*` pair when the badge is not an error/notification.

```html
<span class="badge">3</span>
<span class="badge primary on-primary-text">1</span>
```

---

## Breadcrumbs

Show the current location when the page sits several layers deep.

Breadcrumbs are a good way to display your current location. This is usually used when you have multiple layers of content.

### Basic

```html
<nav class="breadcrumb-wrapper">
  <a href="#!" class="breadcrumb">First</a>
  <a href="#!" class="breadcrumb">Second</a>
  <a href="#!" class="breadcrumb">Third</a>
</nav>
```

### Navbar style

```text
<header>
  <nav>
    <a href="#!" class="breadcrumb">First</a>
    <a href="#!" class="breadcrumb">Second</a>
    <a href="#!" class="breadcrumb">Third</a>
  </nav>
</header>
```

---

## Buttons

Material Design 3 common buttons, icon buttons, and FABs — from the HTML.

A `<button>` is a filled common button. An `<a class="button">` (or the older `.btn`) is the same thing for a link. Put an `<i>` and wrap the label in a `<span>` — there is no `icon-left` / `icon-right` class. Add `circle` for a 40dp icon button.

Tokens follow the [M3 button spec](https://m3.material.io/components/buttons/specs). Default height is 40dp, label is `label-large`, corners are 20dp (a stadium), icons are 18dp with an 8dp gap, and the horizontal inset is 24dp (16dp next to an icon). State layers are 8% hover and 10% focus or press. Disabled is `on-surface` at 38% on a 12% container.

Create Create Send

```html
<button>Create</button>
<button>
  <i class="material-icons">add</i><span>Create</span>
</button>
<button>
  <span>Send</span><i class="material-icons">send</i>
</button>
<button class="circle" aria-label="Add">
  <i class="material-icons">add</i>
</button>

<a class="button" href="#!">Link</a>
```

### Filled

High emphasis. This is the default — the main action on a page. Container `primary`, label `on-primary`, no elevation. `filled` on a `.btn` is still accepted and does nothing extra.

Create Create Link

```html
<button>Create</button>
<button>
  <i class="material-icons">add</i><span>Create</span>
</button>
<a class="button" href="#!">Link</a>
```

### Tonal

Medium emphasis. Add `tonal`. Container `secondary-container`, label `on-secondary-container`.

Create Create

```html
<button class="tonal">Create</button>
<button class="tonal">
  <i class="material-icons">add</i><span>Create</span>
</button>
```

### Outlined

Medium emphasis, no fill. Add `outlined` (or `border`). Outline is `outline`, label is `primary`.

Create Create

```html
<button class="outlined">Create</button>
```

### Elevated

Medium emphasis with a shadow. Container `surface`, label `primary`, elevation 1 at rest and 2 on hover. Use sparingly so the page does not fill with shadows.

Create Create

```html
<button class="elevated">Create</button>
```

### Text

Low emphasis. Add `text` (or `transparent`, or the older `btn-flat`). No container, label `primary`. Use these inside cards and dialogs so they do not stack shadows.

Create Create

```html
<button class="text">Create</button>
```

### Icon buttons

Add `circle` for a 40dp icon button. The variant helpers still apply: default is filled, `text` is the standard (transparent) icon button, `tonal` and `outlined` match the common-button colors.

```html
<button class="circle" aria-label="Add">
  <i class="material-icons">add</i>
</button>
<button class="circle tonal" aria-label="Add">…</button>
<button class="circle outlined" aria-label="Add">…</button>
<button class="circle text" aria-label="Add">…</button>
```

### Floating

A FAB is `circle extra` or `circle large`: 56dp, 16dp corners, `primary-container`, elevation 3. Add `small` for the 40dp FAB (`circle extra small`). `extend` is the extended FAB — icon plus label at 56dp. On an `<a>`, add `button` — the size classes only match `button` or `a.button`.

Create

```html
<button class="circle extra" aria-label="Add">
  <i class="material-icons">add</i>
</button>
<a class="button circle extra small" href="#!" aria-label="Add">
  <i class="material-icons">add</i>
</a>
<button class="extend">
  <i class="material-icons">add</i><span>Create</span>
</button>
```

### Sizes

`small` is 32dp. Default is 40dp. `large` and `extra` are 56dp.

Small Default Large

```html
<button class="small">Small</button>
<button>Default</button>
<button class="large">Large</button>
```

For a form submit, use a real `<button type="submit">` rather than an input.

Submit

```html
<button type="submit">
  <span>Submit</span><i class="material-icons">send</i>
</button>
```

### Disabled

The `disabled` attribute, or the `disabled` class on a link. Applies to every variant.

Filled Tonal Outlined Text

```html
<button disabled>Filled</button>
<button class="tonal" disabled>Tonal</button>
<a class="button disabled" href="#!">Link</a>
```

---

## Cards

Material Design 3 cards, from the HTML.

An `<article>` is an elevated card. A heading is the headline, a `<p>` is supporting text, a direct `<nav>` is the action row, and `<img>` or `<figure>` is media. There is no `card-content`, `card-title`, `card-action`, `card` or `card-panel` class — the element is the component.

Tokens follow the [M3 card spec](https://m3.material.io/components/cards/specs). The container is `surface` with 12dp corners. Elevated (the default) sits at elevation 1 and rises to 2 on hover. The headline is `title-medium` / `on-surface`; supporting text is `body-medium` / `on-surface-variant`. Inset is 16dp.

### Card title

I am a very simple card. I am good at containing small bits of information. I am convenient because I require little markup to use effectively.

```text
<article>
  <h3>Card title</h3>
  <p>I am a very simple card.</p>
  <nav>
    <button class="text">Action</button>
    <button class="tonal">Action</button>
  </nav>
</article>
```

### Variants

Default is elevated. `filled` uses `surface-variant` at rest (no shadow). `outlined` (or `border`) draws a 1dp `outline-variant` stroke.

### Elevated

The default. Surface, elevation 1.

### Filled

Surface-variant, no elevation.

### Outlined

Surface plus a 1dp outline.

```text
<article>…</article>
<article class="filled">…</article>
<article class="outlined">…</article>
```

### Media

A direct `<img>` is full-bleed across the top. Wrap it in a `<figure>` if you want a caption on the image — `<figcaption>` sits on the media.

I am a very simple card. I am good at containing small bits of information.

```text
<article>
  <figure>
    <img src="images/sample-1.jpg" alt="">
    <figcaption>Card title</figcaption>
  </figure>
  <p>I am a very simple card.</p>
  <nav>
    <button class="text">Action</button>
  </nav>
</article>
```

### FAB on media

Put a `halfway-fab` inside the `<figure>` so it anchors to the image, not the whole card. It pairs with a 56dp FAB — `button circle large halfway-fab`.

I am a very simple card. I am good at containing small bits of information.

```text
<article>
  <figure>
    <img src="images/sample-1.jpg" alt="">
    <figcaption>Card title</figcaption>
    <a class="button circle large halfway-fab" href="#!" aria-label="Add">
      <i class="material-icons">add</i>
    </a>
  </figure>
  <p>I am a very simple card.</p>
</article>
```

### Horizontal

Add `horizontal`. The image takes the start; wrap the headline, text, and actions in a `<div>` so they stack beside it.

### Card title

I am a very simple card. I am good at containing small bits of information.

```text
<article class="horizontal">
  <img src="images/sample.jpg" alt="">
  <div>
    <h3>Card title</h3>
    <p>I am a very simple card.</p>
    <nav>
      <button class="text">Action</button>
    </nav>
  </div>
</article>
```

### Reveal

An `<aside>` (or `.card-reveal`) slides over the card. Mark the control that opens it with `activator` — that class is the JavaScript contract. The first heading inside the aside closes it. `Cards.Init()` (and `AutoInit()` on `.cards`) wires this up; a card with no aside is CSS-only.

### Card titlemore_vert

This is a link

### closeCard title

Here is some more information about this product that is only revealed once clicked on.

```text
<article>
  <figure>
    <img src="images/office.jpg" alt="">
    <div class="activator"></div>
  </figure>
  <h3 class="activator">Card title
    <i class="material-icons right">more_vert</i>
  </h3>
  <p><a href="#">This is a link</a></p>
  <aside>
    <h3>
      <i class="material-icons right">close</i>Card title
    </h3>
    <p>Here is some more information about this product.</p>
  </aside>
</article>
```

Add `sticky` (or the older `sticky-action`) if a trailing `<nav>` should stay visible under the reveal.

### Tabs

Put a `<nav class="tabs">` between the supporting text and the tab panels. `AutoInit()` starts `.tabs`.

I am a very simple card. I am good at containing small bits of information.

```text
<article>
  <p>I am a very simple card.</p>
  <nav class="tabs max">
    <a href="#test1">Test 1</a>
    <a class="active" href="#test2">Test 2</a>
  </nav>
  <div id="test1">Test 1</div>
  <div id="test2">Test 2</div>
</article>
```

### Sizes

`small`, `medium`, and `large` lock the height at 300px, 400px, and 500px so a row of cards lines up. Media takes the top 60%; the action row sticks to the bottom. These sizes are not in the M3 spec — they are optional layout helpers.

### Small

The small card is 300px tall.

```text
<article class="small">…</article>
<article class="medium">…</article>
<article class="large">…</article>
```

### Panel

A card with no slots is just padding on the container. Write that as an `<article>` with only text. Color utilities still apply — pair a fill with its `on-*` text class.

I am a very simple card. I am good at containing small bits of information.

```text
<article class="primary on-primary-text">
  <p>I am a very simple card.</p>
</article>
```

---

## Carousel

A 3D item carousel, or a full-width slider.

A carousel is a row of items you can drag or swipe. The default is a perspective stack: the center item is large, the others recede. Touch and mouse both work.

`AutoInit()` starts every `.carousel` except those marked `no-autoinit`. This is not the Slider on the Media page — that is a separate component on `.slider`.

```html
<div class="carousel">
  <a class="carousel-item" href="#one!">
    <img src="images/sample-1.jpg" alt="Mountain lake">
  </a>
  <a class="carousel-item" href="#two!">
    <img src="images/sample-2.jpg" alt="Forest path">
  </a>
  <a class="carousel-item" href="#three!">
    <img src="images/sample-3.jpg" alt="Rocky coastline">
  </a>
</div>
```

Every child that should move needs `carousel-item`. With no items, `init` logs an error and returns without starting. The track is 400px tall; set `--carousel-height` on the carousel to change it. Default items are half that size.

### Initialization

The IIFE bundle exposes `Expressive.Carousel`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.carousel`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.carousel');
  const instances = Expressive.Carousel.init(elems, {
    // specify options here
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  Carousel: { indicators: true }
});
```

That AutoInit call would apply to every carousel on the page. For a single full-width instance, mark it `no-autoinit` and call `init` yourself.

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `duration` | Number | `200` | Transition duration, in milliseconds. |
| `dist` | Number | `-100` | Perspective zoom. `0` keeps every item the same size. Full-width mode forces this to `0`. |
| `shift` | Number | `0` | Extra spacing on the center item. |
| `padding` | Number | `0` | Padding between items that are not in the center. |
| `numVisible` | Number | `5` | How many items stay visible. Capped at the number of items. |
| `fullWidth` | Boolean | `false` | Turn the carousel into a full-width slider. Pair it with the `flat` class. |
| `indicators` | Boolean | `false` | Show paging dots. Only drawn when there is more than one item. |
| `noWrap` | Boolean | `false` | Stop at the first and last items instead of wrapping. A single-item carousel always behaves as if this were true. |
| `onCycleTo` | Function | `null` | Called when a new item becomes the center. Receives the current item and whether the move was a drag. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Carousel.getInstance(elem);
```

#### .next();

Move to the next item, or skip forward a given number of items.

**Integer (optional):** How many items to advance. Defaults to 1.

```text
instance.next();
instance.next(3);
```

#### .prev();

Move to the previous item, or skip back a given number of items.

**Integer (optional):** How many items to go back. Defaults to 1.

```text
instance.prev();
instance.prev(3);
```

#### .set();

Move to the item at a given index.

**Integer:** 0-based index of the item.

**Function (optional):** A one-shot `onCycleTo` callback for this move.

```text
instance.set(3);
instance.set(3, function(current, dragged) {
  // ran once, after this move
});
```

#### .destroy();

Destroy the plugin instance and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `pressed` | Boolean | Whether the carousel is being clicked or tapped. |
| `dragged` | Boolean | Whether the carousel is currently being dragged. |
| `center` | Number | The index of the center item. |

### Full Width Slider

Add `flat` for the layout, and pass `fullWidth: true` so the plugin drops the perspective zoom and sizes the track to the first image. Mark the element `no-autoinit` so AutoInit does not start it as a 3D carousel.

```html
<div class="carousel flat no-autoinit">
  <a class="carousel-item" href="#one!">
    <img src="images/sample-1.jpg" alt="Mountain lake">
  </a>
  <a class="carousel-item" href="#two!">
    <img src="images/sample-2.jpg" alt="Forest path">
  </a>
</div>
```

```js
Expressive.Carousel.init(document.querySelector('.carousel.flat'), {
  fullWidth: true
});
```

### Content carousel

Items do not have to be images. A `carousel-fixed-item` stays put over the slides — useful for a button that should not move with the content. This demo also turns `indicators` on.

### First Panel

### Second Panel

### Third Panel

### Fourth Panel

```html
<div class="carousel flat center no-autoinit">
  <div class="carousel-fixed-item center">
    <a class="btn">Button</a>
  </div>
  <div class="carousel-item primary on-primary-text p-5">
    <h2>First Panel</h2>
    <p>This is your first panel</p>
  </div>
  <div class="carousel-item secondary on-secondary-text p-5">
    <h2>Second Panel</h2>
    <p>This is your second panel</p>
  </div>
</div>
```

```js
Expressive.Carousel.init(document.querySelector('#carousel-content'), {
  fullWidth: true,
  indicators: true
});
```

Swipeable tabs wrap their panels in a carousel. That is the Tabs plugin, not a carousel you start yourself.

---

## Lists

Continuous, vertical indexes of text and images. Use a list so people can find an item and act on it. There is no JavaScript — the HTML is the component.

The leading visual is the first `<i>`, `<img>`, or `<input>`. The trailing action is the last `<i>`, `<kbd>`, `<button>`, `<time>`, or `.meta`. A following `<p>` is supporting text. Mark the current row with `aria-selected="true"` (or `active`).

Two variants: standard (the default) and `segmented`.

### Standard

Transparent rows. The selected item is a pill in `secondary-container`. The leading icon fills when the row is selected.

```html
<ul class="list">
  <li>
    <i class="material-symbols">star</i>
    List item
    <kbd>⌘C</kbd>
  </li>
  <li aria-selected="true">
    <i class="material-symbols">star</i>
    List item
    <kbd>⌘C</kbd>
  </li>
</ul>
```

### Segmented

Add `segmented`. Every row is a rounded tile; the selected tile uses the same `secondary-container` fill.

```html
<ul class="list segmented">
  <li aria-selected="true">
    <i class="material-symbols">star</i>
    List item
    <kbd>⌘C</kbd>
  </li>
</ul>
```

### Text

A row can be a single line of label text, or a label with supporting text underneath. Either can wrap, or take `truncate` to ellipsis.

```html
<li>Label text only</li>
<li><span class="truncate">A long label…</span></li>
<li>
  Headline
  <p>Supporting text sits under the label.</p>
</li>
```

### Icons

A leading icon is a quick visual cue for the label. A trailing icon is status or an action.

```html
<li>
  <i class="material-symbols">inbox</i>
  Inbox
  <i class="material-symbols">chevron_right</i>
</li>
```

### Links

Wrap the row in an `<a>` or `<label>` to make the whole item the target. `aria-current` on the link, or a checked radio inside the label, paints the selected pill.

```html
<li>
  <a href="/inbox" aria-current="page">
    <i class="material-symbols">inbox</i>
    Inbox
  </a>
</li>
```

---

## Floating Action Button

A circular action that can open a menu of related shortcuts.

If you want a fixed floating action button, you can add multiple actions that appear on hover. The live demo is in the bottom-right corner of the page.

Wrap a 56dp FAB (`circle extra`) and a list of 40dp ones (`circle extra small`) in `fixed-action-btn`. That class pins the control to the corner and styles its direct children. `AutoInit()` starts every matching element except those marked `no-autoinit`.

```html
<div class="fixed-action-btn">
  <button type="button" class="button circle extra" aria-label="Edit">
    <i class="material-symbols">mode_edit</i>
  </button>
  <ul>
    <li><a class="button circle extra small error on-error-text" href="#!" aria-label="Chart"><i class="material-symbols">insert_chart</i></a></li>
    <li><a class="button circle extra small secondary on-secondary-text" href="#!" aria-label="Quote"><i class="material-symbols">format_quote</i></a></li>
    <li><a class="button circle extra small tertiary on-tertiary-text" href="#!" aria-label="Publish"><i class="material-symbols">publish</i></a></li>
    <li><a class="button circle extra small primary on-primary-text" href="#!" aria-label="Attach"><i class="material-symbols">attach_file</i></a></li>
  </ul>
</div>
```

### Initialization

The IIFE bundle exposes `Expressive.FloatingActionButton`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.fixed-action-btn` with the defaults below.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.fixed-action-btn');
  const instances = Expressive.FloatingActionButton.init(elems, {
    // specify options here
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  FloatingActionButton: { direction: 'top' }
});
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `direction` | String | `'top'` | Direction the menu opens. One of `'top'`, `'right'`, `'bottom'`, or `'left'`. The constructor adds the matching `direction-*` class. |
| `hoverEnabled` | Boolean | `true` | When `true`, the menu opens on hover. When `false`, it toggles on click. There is no `click-to-toggle` class — this option is the only switch. |
| `toolbarEnabled` | Boolean | `false` | Expand the FAB into a toolbar on click. See FAB to Toolbar. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.FloatingActionButton.getInstance(elem);
```

#### .open();

Opens the FAB menu.

```text
instance.open();
```

#### .close();

Closes the FAB menu.

```text
instance.close();
```

#### .destroy();

Destroy the plugin instance and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `isOpen` | Boolean | Describes the open/close state of the FAB. |

### Horizontal FAB

Creating a horizontal FAB is easy. Set the `direction` option to `'left'` or `'right'`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.fixed-action-btn');
  const instances = Expressive.FloatingActionButton.init(elems, {
    direction: 'left'
  });
});
```

### Click-only FAB

To disable hover and toggle the menu when the large button is clicked — useful on touch devices — pass `hoverEnabled: false`. Expressive does not read a `click-to-toggle` class; the option is the only way to switch.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.fixed-action-btn');
  const instances = Expressive.FloatingActionButton.init(elems, {
    direction: 'left',
    hoverEnabled: false
  });
});
```

### FAB to Toolbar

`toolbarEnabled: true` is still in the options object and expands the button into a full-width toolbar on click. Add the `toolbar` class yourself — the constructor only adds `direction-*`, not `toolbar`.

Materialize deprecated this pattern in 2.1.0. Prefer a hover or click-only menu unless you specifically need the toolbar transition.

```html
<div class="fixed-action-btn toolbar">
  <button type="button" class="button circle extra" aria-label="Edit">
    <i class="material-symbols">mode_edit</i>
  </button>
  <ul>
    <li class="waves-effect waves-light"><a href="#!"><i class="material-icons">insert_chart</i></a></li>
    <li class="waves-effect waves-light"><a href="#!"><i class="material-icons">format_quote</i></a></li>
    <li class="waves-effect waves-light"><a href="#!"><i class="material-icons">publish</i></a></li>
    <li class="waves-effect waves-light"><a href="#!"><i class="material-icons">attach_file</i></a></li>
  </ul>
</div>
```

```js
Expressive.FloatingActionButton.init(
  document.querySelector('.fixed-action-btn.toolbar'),
  { toolbarEnabled: true }
);
```

---

## Footer

Site navigation and extra information at the end of a page.

Footers are a good place for site navigation and extra information. This is where people look after they finish the page, or when they want more about the site.

Put the page in the three HTML5 landmarks `header`, `main`, and `footer`. Anatomy is the HTML: a bare `<footer>` is the component, each `<nav>` is a column of links with an `<h2>` heading, and a trailing `<small>` is the copyright bar. There is no `page-footer` or `footer-copyright` class, and no JavaScript component.

Expressive’s footer is unfilled by default. It draws a dashed top border and uses the theme tokens for paragraph and link color — not a solid primary bar.

#### Footer Content

You can use rows and columns here to organize your footer content.

#### Links

- Link 1
- Link 2
- Link 3
- Link 4

```html
<footer>
  <nav>
    <h2>Product</h2>
    <p>You can use navs here to organize your footer content.</p>
  </nav>
  <nav>
    <h2>Links</h2>
    <a href="#!">Link 1</a>
    <a href="#!">Link 2</a>
  </nav>
  <small>
    <span>&copy; 2026 Copyright Text</span>
    <a href="#!">More Links</a>
  </small>
</footer>
```

The `<small>` bar is a flex row with space-between, so put the notice and the trailing link in as two children. A `right` float is not required.

### Sticky Footer

A sticky footer stays at the bottom of the viewport when the page is short, and is pushed down when the content is taller. That is different from a fixed footer. Expressive does not include these rules — add them to your own stylesheet after you have the `header` / `main` / `footer` landmarks.

```text
body {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

main {
  flex: 1 0 auto;
}
```

---

## Icons

Google Material Icons and Material Symbols, sized with a few helper classes.

Expressive uses Google’s Material Icons and every Material Symbols set — outlined, rounded, and sharp. The class names are Google’s. Expressive does not rename them, because the font stylesheet you load is what defines them.

Google publishes a [searchable Material Icons list](https://fonts.google.com/icons?icon.set=Material+Icons) and a [Material Symbols list](https://fonts.google.com/icons?icon.set=Material+Symbols). Those catalogs are the source for ligature names. You can also download the fonts from the [Material Icons guide](https://developers.google.com/fonts/docs/material_icons).

The Expressive stylesheet does not ship the font files. Include one or more of these lines in `<head>`:

```text
<!-- Material Icons -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<!-- Material Symbols — Outlined -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
<!-- Material Symbols — Rounded -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet">
<!-- Material Symbols — Sharp -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp" rel="stylesheet">
```

Put the matching class on an element and use the ligature as the text content.

Icons

Outlined

Rounded

Sharp

```text
<i class="material-icons">add</i>
<i class="material-symbols-outlined">add</i>
<i class="material-symbols-rounded">add</i>
<i class="material-symbols-sharp">add</i>
```

Icons inherit the current text color, so token utilities such as `primary-text` work. For icons inside buttons, see Buttons.

### Icon Sizes

Size an icon with `font-size`, or use the preset classes on the `<i>`: `tiny` (1rem), `small` (2rem), `medium` (4rem), and `large` (6rem).

### Symbol Sizes

The same size classes apply to Material Symbols.

```text
<!-- Sizes: tiny 1rem, small 2rem, medium 4rem, large 6rem -->
<i class="large material-icons">insert_chart</i>
<i class="large material-symbols-outlined">insert_chart</i>
<i class="large material-symbols-rounded">insert_chart</i>
<i class="large material-symbols-sharp">insert_chart</i>
```

---

## Navbar

Material Design 3 top app bars, from the HTML.

The bar is the markup. A `<header>` whose child is a `<nav>` is a top app bar. The heading is the headline. Icon-only links and buttons are the leading and trailing actions. A `<menu>` (or `<ul>`) holds text destinations. There is no `navbar`, `nav-wrapper`, or `brand-logo` class.

Tokens follow the [M3 app bar spec](https://m3.material.io/components/app-bars/specs). The container is `surface` at rest, the headline is `on-surface` at `title-large`, and icons are 24dp in a 48dp target, inset 4dp. Icons inherit the header color so a fill + `on-*` pair stays readable. The small bar is 64dp tall. Pair a fill utility with its `on-*` text class if you want a colored bar.

The bar is CSS-only. Menus and the sidenav are separate components that `AutoInit()` starts. A `sidenav-trigger` inside the bar is still required — that class is the Sidenav contract, not bar chrome. Tabs live in their own bar — do not nest `.tabs` in the header.

### Small

Default. Leading icon, headline, trailing actions. DOM order is the layout — the headline grows, so anything after it sits on the end.

```text
<header>
  <nav>
    <button type="button" aria-label="Menu">
      <i class="material-icons">menu</i>
    </button>
    <h2>Title</h2>
    <a href="#!" aria-label="Search"><i class="material-icons">search</i></a>
    <a href="#!" aria-label="More"><i class="material-icons">more_vert</i></a>
  </nav>
</header>
```

### Destinations

Text links go in a `<menu>`. Put the menu after the heading to align it on the end; put it first to align it on the start. Hide it below the large breakpoint and pair it with a sidenav trigger when the bar has to collapse.

```text
<header>
  <nav>
    <h2>Title</h2>
    <menu>
      <li><a href="#!">Sass</a></li>
      <li><a href="#!">Components</a></li>
      <li><a class="active" href="#!">JavaScript</a></li>
    </menu>
  </nav>
</header>
```

`active` goes on the link, not the list item. The state layer mixes `currentColor` at 8% hover and 10% active, so it follows the theme and any fill you put on the header.

### Center-aligned

Add `center` to the header. The headline is taken out of flow so the leading and trailing actions can sit on the edges without shifting it. Keep the title short enough that it does not run under the icons.

```text
<header class="center">
  <nav>
    <button type="button" aria-label="Back">
      <i class="material-icons">arrow_back</i>
    </button>
    <h2>Title</h2>
    <a href="#!" aria-label="More"><i class="material-icons">more_vert</i></a>
  </nav>
</header>
```

### Medium and large

Same markup as the small bar. `medium` is 112dp with a `headline-small` title on the second row. `large` is 152dp with `headline-medium`. The title is `order`ed onto the bottom row so the first row can hold the leading icon on the start and the trailing icons on the end.

```text
<header class="medium">
  <nav>
    <button type="button" aria-label="Back">
      <i class="material-icons">arrow_back</i>
    </button>
    <h2>Medium title</h2>
    <a href="#!" aria-label="More"><i class="material-icons">more_vert</i></a>
  </nav>
</header>

<header class="large">…</header>
```

### Fixed

Add `fixed` to pin a top bar with `position: sticky`. No wrapper is required. At rest the bar is `surface`, the same as the page. Once content scrolls under it, supporting browsers fill it with `surface-container` via `animation-timeline: scroll()` so it separates from the body — that is the M3 Expressive treatment, not a shadow. Without that API the bar stays at rest.

The documentation header on this site is a fixed small bar. A second fixed bar on this page would sit on top of it, so the live example is the site header itself.

```text
<header class="fixed">
  <nav>
    <h2>Title</h2>
    <a href="#!" aria-label="Search"><i class="material-icons">search</i></a>
  </nav>
</header>
```

### Color

The default fill is `surface`. Color utilities win because they live in the utilities layer — put `primary on-primary-text` (or any fill + `on-*` pair) on the header. Icons inherit the header color. Set `--md-comp-top-app-bar-leading-icon-color` to `var(--md-sys-color-on-surface-variant)` if you want the spec’s muted trailing icons.

```text
<header class="primary on-primary-text">
  <nav>
    <h2>Primary</h2>
  </nav>
</header>
```

Component tokens you can set on the header (or on `:root`):

| Token | Default |
| --- | --- |
| `--md-comp-top-app-bar-container-color` | `--md-sys-color-surface` |
| `--md-comp-top-app-bar-scrolled-container-color` | `--md-sys-color-surface-container` |
| `--md-comp-top-app-bar-headline-color` | `--md-sys-color-on-surface` |
| `--md-comp-top-app-bar-leading-icon-color` | `inherit` (spec: `on-surface-variant`) |
| `--md-comp-top-app-bar-trailing-icon-color` | `inherit` (spec: `on-surface-variant`) |
| `--md-comp-top-app-bar-container-height` | 64px |
| `--md-comp-top-app-bar-leading-icon-size` | 24px |

### Menu

Point a `menu-trigger` at a `<menu>` whose `id` matches `data-target`. `AutoInit()` starts every `.menu-trigger`.

```text
<menu id="menu1">
  <li><a href="#!">one</a></li>
  <li><a href="#!">two</a></li>
  <hr>
  <li><a href="#!">three</a></li>
</menu>
<header>
  <nav>
    <h2>Title</h2>
    <menu>
      <li>
        <a class="menu-trigger" href="#!" data-target="menu1">
          Menu<i class="material-icons right">arrow_drop_down</i>
        </a>
      </li>
    </menu>
  </nav>
</header>
```

To initialize the menu yourself:

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.menu-trigger');
  Expressive.Menu.init(elems);
});
```

Menus open on click by default (`hover: false`). Pass `{ hover: true }` to open on hover instead.

### Search

A `<form>` in the nav fills the space between the leading action and anything after it. The input is unstyled against the bar — no extra field class.

```text
<header>
  <nav>
    <button type="button" aria-label="Back">
      <i class="material-icons">arrow_back</i>
    </button>
    <form role="search">
      <input type="search" placeholder="Search" aria-label="Search">
    </form>
  </nav>
</header>
```

### Mobile collapse

Hide the destination menu below the large breakpoint and put a `sidenav-trigger` in the leading slot. The trigger stays visible at every size — it is the page-navigation control, not collapse chrome. Pair it with a `sidenav` whose id matches `data-target`. The sidenav element itself must not be a child of the `<nav>`.

```text
<header>
  <nav>
    <a href="#!" data-target="mobile-demo" class="sidenav-trigger" aria-label="Open menu">
      <i class="material-icons">menu</i>
    </a>
    <h2>Title</h2>
    <menu class="hide-on-med-and-down">
      <li><a href="#!">Sass</a></li>
      <li><a href="#!">Components</a></li>
    </menu>
  </nav>
</header>

<ul class="sidenav" id="mobile-demo">
  <li><a href="#!">Sass</a></li>
</ul>
```

After you add the trigger and the sidenav, initialize Sidenav (or let `AutoInit()` do it).

```js
document.addEventListener('DOMContentLoaded', function() {
  Expressive.Sidenav.init(document.querySelectorAll('.sidenav'));
});
```

---

## Navigation bar

Switch between UI views on compact and medium screens. A `nav.navigation-bar` holds 3–5 destinations of equal importance. Destinations do not change from screen to screen. There is no JavaScript — mark the current view with `aria-current="page"` (or `active`).

This is not the app bar. The app bar names the current page and holds 1–2 actions. Use a navigation bar in compact windows; a navigation rail covers mid-size screens and a sidenav the rest.

### Stacked

Default. Icon above the label. The selected destination puts a pill behind the icon and fills the glyph.

```html
<nav class="navigation-bar" aria-label="Main">
  <a href="/" aria-current="page">
    <i class="material-symbols">home</i>
    Home
  </a>
  <a href="/browse">
    <i class="material-symbols">explore</i>
    Browse
  </a>
  <a href="/radio">
    <i class="material-symbols">radio</i>
    Radio
  </a>
  <a href="/library">
    <i class="material-symbols">library_music</i>
    Library
  </a>
</nav>
```

### Horizontal

Add `horizontal`. Icon and label sit on one row, and the selected pill wraps both. Use this in medium windows.

```html
<nav class="navigation-bar horizontal" aria-label="Main">
  <a href="/" aria-current="page">
    <i class="material-symbols">home</i>
    Home
  </a>
  …
</nav>
```

### Fixed

Add `fixed` to stick the bar to the bottom of the viewport. Padding includes `safe-area-inset-bottom`.

```html
<nav class="navigation-bar fixed" aria-label="Main">…</nav>
```

---

## Navigation rail

Switch between UI views on mid-sized devices. A `nav.navigation-rail` holds 3–7 destinations plus an optional FAB. Put it in the same place on every screen.

Collapsed is 96dp with the icon above the label. Add `expanded` for 220–360dp, icon and label on one row, and an extended FAB. The menu button toggles that class (`AutoInit()` starts it). On compact windows an expanded rail is modal — a scrim, and Escape or a scrim tap collapses it. Add `modal` to keep that overlay at every breakpoint.

```html
<nav class="navigation-rail" aria-label="Main">
  <button type="button" aria-label="Menu">
    <i class="material-symbols">menu</i>
  </button>
  <a class="button extra" href="#!">
    <i class="material-symbols">edit</i>
    <span>Label</span>
  </a>
  <a href="/" aria-current="page">
    <i class="material-symbols">star</i>
    Label
  </a>
  <a href="/two">
    <i class="material-symbols">star<span class="badge">3</span></i>
    Label
  </a>
</nav>
```

```html
<nav class="navigation-rail expanded" aria-label="Main">…</nav>
<nav class="navigation-rail expanded modal" aria-label="Main">…</nav>
```

Offset the rest of the page:

```css
@media (width >= 601px) {
  body {
    padding-left: var(--md-comp-nav-rail-collapsed-width);
  }
  body:has(.navigation-rail.expanded) {
    padding-left: var(--md-comp-nav-rail-expanded-width);
  }
}
```

---

## Pagination

Split long content into shorter, easier blocks.

Add pagination links to split long content into shorter blocks. The component is CSS-only: a `pagination` list of links. There is no JavaScript plugin.

Mark the current page with `active` on the `li` — that fills the link. Use `disabled` for unavailable prev/next. `waves-effect` is optional and adds the ink ripple on the item.

```html
<ul class="pagination">
  <li class="disabled">
    <a href="#!"><i class="material-icons">chevron_left</i></a>
  </li>
  <li class="active"><a href="#!">1</a></li>
  <li class="waves-effect"><a href="#!">2</a></li>
  <li class="waves-effect"><a href="#!">3</a></li>
  <li class="waves-effect"><a href="#!">4</a></li>
  <li class="waves-effect"><a href="#!">5</a></li>
  <li class="waves-effect">
    <a href="#!"><i class="material-icons">chevron_right</i></a>
  </li>
</ul>
```

### Responsive

On medium and down, wrap the page numbers in `li.pages` and mark the ends `prev` and `next`. The ends take 10% each; the pages take the remaining 80% and clip overflow so a long run of numbers does not wrap. On large screens the basic flat list is enough — the nested `pages` list is a block, so `next` would drop to the next line.

```html
<ul class="pagination">
  <li class="disabled prev">
    <a href="#!"><i class="material-icons">chevron_left</i></a>
  </li>
  <li class="pages">
    <ul>
      <li class="active"><a href="#!">1</a></li>
      <li class="waves-effect"><a href="#!">2</a></li>
      <li class="waves-effect"><a href="#!">3</a></li>
    </ul>
  </li>
  <li class="waves-effect next">
    <a href="#!"><i class="material-icons">chevron_right</i></a>
  </li>
</ul>
```

---

## Panes

Material 3 canonical layouts — list-detail, supporting pane, and equal panes.

Panes are CSS-only. A container (`panes`, or one of the named aliases `list-detail`, `supporting-pane-layout`, `pane-layout`) holds two or three `pane` children. Below 840px only one pane shows at a time; at 840px and up the panes sit side by side. The container is also a `container-type: inline-size` query container, so a pane layout nested inside a narrow column collapses on its own width, not the viewport's.

Any of `pane`, `list-pane`, `primary-pane`, `detail-pane`, and `supporting-pane` counts as a pane child — the specific names are for readability.

### List-detail

`list-detail` gives a 360px list pane and a flexible detail pane.

```html
<div class="panes list-detail">
  <div class="list-pane">
    <header>
      <h2>Inbox</h2>
    </header>
    <ul class="list">
      <li><a href="#!">Brunch this weekend?</a></li>
      <li><a href="#!">Design review</a></li>
    </ul>
  </div>
  <div class="detail-pane">
    <header>
      <button><i class="material-icons">arrow_back</i></button>
      <h2>Brunch this weekend?</h2>
    </header>
    <main>
      <p>Detail content.</p>
    </main>
  </div>
</div>
```

### Compact

Below 840px the container shows one pane. The first pane wins by default; add `active` to the pane you want instead, and move that class to switch panes. Above 840px `active` is ignored and every pane shows.

```html
<div class="panes list-detail">
  <div class="list-pane">…</div>
  <div class="detail-pane active">…</div>
</div>
```

### Supporting pane

`supporting` (or `supporting-pane-layout`) puts a flexible primary pane first and a 360px supporting pane after it. Add `start` (or `left`) to lead with the supporting pane instead.

```html
<div class="panes supporting">
  <div class="primary-pane">…</div>
  <div class="supporting-pane">…</div>
</div>
```

### Equal

`equal` splits the container `1fr 1fr`.

```html
<div class="panes equal">
  <div class="pane">…</div>
  <div class="pane">…</div>
</div>
```

### Three-pane

`three-pane` is list + primary + supporting. It stays two-up until 1200px, then expands to three columns.

```html
<div class="panes three-pane">
  <div class="list-pane">…</div>
  <div class="primary-pane">…</div>
  <div class="supporting-pane">…</div>
</div>
```

### Appearance

The default is coplanar: full-bleed surfaces with a 1px `outline-variant` divider between them. `separated` (alias `floating`) instead gives each pane a 16px rounded `surface-container-low` card with a 24px gap. Inside a separated layout, a pane can take `elevated` for a shadow or `outlined` for a `surface` fill with a border.

```html
<div class="panes list-detail separated">
  <div class="list-pane outlined">…</div>
  <div class="detail-pane elevated">…</div>
</div>
```

### Pane anatomy

A pane is a column. A direct `header` (or `pane-header`) is a 64px title bar — its heading takes Title Large and truncates, and an icon-only `button` in it becomes a 48px round icon button. A direct `main`, `div`, `pane-content`, `pane-body`, or `list` is the scrolling body. A direct `footer`, `pane-footer`, or trailing `nav` is a 56px action bar with a top divider.

```html
<div class="pane">
  <header>
    <button><i class="material-icons">arrow_back</i></button>
    <h2>Title</h2>
    <button><i class="material-icons">more_vert</i></button>
  </header>
  <main>
    <p>Scrolling content.</p>
  </main>
  <footer>
    <button class="button">Save</button>
  </footer>
</div>
```

### Tokens

Set these on the container to resize a layout.

| Name | Default | Description |
| --- | --- | --- |
| `--md-comp-pane-gap` | `24px` | Gap and padding in the separated appearance. |
| `--md-comp-pane-divider-color` | `outline-variant` | Coplanar divider and `outlined` pane border. |
| `--md-comp-pane-container-color` | `surface` | Container fill. |
| `--md-comp-pane-container-shape` | `0px` (`16px` when separated) | Pane corner radius. |
| `--md-comp-pane-list-width` | `360px` | List pane width at 840px and up. |
| `--md-comp-pane-supporting-width` | `360px` | Supporting pane width at 840px and up. |
| `--md-comp-pane-primary-min-width` | `360px` | Minimum width for the primary pane. |

---

## Parallax

A background image that moves slower than the page.

### Initialization

The IIFE bundle exposes `Expressive.Parallax`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.parallax`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.parallax');
  const instances = Expressive.Parallax.init(elems, {
    // specify options here
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  Parallax: { responsiveThreshold: 992 }
});
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `responsiveThreshold` | Number | `0` | Minimum viewport width, in pixels, at which the image starts moving. Below this width the transform is cleared. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Parallax.getInstance(elem);
```

#### .destroy();

Destroy the plugin instance, clear the image transform, and tear down its event handlers. The last remaining instance also removes the shared scroll and resize listeners.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |

### Customization

The container height is how much of the image you see. The framework default is 500px. Override it on the container.

```css
.parallax-container {
  height: 300px;
}
```

---

## Preloader

Activity and progress indicators for content that takes time to load.

If content will take a while to load, give the user feedback. Expressive ships linear progress bars and circular spinners. Both are CSS-only — there is no JavaScript plugin.

### Linear

There are two linear bars: determinate and indeterminate.

#### Determinate

A native `<progress class="progress">` is the simplest form. The `.progress` +
`.determinate` pair still works, and `--md-comp-progress-value` sets the fill
without inline widths. The bar uses the primary token on a `secondary-container`
track.

```html
<progress class="progress" value="70" max="100"></progress>

<div class="progress">
  <div class="determinate" style="width: 70%"></div>
</div>

<div class="progress" style="--md-comp-progress-value: 70%"></div>
```

#### Indeterminate

Use a valueless `<progress>`, or `.indeterminate`, when you cannot report a
percentage.

```html
<progress class="progress"></progress>

<div class="progress">
  <div class="indeterminate"></div>
</div>
```

### Circular

A circular indicator is a single `<span class="preloader">`. There is no wrapper,
no layers and no clippers — the whole spinner is one element. The default is
40dp; add `small` (24dp) or `big` (64dp).

```html
<span class="preloader" role="status" aria-label="Loading"></span>
<span class="preloader small" role="status" aria-label="Loading"></span>
<span class="preloader big" role="status" aria-label="Loading"></span>
```

#### Determinate

Add `determinate` and set the progress with `--md-comp-progress-value`. Report
the value to assistive technology with the `progressbar` role.

```html
<span class="preloader determinate"
      style="--md-comp-progress-value: 70%"
      role="progressbar" aria-valuenow="70"
      aria-valuemin="0" aria-valuemax="100"
      aria-label="Loading"></span>
```

#### Color

The indicator follows `--md-comp-progress-indicator`, so it themes with the rest
of the page. Override it for a one-off color — a role token, never a raw hex.

```html
<span class="preloader"
      style="--md-comp-progress-indicator: var(--md-sys-color-error)"
      role="status" aria-label="Loading"></span>
```


---

# JavaScript components

## Auto Init

Initialize every registered component with one function call.

Auto Init starts all of the registered Expressive components with a single call. The IIFE bundle exposes it as `Expressive.AutoInit`.

Importing the JavaScript installs a few document-level behaviors (Forms, Waves, Range, Chips, and Cards), but it does **not** call `AutoInit()` for you. Call it after the DOM is ready. This documentation site does that in `docs.js` on `DOMContentLoaded`.

### Initialization

```js
document.addEventListener('DOMContentLoaded', function() {
  Expressive.AutoInit();
});
```

Or pass a root element and per-component options. The option keys are the component names from the table below.

```js
Expressive.AutoInit(document.body, {
  Menu: {
    // pass options for Menu here
  },
  FloatingActionButton: {
    // pass options for FloatingActionButton here
  }
});
```

From the module build:

```js
import { AutoInit, Tooltip } from './js/expressive.mjs';

AutoInit();

const element = document.querySelector('.custom-tooltip');
Tooltip.init(element, { position: 'top' });
```

### Options

`AutoInit(context, options)` takes two arguments:

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `context` | Element | `document.body` | DOM element to search within for components. |
| `options` | Object | `{}` | Options for each component, keyed by name. See that component’s page for its own options. |

Calling `AutoInit()` again on the same elements is safe: each component’s constructor destroys any existing instance on that element before creating a new one.

### Components

These are the components `AutoInit()` starts, and the selector each one claims. Elements that also have `no-autoinit` are skipped.

| Name | Selector |
| --- | --- |
| `Autocomplete` | `.autocomplete` |
| `Cards` | `article:has(> aside)` |
| `Carousel` | `.carousel` |
| `Chips` | `.chips` |
| `Datepicker` | `.datepicker` |
| `Menu` | `.menu-trigger` |
| `Lightbox` | `.lightboxed` |
| `NavigationRail` | `.navigation-rail` |
| `Parallax` | `.parallax` |
| `ScrollSpy` | `.scrollspy` |
| `FormSelect` | `select` |
| `Sidenav` | `.sidenav` |
| `Tabs` | `.tabs` |
| `Timepicker` | `.timepicker` |
| `Tooltip` | `.tooltipped` |
| `FloatingActionButton` | `.fixed-action-btn` |

Snackbar, CharacterCounter, and Range stay out of this table. Range still starts itself when the bundle loads. Forms, Waves, Chips, and Cards also run an import-time `Init()`; Chips and Cards appear in the table as well so a later `AutoInit()` can pick up elements added after load.

### Ignoring Elements

If you want `AutoInit()` to skip an element, add the class `no-autoinit`. Initialize that element yourself with the component’s `init` method when you need options other than the defaults.

```html
<a class="button tooltipped no-autoinit" data-tooltip="Hi">Hover</a>
```

```js
Expressive.Tooltip.init(
  document.querySelector('.tooltipped.no-autoinit'),
  { position: 'top' }
);
```

---

## Menu

Material Design 3 menus, from the HTML.

A `<menu>` is the surface. Each `<li>` is an item. A leading `<i>` is the leading icon; a trailing `<i>` or `<kbd>` is trailing content. An `<hr>` is a divider; a `.gap` splits groups; a `.label` is a heading. A nested `<menu>` is a flyout. The trigger’s `data-target` must match the menu’s `id`. `.menu-trigger` is the JavaScript contract.

This is the M3 Expressive vertical menu. Tokens follow the [M3 menu spec](https://m3.material.io/components/menus/specs). The container is `surface-container`, 16dp corners, elevation 2, 4dp padding, 112–280dp wide. Items are 48dp with extra-small (4dp) corners, `label-large` / `on-surface`. Icons are 20dp `on-surface-variant`. Selected items use medium (12dp) corners and `tertiary-container` / `on-tertiary-container`. Hover is an 8% state layer that does not span the container. Dividers are inset. Add `.vibrant` for the tertiary mapping. Submenus fade and scale in; the open flyout rounds up and the parent rounds down.

`AutoInit()` starts every `.menu-trigger` except those marked `no-autoinit`. Menus open on click, below the trigger. Pass `coverTrigger: true` to cover the trigger. Pass `constrainWidth: false` so the menu sizes independently of the trigger.

Drop me

```html
<button class="menu-trigger" data-target="menu1">Drop me</button>
<menu id="menu1">
  <li><a href="#!">One</a></li>
  <li><a href="#!">Two</a></li>
  <hr>
  <li><a href="#!">Three</a></li>
  <li>
    <a href="#!">
      <i class="material-icons">cloud</i>
      <span>Five</span>
    </a>
  </li>
</menu>
```

For a menu inside a top app bar, see Navbar menu.

### Initialization

The IIFE bundle exposes `Expressive.Menu`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.menu-trigger`.

```js
document.addEventListener('DOMContentLoaded', function() {
  Expressive.Menu.init(document.querySelectorAll('.menu-trigger'), {
    coverTrigger: false
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  Menu: { constrainWidth: false, coverTrigger: false }
});
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `alignment` | String | `'left'` | Edge the menu is aligned to. `'left'` or `'right'`. |
| `autoFocus` | Boolean | `true` | If true, automatically focus the menu for keyboard navigation. This option is named `autoFocus`, not `autoTrigger`. |
| `constrainWidth` | Boolean | `true` | If true, the menu is as wide as the trigger. M3 menus are independently sized — pass `false` for that. |
| `container` | Element | `null` | Element that will contain the menu. When omitted, the menu is moved next to the trigger. |
| `coverTrigger` | Boolean | `false` | If false, the menu opens below the trigger (the M3 placement). Pass `true` to cover the trigger. |
| `closeOnClick` | Boolean | `true` | If true, close the menu when an item is clicked. |
| `hover` | Boolean | `false` | If true, the menu opens on hover instead of click. |
| `inDuration` | Number | `150` | Enter transition duration, in milliseconds. |
| `outDuration` | Number | `250` | Exit transition duration, in milliseconds. |
| `onOpenStart` | Function | `null` | Called when the menu starts opening. |
| `onOpenEnd` | Function | `null` | Called when the menu finishes opening. |
| `onCloseStart` | Function | `null` | Called when the menu starts closing. |
| `onCloseEnd` | Function | `null` | Called when the menu finishes closing. |
| `onItemClick` | Function | `null` | Called when an item is clicked. Receives the `li`. |

#### Examples

These two menus set `constrainWidth: false` so the list can be wider than the button, and use `alignment` to pick an edge.

Left Right

```js
Expressive.Menu.init(document.querySelector('#left'), {
  alignment: 'left',
  constrainWidth: false,
  coverTrigger: false
});
```

Hover is off by default. Pass `hover: true` to open on mouse enter instead of click.

Hover me

```js
Expressive.Menu.init(document.querySelector('#hover'), {
  hover: true,
  constrainWidth: false,
  coverTrigger: false
});
```

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Menu.getInstance(elem);
```

#### .open()

Open the menu.

```text
instance.open();
```

#### .close()

Close the menu.

```text
instance.close();
```

#### .recalculateDimensions()

While the menu is open, recalculate its dimensions if its contents have changed.

```text
instance.recalculateDimensions();
```

#### .destroy()

Destroy the plugin instance and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The trigger the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `id` | String | ID of the menu element. |
| `menuEl` | Element | The menu element. |
| `isOpen` | Boolean | Whether the menu is open. |
| `isScrollable` | Boolean | Whether the menu content is scrollable. |
| `focusedIndex` | Number | Index of the focused item. |

---

## Media

Lightbox and Slider for large images and slideshows.

Media components handle large objects such as images. For responsive images and videos without JavaScript, see Media Styles.

### Lightbox

Lightbox is Expressive’s material-style enlarge-on-click image. Click an image with `lightboxed` and it centers and grows. Click it again, scroll, or press Escape to dismiss. `AutoInit()` starts every `.lightboxed` image except those marked `no-autoinit`.

```html
<img class="lightboxed" width="650" alt="A mountain lake" src="images/sample-1.jpg">
```

#### Initialization

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.lightboxed');
  const instances = Expressive.Lightbox.init(elems, {
    // specify options here
  });
});
```

#### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `inDuration` | Number | `275` | Open transition duration, in milliseconds. |
| `outDuration` | Number | `200` | Close transition duration, in milliseconds. |
| `onOpenStart` | Function | `null` | Called before the lightbox opens. |
| `onOpenEnd` | Function | `null` | Called after the lightbox opens. |
| `onCloseStart` | Function | `null` | Called before the lightbox closes. |
| `onCloseEnd` | Function | `null` | Called after the lightbox closes. |

#### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Lightbox.getInstance(elem);
```

#### .open();

Open the lightbox.

```text
instance.open();
```

#### .close();

Close the lightbox.

```text
instance.close();
```

#### .destroy();

Destroy the plugin instance and tear down its event handlers.

```text
instance.destroy();
```

#### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `overlayActive` | Boolean | Whether the lightbox overlay is showing. |
| `doneAnimating` | Boolean | Whether the open or close animation has finished. |
| `caption` | String | Caption text, if specified. |
| `originalWidth` | Number | Original width of the image. |
| `originalHeight` | Number | Original height of the image. |

#### Captions

Add a short caption with the `data-caption` attribute.

```html
<img class="lightboxed"
     data-caption="A path through trees in a park"
     width="250"
     alt="A path through trees"
     src="images/sample-2.jpg">
```

### Slider

The slider is an image slideshow. Captions transition on their own according to `center-align`, `left-align`, or `right-align`. Indicators appear along the bottom.

Slider is **not** in `AutoInit()`. Call `Expressive.Slider.init` yourself after the page loads. For a 3D item carousel or a full-width image track, see Carousel.

```html
<div class="slider">
  <ul class="slides">
    <li>
      <img src="images/sample-1.jpg" alt="First slide">
      <div class="caption center-align">
        <h3>This is our big Tagline!</h3>
        <h5 class="light">Here's our small slogan.</h5>
      </div>
    </li>
    <li>
      <img src="images/sample-2.jpg" alt="Second slide">
      <div class="caption left-align">
        <h3>Left Aligned Caption</h3>
        <h5 class="light">Here's our small slogan.</h5>
      </div>
    </li>
    <li>
      <img src="images/sample-3.jpg" alt="Third slide">
      <div class="caption right-align">
        <h3>Right Aligned Caption</h3>
        <h5 class="light">Here's our small slogan.</h5>
      </div>
    </li>
  </ul>
</div>
```

#### Initialization

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.slider');
  const instances = Expressive.Slider.init(elems, {
    // specify options here
    indicatorLabelFunc: (idx, current) => {
      let label = 'Go to slide ' + idx;
      if (current) {
        label = label + ' (Current)';
      }
      return label;
    }
  });
});
```

#### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `indicators` | Boolean | `true` | Set to `false` to hide slide indicators. |
| `height` | Number | `400` | Height of the slider, in pixels. |
| `duration` | Number | `500` | Transition animation duration, in milliseconds. |
| `interval` | Number | `6000` | Time between transitions, in milliseconds. |
| `pauseOnFocus` | Boolean | `true` | Pause autoslide when the slider receives keyboard focus. |
| `pauseOnHover` | Boolean | `true` | Pause autoslide when a pointer hovers the slider. |
| `indicatorLabelFunc` | Function | `null` | Builds the ARIA label for each indicator. Receives the 1-based index and a boolean that is true for the current slide. If omitted, the label is the index. |

#### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Slider.getInstance(elem);
```

#### .pause();

Pause slider autoslide.

```text
instance.pause();
```

#### .start();

Start slider autoslide.

```text
instance.start();
```

#### .next();

Move to the next slide.

```text
instance.next();
```

#### .prev();

Move to the previous slide.

```text
instance.prev();
```

#### .set();

Move to a specific slide by 0-based index. Values wrap around the ends.

```text
instance.set(2);
```

#### .destroy();

Destroy the plugin instance and tear down its event handlers.

```text
instance.destroy();
```

#### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `activeIndex` | Number | Index of the current slide. |
| `eventPause` | Boolean | Whether the slider is paused by a focus or hover event. |

#### Fullscreen Slider

Add `fullscreen` to the slider so it fills its positioned ancestor (typically the viewport if that ancestor is the page). There is no separate demo page — the class is `fullscreen` on `.slider`.

```html
<div class="slider fullscreen">
  <ul class="slides">...</ul>
</div>
```

---

## Dialogs

Material Design 3 dialogs, from the HTML.

A `<dialog>` is a basic dialog. A heading is the headline, a `<p>` (or a wrapping `<div>`) is supporting text, and the last child `<form method="dialog">` or `<nav>` is the action row. `dialog.max` is the full-screen variant. There are no `.modal`, `modal-header`, `modal-content`, or `modal-footer` classes — the element is the component.

Tokens follow the [M3 dialog spec](https://m3.material.io/components/dialogs/specs). The container is `surface`, 28dp corners, 280–560dp wide, elevation 3. The headline is `headline-small` / `on-surface`; supporting text is `body-medium`. The scrim is 32% `scrim`. Actions sit at the end with an 8dp gap.

Open it with `showModal()` and close it with `close()` — the Dialog API, not a plugin. There is no `Modal` export and nothing for `AutoInit()` to start; `Dialogs.Init()` runs at import time and only adds light-dismiss.

Show Show with icon Show with long content

### Use location services?

Let the app use your location to suggest nearby stops and live arrival times.

### Use location services?

Let the app use your location to suggest nearby stops and live arrival times.

### Terms of service

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

```html
<button type="button" onclick="document.getElementById('dialog1').showModal()">
  Show
</button>

<dialog id="dialog1">
  <h2>Use location services?</h2>
  <p>Let the app use your location to suggest nearby stops.</p>
  <form method="dialog">
    <button type="submit" class="text" value="disagree">Disagree</button>
    <button type="submit" value="agree">Agree</button>
  </form>
</dialog>
```

A `<form method="dialog">` closes the dialog when a submit button is pressed and sets `dialog.returnValue` from the button’s `value`. An optional leading `<i>` is the M3 dialog icon.

### Methods

Call these on the `<dialog>` element. See [HTMLDialogElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement) for the full API.

#### .showModal()

Open as a modal, with the scrim.

```text
dialog.showModal();
```

#### .close()

Close the dialog.

```text
dialog.close();
```

Clicking the scrim does not close it — that is how the Dialog API works. Call `close()` yourself if you want that, or put a cancel action in the form.

### Tokens

Override these on the `<dialog>` if you need a different surface or width.

| Token | Default |
| --- | --- |
| `--md-comp-basic-dialog-container-color` | `--md-sys-color-surface` |
| `--md-comp-basic-dialog-container-shape` | 28px |
| `--md-comp-basic-dialog-container-min-width` | 280px |
| `--md-comp-basic-dialog-container-max-width` | 560px |

### Bottom sheet

A `dialog.bottom-sheet` (or `.bottom`) is secondary content anchored to the bottom. Use it on compact and medium windows. `showModal()` is the modal variant (scrim). `show()` is the standard variant (no scrim). Same sheet either way: `surface-container-low`, 28dp top corners, 640dp max, 56dp side inset from the small breakpoint, 72dp top inset, 32×4 drag handle in a 48dp hit target. Drag the handle down to dismiss.

```html
<dialog class="bottom-sheet">
  <h2>Open file</h2>
  <div>…</div>
  <form method="dialog">
    <button type="submit" class="text" value="cancel">Cancel</button>
  </form>
</dialog>
```

```js
document.getElementById('sheet').showModal(); // modal, with scrim
document.getElementById('sheet').show();      // standard, no scrim
```

### Side sheet

A `dialog.side-sheet` (or `.right` / `.left`) is optional content anchored to the side. `show()` is standard (1dp inner divider, no scrim). `showModal()` is modal (28dp inner corners, scrim). A `<header>` holds an optional back button, a `title-large` headline, and a close control. A last-child `form[method=dialog]` is the action row. Drag the header or the inner 24dp edge toward the docked side to dismiss.

```html
<dialog class="side-sheet">
  <header>
    <h2>Headline</h2>
    <form method="dialog">
      <button type="submit" aria-label="Close">
        <i class="material-symbols">close</i>
      </button>
    </form>
  </header>
  <div>…</div>
</dialog>
```

```js
document.getElementById('sheet').show();      // standard
document.getElementById('sheet').showModal(); // modal
```

### Full-screen

Add `max` for a full-viewport dialog with no corners. That is the M3 full-screen dialog, typically used on small screens.

Show full-screen

### New message

A full-screen dialog fills the viewport. Put the primary action in the form at the end.

```text
<dialog class="max">
  <h2>New message</h2>
  <p>A full-screen dialog fills the viewport.</p>
  <form method="dialog">
    <button type="submit" class="text">Close</button>
    <button type="submit">Save</button>
  </form>
</dialog>
```

---

## Scrollspy

Highlight the table of contents as the page scrolls.

Scrollspy watches a set of sections and which one is currently in view. The table of contents on the right of every documentation page is the live demo: the matching link gets `active`, and clicking a link scrolls to that section.

Put `scrollspy` and an `id` on each section. In the TOC, use `table-of-contents` and point each link at `#that-id`. `AutoInit()` starts every `.scrollspy` except those marked `no-autoinit`.

```html
<div class="row">
  <div class="s12 m9">
    <div id="introduction" class="section scrollspy">
      <p>Content</p>
    </div>
    <div id="structure" class="section scrollspy">
      <p>Content</p>
    </div>
    <div id="initialization" class="section scrollspy">
      <p>Content</p>
    </div>
  </div>
  <div class="hide-on-small-only m3">
    <ul class="section table-of-contents">
      <li><a href="#introduction">Introduction</a></li>
      <li><a href="#structure">Structure</a></li>
      <li><a href="#initialization">Initialization</a></li>
    </ul>
  </div>
</div>
```

### Initialization

The IIFE bundle exposes `Expressive.ScrollSpy`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.scrollspy`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.scrollspy');
  const instances = Expressive.ScrollSpy.init(elems, {
    // specify options here
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  ScrollSpy: { scrollOffset: 200 }
});
```

The documentation TOC is `position: sticky`. Scrollspy only updates which link is active.

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `throttle` | Number | `100` | Throttle of the scroll handler, in milliseconds. |
| `scrollOffset` | Number | `200` | Offset used when deciding which section is in view. A larger value lets sections near the bottom of the page become active sooner. |
| `activeClass` | String | `'active'` | Class applied to the active table-of-contents link. |
| `getActiveElement` | Function | see below | Returns a CSS selector for the element that should receive `activeClass`, given the section’s id. |
| `keepTopElementActive` | Boolean | `false` | If true, keep the last section above the viewport active when the scrollbar is outside all spy sections. If there is no such section, the first one stays active. |
| `animationDuration` | Number | `null` | Duration of the click-to-scroll animation, in milliseconds. `null` uses the browser’s native `scrollIntoView({ behavior: 'smooth' })`. |

#### getActiveElement

Default function for finding the active link. `id` is the id of the `.scrollspy` section. Return a CSS selector for the element that should be marked active.

```text
function(id) {
  return 'a[href="#' + id + '"]';
}
```

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.ScrollSpy.getInstance(elem);
```

#### .destroy();

Destroy the plugin instance and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with (the `.scrollspy` section). |
| `options` | Object | The options the instance was initialized with. |

---

## Sidenav

A slide-out menu, or a fixed sidebar on large screens.

This is a slide-out menu. Nest `<details>` / `<summary>` for nested sections — the documentation sidebar uses that. On small screens this same drawer slides over the page.

The sidenav HTML must **not** sit inside the app bar’s `<nav>`. Put a `sidenav-trigger` anywhere and set `data-target` to the sidenav’s `id`. `AutoInit()` starts every `.sidenav` except those marked `no-autoinit`.

Toggle Sidenav

```html
<ul id="slide-out" class="sidenav">
  <li>
    <div class="user-view">
      <div class="background">
        <img src="images/office.jpg" alt="">
      </div>
      <a href="#user"><img class="circle" src="images/portrait.jpg" alt=""></a>
      <a href="#name"><span class="name">John Doe</span></a>
      <a href="#email"><span class="email">jdoe@example.com</span></a>
    </div>
  </li>
  <li><a href="#!"><i class="material-icons">cloud</i>First Link With Icon</a></li>
  <li><a href="#!">Second Link</a></li>
  <li><div class="divider"></div></li>
  <li><a class="subheader">Subheader</a></li>
  <li><a class="waves-effect" href="#!">Third Link With Waves</a></li>
</ul>
<a href="#!" data-target="slide-out" class="sidenav-trigger">
  <i class="material-icons">menu</i>
</a>
```

### Initialization

The IIFE bundle exposes `Expressive.Sidenav`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.sidenav`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.sidenav');
  const instances = Expressive.Sidenav.init(elems, {
    // specify options here
  });
});
```

Nested sections are HTML. A `<details>` / `<summary>` inside a `.sidenav` is a nested section; the same `name` on several details is an accordion. There is no Collapsible plugin.

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `edge` | String | `'left'` | Side of the screen. `'left'` or `'right'`. The constructor adds `right-aligned` when the edge is right. |
| `draggable` | Boolean | `true` | Allow swipe gestures to open and close. Drag is disabled while the sidenav is fixed on large screens. |
| `dragTargetWidth` | String | `'10px'` | Width of the screen-edge strip where a drag can start. |
| `inDuration` | Number | `250` | Open transition duration, in milliseconds. |
| `outDuration` | Number | `200` | Close transition duration, in milliseconds. |
| `preventScrolling` | Boolean | `true` | Prevent the page from scrolling while an overlay sidenav is open. |
| `onOpenStart` | Function | `null` | Called when the sidenav starts opening. |
| `onOpenEnd` | Function | `null` | Called when the sidenav finishes opening. |
| `onCloseStart` | Function | `null` | Called when the sidenav starts closing. |
| `onCloseEnd` | Function | `null` | Called when the sidenav finishes closing. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Sidenav.getInstance(elem);
```

#### .open();

Opens the sidenav.

```text
instance.open();
```

#### .close();

Closes the sidenav.

```text
instance.close();
```

#### .destroy();

Destroy the plugin instance and tear down its overlay, drag target, and event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `isOpen` | Boolean | Whether the sidenav is open. |
| `isFixed` | Boolean | Whether the element has `sidenav-fixed`. |
| `isDragged` | Boolean | Whether the sidenav is being dragged. |

### Close Trigger

Add `sidenav-close` to an element inside the sidenav. A click on that element closes an overlay sidenav. That is useful in a single-page app where the page does not reload. It does nothing while the sidenav is fixed on large screens.

```html
<ul id="slide-out" class="sidenav">
  <li><a class="sidenav-close" href="#!">Clicking this will close Sidenav</a></li>
</ul>
<a href="#!" data-target="slide-out" class="sidenav-trigger">
  <i class="material-icons">menu</i>
</a>
```

### Variations

#### Right edge

Pass `edge: 'right'`. Mark the element `no-autoinit` if you initialize it yourself, otherwise AutoInit would start it on the left.

Toggle Right Sidenav

```js
Expressive.Sidenav.init(document.querySelector('#slide-out-right'), {
  edge: 'right'
});
```

#### Menu HTML Structure

Nest `<details>` for a section that opens in place. Same `name` on several details is an accordion. The documentation sidebar uses this for Foundations, Structure, Components, and Forms.

```html
<ul id="slide-out" class="sidenav">
  <li><a href="#!">First Sidebar Link</a></li>
  <li>
    <details name="docs-nav">
      <summary>
        <i class="material-symbols">palette</i>
        Foundations
      </summary>
      <ul>
        <li><a href="#!">Color</a></li>
        <li><a href="#!">Typography</a></li>
      </ul>
    </details>
  </li>
</ul>
```

#### Fixed HTML Structure

Add `sidenav-fixed` so the sidenav stays open on large screens (wider than 992px) and slides away on smaller ones. The documentation sidebar on the left is this pattern.

```html
<ul id="slide-out" class="sidenav sidenav-fixed">
  <li><a href="#!">First Sidebar Link</a></li>
  <li><a href="#!">Second Sidebar Link</a></li>
</ul>
<a href="#!" data-target="slide-out" class="sidenav-trigger">
  <i class="material-icons">menu</i>
</a>
```

Offset the rest of the page by the sidenav width. The width token is `--sidenav-width` (300px). Put the padding on `header`, `main`, and `footer`.

```css
header, main, footer {
  padding-left: 300px;
}

@media only screen and (max-width: 992px) {
  header, main, footer {
    padding-left: 0;
  }
}
```

---

## Tabs

Material Design 3 tabs, from the HTML.

A `<nav class="tabs">` of `<a href="#panel">` is the bar. A `<span>` (or the link text) is the label; a leading `<i>` is the icon. `.active` is the selected tab. There is no `li.tab` required — `ul.tabs > li.tab > a` stays as an alias. `AutoInit()` starts every `.tabs` except those marked `no-autoinit`.

Tokens follow the [M3 tabs spec](https://m3.material.io/components/tabs/specs). Primary tabs sit on `surface`, 48dp (64dp with a stacked icon). The label is `title-small` / `on-surface-variant`; selected is `primary`. The indicator is 3dp `primary` with 3dp top corners. The icon is 24dp. A 1dp `outline-variant` divider runs under the bar. Hover is 8%; focus is 10%. Disabled is 38%.

```html
<nav class="tabs" aria-label="Travel">
  <a href="#flight">
    <i class="material-icons">flight</i>
    <span>Flight</span>
  </a>
  <a class="active" href="#luggage">
    <i class="material-icons">luggage</i>
    <span>Luggage</span>
  </a>
  <a href="#explore">
    <i class="material-icons">explore</i>
    <span>Explore</span>
  </a>
</nav>
<div id="flight">Flight</div>
<div id="luggage">Luggage</div>
<div id="explore">Explore</div>
```

Add `disabled` on the `<a>` (or on a wrapping `li.tab`) to make it inaccessible. Tabs become scrollable when there are too many to fit.

### Secondary

`tabs-secondary` is the in-content variant: always 48dp, icons inline, a 2dp indicator. Use it to further split a pane.

```html
<nav class="tabs tabs-secondary" aria-label="Trip">
  <a href="#travel">
    <i class="material-icons">flight</i>
    <span>Travel</span>
  </a>
  <a class="active" href="#hotel">
    <i class="material-icons">hotel</i>
    <span>Hotel</span>
  </a>
</nav>
```

### Initialization

The IIFE bundle exposes `Expressive.Tabs`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.tabs`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.tabs');
  const instances = Expressive.Tabs.init(elems, {
    duration: 300
  });
});
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `duration` | Number | `300` | Indicator transition duration, in milliseconds. |
| `onShow` | Function | `null` | Called when a new tab panel is shown. Receives the panel element. |
| `swipeable` | Boolean | `false` | Enable swipeable tabs. Uses `responsiveThreshold`. Wraps the panels in a carousel. |
| `responsiveThreshold` | Number | `Infinity` | Maximum viewport width, in pixels, at which swipeable mode starts. Wider viewports stay non-swipeable. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Tabs.getInstance(elem);
```

#### .select();

Show the panel that belongs to the tab with this id.

**String:** The id of the tab panel (without `#`).

```text
instance.select('tab_id');
```

#### .updateTabIndicator();

Recalculate the indicator position. Useful if the bar was hidden or resized.

```text
instance.updateTabIndicator();
```

#### .destroy();

Destroy the plugin instance and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with (the `.tabs` bar). |
| `options` | Object | The options the instance was initialized with. |
| `index` | Number | Index of the tab that is currently shown. |

### Preselecting a tab

The first tab is selected by default. To pick another, add `active` to its `<a>`, or load the page with a matching hash such as `#test2`.

```html
<a class="active" href="#test3">Test 3</a>
```

### Linking to an External Page

Tabs ignore default anchor behaviour. To keep a tab as a normal hyperlink, set `target` on the link.

```html
<nav class="tabs">
  <a target="_blank" href="https://github.com">External link in new window</a>
  <a target="_self" href="https://github.com">External link in same window</a>
</nav>
```

### Swipeable Tabs

Set `swipeable: true` to swipe between panels on touch devices. Keep the tab panels in the same wrapping container. The implementation wraps those panels in a carousel. `responsiveThreshold` is the viewport width below which swipeable mode turns on.

This demo is marked `no-autoinit` and started with `swipeable: true`.

```html
<nav id="tabs-swipe-demo" class="tabs">
  <a href="#test-swipe-1">Test 1</a>
  <a class="active" href="#test-swipe-2">Test 2</a>
  <a href="#test-swipe-3">Test 3</a>
</nav>
```

```js
Expressive.Tabs.init(document.querySelector('#tabs-swipe-demo'), {
  swipeable: true
});
```

### Fixed width

Add `max` (or `tabs-fixed-width`) so every tab grows equally. On compact viewports every tab bar already uses this layout.

```html
<nav class="tabs max">
  <a href="#test1">Test 1</a>
  <a class="active" href="#test2">Test 2</a>
  <a class="disabled" href="#test3">Disabled</a>
</nav>
```

### Inline icons

Primary tabs stack the icon above the label (64dp). Add `horizontal` (or `tabs-horizontal`) to put them on one line, like secondary tabs.

```html
<nav class="tabs max horizontal">
  <a href="#flight">
    <i class="material-icons">flight</i>
    <span>Flight</span>
  </a>
  <a class="active" href="#luggage">
    <i class="material-icons">luggage</i>
    <span>Luggage</span>
  </a>
</nav>
```

---

## Snackbar

Material Design 3 snackbars, from the HTML.

Snackbars show short updates about app processes at the bottom of the screen. They should not interrupt browsing. A `.snackbar` is the bar. A `<p>` is the supporting text. A trailing `<button>` is the optional action; a `.circle` button is the optional close.

Tokens follow the [M3 snackbar spec](https://m3.material.io/components/snackbar/specs). The container is `inverse-surface`, 4dp corners, elevation 3, 48dp minimum. Supporting text is `body-medium` / `inverse-on-surface`, two lines max. The action is a `label-large` / `inverse-primary` text button. Close is a 24dp `inverse-on-surface` icon. On compact viewports the bar is inset 8dp from the edges; from the small breakpoint up it hugs content (344–672dp) and sits centered 24dp from the bottom.

A snackbar can time out on its own (4 seconds, or 10 with an action) or stay until the user acts (`displayLength: Infinity`). Only one shows at a time. The live region is `role="status"` / `aria-live="polite"` and does not steal focus. Snackbar is not in `AutoInit()`.

Show Show with action Show with close

Photo saved to album

Item archived

Can't send photo. Retry in 5 seconds.

```js
new Expressive.Snackbar({ text: 'Photo saved to album' });

new Expressive.Snackbar({
  text: 'Item archived',
  action: 'Undo',
  onAction: function() { /* restore */ }
});

new Expressive.Snackbar({
  text: "Can't send photo. Retry in 5 seconds.",
  action: 'Retry',
  dismissible: true
});
```

The constructor wraps `text` in a `<p>` and appends the action and close when those options are set.

### Initialization

The IIFE bundle exposes `Expressive.Snackbar`. Snackbar is not in `AutoInit()` — construct one when you need it.

```js
new Expressive.Snackbar({
  text: 'I am a snackbar!'
});
```

One way to hook that up is a click handler on a button:

```html
<button type="button" id="snackbar-basic">Show</button>
```

```js
document.getElementById('snackbar-basic').addEventListener('click', function() {
  new Expressive.Snackbar({ text: 'I am a snackbar!' });
});
```

### Markup

The same anatomy works as static HTML. Without `.active` the bar is in-flow — useful for previews. With `.active` it pins to the bottom of the viewport, centered from the small breakpoint.

Show static snackbar

I'm a snackbar

```html
<div class="snackbar">
  <p>Photo saved to album</p>
</div>

<div class="snackbar">
  <p>Item archived</p>
  <button type="button">Undo</button>
</div>

<div class="snackbar active">
  <p>Single-line snackbar with action</p>
  <button type="button">Action</button>
</div>
```

`.active` does not dismiss itself. Add and remove the class, or use the constructor if you want the 4-second timer and swipe-to-dismiss.

### Options

You can customize each snackbar with these options.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `text` | String | `''` | Plain-text supporting text, wrapped in a `<p>`. If set, it replaces any HTML from `snackbarId`. |
| `action` | String | `''` | Optional action label. Rendered as a trailing text button. |
| `onAction` | Function | `null` | Called when the action button is pressed. The snackbar still dismisses. |
| `dismissible` | Boolean | `false` | Show a trailing close icon button. |
| `snackbarId` | String | — | Id of a `<template>` (or another element) used as the snackbar body. |
| `displayLength` | Number | `4000` | How long the snackbar stays before it dismisses, in milliseconds. M3 recommends 4–10 seconds. |
| `inDuration` | Number | `300` | Enter transition duration, in milliseconds. |
| `outDuration` | Number | `375` | Exit transition duration, in milliseconds. |
| `classes` | String | `''` | Space-separated classes added to the snackbar. `rounded` is a stadium. `top` moves the bar off the bottom. |
| `completeCallback` | Function | `null` | Called when the snackbar is dismissed. |
| `activationPercent` | Number | `0.8` | Fraction of the snackbar’s width a drag must travel to dismiss it. |

### Methods

> Instance methods are called on the snackbar. You can get the instance like this:

```js
const instance = Expressive.Snackbar.getInstance(elem);
```

#### .dismiss();

Dismiss this snackbar with its exit animation. Runs `completeCallback` when the animation finishes.

```text
instance.dismiss();
```

#### Snackbar.dismissAll();

Dismiss every snackbar that is currently showing.

```js
Expressive.Snackbar.dismissAll();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The snackbar element. |
| `options` | Object | The options the instance was initialized with. |
| `panning` | Boolean | Whether the snackbar is being dragged. |
| `timeRemaining` | Number | Milliseconds left before the snackbar dismisses. |

### Custom HTML

Pass `snackbarId` pointing at a `<template>`. The first child of the template is cloned as the snackbar. Leave `text` empty so the HTML is kept. Use the same anatomy as a static snackbar.

Show Snackbar 1 Show Snackbar 2

This is snackbar nº1 with a [link](https://github.com)

This is snackbar nº2

```html
<button type="button" class="tonal" id="snackbar-html-1">Show Snackbar 1</button>
<template id="my-snackbar-1">
  <div>
    <p>This is snackbar nº1 with a <a href="https://github.com">link</a></p>
  </div>
</template>
```

```js
new Expressive.Snackbar({ snackbarId: 'my-snackbar-1' });
```

### Callback

Run a function when the snackbar is dismissed.

Show Snackbar

```js
new Expressive.Snackbar({
  text: 'I will call back when dismissed',
  completeCallback: function() {
    new Expressive.Snackbar({ text: 'Your snackbar was dismissed' });
  }
});
```

### Styling

Pass classes in the `classes` option. `rounded` is a 24dp stadium — the M3 default is 4dp. Snackbars sit at the bottom; `top` is the exception.

Show round Snackbar Show at top

```js
new Expressive.Snackbar({
  text: 'I am a snackbar!',
  classes: 'rounded'
});

new Expressive.Snackbar({
  text: 'Posted from the top',
  classes: 'top'
});
```

### Dismiss a Snackbar Programmatically

To remove a specific snackbar, get the instance from the snackbar element and call `dismiss()`. Swipe also dismisses — drag past 80% of the width (or flick). The action and close buttons are not swipe handles.

Show Snackbar Dismiss a snackbar Dismiss all

```js
const snackbarElement = document.querySelector('.snackbar');
const snackbarInstance = Expressive.Snackbar.getInstance(snackbarElement);
snackbarInstance.dismiss();
```

#### Dismiss all snackbars

```js
Expressive.Snackbar.dismissAll();
```

---

## Tooltips

Material Design 3 tooltips, from the HTML.

A child `.tooltip` is the bubble. No `tooltipped` class is required. They are CSS only on hover and keyboard focus. Helpers are only for placement and the rich variant: `top` (the default), `bottom`, `left`, `right`, `rich` / `max`.

Tokens follow the [M3 tooltip spec](https://m3.material.io/components/tooltips/specs). A plain tooltip is `inverse-surface` / `inverse-on-surface`, 4dp corners, `body-small`, 24dp minimum, 4/8dp padding, 200dp max, no elevation and no caret. It sits 4dp from the activator. M3 prefers above.

Inside a `<button>` the bubble has to be a `<span>` — a `<div>` is not phrasing content and the parser will hoist it. Icon-only buttons still need `.circle` so the span is not treated as a label.

Add to album Above Below Start End

```html
<button type="button" class="circle" aria-label="Add">
  <i class="material-icons">add</i>
  <span class="tooltip">Add to album</span>
</button>

<button type="button" class="circle" aria-label="Below">
  <i class="material-icons">arrow_downward</i>
  <span class="tooltip bottom">Below</span>
</button>
```

### Rich

`rich` (or BeerCSS’s `max`) is the rich tooltip: `surface`, elevation 2, 12dp corners, 320dp max. A heading is the title (`title-small`), a `<p>` is supporting text (`body-medium`), and a trailing `<nav>` is the action. Rich bubbles can receive pointer events so the action is usable.

### Saved offline

This stop is stored on the device so it still opens without a signal.

```html
<div>
  <button type="button" class="tonal">Why this is saved</button>
  <div class="tooltip rich bottom">
    <h3>Saved offline</h3>
    <p>This stop is stored on the device so it still opens without a signal.</p>
    <nav>
      <button type="button" class="text">Got it</button>
    </nav>
  </div>
</div>
```

A rich tooltip with an action cannot live inside a `<button>` — that would nest buttons. Put the bubble next to the control, wrapped in a parent.

### JavaScript

The CSS path does not need AutoInit. The JS plugin is still there for `data-tooltip`, delayed show/hide, and keeping the bubble inside the viewport. Add `tooltipped` to the activator. `data-tooltip` is the text; `data-position` is `top`, `right`, `bottom`, or `left`. `AutoInit()` starts every `.tooltipped` except those marked `no-autoinit`. The generated element gets both `.tooltip` and `.material-tooltip`.

Bottom Top Left Right

```html
<a class="tooltipped" data-position="bottom" data-tooltip="I am a tooltip" href="#!">
  Hover me
</a>
```

For HTML, point `data-tooltip-id` at an element. That element is moved into the tooltip and the bubble is marked `rich`. Leave `data-tooltip` off so the HTML is kept. There is no `data-html` attribute and no `unsafeHTML` option.

With HTML

### Chart

This is a tooltip with a [link](https://github.com) and a .

```html
<a class="tooltipped" href="#!"
   data-position="bottom" data-tooltip-id="tooltip-content">
  With HTML
</a>
<div id="tooltip-content" hidden>
  <h3>Chart</h3>
  <p>This is a tooltip with a <a href="https://github.com">link</a>.</p>
</div>
```

### Initialization

The IIFE bundle exposes `Expressive.Tooltip`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.tooltipped`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.tooltipped');
  const instances = Expressive.Tooltip.init(elems, {
    enterDelay: 200
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  Tooltip: { enterDelay: 200 }
});
```

### Options

Constructor and `init` options. `data-tooltip`, `data-position`, and `data-tooltip-id` are read from the element and override these defaults. Attributes are read again each time the tooltip opens, so changing them later takes effect on the next show.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `exitDelay` | Number | `200` | Delay before the tooltip disappears, in milliseconds. |
| `enterDelay` | Number | `0` | Delay before the tooltip appears, in milliseconds. |
| `tooltipId` | String | — | Id of an element used as the tooltip body. Set by `data-tooltip-id`. Marks the bubble `rich`. |
| `text` | String | `''` | Plain-text content. Set by `data-tooltip`. Ignored when `tooltipId` is set. |
| `margin` | Number | `4` | Distance from the activator, in pixels, not counting `transitionMovement`. M3 is 4dp. |
| `inDuration` | Number | `250` | Enter transition duration, in milliseconds. |
| `opacity` | Number | `1` | Opacity of the tooltip when shown. |
| `outDuration` | Number | `200` | Exit transition duration, in milliseconds. |
| `position` | String | `'bottom'` | Direction: `'top'`, `'right'`, `'bottom'`, or `'left'`. Set by `data-position`. The CSS-only default is above. |
| `transitionMovement` | Number | `10` | How far the tooltip moves during its transition, in pixels. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Tooltip.getInstance(elem);
```

Hover me Open Close

#### .open();

Show the tooltip.

```text
instance.open();
```

#### .close();

Hide the tooltip.

```text
instance.close();
```

#### .destroy();

Destroy the plugin instance, remove the tooltip element, and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `isOpen` | Boolean | Whether the tooltip is open. |
| `isHovered` | Boolean | Whether the activator is hovered. |
| `isFocused` | Boolean | Whether the activator is focused via the keyboard. |
| `tooltipEl` | Element | The generated tooltip element. |

---

## Toolbars

Material Design 3 toolbars, from the HTML.

A `<nav class="toolbar">` is the bar. Direct `<button>` or `<a>` children are the actions. An `<i>` is the icon; wrap a label in `<span>`. `.active` marks the selected action. They are CSS only. There is no JavaScript component and nothing to AutoInit.

Tokens follow the [M3 toolbar spec](https://m3.material.io/components/toolbars/specs). The default is the floating bar: it hugs its actions, 64dp tall, 32dp stadium corners, `surface-variant`, elevation 2. Actions are 48dp targets with a 24dp icon, transparent at rest. Selected is `secondary-container` / `on-secondary-container`.

This is not the FAB-to-toolbar transition (`div.fixed-action-btn.toolbar`). That stays on Floating Action Button. Do not put `toolbar` on every `<nav>` — app bars, card actions, and radio rows stay as they are.

```html
<nav class="toolbar" aria-label="Text format">
  <button type="button" class="circle" aria-label="Undo">
    <i class="material-icons">undo</i>
  </button>
  <button type="button" class="circle active" aria-label="Bold">
    <i class="material-icons">format_bold</i>
  </button>
  <button type="button" class="circle" aria-label="Italic">
    <i class="material-icons">format_italic</i>
  </button>
</nav>
```

A label next to the icon needs a `<span>` — `:only-child` ignores text nodes, so `<i>edit</i>Edit` would look icon-only.

```html
<nav class="toolbar">
  <button type="button">
    <i class="material-icons">edit</i>
    <span>Edit</span>
  </button>
  <button type="button" class="circle" aria-label="More">
    <i class="material-icons">more_vert</i>
  </button>
</nav>
```

### Variants

`filled` is the vibrant bar — `primary-container` / `on-primary-container`. Selected then uses `surface-variant` so it still contrasts. `vertical` stacks the actions.

```html
<nav class="toolbar filled">…</nav>
<nav class="toolbar vertical">…</nav>
```

### Docked

`max` (BeerCSS) or `docked` (the M3 name) stretches the bar to the full width, drops the stadium and the elevation, and spaces the actions. Use it for page actions at the bottom of the screen; destinations belong on a navigation bar. A child `.max` is a spacer, not the bar.

```html
<nav class="toolbar docked" aria-label="Editor">
  <button type="button" class="circle" aria-label="Back">
    <i class="material-icons">arrow_back</i>
  </button>
  <button type="button" class="circle" aria-label="Add">
    <i class="material-icons">add</i>
  </button>
  <span class="max"></span>
  <button type="button" class="circle extra" aria-label="Create">
    <i class="material-icons">edit</i>
  </button>
</nav>
```

### Fixed

`fixed` pins the bar to the viewport. A floating bar sits 16dp from the bottom-center; add `top` to move it to the top. A vertical bar sits on the start edge; `right` flips it. A docked bar sticks to the bottom edge; `top` sticks it to the top.

```html
<nav class="toolbar fixed" aria-label="Format">…</nav>
<nav class="toolbar vertical fixed" aria-label="Tools">…</nav>
<nav class="toolbar docked fixed" aria-label="Editor">…</nav>
```

---

# Forms

## Date Picker

Select a date, a range, or several dates from a calendar.

Add `datepicker` to a text input. `AutoInit()` starts every `.datepicker` except those marked `no-autoinit`.

The calendar is inline, not a modal. `open()` and `close()` are deprecated no-ops. With the default options the calendar is hidden (`openByDefault: false`) and clicking the input does not reveal it. Pass `openByDefault: true` to show the calendar under the field.

```html
<div class="input-field">
  <input type="text" class="datepicker" id="birthdate">
  <label for="birthdate">Birthdate</label>
</div>
```

```js
Expressive.Datepicker.init(document.querySelectorAll('.datepicker'), {
  openByDefault: true
});
```

Wrap the input in its own `.input-field` (or another small parent). The calendar is inserted after that parent, not after the input itself.

### Initialization

The IIFE bundle exposes `Expressive.Datepicker`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.datepicker`. AutoInit uses the defaults, so the calendar stays hidden until you pass `openByDefault` (or a working `displayPlugin` pair, below).

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.datepicker');
  const instances = Expressive.Datepicker.init(elems, {
    openByDefault: true
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  Datepicker: { openByDefault: true }
});
```

### Display

The calendar is a `.datepicker-container` in the page. There is no overlay and no `autoClose` option.

#### Always visible

`openByDefault: true` leaves the calendar in the layout. That is the reliable way to show it.

#### Docked popover

`displayPlugin: 'docked'` wraps the calendar in a `.display-docked` popover that appears when the input is clicked or focused with Enter, and hides when you click outside. The plugin only animates the wrapper. If `openByDefault` is still `false`, the calendar inside stays `display: none`. Use both:

```js
Expressive.Datepicker.init(elem, {
  displayPlugin: 'docked',
  openByDefault: true
});
```

The popover is positioned in document coordinates and then appended to the input’s parent. A `position: relative` parent — including `.input-field` — shifts that position, so the calendar will not sit next to the field. Prefer a static wrapper if you use docked, or keep the calendar inline with `openByDefault`.

Optional `displayPluginOptions`: `margin` (default `5`), `transition` (`10`), `duration` (`250`), and `align` (`'left'`).

`container` renders the calendar into a specific element and does not hide it. Use a selector or a DOM node.

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `format` | String or Function | `'mmm dd, yyyy'` | Output written to the input, or a function that takes a `Date` and returns a string. |
| `parse` | Function | `null` | Turn the current input string back into a `Date`. Receives `(value, format)`. |
| `isDateRange` | Boolean | `false` | Select a start date and an end date. |
| `dateRangeEndEl` | String | `null` | Selector for an existing end-date input. If omitted, a second input is created. |
| `isMultipleSelection` | Boolean | `false` | Toggle several dates. Extra inputs are created as dates are added. |
| `defaultDate` | Date | `null` | Initial date to view. Falls back to the input’s current value, then today. |
| `defaultEndDate` | Date | `null` | Initial end date when `isDateRange` is true. |
| `setDefaultDate` | Boolean | `false` | If true, `defaultDate` is also the selected value. |
| `setDefaultEndDate` | Boolean | `false` | If true, `defaultEndDate` is also the selected end value. |
| `disableWeekends` | Boolean | `false` | Prevent selecting Saturday and Sunday. |
| `disableDayFn` | Function | `null` | Return true to disable that day. Receives a `Date`. |
| `firstDay` | Number | `0` | First day of the week. `0` is Sunday, `1` is Monday. |
| `minDate` | Date | `null` | Earliest selectable date. |
| `maxDate` | Date | `null` | Latest selectable date. |
| `yearRange` | Number or Array | `10` | Years on either side of the viewed year, or `[minYear, maxYear]`. |
| `yearRangeReverse` | Boolean | `false` | Sort the year list in reverse order. |
| `isRTL` | Boolean | `false` | Render the calendar right-to-left. |
| `showMonthAfterYear` | Boolean | `false` | Show the month after the year in the title. |
| `showDaysInNextAndPreviousMonths` | Boolean | `false` | Render days that fall in the adjoining months. |
| `openByDefault` | Boolean | `false` | If true, the calendar is visible. If false, it is given `display: none`. |
| `container` | Element or String | `null` | Element or selector to render the calendar into. When set, the calendar is not hidden. |
| `showClearBtn` | Boolean | `false` | Show a Clear button in the footer. |
| `autoSubmit` | Boolean | `true` | If true, selecting a day writes the input immediately. If false, Ok and Cancel buttons are added. |
| `i18n` | Object | See below | Labels and month/weekday names. Partial objects are merged with the defaults. |
| `events` | Array | `[]` | Strings from `Date.toDateString()`. Matching days get a `has-event` class. The default stylesheet does not style that class. |
| `onSelect` | Function | `null` | Called when a date is selected. Receives the `Date`. |
| `onDraw` | Function | `null` | Called after the calendar HTML is redrawn. |
| `onInputInteraction` | Function | `null` | Called when the input is clicked or confirmed with Enter. |
| `onConfirm` | Function | `null` | Called when the Ok button is used. Only created when `autoSubmit` is false. |
| `onCancel` | Function | `null` | Called when the Cancel button is used. Only created when `autoSubmit` is false. |
| `displayPlugin` | String | `null` | Set to `'docked'` for a click-to-open popover. Pair with `openByDefault: true`. |
| `displayPluginOptions` | Object | `null` | Options for the docked plugin: `margin`, `transition`, `duration`, `align`. |

### Date format options

Use these tokens in the `format` string.

| Key | Description | Output |
| --- | --- | --- |
| `d` | Date of the month. | 1–31 |
| `dd` | Date of the month, two digits. | 01–31 |
| `ddd` | Weekday short name from `i18n`. | Sun–Sat |
| `dddd` | Weekday full name from `i18n`. | Sunday–Saturday |
| `m` | Month of the year. | 1–12 |
| `mm` | Month of the year, two digits. | 01–12 |
| `mmm` | Month short name from `i18n`. | Jan–Dec |
| `mmmm` | Month full name from `i18n`. | January–December |
| `yy` | Two-digit year. | 26 |
| `yyyy` | Four-digit year. | 2026 |

### Internationalization

Pass a partial `i18n` object. Missing keys keep the English defaults.

| Key | Default |
| --- | --- |
| `cancel` | `'Cancel'` |
| `clear` | `'Clear'` |
| `done` | `'Ok'` |
| `previousMonth` | `'‹'` |
| `nextMonth` | `'›'` |
| `months` | `['January', …, 'December']` |
| `monthsShort` | `['Jan', …, 'Dec']` |
| `weekdays` | `['Sunday', …, 'Saturday']` |
| `weekdaysShort` | `['Sun', …, 'Sat']` |
| `weekdaysAbbrev` | `['S', 'M', 'T', 'W', 'T', 'F', 'S']` |

### Date range

Set `isDateRange: true`. Click a start day, then an end day that is on or after it. Point `dateRangeEndEl` at a second input, or omit it and a second input is created next to the first.

```js
Expressive.Datepicker.init(document.getElementById('datepicker-range'), {
  openByDefault: true,
  isDateRange: true,
  dateRangeEndEl: '#datepicker-range-end'
});
```

### Multiple dates

Set `isMultipleSelection: true`. Click a day to add it; click it again to remove it. Each selected date gets its own input.

```js
Expressive.Datepicker.init(document.getElementById('datepicker-multi'), {
  openByDefault: true,
  isMultipleSelection: true
});
```

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Datepicker.getInstance(elem);
```

#### .toString();

String form of the selected date, using `format`. You can pass another date and format.

```text
instance.toString();
instance.toString(someDate, 'yyyy-mm-dd');
```

#### .setDate();

Select a date and move the calendar to it.

**Date (optional):** Date to select.

```text
instance.setDate(new Date());
```

#### .gotoDate();

Change the visible month without changing the selection.

**Date:** Date whose month should be shown.

```text
instance.gotoDate(new Date());
```

#### .destroy();

Destroy the plugin instance, remove the calendar, and tear down its event handlers.

```text
instance.destroy();
```

#### .open(); / .close();

Deprecated. Both log a warning and do nothing. The calendar is not a modal; show it with `openByDefault` or the docked display plugin.

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The input the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `date` | Date | The selected date, or the range start. |
| `endDate` | Date | The range end, when `isDateRange` is true. |
| `dates` | Array | The selected dates when `isMultipleSelection` is true. |

---

## Time Picker

Pick a time from a clock face, in 12-hour or 24-hour form.

Add `timepicker` to a text input. `AutoInit()` starts every `.timepicker` except those marked `no-autoinit`.

The clock is inline, not a modal. It is appended to the input’s parent and stays visible. There is no `openByDefault` flag. `open()` and `close()` are deprecated no-ops.

```html
<div class="input-field">
  <input type="text" class="timepicker" id="lunchtime">
  <label for="lunchtime">Lunchtime</label>
</div>
```

Wrap the input in its own `.input-field` (or another small parent). The clock is appended inside that parent.

Click a hour on the dial, then a minute. With the default `autoSubmit: true`, finishing the minute writes the input (`HH:MM AM` or `HH:MM PM`). You can also type in the digital hour and minute fields.

### Initialization

The IIFE bundle exposes `Expressive.Timepicker`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.timepicker`. Unlike Datepicker, the default options already show the clock.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.timepicker');
  const instances = Expressive.Timepicker.init(elems, {
    // specify options here
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  Timepicker: { twelveHour: false }
});
```

### Display

The clock is a `.timepicker-container` in the page. There is no overlay and no `autoClose` option.

`container` renders the clock into a specific element instead of the input’s parent. Pass a selector or a DOM node.

#### Docked popover

`displayPlugin: 'docked'` wraps the clock in a `.display-docked` popover that appears when the input is clicked or confirmed with Enter, and hides when you click outside.

```js
Expressive.Timepicker.init(elem, {
  displayPlugin: 'docked'
});
```

The popover is positioned in document coordinates and then appended to the input’s parent. A `position: relative` parent — including `.input-field` — shifts that position, so the clock will not sit next to the field. Prefer a static wrapper if you use docked, or keep the clock inline.

Optional `displayPluginOptions`: `margin` (default `5`), `transition` (`10`), `duration` (`250`), and `align` (`'left'`).

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `duration` | Number | `350` | Transition between the hours and minutes views, in milliseconds. |
| `container` | Element or String | `null` | Element or selector to render the clock into. When omitted, it is appended to the input’s parent. |
| `showClearBtn` | Boolean | `false` | Show a Clear button in the footer. |
| `autoSubmit` | Boolean | `true` | If true, choosing a minute writes the input. If false, Ok and Cancel buttons are added. |
| `defaultTime` | String | `'now'` | Initial time. `'now'` or a `'HH:MM'` string (optionally with `AM`/`PM`). |
| `fromNow` | Number | `0` | Millisecond offset added to `'now'`. |
| `i18n` | Object | See below | Labels for Cancel, Clear, and Ok. |
| `twelveHour` | Boolean | `true` | If true, use a 12-hour clock with AM/PM. If false, use 24-hour hours on two rings. |
| `vibrate` | Boolean | `true` | Vibrate the device when the clock hand changes value. |
| `onSelect` | Function | `null` | Called when a time is chosen on the dial. Receives `(hour, minute)`. |
| `onInputInteraction` | Function | `null` | Called when the input is clicked or confirmed with Enter. |
| `onDone` | Function | `null` | Called when the Ok button is used. Only created when `autoSubmit` is false. |
| `onCancel` | Function | `null` | Called when the Cancel button is used. Only created when `autoSubmit` is false. |
| `displayPlugin` | String | `null` | Set to `'docked'` for a click-to-open popover. |
| `displayPluginOptions` | Object | `null` | Options for the docked plugin: `margin`, `transition`, `duration`, `align`. |

### Internationalization

Pass a partial `i18n` object. Missing keys keep the English defaults.

| Key | Default |
| --- | --- |
| `cancel` | `'Cancel'` |
| `clear` | `'Clear'` |
| `done` | `'Ok'` |

### 12-hour and 24-hour

`twelveHour` defaults to `true`. The intro clock above is 12-hour with AM/PM. Set `twelveHour: false` for a 24-hour dial: hours 1–12 on the inner ring, 13–00 on the outer ring. The written value is then `HH:MM` with no meridian.

```js
Expressive.Timepicker.init(document.getElementById('timepicker-24'), {
  twelveHour: false
});
```

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Timepicker.getInstance(elem);
```

#### .showView();

Show the hours or minutes face.

**String:** `'hours'` or `'minutes'`.

```text
instance.showView('hours');
```

#### .done();

Write the current hours and minutes to the input. Pass a truthy argument to clear the input instead.

```text
instance.done();
instance.done(true);
```

#### .clear();

Clear the input. Same as `done(true)`.

```text
instance.clear();
```

#### .destroy();

Destroy the plugin instance, remove the clock, and tear down its event handlers.

```text
instance.destroy();
```

#### .open(); / .close();

Deprecated. Both log a warning and do nothing. The clock is not a modal.

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The input the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `time` | String | The last value written by `done()`, without the AM/PM suffix. |
| `hours` | Number | The hour currently shown on the clock. |
| `minutes` | Number | The minute currently shown on the clock. |
| `amOrPm` | String | `'AM'` or `'PM'` when `twelveHour` is true. |
| `currentView` | String | `'hours'` or `'minutes'`. |

---

## Text Inputs

Material Design 3 text fields, from the HTML.

A `.field` (or the older `.input-field`) is the container. The `<label>` after the control is the floating label. A leading `<i>` is the leading icon. `<small>` is supporting text. The default is the M3 filled field; add `outlined` (or `border`) for the outlined variant.

Tokens follow the [M3 text field spec](https://m3.material.io/components/text-fields/specs). Height is 56dp. Filled is a `surface-variant` well with 4dp top corners and a 1dp / 2dp bottom indicator. Outlined is a 1dp / 2dp `outline` at 4dp. The label is `body-large` at rest and `body-small` floated. Input text is `body-large` / `on-surface`. Icons are 24dp, 12dp from the edge.

Add `placeholder=" "` (one space) so the label floats with CSS only. A missing placeholder, or any other string, keeps the label floated. Importing the bundle runs `Forms.Init()`; it validates `.validate` fields on `change` and starts textareas and file paths. Character Counter is not in `AutoInit()`.

```html
<div class="field">
  <input id="first_name" type="text" placeholder=" ">
  <label for="first_name">First name</label>
  <small>Supporting text</small>
</div>

<div class="field outlined">
  <input id="last_name" type="text" placeholder=" ">
  <label for="last_name">Last name</label>
</div>

<div class="field">
  <i class="material-icons">place</i>
  <i class="material-icons suffix">gps_fixed</i>
  <input id="loc" type="text" placeholder=" ">
  <label for="loc">Location</label>
</div>
```

Put `invalid` or `aria-invalid="true"` on the input for the error state. Do not put `error` on the wrapper — that class is a color utility and fills the field. `.supporting-text` and `.prefix` / `.suffix` remain as aliases.

### Input types

`email`, `password`, and the other native text-like types are styled the same way. `validate` uses HTML5 constraint validation on `change` and toggles `invalid` on the input. There is no green `valid` style.

```html
<div class="field">
  <input id="email" type="email" class="validate" placeholder=" ">
  <label for="email">Email</label>
  <small data-error="Enter a valid email">Supporting text</small>
</div>
```

`validate` also honors `data-length`: the field is marked `invalid` when the value is longer than that number. Prefer `maxlength` when you want the browser to cap input.

### Inline

Add `inline` to sit the field in a line of text.

This is an inline input field: Email

```text
This is an inline input field:
<span class="field inline">
  <input id="email_inline" type="email" class="validate" placeholder=" ">
  <label for="email_inline">Email</label>
</span>
```

### Textarea

Use `textarea.expressive-textarea` inside `.field`. That class name is Expressive’s; there is no `.materialize-textarea`. Textareas grow with their content. `Forms.Init()` starts every `.expressive-textarea` on `DOMContentLoaded`.

```html
<div class="field">
  <textarea id="textarea1" class="expressive-textarea" placeholder=" "></textarea>
  <label for="textarea1">Textarea</label>
</div>
```

If you add a textarea after load, initialize it yourself:

```js
Expressive.Forms.InitTextarea(document.querySelector('#textarea1'));
```

Setting `.value` in script does not resize the field. Call `textareaAutoResize` afterwards.

### File input

A `.file-field.field` pairs a button with a path field. `Forms.Init()` copies the chosen file name into `input.file-path`.

```html
<div class="file-field field">
  <button type="button">
    <span>File</span>
    <input type="file">
  </button>
  <div class="file-path-wrapper">
    <input class="file-path" type="text" placeholder=" ">
  </div>
</div>
```

Add `multiple` to allow more than one file.

### Character counter

Character Counter is not in `AutoInit()`. It reads `maxlength` (not `data-length`) and writes `current/max` into a `.character-counter` span. Overflow adds `invalid` on the field.

```js
Expressive.CharacterCounter.init(
  document.querySelectorAll('#input_text, #textarea2')
);
```

---

## Fieldsets

Grouped form sections, from the HTML.

A `<fieldset>` is the group. A `<legend>` is the headline. Everything else is a field — `.field`, radios, switches, a `<nav>` of radios, a trailing `<small>` as supporting text. There is no wrapper class. They are CSS only. There is no JavaScript component and nothing to AutoInit.

Material Design 3 has no fieldset component. Tokens follow the outlined grouping container used around related form content, and the [outlined text-field](https://m3.material.io/components/text-fields/specs) shape so a group of fields matches the fields. The container is 4dp corners and a 1dp `outline-variant` stroke. The legend is `title-small` / `on-surface`. Supporting text is `body-small`. Padding is 16dp; children sit 16dp apart. Disabled is 38%.

```text
<fieldset>
  <legend>Name</legend>
  <div class="field">
    <input id="first" type="text" placeholder=" ">
    <label for="first">First name</label>
  </div>
  <div class="field">
    <input id="last" type="text" placeholder=" ">
    <label for="last">Last name</label>
  </div>
</fieldset>
```

### Choices

A fieldset is also the right parent for a radio, checkbox, or switch group — the legend names the question, the `disabled` attribute disables every control inside. Put the labels in a `<nav>` to sit them on one line.

```text
<fieldset>
  <legend>Notify me about</legend>
  <label class="switch">
    <input type="checkbox" checked>
    Comments
  </label>
  <label class="switch">
    <input type="checkbox">
    Mentions
  </label>
  <small>You can change these later in settings.</small>
</fieldset>

<fieldset>
  <legend>Plan</legend>
  <nav>
    <label>
      <input name="plan" type="radio" checked>
      Monthly
    </label>
    <label>
      <input name="plan" type="radio">
      Yearly
    </label>
  </nav>
</fieldset>
```

### Variants

The default is outlined. `filled` is a `surface-variant` well with no stroke — pair it with `outlined` fields so the wells stay distinct. `rounded` is 12dp corners (M3 medium, like a card). `outlined` and `border` name the default if you need to say it.

```text
<fieldset class="filled">
  <legend>
    <i class="material-icons">place</i>
    Address
  </legend>
  <div class="field outlined">…</div>
</fieldset>

<fieldset class="filled rounded">
  <legend>Preferences</legend>
  …
</fieldset>
```

### Disabled

The HTML `disabled` attribute on a fieldset disables every control inside it. The legend and outline drop to 38%.

```text
<fieldset disabled>
  <legend>Billing</legend>
  <div class="field">…</div>
</fieldset>
```

---

## Switches

Material Design 3 switches, from the HTML.

A `<label class="switch">` wrapping `<input type="checkbox">` is the control. The label text is a sibling of the input — no `.lever` required. They are CSS only. There is no JavaScript component and nothing to AutoInit.

Tokens follow the [M3 switch spec](https://m3.material.io/components/switch/specs). The track is 52×32dp. Unselected is `surface-variant` with a 2dp `outline` and a 16dp handle. Selected is a `primary` track and a 24dp `on-primary` handle. The state layer is 40dp at 8% hover and 10% focus. The touch target is 48dp. The label is `body-large` / `on-surface`. Disabled is 38%.

Wi-Fi

Bluetooth

Airplane mode

Location

```html
<label class="switch">
  <input type="checkbox">
  Wi-Fi
</label>

<label class="switch">
  <input type="checkbox" checked>
  Bluetooth
</label>

<label class="switch">
  <input type="checkbox" disabled>
  Airplane mode
</label>
```

An `input + span` or `input + .lever` still works if you already have that markup.

```html
<label class="switch">
  Off
  <input type="checkbox">
  <span class="lever"></span>
  On
</label>
```

---

## Select

Choose one option, or several, from a styled menu.

Select turns a native `<select>` into a menu. Wrap it in `.input-field` and give the label a matching `for`. `AutoInit()` starts every `select` except those marked `no-autoinit`. Add `browser-default` to keep the native control.

Add `multiple` to select several options. Chosen values appear as a comma-separated list.

Native `<optgroup>` elements become group headings in the menu.

Put an image URL in `data-icon` on an option. Classes on that option are copied to the image; `left` floats it left. Images float right by default. There is no `icons` class on the `<select>`.

Add `browser-default` to skip the menu and keep the native select.

Browser Select Choose your option Option 1 Option 2 Option 3

```html
<div class="input-field">
  <select id="form-select-1">
    <option value="" disabled selected>Choose your option</option>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
    <option value="3">Option 3</option>
  </select>
  <label for="form-select-1">Expressive Select</label>
</div>

<div class="input-field">
  <select id="form-select-2" multiple>
    <option value="" disabled selected>Choose your option</option>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
    <option value="3">Option 3</option>
  </select>
  <label for="form-select-2">Multiple Select</label>
</div>

<div class="input-field">
  <select id="form-select-3">
    <optgroup label="team 1">
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
    </optgroup>
    <optgroup label="team 2">
      <option value="3">Option 3</option>
      <option value="4">Option 4</option>
    </optgroup>
  </select>
  <label for="form-select-3">Optgroups</label>
</div>

<div class="input-field">
  <select id="form-select-4">
    <option value="" disabled selected>Choose your option</option>
    <option value="1" data-icon="photo.jpg">example 1</option>
    <option value="2" data-icon="photo.jpg" class="left">example 2</option>
  </select>
  <label for="form-select-4">Images in select</label>
</div>

<label for="form-select-6">Browser Select</label>
<select id="form-select-6" class="browser-default">
  <option value="" disabled selected>Choose your option</option>
  <option value="1">Option 1</option>
</select>
```

### Initialization

The IIFE bundle exposes `Expressive.FormSelect`. Call `init` yourself when you need options other than the defaults, after adding a select dynamically, or after changing an existing select’s options. Otherwise `Expressive.AutoInit()` starts every `select`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('select');
  const instances = Expressive.FormSelect.init(elems, {
    // specify options here
  });
});
```

Per-instance options can also be passed through AutoInit:

```js
Expressive.AutoInit(document.body, {
  FormSelect: { menuOptions: { constrainWidth: false } }
});
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `classes` | String | `''` | Space-separated classes added to the generated `.select-wrapper`. |
| `menuOptions` | Object | `{}` | Options passed to `Menu`. See Menu. `coverTrigger` is forced to `false` and `closeOnClick` is forced to `false`. |

There is no `selected` option. Mark options with the HTML `selected` attribute instead.

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.FormSelect.getInstance(elem);
```

#### .getSelectedValues();

Selected values as an array of strings.

```text
instance.getSelectedValues();
```

#### .destroy();

Destroy the plugin instance, remove the menu, and restore the native select.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The native `<select>` the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `isMultiple` | Boolean | Whether this is a multiple select. |
| `wrapper` | Element | The generated `.select-wrapper`. |
| `menuEl` | Element | The generated `<menu>`. |
| `labelEl` | Element | The associated label, or `null` if none was found. |
| `input` | Element | The text input that shows the current selection. |
| `menu` | Menu | The Menu instance for this select. |

### Disabled Styles

`disabled` on the `<select>` disables the whole control. `disabled` on an `<option>` makes that item unselectable.

Browser Disabled Choose your option Option 1 Option 2 Option 3

```html
<div class="input-field">
  <select id="form-select-7" disabled>
    <option value="" disabled selected>Choose your option</option>
    <option value="1">Option 1</option>
  </select>
  <label for="form-select-7">Disabled Select</label>
</div>

<label for="form-select-8">Browser Disabled</label>
<select id="form-select-8" class="browser-default" disabled>
  <option value="" disabled selected>Choose your option</option>
  <option value="1">Option 1</option>
</select>
```

---

## Sliders

Material Design 3 sliders, from the HTML.

An `<input type="range">` is the control. A wrapping `.range` (or a `<label>` / `.range-field`) is the host for the value label. `.slider` is the carousel — do not put it on a range. The plugin is `Expressive.Range` because `Slider` is already the carousel.

Three variants: **standard** (active from the start to the handle), **centered** (`.centered`, active grows from the midpoint), and **range** (two inputs in one host, active between the handles). Horizontal or `.vertical`. Five sizes, an optional inset icon, discrete stops, and a value indicator.

Tokens follow the [M3 slider spec](https://m3.material.io/components/sliders/specs) (Expressive). The handle is a 4dp stop with a 6dp gap to each track, narrowing to 2dp while pressed. Active is `primary`; inactive is `secondary-container`. The end of an inactive track carries a 4dp stop. The value label is a 40dp `inverse-surface` / `inverse-on-surface` bubble, `body-small`. Disabled is 38%.

Range is not in `AutoInit()`. Importing the IIFE bundle calls `Expressive.Range.Init()`, which starts every `input[type=range]` already in the document and keeps the active track in sync. `no-autoinit` does not apply.

```html
<label>
  Volume
  <input type="range" min="0" max="100" value="40">
</label>
```

`min`, `max`, `step`, and `value` are the native attributes. When they are omitted, the control treats the range as 0–100. Dragging shows the current value above the handle.

### Variants

`centered` grows the active track from 50%. A range slider is two inputs in one `.range` host; the plugin keeps the start handle from passing the end one.

```html
<div class="range centered">
  <input type="range" min="0" max="100" value="30" aria-label="Centered">
</div>

<div class="range">
  <input type="range" min="0" max="100" value="25" aria-label="Range start">
  <input type="range" min="0" max="100" value="75" aria-label="Range end">
</div>
```

### Sizes

XS is the default: a 16dp track and a 44dp handle. `s` / `small` is S, `m` / `medium` is M, `l` / `large` is L, and `xl` is XL. Scope them on the host — unscoped `.small` / `.large` are used by other components.

```html
<div class="range s">…</div>
<div class="range m">…</div>
<div class="range l">…</div>
<div class="range xl">…</div>
```

### Inset icon, stops, value

A leading `<i>` sits inside the active track; M, L, and XL are tall enough for it. `stops` plus a `step` paints ticks along the track.

```html
<div class="range m">
  <i class="material-symbols">volume_up</i>
  <input type="range" min="0" max="100" value="55" aria-label="Volume">
</div>

<div class="range stops">
  <input type="range" min="0" max="100" step="20" value="40" aria-label="Stops">
</div>
```

### Vertical

`vertical` stands the track up. Minimum is at the bottom. The value label sits to the end of the handle.

```html
<div class="range vertical m">
  <input type="range" min="0" max="100" value="60" aria-label="Level">
</div>
```


### Disabled

The native `disabled` attribute drops the control to 38%.

```html
<label>
  Locked
  <input type="range" min="0" max="100" value="30" disabled>
</label>
```

### Initialization

Put the script after the inputs (as this site does), or call `init` yourself. There are no options. For a range added after load:

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('input[type=range]');
  Expressive.Range.init(elems);
});

Expressive.Range.init(document.querySelector('#volume'));
```

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Range.getInstance(elem);
```

#### .destroy();

Destroy the plugin instance, remove the value label, and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The range input the plugin was initialized with. |
| `options` | Object | Empty. Range has no options. |
| `thumb` | Element | The generated value label next to the input. |
| `value` | Element | The span inside the label that shows the current number. |

---

## Radio Buttons

Material Design 3 radios, from the HTML.

A `<label>` wrapping `<input type="radio">` is the control. The label text is a sibling of the input — no extra class, no required `<span>`. They are CSS only. There is no JavaScript component and nothing to AutoInit.

Tokens follow the [M3 radio spec](https://m3.material.io/components/radio-button/specs). The icon is a 20dp ring with a 2dp stroke. Selected is `primary` with a 10dp inner disc (the M3 gap). The state layer is 40dp at 8% hover and 10% focus. The touch target is 48dp. The label is `body-large` / `on-surface`. Disabled is `on-surface` at 38%.

Use the same `name` on every radio in a group. Add `disabled` to disable one. `with-gap` is a no-op — the selected state is always the ring plus inner disc.

```html
<label>
  <input name="group1" type="radio" checked>
  Red
</label>
<label>
  <input name="group1" type="radio">
  Yellow
</label>
<label>
  <input name="group1" type="radio" disabled>
  Brown
</label>
```

An `input + span` still works if you already have that markup, or if you follow BeerCSS’s `<label class="radio">` pattern.

```html
<label class="radio">
  <input type="radio" name="group1">
  <span>Yellow</span>
</label>
```

### In a row

Put the labels in a `<nav>` to sit them on one line. A bare group stacks vertically.

```html
<nav>
  <label>
    <input name="group2" type="radio" checked>
    Red
  </label>
  <label>
    <input name="group2" type="radio">
    Yellow
  </label>
</nav>
```

---

## Chips

Small blocks for contacts, tags, and filters.

A chip is a `.chip`. Add an `img` for a contact, a `.close` icon for a dismissible tag, or `outlined` for a bordered style. Static chips are CSS. The JavaScript plugin lives on a `.chips` wrapper.

```html
<div class="chip">
  <img src="photo.jpg" alt="Contact Person"> Jane Doe
</div>
<div class="chip">
  Tag
  <i class="close material-icons">close</i>
</div>
<div class="chip">
  <i class="material-icons">check</i>
  Filter
  <i class="close material-icons">close</i>
</div>
<div class="chip outlined">Information</div>
```

Clicking `.close` removes the chip only when it sits inside a `.chips` container. Importing the bundle runs `Chips.Init()` on `DOMContentLoaded`, which wires that click. A lone `.chip` does not remove itself.

### Contacts

Put an image inside the chip.

```html
<div class="chip">
  <img src="photo.jpg" alt="Contact Person">
  Jane Doe
</div>
```

### Tags

Put a close icon with class `close` inside the chip.

```html
<div class="chip">
  Tag
  <i class="close material-icons">close</i>
</div>
```

### Javascript Plugin

The plugin turns a `.chips` container into an editable tag field. Type a value and press Enter to add a chip. Delete with the close icon, or select a chip and press Backspace or Delete.

`allowUserInput` defaults to `false`. Without it there is no text field and rendered chips have no close icon. Pass `allowUserInput: true` for the interactive field. `AutoInit()` starts every `.chips` except `no-autoinit`, but it uses the defaults, so those wrappers stay display-only until you call `init` with options.

Empty field — type a tag and press Enter:

Initial tags from the `data` option:

Placeholders when the field is empty and after the first tag:

Autocomplete suggestions while typing:

```html
<div class="chips"></div>
<div class="chips chips-initial"></div>
<div class="chips chips-placeholder"></div>
<div class="chips chips-autocomplete"></div>
<!-- Optional: provide your own input -->
<div class="chips">
  <input class="custom-class">
</div>
```

The classes `chips-initial`, `chips-placeholder`, and `chips-autocomplete` are only hooks for your selectors. They have no styles of their own.

### Initialization

The IIFE bundle exposes `Expressive.Chips`. Call `init` with `allowUserInput: true` (and any other options) for an editable field. Re-init after adding a container dynamically.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.chips');
  const instances = Expressive.Chips.init(elems, {
    allowUserInput: true,
    placeholder: 'Enter a tag',
    secondaryPlaceholder: '+Tag',
    autocompleteOptions: {
      data: [
        { id: 12, text: 'Apple' },
        { id: 13, text: 'Microsoft' },
        { id: 42, text: 'Google', image: 'https://picsum.photos/id/64/250/250' }
      ]
    }
  });
});
```

Chip data object. `id` is required; a chip without an id is not rendered.

```js
const chip = {
  id: '4711',
  text: 'Title',
  image: ''
};
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | Array | `[]` | Initial chips. Each item is a chip data object. |
| `placeholder` | String | `''` | Placeholder when there are no chips. Requires `allowUserInput`. |
| `secondaryPlaceholder` | String | `''` | Placeholder after at least one chip exists. |
| `closeIconClass` | String | `'material-icons'` | Class on the close icon. Use a Material Symbols class if that is the font you load. |
| `allowUserInput` | Boolean | `false` | If true, render a text field and close icons so the user can add and remove chips. |
| `autocompleteOptions` | Object | `{}` | Options passed to Autocomplete on the input. A non-empty object enables autocomplete. |
| `autocompleteOnly` | Boolean | `false` | If true, Enter will not add a value that is not in the autocomplete list. |
| `limit` | Number | `Infinity` | Maximum number of chips. |
| `onChipAdd` | Function | `null` | Called after a chip is added. Receives the container and the chip element. |
| `onChipSelect` | Function | `null` | Called when a chip is selected. Receives the container and the chip element. |
| `onChipDelete` | Function | `null` | Called after a chip is deleted. Receives the container and the chip element. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Chips.getInstance(elem);
```

#### .addChip();

Add a chip. Ignored if `id` is missing, already present, or the limit is reached.

```text
instance.addChip({
  id: 1337,
  text: 'John Doe',
  image: ''
});
```

#### .deleteChip();

Delete the chip at this index.

```text
instance.deleteChip(3);
```

#### .selectChip();

Focus the chip at this index.

```text
instance.selectChip(2);
```

#### .getData();

The current chips as an array of chip data objects.

```text
instance.getData();
```

#### .destroy();

Destroy the plugin instance, remove rendered chips, and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The container the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `chipsData` | Array | The current chip data. |
| `hasAutocomplete` | Boolean | Whether autocomplete is enabled. |
| `autocomplete` | Autocomplete | The Autocomplete instance, if any. |

---

## Checkboxes

Material Design 3 checkboxes, from the HTML.

A `<label>` wrapping `<input type="checkbox">` is the control. The label text is a sibling of the input — no extra class, no required `<span>`. They are CSS only. There is no JavaScript component and nothing to AutoInit.

Tokens follow the [M3 checkbox spec](https://m3.material.io/components/checkbox/specs). The container is 18dp with 2dp corners. Unselected is a 2dp `on-surface-variant` outline. Selected is a `primary` fill with an `on-primary` check. Indeterminate is the same fill with a dash. The state layer is 40dp at 8% hover and 10% focus. The touch target is 48dp. The label is `body-large` / `on-surface`. Disabled is 38%.

Put the input first. Add `checked` or `disabled` on the input. Indeterminate is not an HTML attribute — set `element.indeterminate = true` in script. `filled-in` is a no-op: the selected state is always the filled box.

```html
<label>
  <input type="checkbox">
  Red
</label>
<label>
  <input type="checkbox" checked>
  Yellow
</label>
<label>
  <input type="checkbox" disabled>
  Brown
</label>
```

```js
document.getElementById('indeterminate-checkbox').indeterminate = true;
```

An `input + span` still works if you already have that markup, or if you follow BeerCSS’s `<label class="checkbox">` pattern. Multiple `<select>` still emits `input + span` that way.

```html
<label class="checkbox">
  <input type="checkbox">
  <span>Yellow</span>
</label>
```

### In a row

Put the labels in a `<nav>` to sit them on one line. A bare group stacks vertically.

```html
<nav>
  <label>
    <input type="checkbox" checked>
    Red
  </label>
  <label>
    <input type="checkbox">
    Yellow
  </label>
</nav>
```

### Error

Add `aria-invalid="true"` or `class="invalid"` on the input. The box uses `error` / `on-error`.

```html
<label>
  <input type="checkbox" aria-invalid="true">
  Accept the terms
</label>
```

---

## Autocomplete

Suggest values under a text field as the user types.

Add `autocomplete` to a text input inside `.input-field`. `AutoInit()` starts every `.autocomplete` except `no-autoinit`, but the default `data` list is empty — pass options (or call `init`) to give it something to suggest.

Set `isMultiSelect: true` to pick several values. A count appears on the field.

```html
<div class="input-field">
  <i class="material-icons prefix">textsms</i>
  <input type="text" id="autocomplete-input" class="autocomplete" placeholder=" ">
  <label for="autocomplete-input">Autocomplete</label>
</div>
```

### Initialization

The IIFE bundle exposes `Expressive.Autocomplete`. `data` is an array of objects:

- id (required) — a string or number. Used as the option text when text is omitted.
- text — display label. The default search matches id and text.
- image — image URL. Shown as a circle; not searched by default.
- description — optional secondary line under the label.

Extra properties are ignored by the default search. Filter them yourself in `onSearch`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.autocomplete');
  Expressive.Autocomplete.init(elems, {
    minLength: 0,
    data: [
      { id: 12, text: 'Apple' },
      { id: 13, text: 'Microsoft' },
      { id: 42, text: 'Google', image: 'https://picsum.photos/id/64/250/250' }
    ]
  });
});
```

Multiple selection:

```js
Expressive.Autocomplete.init(document.querySelector('#autocomplete-multi'), {
  minLength: 0,
  isMultiSelect: true,
  data: [
    { id: 12, text: 'Apple' },
    { id: 13, text: 'Microsoft' },
    { id: 42, text: 'Google', image: 'https://picsum.photos/id/64/250/250' }
  ]
});
```

Custom `onSearch` can load data asynchronously. When the list is ready, call `setMenuItems`. The default filter looks at `id` and `text` only:

```text
onSearch: function(text, autocomplete) {
  const normSearch = text.toLocaleLowerCase();
  autocomplete.setMenuItems(
    autocomplete.options.data.filter(function(option) {
      return option.id.toString().toLocaleLowerCase().includes(normSearch)
        || (option.text && option.text.toLocaleLowerCase().includes(normSearch));
    })
  );
}
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | Array | `[]` | Suggestion list. Each item needs an `id`; `text`, `image`, and `description` are optional. |
| `isMultiSelect` | Boolean | `false` | If true, several values can be selected. `onAutocomplete` receives an array. |
| `maxMenuHeight` | String | `'300px'` | Max height of the suggestion menu. |
| `onAutocomplete` | Function | `null` | Called after a selection (and when a default value is applied). Receives the selected entries. |
| `onSearch` | Function | filters `id` and `text` | Called when the input text changes. Load or filter data, then call `setMenuItems`. |
| `minLength` | Number | `1` | Characters required before suggestions open. `0` shows the list on click or focus. |
| `menuOptions` | Object | see note | Options for Menu. Defaults include `autoFocus: false`, `closeOnClick: false`, and `coverTrigger: false`. |
| `allowUnsafeHTML` | Boolean | `false` | If true, matched text is inserted as HTML. Only use sanitized data. |
| `selected` | Array | `[]` | Initial selected ids (strings or numbers). |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Autocomplete.getInstance(elem);
instance.open();
```

#### .open();

Open the suggestion menu if the input meets `minLength`.

```text
instance.open();
```

#### .close();

Close the suggestion menu.

```text
instance.close();
```

#### .selectOption();

Select (or toggle, when multi-select) the entry with this id.

```text
instance.selectOption(42);
```

#### .setMenuItems();

Replace the visible suggestions. Optionally pass selected ids and whether to open the menu (default `true`).

```text
instance.setMenuItems([
  { id: 'Test' },
  { id: 12, text: 'Apple' },
  { id: 13, text: 'Microsoft' },
  { id: 42, text: 'Google', image: 'https://picsum.photos/id/64/250/250' }
]);
```

#### .destroy();

Destroy the plugin instance, remove the menu, and tear down its event handlers.

```text
instance.destroy();
```

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The input the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `isOpen` | Boolean | Whether the suggestion menu is open. |
| `count` | Number | Number of matching options (reset on each keyup/focus). |
| `activeIndex` | Number | Index of the keyboard-highlighted option, or `-1`. |
| `menu` | Menu | The Menu instance for this autocomplete. |
| `selectedValues` | Array | The currently selected entries. |
