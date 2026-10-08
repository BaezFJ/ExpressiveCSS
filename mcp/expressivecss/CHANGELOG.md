# Changelog

## 0.3.1 - 2026-10-08

- Fix `npx @expressivecss/mcp-server`, which failed with "could not determine
  executable to run" from 0.2.0 onward because the package has two bins. A
  `mcp-server` bin now starts the server, so the documented client config works.
  The `expressivecss-mcp` bin is unchanged.
- The server and `expressivecss-lint` start about 0.3 s faster. jsdom now loads
  the first time a check inspects markup instead of at startup.
- The catalogue, guides and rules cover 29 more components: accordion, aura,
  avatar, the eight chart types, command palette, countdown, data table,
  drop zone, empty state, KPI, marquee, message, message scroller, popover,
  questionnaire, rating, rich text editor, skeleton, stat, stepper, timeline
  and tree.
- Bundled framework guidance: ExpressiveCSS 0.13.0.

## 0.3.0 - 2026-10-06

- Breaking: guidance tools now cap each result at 64 KiB of UTF-8 by
  default. A response that used to arrive whole can now omit whole
  units and list them in `responseBudget`. To return larger responses, set
  `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` in the server's environment. The
  limit is described in its own entry below.

- Add argument completion to the component resource templates. Both templates
  complete canonical slugs by case-insensitive prefix, and
  `component_guide_section` also completes section names. Aliases are not
  matched. Results use the SDK limit of 100 values with `total` and `hasMore`.
  Unknown template references return `-32602`. Completion reads only the
  bundled catalogue and stays outside the response byte budget. Tool arguments
  are not completed.

- Add versioned component guide resources for the current bundled snapshot.
  The `component_guide` template returns a whole guide with its complete
  contract, syntax, rules, Options and Methods. `component_guide_section`
  returns one of those sections. `resources/list` lists every whole-guide URI.
  Reads share the operator byte budget and deliver sections whole. A read that
  cannot fit returns `-32001` with the section URIs that fit and the sections
  that need a larger budget. Aliases, unknown names and unavailable snapshot
  identities return `-32002`. Budget errors now name the URI that was read.

- Add a read-only `component_catalog` resource for the current bundled snapshot,
  identified by framework version and contract source hash. JSON contents reuse
  the complete compact catalogue and retain unknown consumer compatibility.
  Reads use the existing operator byte budget and deliver every entry whole or
  return protocol error `-32001` with a sufficient restart budget. Discovery
  remains available under small budgets; unknown resource identities return
  `-32002`. Existing tools, QA policy and package versions remain unchanged.

- Guidance tools enforce a configurable 64 KiB UTF-8 limit on the complete
  serialized tool result, including text and structured content. Typed
  `responseBudget` metadata accounts for whole-unit omissions and narrower
  recovery requests. Indivisible guidance or accounting that cannot fit produces
  an explicit budget error; impossible minimal results use JSON-RPC error
  `-32001`. Setup, creative, both page aliases, syntax and catalogue share the
  limit; QA limits and evidence behavior remain unchanged. Syntax code is whole
  or omitted, and retained contract-prose limits have explicit disclosure.

- `component_syntax_expert` accepts `detail: "compact"` or `"detailed"`, with
  detailed as the backward-compatible default. Compact retains complete rules,
  identity and shared evidence while omitting contract prose and syntax examples.
  Requested Options/Methods and explicit foundations work in both modes.
  `includeCapabilities` overrides component capability detail, which defaults
  off in compact and on in detailed. Effective selectors and schema-validated
  `omittedFields` identify intentional omissions and their reasons. Retrieve
  omitted detail through the supported selectors. Existing version/provenance
  safety checks remain. Contract summaries retain their disclosed prose limit;
  examples now use whole delivery or explicit budget omission.

- `component_catalog` accepts optional `query` and `limit` to search existing
  names, aliases and compact descriptions. Exact matches precede labelled
  heuristic matches. Search defaults to 10 results, permits at most 50 and
  reports total/omitted counts, truncation and explicit empty results. Full
  listings and compatibility/provenance evidence remain unchanged.

- Add read-only `component_catalog` for complete compact component listings,
  existing aliases and runtime ownership, documentation links and bundled
  version/source hash. Optional explicit targets receive compatibility and
  provenance checks; omitted targets remain unchecked.

- `component_syntax_expert` accepts `sections: ["methods"]` or both `"options"`
  and `"methods"` once each. Requested Methods return complete bundled Markdown
  or an explicit absent-section record. Defaults and compatibility/provenance
  evidence remain unchanged.
- `component_syntax_expert` accepts `sections: ["options"]` to return complete
  bundled Options Markdown or an explicit absent-section record. Existing
  requests omit these records; compatibility and provenance evidence are unchanged.
- `component_syntax_expert` returns complete component rules in source order,
  including rules previously omitted by the eight-rule cap. Generic fallback
  advice remains unchanged.
- Bundled framework guidance: ExpressiveCSS 0.12.0.

## 0.2.2 - 2026-10-01

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
- Bundled framework guidance: ExpressiveCSS 0.12.0.

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
