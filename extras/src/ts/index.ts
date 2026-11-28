// The @expressivecss/extras entry. Load it after the core package: it adds the
// extras components to core's AutoInit and starts the extras document
// behaviors, as core's index.ts does for its own. The IIFE build exposes these
// exports as `ExpressiveExtras`.
//
// Import core only through `@expressivecss/expressive/core`. Every extras build
// leaves that specifier external, so extras shares core's Component and AutoInit
// instead of carrying a copy.

import { AutoInit } from '@expressivecss/expressive/core';

export * from './modular';

/** Auto-initialized components, one line each: `Name: { component, selector }`. */
const AUTO_INIT: Record<string, Parameters<typeof AutoInit.register>[1]> = {};

/** Document behaviors started at import, one line each, in start order. */
const BEHAVIORS: { Init(): void }[] = [];

for (const [name, entry] of Object.entries(AUTO_INIT)) AutoInit.register(name, entry);
for (const behavior of BEHAVIORS) behavior.Init();
