# Read the elevation token in the map popup

Date: 2026-10-26
Roadmap phase: Phase 54, read the elevation token in the map popup
Branch: `fix/map-popup-elevation-token`
Base: `origin/master` at `5ecfbbbf9` (#441)
Status: implemented on the branch; not merged

Follow the [mission's success criteria](../../../../mission.md#success-criteria), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 54](../../../../roadmap.md#phase-54-read-the-elevation-token-in-the-map-popup). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 1 to 51 are marked complete in the roadmap. Phases 52 and 53 are not marked yet, but both merged to `master` in #440 and #441 with their specs in `specs/2026/10/26/`. Phase 54 is the next phase in order and has no dependencies. No branch or spec directory for it existed at the base commit. The review finding behind it is task M1 in `TASKS.md`.

## Current behavior

These facts come from the base commit.

- `src/sass/components/_map.scss` styles `.map .maplibregl-popup-content` with `box-shadow: map.get($elevations, "2") !important`. Sass inlines the literal level 2 shadow, so the compiled rule never reads `--md-sys-elevation-level2`.
- `tokens/_elevation.scss` emits one `--md-sys-elevation-level<N>` property per key of `$elevations`. The `z-depth($level, $important: false)` mixin in `abstracts/_elevation.scss` writes `box-shadow: var(--md-sys-elevation-level<N>)`, with `!important` when `$important` is true. Its comment says only the `.z-depth-0` utility passes `$important`.
- `llm.md` tells authors that "the classes, the mixin and every component read them, so a theme can soften or deepen a level at runtime." The map popup breaks that promise: a page that sets `--md-sys-elevation-level2` changes menus and cards but not the popup.
- `maplibre-gl.css` is unlayered and sets `box-shadow: 0 1px 2px rgba(0,0,0,.1)` on `.maplibregl-popup-content`. An unlayered normal declaration beats a layered one, so the popup's shadow must stay `!important` to win. `src/sass/README.md` lists the map's MapLibre overrides as an accepted use of `!important` in `components/`.
- `map.get` on line 143 is the only use of the `sass:map` module in `_map.scss`.
- `tests/map-browser.test.js` loads `maplibre-gl.css` and `expressive.css`, opens real popups in Chromium, Firefox and WebKit, and skips an engine that has no WebGL2.

## Scope

In scope: the popup's `box-shadow` declaration, the `z-depth` mixin comment, the unused `sass:map` import in `_map.scss`, one browser assertion, a CHANGELOG entry and a gzip budget line.

Out of scope:

- A component token such as `--md-comp-map-popup-elevation`. The roadmap asks for the system token only.
- Other elevation, padding, shape or color values in the map partial.
- The other stylesheet review phases (55 to 58).
- TypeScript changes.

## Requirements

- **R1.** An open map popup's computed `box-shadow` follows `--md-sys-elevation-level2`. Setting that token on the page changes the popup's shadow.
- **R2.** The popup's shadow still beats MapLibre's own `box-shadow` from the unlayered `maplibre-gl.css`. With no token override, the popup renders the same level 2 shadow it rendered at the base commit.
- **R3.** The popup takes its shadow from the shared `z-depth` mixin, so the mixin stays the one path from `$elevations` to a component shadow. The mixin's comment names the map popup as the second caller that passes `$important`, and why.
- **R4.** `_map.scss` no longer loads `sass:map` once nothing in it uses the module.
- **R5.** `CHANGELOG.md` records the fix under Unreleased, and `tests/selective-builds.test.js` gets a reviewed budget line for the CSS gzip change.

## Confirmed decisions

- Use `@include z-depth(2, true)` rather than a hand-written `var(--md-sys-elevation-level2) !important`. The mixin checks the level against `$elevations` and keeps one source for every component shadow. Chosen in the interview on 2026-10-26.
- Keep `!important`. Without it, MapLibre's unlayered declaration wins over the components layer.
- Name the branch `fix/map-popup-elevation-token`, from `origin/master` fetched on 2026-10-26, to match the `fix/` branches of phases 52 and 53.

## Technical constraints

- Tests run against `dist/`, so build before testing.
- `abstracts` is forwarded to consumers. The mixin's name, parameters and behavior must not change; only its comment does.
- Don't run two test suites at once; parallel browser runs flake.
- Rerun `npm run build:skill` after the last edit, since the contract hash covers the CHANGELOG and tests.

## Dependencies

None. Phase 54 doesn't depend on phases 52, 53 or 55 to 58.

## Deferred decisions

None.
