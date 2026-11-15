# Scaffold side sheet column: plan

Roadmap [phase 96](../../../../roadmap.md#phase-96-open-a-side-sheet-as-a-third-column). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `c940ffb9b`.

## 1. Sheet column

Covers R1 to R5. Checks V1 to V5.

- [ ] Add browser tests to `tests/scaffold-browser.test.js` for V1 to V5. Watch V1, V3 (hidden case) and V5 fail before the change.
- [ ] `_scaffold.scss`: a fourth `sheet` column in the 600px-up templates and held-column rules; from 1200px up, the open, non-modal, non-hidden sheet static in it with its width, bleed, padding, z-index, entry slide and divider reset; the pane's 16px gap before an open sheet; `[hidden]` sheets hidden.
- [ ] Rerun the earlier scaffold tests (V6).

## 2. Docs, records and checks

Covers R6. Checks V7, V8.

- [ ] Both docs pages, both `llm.md` sections, `scaffold.md`, decision record, changelog.
- [ ] CSS budget against the phase base; `npm run build:skill` last; V8.
- [ ] Record each result in validation.md.
