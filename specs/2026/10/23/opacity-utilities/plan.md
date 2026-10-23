# Opacity utilities plan

Roadmap phase: [Phase 29, opacity utilities](../../../../roadmap.md#phase-29-opacity-utilities)
Branch: `feature/2026-10-23-opacity-utilities`
Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md).

The three groups run in order. Each fits a short session; the whole phase is about two hours, most of it spent waiting on `npm run verify`.

## 1. Opacity classes in the helpers partial

Prerequisites: none.

- [ ] Add a map of the six steps to `src/sass/utilities/_helpers.scss`, near "Shape and text behaviour": `("0": 0, "25": 0.25, "38": 0.38, "50": 0.5, "75": 0.75, "100": 1)`, with a one-line comment that 38 is the M3 disabled-content opacity.
- [ ] Emit `.opacity-#{$name} { opacity: $value; }` with `@each`. No prefix loop, no `!important`.
- [ ] Run `npm run build:css` and confirm the six rules appear inside `@layer utilities` in `dist/css/expressive.css`.

Completion check: the built CSS has exactly six `.opacity-*` rules, each with a single unitless `opacity` declaration.

Covers R1, R2, R4. Checks V1, V3.

## 2. Browser tests

Prerequisites: group 1.

- [ ] In `tests/helpers-browser.test.js`, add a test inside the existing `for (const [engine, browserType, utilityTest] of engines)` loop that renders one element per class and asserts each computed `opacity` string.
- [ ] Add a second test in the same loop: a disabled `input[type="range"]` alone, with `.opacity-100`, and with `.opacity-50`, asserting 0.38, 1 and 0.5. Then add an unlayered page rule and assert that it wins over the class.
- [ ] Close browsers in `finally` blocks, as the file's other tests do.
- [ ] Run the file on its own and confirm both tests fail on the base commit's CSS.

Completion check: both tests pass in Chromium, Firefox and WebKit, and fail without group 1.

Covers R1, R3, R4. Checks V1, V2, V4.

## 3. Docs, guidance and budget

Prerequisites: group 2.

- [ ] Add an `opacity` entry to `defineSections` in `docs/src/pages/helpers.astro` and a section with a class table and one short example.
- [ ] Add an "Opacity" subsection to `llm.md` near "Formatting" with the same table and the three notes from R5: 38 is M3 disabled content, contrast still applies to dimmed text, `.opacity-0` doesn't hide content.
- [ ] Add a reviewed CSS gzip budget line to `tests/selective-builds.test.js`, measured against the merge-base build.
- [ ] Run `npm run build:skill` last, then `npm run check:generated`.
- [ ] Run `npm run verify` once, alone.

Completion check: `npm run verify` passes and `git status` shows no unregenerated files.

Covers R5, R6. Checks V5, V6, V7, V8.
