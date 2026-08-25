# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists: it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`adr/`** at the repo root: read ADRs that touch the area you're about to work in.

**Note the non-default path.** ADRs are in `adr/`, *not* `docs/adr/`. In this repo `docs/` is the Flask documentation-site application (`app.py`, `templates/`, `static/`), while prose documentation lives at the root alongside `CONTEXT.md`, `SEMANTICS.md`, `CLAUDE.md`, `llm.md`, `m3-guidelines.md` and `CHANGELOG.md`. Filing ADRs under `docs/` would put them inside the app tree.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

This repo is **single-context**:

```
/
├── CONTEXT.md                  ← the glossary; definitions only, no rules
├── SEMANTICS.md                ← generated from semantics.json; the markup standard
├── adr/
│   └── 0001-m3-expressive-as-design-language.md
├── docs/                       ← the Flask docs-site app, NOT documentation
│   └── agents/                 ← this directory: agent config
├── src/
└── website/                    ← generated from docs/templates
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_

## Two glossaries, one of which is not this one

`CONTEXT.md` is the domain glossary and states **definitions only** — it
prescribes no markup and states no rules. The rules that *use* those terms are
in `SEMANTICS.md`, which is **generated** from `semantics.json`: edit the JSON
and run `npm run build:semantics`, never edit the Markdown. Anything about how
the project is built belongs in `CLAUDE.md`.
