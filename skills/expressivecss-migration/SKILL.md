---
name: expressivecss-migration
description: Migrates a project to the current ExpressiveCSS release from Materialize CSS or an older @expressivecss/expressive 0.x release, and removes the names that 1.0 drops. Use when upgrading ExpressiveCSS, replacing Materialize (`M.AutoInit`, `.btn`, `.modal`, `.input-field`, `.sidenav`) with ExpressiveCSS, or clearing deprecated classes before 1.0. Not for new ExpressiveCSS work or projects that already use current names.
license: MIT
compatibility: Works on its own. The sibling expressivecss skill holds each component's full contract.
metadata:
  author: BaezFJ
  version: "0.1.0"
  homepage: https://www.expressivecss.com
  repository: https://github.com/BaezFJ/ExpressiveCSS
  tags: expressivecss, materialize, migration, upgrade, material-design-3
---

# Migrate to ExpressiveCSS

ExpressiveCSS is derived from MaterializeCSS v2.2.2, and its names changed in three waves. 0.5.0 removed the Materialize components Material 3 has no place for. 0.8.0 renamed the rest to Material 3 names and corrected the markup so each element states what the component is. 1.0 removes the aliases kept since 0.8.0.

Almost nothing warns. Old classes render unstyled or slightly wrong, and old markup from before 0.8.0 keeps rendering. The search for leftover names after each step is the real check, so run it every time.

For a component's full markup, options and rules, use the `expressivecss` skill or the [API reference](https://www.expressivecss.com/llm.md). The [changelog](https://github.com/BaezFJ/ExpressiveCSS/blob/master/CHANGELOG.md) has a Migration entry for every release that needs one.

## Workflow

Copy this checklist and tick it off:

```
- [ ] 1. Find the starting point
- [ ] 2. Swap the package, assets and Sass imports
- [ ] 3. Replace the JavaScript API
- [ ] 4. Replace removed components
- [ ] 5. Rename classes and fix markup
- [ ] 6. Replace the aliases that 1.0 removes
- [ ] 7. Check the silent visual changes
- [ ] 8. Verify
```

Work through the steps in order, on a branch, so each step is one reviewable diff. After each step, run its search and fix every hit before moving on.

---

## Step 1: Find the starting point

Read the manifest, the lockfile and the pages that load the framework.

| Evidence | Starting point | Steps |
| --- | --- | --- |
| `@materializecss/materialize` or `materialize-css` in the manifest, `M.` calls, `materialize.min.css` | Materialize | All |
| `@expressivecss/expressive` below 0.8.0 | Early ExpressiveCSS | 2 to 8 |
| `@expressivecss/expressive` 0.8.0 or later | Current naming | 6 to 8, plus the changelog Migration entries after your version |

Take the version from the lockfile or `node_modules/@expressivecss/expressive/package.json`; a manifest range is not an installed version. Change the installed version only when the user asked for an upgrade.

---

## Step 2: Package, assets and Sass

Remove Materialize and add ExpressiveCSS with the project's package manager:

```sh
npm uninstall @materializecss/materialize materialize-css
npm install @expressivecss/expressive
```

- Replace `materialize.min.css` and `materialize.min.js` with `dist/css/expressive.min.css` and `dist/js/expressive.min.js`. The IIFE global is `Expressive`.
- Delete the Google Fonts `Material+Icons` stylesheet. Since 0.9.0 the stylesheet ships Material Symbols, Roboto and Noto Sans from `dist/fonts/`; keep that folder next to `dist/css/`.
- For Sass, use `@use "@expressivecss/expressive/src/sass/expressive";`. Load either the compiled CSS or the Sass entry, never both.
- Projects that import single partials: `_modal` is `_dialog`, `_dropdown` is `_menu`, `_collection` is `_list`, `_toast` is `_snackbar`, `_sidenav` is gone, `forms/_range` is `forms/_slider`, `_preloader` is `_progress`. `_collapsible`, `_pushpin`, `_tapTarget`, `_parallax` and the slideshow `_slider` were deleted.
- Sass breakpoint keys are `compact`, `medium`, `expanded`, `large` and `extra-large`. Replace `small`, `xlarge` and `xxlarge`, and use `bp-up("expanded")` where code used `bp-up("large")` for the old desktop boundary.

Search: `grep -rnE --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git "materialize(-css|\.min)|@materializecss|Material\+Icons|bp-(up|down)\(\"(small|xlarge|xxlarge)\"" .`

---

## Step 3: JavaScript API

| Old | Current |
| --- | --- |
| `M`, `M.AutoInit()` | `Expressive`, `Expressive.AutoInit()`, or `import { AutoInit } from '@expressivecss/expressive'` |
| `el.M_Modal`, `M.Modal.getInstance(el)` | `el['Expressive_<Component>']`, `Expressive.<Component>.getInstance(el)` |
| `M.Modal` | A native `<dialog>` with `showModal()` and `close()`. There is no `Modal` export |
| `M.toast()`, `Toast` | `new Expressive.Snackbar({ text })`. Snackbar is not part of `AutoInit()` |
| `Dropdown` | `Menu` |
| `Collapsible` | Native `<details>` and `<summary>` |
| `Sidenav`, `NavigationDrawer` | `NavigationRail` |
| `Materialbox` | `Lightbox` |
| `Slider` as an image slideshow | `Carousel`. Since 0.8.0 `Slider` is the range control |
| `Range` | `Slider`. The alias goes in 1.0 |
| `Pushpin`, `TapTarget`, `Parallax`, `Waves` | Removed; see Step 4 |

Behavior that changed without a rename:

- A Snackbar with an `action` defaults to `displayLength: Infinity` and `dismissible: true` (0.10.0). Pass both options to keep a timed snackbar.
- Autocomplete's `menuOptions.onItemClick` receives the clicked `<li>`, not the input (0.5.0).
- Datepicker custom row renderers must call `renderDay` and use `type="button"` (0.9.1).
- FAB `direction`, `hoverEnabled` and `toolbarEnabled` are gone; `FloatingActionButton` drives `.fab-menu` (0.10.0).
- Carousel `dist`, `shift`, `padding` and `numVisible` are gone. Only TypeScript reports them.

Never call `AutoInit()` and `Component.init()` on the same element. Add `no-autoinit` to elements you start by hand.

Search: `grep -rnE --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git "\bM\.|M_[A-Z]|window\.M\b|\b(Dropdown|Toast|Collapsible|Sidenav|NavigationDrawer|Materialbox|Pushpin|TapTarget|Parallax|Waves)\b|Expressive\.Range" .`

---

## Step 4: Removed components

These have no class to rename. Replace each with what it was standing in for.

| Removed | Replace with |
| --- | --- |
| `.modal`, `dialog.top`, `dialog.top-sheet` | `<dialog>` with `aria-labelledby` on its heading; a side or bottom sheet instead of a top sheet |
| `.collapsible` | `<details>` and `<summary>` |
| `.pushpin`, `.pin-*` | `position: sticky` |
| `.tap-target` | Nothing; remove it |
| `.waves-effect`, `.waves-light`, `.waves-circle` | Delete them. Interactive components paint their own state layer |
| `.parallax` | An `<img>` with `object-fit: cover` in a fixed-height container, or a carousel |
| `.pulse` | Your own animation, or a badge or progress indicator that states what it means |
| `.sidenav`, `.navigation-drawer` | `NavigationRail`; a navigation bar on Compact when the hierarchy fits, or a full-screen dialog for a larger menu |
| `.bottom-app-bar` | `.toolbar.docked` or `.toolbar.fixed`, with any FAB in `.toolbar-group` |
| `.fixed-action-btn`, `.fab` speed dial | `.fab-menu` with labelled actions; a toolbar for persistent commands |
| `.banner` | Inline text and buttons for a persistent message, a snackbar for temporary feedback, a dialog for a blocking decision |
| `.floating-sheet` | A dialog for blocking work, a bottom sheet on Compact, or a side sheet |
| `.segmented-button` | `.button-group.connected`, keeping native radios or checkboxes when the form submits them |
| `.tabs` inside an app bar, `.tabs.transparent` | A standalone `.tabs` component below the bar |
| Slideshow `div.slider > ul.slides`, `.caption` | `.carousel > .carousel-item > .carousel-item-content` |
| `.coverflow` | `.carousel.hero.center-aligned` |
| The 2014 color palette (`.red`, `.blue.lighten-2`, `.white-text`) | The role it stood for: `.red` is `.error`, `.blue` is `.primary`, `.green` is `.tertiary`. Pair each fill with its `on-*` text class |

Search: `grep -rnE --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git "class=\"[^\"]*\b(modal|collapsible|pushpin|pin-top|tap-target|waves-[a-z]+|parallax|pulse|sidenav|navigation-drawer|bottom-app-bar|fixed-action-btn|banner|floating-sheet|segmented-button|slides|coverflow|lighten-[0-9]|darken-[0-9]|white-text)\b" .`

---

## Step 5: Classes and markup

Materialize names, and markup that 0.8.0 corrected. Old markup in this table still renders, so nothing tells you it is wrong.

| Old | Current |
| --- | --- |
| `.btn`, `.btn-large`, `.btn-small`, `.btn-flat` | `<button class="button">` with a size class and `text` for flat. A link styled as a button is `<a class="button">` |
| `.btn-floating` | `button circle extra`, or `.fab-menu` for a menu |
| `.card`, `.card-panel`, `.card-content`, `.card-title`, `.card-action` | `<article>`, a heading, `<p>`, `<div class="actions">` |
| `.activator` on a card | `<button type="button" class="card-reveal-trigger" aria-controls="…">` |
| `.collection` | `ul.list` |
| `.dropdown-trigger`, `.dropdown-content` | `.menu-trigger` and a `<menu>` |
| `.navbar`, `.nav-wrapper`, `.brand-logo` | `header > nav` with an `aria-label`; `<div class="bar">` when the bar has no destinations |
| `<nav class="toolbar">` | `<div class="toolbar">` |
| `.input-field`, `.select-wrapper` | `<div class="field">` |
| An icon in a field | `<span class="material-symbols prefix" aria-hidden="true">`, or `suffix`. The side is required |
| `<small>` help text in a field | Give it an `id` and point the control's `aria-describedby` at it |
| `.materialize-textarea` | `.expressive-textarea` |
| `.switch` with `.lever` | `<label class="switch">` wrapping `<input type="checkbox">`, no `.lever` |
| `.filled-in`, `.with-gap` | Remove them |
| Radios in a `<nav>` or a bare group | `<fieldset>` with a `<legend>`; a row of controls is `<div class="inline">` |
| `.file-field` with a `<button>` or `.btn` | `<label class="button">` wrapping `<input type="file">`, and `readonly` on `input.file-path` |
| `.range-field`, `.range` | `.slider` around `<input type="range">` |
| `.preloader-wrapper`, `.spinner-layer`, `.preloader` | `.progress.circular` |
| `<div class="progress">` | Add `role="progressbar"`, and `aria-valuenow` when determinate |
| `.materialboxed` | `.lightboxed` with `tabindex="0" role="button"` |
| `<div class="chip">` | `<span class="chip">`, or `<button type="button" class="chip">` when it acts. A filter chip is `input.chip-input` with a `label.chip` |
| `<i class="close">` in a chip | `<button type="button" class="close" aria-label="Remove …">` holding the icon |
| `.carousel-slider` | `.carousel.flat` |
| `a.breadcrumb` | `<nav aria-label="Breadcrumb"><ol><li><a>`, with `aria-current="page"` on the last crumb |
| `ul.pagination` | `<nav class="pagination" aria-label="Pagination"><ol>` |
| `.page-footer`, `.footer-copyright` | A bare `<footer>` with `<nav>` link columns and a trailing `<small>` |
| `<li aria-selected="true">`, `.chip.active` | `<li class="selected">`, `.chip.selected` |
| `header.fixed` | Remove `fixed`; app bars are sticky. Set `position: static` on the `<header>` to let it scroll away |

Every `<nav>` needs an `aria-label` or `aria-labelledby`, and every `<dialog>` an `aria-labelledby`.

Search: `grep -rnE --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git "class=\"[^\"]*\b(btn|btn-[a-z]+|card-(panel|content|title|action)|activator|collection|dropdown-(trigger|content)|navbar|nav-wrapper|brand-logo|input-field|select-wrapper|materialize-textarea|lever|filled-in|with-gap|range-field|preloader-wrapper|spinner-layer|materialboxed|carousel-slider|breadcrumb|page-footer|footer-copyright)\b" .`

---

## Step 6: Aliases that 1.0 removes

These still work in 0.x and stop working in 1.0. Replace them now; each replacement has been documented since 0.8.0.

| Alias | Replacement |
| --- | --- |
| `<i class="material-icons">` and bare `<i>` icons | `<span class="material-symbols" aria-hidden="true">`, or the `-outlined`, `-rounded` and `-sharp` variants. An icon-only control needs an `aria-label` |
| A field icon without `.prefix` or `.suffix` | Add the side class |
| `.hide-on-small-only`, `.hide-on-small-and-down` | `.hide-on-compact-only` |
| `.hide-on-med-only` | `.hide-on-medium-only` |
| `.hide-on-xxl-only` | `.hide-on-extra-large-only` |
| `.show-on-small`, `.show-on-xxl` | `.show-on-compact`, `.show-on-extra-large` |
| `.no-padding` | `.p-0` |
| `.center-block` | `.mx-auto` plus your own `display: block` |
| `.no-select` | `user-select: none` in your own CSS |
| `.preloader` | `.progress.circular` |
| `class="datepicker"`, `class="timepicker"` | `class="date-picker"`, `class="time-picker"`. AutoInit starts only these in 1.0 |
| `.searchbar` | `search.search-bar` |
| `dialog.bottom`, the sheet's `.handle` | `dialog.bottom-sheet`, `.drag-handle` |
| `dialog.right`, `dialog.right-sheet` | `dialog.side-sheet` |
| `dialog.left`, `dialog.left-sheet` | `dialog.side-sheet.start` |
| Toolbar host `.max`, host `.filled` | `.docked`, `.vibrant`. A `.filled` action or `.max` spacer inside the bar stays |
| `.tooltip.max` | `.tooltip.rich` |
| `<hr>` between menu items | `<li class="divider" role="separator"></li>` |
| `<button>` or `.btn` as a file trigger | `<label class="button">` wrapping the input |
| `Expressive.Range` | `Expressive.Slider` |

Search: `grep -rnE --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git "material-icons|<i[ >]|hide-on-(small-only|small-and-down|med-only|xxl-only)|show-on-(small|xxl)\b|no-padding|center-block|no-select|\bpreloader\b|\"(datepicker|timepicker)\"|searchbar|dialog[^>]*\b(bottom|right|left)(-sheet)?\b|\.handle\b|tooltip[^\"]*\bmax\b|Expressive\.Range" .`

The `<i[ >]` and dialog patterns over-match, so check each hit by hand. `.hide-on-med-and-down` and `.hide-on-med-and-up` are current helpers, not aliases; keep them.

---

## Step 7: Silent visual changes

These keep their class names but look different. Compare a page before and after, and decide with the user which to keep.

- Button sizes (0.8.0): `small` is 40dp, not 32dp; the old 32dp button is `xsmall`. `large` is 96dp, not 56dp; the old 56dp button is `medium`, and `extra` still means 56dp. The default inset is 16dp on both sides.
- `button.circle` with no size class has a 20px glyph instead of 24px (0.8.0). Use `.icon-button`, or `.circle.medium`, to keep 24px.
- A button's height is a `min-height` (0.11.0). A rule that shrinks a button with `height` must also set `min-height`, or set `--md-comp-filled-button-container-height`.
- The default theme seed is Mist Iris `#c6a0f6` (0.13.0). Set `--md-source` or Sass `$md-source` to keep the brand color.
- `--md-sys-color-scrim` set on a subtree no longer reaches scrims (0.8.0). Set it at the root, or set `--md-comp-scrim-color` on one surface.
- Breakpoints match Material 3 (0.8.0): Compact below 600px, Medium from 600px, Expanded from 840px, Large from 1200px, Extra-large from 1600px. Grid classes `.s`, `.m`, `.l`, `.xl` and `.xxl` map to those in order, so `.l` is Expanded.

---

## Step 8: Verify

1. Run the static checks on every file you changed, from the project root with relative paths:

   ```sh
   npx --package @expressivecss/mcp-server expressivecss-lint <files>
   ```

2. Rerun the searches from Steps 2 to 6. Each remaining hit is either fixed or listed in your report with a reason.
3. Run the project's build and tests.
4. In a browser, open each migrated page in light and dark schemes and at each breakpoint the page reaches. Use every migrated interactive component with the keyboard and the pointer, and confirm the console has no errors.
5. Report what you could not check, such as no browser or no tests, as unverified rather than passed.
