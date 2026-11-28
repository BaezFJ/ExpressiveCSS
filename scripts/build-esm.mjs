import { readdirSync } from 'node:fs';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

// The named entries plus one internal entry per module in a subfolder of `root`.
function entries(root, named) {
  const entryPoints = { ...named };
  for (const relative of readdirSync(root, { recursive: true }).sort()) {
    const file = relative.replaceAll('\\', '/');
    if (file.endsWith('.ts') && file.includes('/')) {
      entryPoints[`internal/${file.slice(0, -3)}`] = `${root}/${file}`;
    }
  }
  return entryPoints;
}
const shared = { bundle: true, splitting: true, format: 'esm', target: 'es2020',
  outExtension: { '.js': '.mjs' }, chunkNames: 'chunks/[name]-[hash]', sourcemap: true };
export const esmOptions = { ...shared, outdir: 'dist/js',
  entryPoints: entries('src/ts', { expressive: 'src/ts/index.ts', modular: 'src/ts/modular.ts', core: 'src/ts/core.ts' }) };
// Extras imports core through the package subpath and never bundles it.
export const extrasEsmOptions = { ...shared, outdir: 'extras/dist/js', external: ['@expressivecss/expressive/core'],
  entryPoints: entries('extras/src/ts', { extras: 'extras/src/ts/index.ts', modular: 'extras/src/ts/modular.ts' }) };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await Promise.all([build(esmOptions), build(extrasEsmOptions)]);
}
