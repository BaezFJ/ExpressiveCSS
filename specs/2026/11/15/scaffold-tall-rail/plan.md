# Scaffold tall rail: plan

Roadmap [phase 89](../../../../roadmap.md#phase-89-run-the-rail-the-full-height). Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch `feature/2026-11-15-milestone-scaffold-app-shells` at `abd59e7c5`.

Build before every test run, since tests read `dist/`. Don't run two test suites at once.

## 1. The modifier

Covers R1 to R7. Checks V1 to V5.

Prerequisites: phase 88.

- [x] Add `&.tall-rail { grid-template-areas: … }` to `src/sass/components/_scaffold.scss`, with a line in the header comment.
- [x] Add a tall-rail test to `tests/scaffold-browser.test.js` covering V1 to V5 in all three engines. Watch it fail before the modifier exists.

Done when V1 to V5 pass and phase 88's scaffold tests still pass.

## 2. Docs, records and checks

Covers R8. Checks V6, V7.

Prerequisites: group 1.

- [x] Add a "Tall rail" section with a code example to `docs/src/pages/scaffold.astro`, a paragraph with an example to the Scaffold section of `llm.md` after the full example, and the modifier to the rails row of `skills/expressivecss/expressivecss-design/references/scaffold.md`.
- [x] Name the modifier in the scaffold record's `documentedSupport` and add the tall-rail browser check to its `capabilityReview`, then update its `sha256`.
- [x] Add the changelog line and the gzip budget line measured against the phase base.
- [x] Run `npm run build:skill` last, then V7: `npm run verify`, the MCP tests and `npm run verify:packages`.
- [x] Record each result in validation.md.

Done when every agent-run check passes.
