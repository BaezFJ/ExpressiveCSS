# Custom scrollbars: final validation

Phases 99–106 are implemented in eight commits in one PR. The base is
`bb1c50c6f04415f0a42e484c5e9e3812029df4c6` (master).

## Environment and checks

Node 24.22.3; Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2.
Browser libraries were supplied from a local cache outside the checkout.
Checks ran sequentially because package prepack rebuilds the shared bundles.

| Check | Result |
| --- | --- |
| `npm run verify` | Passed: 4,176 tests, 0 failures, 0 skips; build, typechecks, generated-data checks and docs build/verification passed. |
| Focused scrollbar browser suite | Passed: 50 checks across Chromium, Firefox and WebKit. |
| ScrollArea lifecycle suite | Passed: 3 checks, including pending work, reinitialization, detached frames and author moves. |
| Targeted browser/lifecycle, tokens, semantics, selective builds and docs coverage | Passed together: 113 checks. |
| Critical-flow profiles | Passed: keyboard and Arabic/touch/reflow in all three engines. |
| `npm test --prefix mcp/expressivecss` | Passed: 8 tools, resources, completion, budgets and recovery. |
| `npm run verify:packages` | Passed: framework and MCP tarballs validated in isolated consumers. |
| `npm run test:visual -- --grep scroll-area --workers 2` | Four baseline and four head captures completed; all four comparisons report expected changes from the expanded guide. This is a difference report, not a visual pass. |

The full run initially caught an undefined label font token. The label now uses
`--md-sys-typescale-label-medium-font`; the final full run above passed. The anchor
fixture resets the URL fragment retained by `setContent` and waits for native
scrolling before measuring; its geometry assertions remain unchanged.

Native-only selective Sass builds omit the generated bar styles. Custom bars
load `scroll-area` in both `$components` and `$utilities`. Final gzip sizes,
excluding source-map trailers, are 115,288 bytes for JavaScript (+3,043 over the
base) and 94,925 bytes for CSS (+473).

## Artifacts and limits

Local logs: `.cache/custom-scrollbars/{verify,mcp,packages,visual}.log`.
Visual report: `visual/report/index.html`; captures and differences:
`visual/results/`. Compact and large-dark captures were inspected for layout
issues. Owner visual approval required by CONTRIBUTING.md remains pending.
No claim is made about real devices, native browser zoom or spoken output.
WebKit does not emulate forced colors; that preference was checked in Chromium
and Firefox. Coarse primary pointers were checked with mobile emulation in
Chromium and WebKit. The generated UI adds no keyboard stops and remains
`aria-hidden`; keyboard scrolling stays on the native scrollport.

## Tested implementation inputs

| File | SHA-256 |
| --- | --- |
| `src/ts/components/scrollArea.ts` | `5082dda7c613ac86a3b076d2c398c55620a6e0b27750d3609613bbb637cf0433` |
| `src/sass/components/_scroll-area.scss` | `bb283141af8eb6bc05fe380aa199bac1a113da27cdd5fa98d57de1cf4f7e137d` |
| `src/sass/utilities/_scroll-area.scss` | `2c8708509387b8a8041065b9e01572780a31811b682eacdd5352414d8e4a08ce` |
| `tests/custom-scroll-area-browser.test.js` | `f6050e4f2602f2c9a4bb6688822bf87da53edfc50fc18c18fc7cf68e451ef531` |
