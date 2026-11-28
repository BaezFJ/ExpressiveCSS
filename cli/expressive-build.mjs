#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { collectUsage, selectedStyles } from './usage.mjs';
import { assetManifest, bundle, bundleCSS, bundleJS, generatedBanner } from './bundle.mjs';

const framework = fileURLToPath(new URL('..', import.meta.url));
const usage = `Usage: expressive-build [files or directories...] [options]

  --entry <file>      Bundle a browser JS/TS entry into js/app.js and imported CSS into css/app.css.
  --out-dir <path>    Write assets here (default: public/expressive).
  --include <name>    Keep a literal class, public JS API's styles, or components/<partial>.
                      Repeat for names supplied by a CMS or constructed at runtime.
  --check             Compare the expected files without writing; exit 1 if stale.
  --help              Show this help.

Scans the current directory by default. CSS is written to css/expressive.css,
with licensed fonts in fonts/. When @expressivecss/extras is installed, its used
styles are written to css/extras.css. JavaScript bundling requires esbuild as a dev dependency.`;

const options = {
  entry: { type: 'string' }, 'out-dir': { type: 'string', default: 'public/expressive' },
  include: { type: 'string', multiple: true, default: [] }, check: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
};
const extensions = new Set('.html .htm .js .mjs .cjs .ts .mts .cts .jsx .tsx .vue .svelte .astro .mdx .php .erb .ejs .hbs .twig .njk .liquid .css .scss'.split(' '));
const ignored = new Set(['node_modules', 'vendor', 'dist', 'build', '_site', 'coverage']);
function isSourceFile(path) {
  return extensions.has(extname(path).toLowerCase()) && !/\.(?:min\.js|min\.css|d\.[cm]?ts)$/i.test(path);
}

function sourcePaths(path, out) {
  const stat = lstatSync(path);
  if (stat.isDirectory()) {
    return readdirSync(path).filter(name => !name.startsWith('.') && !ignored.has(name))
      .map(name => join(path, name)).filter(child => child !== out).flatMap(child => sourcePaths(child, out));
  }
  return stat.isFile() && isSourceFile(path) ? [path] : [];
}

// An output directory can be new, or can sit below a symlinked public directory.
function canonicalOutput(path) {
  try { return realpathSync(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return join(canonicalOutput(dirname(path)), basename(path));
  }
}

function scanFiles(inputs, out) {
  const paths = inputs.map(input => realpathSync(input));
  const overlap = paths.find(path => path === out || path.startsWith(out + sep));
  if (overlap) throw new Error(`Input falls inside the output directory: ${overlap}`);
  const files = new Set(paths.flatMap(path => sourcePaths(path, out)).map(path => realpathSync(path)));
  if (!files.size) throw new Error('No application source files found. Pass a template, source directory or JS entry.');
  return files;
}

function stylesheetClasses(tokens, source) {
  for (const [, name] of source.matchAll(/\.([\w-]+(?:\\:[\w-]+)*)/g)) tokens.add(name.replaceAll('\\:', ':'));
}

function scan(files, bundled) {
  const tokens = new Set();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const mode = bundled?.inputs.has(file) ? 'bundled' : (bundled ? 'used' : 'all');
    collectUsage(tokens, source, file, mode);
    if (/\.s?css$/.test(file)) stylesheetClasses(tokens, source);
  }
  return tokens;
}

function readExisting(path) {
  try { return readFileSync(path); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

function replace(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, content, { flag: 'wx' });
    renameSync(temp, path);
  } finally { rmSync(temp, { force: true }); }
}

const extrasCSS = 'css/extras.css';

function outputs(css, extras, bundledFiles) {
  const files = new Map([
    ...bundledFiles,
    ['css/expressive.css', Buffer.from(css)],
    ...(extras === undefined ? [] : [[extrasCSS, Buffer.from(extras)]]),
    ['LICENSE-ExpressiveCSS', readFileSync(join(framework, 'LICENSE'))],
  ]);
  const fonts = join(framework, 'dist/fonts');
  for (const name of readdirSync(fonts).sort()) files.set(`fonts/${name}`, readFileSync(join(fonts, name)));
  return files;
}

function previousAssets(out, files) {
  const file = readExisting(join(out, assetManifest));
  if (!file) return [];
  let manifest;
  try { manifest = JSON.parse(file); }
  catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  if (manifest?.generatedBy !== 'expressive-build') {
    if (files.has(assetManifest)) throw new Error(`Output would overwrite an existing asset manifest: ${assetManifest}`);
    return [];
  }
  // This generated file can be edited independently of the CLI. Only its own
  // asset names may be considered for cleanup, including when --entry is removed.
  const { assets } = manifest;
  if (!Array.isArray(assets)
    || !assets.every(name => typeof name === 'string' && /^assets\/expressive-[A-Z0-9]{8}(?:\.[^/\\:\x00-\x1f]+)?$/.test(name))) {
    throw new Error(`Invalid generated asset manifest: ${assetManifest}`);
  }
  return [assetManifest, ...assets];
}

function ownsBundle(previous) {
  const start = previous.toString('ascii', 0, 2) === '#!' ? previous.indexOf('\n') + 1 : 0;
  return previous.toString('utf8', start, start + generatedBanner.length) === generatedBanner;
}

function differences(out, files, inputs) {
  const changes = new Map();
  // css/extras.css goes when extras is uninstalled; the output directory is this tool's.
  const names = new Set([...files.keys(), bundleJS, bundleCSS, extrasCSS, ...previousAssets(out, files)]);
  // Keep the old inventory until every referenced asset has been updated or removed.
  if (names.delete(assetManifest)) names.add(assetManifest);
  for (const name of names) {
    const path = join(out, name);
    const previous = readExisting(path);
    const content = files.get(name);
    if (content === undefined && (!previous || ([bundleJS, bundleCSS].includes(name) && !ownsBundle(previous)))) continue;
    if (previous && inputs.has(realpathSync(path))) throw new Error(`Output would overwrite an input file: ${path}`);
    if (content === undefined || !previous?.equals(content)) changes.set(path, content ?? null);
  }
  return changes;
}

function loadStyles(root, name) {
  const path = join(root, 'dist/cli/styles.json');
  if (!existsSync(path)) throw new Error('Missing packaged style index. In a framework checkout, run npm run build first.');
  const index = JSON.parse(readFileSync(path, 'utf8'));
  const sheet = readFileSync(join(root, `dist/css/${name}.min.css`), 'utf8').replace(/^\uFEFF/, '');
  if (index.sha256 !== createHash('sha256').update(sheet).digest('hex')) {
    throw new Error(`The ${name} stylesheet and usage index differ. Rebuild or reinstall ExpressiveCSS.`);
  }
  return { index, sheet };
}

// The application's own @expressivecss/extras, if it installed one.
function installedExtras() {
  try {
    return dirname(realpathSync(createRequire(resolve('package.json')).resolve('@expressivecss/extras/package.json')));
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
  }
}

// A package's APIs count as used when the bundle kept their code, or the whole bundle.
function bundledAPIs(tokens, index, modules, bundles) {
  const whole = bundles.some(name => modules.has(name));
  for (const [name, api] of Object.entries(index.apis)) {
    if (whole || modules.has(api.chunk)) tokens.add(`api:${name}`);
  }
}

// Each package takes the --include partials it has; a partial neither has is a mistake.
function ownIncludes(include, indexes) {
  const has = (index, name) => index.components.some(group => group.name === name.slice(11));
  const unknown = include.find(name => name.startsWith('components/') && !indexes.some(index => has(index, name)));
  if (unknown) throw new Error(`Unknown component partial: ${unknown}`);
  return index => include.filter(name => !name.startsWith('components/') || has(index, name));
}

async function assets({ entry, include }, files, out) {
  const core = loadStyles(framework, 'expressive');
  const extrasRoot = installedExtras();
  const extras = extrasRoot && loadStyles(extrasRoot, 'extras');
  const bundled = entry ? await bundle(resolve(entry), out, framework, extrasRoot) : undefined;
  const sources = new Set([...files, ...(bundled?.sources ?? [])]);
  const tokens = scan(sources, bundled);
  if (bundled) {
    const js = bundled.files.get(bundleJS).toString();
    collectUsage(tokens, js, bundleJS, 'bundled');
    bundledAPIs(tokens, core.index, bundled.modules, ['expressive.cjs', 'expressive.js', 'expressive.min.js']);
    if (extras) bundledAPIs(tokens, extras.index, bundled.extrasModules, ['extras.cjs', 'extras.js', 'extras.min.js']);
    const appCSS = bundled.files.get(bundleCSS);
    if (appCSS) stylesheetClasses(tokens, appCSS.toString());
  }
  const includes = ownIncludes(include, [core.index, ...(extras ? [extras.index] : [])]);
  // Extras first: markup its components build through core (Menubar's menus) adds core tokens.
  const added = extras && selectedStyles(extras.index, extras.sheet, tokens, includes(extras.index));
  const { css, names } = selectedStyles(core.index, core.sheet, tokens, includes(core.index));
  console.log(`Scanned ${sources.size} source files. Components: ${names.join(', ')}.`);
  if (added) console.log(`Extras: ${added.names.join(', ') || 'none'}.`);
  return { output: outputs(css, added?.css, bundled?.files ?? []), inputs: new Set([...files, ...(bundled?.inputs ?? [])]) };
}

function sync(out, changes, check) {
  if (!changes.size) return console.log(`Up to date: ${relative('.', out)}`);
  if (check) {
    const stale = Array.from(changes.keys(), path => relative(out, path));
    throw new Error(`Stale output in ${relative('.', out)}: ${stale.join(', ')}. Run expressive-build without --check.`);
  }
  changes.forEach((content, path) => {
    if (content === null) rmSync(path, { force: true });
    else replace(path, content);
  });
  console.log(`Built: ${relative('.', out)}`);
}

async function main() {
  const { values, positionals } = parseArgs({ options, allowPositionals: true });
  if (values.help) return console.log(usage);
  const out = canonicalOutput(resolve(values['out-dir']));
  const inputs = positionals.length ? positionals : ['.'];
  if (values.entry) inputs.push(values.entry);
  const files = scanFiles(inputs, out);
  const { output, inputs: sourceFiles } = await assets(values, files, out);
  sync(out, differences(out, output, sourceFiles), values.check);
}

main().catch(error => {
  console.error(`expressive-build: ${error.message}`);
  process.exitCode = 1;
});
