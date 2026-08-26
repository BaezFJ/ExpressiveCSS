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
- Shadow
- Table
- Transitions
- Typography
- State layers

### CSS components

- Badges
- Banners
- Bottom app bar
- Breadcrumbs
- Buttons
- Cards
- Carousel
- Drag handle
- Lists
- Floating Action Button
- Footer
- Icon buttons
- Icons
- Navbar
- Navigation bar
- Navigation rail
- Pagination
- Panes
- Preloader
- Loading indicator
- Search
- Segmented buttons
- Button groups

### JavaScript components

- Auto Init
- Navigation rail
- Menu
- Media
- Dialogs
- Bottom sheet
- Side sheet
- Floating sheet
- Scrollspy
- NavigationDrawer
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
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500&family=Roboto:wght@400;500&display=swap">
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

The IIFE bundle exposes the global `Expressive` object. The two Google Fonts stylesheets above are the same ones the docs site loads: variable Material Symbols (outlined, rounded, and sharp, with the opsz / wght / FILL / GRAD axes), Roboto 400 / 500, and the Noto Sans fallback. The framework does not ship those font files. Drop the Symbols link only if the page has no icon-font markup; replace the typeface link if you override the brand/plain tokens. The older Material Icons stylesheet is optional and is not required for `.material-symbols`.

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

Add the `vibrant` attribute to an element to resolve the surface roles in its subtree to the tertiary container instead of a neutral surface. It repaints nothing itself — it redeclares tokens, and the components under it that already read those roles follow.

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

ExpressiveCSS uses the exact M3 window size classes: Compact `< 600px`, Medium `600–839px`, Expanded `840–1199px`, Large `1200–1599px`, and Extra-large `>= 1600px`. The 12-column grid maps those classes to `.s`, `.m`, `.l`, `.xl`, and `.xxl` prefixes respectively.

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
| `ScrollSpy` | `.scrollspy` |
| `FormSelect` | `select` |
| `NavigationDrawer` | `.navigation-drawer` |
| `Tabs` | `.tabs` |
| `Timepicker` | `.timepicker` |
| `Tooltip` | `.tooltipped` |
| `FloatingActionButton` | `.fab` |

`Snackbar`, `CharacterCounter`, and `Slider` are intentionally not in the registry. Construct or initialize them through their documented APIs. Importing the bundle also installs document-level keyboard/focus handlers and initializes the shared Forms, Chips, Slider, Cards, and ExpandingCard behaviors.

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

- `AutoInit`, `Forms`, and `version`
- `Dialogs`, `BottomSheets`, and `SideSheets`
- `Autocomplete`, `FloatingActionButton`, `Cards`, `Carousel`, and `CharacterCounter`
- `Chips`, `Datepicker`, `Menu`, and `Lightbox`
- `Slider` and `ScrollSpy`
- `FormSelect`, `NavigationDrawer`, `NavigationRail`, and `Tabs`
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

The browser bundle exposes the framework as the global `Expressive` object. Importing the JavaScript installs shared document behaviors (forms, chips, cards, and a few others), but it does not call `AutoInit()` automatically. Call it after the page has loaded so components such as navigation drawers, tooltips, and tabs start themselves.

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

### Vibrant emphasis

`vibrant` is Material 3 Expressive's emphasis axis, and it is a foundation rather than a component variant: the attribute remaps the surface family of `--md-sys-color-*` roles inside its subtree onto the tertiary container, and every component already reads those roles. Nothing is restyled until you write the attribute.

```html
<article vibrant>…</article>
```

The remap covers `surface`, `background`, all five `surface-container` rungs, `surface-dim`, `surface-bright`, `surface-variant`, and their `on-*` roles. Accent roles are untouched, so a filled button still stands out; outline roles are untouched too, because M3's outline is neutral-variant rather than an opacity of the text color, and deriving it would turn every checkbox, radio and switch border in the subtree translucent. It points at the live role names, so a runtime theme switch reaches it.

There is one ramp, tertiary — M3's for this axis. Pointing the surfaces at primary or secondary would erase every component whose own fill is that container: a tonal button, a FAB, `.toolbar.vibrant`. Set the surface tokens on your own wrapper if you want a different one.

The elevation ladder collapses — every `surface-container` rung resolves to the one container color, which is what a vibrant surface is in Material, and `on-surface-variant` collapses onto `on-surface` for the same reason — so put the attribute on the component you want emphasized, not on the page. Menus and toolbars also carry a `.vibrant` class; those are Material's own per-component token sets, and the attribute is the general axis. A menu inside a vibrant subtree adopts its vibrant mapping automatically — a selected item is filled with `tertiary-container`, the colour the attribute paints the menu with, so M3 moves selection to solid `tertiary`. `:host([vibrant])` is matched alongside `[vibrant]`, so a shadow-DOM host can carry it.

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

`scrim` is the opaque neutral the wash behind a modal surface is mixed from, not the wash itself. That is `--md-comp-scrim-color` — the role at 32%, defined once on `:root, :host` (so a sheet adopted into a shadow root gets one too) and consumed by dialogs, both sheets, the navigation drawer and the modal navigation rail. Override it at the root to retheme all of them, or set it on one element to dim just that surface (`::backdrop` inherits from the element it belongs to). The mix resolves at the root, so overriding `--md-sys-color-scrim` on a subtree does not reach a scrim below it — override `--md-comp-scrim-color` there instead.

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

`s1` means one column at the Compact/default size and up.

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

To offset, simply add `offset-s2` to the class where the prefix identifies the window size (`s` = Compact, `m` = Medium, `l` = Expanded, `xl` = Large, `xxl` = Extra-large) and the number is how many columns to offset.

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

```html
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

|  | Compact `< 600px` | Medium `600–839px` | Expanded `840–1199px` | Large `1200–1599px` | Extra-large `>= 1600px` |
| --- | --- | --- | --- | --- | --- |
| **Class Prefix** | `.s` | `.m` | `.l` | `.xl` | `.xxl` |
| **Container Width** | 90% | 85% | 70% | 70% | 75% |
| **Number of Columns** | 12 | 12 | 12 | 12 | 12 |

#### Adding Responsiveness

In the previous examples, we only defined the Compact/default size using `s12`. This is fine if we want a fixed layout since the rules propagate upwards. By just saying `s12`, we are essentially saying `s12 m12 l12 xl12 xxl12`. Define later prefixes when the layout should change at wider window size classes.

```html
<div class="row">
  <div class="s12">I am always full-width (s12)</div>
  <div class="s12 m6">I am full-width on mobile (s12 m6)</div>
</div>
```

#### Responsive Side Navigation Layout

In this example below, we take the same layout from above, but we make it responsive by defining how many columns the div should take up on each screen size. Try resizing your browser and watch the layout change below.

```html
<!-- Navbar goes here -->
<!-- Page Layout here -->
<div class="row">
  <div class="s12 m4 l3">
    <!-- Grey navigation panel
          This content will be:
      3-columns-wide on Expanded and wider screens,
      4-columns-wide on Medium screens,
      12-columns-wide on Compact screens -->
  </div>
  <div class="s12 m8 l9">
    <!-- Teal page content
          This content will be:
      9-columns-wide on Expanded and wider screens,
      8-columns-wide on Medium screens,
      12-columns-wide on Compact screens -->
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
| `.hide-on-compact-only` | Hidden on Compact (`< 600px`) |
| `.hide-on-medium-only` | Hidden on Medium (`600–839px`) |
| `.hide-on-expanded-only` | Hidden on Expanded (`840–1199px`) |
| `.hide-on-large-only` | Hidden on Large (`1200–1599px`) |
| `.hide-on-extra-large-only` | Hidden on Extra-large (`>= 1600px`) |
| `.show-on-compact` | Shown on Compact (`< 600px`) |
| `.show-on-medium` | Shown on Medium (`600–839px`) |
| `.show-on-expanded` | Shown on Expanded (`840–1199px`) |
| `.show-on-large` | Shown on Large (`1200–1599px`) |
| `.show-on-extra-large` | Shown on Extra-large (`>= 1600px`) |
| `.show-on-medium-and-up` | Shown from Medium (`>= 600px`) |
| `.show-on-medium-and-down` | Shown on Compact and Medium (`< 840px`) |

Legacy `small`, `med`, and `xxl` utility names remain aliases for compatibility.

#### Usage

```html
<div class="hide-on-compact-only"></div>
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

```html
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

```html
<!-- Scaled in -->
<a id="scale-demo" href="#!" class="button circle extra scale-transition" aria-label="Add"><span class="material-symbols" aria-hidden="true">add</span></a>
<!-- Scaled out -->
<a id="scale-demo" href="#!" class="button circle extra scale-transition scale-out" aria-label="Add"><span class="material-symbols" aria-hidden="true">add</span></a>
```

---

## Typography

Material Design 3 type, from the HTML.

The type scale is the HTML. `<h1>`–`<h6>` are display and headline roles, `<p>` is body-large, `<small>` is body-small. You do not need a class unless the element cannot carry the role — a `<span class="label-large">`, or a `<p class="display-large">` used as a hero numeral.

Tokens follow the [M3 type system](https://m3.material.io/styles/typography/overview). Each role sets family, size, weight, line-height, and letter-spacing from `--md-sys-typescale-*`. They do not set `font-style` — the token named `-font-family-style` holds “Regular” / “Medium”, which are weights, not CSS `font-style` keywords.

M3's `--md-ref-typeface-brand` and `--md-ref-typeface-plain` tokens both default to Roboto. Large display, headline, and title-large roles use brand; smaller title, body, and label roles use plain. Noto Sans is the fallback for characters Roboto cannot cover. The framework does not ship either font file, so applications should load them or override the reference tokens.

### Semantic map

### Heading 2

### Heading 3

#### Heading 4

#### Heading 5

##### Heading 6

A paragraph uses body-large. It is for longer reading, not chrome.

Small print and figcaptions use body-small.

```html
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<p>A paragraph uses body-large.</p>
<small>Small print.</small>
```

| Element | Role | Size | Weight |
| --- | --- | --- | --- |
| `h1` | display-small | 2.25rem | 400 |
| `h2` | headline-large | 2rem | 400 |
| `h3` | headline-medium | 1.75rem | 400 |
| `h4` | headline-small | 1.5rem | 400 |
| `h5` | title-large | 1.375rem | 400 |
| `h6` | title-medium | 1rem | 500 |
| `p` | body-large | 1rem | 400 |
| `small`, `figcaption` | body-small | 0.75rem | 400 |
| `body` | body-medium | 0.875rem | 400 |

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

```html
<p class="display-large">Display Large</p>
<span class="label-large">Label</span>
```

| Class | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| `display-large` | 3.5625rem | 400 | 4rem | −0.015625rem |
| `display-medium` | 2.8125rem | 400 | 3.25rem | 0 |
| `display-small` | 2.25rem | 400 | 2.75rem | 0 |
| `headline-large` | 2rem | 400 | 2.5rem | 0 |
| `headline-medium` | 1.75rem | 400 | 2.25rem | 0 |
| `headline-small` | 1.5rem | 400 | 2rem | 0 |
| `title-large` | 1.375rem | 400 | 1.75rem | 0 |
| `title-medium` | 1rem | 500 | 1.5rem | 0.009375rem |
| `title-small` | 0.875rem | 500 | 1.25rem | 0.00625rem |
| `body-large` | 1rem | 400 | 1.5rem | 0.03125rem |
| `body-medium` | 0.875rem | 400 | 1.25rem | 0.015625rem |
| `body-small` | 0.75rem | 400 | 1rem | 0.025rem |
| `label-large` | 0.875rem | 500 | 1.25rem | 0.00625rem |
| `label-medium` | 0.75rem | 500 | 1rem | 0.03125rem |
| `label-small` | 0.6875rem | 500 | 1rem | 0.03125rem |

### Emphasis

`<em>` is italic. `<strong>` and `<b>` are weight 500 (M3 Medium). Helpers cover the rest when the tag is already taken.

*Emphasized*, **strong**, italic, bold, light, thin, underline, upper, capitalize this.

```html
<em>Emphasized</em>
<strong>strong</strong>
<span class="bold">bold</span>
<span class="upper">upper</span>
```

`large-text`, `medium-text`, and `small-text` apply the three body roles to an element that is not a `<p>` or `<small>`.

### Blockquotes

Blockquotes emphasize a quote or citation. The left bar uses `--md-sys-color-primary`.

> This is an example quotation that uses the blockquote tag. Here is another line to make it look bigger.

```html
<blockquote>
  This is an example quotation that uses the blockquote tag.
</blockquote>
```

### Flow Text

Toggle flow-text

`flow-text` scales font size with the viewport so line length stays readable. Resize the window and watch the sample change, or use the button to compare with unscaled body text.

To see Flow Text in action, slowly resize your browser and watch the size of this text body change. Use the button above to toggle flow-text off and on to see the difference.

```html
<p class="flow-text">I am Flow Text</p>
```

### Typeface tokens

Override the brand and plain reference tokens to customize the scale while preserving each role's M3 size, weight, line height, and tracking:

```css
:root {
  --md-ref-typeface-brand: "Roboto Flex";
  --md-ref-typeface-plain: "Roboto";
}
```

The default order is Roboto, Noto Sans, then the generic sans-serif family. ExpressiveCSS leaves the root font size to the browser and expresses the M3 scale in rem using the standard 16px conversion, so browser text-size preferences continue to work.

---

## State layers

The translucent overlay a component paints over itself for hover, focus, pressed and dragged.

Material 3 has no ink ripple. A state layer is the translucent wash a component paints over itself
to show that you are hovering it, that it has focus, or that you are pressing it. It is a
*foundation*: you never write markup for one. Components paint it themselves, and these tokens
decide how strong it is.

| Token | Value | Applies when |
| --- | --- | --- |
| `--md-sys-state-hover-state-layer-opacity` | 0.08 | The pointer is over the control. |
| `--md-sys-state-focus-state-layer-opacity` | 0.1 | The control has visible focus. |
| `--md-sys-state-pressed-state-layer-opacity` | 0.1 | The control is being pressed. |
| `--md-sys-state-dragged-state-layer-opacity` | 0.16 | The control is being dragged. |

#### Overriding

Set the token on `:root` to change every component, or on a subtree to change only what is inside
it. Components that expose their own state layer token read from these, so one component can be
reached without touching the rest.

```css
:root { --md-sys-state-hover-state-layer-opacity: 0.12; }
.my-panel { --md-comp-card-hover-state-layer-opacity: 0.04; }
```

Most components draw the layer as an overlay filling the control. Checkboxes and radio buttons have
no room for one, so they draw it as a ring growing out from the control's edge. Both read the same
opacity, so they stay in step.

---

# CSS components

## Badges

Notifications, counts, or status on navigation items and icons.

A `<span class="badge">` is the badge. Empty is the **small** 6dp dot; text is the **large** 16dp stadium. Nest it in the icon so it sits on the upper trailing edge of the 24dp glyph. Limit the label to four characters, including `+`. The default mapping is `error` / `on-error`.

Nesting has a consequence worth stating: **a badge inside a hidden icon is hidden with it.** `aria-hidden="true"` covers the whole subtree, and `aria-hidden="false"` on a descendant does not undo that — so a count that only exists inside a decorative icon is a count nobody hears. Two ways out, depending on what surrounds it:

- Inside a control, put the count in the control's name — `<a aria-label="Inbox, 3 unread">` — and leave the icon decorative.
- Standing alone, make the icon the image: `role="img"` with a label that includes the count.

A badge that sits in the flow beside the label, rather than inside the icon, is announced normally and needs neither.

```html
<span class="material-symbols" role="img" aria-label="Mail, unread">mail<span class="badge"></span></span>
<span class="material-symbols" role="img" aria-label="Mail, 1 unread">mail<span class="badge">1</span></span>
<span class="material-symbols" role="img" aria-label="Mail, 999+ unread">mail<span class="badge">999+</span></span>
```

### Small

Leave the badge empty. It is a 6dp circle with no label.

### Large

Put a number or short label in the badge. Height is 16dp, corners are a stadium, inset is 4dp. Use `999+` when the count is larger than 999.

### On navigation

Nest the badge in the destination icon, or leave it as a sibling — the bar and rail place a sibling on the icon’s upper trailing corner.

```html
<a href="#!" aria-label="Inbox, 3 unread">
  <span class="material-symbols" aria-hidden="true">inbox<span class="badge">3</span></span>
  Inbox
</a>
```

### In a list or navigation drawer

A trailing `.badge` in a list or drawer row stays in flow on the end.

```html
<ul class="list">
  <li>
    <span class="material-symbols" aria-hidden="true">inbox</span>
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

## Banners

A prominent message that stays in the flow of the page until the user acts on it. Offline, a failed sync, an expiring trial, a cookie choice.

Choose between the three ways of talking back by how much attention the message is entitled to. A **snackbar** is transient, floats over the page and dismisses itself after 4–10 seconds — use it to confirm something that already happened, where missing it costs nothing. A **banner** is persistent and in flow: it pushes content down and stays until the user deals with it, and the user can keep working around it meanwhile. A **dialog** blocks the page and is only right when the user cannot continue without deciding. A banner reporting a completed action should be a snackbar; a banner the user is allowed to ignore should not be a dialog. One banner at a time, at the top of the content it is about.

A `<div class="banner">` is the container and a `<p>` is the message. Everything else is optional, in this order: a leading `<span class="material-symbols">`, a `<div class="actions">` of text buttons, and a trailing `.icon-button` that closes it. Nothing is scripted — closing a banner is removing it from the page, which is the page's job.

A banner is **not** `role="banner"`. That role is the page header landmark: a page has one and may have several banners. Never write `<header class="banner">` or `role="banner"` on the container. The action row is `.actions` and never a `<nav>` — these are commands, not destinations. Icons are decoration and are `aria-hidden="true"`; the close button carries its own `aria-label`. A banner inserted while the user is on the page should carry `role="status"` so it announces itself politely; one present at load needs nothing.

```html
<div class="banner">
  <span class="material-symbols" aria-hidden="true">cloud_off</span>
  <p>You're offline. Edits are saved locally and will sync later.</p>
  <div class="actions">
    <button class="button text" type="button">Retry</button>
  </div>
  <button class="icon-button" type="button" aria-label="Dismiss">
    <span class="material-symbols" aria-hidden="true">close</span>
  </button>
</div>
```

Two colour variants and one shape modifier. Standard is the default — `surface-container` with `on-surface` text. `vibrant` is `primary-container` with `on-primary-container`, for the most important message on the screen. `square` flattens the 28dp corners for a banner running flush under an app bar — basic banners only, since Material gives the rich layout one shape and no square counterpart.

```html
<div class="banner vibrant square">
  <span class="material-symbols" aria-hidden="true">wifi_off</span>
  <p>Connection lost. Reconnecting…</p>
</div>
```

`rich` adds a heading, room for a longer message, and either a 24dp icon or an 80dp square image beside it; the actions move to a row underneath. The layout is a named grid, so the five parts can be written in any order and a missing one collapses its track. The heading may be any of `h1`–`h6`. An `<img>` needs an `alt` — descriptive when it says something the heading and message do not, empty when it is decoration.

```html
<div class="banner rich vibrant">
  <img src="/photo-book.jpg" alt="">
  <h3>Your photo book is ready</h3>
  <p>Twenty-four pages, printed and bound. It ships within two business days once you approve the proof.</p>
  <div class="actions">
    <button class="button text" type="button">View proof</button>
  </div>
  <button class="icon-button" type="button" aria-label="Dismiss">
    <span class="material-symbols" aria-hidden="true">close</span>
  </button>
</div>
```

Tokens follow M3 Expressive `md.comp.banners.*`. The basic row is 56dp tall with 4dp insets, a 48dp icon container around a 24dp icon, `body-medium` text with 14dp above and below, and actions 8dp apart. Below 600dp the actions take their own line and the row grows to 112dp. The rich layout has 12dp insets, a title at `body-medium` weight 500, and its actions 12dp under the message. Set `--md-comp-banners-color`, `--md-comp-banners-body-text-color`, `--md-comp-banners-title-text-color`, `--md-comp-banners-icon-color` and `--md-comp-banners-close-button-color` for colour; the geometry tokens are `--md-comp-banners-basic-*` and `--md-comp-banners-rich-*`.

---

## Breadcrumbs

Show the current location when the page sits several layers deep.

Breadcrumbs are a good way to display your current location. This is usually used when you have multiple layers of content.

### Basic

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/library">Library</a></li>
    <li><a href="/library/data" aria-current="page">Data</a></li>
  </ol>
</nav>
```

### Navbar style

```html
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/library">Library</a></li>
      <li><a href="/library/data" aria-current="page">Data</a></li>
    </ol>
  </nav>
</header>
```

---

## Buttons

Material Design 3 common buttons, icon buttons, and FABs — from the HTML.

A `<button>` is a filled common button. An `<a class="button">` is the same thing for a link — on an anchor the class is `button`; the older `.btn` spelling only ever worked on a `<button>`, which is styled as one anyway. Put a `<span class="material-symbols" aria-hidden="true">` icon before or after the label and wrap the label in its own `<span>` — there is no `icon-left` / `icon-right` class, the order of the two spans is the placement. Add `circle` for a 40dp icon button, and give it an `aria-label`: the icon is hidden, so it is the only name the button would have.

Two independent axes dress it: a style (`filled`, `tonal`, `outlined`, `elevated`, `text`) and a size (`xsmall` through `xlarge`). Any style combines with any size — nine classes, not twenty-five, because the size sets the geometry and the style sets the color.

Tokens follow the [M3 button spec](https://m3.material.io/components/buttons/specs). The default is the small size: 40dp tall, label `label-large`, fully round corners, a 20dp icon on an 8dp gap, and a symmetric 16dp inset. State layers are 8% hover and 10% focus or press. Disabled is `on-surface` at 38% on a 12% container.

Create Create Send

```html
<button>Create</button>
<button>
  <span class="material-symbols" aria-hidden="true">add</span><span>Create</span>
</button>
<button>
  <span>Send</span><span class="material-symbols" aria-hidden="true">send</span>
</button>
<button class="circle" aria-label="Add">
  <span class="material-symbols" aria-hidden="true">add</span>
</button>

<a class="button" href="#!">Link</a>
```

### Filled

High emphasis. This is the default — the main action on a page. Container `primary`, label `on-primary`, no elevation. It has a class of its own, `filled`, so the style axis reads as five names rather than four and a silence; writing it changes nothing.

Create Create Link

```html
<button>Create</button>
<button class="filled">Create</button>
<button>
  <span class="material-symbols" aria-hidden="true">add</span><span>Create</span>
</button>
<a class="button" href="#!">Link</a>
```

### Tonal

Medium emphasis. Add `tonal`. Container `secondary-container`, label `on-secondary-container`.

Create Create

```html
<button class="tonal">Create</button>
<button class="tonal">
  <span class="material-symbols" aria-hidden="true">add</span><span>Create</span>
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

`.icon-button` is its own component, documented below. `circle` on a common button is the older 40dp icon button and still works: default is filled, `text` is the standard (transparent) one, `tonal` and `outlined` match the common-button colors.

```html
<button class="circle" aria-label="Add">
  <span class="material-symbols" aria-hidden="true">add</span>
</button>
<button class="circle tonal" aria-label="Add">…</button>
<button class="circle outlined" aria-label="Add">…</button>
<button class="circle text" aria-label="Add">…</button>
```

### Floating

A FAB is `circle extra` or `circle large`: 56dp, 16dp corners, `primary-container`, elevation 3. The sizes are `circle extra small` (40dp, 12dp corners), `circle extra medium` (80dp, 20dp corners, 26dp icon) and `circle extra large` (96dp, 28dp corners, 36dp icon) — the large size needs the `extra`, because `circle large` on its own is the alias for the default 56dp FAB. `extend` is the extended FAB — icon plus label at 56dp, 16dp corners, 8dp between icon and label. Its sizes are `extend small` (56dp on a symmetric 16dp inset, `title-medium` label), `extend medium` (80dp, 20dp corners, 28dp icon, `title-large`) and `extend large` (96dp, 28dp corners, 36dp icon, `headline-small`); a sizeless `extend` keeps M3's base 16dp / 20dp inset and a `label-large` label. Its container colour is a role: `primary-container` is the default, and `secondary-container` and `tertiary-container` recolour the label and the state layers with it. On an `<a>`, add `button` — the size classes only match `button` or `a.button`.

Create

```html
<button class="circle extra" aria-label="Add">
  <span class="material-symbols" aria-hidden="true">add</span>
</button>
<a class="button circle extra small" href="#!" aria-label="Add">
  <span class="material-symbols" aria-hidden="true">add</span>
</a>
<button class="circle extra medium" aria-label="Add">
  <span class="material-symbols" aria-hidden="true">add</span>
</button>
<button class="circle extra large" aria-label="Add">
  <span class="material-symbols" aria-hidden="true">add</span>
</button>
<button class="extend">
  <span class="material-symbols" aria-hidden="true">add</span><span>Create</span>
</button>
<button class="extend small">
  <span class="material-symbols" aria-hidden="true">add</span><span>Create</span>
</button>
<button class="extend medium">
  <span class="material-symbols" aria-hidden="true">add</span><span>Create</span>
</button>
<button class="extend large secondary-container">
  <span class="material-symbols" aria-hidden="true">add</span><span>Create</span>
</button>
```

### Sizes

Five sizes. `small` is the default at 40dp with a 20dp icon, so it needs no class. The rest are `xsmall` (32dp, 20dp icon), `medium` (56dp, 24dp, `title-medium` label), `large` (96dp, 32dp, `headline-small`) and `xlarge` (136dp, 40dp, `headline-large`). The inset and the icon gap grow with the size, and an `outlined` button's border thickens with it — 1dp up to medium, 2dp large, 3dp extra large. `extra` is the pre-1.0 name for the 56dp button and still gives you that geometry, though not `medium`'s bigger label — it never carried one. The ladder is the common button's: `circle` is the older 40dp icon-button shape with its own 24dp icon, and `circle extra` / `circle large` are FAB sizes, which have their own.

Extra small Small Medium Large Extra large

```html
<button class="xsmall">Extra small</button>
<button>Small</button>
<button class="medium">Medium</button>
<button class="large">Large</button>
<button class="xlarge">Extra large</button>
```

The two axes are written side by side — there is no per-combination class, so anything on one list goes with anything on the other.

```html
<button class="tonal medium">Tonal medium</button>
<button class="outlined xsmall">Outlined extra small</button>
<button class="text medium">Text medium</button>
```

For a form submit, use a real `<button type="submit">` rather than an input.

Submit

```html
<button type="submit">
  <span>Submit</span><span class="material-symbols" aria-hidden="true">send</span>
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

## Icon buttons

One action as one icon. Add `icon-button` to a `<button>`, or to an `<a>` when it navigates, and put a single `<span class="material-symbols" aria-hidden="true">` inside. The icon is hidden, so `aria-label` is the only name the control has — an icon button without one fails the semantics suite.

It is a component, not a modifier on the common button: M3 gives it its own token families (`md.comp.icon-button.{xsmall…xlarge}` and `md.comp.icon-button-{standard,filled,tonal,outlined}`), so `.icon-button` takes none of the common-button geometry. Do not write `class="button icon-button"`.

```html
<button type="button" class="icon-button" aria-label="Add">
  <span class="material-symbols" aria-hidden="true">add</span>
</button>

<a class="icon-button" href="/inbox" aria-label="Inbox">
  <span class="material-symbols" aria-hidden="true">inbox</span>
</a>
```

### Styles

Four, and the modifier names are the common button's. Standard is the default — no container, `on-surface-variant` icon. `filled` is `primary` / `on-primary`, `tonal` is `secondary-container` / `on-secondary-container`, `outlined` is an `outline-variant` border with no fill. M3 gives icon buttons no elevated style, and `text` is what standard already is, so neither class exists here.

```html
<button type="button" class="icon-button filled" aria-label="Add">…</button>
<button type="button" class="icon-button tonal" aria-label="Add">…</button>
<button type="button" class="icon-button outlined" aria-label="Add">…</button>
```

### Sizes, width and shape

Five sizes: `xsmall` (32dp container, 20dp icon), the default 40dp/24dp needing no class, `medium` (56/24), `large` (96/32) and `xlarge` (136/40). They compose with the styles.

Width is the inset plus the icon rather than a size of its own, which is why every size's default width equals its height. `narrow` tightens the inset, `wide` opens it up, and both follow whichever size they are on.

`square` swaps the round container for the squared one — a 12dp corner on the two small sizes, 16dp on medium, 28dp on the two large ones. Either shape tightens its corner while pressed; that morph is Material 3 Expressive's, and it is CSS, with no script behind it.

```html
<button type="button" class="icon-button tonal large" aria-label="Add">…</button>
<button type="button" class="icon-button medium narrow" aria-label="Add">…</button>
<button type="button" class="icon-button filled square" aria-label="Add">…</button>
```

### Disabled and tokens

`disabled` on the `<button>`: the icon drops to `on-surface` at 38%, and a style with a container drops that to 10%. An `<a href>` cannot be disabled and no class makes it so — `pointer-events: none` stops the pointer only, leaving the link in the tab order and still navigable by Enter. Drop the `href`, or the link. `aria-disabled="true"` gets the same painting for an element that must stay put and announce itself as unavailable.

Every value is a `--md-comp-icon-button-*` custom property — `container-height`, `icon-size`, `leading-space`, `trailing-space`, `narrow-space`, `wide-space`, `container-shape`, `container-shape-square`, `pressed-container-shape`, `outline-width`, `color`, `container-color`. The size classes are nothing but a block of those values, so overriding them is how you write a size of your own. The state layer is the icon colour mixed into the container at the `md.sys.state` opacity, so a new style is two tokens.

```html
<button type="button" class="icon-button filled" style="--md-comp-icon-button-container-height: 48px" aria-label="Add">
  <span class="material-symbols" aria-hidden="true">add</span>
</button>
```

---

## Segmented buttons

Two to five connected options in one outlined pill — a view switcher, a date range, a filter over a chart. Beyond five use a select or chips.

The root is a `<fieldset class="segmented-button">` with a `<legend>`. Each segment is an `<input>` and the `<label class="segment">` beside it, tied by `id` and `for`. Radios make the group single-select, checkboxes make it multi-select; the input type is the entire difference. There is no plugin, nothing to initialize, and no selected class to keep in sync — the input holds the state and the form value, `checked` states the initial one, and the browser moves it from there. Never write `aria-checked`, `aria-selected` or `aria-pressed` on a segment: that is a second answer nothing updates.

The control is the label's sibling rather than its child, the same way a filter chip is written. A `<label>` wrapping a radio or a checkbox *is* one to the rest of the framework, and gets painted as one — a 20dp ring on the control and a 48dp row around it.

The legend is the group's accessible name and is not shown; Material 3's anatomy has no visible group label. There is no modifier that shows it — the root is both the fieldset and the grid of segments, so a legend back in flow becomes another column beside them. When the group needs a visible label, write one before the fieldset and leave the legend saying the same thing.

```html
<fieldset class="segmented-button">
  <legend>View</legend>
  <input type="radio" id="view-day" name="view" value="day" checked>
  <label class="segment" for="view-day">Day</label>
  <input type="radio" id="view-week" name="view" value="week">
  <label class="segment" for="view-week">Week</label>
  <input type="radio" id="view-month" name="view" value="month">
  <label class="segment" for="view-month">Month</label>
</fieldset>
```

Multi-select is the same markup with checkboxes. Any number of segments can be on at once, and each is its own Tab stop.

```html
<fieldset class="segmented-button">
  <legend>Filter transport</legend>
  <input type="checkbox" id="transport-walk" name="transport" value="walk" checked>
  <label class="segment" for="transport-walk">Walk</label>
  <input type="checkbox" id="transport-bike" name="transport" value="bike">
  <label class="segment" for="transport-bike">Bike</label>
</fieldset>
```

An optional 18dp icon goes in the label, before or after the text. The segment's text is its name, so the icon is `aria-hidden`. M3 shows a check on the chosen segment — write that icon yourself if you want it; nothing swaps it in.

```html
<fieldset class="segmented-button">
  <legend>Map layer</legend>
  <input type="radio" id="layer-map" name="layer" value="map" checked>
  <label class="segment" for="layer-map">
    <span class="material-symbols" aria-hidden="true">map</span>
    Map
  </label>
  <input type="radio" id="layer-satellite" name="layer" value="satellite">
  <label class="segment" for="layer-satellite">
    <span class="material-symbols" aria-hidden="true">satellite_alt</span>
    Satellite
  </label>
</fieldset>
```

`disabled` on one input greys that segment; on the `<fieldset>` it greys the group, outline included.

The role is *rejected*, not withheld. A composite role such as `radiogroup` promises arrow-key navigation, and a fieldset of radios already is one — the browser implements the keyboard model — so writing the role by hand restates the element and costs you the fieldset's group role. No composite role is accepted on the group. That is why the markup has to stay native, and why `SEMANTICS.md` enforces the fieldset, the label, the input, and the shared `name` the arrow keys come from.

The group is a grid of equal columns filling the width it is given, as Material specifies. Constrain it with a width or a wrapper when it should be narrower than its container.

| Token | Default |
| --- | --- |
| `--md-comp-outlined-segmented-button-container-height` | 40px |
| `--md-comp-outlined-segmented-button-container-shape` | 9999px |
| `--md-comp-outlined-segmented-button-outline-width` | 1px |
| `--md-comp-outlined-segmented-button-outline-color` | `--md-sys-color-outline` |
| `--md-comp-outlined-segmented-button-leading-space` | 12px |
| `--md-comp-outlined-segmented-button-trailing-space` | 12px |
| `--md-comp-outlined-segmented-button-icon-size` | 18px |
| `--md-comp-outlined-segmented-button-icon-label-space` | 8px |
| `--md-comp-outlined-segmented-button-label-text-color` | `--md-sys-color-on-surface` |
| `--md-comp-outlined-segmented-button-selected-container-color` | `--md-sys-color-secondary-container` |
| `--md-comp-outlined-segmented-button-selected-label-text-color` | `--md-sys-color-on-secondary-container` |

---

## Button groups

A row of related actions that reads as one control without becoming one — a formatting row, a set of view actions, a player's transport. The root is a `<div class="button-group">` and the items are ordinary buttons or icon buttons written directly inside it. Nothing is scripted and nothing is selected: each item is its own Tab stop and does its own thing. When two to five options answer one question, that is a segmented button, whose `<input>` holds the answer.

Items are controls and direct children — a `<button>`, or an `<a href>` when it navigates. A wrapper element around them loses both the gap and the connected corners, which are written against direct children. An icon-only item carries its own `aria-label`, since the icon is `aria-hidden`.

```html
<div class="button-group">
  <button class="button tonal">
    <span class="material-symbols" aria-hidden="true">format_bold</span>
    Bold
  </button>
  <button class="button tonal">
    <span class="material-symbols" aria-hidden="true">format_italic</span>
    Italic
  </button>
</div>
```

Standard is the default: every item keeps its own round shape, the gap closes as the buttons grow (18dp at `xsmall` down to 8dp at the three largest), and pressing an item widens it.

Add `connected` for the second variant. Items sit 2dp apart at every size, the ends of the row stay fully round and the joins are squared off; pressing an item squares its inner corners further — 8dp to 4dp at the three smaller sizes, 16dp to 12dp at `large`, 20dp to 16dp at `xlarge`. A connected group has no selected state: M3 draws one, and holding it takes a control that remembers the answer, which is the segmented button.

```html
<div class="button-group connected">
  <button class="button tonal" aria-label="Align left">
    <span class="material-symbols" aria-hidden="true">format_align_left</span>
  </button>
  <button class="button tonal" aria-label="Align center">
    <span class="material-symbols" aria-hidden="true">format_align_center</span>
  </button>
</div>
```

The five button sizes — `xsmall`, `small` (the default), `medium`, `large`, `xlarge` — are written once, on the group. It sets the button tokens its items inherit, so an item needs no size class of its own; one that carries one anyway still wins for itself.

The group declares no role. A composite role such as `toolbar` promises arrow-key navigation, and this component *rejects* it rather than withholding it: its buttons are independent commands reached with Tab. When the group needs a name, give it `role="group"` and an `aria-label` — a grouping and nothing more, so it promises no keyboard contract.

```html
<div class="button-group medium" role="group" aria-label="Text style">
  <button class="button">One</button>
  <button class="button">Two</button>
</div>
```

| Token | Default |
| --- | --- |
| `--md-comp-button-group-between-space` | 12px |
| `--md-comp-button-group-pressed-item-width-multiplier` | .15 |
| `--md-comp-button-group-container-shape` | 9999px (connected) |
| `--md-comp-button-group-inner-corner-corner-size` | 8px (connected) |
| `--md-comp-button-group-pressed-inner-corner-corner-size` | 4px (connected) |

The items are buttons, so their height, insets and colours come from the button tokens, which the group's size class sets for them. M3 states the press-time growth as 15% of the item's width; CSS cannot multiply a length by a percentage, so the token holds the same figure as a ratio and the growth is taken from the item's height, and the items beside the pressed one slide rather than compress.

---

## Cards

Material Design 3 cards, from the HTML.

An `<article>` is an elevated card. Any heading is the headline, `<p class="subhead">` is the optional subhead, `<p class="supporting-text">` is supporting copy, direct `<img>`, `<picture>`, or `<figure>` is media, and direct `<div class="actions">` is the action row. Include only the slots the content needs. There is no `card-content`, `card-title`, `card-action`, `card` or `card-panel` class — the element is the component. The action row is not a `<nav>`: a row of buttons is not a set of destinations, and one landmark per card floods the landmark list.

Tokens follow the [M3 card spec](https://m3.material.io/components/cards/specs). The elevated container is `surface-container-low` with 12dp corners. The default sits at elevation 1; an interactive card rises to 2 on hover. The headline is `title-medium` / `on-surface`, the subhead is `title-small` / `on-surface`, and supporting text is `body-medium` / `on-surface-variant`. Inset is 16dp.

### Card title

I am a very simple card. I am good at containing small bits of information. I am convenient because I require little markup to use effectively.

```html
<article>
  <header>
    <h3>Weekend in the mountains</h3>
    <p class="subhead">Three-day itinerary</p>
  </header>
  <p class="supporting-text">Explore trails and overlooks.</p>
  <img src="images/mountains.jpg" alt="Mountain valley beneath a cloudy sky">
  <div class="actions">
    <button type="button" class="text">Share</button>
    <button type="button" class="tonal">View trip</button>
  </div>
</article>
```

### Variants

Default is elevated. `filled` uses `surface-container-highest` at rest (no shadow). `outlined` (or `border`) draws a 1dp `outline-variant` stroke over `surface`.

### Elevated

Surface-container-low, elevation 1.

### Filled

Surface-container-highest, no elevation.

### Outlined

Surface plus a 1dp outline.

```html
<article>…</article>
<article class="filled">…</article>
<article class="outlined">…</article>
```

### Primary action and states

A static card has no hover treatment. To make the card an entry point, wrap its primary content in a direct `<a class="primary-action">`. That gives the card M3 hover, focus, pressed, and focus-indicator states while keeping secondary buttons outside the link. Toggle `dragged` during reordering, or put `aria-disabled="true"` on the primary action for the disabled appearance.

```html
<article>
  <a class="primary-action" href="/reservation/42">
    <h3>Upcoming reservation</h3>
    <p>Open the reservation details.</p>
  </a>
  <div class="actions">
    <button type="button" class="text">Share</button>
  </div>
</article>
```

### Collections

`card-collection` creates a responsive grid with no more than 8dp between cards. Every card is coplanar at rest; add `picked-up` or `dragged` only while it is being moved. Add `list`, `staggered`, `mosaic`, or `carousel uncontained` for the other collection layouts. Sorting and filtering controls stay outside the collection.

```html
<!-- Responsive grid (the default). Override the track token as needed. -->
<section class="card-collection" aria-label="Dinner menu">
  <article class="outlined">…</article>
  <article class="outlined">…</article>
</section>

<!-- List -->
<section class="card-collection list" aria-label="Dinner menu">
  <article class="outlined"><h3>Pho</h3><p>$12</p></article>
  <article class="outlined"><h3>Quinoa Salad</h3><p>$10</p></article>
</section>

<!-- Intrinsic-height staggered grid -->
<section class="card-collection staggered" aria-label="Dinner menu">
  <article class="outlined"><h3>Pho</h3><p>$12</p></article>
  <article class="outlined"><h3>Combo #2</h3><p>Two entrées, three sides, and two drinks · $28</p></article>
</section>

<!-- Dense mosaic. Set spans per card from application data. -->
<section class="card-collection mosaic" aria-label="Dinner menu">
  <article style="--md-comp-card-collection-row-span: 3">…</article>
  <article style="--md-comp-card-collection-column-span: 2; --md-comp-card-collection-row-span: 4">…</article>
</section>

<!-- M3 uncontained carousel. AutoInit starts the Carousel component. -->
<section class="card-collection carousel uncontained" aria-label="Dinner menu">
  <article class="outlined carousel-item"><h3>Pho</h3><p>$12</p></article>
  <article class="outlined carousel-item"><h3>Quinoa Salad</h3><p>$10</p></article>
</section>
```

### Media

A direct `<img>` is full-bleed across the top and its media surface has rounded corners matching the card. Wrap it in a `<figure>` if you want a caption on the image. The `<figcaption>` is an opaque, rounded bounding shape using the paired `surface` and `on-surface` roles, so image colors cannot reduce the contrast of its text or icons. Normal text must retain at least 4.5:1 contrast; large text and meaningful icons require at least 3:1. Recheck those ratios if you override either color token.

I am a very simple card. I am good at containing small bits of information.

```html
<article>
  <figure>
    <img src="images/sample-1.jpg" alt="">
    <figcaption>
      <span class="material-symbols" aria-hidden="true">landscape</span>
      <span>Card title</span>
    </figcaption>
  </figure>
  <p>I am a very simple card.</p>
  <div class="actions">
    <button type="button" class="text">Action</button>
  </div>
</article>
```

### Horizontal

The same card can use two orientations without changing its content order. Add `horizontal` to move the media to the start and stack the headline, supporting text, and action beside it.

```html
<!-- Vertical -->
<article class="outlined">
  <img src="images/the-hideout.jpg" alt="Musician playing guitar during a live performance">
  <h3>Performances at The Hideout</h3>
  <p>Watch exclusive live performances at The Hideout every Saturday starting at 7pm.</p>
  <div class="actions">
    <button type="button" class="tonal">Get tickets</button>
  </div>
</article>

<!-- Horizontal: only the orientation class changes. -->
<article class="outlined horizontal">
  <img src="images/the-hideout.jpg" alt="Musician playing guitar during a live performance">
  <h3>Performances at The Hideout</h3>
  <p>Watch exclusive live performances at The Hideout every Saturday starting at 7pm.</p>
  <div class="actions">
    <button type="button" class="tonal">Get tickets</button>
  </div>
</article>
```

### Reveal

An `<aside>` expands in normal flow below the persistent media, headline, and subhead. Place a `.card-reveal-trigger.activator` button over the media; the same button opens and closes the details. `Cards.Init()` (and `AutoInit()` on an `<article>` containing an `<aside>`) wires up `aria-expanded`, Enter, and Space. The reveal grows the card instead of covering or internally scrolling it. A first heading inside the aside remains an optional close target.

### Card titlemore_vert

This is a link

### closeCard title

Here is some more information about this product that is only revealed once clicked on.

```html
<article class="filled">
  <figure>
    <img src="images/ana-russo.jpg" alt="Portrait of Ana Russo">
    <button type="button" class="card-reveal-trigger activator" aria-label="Toggle contact details" aria-controls="ana-contact" aria-expanded="false"></button>
  </figure>
  <header class="card-reveal-summary">
    <h3>Ana Russo</h3>
    <p class="subhead">Sibling</p>
  </header>
  <aside id="ana-contact" aria-expanded="false">
    <address class="reveal-actions">
      <a class="reveal-action" href="tel:+16505551234">
        <span class="material-symbols" aria-hidden="true">call</span>
        <span>(650) 555-1234</span>
      </a>
      <a class="reveal-action" href="mailto:hey@anarusso.com">
        <span class="material-symbols" aria-hidden="true">mail</span>
        <span>hey@anarusso.com</span>
      </a>
    </address>
  </aside>
</article>
```

### Expanding card

An expanding card performs a shared-container transition from a compact feed item into a full-screen modal detail surface. Use an `<article class="expanding-card">` with a direct `<dialog class="expanding-card-dialog">`. Keep the same hero image in both states so the media appears to grow with the container. `ExpandingCard.Init()` and `AutoInit()` wire up the modal, measured clip origin, back action, focus return, Escape, and reduced motion.

```html
<article class="outlined expanding-card">
  <figure>
    <img src="images/glass-souls.jpg" alt="Pastel balloons floating above flowers">
    <button type="button" class="expanding-card-trigger" aria-label="Open Glass Souls album" aria-haspopup="dialog"></button>
  </figure>
  <header class="expanding-card-summary">
    <h3>Listen to Glass Souls</h3>
    <p class="subhead">From your recent favorites</p>
  </header>
  <dialog id="glass-souls-card" class="expanding-card-dialog" aria-labelledby="glass-souls-title">
    <button type="button" class="expanding-card-close" aria-label="Back"><span class="material-symbols" aria-hidden="true">arrow_back</span></button>
    <figure class="expanding-card-hero">
      <img src="images/glass-souls.jpg" alt="Pastel balloons floating above flowers">
    </figure>
    <div class="expanding-card-content">
      <header class="expanding-card-detail-header">
        <h2 id="glass-souls-title">Glass Souls’ Biggest Hits</h2>
        <div class="expanding-card-actions">
          <button type="button" class="expanding-card-favorite" aria-label="Favorite album"><span class="material-symbols" aria-hidden="true">favorite</span></button>
          <button type="button" class="expanding-card-play" aria-label="Play album"><span class="material-symbols" aria-hidden="true">play_arrow</span></button>
        </div>
      </header>
      <div class="expanding-card-track">
        <strong>Fragile</strong><small>Glass Souls</small><time datetime="PT3M34S">3:34</time>
      </div>
    </div>
  </dialog>
</article>
```

### Sizes

`small`, `medium`, and `large` lock the height at 300px, 400px, and 500px so a row of cards lines up. Media takes the top 60%; the action row sticks to the bottom. These sizes are not in the M3 spec — they are optional layout helpers.

### Small

The small card is 300px tall.

```html
<article class="small">…</article>
<article class="medium">…</article>
<article class="large">…</article>
```

---

## Carousel

A Material 3 adaptive carousel for visual collections.

The default is multi-browse: one large, one medium, and one small item adapt as the active item changes. `AutoInit()` starts every `.carousel` except those marked `no-autoinit`. Give the container an accessible name and every direct item the `carousel-item` class.

```html
<div class="carousel" aria-label="Featured landscapes">
  <a class="carousel-item" href="mountain-lake.html">
    <img src="images/mountain-lake.jpg" alt="Mountain lake">
    <span class="carousel-item-content">Mountain lake</span>
  </a>
  <a class="carousel-item" href="forest-path.html">
    <img src="images/forest-path.jpg" alt="Forest path">
    <span class="carousel-item-content">Forest path</span>
  </a>
  <a class="carousel-item" href="rocky-coastline.html">
    <img src="images/rocky-coastline.jpg" alt="Rocky coastline">
    <span class="carousel-item-content">Rocky coastline</span>
  </a>
</div>
<div class="mt-1"><a class="button text" href="all-landscapes.html">Show all</a></div>
```

The text treatment is an opaque `surface` / `on-surface` bounding shape, so its contrast does not depend on the image. Keep item text brief and avoid more than two lines at compact widths. The component uses 8dp gaps, 16dp inline padding, 8dp block padding, 28dp corners, and 40–56dp small items.

### Layouts

| Layout | Class | Use |
| --- | --- | --- |
| Multi-browse | `.carousel` | Many simple visual items; snap-scrolling. |
| Uncontained | `.carousel.uncontained` | Text-heavy or customized equal-width items; free scrolling. Add `.snap` to snap. |
| Multi-aspect uncontained | `.carousel.uncontained.multi-aspect` | Sources that genuinely range from 9:16 to 16:9. Set `--md-comp-carousel-item-aspect-ratio` per item. |
| Hero | `.carousel.hero` | One large visual and one 40–56dp preview; snap-scrolling. |
| Center-aligned hero | `.carousel.hero.center-aligned` | One centered large visual and two previews. |
| Full-screen | `.carousel.full-screen` | Vertical immersive feed in portrait compact and medium layouts only. |

```html
<div class="carousel uncontained" aria-label="Travel stories">…</div>
<div class="carousel hero" aria-label="Featured destinations">…</div>
<div class="carousel hero center-aligned" aria-label="Featured destinations">…</div>
<div class="carousel full-screen" aria-label="Featured stories">…</div>
```

Multi-browse, hero, and full-screen snap. Uncontained uses free scrolling unless `snap` is added. The rendered container width fits two, three, or four large items at medium, large, and extra-large widths, including pane-only resizes. Fine pointers can drag the track while trackpads keep native scrolling. Full-screen is vertical and edge-to-edge in portrait compact and medium layouts, then automatically adapts to a horizontal hero in landscape or at expanded widths.

On a vertically scrolling page, put a **Show all** action 4dp below every horizontal carousel. It should open a normal vertically scrolling view of the same items. If there is a heading, a 48dp arrow action may sit beside the heading instead. Do not overlay previous/next controls or place them beside the carousel edges.

Focus starts on the first item rather than the container. Left/right arrows move through horizontal items. Up/down arrows move through portrait full-screen items and otherwise leave the carousel. Home/End move to the first/last item. Reduced-motion mode removes parallax and size morphing, uses equal widths, and disables smooth scrolling.

### Tokens

| Token | Default |
| --- | --- |
| `--md-comp-carousel-height` | 240px compact; 320px medium; 360px expanded |
| `--md-comp-carousel-shape` | 28px |
| `--md-comp-carousel-pressed-shape` | 20px |
| `--md-comp-carousel-gap` | 8px |
| `--md-comp-carousel-inline-padding` | 16px |
| `--md-comp-carousel-block-padding` | 8px |
| `--md-comp-carousel-large-item-width` | Responsive, capped by layout |
| `--md-comp-carousel-medium-item-width` | Responsive |
| `--md-comp-carousel-small-item-min-width` | 40px |
| `--md-comp-carousel-small-item-max-width` | 56px |
| `--md-comp-carousel-uncontained-item-width` | `min(78%, 320px)` |
| `--md-comp-carousel-item-aspect-ratio` | Per item, multi-aspect only |

The older `--carousel-height` author hook is still read.

### Initialization

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.carousel');
  const instances = Expressive.Carousel.init(elems);
});
```

```js
Expressive.AutoInit(document.body, {
  Carousel: {
    i18n: { carousel: 'Galería', item: 'Elemento', of: 'de' }
  }
});
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `duration` | Number | `200` | Programmatic scroll timing and legacy coverflow tween, in milliseconds. |
| `fullWidth` | Boolean | `false` | Full-width compatibility layout used by swipeable tabs. Prefer an M3 layout class for new carousels. |
| `indicators` | Boolean | `false` | Legacy paging dots. M3 recommends a nearby Show all path instead of overlay controls. |
| `noWrap` | Boolean | `false` | End behavior for legacy coverflow. M3 tracks always stop at their ends. |
| `interval` | Number | `0` | Milliseconds to rest between automatic advances, on top of `duration`; a full cycle takes `duration + interval`. `0` leaves auto-advance off. Each rest is armed by the move before it, so a rest ending mid-tween on legacy coverflow buys another whole rest. |
| `height` | Number | `null` | Fixed track height in pixels. `null` sizes the carousel from its content. |
| `onCycleTo` | Function | `null` | Called when the active item changes. |
| `i18n` | Object | `{ carousel: 'Carousel', item: 'Item', of: 'of', indicators: 'Slides', slide: 'Slide' }` | Generated accessible label strings. `indicators` names the indicator row and `slide` prefixes each dot, giving "Slide 1". Partial objects are merged with the defaults. |
| `dist`, `shift`, `padding`, `numVisible` | Number | Legacy | Used only by the explicit `.coverflow` compatibility layout. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Carousel.getInstance(elem);
```

`next()` and `prev()` move one item or an optional item count. `set(index, callback)` moves to a zero-based item index. `pause()` and `start()` stop and resume auto-advance, and do nothing without an `interval`. `destroy()` removes generated labels, size roles, indicators, listeners, the scroll-track wrapper, and the auto-advance timer.

```js
instance.next();
instance.prev(3);
instance.set(3);
instance.pause();
instance.start();
instance.destroy();
```

An `interval` makes the carousel advance on its own, so the pause contract is
mandatory: it always pauses on hover, on focus within, and while the tab is
hidden, and `prefers-reduced-motion: reduce` suppresses auto-advance entirely.
No option disables any of that. An explicit `noWrap: true` stops auto-advance
after one pass instead of looping; every native track forces `noWrap` for the
arrow keys, and the timer reads the author's own value rather than that one. A
`height` gives the indicators their own row below the track (`.fixed-height`)
instead of laying them over the media; markup can do the same by carrying
`.fixed-height` and setting `--carousel-height`.

### Properties

| Name | Type | Description |
| --- | --- | --- |
| `el` | Element | The DOM element the plugin was initialized with. |
| `options` | Object | The options the instance was initialized with. |
| `center` | Number | The index of the center item. |

---

## Drag handle

The bar that makes something legible as draggable: a bottom sheet's grabber, the gutter between two panes, the grip on a reorderable row.

Which element you write *is* the semantic. A `<span class="drag-handle" aria-hidden="true">` is decoration and is the usual case — the handle draws a bar and contains no text, so exposed it arrives in the reading order as an unlabelled blank. A `<button class="drag-handle">` with an `aria-label` is a control, written only when activating it does something — inside a bottom sheet it always does, and everywhere else that is the page's to arrange. Never `aria-hidden` a button: that hides it from assistive technology without taking it out of the tab order. The hover, focus and pressed states are scoped to the button spelling, so a decorative handle does not light up under a passing pointer.

**Nothing here drags.** No script belongs to this component and ExpressiveCSS ships no reordering behaviour. The one thing a handle is wired to is the bottom sheet's, below. Dragging is a pointer gesture, so an outcome reachable only by dragging is unreachable without a pointer: reordering built on a handle needs a keyboard path of its own — arrow keys on the focused row, a "Move up" / "Move down" pair in a menu, or a field taking the position directly. The handle makes the gesture discoverable; it does not make the outcome reachable.

The two-column layout is the page's own — a flex or grid row, or a pane layout. The handle is what sits between the columns and needs no wrapper class of its own.

```html
<section aria-label="Editor">…</section>
<span class="drag-handle" aria-hidden="true"></span>
<section aria-label="Preview">…</section>
```

Material tokenised the *vertical* handle — a 4×48dp bar in a 24dp hit target, `outline`, swelling to 12×52dp on a 12dp corner in `on-surface` while held. That is what `.drag-handle` draws. The container is sized to the pressed bar, so holding it moves nothing beside it. `cursor: grab` is the default; a splitter that resizes reads better as `cursor: col-resize`, which is one declaration of your own.

On a bottom sheet the same class takes the sheet's grabber instead — a horizontal 32×4dp bar at 40% `on-surface-variant`, which is Material's own separate size and colour for that slot. Decoration is the default and is enough: dragging the sheet down dismisses it and <kbd>Esc</kbd> already does the same from the keyboard, so the bar sits on top of a path that exists without it. Write a `<button>` there instead when you want a visible dismiss control — activating it closes the sheet, by pointer or by <kbd>Enter</kbd>, and a drag that snaps back does not also dismiss because the click ending a drag is told apart from a tap. This is the only place a drag handle is wired to anything. `.handle` is the pre-1.0 spelling and still works, decorative or wired.

```html
<dialog class="bottom-sheet" aria-labelledby="sheet-title">
  <span class="drag-handle" aria-hidden="true"></span>
  <h2 id="sheet-title">Share</h2>
</dialog>
```

Tokens are `--md-comp-drag-handle-{container-width,width,height,shape,color}` and the `pressed-*` and `state-layer-color` set. Inside a bottom sheet none of them apply; `--md-comp-bottom-sheet-drag-handle-color` does.

---

## Lists

Continuous, vertical indexes of text and images. Use a list so people can find an item and act on it. There is no JavaScript — the HTML is the component.

The leading visual is the first icon, `<img>`, or `<input>`. The trailing action is the last icon, `<kbd>`, `<button>`, `<time>`, or `.meta`. A following `<p>` is supporting text. Mark the current row with `active` or `selected` — **not** `aria-selected`, which is not valid on a plain `listitem` and needs a role (`option`, `tab`, `row`, `treeitem`) that brings a keyboard contract with it.

Two variants: standard (the default) and `segmented`.

### Standard

Transparent rows. The selected item is a pill in `secondary-container`. The leading icon fills when the row is selected.

```html
<ul class="list">
  <li>
    <span class="material-symbols" aria-hidden="true">star</span>
    List item
    <kbd>⌘C</kbd>
  </li>
  <li class="selected">
    <span class="material-symbols" aria-hidden="true">star</span>
    List item
    <kbd>⌘C</kbd>
  </li>
</ul>
```

### Segmented

Add `segmented`. Every row is a rounded tile; the selected tile uses the same `secondary-container` fill.

```html
<ul class="list segmented">
  <li class="selected">
    <span class="material-symbols" aria-hidden="true">star</span>
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
  <span class="material-symbols" aria-hidden="true">inbox</span>
  Inbox
  <span class="material-symbols" aria-hidden="true">chevron_right</span>
</li>
```

### Links

Wrap the row in an `<a>` or `<label>` to make the whole item the target. `aria-current` on the link, or a checked radio inside the label, paints the selected pill.

```html
<li>
  <a href="/inbox" aria-current="page">
    <span class="material-symbols" aria-hidden="true">inbox</span>
    Inbox
  </a>
</li>
```

---

## Floating Action Button

A circular action that can open a menu of related shortcuts.

If you want a fixed floating action button, you can add multiple actions that appear on hover. The live demo is in the bottom-right corner of the page.

Wrap a 56dp FAB (`circle extra`) and a list of 40dp ones (`circle extra small`) in `fab`. That class pins the control to the corner and styles its direct children. `AutoInit()` starts every matching element except those marked `no-autoinit`.

```html
<div class="fab">
  <button type="button" class="button circle extra" aria-label="Edit">
    <span class="material-symbols" aria-hidden="true">mode_edit</span>
  </button>
  <ul>
    <li><a class="button circle extra small error on-error-text" href="#!" aria-label="Chart"><span class="material-symbols" aria-hidden="true">insert_chart</span></a></li>
    <li><a class="button circle extra small secondary on-secondary-text" href="#!" aria-label="Quote"><span class="material-symbols" aria-hidden="true">format_quote</span></a></li>
    <li><a class="button circle extra small tertiary on-tertiary-text" href="#!" aria-label="Publish"><span class="material-symbols" aria-hidden="true">publish</span></a></li>
    <li><a class="button circle extra small primary on-primary-text" href="#!" aria-label="Attach"><span class="material-symbols" aria-hidden="true">attach_file</span></a></li>
  </ul>
</div>
```

### FAB menu

`fab-menu` is the FAB that expands into a list of labelled actions. The trigger is an ordinary FAB; the actions are a `<ul>` (or `<menu>`) of pills, each an icon and a label at 56dp on a full corner. Click the FAB to expand; click it again, click outside, or press Escape to collapse.

Expanded is the framework's state, not the author's: the constructor stamps `aria-expanded` on the trigger and `open()` / `close()` move it along with the `active` class. Do not write either into the markup.

```html
<div class="fab-menu">
  <button type="button" class="button extra circle" aria-label="Create">
    <span class="material-symbols" aria-hidden="true">add</span>
    <span class="material-symbols" aria-hidden="true">close</span>
  </button>
  <ul>
    <li><button type="button"><span class="material-symbols" aria-hidden="true">mode_edit</span><span>Compose</span></button></li>
    <li><button type="button"><span class="material-symbols" aria-hidden="true">image</span><span>Add photo</span></button></li>
  </ul>
</div>
```

Expanded, the FAB is the close button: the same disc on a full corner, the solid role colour rather than its container, and a 20dp glyph. Give the trigger a second icon and it becomes the close glyph — the first shows while collapsed, the second while expanded, and only ever one of them is in the box. With one icon the morph is the whole affordance.

The colour axis is the same three roles as the extended FAB, and one class moves both halves. The actions take `primary-container` (the default), `secondary-container` or `tertiary-container`; the close button takes the matching solid `primary`, `secondary` or `tertiary`.

```html
<div class="fab-menu secondary-container">…</div>
```

It is the same `FloatingActionButton` instance as the `fab` speed dial, so `AutoInit()` starts it and `open()`, `close()` and `isOpen` all work. The two never style each other, and neither reaches the `.fab.toolbar` transition. `direction` and `hoverEnabled` are inert on a FAB menu: it opens upward, on click, both decided in CSS. Beyond six actions the stagger runs out and the rest arrive together.

Neither host declares `role="menu"`, and the trigger carries no `aria-haspopup`. The actions are reached with Tab, not the arrow keys, so the role is withheld rather than promised — see `SEMANTICS.md`.

| Token | Default |
| --- | --- |
| `--md-comp-fab-menu-close-button-container-height` | 56px |
| `--md-comp-fab-menu-close-button-container-width` | 56px |
| `--md-comp-fab-menu-close-button-icon-size` | 20px |
| `--md-comp-fab-menu-close-button-between-space` | 8px |
| `--md-comp-fab-menu-close-button-container-color` | `--md-sys-color-primary` |
| `--md-comp-fab-menu-close-button-icon-color` | `--md-sys-color-on-primary` |
| `--md-comp-fab-menu-menu-item-container-height` | 56px |
| `--md-comp-fab-menu-menu-item-between-space` | 4px |
| `--md-comp-fab-menu-menu-item-icon-size` | 24px |
| `--md-comp-fab-menu-menu-item-icon-label-space` | 8px |
| `--md-comp-fab-menu-menu-item-leading-space` | 24px |
| `--md-comp-fab-menu-menu-item-trailing-space` | 24px |
| `--md-comp-fab-menu-menu-item-container-color` | `--md-sys-color-primary-container` |
| `--md-comp-fab-menu-menu-item-label-text-color` | `--md-sys-color-on-primary-container` |

### Initialization

The IIFE bundle exposes `Expressive.FloatingActionButton`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.fab` with the defaults below.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.fab');
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
  const elems = document.querySelectorAll('.fab');
  const instances = Expressive.FloatingActionButton.init(elems, {
    direction: 'left'
  });
});
```

### Click-only FAB

To disable hover and toggle the menu when the large button is clicked — useful on touch devices — pass `hoverEnabled: false`. Expressive does not read a `click-to-toggle` class; the option is the only way to switch.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.fab');
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
<div class="fab toolbar">
  <button type="button" class="button circle extra" aria-label="Edit">
    <span class="material-symbols" aria-hidden="true">mode_edit</span>
  </button>
  <ul>
    <li><a href="#!" aria-label="Insert chart"><span class="material-symbols" aria-hidden="true">insert_chart</span></a></li>
    <li><a href="#!" aria-label="Quote"><span class="material-symbols" aria-hidden="true">format_quote</span></a></li>
    <li><a href="#!" aria-label="Publish"><span class="material-symbols" aria-hidden="true">publish</span></a></li>
    <li><a href="#!" aria-label="Attach file"><span class="material-symbols" aria-hidden="true">attach_file</span></a></li>
  </ul>
</div>
```

```js
Expressive.FloatingActionButton.init(
  document.querySelector('.fab.toolbar'),
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
  <section>
    <h2>Product</h2>
    <p>A column with no links is not navigation — it is a section with a heading.</p>
  </section>
  <nav aria-labelledby="footer-links">
    <h2 id="footer-links">Links</h2>
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

**An icon is a `<span>`, not an `<i>`.** `<i>` means idiomatic text — a term, a thought, a phrase in another language — and an icon is none of those. `<i>` still renders; it is not the documented form.

**An icon is either decoration or an image, and it has to say which.** The glyph is produced by a ligature, so the icon's text content is real text and a screen reader reads it: `<span class="material-symbols">add</span>` is announced as "add". Two correct forms:

- Decoration — `aria-hidden="true"`. The enclosing control carries the name, so an icon-only button needs its own `aria-label`. This is almost always what you want.
- An image in its own right — `role="img"` with an `aria-label`. Use this when the icon reports something no neighbouring text does, such as a badge count.

The size and float modifiers (`tiny`, `small`, `medium`, `large`, `left`, `right`) hang off the icon class, not off `<i>`, so they follow either element.

Google publishes a [searchable Material Icons list](https://fonts.google.com/icons?icon.set=Material+Icons) and a [Material Symbols list](https://fonts.google.com/icons?icon.set=Material+Symbols). Those catalogs are the source for ligature names. You can also download the fonts from the [Material Icons guide](https://developers.google.com/fonts/docs/material_icons).

The Expressive stylesheet does not ship the font files. Include one or more of these lines in `<head>`:

```html
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

```html
<span class="material-symbols" aria-hidden="true">add</span>
<span class="material-symbols-outlined" aria-hidden="true">add</span>
<span class="material-symbols-rounded" aria-hidden="true">add</span>
<span class="material-symbols-sharp" aria-hidden="true">add</span>
```

Icons inherit the current text color, so token utilities such as `primary-text` work. For icons inside buttons, see Buttons.

### Icon Sizes

Size an icon with `font-size`, or use the preset classes on the icon: `tiny` (1rem), `small` (2rem), `medium` (4rem), and `large` (6rem). They hang off the icon class, so they work on a `<span>` or a legacy `<i>` alike.

### Symbol Sizes

The same size classes apply to Material Symbols.

```html
<!-- Sizes: tiny 1rem, small 2rem, medium 4rem, large 6rem -->
<span class="material-symbols large" aria-hidden="true">insert_chart</span>
<span class="material-symbols-outlined large" aria-hidden="true">insert_chart</span>
<span class="material-symbols-rounded large" aria-hidden="true">insert_chart</span>
<span class="material-symbols-sharp large" aria-hidden="true">insert_chart</span>
```

---

## Navbar

Material Design 3 top app bars, from the HTML.

The bar is the markup. A `<header>` whose child is a `<nav>` is a top app bar. The heading is the headline. Icon-only links and buttons are the leading and trailing actions. A `<menu>` (or `<ul>`) holds text destinations. There is no `navbar`, `nav-wrapper`, or `brand-logo` class.

Tokens follow the [M3 app bar spec](https://m3.material.io/components/app-bars/specs). The container is `surface` at rest, the headline is `on-surface` at `title-large`, and icons are 24dp in a 48dp target, inset 4dp. Icons inherit the header color so a fill + `on-*` pair stays readable. The small bar is 64dp tall. Pair a fill utility with its `on-*` text class if you want a colored bar.

The bar is CSS-only. Menus and the navigation drawer are separate components that `AutoInit()` starts. A `navigation-drawer-trigger` inside the bar is still required — that class is the NavigationDrawer contract, not bar chrome. Tabs live in their own bar — do not nest `.tabs` in the header.

### Small

Default. Leading icon, headline, trailing actions. DOM order is the layout — the headline grows, so anything after it sits on the end.

```html
<header>
  <nav aria-label="Main">
    <button type="button" aria-label="Menu">
      <span class="material-symbols" aria-hidden="true">menu</span>
    </button>
    <h2>Title</h2>
    <a href="#!" aria-label="Search"><span class="material-symbols" aria-hidden="true">search</span></a>
    <a href="#!" aria-label="More"><span class="material-symbols" aria-hidden="true">more_vert</span></a>
  </nav>
</header>
```

### Destinations

Text links go in a `<menu>`. Put the menu after the heading to align it on the end; put it first to align it on the start. Hide it below the Expanded breakpoint and pair it with a navigation drawer trigger when the bar has to collapse.

```html
<header>
  <nav aria-label="Main">
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

```html
<header class="center">
  <nav aria-label="Main">
    <button type="button" aria-label="Back">
      <span class="material-symbols" aria-hidden="true">arrow_back</span>
    </button>
    <h2>Title</h2>
    <a href="#!" aria-label="More"><span class="material-symbols" aria-hidden="true">more_vert</span></a>
  </nav>
</header>
```

### Medium and large

Same markup as the small bar. `medium` is 112dp with a `headline-small` title on the second row. `large` is 152dp with `headline-medium`. The title is `order`ed onto the bottom row so the first row can hold the leading icon on the start and the trailing icons on the end.

```html
<header class="medium">
  <nav aria-label="Main">
    <button type="button" aria-label="Back">
      <span class="material-symbols" aria-hidden="true">arrow_back</span>
    </button>
    <h2>Medium title</h2>
    <a href="#!" aria-label="More"><span class="material-symbols" aria-hidden="true">more_vert</span></a>
  </nav>
</header>

<header class="large">…</header>
```

### Fixed

Add `fixed` to pin a top bar with `position: sticky`. No wrapper is required. At rest the bar is `surface`, the same as the page. Once content scrolls under it, supporting browsers fill it with `surface-container` via `animation-timeline: scroll()` so it separates from the body — that is the M3 Expressive treatment, not a shadow. Without that API the bar stays at rest.

The documentation header on this site is a fixed small bar. A second fixed bar on this page would sit on top of it, so the live example is the site header itself.

```html
<header class="fixed">
  <nav aria-label="Main">
    <h2>Title</h2>
    <a href="#!" aria-label="Search"><span class="material-symbols" aria-hidden="true">search</span></a>
  </nav>
</header>
```

### Color

The default fill is `surface`. Color utilities win because they live in the utilities layer — put `primary on-primary-text` (or any fill + `on-*` pair) on the header. Icons inherit the header color. Set `--md-comp-top-app-bar-leading-icon-color` to `var(--md-sys-color-on-surface-variant)` if you want the spec’s muted trailing icons.

```html
<header class="primary on-primary-text">
  <nav aria-label="Main">
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

```html
<menu id="menu1">
  <li><a href="#!">one</a></li>
  <li><a href="#!">two</a></li>
  <li class="divider" role="separator"></li>
  <li><a href="#!">three</a></li>
</menu>
<header>
  <nav aria-label="Main">
    <h2>Title</h2>
    <menu>
      <li>
        <a class="menu-trigger" href="#!" data-target="menu1">
          Menu<span class="material-symbols right" aria-hidden="true">arrow_drop_down</span>
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

```html
<header>
  <nav aria-label="Main">
    <button type="button" aria-label="Back">
      <span class="material-symbols" aria-hidden="true">arrow_back</span>
    </button>
    <form role="search">
      <input type="search" placeholder="Search" aria-label="Search">
    </form>
  </nav>
</header>
```

### Mobile collapse

Hide the destination menu below the Expanded breakpoint and put a `navigation-drawer-trigger` in the leading slot. The trigger stays visible at every size — it is the page-navigation control, not collapse chrome. Pair it with a `navigation-drawer` whose id matches `data-target`. The drawer element itself must not be a child of the `<nav>`.

```html
<header>
  <nav aria-label="Main">
    <button type="button" data-target="mobile-demo" class="navigation-drawer-trigger" aria-label="Open menu">
      <span class="material-symbols" aria-hidden="true">menu</span>
    </button>
    <h2>Title</h2>
    <menu class="hide-on-med-and-down">
      <li><a href="#!">Sass</a></li>
      <li><a href="#!">Components</a></li>
    </menu>
  </nav>
</header>

<nav aria-label="Main">
  <ul class="navigation-drawer" id="mobile-demo">
    <li><a href="#!">Sass</a></li>
  </ul>
</nav>
```

After you add the trigger and the navigation drawer, initialize NavigationDrawer (or let `AutoInit()` do it).

```js
document.addEventListener('DOMContentLoaded', function() {
  Expressive.NavigationDrawer.init(document.querySelectorAll('.navigation-drawer'));
});
```

---

## Bottom app bar

This screen's commands at the bottom edge, with an optional FAB. A `div.bottom-app-bar` holds 3–4 icon-only actions that belong to the screen the reader is on. CSS only.

This is not the navigation bar. A navigation bar holds destinations that stay the same from screen to screen and is a `<nav>` landmark; a bottom app bar holds commands, so it is not a `<nav>` — nor a `<footer>`, nor any other landmark element — and takes no `role="toolbar"` either — that role promises arrow-key navigation, and the actions here are reached with Tab. Material says never show both bars at once.

Every action is icon-only, so every action carries an `aria-label`; the icon inside it is `aria-hidden="true"`.

```html
<div class="bottom-app-bar">
  <button type="button" aria-label="Check">
    <span class="material-symbols" aria-hidden="true">check_box</span>
  </button>
  <button type="button" aria-label="Edit">
    <span class="material-symbols" aria-hidden="true">edit</span>
  </button>
  <button type="button" aria-label="More options">
    <span class="material-symbols" aria-hidden="true">more_vert</span>
  </button>
</div>
```

### With a FAB

Add the screen's FAB as the last child; it is pushed to the end of the bar, so there is no spacer to write. Inside the bar it is flat and `secondary-container` rather than lifted and `primary-container`. The bar is 80dp either way — Material's 72dp with-FAB height is deprecated.

```html
<div class="bottom-app-bar">
  <button type="button" aria-label="Check">
    <span class="material-symbols" aria-hidden="true">check_box</span>
  </button>
  <button type="button" class="button extra circle" aria-label="New message">
    <span class="material-symbols" aria-hidden="true">add</span>
  </button>
</div>
```

### Fixed

Add `fixed` to pin the bar to the bottom of the viewport, inside `safe-area-inset-bottom`. It covers the last 80dp of the page, so pad the content behind it.

```html
<div class="bottom-app-bar fixed">…</div>
```

M3 Expressive's docked toolbar (`div.toolbar.docked`) is the shorter 64dp answer to the same problem. Both ship.

---

## Navigation bar

Switch between UI views on compact and medium screens. A `nav.navigation-bar` holds 3–5 destinations of equal importance. Destinations do not change from screen to screen. There is no JavaScript — mark the current view with `aria-current="page"` (or `active`).

This is not the app bar. The app bar names the current page and holds 1–2 actions. Use a navigation bar in compact windows; a navigation rail covers mid-size screens and a navigation drawer the rest.

### Stacked

Default. Icon above the label. The selected destination puts a pill behind the icon and fills the glyph.

```html
<nav class="navigation-bar" aria-label="Main">
  <a href="/" aria-current="page">
    <span class="material-symbols" aria-hidden="true">home</span>
    Home
  </a>
  <a href="/browse">
    <span class="material-symbols" aria-hidden="true">explore</span>
    Browse
  </a>
  <a href="/radio">
    <span class="material-symbols" aria-hidden="true">radio</span>
    Radio
  </a>
  <a href="/library">
    <span class="material-symbols" aria-hidden="true">library_music</span>
    Library
  </a>
</nav>
```

### Horizontal

Add `horizontal`. Icon and label sit on one row, and the selected pill wraps both. Use this in medium windows.

```html
<nav class="navigation-bar horizontal" aria-label="Main">
  <a href="/" aria-current="page">
    <span class="material-symbols" aria-hidden="true">home</span>
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
    <span class="material-symbols" aria-hidden="true">menu</span>
  </button>
  <a class="button extra" href="#!">
    <span class="material-symbols" aria-hidden="true">edit</span>
    <span>Label</span>
  </a>
  <a href="/" aria-current="page">
    <span class="material-symbols" aria-hidden="true">star</span>
    Label
  </a>
  <a href="/two" aria-label="Starred, 3 unread">
    <span class="material-symbols" aria-hidden="true">star<span class="badge">3</span></span>
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
@media (width >= 600px) {
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

The list lives in a `<nav aria-label="Pagination">` — a page's links are navigation, and the label distinguishes it from every other `<nav>` on the page.

Mark the current page with `active` on the `li` **and `aria-current="page"` on its link**; the class only fills it. Use `disabled` for unavailable prev/next, and make those a `<span>` rather than an `<a href>` — a disabled link is still focusable and still navigates. Icon-only prev/next links need an `aria-label`.

```html
<nav class="pagination" aria-label="Pagination">
  <ol>
    <li class="disabled">
      <span aria-hidden="true"><span class="material-symbols" aria-hidden="true">chevron_left</span></span>
    </li>
    <li class="active"><a href="?page=1" aria-current="page">1</a></li>
    <li><a href="?page=2">2</a></li>
    <li><a href="?page=3">3</a></li>
    <li><a href="?page=4">4</a></li>
    <li><a href="?page=5">5</a></li>
    <li>
      <a href="?page=2" aria-label="Next page"><span class="material-symbols" aria-hidden="true">chevron_right</span></a>
    </li>
  </ol>
</nav>
```

### Responsive

Add `nowrap` to keep a long run on one row and scroll it sideways instead of wrapping. The older `li.pages` nest does the same thing and is still styled.

`prev` and `next` are accepted and inert: they have no rules in the sheet. The 10%/80% split they used to drive is gone — a long run scrolls now rather than being clipped.

```html
<nav class="pagination" aria-label="Pagination">
  <ol>
    <li class="disabled prev">
      <span aria-hidden="true"><span class="material-symbols" aria-hidden="true">chevron_left</span></span>
    </li>
    <li class="pages">
      <ol>
        <li class="active"><a href="?page=1" aria-current="page">1</a></li>
        <li><a href="?page=2">2</a></li>
        <li><a href="?page=3">3</a></li>
      </ol>
    </li>
    <li class="next">
      <a href="?page=2" aria-label="Next page"><span class="material-symbols" aria-hidden="true">chevron_right</span></a>
    </li>
  </ol>
</nav>
```

---

## Panes

Material 3 canonical layouts — list-detail, supporting pane, and equal panes.

Panes are CSS-only. A container (`panes`, or one of the named aliases `list-detail`, `supporting-pane-layout`, `pane-layout`) holds two or three `pane` children. Compact windows (`< 600px`) use 16px inline margins. Every wider layout uses 24px inline margins and 24px spacers. Below 840px only one pane shows at a time; at 840px and up the panes sit side by side. The container is also a `container-type: inline-size` query container, so a pane layout nested inside a narrow column collapses on its own width, not the viewport's.

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
      <button aria-label="Back"><span class="material-symbols" aria-hidden="true">arrow_back</span></button>
      <h2>Brunch this weekend?</h2>
    </header>
    <section>
      <p>Detail content.</p>
    </section>
  </div>
</div>
```

### Compact

On Compact windows (`< 600px`) the container has 16px inline margins. Medium and wider windows use 24px inline margins and 24px spacers. On Compact and Medium windows (`< 840px`) the container shows one pane. The first pane wins by default; add `active` to the pane you want instead, and move that class to switch panes. At 840px and up `active` is ignored and every pane shows.

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
    <button aria-label="Back"><span class="material-symbols" aria-hidden="true">arrow_back</span></button>
    <h2>Title</h2>
    <button aria-label="More options"><span class="material-symbols" aria-hidden="true">more_vert</span></button>
  </header>
  <section>
    <p>Scrolling content.</p>
  </section>
  <footer>
    <button class="button">Save</button>
  </footer>
</div>
```

### Tokens

Set these on the container to resize a layout.

| Name | Default | Description |
| --- | --- | --- |
| `--md-comp-pane-margin` | `16px` Compact; `24px` Medium and wider | Inline window-edge margin. |
| `--md-comp-pane-gap` | `24px` | Medium-and-wider spacers; gap and padding in the separated appearance. |
| `--md-comp-pane-divider-color` | `outline-variant` | Coplanar divider and `outlined` pane border. |
| `--md-comp-pane-container-color` | `surface` | Container fill. |
| `--md-comp-pane-container-shape` | `0px` (`16px` when separated) | Pane corner radius. |
| `--md-comp-pane-list-width` | `360px` | List pane width at 840px and up. |
| `--md-comp-pane-supporting-width` | `360px` | Supporting pane width at 840px and up. |
| `--md-comp-pane-primary-min-width` | `360px` | Minimum width for the primary pane. |

---

## Progress indicators

Activity and progress indicators for content that takes time to load.

If content will take a while to load, give the user feedback. Expressive ships linear progress bars and circular spinners. Both are CSS-only — there is no JavaScript plugin.

For an indeterminate wait under about five seconds, prefer the [Loading indicator](#loading-indicator) — it supersedes the indeterminate circular case below. Progress indicators keep both linear bars and everything determinate.

Prefer `<progress>`: it reports itself, and its value with it. A `<div class="progress">` is a bar drawn with CSS and reports nothing, so it needs `role="progressbar"` — and if it is determinate, `aria-valuenow` as well. A progressbar with no value is an *indeterminate* one by definition, which is a lie if the bar visibly shows 70%.

### Linear

There are two linear bars: determinate and indeterminate.

#### Determinate

A native `<progress class="progress">` is the simplest form. The `.progress` +
`.determinate` pair still works, and `--md-comp-progress-value` sets the fill
without inline widths. The bar uses the primary token on a `secondary-container`
track.

```html
<progress class="progress" value="70" max="100"></progress>

<div class="progress" role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100">
  <div class="determinate" style="width: 70%"></div>
</div>

<div class="progress" role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100" style="--md-comp-progress-value: 70%"></div>
```

#### Indeterminate

Use a valueless `<progress>`, or `.indeterminate`, when you cannot report a
percentage.

```html
<progress class="progress"></progress>

<div class="progress" role="progressbar">
  <div class="indeterminate"></div>
</div>
```

### Circular

A circular indicator is a single `<span class="progress circular">`. There is no wrapper,
no layers and no clippers — the whole spinner is one element. The default is
40dp; add `small` (24dp) or `big` (64dp).

```html
<span class="progress circular" role="status" aria-label="Loading"></span>
<span class="progress circular small" role="status" aria-label="Loading"></span>
<span class="progress circular big" role="status" aria-label="Loading"></span>
```

#### Determinate

Add `determinate` and set the progress with `--md-comp-progress-value`. Report
the value to assistive technology with the `progressbar` role.

```html
<span class="progress circular determinate"
      style="--md-comp-progress-value: 70%"
      role="progressbar" aria-valuenow="70"
      aria-valuemin="0" aria-valuemax="100"
      aria-label="Loading"></span>
```

#### Color

The indicator follows `--md-comp-progress-indicator`, so it themes with the rest
of the page. Override it for a one-off color — a role token, never a raw hex.

```html
<span class="progress circular"
      style="--md-comp-progress-indicator: var(--md-sys-color-error)"
      role="status" aria-label="Loading"></span>
```


## Search

A search bar, and the view it expands into.

A `<search>` with `search-bar` on it is the bar: a leading icon or icon button, an `<input type="search">`, and whatever trailing actions the query needs. The element is the landmark, so there is no `role="search"` to add. The input goes in bare — the bar is the container, so none of the text-field chrome (`.field`, the underline, the floating label) applies.

Spacing follows what is at each end: a bare glyph sits 16dp from the edge, an icon button 4dp, because the button already insets its own glyph by 12dp. An `<img>` in the bar is the account avatar — 30dp and circular; put it inside the button when it is tappable, so the 48dp target comes from the button. `.searchbar`, the pre-1.0 name, reaches the same rules.

```html
<search class="search-bar" aria-label="Search">
  <span class="material-symbols" aria-hidden="true">search</span>
  <input type="search" aria-label="Search recipes" placeholder="Search recipes">
  <button type="button" class="icon-button" aria-label="Filters">
    <span class="material-symbols" aria-hidden="true">tune</span>
  </button>
</search>
```

### Docked view

`.search-view` is the surface the bar expands into. Docked, it goes inside the bar — it hangs off it, so it needs no coordinates of its own — and is shown and hidden with the `hidden` attribute. It is a plain element rather than a `<dialog>` on purpose: `dialog.show()` moves focus into the dialog, which would take the caret out of the input the user is typing in.

```html
<search class="search-bar" aria-label="Search">
  <span class="material-symbols" aria-hidden="true">search</span>
  <input type="search" aria-label="Search fruit" placeholder="Search fruit"
         onfocus="document.getElementById('results').hidden = false">
  <div class="search-view" id="results" hidden>
    <ul class="list">
      <li><a href="/apricot"><span class="material-symbols" aria-hidden="true">history</span><span>Apricot</span></a></li>
    </ul>
  </div>
</search>
```

### Full-screen view

Full screen, the view is a `<dialog class="search-view full-screen">` opened with `showModal()`; Escape and a tap outside come from the platform. Its header is another `.search-bar`, with the pill and the shadow taken off. `autofocus` on the input is required, not decorative: `showModal()` focuses the first focusable descendant — the back button — so without it a keyboard user cannot type.

Full screen at Compact and docked from Medium up is the M3 rule of thumb, and the app picks: no breakpoint in the sheet swaps one for the other, and the two are not interchangeable markup (the docked view nests inside the bar, the full-screen one is a top-level `<dialog>`). Render the one the window calls for.

```html
<dialog class="search-view full-screen" id="search-full" aria-label="Search">
  <search class="search-bar" aria-label="Search">
    <form method="dialog">
      <button type="submit" class="icon-button" aria-label="Back">
        <span class="material-symbols" aria-hidden="true">arrow_back</span>
      </button>
    </form>
    <input type="search" autofocus aria-label="Search fruit" placeholder="Search fruit">
  </search>
  <hr>
  <ul class="list">
    <li><a href="/apricot"><span class="material-symbols" aria-hidden="true">history</span><span>Apricot</span></a></li>
  </ul>
</dialog>
```

### Suggestions

Search ships no suggestion list of its own. Put `autocomplete` on the bar's input and you get the combobox, its listbox, and the arrow-key and `aria-activedescendant` handling that Autocomplete already implements and is tested for.

```html
<search class="search-bar" aria-label="Search">
  <span class="material-symbols" aria-hidden="true">search</span>
  <input type="search" class="autocomplete" aria-label="Search fruit" placeholder="Search fruit">
</search>
```

That is the whole relationship between the two, and it is deliberate. A `.search-view` takes no composite role: its contents are links and buttons reached with Tab, and a second listbox here would be the same promise as Autocomplete's with no keyboard model behind it. Use the view for recent searches, filters and results; use Autocomplete for a list the user arrows through.

### Tokens

| Token | Default |
| --- | --- |
| `--md-comp-search-bar-container-color` | `--md-sys-color-surface-container-high` |
| `--md-comp-search-bar-container-height` | 56px |
| `--md-comp-search-bar-container-shape` | 9999px (full) |
| `--md-comp-search-bar-leading-space` | 16px, or 4px beside an icon button |
| `--md-comp-search-bar-trailing-space` | 16px, or 4px beside an icon button |
| `--md-comp-search-bar-icon-label-space` | 16px |
| `--md-comp-search-bar-icon-size` | 24px |
| `--md-comp-search-bar-avatar-size` | 30px |
| `--md-comp-search-view-container-color` | `--md-sys-color-surface-container-high` |
| `--md-comp-search-view-container-shape` | 12px, 0 full-screen |
| `--md-comp-search-view-header-height` | 56px, 72px full-screen |
| `--md-comp-search-view-divider-color` | `--md-sys-color-outline` |
| `--md-comp-search-view-bar-results-gap` | 2px |
| `--md-comp-search-view-max-height` | 60vh, none full-screen |


---

## Loading indicator

M3 Expressive's indicator for a short wait — a shape that morphs while it spins.

Reach for it whenever the wait is under about five seconds and you cannot report
a percentage. It **supersedes the indeterminate circular progress indicator**:
anywhere you would have written `<span class="progress circular">` with no
value, write this instead. `.progress` keeps both linear bars and every
determinate case.

One element, CSS-only, no JavaScript plugin. The element is empty, so it reports
nothing on its own: `role="status"` announces the wait and `aria-label` gives it
something to announce. Not `role="progressbar"` — that promises an
`aria-valuenow` an indeterminate indicator does not have.

```html
<span class="loading-indicator" role="status" aria-label="Loading"></span>
```

### Contained

`contained` puts the indicator on a `secondary-container` circle and switches it
to `on-secondary-container`. Use it over an image or a coloured surface, where
the plain indicator would be lost.

```html
<span class="loading-indicator contained" role="status" aria-label="Loading"></span>
```

### Tokens

| Token | Default | What it sets |
| --- | --- | --- |
| `--md-comp-loading-indicator-active-indicator-size` | `38px` | The morphing shape. |
| `--md-comp-loading-indicator-container-size` | `48px` | The box it sits in — the visible circle when `contained`. |
| `--md-comp-loading-indicator-active-indicator-color` | `primary` | The shape's fill. |
| `--md-comp-loading-indicator-container-color` | `transparent` | The container fill. |
| `--md-comp-loading-indicator-duration` | `3000ms` | One full morph-and-spin cycle. |

```html
<span class="loading-indicator"
      style="--md-comp-loading-indicator-active-indicator-color: var(--md-sys-color-error)"
      role="status" aria-label="Loading"></span>
```

`prefers-reduced-motion: reduce` stops both animations and leaves the circle.


---

# JavaScript components

## Auto Init

Initialize every registered component with one function call.

Auto Init starts all of the registered Expressive components with a single call. The IIFE bundle exposes it as `Expressive.AutoInit`.

Importing the JavaScript installs a few document-level behaviors (Forms, Chips, Slider, Cards, and ExpandingCard), but it does **not** call `AutoInit()` for you. Call it after the DOM is ready. This documentation site does that in `docs.js` on `DOMContentLoaded`.

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
| `ScrollSpy` | `.scrollspy` |
| `FormSelect` | `select` |
| `NavigationDrawer` | `.navigation-drawer` |
| `Tabs` | `.tabs` |
| `Timepicker` | `.timepicker` |
| `Tooltip` | `.tooltipped` |
| `FloatingActionButton` | `.fab` |

Snackbar, CharacterCounter, and Range stay out of this table. Range still starts itself when the bundle loads. Forms, Chips, Cards, and ExpandingCard also run an import-time `Init()`; Chips and Cards appear in the table as well so a later `AutoInit()` can pick up elements added after load.

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

A `<menu>` is the surface. Each `<li>` is an item. An icon leads its label by default; add `.suffix` to send it to the trailing edge, since a lone icon is indistinguishable from a leading one in CSS. A `<kbd>` or a `.badge` is always trailing content. An `<li class="divider" role="separator">` is a divider — `<menu>` is a list and its content model permits only `<li>`, so a bare `<hr>` between entries is invalid (it still renders); a `.gap` splits groups; a `.label` is a heading. A nested `<menu>` is a flyout. The trigger’s `data-target` must match the menu’s `id`. `.menu-trigger` is the JavaScript contract.

This is the M3 Expressive vertical menu. Tokens follow the [M3 menu spec](https://m3.material.io/components/menus/specs). The container is `surface-container-low`, large (16dp) corners, elevation 2, 2dp group padding, 112–280dp wide. Items are 44dp with extra-small (4dp) corners, `label-large` / `on-surface`; the first and last item round their outer corners to 12dp. Icons are 20dp `on-surface-variant`. Selected items use medium (12dp) corners and `tertiary-container` / `on-tertiary-container`. Hover is an 8% state layer, focus and press 10%, none of which span the container. Dividers are inset. Add `.vibrant` for the tertiary mapping. Submenus fade and scale in; the open flyout rounds up and the parent rounds down.

`AutoInit()` starts every `.menu-trigger` except those marked `no-autoinit`. Menus open on click, below the trigger. Pass `coverTrigger: true` to cover the trigger. Pass `constrainWidth: false` so the menu sizes independently of the trigger.

Drop me

```html
<button class="menu-trigger" data-target="menu1">Drop me</button>
<menu id="menu1">
  <li><a href="#!">One</a></li>
  <li><a href="#!">Two</a></li>
  <li class="divider" role="separator"></li>
  <li><a href="#!">Three</a></li>
  <li>
    <a href="#!">
      <span class="material-symbols" aria-hidden="true">cloud</span>
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

Lightbox for enlarge-on-click images.

Media components handle large objects such as images. For responsive images and videos without JavaScript, see Media Styles.

### Lightbox

Lightbox is Expressive’s material-style enlarge-on-click image. Click an image with `lightboxed` and it centers and grows. Click it again, scroll, or press Escape to dismiss. `AutoInit()` starts every `.lightboxed` image except those marked `no-autoinit`.

```html
<img class="lightboxed" tabindex="0" role="button" width="650" alt="A mountain lake" src="images/sample-1.jpg">
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
<img class="lightboxed" tabindex="0" role="button"
     data-caption="A path through trees in a park"
     width="250"
     alt="A path through trees"
     src="images/sample-2.jpg">
```

---

## Dialogs

Material Design 3 dialogs, from the HTML.

A `<dialog>` is a basic dialog. A heading is the headline, a `<p>` (or a wrapping `<div>`) is supporting text, and the last child `<form method="dialog">` or `<nav>` is the action row. `dialog.max` is the full-screen variant. There are no `.modal`, `modal-header`, `modal-content`, or `modal-footer` classes — the element is the component.

Tokens follow the [M3 dialog spec](https://m3.material.io/components/dialogs/specs). The container is `surface`, 28dp corners, 280–560dp wide, elevation 3. The headline is `headline-small` / `on-surface`; supporting text is `body-medium`. The scrim is `--md-comp-scrim-color`. Actions sit at the end with an 8dp gap.

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

<dialog id="dialog1" aria-labelledby="use-location-services-title">
  <h2 id="use-location-services-title">Use location services?</h2>
  <p>Let the app use your location to suggest nearby stops.</p>
  <form method="dialog">
    <button type="submit" class="text" value="disagree">Disagree</button>
    <button type="submit" value="agree">Agree</button>
  </form>
</dialog>
```

A `<form method="dialog">` closes the dialog when a submit button is pressed and sets `dialog.returnValue` from the button’s `value`. An optional leading icon is the M3 dialog icon.

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

A `dialog.bottom-sheet` (or `.bottom`) is secondary content anchored to the bottom. Use it on Compact and Medium windows. `showModal()` is the modal variant (scrim). `show()` is the standard variant (no scrim). Same sheet either way: `surface-container-low`, 28dp top corners, 640dp max, 56dp side inset from the Medium breakpoint, 72dp top inset, 32×4 drag handle in a 48dp hit target. Drag the handle down to dismiss; a handle written as a `<button>` also dismisses when activated, so the keyboard reaches it too, and <kbd>Esc</kbd> closes the sheet natively.

```html
<dialog class="bottom-sheet" aria-labelledby="open-file-title">
  <h2 id="open-file-title">Open file</h2>
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
<dialog class="side-sheet" aria-labelledby="headline-title">
  <header>
    <h2 id="headline-title">Headline</h2>
    <form method="dialog">
      <button type="submit" aria-label="Close">
        <span class="material-symbols" aria-hidden="true">close</span>
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

### Floating sheet

A `dialog.floating-sheet` is secondary content on a surface detached from every window edge - the third member of M3's sheet family. `show()` is standard (no scrim, the page stays interactive); `showModal()` is modal (scrim). The container is `surface-container-low`, 28dp corners all round, elevation 1, 24dp in from every edge, 400dp max width. It is a `<dialog>`, so the ordinary dialog slots apply and there is no floating-sheet module - light dismiss on the scrim is `Dialogs.Init()`, the same as any dialog. It does not drag, so it takes no handle.

There are no edge modifiers: `.bottom` selects a bottom sheet and `.left` / `.right` a side sheet. Anchor it with `inset` / `margin`, or move it with `--md-comp-floating-sheet-inset` and `--md-comp-floating-sheet-container-max-width`.

```html
<dialog class="floating-sheet" aria-labelledby="now-playing-title">
  <h2 id="now-playing-title">Now playing</h2>
  <p>Secondary content, floating above the page.</p>
  <form method="dialog">
    <button type="submit" value="done">Done</button>
  </form>
</dialog>
```

```js
document.getElementById('sheet').show();      // standard, no scrim
document.getElementById('sheet').showModal(); // modal, with scrim
```

### Full-screen

Add `max` for a full-viewport dialog with no corners. That is the M3 full-screen dialog, typically used on small screens.

Show full-screen

### New message

A full-screen dialog fills the viewport. Put the primary action in the form at the end.

```html
<dialog class="max" aria-labelledby="new-message-title">
  <h2 id="new-message-title">New message</h2>
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

Put `scrollspy` and an `id` on each section. The table of contents is a set of destinations within the page, so it lives in a labelled `<nav>`; use `table-of-contents` on its list and point each link at `#that-id`. `AutoInit()` starts every `.scrollspy` except those marked `no-autoinit`.

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
    <nav aria-label="On this page">
      <ul class="section table-of-contents">
        <li><a href="#introduction">Introduction</a></li>
        <li><a href="#structure">Structure</a></li>
        <li><a href="#initialization">Initialization</a></li>
      </ul>
    </nav>
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

## Navigation drawer

A slide-out menu, or a fixed sidebar on Expanded and wider windows.

This is a slide-out menu. Nest `<details>` / `<summary>` for nested sections — the documentation sidebar uses that. On Compact and Medium windows this same drawer slides over the page.

The drawer HTML must **not** sit inside the app bar’s `<nav>`. Put a `navigation-drawer-trigger` anywhere and set `data-target` to the navigation drawer’s `id`. `AutoInit()` starts every `.navigation-drawer` except those marked `no-autoinit`.

Toggle NavigationDrawer

```html
<nav aria-label="Main">
  <ul id="slide-out" class="navigation-drawer">
    <li>
      <div class="user-view">
        <div class="background">
          <img src="images/office.jpg" alt="">
        </div>
        <a href="#user" aria-label="Profile"><img class="circle" src="images/portrait.jpg" alt=""></a>
        <a href="#name"><span class="name">John Doe</span></a>
        <a href="#email"><span class="email">jdoe@example.com</span></a>
      </div>
    </li>
    <li><a href="#!"><span class="material-symbols" aria-hidden="true">cloud</span>First Link With Icon</a></li>
    <li><a href="#!">Second Link</a></li>
    <li><div class="divider"></div></li>
    <li><span class="subheader">Subheader</span></li>
    <li><a href="#!">Third Link</a></li>
  </ul>
</nav>
<button type="button" data-target="slide-out" class="button text circle navigation-drawer-trigger" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button>
```

### Initialization

The IIFE bundle exposes `Expressive.NavigationDrawer`. Call `init` yourself when you need options other than the defaults, or let `Expressive.AutoInit()` start every `.navigation-drawer`.

```js
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.navigation-drawer');
  const instances = Expressive.NavigationDrawer.init(elems, {
    // specify options here
  });
});
```

Nested sections are HTML. A `<details>` / `<summary>` inside a `.navigation-drawer` is a nested section; the same `name` on several details is an accordion. There is no Collapsible plugin.

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `edge` | String | `'left'` | Side of the screen. `'left'` or `'right'`. The constructor adds `right-aligned` when the edge is right. |
| `draggable` | Boolean | `true` | Allow swipe gestures to open and close. Drag is disabled while the navigation drawer is fixed on Expanded and wider windows. |
| `dragTargetWidth` | String | `'10px'` | Width of the screen-edge strip where a drag can start. |
| `inDuration` | Number | `250` | Open transition duration, in milliseconds. |
| `outDuration` | Number | `200` | Close transition duration, in milliseconds. |
| `preventScrolling` | Boolean | `true` | Prevent the page from scrolling while an overlay drawer is open. |
| `onOpenStart` | Function | `null` | Called when the navigation drawer starts opening. |
| `onOpenEnd` | Function | `null` | Called when the navigation drawer finishes opening. |
| `onCloseStart` | Function | `null` | Called when the navigation drawer starts closing. |
| `onCloseEnd` | Function | `null` | Called when the navigation drawer finishes closing. |

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.NavigationDrawer.getInstance(elem);
```

#### .open();

Opens the navigation drawer.

```text
instance.open();
```

#### .close();

Closes the navigation drawer.

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
| `isOpen` | Boolean | Whether the navigation drawer is open. |
| `isFixed` | Boolean | Whether the element has `navigation-drawer-fixed`. |
| `isDragged` | Boolean | Whether the navigation drawer is being dragged. |

### Close Trigger

Add `navigation-drawer-close` to an element inside the drawer. A click on that element closes an overlay drawer. That is useful in a single-page app where the page does not reload. It does nothing while the navigation drawer is fixed on Expanded and wider windows.

```html
<nav aria-label="Main">
  <ul id="slide-out" class="navigation-drawer">
    <li><button type="button" class="navigation-drawer-close">Clicking this will close NavigationDrawer</button></li>
  </ul>
</nav>
<button type="button" data-target="slide-out" class="button text circle navigation-drawer-trigger" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button>
```

### Variations

#### Right edge

Pass `edge: 'right'`. Mark the element `no-autoinit` if you initialize it yourself, otherwise AutoInit would start it on the left.

Toggle Right NavigationDrawer

```js
Expressive.NavigationDrawer.init(document.querySelector('#slide-out-right'), {
  edge: 'right'
});
```

#### Menu HTML Structure

Nest `<details>` for a section that opens in place. Same `name` on several details is an accordion. The documentation sidebar uses this for Foundations, Structure, Components, and Forms.

```html
<nav aria-label="Main">
  <ul id="slide-out" class="navigation-drawer">
    <li><a href="#!">First Sidebar Link</a></li>
    <li>
      <details name="docs-nav">
        <summary>
          <span class="material-symbols" aria-hidden="true">palette</span>
          Foundations
        </summary>
        <ul>
          <li><a href="#!">Color</a></li>
          <li><a href="#!">Typography</a></li>
        </ul>
      </details>
    </li>
  </ul>
</nav>
```

#### Fixed HTML Structure

Add `navigation-drawer-fixed` so the drawer stays open on Expanded and wider windows (`>= 840px`) and slides away below that boundary. The documentation sidebar on the left is this pattern.

```html
<nav aria-label="Main">
  <ul id="slide-out" class="navigation-drawer navigation-drawer-fixed">
    <li><a href="#!">First Sidebar Link</a></li>
    <li><a href="#!">Second Sidebar Link</a></li>
  </ul>
</nav>
<button type="button" data-target="slide-out" class="button text circle navigation-drawer-trigger" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button>
```

Offset the rest of the page by the navigation drawer width. The width token is `--md-comp-nav-drawer-width` (300px). Put the padding on `header`, `main`, and `footer`.

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

A `<nav class="tabs" aria-label="Sections">` of `<a href="#panel">` is the bar. A `<span>` (or the link text) is the label; a leading `<span class="material-symbols">` is the icon. `.active` is the selected tab. There is no `li.tab` required — `ul.tabs > li.tab > a` stays as an alias. `AutoInit()` starts every `.tabs` except those marked `no-autoinit`.

Tokens follow the [M3 tabs spec](https://m3.material.io/components/tabs/specs). Primary tabs sit on `surface`, 48dp (64dp with a stacked icon). The label is `title-small` / `on-surface-variant`; selected is `primary`. The indicator is 3dp `primary` with 3dp top corners. The icon is 24dp. A 1dp `outline-variant` divider runs under the bar. Hover is 8%; focus is 10%. Disabled is 38%.

```html
<nav class="tabs" aria-label="Travel">
  <a href="#flight">
    <span class="material-symbols" aria-hidden="true">flight</span>
    <span>Flight</span>
  </a>
  <a class="active" aria-current="page" href="#luggage">
    <span class="material-symbols" aria-hidden="true">luggage</span>
    <span>Luggage</span>
  </a>
  <a href="#explore">
    <span class="material-symbols" aria-hidden="true">explore</span>
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
    <span class="material-symbols" aria-hidden="true">flight</span>
    <span>Travel</span>
  </a>
  <a class="active" aria-current="page" href="#hotel">
    <span class="material-symbols" aria-hidden="true">hotel</span>
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
<nav class="tabs" aria-label="Sections">
  <a target="_blank" href="https://github.com">External link in new window</a>
  <a target="_self" href="https://github.com">External link in same window</a>
</nav>
```

### Swipeable Tabs

Set `swipeable: true` to swipe between panels on touch devices. Keep the tab panels in the same wrapping container. The implementation wraps those panels in a carousel. `responsiveThreshold` is the viewport width below which swipeable mode turns on.

This demo is marked `no-autoinit` and started with `swipeable: true`.

```html
<nav id="tabs-swipe-demo" class="tabs" aria-label="Sections">
  <a href="#test-swipe-1">Test 1</a>
  <a class="active" aria-current="page" href="#test-swipe-2">Test 2</a>
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
<nav class="tabs max" aria-label="Sections">
  <a href="#test1">Test 1</a>
  <a class="active" aria-current="page" href="#test2">Test 2</a>
  <a class="disabled" href="#test3">Disabled</a>
</nav>
```

### Inline icons

Primary tabs stack the icon above the label (64dp). Add `horizontal` (or `tabs-horizontal`) to put them on one line, like secondary tabs.

```html
<nav class="tabs max horizontal" aria-label="Sections">
  <a href="#flight">
    <span class="material-symbols" aria-hidden="true">flight</span>
    <span>Flight</span>
  </a>
  <a class="active" aria-current="page" href="#luggage">
    <span class="material-symbols" aria-hidden="true">luggage</span>
    <span>Luggage</span>
  </a>
</nav>
```

---

## Snackbar

Material Design 3 snackbars, from the HTML.

Snackbars show short updates about app processes at the bottom of the screen. They should not interrupt browsing. A `.snackbar` is the bar. A `<p>` is the supporting text. A trailing `<button>` is the optional action; a `.circle` button is the optional close.

Tokens follow the [M3 snackbar spec](https://m3.material.io/components/snackbar/specs). The container is `inverse-surface`, 4dp corners, elevation 3, 48dp minimum. Supporting text is `body-medium` / `inverse-on-surface`, two lines max. The action is a `label-large` / `inverse-primary` text button. Close is a 24dp `inverse-on-surface` icon. On Compact viewports the bar is inset 8dp from the edges; from the Medium breakpoint up it hugs content (344–672dp) and sits centered 24dp from the bottom.

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

The same anatomy works as static HTML. Without `.active` the bar is in-flow — useful for previews. With `.active` it pins to the bottom of the viewport, centered from the Medium breakpoint.

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
<button type="button" class="circle" aria-label="Add" aria-describedby="tip-add-to-album">
  <span class="material-symbols" aria-hidden="true">add</span>
  <span class="tooltip" id="tip-add-to-album">Add to album</span>
</button>

<button type="button" class="circle" aria-label="Below" aria-describedby="tip-below">
  <span class="material-symbols" aria-hidden="true">arrow_downward</span>
  <span class="tooltip bottom" id="tip-below">Below</span>
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
    <div class="actions">
      <button type="button" class="text">Got it</button>
    </div>
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

A `<div class="toolbar">` is the bar — not a `<nav>`, because a toolbar holds commands rather than destinations. Direct `<button>` or `<a>` children are the actions. A `<span class="material-symbols">` is the icon; wrap a label in its own `<span>`. An action with an icon and no label needs an `aria-label`. `.active` marks the selected action. They are CSS only. There is no JavaScript component and nothing to AutoInit.

Tokens follow the [M3 toolbar spec](https://m3.material.io/components/toolbars/specs). Actions are 48dp targets with a 24dp icon, transparent at rest, `on-surface-variant`, 4dp apart.

This is not the FAB-to-toolbar transition (`div.fab.toolbar`). That stays on Floating Action Button. Do not put `toolbar` on every `<nav>` — app bars, card actions, and radio rows stay as they are.

```html
<div class="toolbar">
  <button type="button" class="circle" aria-label="Undo">
    <span class="material-symbols" aria-hidden="true">undo</span>
  </button>
  <button type="button" class="circle active" aria-label="Bold">
    <span class="material-symbols" aria-hidden="true">format_bold</span>
  </button>
  <button type="button" class="circle" aria-label="Italic">
    <span class="material-symbols" aria-hidden="true">format_italic</span>
  </button>
</div>
```

A label next to the icon needs a `<span>` — `:only-child` ignores text nodes, so `<i>edit</i>Edit` would look icon-only.

```html
<div class="toolbar">
  <button type="button">
    <span class="material-symbols" aria-hidden="true">edit</span>
    <span>Edit</span>
  </button>
  <button type="button" class="circle" aria-label="More">
    <span class="material-symbols" aria-hidden="true">more_vert</span>
  </button>
</div>
```

### Variants

Four, from two independent axes — a **shape** (floating or docked) and a **color style** (standard or vibrant).

| | standard | vibrant |
| --- | --- | --- |
| **floating** | `class="toolbar"` | `class="toolbar vibrant"` |
| **docked** | `class="toolbar docked"` | `class="toolbar docked vibrant"` |

Floating is the default shape and standard the default color, so neither needs a class — but `floating` and `standard` are both accepted, so a bar can name all of what it is. `filled` is the older name for `vibrant`, and `max` the BeerCSS name for `docked`; both still work.

**Floating** hugs its actions: 64dp tall, 32dp stadium corners, elevation 3, 8dp end insets, 16dp from the viewport edge (24dp when `vertical`). **Docked** is full width, square, unlifted, 16dp end insets, its actions between 4dp and 32dp apart. `vertical` stacks a floating bar; a docked bar stays a horizontal strip.

**Standard** is `surface-container` with `on-surface-variant` content and a `secondary-container` selection. **Vibrant** is `primary-container` with `on-primary-container` content, and selection moves to `surface-container` / `on-surface` so it still reads against the accent.

The `vibrant` *attribute* is a different thing, and the bar deliberately does not read it as a class. That attribute is the [emphasis foundation](#vibrant-emphasis), whose one ramp is tertiary; a bar inside it — or carrying it — is repainted by the foundation alone, with no toolbar-specific code, because every colour above is a token pointed at a `--md-sys-color-*` role. Nothing collides: selection is `secondary-container`, which the foundation leaves alone.

```html
<div class="toolbar vibrant">…</div>
<div class="toolbar docked vibrant">…</div>
<div class="toolbar floating standard vertical">…</div>
```

### Docked

`docked` (the M3 name; `max` is the BeerCSS alias) stretches the bar to the full width, drops the stadium and the elevation, and spaces the actions. Use it for page actions at the bottom of the screen; destinations belong on a navigation bar. A child `.max` is a spacer, not the bar.

```html
<div class="toolbar docked">
  <button type="button" class="circle" aria-label="Back">
    <span class="material-symbols" aria-hidden="true">arrow_back</span>
  </button>
  <button type="button" class="circle" aria-label="Add">
    <span class="material-symbols" aria-hidden="true">add</span>
  </button>
  <span class="max"></span>
  <button type="button" class="filled" aria-label="Create">
    <span class="material-symbols" aria-hidden="true">edit</span>
  </button>
</div>
```

### Pairing with a FAB

A floating bar can sit beside a companion FAB. Wrap both in `.toolbar-group`; the FAB is a sibling of the bar, not a child, and stays a FAB — 56dp, 16dp corners — 8dp away and lifted one level where the bar is lifted three. Its colors follow the bar's color style: `secondary-container` beside a standard bar, `tertiary-container` beside a vibrant one. Mark only the bar. That is the companion FAB, not the in-bar `.filled` action.

```html
<div class="toolbar-group">
  <div class="toolbar vibrant">…</div>
  <button type="button" class="extra circle" aria-label="Reply">
    <span class="material-symbols" aria-hidden="true">reply</span>
  </button>
</div>
```

### Fixed

`fixed` pins the bar to the viewport, inset by its own external space. A floating bar sits 16dp from the bottom-center; add `top` to move it to the top. A vertical bar sits 24dp from the start edge; `right` flips it. A docked bar sticks to the bottom edge and states its own inset; `top` sticks it to the top.

```html
<div class="toolbar fixed">…</div>
<div class="toolbar vertical fixed">…</div>
<div class="toolbar docked fixed">…</div>
```

---

# Forms

## Date Picker

Select a date, a range, or several dates from a calendar.

Add `datepicker` to a text input. `AutoInit()` starts every `.datepicker` except those marked `no-autoinit`.

The calendar is inline, not a modal. `open()` and `close()` are deprecated no-ops. With the default options the calendar is hidden (`openByDefault: false`) and clicking the input does not reveal it. Pass `openByDefault: true` to show the calendar under the field.

```html
<div class="field">
  <input type="text" class="date-picker" id="birthdate">
  <label for="birthdate">Birthdate</label>
</div>
```

```js
Expressive.Datepicker.init(document.querySelectorAll('.datepicker'), {
  openByDefault: true
});
```

Wrap the input in its own small parent — a `.field`, or a bare `<div>`. The calendar is inserted after that parent, not after the input itself.

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

The popover is positioned in document coordinates and then appended to the input’s parent. A `position: relative` parent — `.field` among them — shifts that position, so the calendar will not sit next to the field. Prefer a static wrapper if you use docked, or keep the calendar inline with `openByDefault`.

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
<div class="field">
  <input type="text" class="time-picker" id="lunchtime">
  <label for="lunchtime">Lunchtime</label>
</div>
```

Wrap the input in its own small parent — a `.field`, or a bare `<div>`. The clock is appended inside that parent.

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

The popover is positioned in document coordinates and then appended to the input’s parent. A `position: relative` parent — `.field` among them — shifts that position, so the clock will not sit next to the field. Prefer a static wrapper if you use docked, or keep the clock inline.

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

A `.field` is the container. The `<label>` after the control is the floating label, so it must carry `for` — it sits after the control and cannot wrap it. An icon names its side with `prefix` or `suffix` and is `aria-hidden`, because the ligature is real text. `<small>` is supporting text: give it an `id` and point the control at it with `aria-describedby`, or it is never read out with the field. The default is the M3 filled field; add `outlined` (or `border`) for the outlined variant.

`.input-field` is **not** the container and never was — the only rule matching it in the sheet is `.chips.input-field`.

Tokens follow the [M3 text field spec](https://m3.material.io/components/text-fields/specs). Height is 56dp. Filled is a `surface-variant` well with 4dp top corners and a 1dp / 2dp bottom indicator. Outlined is a 1dp / 2dp `outline` at 4dp. The label is `body-large` at rest and `body-small` floated. Input text is `body-large` / `on-surface`. Icons are 24dp, 12dp from the edge.

Add `placeholder=" "` (one space) so the label floats with CSS only. A missing placeholder, or any other string, keeps the label floated. Importing the bundle runs `Forms.Init()`; it validates `.validate` fields on `change` and starts textareas and file paths. Character Counter is not in `AutoInit()`.

```html
<div class="field">
  <input id="first_name" type="text" placeholder=" " aria-describedby="first_name_help">
  <label for="first_name">First name</label>
  <small id="first_name_help">Supporting text</small>
</div>

<div class="field outlined">
  <input id="last_name" type="text" placeholder=" ">
  <label for="last_name">Last name</label>
</div>

<div class="field">
  <span class="material-symbols prefix" aria-hidden="true">place</span>
  <span class="material-symbols suffix" aria-hidden="true">gps_fixed</span>
  <input id="loc" type="text" placeholder=" ">
  <label for="loc">Location</label>
</div>
```

Put `invalid` or `aria-invalid="true"` on the input for the error state. Do not put `error` on the wrapper — that class is a color utility and fills the field.

A side is required on a field icon. The old markup let a bare `<i>` fall to whichever side its position implied, but that rule counted elements of the same *type* (`:first-of-type`), which only ever worked while icons were `<i>` and nothing else in the field was. `.prefix` / `.suffix` say it outright and work on any element.

### Input types

`email`, `password`, and the other native text-like types are styled the same way. `validate` uses HTML5 constraint validation on `change` and toggles `invalid` on the input. There is no green `valid` style.

```html
<div class="field">
  <input id="email" type="email" class="validate" placeholder=" " aria-describedby="email_help">
  <label for="email">Email</label>
  <small id="email_help" data-error="Enter a valid email">Supporting text</small>
</div>
```

`validate` also honors `data-length`: the field is marked `invalid` when the value is longer than that number. Prefer `maxlength` when you want the browser to cap input.

### Inline

Add `inline` to sit the field in a line of text.

This is an inline input field: Email

```html
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

The trigger is a `<label>` **wrapping** the file input, not a `<button>` wrapping it. The distinction is not pedantry: `<button>` forbids interactive content, so a control inside it is invalid and yields two overlapping hit targets, whereas a `<label>` containing its own control is the pattern the spec is written around. Wrapping also means the label is what the invisible input is sized against, so the picker opens from the button and nowhere else. The path field is `readonly` — it only ever shows what the file input holds, so offering an edit that is thrown away is a lie — and takes an `aria-label` because it has no visible label of its own.

```html
<div class="file-field field">
  <label class="button">
    File
    <input type="file">
  </label>
  <div class="file-path-wrapper">
    <input class="file-path" type="text" placeholder=" " readonly aria-label="Selected file">
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

A `<fieldset>` is the group. A `<legend>` is the headline. Everything else is a field — `.field`, radios, switches, a `.inline` row of radios, a trailing `<small>` as supporting text. There is no wrapper class. They are CSS only. There is no JavaScript component and nothing to AutoInit.

Material Design 3 has no fieldset component. Tokens follow the outlined grouping container used around related form content, and the [outlined text-field](https://m3.material.io/components/text-fields/specs) shape so a group of fields matches the fields. The container is 4dp corners and a 1dp `outline-variant` stroke. The legend is `title-small` / `on-surface`. Supporting text is `body-small`. Padding is 16dp; children sit 16dp apart. Disabled is 38%.

```html
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

A fieldset is also the right parent for a radio, checkbox, or switch group — the legend names the question, the `disabled` attribute disables every control inside. Put the labels in a `<div class="inline">` to sit them on one line.

```html
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
  <div class="inline">
    <label>
      <input name="plan" type="radio" checked>
      Monthly
    </label>
    <label>
      <input name="plan" type="radio">
      Yearly
    </label>
  </div>
</fieldset>
```

### Variants

The default is outlined. `filled` is a `surface-variant` well with no stroke — pair it with `outlined` fields so the wells stay distinct. `rounded` is 12dp corners (M3 medium, like a card). `outlined` and `border` name the default if you need to say it.

```html
<fieldset class="filled">
  <legend>
    <span class="material-symbols" aria-hidden="true">place</span>
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

```html
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

The on/off captions are decoration. Left as bare text they are folded into the label, and the switch announces itself as "Off On" — so hide them and name the control itself. A switch whose only text is a caption needs an `aria-label`, because hiding both leaves it with no name at all.

```html
<label class="switch">
  <span aria-hidden="true">Off</span>
  <input type="checkbox" aria-label="Dark mode">
  <span class="lever"></span>
  <span aria-hidden="true">On</span>
</label>
```

---

## Select

Choose one option, or several, from a styled menu.

Select turns a native `<select>` into a menu. Wrap it in a `.field` and give the label a matching `for`. `AutoInit()` starts every `select` except those marked `no-autoinit`. Add `browser-default` to keep the native control.

Add `multiple` to select several options. Chosen values appear as a comma-separated list.

Native `<optgroup>` elements become group headings in the menu.

Put an image URL in `data-icon` on an option. Classes on that option are copied to the image; `left` floats it left. Images float right by default. There is no `icons` class on the `<select>`.

Add `browser-default` to skip the menu and keep the native select.

Browser Select Choose your option Option 1 Option 2 Option 3

```html
<div class="field">
  <select id="form-select-1">
    <option value="" disabled selected>Choose your option</option>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
    <option value="3">Option 3</option>
  </select>
  <label for="form-select-1">Expressive Select</label>
</div>

<div class="field">
  <select id="form-select-2" multiple>
    <option value="" disabled selected>Choose your option</option>
    <option value="1">Option 1</option>
    <option value="2">Option 2</option>
    <option value="3">Option 3</option>
  </select>
  <label for="form-select-2">Multiple Select</label>
</div>

<div class="field">
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

<div class="field">
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
<div class="field">
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

An `<input type="range">` is the control. A wrapping `.slider` (or a `<label>`) is the host for the value label; `.range` and `.range-field` are the older names and still work.

The plugin is `Expressive.Slider`, and `Expressive.Range` still resolves to it. Until 0.8.0 `.slider` and `Slider` meant the image slideshow; that component is gone as of 1.0.0 and Carousel covers the case, so `.slider` is the range control and nothing else.

Three variants: **standard** (active from the start to the handle), **centered** (`.centered`, active grows from the midpoint), and **range** (two inputs in one host, active between the handles). Horizontal or `.vertical`. Five sizes, an optional inset icon, discrete stops, and a value indicator.

Tokens follow the [M3 slider spec](https://m3.material.io/components/sliders/specs) (Expressive). The handle is a 4dp stop with a 6dp gap to each track, narrowing to 2dp while pressed. Active is `primary`; inactive is `secondary-container`. The end of an inactive track carries a 4dp stop. The value label is a 40dp `inverse-surface` / `inverse-on-surface` bubble, `body-small`. Disabled is 38%.

Slider is not in `AutoInit()`. Importing the IIFE bundle calls `Expressive.Slider.Init()`, which starts every `input[type=range]` already in the document and keeps the active track in sync. `no-autoinit` does not apply.

```html
<label>
  Volume
  <input type="range" min="0" max="100" value="40">
</label>
```

`min`, `max`, `step`, and `value` are the native attributes. When they are omitted, the control treats the range as 0–100. Dragging shows the current value above the handle.

### Variants

`centered` grows the active track from 50%. A range slider is two inputs in one `.slider` host; the plugin keeps the start handle from passing the end one.

```html
<div class="slider centered">
  <input type="range" min="0" max="100" value="30" aria-label="Centered">
</div>

<div class="slider">
  <input type="range" min="0" max="100" value="25" aria-label="Range start">
  <input type="range" min="0" max="100" value="75" aria-label="Range end">
</div>
```

### Sizes

XS is the default: a 16dp track and a 44dp handle. `s` / `small` is S, `m` / `medium` is M, `l` / `large` is L, and `xl` is XL. Scope them on the host — unscoped `.small` / `.large` are used by other components.

```html
<div class="slider s">…</div>
<div class="slider m">…</div>
<div class="slider l">…</div>
<div class="slider xl">…</div>
```

### Inset icon, stops, value

A leading icon sits inside the active track; M, L, and XL are tall enough for it. `stops` plus a `step` paints ticks along the track.

```html
<div class="slider m">
  <span class="material-symbols" aria-hidden="true">volume_up</span>
  <input type="range" min="0" max="100" value="55" aria-label="Volume">
</div>

<div class="slider stops">
  <input type="range" min="0" max="100" step="20" value="40" aria-label="Stops">
</div>
```

### Vertical

`vertical` stands the track up. Minimum is at the bottom. The value label sits to the end of the handle.

```html
<div class="slider vertical m">
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
  Expressive.Slider.init(elems);
});

Expressive.Slider.init(document.querySelector('#volume'));
```

### Methods

> All methods are called on the plugin instance. You can get the instance like this:

```js
const instance = Expressive.Slider.getInstance(elem);
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

A radio only means anything as one of a set, so the set is a `<fieldset>` and the `<legend>` names the question the radios answer. Without it the options are announced one by one with nothing saying what is being chosen.

Tokens follow the [M3 radio spec](https://m3.material.io/components/radio-button/specs). The icon is a 20dp ring with a 2dp stroke. Selected is `primary` with a 10dp inner disc (the M3 gap). The state layer is 40dp at 8% hover and 10% focus. The touch target is 48dp. The label is `body-large` / `on-surface`. Disabled is `on-surface` at 38%.

Use the same `name` on every radio in a group. Add `disabled` to disable one. `with-gap` is a no-op — the selected state is always the ring plus inner disc.

```html
<fieldset>
  <legend>Colour</legend>
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
</fieldset>
```

An `input + span` still works if you already have that markup, or if you follow BeerCSS’s `<label class="radio">` pattern.

```html
<fieldset>
  <legend>Colour</legend>
  <label class="radio">
    <input type="radio" name="group1">
    <span>Yellow</span>
  </label>
</fieldset>
```

### In a row

Put the labels in a `<div class="inline">` to sit them on one line. A bare group stacks vertically. It is not a `<nav>`: a row of form controls is not navigation, and marking it as one spends a landmark and announces "navigation" over a set of choices.

```html
<fieldset>
  <legend>Colour</legend>
  <div class="inline">
    <label>
      <input name="group2" type="radio" checked>
      Red
    </label>
    <label>
      <input name="group2" type="radio">
      Yellow
    </label>
  </div>
</fieldset>
```

---

## Chips

Small blocks for contacts, tags, and filters.

A chip is a `.chip`, and **the element says which kind it is** — the four Material 3 chip types, plus a non-interactive display chip, across three root elements. Add `outlined` for a bordered style. Static chips are CSS. The JavaScript plugin lives on a `.chips` wrapper.

| Type | Element | Why |
| --- | --- | --- |
| Display | `<span class="chip">` | Presents information. Not a control, not in the tab order. |
| Assist, suggestion | `<button type="button" class="chip">` | One action on press. |
| Filter | `<input type="checkbox" class="chip-input">` + `<label class="chip">` | Multi-select and toggleable, and it carries a value into the form. No JavaScript. |
| Input | `<span class="chip">` + a nested `<button class="close">` | The chip is a token; the delete button is the control. |

```html
<span class="chip outlined">Information</span>

<span class="chip">
  <img src="photo.jpg" alt=""> Jane Doe
</span>

<button type="button" class="chip">
  <span class="material-symbols" aria-hidden="true">event</span>
  Add to calendar
</button>

<input type="checkbox" class="chip-input" id="filter-flights">
<label class="chip" for="filter-flights">
  <span class="material-symbols" aria-hidden="true">check</span>
  Flights
</label>

<span class="chip">
  Tag
  <button type="button" class="close" aria-label="Remove Tag">
    <span class="material-symbols" aria-hidden="true">close</span>
  </button>
</span>
```

The delete button needs its own `aria-label` naming the chip it removes, because its only content is an icon. The icon is `aria-hidden` in every chip: the ligature is real text and is otherwise read out alongside the label.

A filter chip's selected state is `:checked` on its input, so it needs no script. Everywhere else the selected look is the `selected` class (`active` is the pre-0.8.0 name and still works).

Clicking `.close` removes the chip only when it sits inside a `.chips` container. Importing the bundle runs `Chips.Init()` on `DOMContentLoaded`, which wires that click. A lone `.chip` does not remove itself.

Before 0.8.0 every chip was a `<div class="chip">` and the delete affordance was an `<i class="close">` — focusable via `tabindex` but with no role and no name. That markup still renders; it is no longer correct and is not documented.

### Contacts

Put an image inside the chip. The name next to it is the accessible name already, so the image is decorative — `alt=""`.

```html
<span class="chip">
  <img src="photo.jpg" alt="">
  Jane Doe
</span>
```

### Tags

Put a `button.close` inside the chip. Give it `type="button"` so it cannot submit a surrounding form, and an `aria-label` naming what it removes.

```html
<span class="chip">
  Tag
  <button type="button" class="close" aria-label="Remove Tag">
    <span class="material-symbols" aria-hidden="true">close</span>
  </button>
</span>
```

### Javascript Plugin

The plugin turns a `.chips` container into an editable tag field. Type a value and press Enter to add a chip. Delete with the chip's delete button, or select a chip and press Backspace or Delete. Selecting a chip marks it `selected` and moves focus to its delete button.

`allowUserInput` defaults to `false`. Without it there is no text field and rendered chips have no delete button. Pass `allowUserInput: true` for the interactive field. `AutoInit()` starts every `.chips` except `no-autoinit`, but it uses the defaults, so those wrappers stay display-only until you call `init` with options.

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
| `closeIconClass` | String | `'material-symbols'` | Class on the icon inside the delete button. |
| `allowUserInput` | Boolean | `false` | If true, render a text field and a delete button per chip, so the user can add and remove chips. |
| `i18n` | Object | `{ remove: 'Remove' }` | Strings the component generates. `remove` prefixes the delete button's accessible name, giving "Remove Apple". |
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

Put the labels in a `<div class="inline">` to sit them on one line. A bare group stacks vertically. It is not a `<nav>`: a row of form controls is not navigation, and marking it as one spends a landmark and announces "navigation" over a set of choices.

```html
<div class="inline">
  <label>
    <input type="checkbox" checked>
    Red
  </label>
  <label>
    <input type="checkbox">
    Yellow
  </label>
</div>
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

Add `autocomplete` to a text input inside a `.field`. `AutoInit()` starts every `.autocomplete` except `no-autoinit`, but the default `data` list is empty — pass options (or call `init`) to give it something to suggest.

Set `isMultiSelect: true` to pick several values. A count appears on the field.

```html
<div class="field">
  <span class="material-symbols prefix" aria-hidden="true">textsms</span>
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
