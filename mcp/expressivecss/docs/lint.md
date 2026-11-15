# Lint command and agent hook

`expressivecss-lint` runs the same static checks as `rules_enforcer` without
an MCP client. It flags:

- markup that breaks the bundled semantics rules
- retired markup patterns
- raw colors in component declarations
- a `transition` or `transition-property` that names `all`
- a viewport `<meta>` tag that blocks zoom
- an inline paste handler that always cancels paste
- initialization problems

The pattern checks read the whole file, so they cover `style` attributes and
`<style>` blocks, and you can pass stylesheets too. The command does not
follow `<link rel="stylesheet">`.

## In CI or pre-commit

The command exits 1 when it finds anything:

```bash
npx --package @expressivecss/mcp-server expressivecss-lint src/pages/*.astro src/components/*.jsx src/styles/*.css
```

## After every Claude Code edit

`--hook` reads a Claude Code `PostToolUse` payload on stdin. When
`tool_input.file_path` is a markup file (`.html`, `.astro`, `.jsx`, `.tsx`,
`.vue` or `.svelte`), it lints that file and exits 2 with the findings on
stderr. Claude Code passes that output back to the agent, so every edit gets
checked without the agent deciding to call a tool.

Add this to the project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "npx --package @expressivecss/mcp-server expressivecss-lint --hook" }
        ]
      }
    ]
  }
}
```

Agents without hook support get the same checks from the CI or pre-commit
command.

## Limits

- Files must be regular files inside the working directory, at most 2 MiB.
  Symbolic links, other file types, and an inspection that stops early (more
  than 4,000 tags, or over the five-second budget) are reported as findings,
  never as a pass.
- JSX, Astro, Vue and Svelte files are parsed as HTML after `className` is
  rewritten to `class`. Markup built from expressions can slip past a
  selector rule.
- Markup inside a string prop is parsed as if it were inline, which causes
  false findings. This repository's docs pages pass examples through
  `<Code code={...}>`, for example.
- Semantics findings point at the element's start tag. Elements the parser
  creates itself, such as the `<p>` implied by a stray `</p>`, have no start
  tag and report 1:1. So does every finding in very large files with
  thousands of tags.
- After the `className` rewrite, later columns on the same line read four
  lower for each rewritten attribute.
