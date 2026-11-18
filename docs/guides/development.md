# Working on ExpressiveCSS

Setup, checks, and the contribution process are in
[CONTRIBUTING.md](../../CONTRIBUTING.md). This page is a quick map of the commands
and folders.

Use Node 24 for work on this repository; `.nvmrc` selects it. The published
framework still supports Node 20 and newer.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Build all CSS, JavaScript, and declaration files |
| `npm run build:css` | Build expanded and minified CSS |
| `npm run build:used -- <app-directory> --out-dir <output>` | Build a consumer stylesheet after `npm run build`; add `--entry <app/ui.ts>` for JavaScript |
| `npm run build:js` | Build ESM, CommonJS, and browser bundles |
| `npm run build:types` | Generate TypeScript declarations |
| `npm run watch` | Watch Sass and TypeScript sources |
| `npm run verify` | Build, typecheck, test, check generated data, and verify docs |
| `npm run typecheck` | Check the TypeScript source without emitting files |
| `npm test` | Build all JavaScript bundles and CSS, then run the test suite |
| `npm run clean` | Remove generated build output |
| `npm run docs:dev` | Build the framework, then watch it beside the docs server |
| `npm run docs:build` | Build the documentation site into `_site/` and verify it |
| `npm run docs:preview` | Serve what `docs:build` wrote |

## Docs site

```sh
npm run docs:dev
```

This builds the framework, then runs the Sass and esbuild watchers next to the
docs server. Astro prints the URL. Refresh the browser to see your changes.

The docs source is in `docs/src/` and is published at
[www.expressivecss.com](https://www.expressivecss.com).

## Tests

```sh
npm test
npm run typecheck
```

Tests use Node's built-in test runner and jsdom. jsdom doesn't do layout, so
component tests check DOM structure, classes, content, and lifecycle, not
geometry or visual transitions.

## Where things live

| Location | Purpose | Tracked? |
| --- | --- | --- |
| `src/sass`, `src/ts` | Framework source | Yes |
| `docs/src` | Astro documentation and examples | Yes |
| `docs/guides` | Guides linked from the README | Yes |
| `mcp/expressivecss` | Independently versioned MCP package | Yes |
| `skills/expressivecss` | Agent guidance and generated component references | Yes |
| `skills/expressivecss-review` | Scored interface review that runs five specialist subagents | Yes |
| `skills/expressivecss-migration` | Step-by-step migration from Materialize or older 0.x releases, and off the names 0.16.0 removes | Yes |
| `skills/expressivecss-design-md` | Interview that writes a project `DESIGN.md` mapped to ExpressiveCSS tokens, components and WCAG 2.2 AA | Yes |
| `scripts`, `tests`, `visual` | Generators, verification, and test tooling | Source only |
| `semantics.json`, `llm.md`, `m3-guidelines.md` | Markup rules, API reference, design guidance | Yes |
| `SEMANTICS.md`, generated skill/MCP data | Derived files checked for drift | Yes |
| `dist`, `_site`, visual reports and caches | Build output | No |
| `.design-sync` | Optional external design previews | Configuration and source only |

More detail: [Sass architecture](../../src/sass/README.md),
[TypeScript conventions](../../src/ts/README.md), and
[development notes](../development-notes.md).
