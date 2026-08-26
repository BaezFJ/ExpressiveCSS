// Script in the documentation, checked against the bundle and the sheet.
//
// Renames keep breaking here rather than in markup: the class attributes get
// swept mechanically and the JavaScript beside them does not. A single pass
// left `Expressive.Slider.init` initialising slideshows after Slider became the
// range control, and three pages querying `.sidenav` after the drawer markup
// had moved to `.navigation-drawer` - each of them silently doing nothing.
//
// Two questions, both cheap: does every `Expressive.X` name something the
// bundle exports, and does every selector string in a documented snippet match
// something the sheet styles?

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { Expressive } from './setup.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const css = read('dist/css/expressive.css');

/** Selector strings the framework reads but never styles. */
const HOOKS = new Set([
  'tooltipped', 'no-autoinit', 'validate', 'activator', 'autocomplete',
  'date-picker', 'time-picker', 'datepicker', 'timepicker',
  'navigation-drawer-trigger', 'navigation-drawer-close', 'sidenav-trigger', 'sidenav-close',
  'menu-trigger', 'lightboxed', 'scrollspy', 'carousel-item',
  'waves-effect', 'waves-light', 'waves-circle',
  'chips-initial', 'chips-placeholder', 'chips-autocomplete', 'custom-class',
  'slideshow', 'navigation-drawer', 'fab'
]);

function docSources() {
  const out = [{ file: 'llm.md', text: read('llm.md') }];
  const walk = (dir) => {
    for (const e of readdirSync(new URL(`docs/templates/${dir}`, root), { withFileTypes: true })) {
      if (e.isDirectory()) { walk(`${dir}${e.name}/`); continue; }
      if (e.name.endsWith('.html')) out.push({ file: `docs/templates/${dir}${e.name}`, text: read(`docs/templates/${dir}${e.name}`) });
    }
  };
  walk('');
  return out;
}

// Stand-ins in generic "how to call a component" snippets, not real names.
const PLACEHOLDERS = new Set(['ComponentName']);

// Selector strings that stand for the *reader's* element, not a framework
// class - "here is how you would target your own". They are listed rather than
// pattern-matched so that adding one is a deliberate act: the whole point of
// this check is that a selector nothing defines is usually a rename that was
// only half applied.
const READERS_OWN = new Set(['custom-tooltip', 'wave-demo', 'component']);

describe('documented script', () => {
  test('every Expressive.X names something the bundle exports', () => {
    const failures = [];
    for (const { file, text } of docSources()) {
      for (const m of text.matchAll(/\bExpressive\.([A-Z][A-Za-z]*)/g)) {
        if (Expressive[m[1]] !== undefined || PLACEHOLDERS.has(m[1])) continue;
        failures.push(`${file}:${text.slice(0, m.index).split('\n').length}  Expressive.${m[1]} is not exported`);
      }
    }
    assert.deepEqual(failures, [], `\n  ${failures.join('\n  ')}\n`);
  });

  test('every selector string in a snippet matches something real', () => {
    const failures = [];
    for (const { file, text } of docSources()) {
      for (const m of text.matchAll(/querySelector(?:All)?\(\s*'([^']+)'/g)) {
        for (const cls of m[1].matchAll(/\.([\w-]+)/g)) {
          if (HOOKS.has(cls[1]) || READERS_OWN.has(cls[1]) || css.includes(`.${cls[1]}`)) continue;
          // A class the example itself introduces is the reader's, not the
          // framework's - `.wave-demo`, `.custom-tooltip`. Nothing defining it
          // anywhere is the failure worth reporting.
          if (new RegExp(`class="[^"]*\\b${cls[1]}\\b`).test(text)) continue;
          failures.push(`${file}:${text.slice(0, m.index).split('\n').length}  .${cls[1]} is styled by nothing and is not a known hook`);
        }
      }
    }
    assert.deepEqual(failures, [], `\n  ${failures.join('\n  ')}\n`);
  });
});
