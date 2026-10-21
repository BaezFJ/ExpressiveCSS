# ExpressiveCSS mission

ExpressiveCSS is a Material Design 3 Expressive framework built from Sass and TypeScript. Pages get theme tokens, layout and styled components from plain markup, and interactive behavior from a small runtime that keeps that markup accessible. A local MCP server and skill give agents the same authoring rules people read in the docs. [Technical constraints](tech-stack.md) govern the work, and the [roadmap](roadmap.md) orders it.

## Users and problem

Page authors build interfaces from documented markup. They expect components to behave as the platform and the ARIA Authoring Practices describe, in every engine, without writing glue code. Agents that implement ExpressiveCSS interfaces need canonical component names, complete rules and the documented runtime options and methods, without guessing from an example.

Components still miss behavior that comparable frameworks provide, such as menu checkbox items, search debounce, seconds in a time picker, shared tooltip delays and options read from markup. Each gap leaves authors two choices: write their own script, or give up the pattern.

## Core workflow

1. An author writes documented markup, or an agent produces it through the MCP server or skill. Agents discover canonical names and retrieve the rules and runtime API sections they need, with an explicit account of anything omitted.
2. `AutoInit()`, or an explicit `init`, starts the components the markup names.
3. Components manage dynamic state, such as focus, `aria-*` state and selection. They report changes through `expressive:*` events and option callbacks.
4. The author or agent checks the markup against `semantics.json` and the generated guidance.

## Product rules

Every phase keeps these:

- Static semantics, such as roles and names, belong to the author's markup. Dynamic state belongs to the framework.
- A composite ARIA role is allowed only where the component implements its tested keyboard contract.
- Public exports, markup compatibility and accessibility contracts stay stable unless an accepted change replaces them with a migration note.
- A change to how existing markup behaves is opt-in, or it ships with a migration note. A page should not have to change because a component learned something new.
- Generated guidance agrees with its sources, as [data ownership](tech-stack.md#data-ownership) assigns them.

## Agreed scope

| Area | Outcome |
| --- | --- |
| Components and behaviors | Interactive components cover the keyboard, form and pointer patterns comparable frameworks provide, tested in Chromium, Firefox and WebKit. |
| Initialization | Markup can start and configure components without page script. |
| MCP server and skill | Agents can discover components and retrieve complete, version-specific rules and runtime API guidance within predictable response limits. They can also read the shipped documentation as versioned resources. |

## Success criteria

Each component gap closes with four things:
- behavior that matches its documented contract
- regression tests that fail without the change
- updated docs and `llm.md`
- a reviewed gzip budget

MCP work keeps live protocol checks, compatibility with existing tool names and requests, and synchronized generated data. No result may imply that static guidance establishes visual, interaction or accessibility approval.

## Non-goals

- Framework-specific bindings, such as React or Vue components, and runtime dependencies.
- A repository split, HTTP hosting, or an SDK or language migration for the MCP server.
- Theme-writing tools or page recipes in the MCP server.
