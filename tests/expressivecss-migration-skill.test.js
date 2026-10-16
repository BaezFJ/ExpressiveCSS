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

test('the step 6 search finds every alias 1.0 removes and leaves their replacements', () => {
  const step6 = searches[4];
  for (const line of [
    '<span class="material-icons">add</span>',
    '<button><i>add</i></button>',
    '<div class="range"><input type="range"></div>',
    '<input class=\'timepicker\'>',
    '<input class="datepicker validate">',
    '<span class="handle"></span>',
    '<dialog class="bottom">',
    '<dialog class="right-sheet">',
    '<div class="toolbar filled">',
    '<div class="max toolbar">',
    '<span class="chip active">',
    '<div class="tooltip max">',
    '<ul class="tabs"><li class="tab"><a>',
    '<div class="switch"><label>',
    '<a class="button extra" href="#">',
    'Datepicker.init(el, { startRange: d })',
    '<div class="background-text">',
    'Expressive.Range',
  ]) assert.match(line, step6, `step 6 search misses ${line}`);
  for (const line of [
    '<dialog class="bottom-sheet">',
    '<button class="button circle extra">+</button>',
    '<div class="datepicker-container"></div>',
    '<div class="toolbar-group">',
    '<div class="toolbar docked vibrant"><button class="filled">',
    '<span class="chip selected">',
    '<label class="switch"><input type="checkbox"></label>',
    '<nav class="tabs"><a class="active">',
    '<span class="drag-handle"></span>',
    '<input type="range" class="slider-input">',
  ]) assert.doesNotMatch(line, step6, `step 6 search flags ${line}`);
});

test('migration skill is self-contained', () => {
  assert.match(skill, /^---\nname: expressivecss-migration\n/);
  assert.doesNotMatch(skill, /\]\((?!https:\/\/)/, 'links must be absolute so the skill installs on its own');
  assert.ok(skill.split('\n').length < 500);
});
