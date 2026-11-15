// Scaffold: the semantics rules. Layout checks run in
// tests/scaffold-browser.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enforcedRules, violations } from '../scripts/semantics-rules.mjs';

const data = JSON.parse(readFileSync(new URL('../semantics.json', import.meta.url), 'utf8'));
const rules = enforcedRules(data).filter((r) => r.component === 'scaffold');
const hits = (html) => violations(html, rules, data.compositeRoles).map((v) => v.rule?.id ?? v.id);

const bar = '<header><div class="bar"><h1>Mail</h1></div></header>';
const rail = '<nav class="navigation-rail" aria-label="Primary"><a href="#inbox" aria-current="page">Inbox</a></nav>';
const tools = '<div class="toolbar vertical"><button type="button" aria-label="Calendar">C</button></div>';
const shell = (inner, tag = 'div', attrs = '') => `<${tag} class="scaffold"${attrs}>${inner}</${tag}>`;

test('a scaffold row is enforced with its three rules', () => {
  assert.equal(data.rows.scaffold?.status, 'enforced');
  assert.deepEqual(rules.map((r) => r.id).sort(), [
    'scaffold-does-not-nest',
    'scaffold-is-not-a-landmark',
    'scaffold-one-child-per-region',
  ]);
});

test('a full scaffold, one with a second hidden main, and one of region classes pass', () => {
  assert.deepEqual(hits(shell(`${bar}${rail}<main>Inbox</main>${tools}`)), []);
  assert.deepEqual(hits(shell(`${bar}${rail}<main>Inbox</main><main hidden>Draft</main>${tools}`)), []);
  assert.deepEqual(hits(shell('<div class="scaffold-bar">Bar</div><div class="scaffold-pane">Pane</div>')), []);
  assert.deepEqual(hits(shell('<main>Pane</main><footer class="status-bar">A</footer><footer class="status-bar" hidden>B</footer>')), []);
});

for (const [name, html, id] of [
  ['a main scaffold', shell('<div>Pane</div>', 'main'), 'scaffold-is-not-a-landmark'],
  ['a scaffold with a role', shell('<main>Pane</main>', 'div', ' role="application"'), 'scaffold-is-not-a-landmark'],
  ['a search scaffold', shell('<main>Pane</main>', 'search'), 'scaffold-is-not-a-landmark'],
  ['two visible mains', shell('<main>One</main><main>Two</main>'), 'scaffold-one-child-per-region'],
  ['a main beside an until-found main', shell('<main>One</main><main hidden="until-found">Two</main>'), 'scaffold-one-child-per-region'],
  ['main beside a region-class pane', shell('<main>One</main><div class="scaffold-pane">Two</div>'), 'scaffold-one-child-per-region'],
  ['two headers', shell(`${bar}${bar}<main>Pane</main>`), 'scaffold-one-child-per-region'],
  ['two rails', shell(`${rail}${rail}<main>Pane</main>`), 'scaffold-one-child-per-region'],
  ['two trailing toolbars', shell(`<main>Pane</main>${tools}<div class="scaffold-trailing">More</div>`), 'scaffold-one-child-per-region'],
  ['two status bars', shell('<main>Pane</main><footer class="status-bar">A</footer><div class="status-bar" role="region" aria-label="B">B</div>'), 'scaffold-one-child-per-region'],
  ['two navigation bars', shell('<main>Pane</main><nav class="navigation-bar" aria-label="A"><a href="#a">A</a></nav><nav class="navigation-bar" aria-label="B"><a href="#b">B</a></nav>'), 'scaffold-one-child-per-region'],
  ['a nested scaffold', shell(`<main>${shell('<div class="scaffold-pane">Inner</div>')}</main>`), 'scaffold-does-not-nest'],
]) {
  test(`${name} is flagged by ${id}`, () => {
    assert.ok(hits(html).includes(id), `expected ${id}, got ${JSON.stringify(hits(html))}`);
  });
}
