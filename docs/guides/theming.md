# Themes and frosted glass

## Light and dark themes

ExpressiveCSS reads the `theme` attribute on the root element:

```html
<html lang="en" theme="light">
```

Use `light` or `dark` for a fixed scheme, or `auto` to follow the system setting,
as the [starter](../public/starter.html) does.

To switch themes while the page runs, change the attribute:

```js
document.documentElement.setAttribute('theme', 'dark');
```

## Frosted glass

Floating surfaces can blur the page behind them. The effect is off until you turn
it on in CSS, for the whole page or for one region:

```css
:root {
  --expressive-glass: true;
  --expressive-glass-blur: 16px;    /* frost thickness */
  --expressive-glass-opacity: 72%;  /* share of the surface color kept; 100% is solid */
}
```

The blur and opacity lines are optional; the values shown are the defaults.

Set `--expressive-glass` on `:root` or on an element that contains the surfaces.
The browser reads it from each surface's parent, so setting it on the surface
itself does nothing. Use `--expressive-glass: false` to turn it back off inside a
region.

A Sass build can turn glass on by default and change the defaults. The CSS
properties above still win:

```scss
@use "@expressivecss/expressive/src/sass/expressive" with (
  $expressive-glass: true,
  $expressive-glass-blur: 16px,
  $expressive-glass-opacity: 72%
);
```

### Which surfaces get the effect

Menus, tooltips, popovers, dialogs, the command palette, bottom and side sheets,
the snackbar, the navigation bar and rail, toolbars, and the search view.

Grouped menus and a modal navigation rail stay solid; a frosted rail would clip
its own scrim. People who ask for reduced transparency or more contrast in their
system settings also get solid surfaces. The switch is built on CSS style queries.
