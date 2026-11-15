# Maintainers

The bundled data (`component-guides.json`, `component-decisions.json`,
`capability-roadmap.json`, `semantics-data.json` and `contract.json`) is
generated from the framework repository. A framework checkout only supplies
version and provenance evidence; it never replaces the bundled guidance.

Check that the generated data is current, then run the smoke test:

```bash
node ../../scripts/gen-expressivecss-skill.mjs --check
npm test
```

To refresh the data, run the generator without `--check` before packing.

The package scripts are self-contained. `npm test` runs the live MCP protocol
smoke test, and `npm pack --dry-run` runs it again through `prepack`.

When upgrading Node, update the Node executable your MCP client uses before
reinstalling the server. Node 20 and older Node 22 and 24 patch releases are
not supported. The supported range matches the `jsdom` dependency.
