# ExpressiveCSS MCP improvements

Improve the local ExpressiveCSS MCP server so agents and developers can discover components and retrieve complete, version-specific authoring guidance within predictable response limits. Keep the server in this repository and build on its existing tools and generated catalogue.

This constitution covers the five improvements confirmed in the planning interview. It does not define a new mission for the whole ExpressiveCSS framework. [Technical constraints](tech-stack.md) govern the work; the [roadmap](roadmap.md) orders its implementation.

## Users and problem

The intended users are agents implementing ExpressiveCSS interfaces through MCP and developers configuring those clients or reviewing their output. They need canonical component names, complete applicable rules, and documented runtime options and methods without guessing from a markup example.

The reviewed server bundles 41 component guides, but its syntax results silently limit rules to eight and omit Options and Methods sections present in 15 guides. It offers goal-based recommendations without a direct catalogue-list tool. A request for 12 components produced 75,468 characters of text, so its current per-component setting does not provide a predictable aggregate response limit.

These findings describe checkout `7d3d238`, MCP package 0.2.2 and framework contract 0.12.0. They are the implementation baseline, not a claim about subsequent releases.

## Core workflow

1. Discover canonical component names and relevant catalogue metadata.
2. Resolve the consuming project's framework version and contract provenance through the existing tools.
3. Request applicable rules and the runtime API sections needed for implementation.
4. Receive a complete result or an explicit account of omitted material with a way to retrieve it.
5. Select versioned bundled documentation through MCP resources when the client supports them, then use existing checks to assess authored output.

Resource reads identify the bundled documentation snapshot. They do not establish compatibility with a consuming project or prove browser behavior.

## Agreed scope

| Improvement | User-visible outcome |
| --- | --- |
| Complete rules | Applicable component rules never disappear without disclosure. |
| Runtime API guidance | Agents can request the Options and Methods already present in bundled guides. |
| Catalogue discovery | Agents can list and search canonical entries without inventing a design goal. |
| Bounded responses | Response size has an explicit limit, omissions are machine-readable, and omitted material remains retrievable. |
| Versioned resources | Clients can discover and read the shipped catalogue and component documentation by versioned snapshot identity. |

## Success criteria

The first usable milestone is complete component-rule delivery through the existing syntax tool, with a regression check against the bundled rule IDs. Subsequent milestones make runtime guidance discoverable, control response growth and expose the same documentation through resources.

Success requires live protocol checks for each new behavior, compatibility with existing tool names and requests, synchronized generated data, and isolated package verification. Version/provenance checks and operator command restrictions remain effective throughout. No result may imply that static guidance establishes visual, interaction or accessibility approval.

## Boundaries

Retain JavaScript, the current Node runtime and installed dependencies, stdio deployment, and the current repository. Preserve existing tools and aliases, generated-data ownership, markup compatibility and accessibility contracts.

This work does not include a repository split, HTTP deployment, SDK or language migration, framework behavior changes, new theme-writing tools or page recipes. It does not require a new database, live upstream documentation fetches or a separate rule engine.

No scope decision was deferred in the interview. Exact response-limit values, optional argument names and resource URI syntax remain implementation decisions to specify in the relevant phase.
