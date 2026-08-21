## How to build with ExpressiveCSS

**There are no components to import.** ExpressiveCSS is a class-based CSS
framework: you write ordinary HTML and apply framework classes. The JavaScript
exports on `window.Expressive` (`Sidenav`, `Carousel`, `Menu`, …) are DOM-attaching
plugins that enhance existing markup — they are not React components and must
never be rendered as JSX. Build a design out of plain elements and the class
vocabulary below.

### Setup

No provider, no wrapper. Loading `styles.css` is the whole setup. Theming:

- `<html theme="light">`, `theme="dark"`, or `theme="auto"` (the default) picks
  the scheme.
- `--md-source` is the seed color. Every tonal ramp is generated from it with
  relative color syntax, so setting it on `:root` re-themes the entire design at
  runtime. Do not hand-pick hexes — change the seed.

### The idiom: elements first, then classes

Anatomy is the HTML. Many components have no class at all — the element *is* the
component. `<article>` is a card, `<footer>` with `<nav>` columns is a footer,
`<dialog>` is a dialog, `<button>` is a filled button.

| Family | Real class names |
| --- | --- |
| Button variants | bare `<button>` = filled; `tonal`, `outlined`, `elevated`, `text` |
| Button shapes/sizes | `circle`, `extend`, `small`, `large`, `extra` (a FAB is `circle extra`; 40dp is `circle extra small`) |
| Card variants | bare `<article>` = elevated; `filled`, `outlined` |
| Color fills | `primary`, `secondary`, `tertiary`, `error`, and their `-container` forms; `surface`, `surface-container`, `-low`, `-lowest`, `-high`, `-highest` |
| Color foregrounds | `on-primary-text`, `on-surface-text`, `on-error-container-text`, … — always pair a fill with its `on-*-text` |
| Type scale | `display-large` … `label-small` (15 roles: display/headline/title/body/label × large/medium/small) |
| Grid | `container` (`wide`, `max`), `row`, and `s1`–`s12`, `m*`, `l*`, `xl*`, `xxl*` |
| Spacing | `p-0`–`p-6`, `m-0`–`m-6` with `t`/`b`/`l`/`r`/`x`/`y` infixes (`py-3`, `mt-5`) |
| Helpers | `hide`, `hide-on-small-only`, `center-align`, `flow-text`, `truncate`, `z-depth-0`–`5` |
| Structure | `list`, `panes` / `list-detail`, `tabs`, `navigation-bar`, `navigation-rail`, `breadcrumb`, `pagination`, `badge`, `chip`, `snackbar`, `preloader`, `progress` |
| Icons | `<i class="material-symbols">icon_name</i>` (`material-icons` is a compat alias) |

Never invent class names. If a name is not in the guidelines or the stylesheet,
it does not exist — reach for a token or an element instead.

### Where the truth lives

- `guidelines/llm.md` — the complete markup and JavaScript API contract, per
  component. Read the relevant section before writing markup for a component.
- `guidelines/m3-guidelines.md` — when to use a component, its anatomy,
  placement, and adaptive behavior.
- `styles.css` and its `@import` closure — the authoritative class list and every
  `--md-sys-*` token.

### Patterns with no preview card

The card gallery only covers the JavaScript-backed components. Everything below
is CSS-only and has no card, so these are the canonical patterns — use them
verbatim. Each is taken from the framework's own documentation.

**App bar** — a `<header>` wrapping a `<nav>`. The heading is the title; icon-only
links become icon buttons.

```html
<header>
  <nav>
    <button type="button" aria-label="Menu"><i class="material-symbols">menu</i></button>
    <h2>Title</h2>
    <a href="#!" aria-label="Search"><i class="material-symbols">search</i></a>
  </nav>
</header>
```

**Navigation bar** — bottom navigation. `aria-current="page"` marks the destination.

```html
<nav class="navigation-bar" aria-label="Main">
  <a href="/" aria-current="page"><i class="material-symbols">home</i>Home</a>
  <a href="/browse"><i class="material-symbols">explore</i>Browse</a>
</nav>
```

**Panes** — the M3 canonical layouts. One pane below 840px, side by side above.
`list-detail`, `supporting`, `equal`, `three-pane`; `separated` for the floating
appearance.

```html
<div class="panes list-detail">
  <div class="list-pane">
    <header><h2>Inbox</h2></header>
    <ul class="list"><li><a href="#!">Brunch this weekend?</a></li></ul>
  </div>
  <div class="detail-pane">
    <header><button><i class="material-symbols">arrow_back</i></button><h2>Brunch</h2></header>
    <main><p>Detail content.</p></main>
  </div>
</div>
```

**Lists** — `aria-selected` marks the selected row.

```html
<ul class="list">
  <li><i class="material-symbols">star</i>List item<kbd>⌘C</kbd></li>
  <li aria-selected="true"><i class="material-symbols">star</i>Selected</li>
</ul>
```

**Badges** — a 6dp dot when empty, a 16dp stadium with a label. Nest inside the icon.

```html
<i class="material-symbols">mail<span class="badge"></span></i>
<i class="material-symbols">mail<span class="badge">999+</span></i>
```

**Buttons** — the element is the component; the variant is a class.

```html
<button>Filled</button>
<button class="tonal"><i class="material-symbols">add</i><span>Create</span></button>
<button class="outlined">Outlined</button>
<button class="circle extra" aria-label="Compose"><i class="material-symbols">edit</i></button>
```

**Text fields** — a `.field` wrapper; the `placeholder=" "` is required for the
floating label. Add `outlined` for the outlined variant.

```html
<div class="field outlined">
  <input id="name" type="text" placeholder=" ">
  <label for="name">Name</label>
  <small>Supporting text</small>
</div>
```

**Checkboxes, radios, switches** — a `<label>` wrapping the input. Switches add
`class="switch"`.

```html
<label><input type="checkbox" checked> Yellow</label>
<label><input name="g" type="radio"> Red</label>
<label class="switch"><input type="checkbox" checked> Bluetooth</label>
```

**Table, breadcrumbs, pagination, toolbar, footer**

```html
<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Alvin</td></tr></tbody></table>

<nav class="breadcrumb-wrapper">
  <a href="#!" class="breadcrumb">First</a><a href="#!" class="breadcrumb">Second</a>
</nav>

<nav class="pagination" aria-label="Pagination">
  <ol><li><a href="#!" aria-current="page">1</a></li><li><a href="#!">2</a></li></ol>
</nav>

<nav class="toolbar" aria-label="Text format">
  <button type="button" class="circle active" aria-label="Bold"><i class="material-symbols">format_bold</i></button>
</nav>

<footer>
  <nav><h2>Links</h2><a href="#!">Link 1</a></nav>
  <small><span>&copy; 2026</span></small>
</footer>
```

**Grid** — `container` > `row` > column classes. Widths are per breakpoint.

```html
<div class="container">
  <div class="row">
    <div class="s12 m8 l6">Main</div>
    <div class="s12 m4 l6">Aside</div>
  </div>
</div>
```

### An idiomatic snippet

```html
<article class="outlined">
  <h3>Trip to the coast</h3>
  <p class="body-medium">Two nights in Mendocino, leaving Friday.</p>
  <nav>
    <button class="text">Share</button>
    <button class="tonal"><i class="material-symbols">open_in_new</i><span>Open</span></button>
  </nav>
</article>
```
