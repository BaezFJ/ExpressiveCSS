// The @expressivecss/extras entry. Load it after the core package: it adds the
// extras components to core's AutoInit and starts the extras document
// behaviors, as core's index.ts does for its own. The IIFE build exposes these
// exports as `ExpressiveExtras`.
//
// Import core only through `@expressivecss/expressive/core`, and public core
// components (such as Menu) through `@expressivecss/expressive/modular`. Every
// extras build leaves both specifiers external, so extras shares core's
// Component, AutoInit and component classes instead of carrying a copy.

import { AutoInit } from '@expressivecss/expressive/core';
import * as Components from './modular';
import { AUTO_INIT } from './components/registry';

export * from './modular';

/** Document behaviors started at import, one line each, in start order. */
const BEHAVIORS: { Init(): void }[] = [Components.ImageCompare, Components.Tour, Components.TransferList, Components.DropZone];

for (const [name, entry] of Object.entries(AUTO_INIT)) AutoInit.register(name, entry);
for (const behavior of BEHAVIORS) behavior.Init();
