#!/usr/bin/env node
/**
 * TEMPORARY. Delete this with the Flask site (ADR 0003, issue #83).
 *
 * Mechanical Jinja-to-Astro conversion for the documentation pages: the
 * predictable syntax only. It moves `{% call section %}`, `{% call code %}`,
 * `{% call page_body %}` and `{{ url_for }}` across, hoists the section list
 * into one `defineSections` call, and drops the chrome the layout now owns.
 *
 * It does not try to be clever. Anything left over -- a macro it does not
 * know, a conditional, a loop -- is reported on stderr with its line, and the
 * page is finished by hand. That is the deal: it exists to save the typing on
 * 57 near-identical pages, not to be a Jinja implementation.
 *
 *   node scripts/jinja-to-astro.mjs docs/templates/components/buttons.html buttons
 *
 * The second argument is the page's catalogue id. The filename comes from the
 * route the catalogue publishes it at, which is not always the id -- `media_css`
 * publishes as `/media-css.html` -- and Astro derives a route from a filename,
 * so guessing here would publish the page at the wrong URL.
 */
import { readFileSync, writeFileSync } from 'node:fs';

// Node strips the types. This runs on the repo's own Node, not on a consumer's.
const { PAGES } = await import(new URL('../docs/src/data/nav.ts', import.meta.url));

const [source, id] = process.argv.slice(2);
if (!source || !id) {
  console.error('usage: node scripts/jinja-to-astro.mjs <template> <page-id>');
  process.exit(2);
}

const page = PAGES.find((p) => p.id === id);
if (!page) {
  console.error(`no documented page "${id}" -- see docs/src/data/nav.ts`);
  process.exit(2);
}
// The landing page is canonical at the site root, so its file is index.astro.
const basename = id === 'index' ? 'index' : page.route.replace(/^\//, '').replace(/\.html$/, '');

const src = readFileSync(source, 'utf8');
const lineOf = (index) => src.slice(0, index).split('\n').length;

/** A template literal has three characters that end it early. */
const literal = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

/** `key=value, key="value"` from a macro call's argument list. */
function args(text) {
  const out = {};
  for (const m of text.matchAll(/(\w+)\s*=\s*("(?:[^"]*)"|'(?:[^']*)'|[\w.]+)/g)) {
    const raw = m[2];
    out[m[1]] = /^["']/.test(raw) ? raw.slice(1, -1) : raw;
  }
  return out;
}

/** `S.download` when the id allows it, `S["filled-tonal"]` when it does not. */
const key = (id) => (/^[A-Za-z_$][\w$]*$/.test(id) ? `.${id}` : `[${JSON.stringify(id)}]`);

/** One section's metadata, written the way a hand-authored page writes it. */
const meta = (s) =>
  `{ ${Object.entries(s)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ')} }`;

/**
 * An expression in a quoted attribute is a literal string in Astro, not an
 * interpolation: `href="{route('grid')}"` publishes those eleven characters.
 * Rewrite the whole attribute as an expression instead.
 *
 * Only `{route(…)}` -- the one interpolation this script emits. Matching any
 * braces caught the JS block in `onclick="(function(d){ … })(…)"` and turned a
 * working handler into a syntax error.
 */
function attributeExpressions(html) {
  return html.replace(/(\s[\w:-]+)="([^"]*\{route\([^"{}]*\)\}[^"]*)"/g, (whole, name, value) => {
    const only = value.match(/^\{([^{}]+)\}$/);
    if (only) return `${name}={${only[1]}}`;
    return `${name}={\`${value.replace(/\{([^{}]+)\}/g, '${$1}')}\`}`;
  });
}

/** A rendered `<Code … />`, whose template literal must be left exactly alone. */
const CODE_LITERAL = /<Code\b[\s\S]*?code=\{`[\s\S]*?`\}\s*\/>/g;

/** Apply `fn` to the markup between the code samples, and to nothing else. */
function outsideCode(html, fn) {
  let out = '';
  let last = 0;
  let m;
  CODE_LITERAL.lastIndex = 0;
  while ((m = CODE_LITERAL.exec(html))) {
    out += fn(html.slice(last, m.index)) + m[0];
    last = CODE_LITERAL.lastIndex;
  }
  return out + fn(html.slice(last));
}

/** The positional string arguments of a macro call, in order. */
const positional = (text) =>
  [...text.matchAll(/(?:^|,)\s*(["'])([\s\S]*?)\1\s*(?=,|$)/g)].map((m) => m[2]);

const sections = [];
const unconverted = [];
const open = [];
let out = '';
let cursor = 0;

const TAG = /\{%-?([\s\S]*?)-?%\}\n?|\{\{-?([\s\S]*?)-?\}\}/g;

TAG.lastIndex = 0;
let m;
while ((m = TAG.exec(src))) {
  out += src.slice(cursor, m.index);
  cursor = TAG.lastIndex;

  // {{ ... }} -- an expression.
  if (m[2] !== undefined) {
    const expr = m[2].trim();
    const url = expr.match(/^url_for\(['"](\w+)['"]\)$/);
    if (url) {
      out += `{route('${url[1]}')}`;
      continue;
    }
    unconverted.push(`${lineOf(m.index)}: {{ ${expr} }}`);
    out += `{/* TODO: ${expr} */}`;
    continue;
  }

  const stmt = m[1].trim();

  // Chrome the layout now owns, and metadata the catalogue now owns.
  if (/^(extends|from|block page|set page_(name|blurb))\b/.test(stmt)) continue;
  if (stmt === 'endblock') continue;

  const call = stmt.match(/^call\s+(\w+)\(([\s\S]*)\)$/);
  if (call) {
    const [, macro, argText] = call;
    if (macro === 'page_body') {
      const a = args(argText);
      const attrs = [
        'sections={S}',
        a.container_class && `containerClass=${JSON.stringify(a.container_class)}`,
        a.content_class && `contentClass=${JSON.stringify(a.content_class)}`,
        a.toc_class && `tocClass=${JSON.stringify(a.toc_class)}`,
      ].filter(Boolean);
      if (a.toc_extra) unconverted.push(`${lineOf(m.index)}: page_body(toc_extra=…) needs a "toc-extra" slot`);
      open.push('PageBody');
      out += `<PageBody ${attrs.join(' ')}>\n`;
      continue;
    }
    if (macro === 'section') {
      const [sid, label] = positional(argText);
      const a = args(argText);
      const section = { id: sid, label };
      if (a.heading === 'false') section.heading = false;
      else if (a.heading !== undefined) section.heading = a.heading;
      if (a.tag) section.tag = a.tag;
      sections.push(section);
      open.push('Section');
      out += `<Section {...S${key(sid)}}>\n`;
      continue;
    }
    if (macro === 'code') {
      const close = /\{%-?\s*endcall\s*-?%\}/g;
      close.lastIndex = TAG.lastIndex;
      const end = close.exec(src);
      if (!end) throw new Error(`${source}:${lineOf(m.index)}: code() without endcall`);
      const body = src.slice(TAG.lastIndex, end.index);
      const a = args(argText);
      const attrs = [
        a.check === 'false' && 'check={false}',
        a.reason && `reason=${JSON.stringify(a.reason)}`,
      ].filter(Boolean);
      out += `<Code ${attrs.join(' ')}${attrs.length ? ' ' : ''}code={\`\n${literal(body.trim())}\n\`} />`;
      cursor = TAG.lastIndex = close.lastIndex;
      continue;
    }
    unconverted.push(`${lineOf(m.index)}: {% call ${macro}(…) %}`);
    out += `{/* TODO: ${stmt} */}`;
    open.push(null);
    continue;
  }

  if (stmt === 'endcall') {
    const tag = open.pop();
    out += tag ? `</${tag}>` : '{/* TODO: endcall */}';
    continue;
  }

  unconverted.push(`${lineOf(m.index)}: {% ${stmt} %}`);
  out += `{/* TODO: ${stmt} */}`;
}
out = outsideCode(out + src.slice(cursor), attributeExpressions);

const usesRoute = /\{route\(/.test(out);
const frontmatter = [
  'import DocsLayout from "../layouts/DocsLayout.astro";',
  'import PageBody from "../components/PageBody.astro";',
  'import Section from "../components/Section.astro";',
  'import Code from "../components/Code.astro";',
  'import { defineSections } from "../lib/sections";',
  usesRoute ? 'import { route } from "../lib/catalogue";' : null,
  '',
  `const S = defineSections([\n${sections.map((s) => `  ${meta(s)},`).join('\n')}\n]);`,
].filter((l) => l !== null);

const target = `docs/src/pages/${basename}.astro`;
writeFileSync(
  target,
  `---\n${frontmatter.join('\n')}\n---\n<DocsLayout page=${JSON.stringify(id)}>\n${out.trim()}\n</DocsLayout>\n`
);

console.error(`${source} -> ${target}`);
if (unconverted.length) {
  console.error(`${unconverted.length} thing(s) left for a human, marked TODO:`);
  for (const u of unconverted) console.error(`  ${source}:${u}`);
  process.exitCode = 1;
}
