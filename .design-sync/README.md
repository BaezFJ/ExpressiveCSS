# Optional design-sync previews

This directory contains JSX specimens for an external design preview service.
ExpressiveCSS itself is Sass and DOM-attaching TypeScript, not a React library.
Contributors can build, test, and document the framework without this integration.

Run the configured build from the repository root:

```sh
npm run build
node .design-sync/build-css.mjs
```

The framework bundles Material Symbols, Roboto, and Noto Sans fonts under
`dist/fonts/`, with licenses. The design adapter also prepends remote Google Fonts
imports for preview consumers that transfer only CSS and cannot resolve the
bundled relative font URLs. That behavior belongs to the optional adapter, not the
framework or documentation site. Do not copy it into the framework build.

The service project ID in `config.json` belongs to the maintainer's integration.
Do not use it for your own project. Generated CSS, preview caches, and integration
dependencies stay ignored. See [NOTES.md](NOTES.md) for adapter limitations and
[conventions.md](conventions.md) for preview authoring.
