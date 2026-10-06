# MCP versioned component resources

Date: 2026-10-06
Roadmap phase: Phase 9, versioned component resources
Branch: `feature/2026-10-06-mcp-component-resources`
Base: local `origin/master` at `8672d9fc1764f1f6a60ec74d37518708a5565d77`
Status: implemented and locally verified; required CI and review pending

Follow the [mission's core workflow](../mission.md#core-workflow), [technical constraints](../tech-stack.md#compatibility-and-trust-boundaries) and [roadmap Phase 9](../roadmap.md#phase-9-versioned-component-resources). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Project facts and phase eligibility

Phase 8 merged as #223 (`8672d9fc`). Phases 6 and 7 merged as #221 and #222. The roadmap's baseline paragraph still calls Phases 6 through 10 unstarted, but Git history and the current source show Phases 1 through 8 implemented. Phase 9 is the earliest unfinished phase, and its prerequisites, the Phase 7 response-limit rules and the Phase 8 resource, are in the base. This specification leaves the roadmap unchanged and makes no claim about external CI or review for earlier phases.

At the base, `mcp/expressivecss/server.js` registers eight tools and one static resource. `loadGuideCatalog(undefined)` reads the shipped bundle. `parseGuide()` extracts `contract`, `syntax`, `rules`, `options` and `methods` from each guide's `####` headings. All 41 bundled guides have Contract, Syntax and Rules sections; 12 have Options and 15 have Methods. `summarizeGuide()` feeds `component_syntax_expert`, which clamps `contract` to 900 characters and reports that as a `length-limit` omission.

The catalogue resource lives at `expressivecss://catalogue/0.12.0/<sourceHash>`. A custom `ReadResourceRequestSchema` handler accepts only that exact URI and returns `-32002` for anything else. The stdio send guard measures successful `resources/read` results against `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES`, default 65,536 UTF-8 bytes. When a result is too large, `resourceBudgetError()` replaces it with `-32001`, but it always names `catalogUri`. The guard does not record which URI the request asked for.

The largest bundled guide record, `date-picker.md`, is about 8 KB of JSON. A whole guide therefore fits the default budget, and section recovery matters only under smaller operator budgets. The bundled contract is 0.12.0 with source hash `270b7d8fd0ec2f1174cba3f2793c061d3b4f494903520e2eaaa7fa640a680859`. The lockfile selects SDK 1.31.0. Neither root nor MCP `node_modules` exists in this checkout.

## Decisions from the interview

The user answered all three interview questions on 2026-10-06.

Plan: follow the Phase 8 shape. Write failing live smoke checks first, then the server change, then documentation and package verification. Branch from `origin/master`.

Requirements: use path segments for selection and complete-or-error reads. `expressivecss://components/{version}/{hash}/{slug}` returns the whole guide. `expressivecss://components/{version}/{hash}/{slug}/{section}` returns one section. When a read exceeds the budget, return `-32001` with the section URIs that fit. A successful read is always complete. At small budgets this costs the client a second read. The user rejected partial successful reads and query selectors.

Validation: all four offered check groups must pass before merge. These are live content agreement, identity rejection, small-budget recovery, and contributor and package checks.

### Agent decisions within the confirmed design

The interview listed `rules`, `syntax`, `options` and `methods` as sections. This specification adds `contract` as a fifth section. A whole guide includes the complete contract, so without a `contract` URI the contract would have no narrower recovery path. That would break the roadmap's "without silent omission" condition.

`resources/list` lists the 41 whole-guide URIs. Section URIs are discoverable through `resources/templates/list` and are not listed one by one. Listing all 205 section URIs would add list noise without adding information. Phase 10 adds slug completion.

Resource reads accept only canonical slugs. Catalogue aliases return `-32002`. Clients resolve aliases through `component_catalog`, and Phase 10 completion will offer canonical names.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Register two resource templates with the installed v1 SDK `ResourceTemplate`: `component_guide` at `expressivecss://components/<version>/<hash>/{slug}` and `component_guide_section` at `expressivecss://components/<version>/<hash>/{slug}/{section}`. The version segment is the URI-encoded bundled `frameworkVersion` and the hash is the complete bundled `sourceHash`. Both are fixed literals, so the templates describe the current bundle only. Each template has a title, a description stating the current-snapshot scope and `mimeType: "application/json"`. `resources/templates/list` returns both. The guide template's list callback adds one whole-guide URI per bundled guide to `resources/list`, sorted by slug, beside the existing `component_catalog` resource. Add no completion callbacks; that is Phase 10. Advertise no subscriptions. |
| R2 | A successful whole-guide read returns one text item with the requested URI and JSON MIME type. Its parsed JSON has `schemaVersion: 1`, `slug`, `title`, `docs` (the guide `sourceUrl`, as in catalogue entries), `repositorySource` (the guide `astroSource`, which the syntax tool calls `docs`), `contractVersion`, `sourceHash`, `guideSource: "bundled"` and all five sections. `contract` is the complete extracted Contract text with no 900-character clamp. `syntax` is `{ language, example }`. `rules` is the complete ordered rule list. `options` and `methods` are `{ status: "documented" \| "absent", markdown }`, where an absent section has `markdown: null`, as in the syntax tool. Build every field from `loadGuideCatalog(undefined)` and the existing guide parsing; create no second inventory. Exclude `capability`, `omittedFields`, `requestIndex`, `stage` and `workflowId`. |
| R3 | A section read returns the same identity fields (`schemaVersion`, `slug`, `title`, `docs`, `repositorySource`, `contractVersion`, `sourceHash`, `guideSource`), `section: "<name>"` and only that section's field. Valid section names are `contract`, `syntax`, `rules`, `options` and `methods`. Reading `options` or `methods` for a guide without that section succeeds with `status: "absent"` and `markdown: null`. Never invent entries. Section content equals the matching whole-guide field exactly. |
| R4 | Rules, Options, Methods and syntax agree with `component_syntax_expert` for the same bundle. `rules` equals the tool's `found[0].rules`, including normative rule ID order. Options and Methods equal the tool's `sections` output, and `syntax` equals its detailed syntax. `contract` equals the bundled guide's extracted Contract section. For the 9 guides whose contract exceeds 900 characters, the tool's clamped text without its `…(truncated)` marker is a prefix of the resource contract. `contractVersion`, `sourceHash` and the URI version/hash agree with the `component_catalog` resource. Live checks cover complete Cards rules (all 16) and requested Datepicker Options. |
| R5 | Resource JSON carries the no-target evidence used by the catalogue resource: `status: "available"`, `contractCompatibility: "unknown"`, `contractProvenance` with its details, accurate `checksPerformed` and `evidenceSources` (`bundled:<file>` and `bundled:contract.json`), `uncheckedAreas` covering target-project compatibility, target-project provenance, rendered behavior, visual hierarchy, responsive composition and keyboard and assistive-technology behavior, and `blockedChecks`. `coverageStatus` is `complete-bundled-guide` for whole-guide reads and `complete-bundled-guide-section` for section reads. Reads ignore the process working directory, the CLI project-root default and tool skip flags. They inspect no consumer files, execute no project scripts and initialize no components. A read does not establish that a consumer's installed version is compatible. |
| R6 | Accept only URIs that exactly match a generated current-snapshot identity: the current version, the full hash, a canonical bundled slug and, for section URIs, one of the five section names. Unknown slugs, catalogue aliases, slug case variants, unavailable versions, wrong or shortened hashes, unknown sections, extra or empty path segments, trailing slashes, percent-encoded variants, query strings, fragments and other schemes return `-32002`. Invalid request parameters fail through SDK request validation. Never normalize an identity to the current snapshot, fetch upstream documentation, translate URI content into a filesystem path or read local files. The existing catalogue URI and its read behavior stay unchanged. |
| R7 | Apply `EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES` to every successful component resource read, measured as `Buffer.byteLength(JSON.stringify(result), 'utf8') <= budget` over the whole `resources/read` result, as Phase 8 defines it. Successful JSON includes `responseBudget` with the effective `maxBytes`, `delivery: "complete"` and empty `omissions` and `recoveries`. Deliver every section whole; never split a rule, code block or Markdown section. |
| R8 | When a component read does not fit, return JSON-RPC error `-32001` with no successful contents. The error data contains the requested `uri`, effective `maxBytes`, `requiredBytes` (measured as Phase 8 does, including the budget field's own digits), `setting: "EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES"` and `recoveries`. For a whole-guide URI, `recoveries` lists, in section order, the section URIs whose complete successful read fits the current budget. Any section that does not fit is listed in `unrecoverableSections`, which tells the operator to raise the budget. For a section URI, `recoveries` is empty. Every listed recovery URI must succeed at the same budget. Fix the shared send guard so the error names the URI the request actually asked for, while the catalogue keeps its existing message and data. Protocol errors fall outside the successful-result bound, including at budget 1. |
| R9 | Preserve all eight tools, their request forms, aliases, selectors, search order, tool response budgets, compatibility and provenance behavior, disabled tools, static QA and command restrictions. Preserve the Phase 8 catalogue resource URI, contents, evidence and budget behavior. Keep JavaScript, installed dependencies, the runtime range, stdio, generated-data ownership and independent package versions. The installed MCP tarball must list, template-list and read component resources without repository sources or build scripts. Use existing bundled JSON, and regenerate owned derived files only if their inputs change. |
| R10 | Update the MCP README and the unreleased changelog with the implementation. Document both templates, URI identity, the current-bundle scope, the section names, JSON fields, absent-section behavior, evidence limits, byte measurement, `-32001` recovery URIs, `-32002` cases, and the exclusion of `resources/list` and `resources/templates/list` from the content budget. Record results, failures and skips truthfully. A resource read is not a browser or visual check. |

## Implementation boundaries and references

Inspected files: `mcp/expressivecss/server.js` (`parseGuide`, `summarizeGuide`, `buildSyntaxPayload`, `buildCatalogPayload`, `resourceBudgetError`, `startServer`), `mcp/expressivecss/smoke.mjs` (`normativeRuleIds` and the Phase 8 resource checks), `mcp/expressivecss/README.md`, `mcp/expressivecss/CHANGELOG.md`, `mcp/expressivecss/component-guides.json` and `mcp/expressivecss/contract.json`.

The SDK v1 [resource guide](https://ts.sdk.modelcontextprotocol.io/server#resources) documents `ResourceTemplate` with list callbacks. The [MCP resource specification](https://modelcontextprotocol.io/specification/2025-11-25/server/resources) defines templates, reads and `-32002`. The base already replaces the SDK read handler, so template matching cannot route reads. The custom handler must look up the exact requested URI. Confirm SDK 1.31.0 template and list behavior once dependencies are installed. No SDK migration is authorized.

Follow [data ownership](../tech-stack.md#data-ownership), [CONTRIBUTING.md](../../CONTRIBUTING.md) and [SECURITY.md](../../SECURITY.md).

Out of scope: resource argument completion (Phase 10), partial successful reads, query selectors, alias URIs, historical bundles, an unversioned `latest` URI, subscriptions, framework behavior, new dependencies, HTTP transport, release or version changes and publication.

## Open decisions

None. All three interview answers arrived, and the agent decisions above stay within them.

## Implemented choices on 2026-10-06

`bundledResources()` in `server.js` builds one reader per catalogue, whole-guide and section URI from `loadGuideCatalog(undefined)`. The custom read handler looks up the exact requested URI in that map, so every other URI returns `-32002`. Two SDK `ResourceTemplate`s advertise the URIs. Only `component_guide` has a list callback, and neither has completion callbacks, so the server advertises no completions capability.

The send guard now records each read's requested URI. `resourceBudgetError()` keeps the catalogue error message and data unchanged. For component URIs it adds `recoveries` and `unrecoverableSections`, measuring each section's actual read result at the current budget.

During implementation, R2 and R3 renamed the `source` field to `repositorySource`. The syntax tool and the catalogue already use `docs` for different URLs, and a bare `source` field made that harder to follow. No dependency, generated data, framework behavior or package version changed. Changes remain uncommitted.
