# Plan: auto-fill grid utility

Roadmap phase: Phase 27, auto-fill grid utility. Branch `feature/2026-10-23-auto-fill-grid` from `origin/master` at `3ef49121a`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each ends with `npm test` passing, so each can be its own commit.

## 1. Utility class and browser test

Outcome: `.grid-auto-fill` exists in the built CSS and the browser test proves its column counts.

Prerequisites: none.

- [ ] Add browser cases to `tests/helpers-browser.test.js` for V1 to V4. Build with `npm run build:css` and confirm they fail because the class does not exist.
- [ ] Add `.grid-auto-fill` beside `.grid` and `.inline-grid` in `src/sass/utilities/_helpers.scss`, with `display: grid` and `grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--grid-column-min, #{rem(240px)})), 1fr))`, plus a short comment on what the property does.
- [ ] Rebuild and run `node --test tests/helpers-browser.test.js` until V1 to V4 pass in all three engines.
- [ ] Run V5 to check that nothing else changed.

Completion check: V1 to V5 pass, none skipped.

Covers: R1 to R6; V1 to V5.

## 2. Docs, budget and generated data

Outcome: authors and agents can find the class, and the repository checks pass.

Prerequisites: group 1.

- [ ] Add the class, `--grid-column-min`, its 240px fallback, the one-column behavior in narrow containers and the `.gap-*` pairing to the "Display and position" section of `docs/src/pages/helpers.astro`, with one live example.
- [ ] Add the same facts to the Helpers "Display and position" section of `llm.md`.
- [ ] Add an entry under `## [Unreleased]` / `### Added` in `CHANGELOG.md`.
- [ ] Rebuild, read the new CSS gzip size, and add a reviewed budget line in `tests/selective-builds.test.js`.
- [ ] Run `npm run build:skill` last, then V6 and V7.

Completion check: V6 and V7 pass.

Covers: R7, R8; V6, V7.
