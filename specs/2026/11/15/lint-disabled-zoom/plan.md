# Lint disabled zoom: plan

Phase 86. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch after phase 85.

## 1. Rule

Covers R1 to R5. Checks V1.

- [x] Add the R3 cases to the non-legacy table, the backtracking inputs and the CLI cases to `mcp/expressivecss/smoke.mjs`, run `npm test --prefix mcp/expressivecss` and watch it fail on the missing rule.
- [x] Append `viewport-zoom-disabled` to the regex list in `mcp/expressivecss/server.js`, with every gap bounded to one tag and a fixed length, and add its ID to the backtracking loop's rule filter. Add no export and no function.

## 2. Docs

Covers R6. Checks V2.

- [x] Name the check in the lint paragraph of `mcp/expressivecss/README.md` and in the Unreleased entry of `mcp/expressivecss/CHANGELOG.md`.

## 3. Suite

Covers R7. Checks V3.

- [ ] `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time.
