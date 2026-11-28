// Resolves `@expressivecss/expressive/core`, the one specifier the extras ESM
// build leaves external, to this checkout's dist/js/core.mjs, where an installed
// peer dependency would put it. Node cannot find it otherwise: extras/ is its own
// package scope, so self-reference does not apply. Import this module before
// importing anything from extras/dist.
import { registerHooks } from 'node:module';

const core = new URL('../dist/js/core.mjs', import.meta.url).href;
registerHooks({
  resolve: (specifier, context, next) =>
    specifier === '@expressivecss/expressive/core' ? { url: core, shortCircuit: true } : next(specifier, context),
});
