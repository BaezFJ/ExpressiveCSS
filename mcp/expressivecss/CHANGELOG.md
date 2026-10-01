# Changelog

## Unreleased

- Semantics findings from `rules_enforcer`, `quality_inspector`, and
  `expressivecss-lint` report the element's line and column instead of 1:1.
- Component guides list the API reference subsections they leave out. Their
  examples use real link targets, and menu actions are buttons. The Buttons
  guide calls `circle` a round common button and points icon buttons to
  `.icon-button`.
- The Lightbox guide includes its options and methods. The app-bar guide's
  Search icon is a button.
- The Cards guide uses a plain `<p>` for supporting copy. The Date picker and
  Time picker guides use `.date-picker` and `.time-picker`, the Select guide
  describes the `.field` wrapper instead of `.select-wrapper`, and the
  Scrollspy example uses `hide-on-compact-only`.

## 0.2.1 - 2026-09-30

- `rules_enforcer` requires an identifier boundary before a manual `.init(` call,
  so a long identifier run no longer slows the scan.
- Component guides say top app bars are pinned by default.
- Bundled framework guidance: ExpressiveCSS 0.11.0.

## 0.2.0 - 2026-09-29

- Add the `expressivecss-lint` bin: the `rules_enforcer` static checks as a command with a `--hook` mode for Claude Code `PostToolUse`, so agent edits are checked without a tool call. `server.js` now starts the server only when run as the entry point.
- Add opt-in consumer scenario command execution through the existing quality inspector and operator allowlist. Browser reports remain separately inspected evidence.

- Breaking: update jsdom to 30.0.1 and require Node `^22.22.2 || ^24.15.0 || >=26.0.0`.
  Upgrade the Node executable used by your MCP client before reinstalling the
  server. Node 20 is no longer supported. Ship this change in the next MCP minor
  release, not a patch release. Framework runtime requirements are unchanged.
- Coordinate independently versioned MCP releases through protected `mcp-v*` tags.
- Include this changelog in the published package.
- Bundled framework guidance: ExpressiveCSS 0.10.1.

## 0.1.0

Initial MCP package. Exposes the design-to-QA tools with bundled component guides,
semantics, component decisions, contract metadata, and a standalone smoke check.
