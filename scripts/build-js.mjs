import { build, context } from 'esbuild';
import { esmOptions } from './build-esm.mjs';

const watch = process.argv.includes('--watch');
const common = { entryPoints: ['src/ts/index.ts'], bundle: true, target: 'es2020', sourcemap: true };
const outputs = [
  esmOptions,
  { ...common, format: 'cjs', outfile: 'dist/js/expressive.cjs' },
  { ...common, format: 'iife', globalName: 'Expressive', outfile: 'dist/js/expressive.js' },
  { ...common, format: 'iife', globalName: 'Expressive', outfile: 'dist/js/expressive.min.js', minify: true }
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
