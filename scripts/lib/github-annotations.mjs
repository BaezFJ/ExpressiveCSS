// node:test reporter that turns each failing test into a GitHub Actions error
// annotation, so the failure shows on the PR and in `gh run view` without
// searching the job log. It writes nothing outside Actions.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const data = (value) => String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const property = (value) => data(value).replace(/:/g, '%3A').replace(/,/g, '%2C');

function location(file, line = 1) {
  if (!file) return '';
  const local = file.startsWith('file:') ? fileURLToPath(file) : file;
  return `file=${property(path.relative(process.cwd(), local))},line=${line},`;
}

export function annotation({ name, file, line, details }) {
  const error = details?.error;
  // A suite fails when a child does; the child already has its annotation.
  if (error?.failureType === 'subtestsFailed') return '';
  const cause = error?.cause ?? error;
  return `::error ${location(file, line)}title=${property(name)}::${data(cause?.message ?? cause)}\n`;
}

// node:test loads this by path from --test-reporter in scripts/run-node-tests.mjs.
// fallow-ignore-next-line unused-export
export default async function* githubAnnotations(source) {
  for await (const event of source) {
    if (event.type === 'test:fail' && process.env.GITHUB_ACTIONS) yield annotation(event.data);
  }
}
