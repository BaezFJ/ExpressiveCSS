# Releasing ExpressiveCSS

BaezFJ approves releases. Framework and MCP versions are independent. Before 1.0,
breaking changes require a minor release and migration notes; compatible fixes
and documentation-only changes use patch releases.

## Prepare a release PR

1. Confirm the milestone's accepted work is merged and link its issues in the
   release notes. Record changes under an Unreleased changelog heading during
   development; finalize the version and date in the release PR.
2. Update the selected package version and lockfile. Framework releases also
   update the runtime version export. For stable releases, update installation
   prose in the README, `llm.md`, and the docs landing page. Prereleases leave that
   prose on the latest stable version.
3. Update the selected changelog. Framework entries need the existing version
   comparison links. MCP entries name the framework version bundled in its guidance.
4. Run `npm run build:semantics`, `npm run build:skill`, `npm run verify`, browser
   tests, MCP tests, and `npm run verify:packages`. Commit regenerated files.
5. Merge the release PR only after its required checks pass.

Framework tags are `vX.Y.Z`; MCP tags are `mcp-vX.Y.Z`. Prerelease suffixes such
as `-rc.1` are allowed. Create an annotated tag on the merged commit and publish
a GitHub Release for it. Mark prereleases as prereleases. Tags cannot be moved
or deleted; fix mistakes with a new version.

## Validation and approval

The release workflow selects the package from its tag, verifies that its commit
belongs to protected `master`, checks the package version and prerelease flag,
and validates before asking for publishing approval. Stable versions go to
`latest`; prereleases go to `next`. A manual dispatch only validates and dry-runs.

The `npm-publish` environment requires BaezFJ's approval and accepts only release
tags. Only the publishing job receives OIDC permission. Each package needs an npm
trusted publisher for repository `BaezFJ/ExpressiveCSS`, workflow `release.yml`,
and environment `npm-publish`. Preserve this identity when changing workflows.
There is no long-lived npm publishing token. Check provenance after publication.

If the MCP package does not yet exist on npm, bootstrap it through npm's supported
maintainer flow before configuring its trusted publisher. Do not add a permanent
token to CI as a workaround. This setup is separate from creating a release.

## Coordinated packages and documentation

Publish MCP when its server or bundled guidance changes. If a framework release
requires new guidance, publish the framework first, then MCP. Record its bundled
framework version in the MCP changelog; the package versions need not match.

The public docs describe the latest successfully published stable framework
release. The deployment builds that exact tag and verifies npm's `latest` before
deploying. Prereleases and MCP releases do not deploy the main site. Unreleased
docs are available through local development and CI artifacts. Documentation-only
changes reach the public site in a framework patch release.

If publication fails, the stable site stays unchanged. Retry failed infrastructure
without retagging. If a package was published but is defective, publish a corrective
version and deprecate the bad version when appropriate. Never overwrite a published
version. Re-running a successful release is not a way to replace its package.

## Rollout of the repository workflow

The implementation is split into contributor guidance, CI/security, release
coordination, and stable documentation deployment PRs. Merge CI before enabling
its required result. Confirm the named `required` check has succeeded on GitHub,
then require it with an up-to-date branch, PRs, and resolved conversations.
Keep mandatory approving reviews at zero during the single-maintainer stage.
Test a failing PR and a passing owner PR before considering rollout complete.
