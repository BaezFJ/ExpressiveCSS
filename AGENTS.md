# Shared development instructions

- Start with [CONTRIBUTING.md](CONTRIBUTING.md). Read the relevant source and callers before changing behavior.
- Keep fixes in the shared implementation. Reuse existing code, native browser features, and installed dependencies before adding abstractions.
- Read [Sass architecture](src/sass/README.md) before stylesheet changes and [TypeScript conventions](src/ts/README.md) before component changes. Engineering history and pitfalls live in [development notes](docs/development-notes.md).
- Preserve public exports, markup compatibility, accessibility contracts, upstream references, and license notices unless an accepted change explicitly replaces them.
- `semantics.json` owns markup rules. The docs catalogue owns page inventory. Regenerate committed derived files with `npm run build:semantics` and `npm run build:skill`; do not edit generated copies by hand.
- Tests run against built bundles. Use `npm run verify` for the contributor checks and the separate MCP commands in CONTRIBUTING.md. Always tear down components and timers in `finally` blocks.
- Never initialize components in static semantics checks. Do not claim a browser or visual check passed when it was skipped.
- Follow [SECURITY.md](SECURITY.md) at trust boundaries and [RELEASING.md](RELEASING.md) for releases. Never publish from a contributor branch or move a published tag.
- Use Conventional Commit messages. Do not add `Co-authored-by` trailers or other Codex/AI attribution to commit messages.
