# Scaffold status bar: plan

Roadmap [phase 94](../../../../roadmap.md#phase-94-add-a-status-bar-region). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `c4781e2bb`.

## 1. Status row

Covers R1 to R5, R7. Checks V1 to V4, V4a.

- [x] Add status bar browser tests to `tests/scaffold-browser.test.js` for V1, V2 and V4, and the V4a fixtures to `tests/scaffold.test.js`. Watch V1, V2, V4 and V4a fail before the change.
- [x] `_scaffold.scss`: a third `status` row in both layouts, the status bar placed in it, hidden below 600px.
- [x] `semantics.json`: the status bar in `scaffold-one-child-per-region`, its message and the row note; `npm run build:semantics`.

## 2. Docs, records and checks

Covers R6. Checks V5, V6.

- [x] Both docs pages (a status bar in the scaffold demo), both `llm.md` sections, `scaffold.md`, decision record, changelog.
- [x] CSS budget against the phase base; `npm run build:skill` last; V6.
- [x] Record each result in validation.md.
