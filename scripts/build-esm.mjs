import { readdirSync } from 'node:fs';
import { build } from 'esbuild';

const entryPoints = { expressive: 'src/ts/index.ts', modular: 'src/ts/modular.ts' };
for (const relative of readdirSync('src/ts', { recursive: true }).sort()) {
  const file = relative.replaceAll('\\', '/');
  if (file.endsWith('.ts') && file.includes('/')) {
    entryPoints[`internal/${file.slice(0, -3)}`] = `src/ts/${file}`;
  }
}
await build({ entryPoints, bundle: true, splitting: true, format: 'esm', target: 'es2020',
  outdir: 'dist/js', outExtension: { '.js': '.mjs' }, chunkNames: 'chunks/[name]-[hash]', sourcemap: true });
