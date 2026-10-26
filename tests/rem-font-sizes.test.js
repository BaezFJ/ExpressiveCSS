import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const root = new URL('../src/sass/', import.meta.url);
// Chips move to rem in roadmap phase 53.
const exempt = new Set(['components/_chips.scss']);

const pxFontSizes = (dir) => readdirSync(new URL(dir, root), { recursive: true })
  .filter((file) => file.endsWith('.scss'))
  .map((file) => `${dir}/${file}`)
  .filter((file) => !exempt.has(file))
  .flatMap((file) => readFileSync(new URL(file, root), 'utf8').split('\n')
    .map((line, index) => ({ line: line.trim(), at: `${file}:${index + 1}` }))
    .filter(({ line }) => /^font-size:\s*[\d.]+px\b/.test(line))
    .map(({ line, at }) => `${at} ${line}`));

test('component and abstracts rules size text and icons in rem, not px', () => {
  const found = ['components', 'abstracts'].flatMap(pxFontSizes);
  assert.deepEqual(found, [], `px font sizes:\n${found.join('\n')}`);
});
