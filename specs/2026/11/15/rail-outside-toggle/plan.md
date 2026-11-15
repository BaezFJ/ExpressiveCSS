# Rail outside toggle: plan

Roadmap [phase 90](../../../../roadmap.md#phase-90-toggle-the-rail-from-outside-it). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch `feature/2026-11-15-milestone-scaffold-app-shells` at `4ca1a4bd4`.

Build before every test run, since tests read `dist/`. New functions stay below cyclomatic complexity 5 for the fallow gate.

## 1. Runtime

Covers R1 to R6. Checks V1 to V6.

- [ ] Add jsdom tests to `tests/navigation-rail.test.js` for V1 to V6. Watch them fail before the change.
- [ ] In `navigationRail.ts`: `_findToggle()` matches the CSS; a root-node click listener toggles from outside buttons; `_sync()` updates every outside toggle; `toggle()` records the opener; the Escape handler focuses it.

Done when V1 to V6 pass and the existing rail tests still pass.

## 2. Browser check

Covers R7. Check V7.

- [ ] Add `tests/navigation-rail-toggle-browser.test.js` with the V7 case in Chromium, Firefox and WebKit.

## 3. Docs, records and checks

Covers R8. Checks V8, V9.

- [ ] Update the navigation rail docs page and `llm.md` section, the scaffold docs page, demo and `llm.md` examples, and the changelog.
- [ ] Measure the JS gzip size against the phase base and update the budget line.
- [ ] Run `npm run build:skill` last, then V9: `npm run verify`, the MCP tests and `npm run verify:packages`.
- [ ] Record each result in validation.md.
