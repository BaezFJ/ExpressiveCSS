import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const root = new URL('../src/sass/', import.meta.url);

const pxFontSizes = (dir) => readdirSync(new URL(dir, root), { recursive: true })
  .filter((file) => file.endsWith('.scss'))
  .map((file) => `${dir}/${file}`)
  .flatMap((file) => readFileSync(new URL(file, root), 'utf8').split('\n')
    .map((line, index) => ({ line: line.trim(), at: `${file}:${index + 1}` }))
    .filter(({ line }) => /^(?:font(?:-size)?|--font-size(?:-icon)?):[^;]*\dpx\b/.test(line.replace(/rem\([^)]*\)/g, '')))
    .map(({ line, at }) => `${at} ${line}`));

// Include chip custom properties, which otherwise hide a fixed font size.
test('component and abstracts rules size text and icons in rem, not px', () => {
  const found = ['components', 'abstracts'].flatMap(pxFontSizes);
  assert.deepEqual(found, [], `px font sizes:\n${found.join('\n')}`);
});
