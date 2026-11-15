# Anchored heading offset: plan

Phase 84. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch at `d762107f7`.

## 1. Offset

Covers R1, R2. Checks V1.

- [ ] Add `tests/anchored-heading-offset-browser.test.js` and watch it fail.
- [ ] Add the root token and the heading rule to `src/sass/components/_navbar.scss`.

## 2. Docs

Covers R3. Checks V2.

- [ ] Document it in `llm.md` and the app bar docs page, add the CHANGELOG entry and the CSS budget line, run `npm run build:skill`.

## 3. Framework-stage rerun

Covers R4. Checks V3.

- [ ] Build all three prompts twice, review with the baseline trees, run each prompt's script, record `2026-11-15-framework-stage` and six rows.

## 4. Suite

Covers R5. Checks V4.

- [ ] `npm run verify`, `npm test --prefix mcp/expressivecss`.
