# Scaffold floating pane: plan

Roadmap [phase 95](../../../../roadmap.md#phase-95-float-the-pane-on-a-surface). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `ef84350fa`.

## 1. Floating surface

Covers R1 to R6. Checks V1 to V6.

- [x] Add browser tests to `tests/scaffold-browser.test.js` for V1 to V5. Watch V1, V2, V4 and V5 fail before the change.
- [x] `_scaffold.scss`: from 600px up, the shell color, the bar's rest and scrolled colors (`.scaffold > header:has(> nav, > .bar)`), the pane's surface, radius and conditional gaps, the separated or floating panes and panes-container exceptions, and the forced-colors border.
- [x] Adjust earlier tests that measured the pane at the window's edges (V6).

## 2. Docs, records and checks

Covers R7. Checks V7, V8.

- [x] Docs page, `llm.md`, `scaffold.md`, decision record, changelog.
- [x] CSS budget against the phase base; `npm run build:skill` last; V8.
- [x] Record each result in validation.md.
