# Scaffold compact scrolling: plan

Roadmap [phase 92](../../../../roadmap.md#phase-92-scroll-the-document-on-compact-windows). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `fc08a9e75`.

Build before every test run. Don't run two test suites at once.

## 1. Compact layout

Covers R1 to R8b. Checks V1 to V6a, V4a.

- [x] Add compact browser tests to `tests/scaffold-browser.test.js` for V1 to V6a. Watch V1, V3 and V4 fail before the change.
- [x] `_scaffold.scss`: the compact grid, document scrolling, the navigation bar region (hidden from 600px), the hidden collapsed rail and `.scaffold-rail`, the `.modal` held column and the bar timeline from 600px only, and the header comment.

## 2. Docs, records and checks

Covers R9. Checks V7, V8.

- [x] Docs page (demo with a navigation bar, wrapped in a `.scaffold-demo` box styled in `docs/static/docs.css`; scrolling and limits sections),  `llm.md`, `scaffold.md`, decision record, changelog.
- [x] CSS gzip budget against the phase base; `npm run build:skill` last; V8.
- [x] Record each result in validation.md.
