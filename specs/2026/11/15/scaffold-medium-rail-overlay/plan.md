# Scaffold medium rail overlay: plan

Roadmap [phase 91](../../../../roadmap.md#phase-91-overlay-the-expanded-rail-on-medium-windows). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `66d3accac`.

Build before every test run, since tests read `dist/`. New functions stay below cyclomatic complexity 5.

## 1. Overlay and runtime

Covers R1 to R6c. Checks V1 to V5c.

- [ ] Add browser tests to `tests/scaffold-browser.test.js` for V1 to V5b. Watch V2 and V3 fail before the change.
- [ ] `_navigation-rail.scss`: apply `_modal-rail` to a scaffold's expanded rail from 600px to 839px.
- [ ] `_scaffold.scss`: keep the rail column at the collapsed width for any rail from 600px to 839px and for a `.modal` rail.
- [ ] `navigationRail.ts`: `_isModal()` also returns true for a direct child of `.scaffold` from 600px to 839px.

## 2. Docs, records and checks

Covers R7. Checks V6, V7.

- [ ] Update both docs pages and both `llm.md` sections, and add a changelog line.
- [ ] Update the scaffold record's `sha256` and `documentedSupport`, and add the overlay browser check to its `capabilityReview`.
- [ ] Measure the CSS and JS gzip sizes against the phase base and update both budget lines.
- [ ] Run `npm run build:skill` last, then V7.
- [ ] Record each result in validation.md.
