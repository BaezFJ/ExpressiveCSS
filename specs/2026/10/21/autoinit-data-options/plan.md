# Plan: AutoInit options from data attributes

Roadmap phase: Phase 20, AutoInit options from data attributes. Branch `feature/2026-10-21-autoinit-data-options` from `origin/master` at `8d45c2c4`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed.

Implemented 2026-10-21. Two Codex review rounds changed group 2 after it first passed: nested objects with a rejected key now drop as a whole, `data` is blocked, and the retry after a constructor error was removed. See [requirements.md](requirements.md#agent-decisions-within-that-design).

## 1. Failing tests

Outcome: tests that describe the attribute contract fail against the current bundle, and the existing AutoInit tests pass.

Prerequisites: none.

- [x] Add a `describe("AutoInit options from markup")` block to `tests/autoinit.test.js`. Mock `console.warn` with `t.mock.method` and restore it, and tear instances down in `finally`.
- [x] Cover the roadmap check: a `.menu-trigger` with `data-menu-options` and a `.tooltipped` with `data-tooltip-options` start through `AutoInit()`, and their instances' `options` hold the markup values (V1).
- [x] Cover fallback: invalid JSON, a JSON array, an unknown key, a kind mismatch, a `null`-default callback, a function default and an `undefined` default each leave that option at its default and log a warning, while a valid sibling key still applies (V2). Cover the Chips and Autocomplete `data` values that make constructors throw (V13).
- [x] Cover `AutoInit` options winning per key and Tooltip's `data-position` keeping its precedence (V3), `__proto__`, `allowUnsafeHTML` and `minYear` (V4), nested `i18n` and array element filtering (V5), one element carrying two components' attributes (V6), a multi-word name such as `data-form-select-options` (V7), and an element without the attribute keeping its defaults (V8).
- [x] Build with `npm run build:js`, run `node --test tests/autoinit.test.js`, and confirm only the new cases fail.

Completion check: only the new cases fail.

Covers: R1 to R7; V1 to V8, V13.

## 2. Reading the attribute

Outcome: AutoInit applies accepted markup options per element and warns about the rest.

Prerequisites: group 1.

- [x] In `src/ts/components/registry.ts`, add small helpers: the attribute name for a registry key, a JSON kind check that also checks array elements against a non-empty default array, a recursive filter of a parsed object against a defaults object that copies only `Object.hasOwn` keys, and a reader that parses the attribute with `JSON.parse` inside `try` and warns on rejections. Block `allowUnsafeHTML`, `minYear`, `maxYear` and `data` in the filter, and drop a whole nested object when one of its keys is rejected.
- [x] Add one per-element function that merges `{ ...markup, ...options[name] }` and calls `component.init(el, merged)`. Use the function from both the filtered and unfiltered paths of `AutoInit`.
- [x] Keep each new function below cyclomatic complexity 5.
- [x] Build, run `node --test tests/autoinit.test.js`, then `tests/components.test.js` and `tests/bundle.test.js` one file at a time.

Completion check: V1 to V8 and V13 pass, and the regression suites in V9 pass.

Covers: R1 to R8; V1 to V9, V13, V14.

## 3. Docs and generated guidance

Outcome: authors and agents can find the attribute and its limits.

Prerequisites: group 2.

- [x] Add an "Options in markup" section to `docs/src/pages/auto-init.astro` with the naming rule, an example, precedence (including Tooltip's own attributes), which options can be set, the fallback behavior and the Menubar limit.
- [x] Add the same facts, shorter, to the JavaScript initialization section of `llm.md`.
- [x] Add an Unreleased Added entry to `CHANGELOG.md`.
- [x] Run `npm run build:skill`, then `npm run check:generated`.

Completion check: `npm run check:generated` passes and the docs describe R1 to R7 (V10).

Covers: R9; V10.

## 4. Budget and checks

Outcome: the branch is ready for review.

Prerequisites: group 3.

- [x] Build, read the new gzip size, and add a reviewed budget line to `tests/selective-builds.test.js` (V11).
- [x] Run `npx fallow audit --base origin/master` with `node_modules/.bin` on `PATH` for the complexity limit (V11).
- [x] Run `npm run verify` once (V12).
- [x] Record each result in `validation.md`.

Completion check: V1 to V14 pass or have a recorded blocker.

Covers: R10; V9, V11, V12.
