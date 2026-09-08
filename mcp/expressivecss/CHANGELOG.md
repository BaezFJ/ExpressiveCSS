# Changelog

## Unreleased

- Add opt-in consumer scenario command execution through the existing quality inspector and operator allowlist. Browser reports remain separately inspected evidence.

- Breaking: update jsdom to 30.0.1 and require Node `^22.22.2 || ^24.15.0 || >=26.0.0`.
  Upgrade the Node executable used by your MCP client before reinstalling the
  server. Node 20 is no longer supported. Ship this change in the next MCP minor
  release, not a patch release. Framework runtime requirements are unchanged.
- Coordinate independently versioned MCP releases through protected `mcp-v*` tags.
- Include this changelog in the published package.
- Bundled framework guidance: ExpressiveCSS 0.9.0. Update this line when refreshing guidance for a release.

## 0.1.0

Initial MCP package. Exposes the design-to-QA tools with bundled component guides,
semantics, component decisions, contract metadata, and a standalone smoke check.
