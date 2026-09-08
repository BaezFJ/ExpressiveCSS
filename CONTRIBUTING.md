# Contributing to ExpressiveCSS

Bug reports, documentation, design feedback, accessibility work, and code are welcome.
Read our [code of conduct](CODE_OF_CONDUCT.md) and [governance](GOVERNANCE.md).
Report vulnerabilities privately through [SECURITY.md](SECURITY.md).

## Set up a checkout

Fork the repository, clone your fork, and add the upstream remote once:

```sh
git remote add upstream https://github.com/BaezFJ/ExpressiveCSS.git
nvm install
nvm use
npm ci
npm run docs:dev
```

Without nvm, install Node 24 using your preferred method. `.nvmrc` selects the
contributor runtime; it does not change the framework's supported runtime range.
No AI editor, account, plugin, or design-sync service is required.

## Agree on the work

Use [Discussions](https://github.com/BaezFJ/ExpressiveCSS/discussions) for questions
and proposals. Use [Issues](https://github.com/BaezFJ/ExpressiveCSS/issues) for
reproducible bugs and accepted work. Comment before starting substantial work;
BaezFJ confirms the scope and marks it Ready. Small fixes can go straight to a PR.

An issue needs a concrete outcome and acceptance criteria. Link related work so
contributors can avoid duplicate changes. Public API additions, breaking changes,
and major design changes need an accepted discussion first. Record architectural
decisions in `adr/` using the existing format.

## Make a change

Create a short-lived branch from current upstream `master`. Use a descriptive name
such as `fix/menu-focus` or `docs/theme-example`. Keep each PR focused.

- Framework source lives in `src/sass` and `src/ts`. Follow their existing
  [Sass](src/sass/README.md) and [TypeScript](src/ts/README.md) guides.
- The Astro documentation and examples live in `docs/src`. Update examples and
  API documentation in the same PR as behavior changes. The page catalogue is
  `docs/src/data/nav.ts`; do not create a second page inventory.
- Add focused regression tests for bugs. Preserve keyboard behavior, accessible
  names, semantics, and cleanup of listeners and timers.
- `semantics.json` owns markup rules; `llm.md` owns the API/markup reference;
  `m3-guidelines.md` describes design usage. Component decisions live in the docs
  data directory. Source changes can affect generated skill and MCP guidance.
- Regenerate committed derived documents with `npm run build:semantics` and
  `npm run build:skill`. Commit those changes alongside their source. `dist/`,
  `_site/`, screenshots, reports, and caches stay untracked.
- Optional design previews live in `.design-sync`; see its [README](.design-sync/README.md).
  They are not framework source or a prerequisite for ordinary contributions.

## Verify

```sh
npm run verify
npx playwright install chromium
npm run test:browser
```

`verify` builds the framework, typechecks, runs Node tests, checks generated data,
and builds and verifies the docs. Browser behavior tests require Chromium; the
explicit browser command and CI fail if it is absent. Node-only local tests can
skip browser tests when Chromium is not installed.

For repeatable checks of a running consumer application, use
`npm run verify:consumer -- --project-root <app> --scenario <checks.json> --origin http://127.0.0.1:<port>`.
See the [scenario format and evidence limits](skills/expressivecss/references/consumer-verification.md).
The command reuses the consumer's installed Playwright; it does not start its server.

For MCP changes, also run:

```sh
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify:packages
```

Package verification creates temporary consumers and validates tarballs outside
the checkout. It requires network access for MCP dependencies.

For visual changes:

```sh
npm run test:visual
npm run test:visual:report
```

The report compares the merge base with your branch. Screenshot differences are
advisory, but BaezFJ must review intended changes and record that review in the PR.
A broken capture is not evidence of a successful visual check. Browser behavior
failures always block merging.

## Synchronize and submit

On your own branch, before final review:

```sh
git fetch upstream
git rebase upstream/master
# Only when updating your own already-pushed branch after the rebase:
git push --force-with-lease origin HEAD
```

Coordinate before rebasing a shared branch. Never force-push `master` or release
tags. Open a PR against `master`, link its issue, describe the behavior change,
and list checks actually run. Include migration notes for breaking changes.

Use a Conventional Commit PR title, for example `fix(menu): restore focus on close`.
Squash merging uses the PR title as the commit title. Do not add `Co-authored-by`
trailers or other Codex/AI attribution. Contributions use the repository's MIT
license; preserve existing third-party notices and only contribute work you may share.

BaezFJ reviews community PRs and resolves design questions. PRs need passing
required CI, resolved conversations, and an up-to-date branch. During the
single-maintainer stage, BaezFJ's own PRs need CI but not an independent approval.
Release policy is in [RELEASING.md](RELEASING.md).
