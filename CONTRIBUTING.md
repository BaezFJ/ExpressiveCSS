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

### Optional repo context graph

Graft provides a local source index for agent-assisted navigation. To use it:

```sh
npm install -g @nanonets/graft
graft build
```

Its native dependencies may require Python, Make, and a C++ compiler. The generated
`graft/` directory is ignored by Git; each checkout builds its own index. To also
configure an agent integration, run `graft init` and select your agent. This can
update machine-wide agent settings. If installation or graph generation is
unavailable, continue with `rg` and direct source inspection; Graft is not required
to build, test, or contribute.

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
- Compact evaluation records in `docs/agents/evidence/` are an exception to the
  report rule: retain settings, hashes, named checks and artifact references there.
  Keep raw transcripts and captures in an exported archive outside the checkout.
  See [assistance cost comparisons](docs/agents/expressivecss-assistance-cost.md).

## Verify

### Container tests

With Node.js and Docker installed, run all browser tests without installing
browsers, npm dependencies, or browser system libraries on the host:

```sh
npm run test:docker
```

The runner builds from the [official Playwright image](https://playwright.dev/docs/docker),
matching the version in `package-lock.json`, and installs dependencies with `npm ci`.
It copies the current checkout, including uncommitted source changes. Dependencies
and build output stay inside the container. Docker caches the dependency layer.
After each run, browser traces and visual reports are copied to a unique directory
under `.cache/container-tests/`, even when tests fail. The runner prints the path
and removes the container. CI uses the same command and uploads this directory.

To run contributor verification in the same image, or use Podman on Fedora:

```sh
npm run test:docker -- npm run verify
npm run test:packages:docker
CONTAINER_RUNTIME=podman npm run test:docker
```

Package checks install MCP dependencies, run its smoke tests, and validate both
package tarballs in clean consumers. Nothing is published.

### Maintaining container checks

The `Container validation` Actions workflow runs Mondays at 07:00 UTC and can be
started manually. It begins on a fresh Ubuntu runner with Git, Node from `.nvmrc`,
Docker and Compose, without host npm dependencies or restored caches. It checks
browser reports, contributor verification, packages, a focused visual comparison,
docs live reload, and report export after an intentional failure. Its cleanup
checks that tracked files and host dependency directories remain untouched.

The PR browser job requires passing reports for both profiles in Chromium,
Firefox and WebKit. Both workflows retain exported reports for seven days,
including when tests fail. Build and command durations appear separately in the
run summary. Inspect a run and download its reports with:

```sh
gh run list --workflow container-validation.yml
gh run view <run-id> --log-failed
gh run download <run-id> --name container-validation --dir .cache/downloaded-container-reports
```

For a PR run, download the `browser-critical-flows` artifact instead. Check the
browser `result.json` files and failure traces; the weekly artifact also includes
visual HTML reports. A local Podman pass does not establish a Docker Actions pass.

Select the manual workflow's `benchmark` input to compare three cold and three
cached builds on separate fresh runners at the same revision. The experiment
transfers a dependency-stage BuildKit cache through a temporary Actions artifact;
cached timings include that download. It does not enable caching for normal CI.
The six timing artifacts last seven days; the temporary cache lasts one day.

Enable production caching only if median cold `npm ci` time exceeds 60 seconds
and median total build savings reach 30 seconds. If measured, implement Buildx
GHA caching with `mode=max` and local image loading, and confirm its transfer costs
meet the same threshold. Keep the weekly cold check uncached and permit cache
misses. Until those measurements exist, leave caching disabled.

Dependabot groups Playwright minor and patch updates separately from other build
tooling. Major updates remain individual reviews. The image follows the lockfile;
there is no separate version to update. Regenerate committed skill/MCP metadata
when package or fingerprinted source changes make it stale. Generation does not
renew browser evidence.

### Container documentation preview

```sh
npm run docs:docker
```

Requires Docker Compose, or `podman-compose` with `CONTAINER_RUNTIME=podman`.
Open http://localhost:4321. Changes under `src/`, `docs/src/`, and `docs/public/`
are mounted read-only and watched for rebuilding or live reload. Dependencies
and generated files stay inside the container. Restart the command after changing
dependencies or configuration. Stop with Ctrl+C; `docker compose down` removes the
stopped service. After the image has been built, `docker compose up docs` also works.

### Container visual regression

```sh
npm run test:visual:docker
npm run test:visual:docker -- --grep buttons --workers 2
```

The runner copies Git history through a temporary bundle and compares the current
source with its merge base against `origin/master` or `master`. `VISUAL_BASE=<ref>`
selects another base. Fetch the needed history first in shallow checkouts. The
container uses its own Git metadata and never creates worktrees in the host repo.
The printed artifact directory contains `report/index.html` and `results/`.
To view the report with the container's Playwright installation:

```sh
docker run --rm --init -p 127.0.0.1:9323:9323 -v "$PWD/.cache/container-tests/<run>/report:/report:ro,z" expressivecss-playwright npx playwright show-report /report --host 0.0.0.0
```

### Host tests

```sh
npm run verify
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

`verify` builds the framework, typechecks, runs Node tests, checks generated data,
and builds and verifies the docs. The critical-flow suite requires Chromium,
Firefox and WebKit. The explicit browser command and CI fail if any is absent.
Node-only local tests can skip uninstalled browser engines. See the
[coverage and manual review procedure](docs/agents/expressivecss-browser-coverage.md);
emulation does not verify real devices or native browser zoom.

For repeatable checks of a running consumer application, use
`npm run verify:consumer -- --project-root <app> --scenario <checks.json> --origin http://127.0.0.1:<port>`.
See the [scenario format and evidence limits](skills/expressivecss/references/consumer-verification.md).
The command reuses the consumer's installed Playwright; it does not start its server.

For the Material capability roadmap, review source changes in
`docs/src/data/component-decisions.json` before updating its source pins. Build
the framework, then run `npm run record:capabilities` to execute mapped browser
checks and record their input hashes. The collector preserves its raw report
under `.cache/material-capabilities/`; regenerate with `npm run build:skill`.
Generation never renews source reviews or runs tests. See the
[roadmap](skills/expressivecss/references/capability-roadmap.md) for coverage limits.

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
