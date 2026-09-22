#!/usr/bin/env node
/**
 * Command-line front end for the static checks `rules_enforcer` runs: the
 * bundled semantics rules plus the legacy-pattern and initialization checks.
 *
 *   expressivecss-lint <file>...     Report findings; exit 1 when any.
 *   expressivecss-lint --hook        Read a Claude Code PostToolUse payload on
 *                                    stdin, lint `tool_input.file_path` when
 *                                    it is a markup file, exit 2 on findings
 *                                    so the message goes back to the agent.
 */
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectAuthoringRules } from './server.js';

// Markdown is left out: a doc concatenates many independent examples, so page-level rules misfire.
const MARKUP = new Set(['.html', '.htm', '.astro', '.jsx', '.tsx', '.vue', '.svelte']);
const MAX_BYTES = 2 * 1024 * 1024;

export function lintFile(file) {
  const source = readFileSync(file);
  if (source.length > MAX_BYTES) return [{ id: 'file-too-large', severity: 'high', rule: `Skipped: over ${MAX_BYTES} bytes`, location: { line: 1, column: 1 }, snippet: '' }];
  // ponytail: JSX/Astro/Vue are parsed as HTML after `className` -> `class`; expression-heavy markup can hide from selector rules.
  return inspectAuthoringRules(source.toString('utf8').replace(/\bclassName=/gu, 'class='));
}

export function format(file, issues) {
  return issues
    .map((issue) => `${file}:${issue.location.line}:${issue.location.column} ${issue.id} [${issue.severity}] ${issue.rule}${issue.snippet ? `\n    ${issue.snippet}` : ''}`)
    .join('\n');
}

function main(argv) {
  if (argv[0] === '--hook') {
    const payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
    const file = payload.tool_input?.file_path;
    if (!file || !MARKUP.has(path.extname(file).toLowerCase())) return 0;
    const issues = lintFile(file);
    if (!issues.length) return 0;
    console.error(`ExpressiveCSS lint found ${issues.length} issue(s). Fix them before continuing:\n${format(file, issues)}`);
    return 2;
  }
  if (!argv.length || argv[0] === '--help') {
    console.error('Usage: expressivecss-lint <file>... | --hook');
    return argv.length ? 0 : 1;
  }
  let total = 0;
  for (const file of argv) {
    const issues = lintFile(file);
    total += issues.length;
    if (issues.length) console.log(format(file, issues));
  }
  console.error(total ? `${total} issue(s) in ${argv.length} file(s).` : `No issues in ${argv.length} file(s).`);
  return total ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
