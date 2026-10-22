import { Utils } from './utils';

/**
 * Base options for component initialization.
 */
export interface BaseOptions {}

export type InitElement = HTMLElement | Element;
export type InitElements<T extends InitElement> = NodeListOf<T> | HTMLCollectionOf<T>;
/** Any component class; `init` reads its element, options and instance types. */
type ComponentClass = new (el: never, options: never) => Component<BaseOptions>;
/** The element a component class is constructed on. */
type ElementOf<C extends ComponentClass> = C extends new (el: infer E, options: never) => unknown ? E : never;
/** The options `init` accepts for a component class. */
type InitOptions<C extends ComponentClass> = Partial<InstanceType<C>['options']>;

export interface I18nOptions {
  cancel: string;
  clear: string;
  done: string;
}

/** What {@link Component._notify} passes on, and when it stops. */
export interface NotifyOptions {
  args?: unknown[];
  detail?: unknown;
  current?: () => boolean;
}

/**
 * Base class implementation for Expressive components.
 */
export class Component<O extends BaseOptions> {
  /**
   * The DOM element the plugin was initialized with.
   */
  el: HTMLElement;
  /**
   * The options the instance was initialized with.
   */
  options: O;

  /**
   * Destroys any instance already on `el`, then spreads `options` over the
   * class defaults. A subclass deep-merges nested options such as `i18n`
   * after `super()`, and passes options it reads from markup in `options`.
   */
  constructor(el: HTMLElement, options: Partial<O>) {
    // Display error if el is not a valid HTML Element
    if (!(el instanceof HTMLElement)) {
      console.error(Error(el + ' is not an HTML Element'));
    }
    new.target.getInstance(el)?.destroy();
    this.el = el;
    this.options = { ...new.target.defaults, ...options } as O;
  }

  /**
   * Initializes an instance of the class it is called on.
   * @param el HTML element.
   * @param options Component options.
   */
  static init<C extends ComponentClass>(this: C, el: ElementOf<C>, options?: InitOptions<C>): InstanceType<C>;
  /**
   * Initializes an instance of the class it is called on for each element.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init<C extends ComponentClass>(
    this: C,
    els: InitElements<InitElement>,
    options?: InitOptions<C>
  ): InstanceType<C>[];
  static init<C extends ComponentClass>(
    this: C,
    els: ElementOf<C> | InitElements<InitElement>,
    options: InitOptions<C> = {}
  ): InstanceType<C> | InstanceType<C>[] {
    const create = (el: unknown) => new this(el as never, options as never) as InstanceType<C>;
    if (els instanceof Element) return create(els);
    return els ? Array.from(els as InitElements<InitElement>, create) : null;
  }

  /**
   * @returns default options for component instance.
   */
  static get defaults(): BaseOptions {
    return {};
  }

  /**
   * Retrieves component instance for the given element.
   * @param el Associated HTML Element.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getInstance(el: HTMLElement): Component<BaseOptions> {
    throw new Error('This method must be implemented.');
  }

  /**
   * Runs an `on…` option callback, then fires `expressive:<type>` from the
   * element, so pages can listen instead of passing options. The callback gets
   * `args` (the element by default) and the event carries `detail`.
   *
   * A callback or listener may close, reopen or destroy the component. Pass
   * `current` to tell whether the state `type` names still holds; the event
   * is skipped once it does not, or once the instance is destroyed, and the
   * result says whether to carry on.
   */
  protected _notify(
    type: string,
    callback?: Function | null,
    { args = [this.el], detail, current = () => true }: NotifyOptions = {}
  ): boolean {
    const live = () => (this.constructor as typeof Component).getInstance(this.el) === this && current();
    if (typeof callback === 'function') callback.apply(this, args);
    if (!live()) return false;
    Utils.emit(this.el, type, detail);
    return live();
  }

  /**
   * Destroy plugin instance and teardown.
   */
  destroy(): void {
    throw new Error('This method must be implemented.');
  }
}
