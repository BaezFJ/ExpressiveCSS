# Scaffold templates: plan

Roadmap [phase 98](../../../../roadmap.md#phase-98-move-the-bundled-templates-to-scaffold). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `15b206a0e`.

## 1. Navigation bar without a rail

Covers R5. Check V4.

- [x] Add a scaffold browser test for V4; watch it fail.
- [x] `_scaffold.scss`: from 600px up, a `navbar` row above the status row in the default, tall-rail and side-sheet templates; the navigation bar hidden only when a rail is shown; no shell bottom padding while it shows.

## 2. Templates

Covers R1 to R4. Checks V1 to V3.

- [x] Rewrite the five templates in `docs/public/`.
- [x] Update `tests/layout-templates-browser.test.js` (390, 700 and 1280px; navigation bar and rail per width; content width; the app bar toggle at 1280 and 390; the expanded template's hidden rail and menu button below 840px) and add the R1 static check.

## 3. Docs, records and checks

Covers R6. Checks V5, V6.

- [x] Layout templates page, scaffold docs and `llm.md`, layout skill, changelog, CSS budget, decision record pin; `npm run build:skill` last; V6.
- [x] Record each result in validation.md.
