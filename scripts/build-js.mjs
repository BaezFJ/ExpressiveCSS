import { build, context } from 'esbuild';
import { esmOptions, extrasEsmOptions } from './build-esm.mjs';

const watch = process.argv.includes('--watch');
const common = { entryPoints: ['src/ts/index.ts'], bundle: true, target: 'es2020', sourcemap: true };
// src/ts/iife.ts adds `core` to the global, for script-tag extensions.
const iife = { ...common, entryPoints: ['src/ts/iife.ts'], format: 'iife', globalName: 'Expressive' };
// The extras IIFE reads core from the global the core script defined, rather than
// bundling a copy: `/core` is `Expressive.core`, and `/modular` (the public
// components) is `Expressive` itself.
const coreGlobal = {
  name: 'expressive-core-global',
  setup(builder) {
    builder.onResolve({ filter: /^@expressivecss\/expressive\/(core|modular)$/ }, ({ path }) => ({ path, namespace: 'expressive-core-global' }));
    builder.onLoad({ filter: /.*/, namespace: 'expressive-core-global' }, ({ path }) => ({
      contents: `if (!globalThis.Expressive?.core) throw new Error('Load expressive.js before extras.js.');\nmodule.exports = globalThis.Expressive${path.endsWith('/core') ? '.core' : ''};`,
    }));
  },
};
const extrasIife = { entryPoints: ['extras/src/ts/index.ts'], bundle: true, target: 'es2020', sourcemap: true,
  format: 'iife', globalName: 'ExpressiveExtras', plugins: [coreGlobal] };
const outputs = [
  esmOptions,
  { ...common, format: 'cjs', outfile: 'dist/js/expressive.cjs' },
  { ...iife, outfile: 'dist/js/expressive.js' },
  { ...iife, outfile: 'dist/js/expressive.min.js', minify: true },
  extrasEsmOptions,
  { ...extrasIife, outfile: 'extras/dist/js/extras.js' },
  { ...extrasIife, outfile: 'extras/dist/js/extras.min.js', minify: true },
];
if (watch) {
  const contexts = await Promise.all(outputs.map(options => context({ ...options, logLevel: 'info' })));
  await Promise.all(contexts.map(instance => instance.watch()));
  const dispose = async () => { await Promise.all(contexts.map(instance => instance.dispose())); process.exit(0); };
  process.once('SIGINT', dispose);
  process.once('SIGTERM', dispose);
} else {
  await Promise.all(outputs.map(options => build(options)));
}
