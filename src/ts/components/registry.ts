import { InitElements, InitElement } from '../core/component';
import * as Components from './index';
import { CARDS_SELECTOR } from './cards';

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
 * A component that should only ever be constructed explicitly (Snackbar,
 * CharacterCounter, Range, ...) simply stays out of this table.
 */
export const AUTO_INIT_COMPONENTS = {
  Autocomplete: { component: Components.Autocomplete, selector: '.autocomplete' },
  // Shared with Cards.Init() - see CARDS_SELECTOR. This entry used to read
  // '.cards', which no card markup uses.
  Cards: { component: Components.Cards, selector: CARDS_SELECTOR },
  Carousel: { component: Components.Carousel, selector: '.carousel' },
  Chips: { component: Components.Chips, selector: '.chips' },
  Datepicker: { component: Components.Datepicker, selector: '.datepicker, .date-picker' },
  Menu: { component: Components.Menu, selector: '.menu-trigger' },
  Lightbox: { component: Components.Lightbox, selector: '.lightboxed' },
  Parallax: { component: Components.Parallax, selector: '.parallax' },
  ScrollSpy: { component: Components.ScrollSpy, selector: '.scrollspy' },
  FormSelect: { component: Components.FormSelect, selector: 'select' },
  NavigationDrawer: { component: Components.NavigationDrawer, selector: '.sidenav, .navigation-drawer' },
  NavigationRail: { component: Components.NavigationRail, selector: '.navigation-rail' },
  Tabs: { component: Components.Tabs, selector: '.tabs' },
  Timepicker: { component: Components.Timepicker, selector: '.timepicker, .time-picker' },
  Tooltip: { component: Components.Tooltip, selector: '.tooltipped' },
  FloatingActionButton: {
    component: Components.FloatingActionButton,
    selector: '.fab, .fixed-action-btn'
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
  init(els: InitElements<InitElement>, options: Partial<object>): unknown;
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
    // `:is()` so that `:not(.no-autoinit)` applies to the whole selector. A
    // bare `${selector}:not(...)` binds the negation to the last alternative
    // only, which would silently break the opt-out for any comma-separated
    // entry (Cards is the first).
    const els = context.querySelectorAll(`:is(${selector}):not(.no-autoinit)`);
    // Each component's static `init` is overloaded; indexing the table widens
    // it to a union TypeScript cannot call, so narrow it once, here.
    (component as unknown as AutoInitable).init(els, options?.[name] ?? {});
  }
}
