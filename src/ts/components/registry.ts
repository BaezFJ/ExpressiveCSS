import { InitElements, MElement } from '../core/component';
import * as Components from './index';

/**
 * The components `AutoInit()` starts, in initialization order, with the
 * selector each one claims.
 *
 * This table is the single source of truth: the options type below and the
 * init calls in `AutoInit()` are both derived from it, so wiring up a new
 * auto-initialized component means adding one line here (plus its export in
 * ./index.ts) - not four hand-synchronized edits that fail silently when one
 * is forgotten.
 *
 * A component that should only ever be constructed explicitly (Toast,
 * CharacterCounter, Range, ...) simply stays out of this table.
 */
export const AUTO_INIT_COMPONENTS = {
  Autocomplete: { component: Components.Autocomplete, selector: '.autocomplete' },
  Cards: { component: Components.Cards, selector: '.cards' },
  Carousel: { component: Components.Carousel, selector: '.carousel' },
  Chips: { component: Components.Chips, selector: '.chips' },
  Collapsible: { component: Components.Collapsible, selector: '.collapsible' },
  Datepicker: { component: Components.Datepicker, selector: '.datepicker' },
  Dropdown: { component: Components.Dropdown, selector: '.dropdown-trigger' },
  Lightbox: { component: Components.Lightbox, selector: '.lightboxed' },
  Modal: { component: Components.Modal, selector: '.modal' },
  Parallax: { component: Components.Parallax, selector: '.parallax' },
  Pushpin: { component: Components.Pushpin, selector: '.pushpin' },
  ScrollSpy: { component: Components.ScrollSpy, selector: '.scrollspy' },
  FormSelect: { component: Components.FormSelect, selector: 'select' },
  Sidenav: { component: Components.Sidenav, selector: '.sidenav' },
  Tabs: { component: Components.Tabs, selector: '.tabs' },
  TapTarget: { component: Components.TapTarget, selector: '.tap-target' },
  Timepicker: { component: Components.Timepicker, selector: '.timepicker' },
  Tooltip: { component: Components.Tooltip, selector: '.tooltipped' },
  FloatingActionButton: {
    component: Components.FloatingActionButton,
    selector: '.fixed-action-btn'
  }
};

type Registry = typeof AUTO_INIT_COMPONENTS;

/**
 * Per-component options accepted by {@link AutoInit}, derived from the table
 * above - each key takes that component's own options type.
 */
export type AutoInitOptions = {
  [K in keyof Registry]?: Partial<InstanceType<Registry[K]['component']>['options']>;
};

/** The shape every entry in the table satisfies; see the cast in AutoInit. */
type AutoInitable = {
  init(els: InitElements<MElement>, options: Partial<object>): unknown;
};

/**
 * Automatically initialize components.
 * @param context Root element to initialize. Defaults to `document.body`.
 * @param options Options for each component.
 */
export function AutoInit(
  context: HTMLElement = document.body,
  options?: Partial<AutoInitOptions>
) {
  for (const name of Object.keys(AUTO_INIT_COMPONENTS) as (keyof Registry)[]) {
    const { component, selector } = AUTO_INIT_COMPONENTS[name];
    const els = context.querySelectorAll(`${selector}:not(.no-autoinit)`);
    // Each component's static `init` is overloaded; indexing the table widens
    // it to a union TypeScript cannot call, so narrow it once, here.
    (component as unknown as AutoInitable).init(els, options?.[name] ?? {});
  }
}
