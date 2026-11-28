import { build, context } from 'esbuild';
import { esmOptions, extrasEsmOptions } from './build-esm.mjs';

const watch = process.argv.includes('--watch');
const common = { entryPoints: ['src/ts/index.ts'], bundle: true, target: 'es2020', sourcemap: true };
// src/ts/iife.ts adds `core` for extensions: the IIFE global and the CommonJS
// bundle both carry it, since neither can share a separate core entry's state.
const withCore = { ...common, entryPoints: ['src/ts/iife.ts'] };
const iife = { ...withCore, format: 'iife', globalName: 'Expressive' };
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
// The extras CommonJS bundle requires core's CommonJS bundle the same way:
// `/core` is its `core` export and `/modular` the bundle itself.
const coreRequire = {
  name: 'expressive-core-require',
  setup(builder) {
    builder.onResolve({ filter: /^@expressivecss\/expressive\/(core|modular)$/ }, ({ path }) => ({ path, namespace: 'expressive-core-require' }));
    builder.onLoad({ filter: /.*/, namespace: 'expressive-core-require' }, ({ path }) => ({
      contents: `const expressive = require('@expressivecss/expressive');\nif (!expressive.core) throw new Error('@expressivecss/extras needs @expressivecss/expressive 0.21.0 or later.');\nmodule.exports = expressive${path.endsWith('/core') ? '.core' : ''};`,
    }));
  },
};
const extrasCjs = { entryPoints: ['extras/src/ts/index.ts'], bundle: true, target: 'es2020', sourcemap: true,
  format: 'cjs', external: ['@expressivecss/expressive'], plugins: [coreRequire], outfile: 'extras/dist/js/extras.cjs' };
const extrasIife = { entryPoints: ['extras/src/ts/index.ts'], bundle: true, target: 'es2020', sourcemap: true,
  format: 'iife', globalName: 'ExpressiveExtras', plugins: [coreGlobal] };
const outputs = [
  esmOptions,
  { ...withCore, format: 'cjs', outfile: 'dist/js/expressive.cjs' },
  { ...iife, outfile: 'dist/js/expressive.js' },
  { ...iife, outfile: 'dist/js/expressive.min.js', minify: true },
  extrasEsmOptions,
  extrasCjs,
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
