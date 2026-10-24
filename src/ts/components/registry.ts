import { InitElements, InitElement } from "../core/component";
import * as Components from "./index";
import { CARDS_SELECTOR, isCardReveal } from "./cards";
import { EXPANDING_CARD_SELECTOR } from "./expandingCard";

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
 * CharacterCounter, ...) simply stays out of this table.
 */
export const AUTO_INIT_COMPONENTS = {
  AppBar: {
    component: Components.AppBar,
    selector:
      "header.medium, header.large, header:has(> :is(nav:not(.tabs, .navigation-bar, .navigation-rail), .bar) > .search-bar)",
  },
  Autocomplete: {
    component: Components.Autocomplete,
    selector: ".autocomplete",
  },
  ButtonGroup: {
    component: Components.ButtonGroup,
    selector: ".button-group",
  },
  // Shared with Cards.Init() - see CARDS_SELECTOR. This entry used to read
  // '.cards', which no card markup uses.
  Cards: { component: Components.Cards, selector: CARDS_SELECTOR, filter: isCardReveal },
  ExpandingCard: {
    component: Components.ExpandingCard,
    selector: EXPANDING_CARD_SELECTOR,
  },
  Carousel: { component: Components.Carousel, selector: ".carousel" },
  Chips: { component: Components.Chips, selector: ".chips" },
  Confetti: { component: Components.Confetti, selector: ".confetti" },
  Particles: { component: Components.Particles, selector: "canvas.particles" },
  Keypad: { component: Components.Keypad, selector: ".keypad, .keyboard" },
  ColorPicker: { component: Components.ColorPicker, selector: ".color-picker" },
  ColumnChart: { component: Components.ColumnChart, selector: ".column-chart" },
  BarChart: { component: Components.BarChart, selector: ".bar-chart" },
  PieChart: { component: Components.PieChart, selector: ".pie-chart" },
  HeatmapChart: { component: Components.HeatmapChart, selector: ".heatmap-chart" },
  RadarChart: { component: Components.RadarChart, selector: ".radar-chart" },
  RadialChart: { component: Components.RadialChart, selector: ".radial-chart" },
  MixedChart: { component: Components.MixedChart, selector: ".mixed-chart" },
  ScatterChart: { component: Components.ScatterChart, selector: ".scatter-chart" },
  CommandPalette: {
    component: Components.CommandPalette,
    selector: "dialog.command-palette",
  },
  Questionnaire: {
    component: Components.Questionnaire,
    selector: "form.questionnaire",
  },
  Datepicker: {
    component: Components.Datepicker,
    selector: ".date-picker",
  },
  LineChart: { component: Components.LineChart, selector: ".line-chart" },
  Menu: { component: Components.Menu, selector: ".menu-trigger" },
  MessageScroller: {
    component: Components.MessageScroller,
    selector: ".message-scroller",
  },
  PullToRefresh: { component: Components.PullToRefresh, selector: ".pull-to-refresh" },
  Lightbox: { component: Components.Lightbox, selector: ".lightboxed" },
  ScrollSpy: { component: Components.ScrollSpy, selector: ".scrollspy" },
  FormSelect: { component: Components.FormSelect, selector: "select" },
  NavigationRail: {
    component: Components.NavigationRail,
    selector: ".navigation-rail",
  },
  Tabs: { component: Components.Tabs, selector: ".tabs" },
  Timepicker: {
    component: Components.Timepicker,
    selector: ".time-picker",
  },
  Tooltip: { component: Components.Tooltip, selector: ".tooltipped" },
  FloatingActionButton: {
    component: Components.FloatingActionButton,
    selector: ".fab-menu",
  },
  // After Menu, so the bar's own menu options replace AutoInit's defaults.
  Menubar: { component: Components.Menubar, selector: ".menubar" },
};

type Registry = typeof AUTO_INIT_COMPONENTS;

/**
 * Per-component options accepted by {@link AutoInit}, derived from the table
 * above - each key takes that component's own options type.
 */
export type AutoInitOptions = {
  [K in keyof Registry]?: Partial<
    InstanceType<Registry[K]["component"]>["options"]
  >;
};

/** The shape every entry in the table satisfies; see the cast in AutoInit. */
type AutoInitable = {
  defaults: object;
  getInstance(el: Element): { destroy(): void } | undefined;
  init(els: InitElement | InitElements<InitElement>, options: Partial<object>): unknown;
};

type AutoInitEntry = {
  component: AutoInitable;
  selector: string;
  filter?: (el: Element) => boolean;
};

/**
 * Options markup cannot set: `allowUnsafeHTML` turns off HTML escaping,
 * `minYear` and `maxYear` are internal, and Chips and Autocomplete throw
 * part way through their constructors on `data` entries of the wrong shape.
 */
const MARKUP_BLOCKED = new Set(["allowUnsafeHTML", "minYear", "maxYear", "data"]);
const OBJECT = "[object Object]";
const ARRAY = "[object Array]";
/** The default kinds markup can replace with a value of the same kind. */
const SETTABLE = new Set(["[object String]", "[object Number]", "[object Boolean]", ARRAY, OBJECT]);

/** The attribute a component reads its markup options from: `FormSelect` reads `data-form-select-options`. */
const optionsAttribute = (name: string) => `data-${name.replace(/\B[A-Z]/g, "-$&").toLowerCase()}-options`;

/** A value's kind as its `toString` tag, with objects that are not plain counted apart. */
function kind(value: unknown) {
  const tag = Object.prototype.toString.call(value);
  return tag === OBJECT && Object.getPrototypeOf(value) !== Object.prototype ? "other" : tag;
}

/** Whether every item has the kind of the default array's first item, when it has one. */
const itemsMatch = (fallback: unknown[], value: unknown[]) =>
  !fallback.length || value.every((item) => kind(item) === kind(fallback[0]));

/** Whether a markup value may replace `fallback`: both are the same settable kind. */
function sameKind(fallback: unknown, value: unknown) {
  const type = kind(fallback);
  if (!SETTABLE.has(type) || kind(value) !== type) return false;
  return type !== ARRAY || itemsMatch(fallback as unknown[], value as unknown[]);
}

const accepts = (defaults: object, key: string, value: unknown) =>
  Object.hasOwn(defaults, key) && !MARKUP_BLOCKED.has(key) && sameKind(defaults[key], value);

/** Records a rejected key; returns undefined so the key is left out. */
const reject = (rejected: string[], key: string) => void rejected.push(key);

/**
 * A plain object filtered against its default object, or undefined once any
 * key inside it is rejected, so the whole option keeps its default. Other
 * values pass through.
 */
function nested(value: unknown, fallback: object, rejected: string[], path: string) {
  if (kind(value) !== OBJECT) return value;
  const count = rejected.length;
  const picked = pick(value as object, fallback, rejected, path);
  return rejected.length === count ? picked : undefined;
}

/**
 * Copies the entries of `parsed` that `defaults` owns and that keep their
 * default's kind. Only own keys of `defaults` are copied, so `__proto__` never
 * is. Rejected keys go into `rejected`, dotted below the top level.
 */
function pick(parsed: object, defaults: object, rejected: string[], path = ""): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    const kept = accepts(defaults, key, value) ? nested(value, defaults[key], rejected, `${path}${key}.`) : reject(rejected, path + key);
    if (kept !== undefined) picked[key] = kept;
  }
  return picked;
}

/** `text` parsed as a JSON object, or null. */
function parseObject(text: string): object | null {
  try {
    const value: unknown = JSON.parse(text);
    return kind(value) === OBJECT ? (value as object) : null;
  } catch {
    return null;
  }
}

/**
 * The options an element sets for component `name` in its
 * `data-<name>-options` attribute. The attribute is untrusted: a value that is
 * not valid JSON, not an object, or not the kind of its default is dropped
 * with a warning, so that option keeps its default.
 */
function markupOptions(el: Element, name: string, defaults: object) {
  const attribute = optionsAttribute(name);
  const text = el.getAttribute(attribute);
  if (text === null) return {};
  const parsed = parseObject(text);
  if (!parsed) {
    console.warn(`${name} ignored ${attribute}: expected a JSON object.`, el);
    return {};
  }
  const rejected: string[] = [];
  const options = pick(parsed, defaults, rejected);
  rejected.forEach((key) => console.warn(`${name} ignored "${key}" in ${attribute}: markup cannot set that option to that value.`, el));
  return options;
}

// Each component's static `init` is overloaded; indexing the table widens it
// to a union TypeScript cannot call, so narrow it once, here.
const entry = (name: keyof Registry) => AUTO_INIT_COMPONENTS[name] as unknown as AutoInitEntry;
const NAMES = Object.keys(AUTO_INIT_COMPONENTS) as (keyof Registry)[];

/** Starts component `name` on one element, with its markup options under `options`. */
function initElement(name: keyof Registry, el: Element, options: object = {}) {
  const { component } = entry(name);
  component.init(el, { ...markupOptions(el, name, component.defaults), ...options });
}

/**
 * The elements under `root` that component `name` claims, plus `root` itself
 * when `self` is set. `:is()` so that `:not(.no-autoinit)` applies to the
 * whole selector: a bare `${selector}:not(...)` binds the negation to the last
 * alternative only, which would break the opt-out for any comma-separated
 * entry (Cards is the first).
 */
function claimed(name: keyof Registry, root: ParentNode, self = false): Element[] {
  const { selector, filter = () => true } = entry(name);
  const query = `:is(${selector}):not(.no-autoinit)`;
  const own = self && (root as Element).matches(query) ? [root as Element] : [];
  return [...own, ...root.querySelectorAll(query)].filter(filter);
}

/** Starts the components an added element and its descendants claim, leaving existing instances alone. */
function startAdded(node: Node, options?: Partial<AutoInitOptions>) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  for (const name of NAMES) {
    claimed(name, node as Element, true).forEach((el) => entry(name).component.getInstance(el) || initElement(name, el, options?.[name]));
  }
}

/**
 * Destroys the instances of a removed element and its descendants that
 * AutoInit would claim. An element that is back in the page by now was moved,
 * and keeps its instances.
 */
function stopRemoved(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE || node.isConnected) return;
  for (const name of NAMES) {
    claimed(name, node as Element, true).forEach((el) => entry(name).component.getInstance(el)?.destroy());
  }
}

/** Watches `context`, starting components in added markup and destroying them in removed markup. */
function watch(context: Node, options?: Partial<AutoInitOptions>) {
  const handle = (records: MutationRecord[]) => {
    for (const { addedNodes, removedNodes } of records) {
      removedNodes.forEach(stopRemoved);
      addedNodes.forEach((node) => context.contains(node) && startAdded(node, options));
    }
  };
  const observer = new MutationObserver(handle);
  observer.observe(context, { childList: true, subtree: true });
  // Handle the changes not delivered yet first, so markup added just before stop() still starts.
  return () => {
    handle(observer.takeRecords());
    observer.disconnect();
  };
}

/**
 * Automatically initialize components.
 * @param context Root element or shadow root to initialize. Defaults to
 * `document.body`. Shadow roots inside it are not entered.
 * @param options Options for each component.
 * @param settings With `watch: true`, keep starting components in markup
 * added to `context` later, and destroy them when their markup is removed.
 * @returns A function that stops watching. It does nothing without `watch`.
 */
export function AutoInit(
  context: HTMLElement | ShadowRoot = document.body,
  options?: Partial<AutoInitOptions>,
  settings: { watch?: boolean } = {},
): () => void {
  for (const name of NAMES) {
    claimed(name, context).forEach((el) => initElement(name, el, options?.[name]));
  }
  return settings.watch ? watch(context, options) : () => {};
}
