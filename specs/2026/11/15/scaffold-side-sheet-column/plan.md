# Scaffold side sheet column: plan

Roadmap [phase 96](../../../../roadmap.md#phase-96-open-a-side-sheet-as-a-third-column). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `c940ffb9b`.

## 1. Sheet column

Covers R1 to R5. Checks V1 to V5.

- [x] Add browser tests to `tests/scaffold-browser.test.js` for V1 to V5. Watch V1 and V5 fail before the change, and V3's hidden case without the `[hidden]` exclusion.
- [x] `_scaffold.scss`: a fourth `sheet` column in the 600px-up templates and held-column rules; from 1200px up, the open, non-modal, non-hidden sheet static in it with its width, bleed, padding, z-index, entry slide and divider reset; the pane's 16px gap before an open sheet; `[hidden]` sheets left out (the base `[hidden]` rule already hides them).
- [x] Rerun the earlier scaffold tests (V6).

## 2. Docs, records and checks

Covers R6. Checks V7, V8.

- [x] Both docs pages, both `llm.md` sections, `scaffold.md`, decision record, changelog.
- [x] CSS budget against the phase base; `npm run build:skill` last; V8.
- [x] Record each result in validation.md.
