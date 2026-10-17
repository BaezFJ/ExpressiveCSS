# Framework contribution path

Read the repository's contributor instructions, `CLAUDE.md`, and relevant domain README before editing. Trace callers and the owning documentation, Sass or TypeScript, semantics, fixtures, and tests. Preserve exports, markup compatibility, accessibility, upstream references, and license notices. Fix the shared source, add a focused regression check, and run the applicable contributor, browser, and MCP/package checks.

For Sass changes, also load the `scss-architecture` skill when it is installed. It covers module loading, compile checks, and deprecations, and its ExpressiveCSS profile defers to `src/sass/README.md`.

The catalogue owns page inventory; `llm.md` and `semantics.json` own generated component contracts. Run `npm run build:semantics` and `npm run build:skill` after changing their sources; never edit generated copies by hand. Do not publish as part of ordinary contribution work.
