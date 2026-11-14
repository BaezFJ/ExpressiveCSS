// Status bar: the semantics rules and the selector scope. Layout, color and
// mode checks run in tests/status-bar-browser.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enforcedRules, violations } from '../scripts/semantics-rules.mjs';

const data = JSON.parse(readFileSync(new URL('../semantics.json', import.meta.url), 'utf8'));
const rules = enforcedRules(data).filter((r) => r.component === 'status-bar');
const hits = (html) => violations(html, rules, data.compositeRoles).map((v) => v.rule?.id ?? v.id);

const item = '<button type="button" aria-label="Notifications"><span class="material-symbols" aria-hidden="true">notifications</span></button>';

test('a status bar row is enforced with its four rules', () => {
  assert.equal(data.rows['status-bar']?.status, 'enforced');
  assert.deepEqual(rules.map((r) => r.id).sort(), [
    'status-bar-is-not-a-live-region',
    'status-bar-item-is-named',
    'status-bar-not-a-composite-widget',
    'status-bar-not-nav',
  ]);
});

test('a footer or labelled div bar with named items and a status item passes', () => {
  assert.deepEqual(hits(`<footer class="status-bar">${item}<span role="status">Ln 4, Col 2</span><a href="#p">Problems</a></footer>`), []);
  assert.deepEqual(hits(`<div class="status-bar" aria-label="Status">${item}</div>`), []);
});

for (const [name, html, id] of [
  ['a live-region bar', `<footer class="status-bar" role="status">${item}</footer>`, 'status-bar-is-not-a-live-region'],
  ['an aria-live bar', `<footer class="status-bar" aria-live="polite">${item}</footer>`, 'status-bar-is-not-a-live-region'],
  ['a toolbar-role bar', `<footer class="status-bar" role="toolbar">${item}</footer>`, 'status-bar-not-a-composite-widget'],
  ['a nav bar', `<nav class="status-bar">${item}</nav>`, 'status-bar-not-nav'],
  ['an unnamed icon-only item', '<footer class="status-bar"><button type="button"><span class="material-symbols" aria-hidden="true">sync</span></button></footer>', 'status-bar-item-is-named'],
]) {
  test(`${name} is flagged by ${id}`, () => {
    assert.ok(hits(html).includes(id), `expected ${id}, got ${JSON.stringify(hits(html))}`);
  });
}

// A selector list split at its top-level commas only.
function topLevelParts(list) {
  const parts = [''];
  let depth = 0;
  for (const ch of list) {
    depth += { '(': 1, ')': -1 }[ch] ?? 0;
    if (ch === ',' && depth === 0) parts.push('');
    else parts[parts.length - 1] += ch;
  }
  return parts.map((part) => part.trim());
}

test('every compiled status bar selector starts at .status-bar', () => {
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
  const selectors = [...css.matchAll(/([^{}@;]+)\{/g)]
    .map((m) => m[1].trim())
    .flatMap(topLevelParts)
    // The page footer names the bar only to leave it out, in a :not().
    .filter((part) => part.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '').includes('status-bar'));
  assert.ok(selectors.length > 5, 'the partial compiled');
  for (const selector of selectors) assert.match(selector, /^\.status-bar\b/, selector);
});
