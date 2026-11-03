import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as api from '../dist/js/modular.mjs';
import { PAGES } from '../docs/src/data/nav.ts';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sourceFor = page => read(`docs/src/pages/${page.route === '/' ? 'index' : page.route.slice(1, -5)}.astro`);

describe('documentation coverage', () => {
  test('every runtime export has exactly one guide in the shared catalogue', () => {
    const names = PAGES.flatMap(page => page.exports ?? []);
    assert.equal(new Set(names).size, names.length, 'an export has multiple owner pages');
    assert.deepEqual([...names].sort(), Object.keys(api).sort());
    for (const page of PAGES.filter(page => page.exports?.length)) {
      const source = sourceFor(page);
      for (const name of page.exports) {
        assert.match(source, new RegExp(`\\b${name}\\b`), `${page.route}: missing ${name} usage`);
      }
    }
  });

  test('every default option, including nested keys, is named in its export guide', () => {
    const missing = [];
    for (const page of PAGES) {
      if (!page.exports?.length) continue;
      const source = sourceFor(page);
      for (const name of page.exports) {
        const check = (defaults, path) => {
          for (const [key, value] of Object.entries(defaults)) {
            if (!new RegExp(`\\b${key}\\b`).test(source)) missing.push(`${page.route}: ${path}.${key}`);
            if (value && typeof value === 'object' && !Array.isArray(value)) check(value, `${path}.${key}`);
          }
        };
        check(api[name]?.defaults ?? {}, name);
      }
    }
    assert.deepEqual(missing, [], `Undocumented options:\n${missing.join('\n')}`);
  });

  test('every public Sass function and mixin has a reference entry', () => {
    const source = sourceFor(PAGES.find(page => page.id === 'sass'));
    const dir = new URL('../src/sass/abstracts/', import.meta.url);
    const missing = [];
    for (const file of readdirSync(dir).filter(file => file.endsWith('.scss'))) {
      for (const [, name] of read(`src/sass/abstracts/${file}`).matchAll(/^@(?:function|mixin)\s+([\w-]+)/gm)) {
        if (name.startsWith('_') || name.startsWith('-')) continue;
        if (!source.includes(`${name}(`)) missing.push(`${file}: ${name}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test('every component, utility, base and token partial has one guide', () => {
    const expected = [];
    for (const folder of ['components', 'utilities', 'base', 'tokens']) {
      const dir = new URL(`../src/sass/${folder}/`, import.meta.url);
      for (const file of readdirSync(dir, { recursive: true })) {
        if (!file.endsWith('.scss') || file.endsWith('_index.scss')) continue;
        expected.push(`${folder}/${file.replaceAll('\\', '/').replace(/(^|\/)_(?=[^/]+$)/, '$1').slice(0, -5)}`);
      }
    }
    const documented = PAGES.flatMap(page => page.styles ?? []);
    assert.equal(new Set(documented).size, documented.length, 'a partial has multiple owner pages');
    assert.deepEqual(documented.sort(), expected.sort());
  });
});
