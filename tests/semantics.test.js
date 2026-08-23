// Enforces semantics.json against every surface that states component markup.
//
// Three surfaces state markup and can drift from each other: llm.md (the
// contract LLMs consume), docs/templates/** (what humans copy), and
// tests/fixtures.js. website/ is generated from the templates by freeze.py, so
// checking it would check the same thing twice.
//
// A rule runs only while its component is `enforced`. The exempt list is the
// countable backlog of the semantics sweep and only ever shrinks; the roster
// test below makes a component impossible to add without a row, so anything
// new is checked from its first commit.
//
// This file parses markup and never initializes a component: per CLAUDE.md a
// test that leaves a live timer wedges the whole `node --test` run with no
// output at all, and Chips/Snackbar/Slider own intervals.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { AUTO_INIT_FIXTURES } from './fixtures.js';
import { render } from '../scripts/gen-semantics.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const data = JSON.parse(read('semantics.json'));

// --- roster -----------------------------------------------------------------

function sassComponents() {
  const out = [];
  const walk = (dir, prefix = '') => {
    for (const e of readdirSync(new URL(`src/sass/components/${dir}`, root), { withFileTypes: true })) {
      if (e.isDirectory()) {
        walk(`${dir}${e.name}/`, `${prefix}${e.name}/`);
        continue;
      }
      if (!e.name.startsWith('_') || e.name === '_index.scss') continue;
      out.push(prefix + e.name.slice(1).replace('.scss', ''));
    }
  };
  walk('');
  return out;
}

// --- surfaces ---------------------------------------------------------------

/** ```html — optionally ```html ignore-semantics: reason */
function examplesFromMarkdown(file) {
  const src = read(file);
  const out = [];
  const re = /^```html([^\n]*)\n([\s\S]*?)^```$/gm;
  let m;
  let n = 0;
  while ((m = re.exec(src))) {
    const info = m[1].trim();
    const line = src.slice(0, m.index).split('\n').length;
    out.push({
      surface: file,
      location: `${file}:${line}`,
      html: m[2],
      ignore: info.startsWith('ignore-semantics'),
      reason: info.replace(/^ignore-semantics:?\s*/, ''),
      hasInfo: info.length > 0,
      n: n++
    });
  }
  return out;
}

/**
 * Two kinds of example live in a template and both are surfaces:
 *   - {% call code() %} … {% endcall %}, the sample a reader copies. Opts out
 *     with code(check=false, reason="…").
 *   - everything else, the live demo the page actually renders. Checking only
 *     the code samples left half of every docs page unchecked, and a demo is
 *     the copy people see working.
 *
 * Jinja is stripped rather than skipped. Skipping was a silent, reasonless
 * escape hatch: the first templated example added would have been waved
 * through without anyone opting it out.
 */
// Statements produce no output and are removed. Expressions DO produce text,
// so they become a placeholder rather than vanishing - deleting them turned
// `<a><span icon/>{{ page.label }}</a>` into an apparently nameless control
// and the accessible-name rule duly flagged the docs' own sidenav.
const stripJinja = (s) =>
  s.replace(/\{%[\s\S]*?%\}/g, '').replace(/\{\{[\s\S]*?\}\}/g, 'x');

// The argument list runs to the `)` that closes the call, not to the first `)`
// in it - a reason is prose and may well contain one ("(pre-0.8.0)"). With
// `[^)]*` such a block matched nothing at all, which is worse than it sounds:
// it was then never removed from the rendered pass either, so an example that
// had properly opted out got checked anyway, and the reason string was
// truncated on top.
const CODE_BLOCK = /\{%\s*call code\((.*?)\)\s*%\}\n([\s\S]*?)\{%\s*endcall\s*%\}/g;

/** Exported for the extractor's own tests: parsing is where this can go quietly wrong. */
export function templateExamples(src, file) {
  const out = [];
  let m;
  CODE_BLOCK.lastIndex = 0;
  while ((m = CODE_BLOCK.exec(src))) {
    const args = m[1];
    out.push({
      surface: 'docs/templates',
      location: `${file}:${src.slice(0, m.index).split('\n').length} (sample)`,
      html: stripJinja(m[2]),
      ignore: /check\s*=\s*false/.test(args),
      reason: (args.match(/reason\s*=\s*["']([^"']*)["']/) ?? [])[1] ?? ''
    });
  }

  // The rendered page, minus the code samples already taken above - they are
  // escaped text there, and taking them twice would let a code-block opt-out
  // be defeated by this pass.
  out.push({
    surface: 'docs/templates',
    location: `${file} (rendered)`,
    html: stripJinja(src.replace(CODE_BLOCK, '')),
    ignore: false,
    reason: ''
  });
  return out;
}

function examplesFromTemplates() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(new URL(`docs/templates/${dir}`, root), { withFileTypes: true })) {
      if (e.isDirectory()) {
        walk(`${dir}${e.name}/`);
        continue;
      }
      if (!e.name.endsWith('.html')) continue;
      const file = `docs/templates/${dir}${e.name}`;
      out.push(...templateExamples(read(file), file));
    }
  };
  walk('');
  return out;
}

/**
 * m3-guidelines.md states markup as inline code spans in prose, not as fenced
 * examples - `<nav aria-label="Breadcrumb"><ol>` inside a sentence. Most are
 * bare element mentions.
 *
 * So only rules marked `fragmentSafe` run against it: the ones that fire on a
 * wrong thing being *present*. Naming `<nav class="toolbar">` teaches a nav
 * misuse wherever it appears, but omitting a label is what a fragment is for.
 *
 * `fragmentSafe` is not the same as `kind: "forbid"`, which is what a first
 * attempt assumed: `fieldset:not(:has(> legend))` forbids, yet what it detects
 * is an omission, and it duly flagged four sentences that merely mention
 * `<fieldset>`.
 */
function examplesFromGuidelines() {
  const file = 'm3-guidelines.md';
  const src = read(file);
  const out = [];
  const re = /`([^`\n]*<[a-z][a-z0-9-]*[^`\n]*)`/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({
      surface: file,
      location: `${file}:${src.slice(0, m.index).split('\n').length} (fragment)`,
      html: m[1],
      fragmentSafe: true,
      ignore: false,
      reason: ''
    });
  }
  return out;
}

function examplesFromFixtures() {
  return AUTO_INIT_FIXTURES.map((f) => ({
    surface: 'tests/fixtures.js',
    location: `tests/fixtures.js (${f.name})`,
    html: f.html,
    ignore: false,
    reason: ''
  }));
}

const examples = [
  ...examplesFromMarkdown('llm.md'),
  ...examplesFromTemplates(),
  ...examplesFromFixtures(),
  ...examplesFromGuidelines()
];

// --- rule engine ------------------------------------------------------------

const enforcedRules = Object.entries(data.components)
  .filter(([, c]) => c.status === 'enforced')
  .flatMap(([name, c]) => c.rules.map((r) => ({ ...r, component: name })));

/**
 * Enough of the accessible-name computation to answer "is this control
 * nameless?" - aria-label, then aria-labelledby, then the text that is left
 * once the aria-hidden subtrees are taken out. Not the full algorithm: no
 * title, no <label>, no alt on a descendant image, because a control relying
 * on those is not what this is looking for.
 */
function accessibleName(el, document) {
  const label = el.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();
  const ref = el.getAttribute('aria-labelledby');
  if (ref) {
    const text = ref
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (text) return text;
  }
  const clone = el.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return clone.textContent.trim();
}

function violations(html, rules, { fragmentSafe = false } = {}) {
  const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
  const found = [];
  for (const rule of rules) {
    if (fragmentSafe && !rule.fragmentSafe) continue;
    const hits = [...document.querySelectorAll(rule.selector)];
    if (rule.kind === 'forbid') {
      for (const el of hits) found.push({ rule, tag: el.outerHTML.slice(0, 90) });
    } else if (rule.kind === 'require-attr') {
      for (const el of hits) {
        const v = el.getAttribute(rule.attr);
        const ok = rule.equals ? v === rule.equals : v !== null && v !== '';
        if (!ok) found.push({ rule, tag: el.outerHTML.slice(0, 90) });
      }
    } else if (rule.kind === 'require-accessible-name') {
      // The one thing a selector cannot ask. "Has no accessible name" depends
      // on text *nodes*, and CSS cannot see them: `:has(> .icon:only-child)`
      // counts elements, so it flags <a><span icon/>Five</a> - a link that is
      // perfectly well named. This reads the content instead.
      for (const el of hits) {
        if (!accessibleName(el, document)) found.push({ rule, tag: el.outerHTML.slice(0, 90) });
      }
    } else {
      throw new Error(`unknown rule kind: ${rule.kind}`);
    }
  }
  return found;
}

// --- tests ------------------------------------------------------------------

describe('semantics.json', () => {
  test('every component has a row, and no row is stale', () => {
    const roster = [...sassComponents(), ...data.additional].sort();
    const rows = Object.keys(data.components).sort();
    assert.deepEqual(
      rows,
      roster,
      'semantics.json rows must match the component roster exactly - a new component ' +
        'needs a row before it can ship, and a removed one must not leave a row behind'
    );
  });

  test('every rule is well formed', () => {
    for (const [name, c] of Object.entries(data.components)) {
      assert.ok(['enforced', 'exempt'].includes(c.status), `${name}: bad status ${c.status}`);
      for (const r of c.rules) {
        assert.ok(r.id && r.message, `${name}: rule needs an id and a message`);
        assert.ok(Object.keys(data.ruleKinds).includes(r.kind), `${r.id}: bad kind ${r.kind}`);
        if (r.kind === 'require-attr') assert.ok(r.attr, `${r.id}: require-attr needs attr`);
        // A malformed selector must fail here, not silently match nothing.
        assert.doesNotThrow(
          () => new JSDOM('<!doctype html><body>').window.document.querySelectorAll(r.selector),
          `${r.id}: invalid selector`
        );
      }
    }
  });

  test('rule ids are unique across components', () => {
    const ids = Object.values(data.components).flatMap((c) => c.rules.map((r) => r.id));
    assert.equal(new Set(ids).size, ids.length, 'duplicate rule id');
  });

  test('SEMANTICS.md is not stale', () => {
    assert.equal(
      read('SEMANTICS.md'),
      render(data),
      'SEMANTICS.md is generated - run `npm run build:semantics`'
    );
  });
});

describe('prose that names markup', () => {
  // The fragment reader only sees `<tag ...>` forms, so a selector-style
  // mention - `nav.toolbar` in a sentence or an anatomy table - was invisible
  // to it. Five declarations of `nav.toolbar` survived the sweep that forbade
  // it, in the very file the sweep had added as a surface.
  //
  // Derived from the rules rather than listed: any fragment-safe forbid rule
  // whose selector is a plain `tag.class` is a shape the prose must not name
  // either. A deliberate negation ("not `nav.toolbar`") is allowed, because
  // saying what something is not is how the docs record a rename.
  const forbiddenShapes = Object.values(data.components)
    .filter((c) => c.status === 'enforced')
    .flatMap((c) => c.rules)
    .filter((r) => r.kind === 'forbid' && r.fragmentSafe)
    .flatMap((r) => r.selector.split(',').map((x) => x.trim()))
    .filter((sel) => /^[a-z]+\.[\w-]+$/.test(sel));

  test('the rules yield shapes to look for', () => {
    assert.ok(forbiddenShapes.length > 0, 'no tag.class forbid rules to derive from');
  });

  test('no document names a shape its own rules forbid', () => {
    const failures = [];
    for (const file of ['llm.md', 'm3-guidelines.md']) {
      const src = read(file);
      for (const m of src.matchAll(/`([^`\n]+)`/g)) {
        const shape = m[1].trim();
        if (!forbiddenShapes.includes(shape)) continue;
        const before = src.slice(Math.max(0, m.index - 24), m.index);
        if (/\b(not|no|never|instead of|rather than)\s+$/i.test(before)) continue;
        const line = src.slice(0, m.index).split('\n').length;
        failures.push(`${file}:${line} names \`${shape}\`, which ${'`'}forbid${'`'} rules reject`);
      }
    }
    assert.deepEqual(failures, [], `\n  ${failures.join('\n  ')}\n`);
  });
});

describe('composed pages', () => {
  // website/ was excluded as a *surface* because it is generated from the
  // templates - checking its fragments would check them twice. A whole page is
  // a different question. Rules like main-not-nested and dialog-is-named are
  // document-level, chrome and content only meet here, and a landmark name is
  // only ambiguous relative to the other landmarks on the same page. The
  // duplicate-name check below has no rule behind it for that reason: there is
  // no fragment it could be written against.
  //
  // 57 pages, well under a second.
  //
  // These read the *committed* website/, which is only as current as the last
  // freeze - a template-only change would leave this passing against a
  // snapshot of the previous state. CI closes that: it re-runs freeze.py and
  // fails if the diff is non-empty, which is the check CLAUDE.md already
  // prescribed for template changes and nothing had automated.
  const pages = readdirSync(new URL('website/', root))
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ file: `website/${f}`, html: read(`website/${f}`) }));

  test('the frozen site exists to check', () => {
    assert.ok(pages.length > 20, `only ${pages.length} frozen pages - run freeze.py`);
  });

  test('every page satisfies every enforced rule', () => {
    const failures = [];
    for (const { file, html } of pages) {
      for (const v of violations(html, enforcedRules)) {
        failures.push(`${file}\n    [${v.rule.id}] ${v.rule.message}\n    ${v.tag}`);
      }
    }
    assert.deepEqual(failures, [], `\n${failures.slice(0, 12).join('\n\n')}\n`);
  });

  test('no two landmarks on a page share a name', () => {
    // Two <nav>s both called "Main" is a landmark menu with two identical rows,
    // which is the problem labelling them was meant to solve. Shipped once.
    const failures = [];
    for (const { file, html } of pages) {
      const { document } = new JSDOM(html).window;
      const names = [...document.querySelectorAll('nav')].map((n) => {
        const l = n.getAttribute('aria-label');
        if (l) return l.trim();
        const ref = n.getAttribute('aria-labelledby');
        return ref ? (document.getElementById(ref)?.textContent ?? '').trim() : '';
      });
      const seen = new Set();
      for (const n of names) {
        if (n && seen.has(n)) failures.push(`${file}: two landmarks named "${n}"`);
        seen.add(n);
      }
    }
    assert.deepEqual(failures, [], `\n  ${failures.join('\n  ')}\n`);
  });
});

describe('template extractor', () => {
  const wrap = (args, body) =>
    `{% block page %}\n{% call code(${args}) %}\n${body}\n{% endcall %}\n{% endblock %}`;

  test('a sample is extracted and the rendered pass does not double-count it', () => {
    const got = templateExamples(wrap('', '<span class="chip">x</span>'), 'f.html');
    assert.equal(got.length, 2, 'one sample plus the rendered page');
    assert.match(got[0].html, /<span class="chip">x<\/span>/);
    assert.doesNotMatch(got[1].html, /chip/, 'the sample must be cut from the rendered pass');
  });

  test('a reason containing parentheses does not truncate the arguments', () => {
    // With `[^)]*` this matched nothing: the block was not recognised as a
    // sample, so it was never cut from the rendered pass and the opt-out was
    // silently ignored - a green-looking check on markup nobody had exempted.
    const got = templateExamples(
      wrap('check=false, reason="0.7.0 markup (pre-sweep), kept for migration"', '<div class="chip">old</div>'),
      'f.html'
    );
    assert.equal(got.length, 2);
    assert.equal(got[0].ignore, true);
    assert.equal(got[0].reason, '0.7.0 markup (pre-sweep), kept for migration');
    assert.doesNotMatch(got[1].html, /chip/, 'an opted-out sample must still be cut from the rendered pass');
  });

  test('a checked sample stays checked', () => {
    const got = templateExamples(wrap('', '<div class="chip">old</div>'), 'f.html');
    assert.equal(got[0].ignore, false);
  });
});

describe('documented markup', () => {
  test('surfaces yield examples to check', () => {
    // Guards the extractors: a regex that silently stops matching would turn
    // this whole suite into a no-op that passes.
    for (const surface of ['llm.md', 'docs/templates', 'tests/fixtures.js', 'm3-guidelines.md']) {
      const n = examples.filter((e) => e.surface === surface).length;
      assert.ok(n > 0, `no examples extracted from ${surface}`);
    }
  });

  test('every opt-out states a reason', () => {
    for (const e of examples.filter((e) => e.ignore)) {
      assert.ok(
        e.reason.trim().length > 0,
        `${e.location}: an opt-out must state a reason so a reviewer can tell whether it is still earned`
      );
    }
  });

  test('no markup hides behind a non-html fence', () => {
    // The extractor keys on ```html, so a markup sample tagged ```text is not
    // a documented example as far as this suite is concerned - it is invisible.
    // 37 blocks were in that state, including every Fieldsets example, which
    // is a third of the contract silently unchecked.
    //
    // Walked line by line rather than matched with one regex: an `opening
    // fence' pattern also matches every *closing* fence, which made a first
    // attempt report the prose between blocks.
    const mistagged = [];
    for (const file of ['llm.md', 'm3-guidelines.md']) {
    const lines = read(file).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('```')) continue;
      const lang = lines[i].slice(3).trim();
      const body = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('```')) body.push(lines[j++]);
      if (lang !== 'html' && /<[a-z][a-z0-9-]*[\s>/]/.test(body.join('\n'))) {
        mistagged.push(`${file}:${i + 1} (\`\`\`${lang || 'untagged'})`);
      }
      i = j;
    }
    }
    assert.deepEqual(
      mistagged,
      [],
      `these blocks contain markup but are not tagged \`\`\`html, so nothing checks them:\n  ${mistagged.join('\n  ')}`
    );
  });

  test('no unknown info string on an html block', () => {
    for (const e of examples.filter((e) => e.hasInfo && !e.ignore)) {
      assert.fail(`${e.location}: unrecognised fence info "html ${e.reason}"`);
    }
  });

  test('every checked example satisfies the enforced rules', () => {
    const failures = [];
    for (const e of examples) {
      if (e.ignore) continue;
      for (const v of violations(e.html, enforcedRules, { fragmentSafe: e.fragmentSafe }))
        failures.push(`${e.location}\n    [${v.rule.id}] ${v.rule.message}\n    ${v.tag}`);
    }
    assert.deepEqual(failures, [], `\n${failures.join('\n\n')}\n`);
  });
});
