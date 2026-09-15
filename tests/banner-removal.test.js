import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sheet } from './css.js';

test('removed banners have no shipped selectors, tokens or component rules', () => {
  assert.doesNotMatch(sheet(), /\.banner(?![\w-])|--md-comp-banners-/);
  const semantics = JSON.parse(readFileSync(new URL('../semantics.json', import.meta.url), 'utf8'));
  const decisions = JSON.parse(readFileSync(new URL('../docs/src/data/component-decisions.json', import.meta.url), 'utf8'));
  assert.equal(semantics.rows.banners, undefined);
  assert.ok(decisions.components.every(({ slug, alternatives }) => slug !== 'banners' && !alternatives.includes('banners')));
});

test('the old banner route retains migration guidance without banner examples', () => {
  const page = readFileSync(new URL('../docs/src/pages/banners.astro', import.meta.url), 'utf8');
  assert.match(page, /DocsLayout page="banners"/);
  assert.match(page, /native inline text/);
  assert.match(page, /route\("snackbar"\)/);
  assert.match(page, /route\("dialogs"\)/);
  assert.doesNotMatch(page, /class="banner(?:\s|")/);
});
