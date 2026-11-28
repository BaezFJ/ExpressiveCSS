// Resolves `@expressivecss/expressive/core` and `/modular`, the specifiers the
// extras ESM build leaves external, to this checkout's dist/js/core.mjs and
// modular.mjs, where an installed peer dependency would put them. Both share
// chunks with dist/js/expressive.mjs, so extras sees core's own classes.
// Node cannot find them otherwise: extras/ is its own package scope, so
// self-reference does not apply. Import this module before importing anything
// from extras/dist.
import { registerHooks } from 'node:module';

const urls = {
  '@expressivecss/expressive/core': new URL('../dist/js/core.mjs', import.meta.url).href,
  '@expressivecss/expressive/modular': new URL('../dist/js/modular.mjs', import.meta.url).href,
};
registerHooks({
  resolve: (specifier, context, next) =>
    Object.hasOwn(urls, specifier) ? { url: urls[specifier], shortCircuit: true } : next(specifier, context),
});
