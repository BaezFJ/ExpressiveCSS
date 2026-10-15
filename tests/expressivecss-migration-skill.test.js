import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const skill = readFileSync(new URL('../skills/expressivecss-migration/SKILL.md', import.meta.url), 'utf8');

// Each step's search is a `grep -rnE ... "<pattern>" .` line; the pattern is shell-quoted ERE.
const searches = [...skill.matchAll(/^Search: `grep -rnE (?:--exclude-dir=\S+ )+"(.+)" \.`$/gm)]
  .map(([, pattern]) => new RegExp(pattern.replaceAll('\\"', '"')));

const legacy = [
  '<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">',
  '<script>M.AutoInit(); new Toast({});</script>',
  '<div class="card-panel teal lighten-2"></div>',
  '<a class="btn" href="/x">Go</a>',
  '<div class="hide-on-small-only"></div>',
];

const templates = new URL('../skills/expressivecss/assets/templates/', import.meta.url);
const current = readdirSync(templates).flatMap((file) => readFileSync(new URL(file, templates), 'utf8').split('\n'));

test('migration skill searches find legacy names and pass the bundled templates', () => {
  assert.equal(searches.length, 5);
  legacy.forEach((line, step) => assert.match(line, searches[step], `step ${step + 2} search misses ${line}`));
  for (const search of searches) {
    for (const line of current) assert.doesNotMatch(line, search, `${search} flags current markup`);
  }
});

test('migration skill is self-contained', () => {
  assert.match(skill, /^---\nname: expressivecss-migration\n/);
  assert.doesNotMatch(skill, /\]\((?!https:\/\/)/, 'links must be absolute so the skill installs on its own');
  assert.ok(skill.split('\n').length < 500);
});
