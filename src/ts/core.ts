// The `@expressivecss/expressive/core` entry: the extension API that
// @expressivecss/extras builds its components on. It is built with the other
// ESM entries, so these are the same classes and the same AutoInit table the
// main bundle uses. The IIFE exposes it as `Expressive.core`.
//
// Exports only what extension modules import. Add a name when an extras
// module needs it, not before.

export { AutoInit } from './components/registry';
export { Component, defined } from './core/component';
export type { BaseOptions, InitElement, InitElements } from './core/component';
export { formAssociated, unwrapControl, wrapInControl } from './core/formControl';
export type { FormControl } from './core/formControl';
export {
  Utils,
  afterAnyFormReset,
  afterFormReset,
  controllerFor,
  deepActiveElement,
  formEventScope,
  isRtl,
  logicalKey,
  numberValue,
  restoreAttribute,
  setActiveDescendant,
  svgNode,
  toggleIdRef,
} from './core/utils';
