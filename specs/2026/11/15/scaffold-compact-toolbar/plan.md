# Scaffold compact toolbar: plan

Roadmap [phase 93](../../../../roadmap.md#phase-93-float-the-trailing-toolbar-on-compact-windows). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `217e909a9`.

## 1. Floating toolbar

Covers R1 to R7, R6a. Checks V1 to V5, V4b.

- [ ] Add compact toolbar browser tests to `tests/scaffold-browser.test.js` for V1 to V5 and V4b. Watch V1, V2 and V4b fail before the change.
- [ ] `_scaffold.scss`: below 600px, a row layout for the toolbar, the group and the group's inner toolbar; centered sticky placement with block margins, z-index and the two bottom offsets (replacing phase 92's `justify-self: end`); the top placement for `.tooltip.left`.
- [ ] Watch V4 fail, then add the larger scroll padding when a toolbar is present.

## 2. Docs, records and checks

Covers R8. Checks V6, V7.

- [ ] Docs page, `llm.md`, `scaffold.md`, decision record, changelog.
- [ ] CSS gzip budget against the phase base; `npm run build:skill` last; V7.
- [ ] Record each result in validation.md.
