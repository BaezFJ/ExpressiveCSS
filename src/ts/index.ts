// Public entry point of the bundle.
//
// Layout:
//   core/        Component base class, Utils, shared types
//   components/  per-element widgets (+ index.ts barrel, registry.ts)
//   behaviors/   document-level enhancers, started below at import time
//   plugins/     helpers that are not Components
//
// See src/ts/README.md before adding anything.

import { Cards } from "./components/cards";
import { ExpandingCard } from "./components/expandingCard";
import { Chips } from "./components/chips";
import { Slider } from "./components/slider";
import { Dialogs } from "./behaviors/dialogs";
import { BottomSheets } from "./behaviors/bottomSheets";
import { SideSheets } from "./behaviors/sideSheets";
import { Forms } from "./behaviors/forms";

export * from "./components";
export { Dialogs } from "./behaviors/dialogs";
export { BottomSheets } from "./behaviors/bottomSheets";
export { SideSheets } from "./behaviors/sideSheets";
export { Forms } from "./behaviors/forms";
export { AutoInit } from "./components/registry";
export type { AutoInitOptions } from "./components/registry";

export const version = "0.8.0";

// Side effects: importing the bundle wires up the document-level behaviors.
// Order is preserved from the original bundle - do not reorder without checking
// the event handlers.
//
// Four capture-phase document listeners used to be registered here as well, to
// track whether focus arrived by keyboard and stamp a class on <body> for the
// Sass to read. `:focus-visible` answers the same question natively, so they
// are gone and every reader asks the browser instead.

Forms.Init();
Chips.Init();
Slider.Init();
Cards.Init();
ExpandingCard.Init();
Dialogs.Init();
BottomSheets.Init();
SideSheets.Init();
