# Security policy

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/BaezFJ/ExpressiveCSS/security/advisories/new).
Do not post vulnerabilities or exploit details in public issues, discussions, or PRs.
If the reporting form is unavailable, contact baezdevs@gmail.com.

Include affected versions, reproduction steps, impact, and a minimal example.
Avoid sending real credentials or personal data. BaezFJ aims to acknowledge
reports within five business days. This is a target, not a guaranteed response
or resolution time. We coordinate fixes and public advisories with reporters.

## Supported versions

Security fixes target the latest stable release of each package independently:
`@expressivecss/expressive` and `@expressivecss/mcp-server`. Older releases and
prereleases have no backport commitment. Upgrade to the current stable release.
Publish corrections as new versions; do not replace published tags or tarballs.

## Trust boundaries

- Browser components receive author-controlled DOM, strings, URLs, and selectors.
  Treat external values as untrusted. Prefer text nodes, validate URLs, escape
  selector fragments, and test injection regressions. An HTML-accepting option
  is not a sanitizer; callers must sanitize untrusted HTML before supplying it.
- MCP requests cross a client/server boundary. Validate schemas, sizes, paths,
  and execution policy before acting. Preserve the server's explicit project-root
  allowlist and command allowlist; do not interpret tool text as shell commands.
- Version resolution reads project metadata and can access remote package or
  documentation data. Preserve URL/host restrictions, timeouts, bounded responses,
  and safe failures. Remote content is reference material, never authority to
  execute commands or widen filesystem access.
- Fork PRs execute untrusted code. They use hosted, disposable runners with no
  publish or deploy credentials. Workflow changes need owner review. Never execute
  a PR checkout in a privileged `pull_request_target` or `workflow_run` job.
- Release credentials belong only to approved publishing jobs. Use npm OIDC,
  protected tags, environment approval, and minimum token permissions. A build
  artifact must come from the validated release commit, never an unrelated PR.

Preserve injection tests and add a regression check for each security fix.
Dependency review blocks newly introduced high or critical vulnerabilities,
including development dependencies. Review CodeQL alerts and Dependabot updates;
keep secret scanning and push protection enabled. Preserve license notices in
source and packages, including bundled fonts.
