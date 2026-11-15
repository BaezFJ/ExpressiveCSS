# Button loading state: plan

Phase 83. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `8b8c0be20`.

## 1. Guard and indicator

Covers R1, R2, R5. Checks V1.

- [x] Add the R5 browser test and watch it fail.
- [x] Add `src/ts/behaviors/busyButtons.ts`, call `Init()` from `src/ts/index.ts`, export it from `src/ts/modular.ts`.
- [x] Add the `aria-busy` rules to `src/sass/components/_buttons.scss`.

Done when V1 passes.

## 2. Docs and guidance

Covers R3, R4, R6. Checks V2, V3.

- [x] Document the state in `llm.md` and `docs/src/pages/buttons.astro`, map the export in `docs/src/data/nav.ts`, revise the buttons App behavior, update the reading budget, the gzip budgets and the CHANGELOG, then `npm run build:skill`.

Done when V2 and V3 pass.

## 3. Suite

Covers R6. Checks V4.

- [x] `npm run verify`, `npm test --prefix mcp/expressivecss`.
