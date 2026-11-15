# Lint transition all: plan

Phase 85. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch after phase 84.

## 1. Rule

Covers R1 to R5. Checks V1.

- [x] Add the non-legacy case table (with `raw-color-in-component-style` cases), its ID coverage check, the backtracking inputs and the CLI case to `mcp/expressivecss/smoke.mjs`, run `npm test --prefix mcp/expressivecss` and watch it fail on the missing rule.
- [x] Append `transition-all` to the regex list in `mcp/expressivecss/server.js`, with the value gap bounded at 500 characters and no whitespace run before it, add the new ID to the backtracking loop's rule filter, and update the comment on `authoringRules`. Add no export and no function.

## 2. Docs

Covers R6. Checks V2.

- [x] Update the lint paragraph in `mcp/expressivecss/README.md` and the header comment in `mcp/expressivecss/lint.mjs`, and add the Unreleased entry to `mcp/expressivecss/CHANGELOG.md`.

## 3. Suite

Covers R7. Checks V3.

- [ ] `npm run verify`, then `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`, one at a time.
