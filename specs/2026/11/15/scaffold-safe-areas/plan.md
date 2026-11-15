# Scaffold safe areas: plan

Roadmap [phase 97](../../../../roadmap.md#phase-97-keep-regions-inside-safe-areas). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `dfc7648ad`.

## 1. Insets

Covers R1 to R6. Checks V1 to V6.

- [ ] Add an inset-rewriting helper (regex over every `env(safe-area-inset-*)` form, then an assert that none is left) and V1 to V5 to `tests/scaffold-browser.test.js`. Watch V1, V2, V4 and V5 fail before the change.
- [ ] `_scaffold.scss`: the scaffold's side padding at every width; its top and bottom padding from 600px up, without the bottom when a status bar shows; below 600px the bar's own top inset and the scaffold's top or bottom inset without a bar or navigation bar; the compact scroll padding's top inset; the rail overlay's insets.
- [ ] Run the earlier scaffold tests (V6).

## 2. Docs, records and checks

Covers R7. Checks V7, V8.

- [ ] Docs page (`viewport-fit=cover`), `llm.md`, `scaffold.md`, decision record, changelog.
- [ ] CSS budget against the phase base; `npm run build:skill` last; V8.
- [ ] Record each result in validation.md.
