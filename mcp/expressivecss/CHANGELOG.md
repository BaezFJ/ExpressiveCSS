# Changelog

## Unreleased

## 0.5.0 - 2026-10-27

- Security: update the locked `body-parser` to 2.4.0, `fast-uri` to 3.1.9,
  and the `qs` override to 6.16.1 to resolve known dependency advisories.
- Security: `quality_inspector` skips every `files` entry outside
  `projectRoot` with the same reason before touching the disk. A missing
  path used to get "file does not exist", so a client could tell which host
  paths exist.
- Security: a nav or control that repeats one id in `aria-labelledby` no
  longer makes inspection walk the labelled element once per repeat. A
  snippet of about 136 KB used to block the server for seconds, and a larger
  one could run it out of memory. Each id now counts once, and only the
  first 32 are read.
- Security: version resolution reads crafted lockfiles in linear time. Blank
  lines inside a pnpm entry, or a long run of `(` in a version, used to stall
  every project-scoped tool call for as long as minutes or hours.
- On Windows, a client `projectRoot` that is a network path (`\\host\share`)
  is refused before it is resolved, unless it sits under an allowed root.
  Resolving it would contact that host.

- `rules_enforcer` and the lint command flag the class names, color roles
  and markup paths that ExpressiveCSS 0.16.0 removes, and each finding names
  the replacement. The new rule IDs start with `legacy-`: material-icons,
  i-icon, visibility-alias, helper-class, renamed-component, picker-root,
  sheet-class, variant-alias, markup-path, carousel-flat, color-role,
  selector, datepicker-range and range-export. Class names match as whole
  tokens in `class`, JSX `className`, `className={"…"}` and template
  literals; `legacy-selector` covers CSS selectors and query strings.
- The three drag-handle rules select `.drag-handle` only; `.handle` is a
  removed name that `legacy-sheet-class` reports inside a bottom sheet.
- Static inspection no longer stalls the server on adversarial markup. An
  unclosed class value full of `btn` took 30 s to check and now takes about
  100 ms. Markup nested deeper than 256 elements stops early with
  `markup nesting limit reached`; 4,000 nested `aria-hidden` elements took
  20 s before.
- `legacy-renamed-component` no longer stalls on an unclosed tag that
  repeats `class="range`. A 500,000-character snippet blocked the server
  for about 10 s.
- Breaking: with `EXPRESSIVECSS_MCP_ALLOWED_PROJECT_ROOTS` unset, a client
  `projectRoot` must now sit inside the server's default root, from
  `--project-root` or the working directory. Before, any directory was
  accepted, so a prompt-injected call such as `quality_inspector` with
  `projectRoot: "/"` could report whether a file like `~/.ssh/id_rsa`
  existed, with its size and SHA-256. A missing `projectRoot` is now an
  error instead of an `unresolved` result. To pass other projects, list
  them in `EXPRESSIVECSS_MCP_ALLOWED_PROJECT_ROOTS`.
- A client `projectRoot` resolves to the real path that passed the root
  check, so swapping a symlink after the check cannot redirect later reads.
- Reading a FIFO inside the project fails at once instead of hanging the call.
- `quality_inspector` stops its typecheck or test command when the call is
  cancelled or the client closes the session. Before, the command kept
  running after the server exited.
- The lint hook exits 2 when inspection throws, so a crash blocks the edit
  instead of letting the file through unlinted.
- Bundled framework guidance: ExpressiveCSS 0.16.0.

## 0.4.1 - 2026-10-14

- The catalogue, guides and rules cover keypad and keyboard.
- Bundled framework guidance: ExpressiveCSS 0.15.0.

## 0.4.0 - 2026-10-11

- Command-output redaction no longer stalls the server on long token runs.
  160K characters of hex output took 6 s to redact; it now takes milliseconds.
- New `EXPRESSIVECSS_MCP_ALLOWED_PROJECT_ROOTS` setting limits which
  directories a caller can pass as `projectRoot`. It is unset by default, which
  keeps the current behavior.
- Calls with a `projectRoot` are 3 to 5 times faster. The server resolves the
  ExpressiveCSS version once per call and sizes file buffers to the file
  instead of the read limit.
- Tool results use compact JSON text, which is about a third smaller.
- The catalogue, guides and rules cover map, confetti and particles.
- Bundled framework guidance: ExpressiveCSS 0.14.1.

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
- Bundled framework guidance: ExpressiveCSS 0.13.1.

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
