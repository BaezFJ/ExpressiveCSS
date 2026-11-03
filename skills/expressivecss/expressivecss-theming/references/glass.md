# Frosted glass

The [Glass documentation](https://www.expressivecss.com/glass.html.md) and `src/sass/abstracts/_mixins.scss` own this optional treatment. Glass is off by default and needs no JavaScript. Enable it on `:root` or an ancestor of the floating surfaces:

```css
.floating-region {
  --expressive-glass: true;
  --expressive-glass-blur: 16px;
  --expressive-glass-opacity: 72%;
}
```

The style query reads the surface's parent. Setting the switch on the surface itself has no effect. `--expressive-glass: false` restores solid surfaces within a region. Opacity must be a percentage; `100%` is solid. Supported surfaces include menus, tooltips, dialogs, sheets, snackbars, navigation bars and rails, toolbars and the search view. Components retain their own semantic container colors.

Sass defaults are `$expressive-glass: false`, `$expressive-glass-blur: 16px` and `$expressive-glass-opacity: 72%`. The runtime custom properties override them. Follow the Sass guide before configuring the module's first load.

Reduced-transparency and increased-contrast preferences restore solid surfaces. Check readability over the actual content behind the surface in both schemes. `backdrop-filter` creates a containing block for fixed descendants; an application-owned fixed scrim inside that surface can become clipped. Test it rather than raising its `z-index`. Keep an opaque fallback where style queries or backdrop filtering are unavailable.
