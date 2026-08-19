// Public entry point of the bundle.
//
// Layout:
//   core/        Component base class, Utils, shared types
//   components/  per-element widgets (+ index.ts barrel, registry.ts)
//   behaviors/   document-level enhancers, started below at import time
//   plugins/     helpers that are not Components
//
// See src/ts/README.md before adding anything.

import { Utils } from './core/utils';
import { Cards } from './components/cards';
import { Chips } from './components/chips';
import { Range } from './components/range';
import { Dialogs } from './behaviors/dialogs';
import { BottomSheets } from './behaviors/bottomSheets';
import { SideSheets } from './behaviors/sideSheets';
import { Forms } from './behaviors/forms';
import { Waves } from './behaviors/waves';

export * from './components';
export { Dialogs } from './behaviors/dialogs';
export { BottomSheets } from './behaviors/bottomSheets';
export { SideSheets } from './behaviors/sideSheets';
export { Forms } from './behaviors/forms';
export { Waves } from './behaviors/waves';
export { AutoInit } from './components/registry';
export type { AutoInitOptions } from './components/registry';

export const version = '0.5.0';

// Side effects: importing the bundle wires up the document-level behaviors and
// the delegated listeners the components below rely on. Order is preserved from
// the original bundle - do not reorder without checking the event handlers.

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', Utils.docHandleKeydown, true);
  document.addEventListener('keyup', Utils.docHandleKeyup, true);
  document.addEventListener('focus', Utils.docHandleFocus, true);
  document.addEventListener('blur', Utils.docHandleBlur, true);
}
Forms.Init();
Chips.Init();
Waves.Init();
Range.Init();
Cards.Init();
Dialogs.Init();
BottomSheets.Init();
SideSheets.Init();
