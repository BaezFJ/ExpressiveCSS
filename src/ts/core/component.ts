import { Utils } from './utils';

/**
 * Base options for component initialization.
 */
export interface BaseOptions {}

export type InitElement = HTMLElement | Element;
export type InitElements<T extends InitElement> = NodeListOf<T> | HTMLCollectionOf<T>;
type ComponentConstructor<T extends Component<O>, O extends BaseOptions> = {
  new (el: HTMLElement, options: Partial<O>): T;
};
type ComponentType<C extends Component<O>, O extends BaseOptions> = ComponentConstructor<C, O> &
  typeof Component<O>;

export interface I18nOptions {
  cancel: string;
  clear: string;
  done: string;
}

export interface Openable {
  isOpen: boolean;
  open(): void;
  close(): void;
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
   * Constructs component instance and set everything up.
   */
  constructor(el: HTMLElement, options: Partial<O>, classDef: ComponentType<Component<O>, O>) {
    // Display error if el is not a valid HTML Element
    if (!(el instanceof HTMLElement)) {
      console.error(Error(el + ' is not an HTML Element'));
    }
    // If exists, destroy and reinitialize in child
    classDef.getInstance(el)?.destroy();
    this.el = el;
  }

  /**
   * Initializes component instance.
   * @param el HTML element.
   * @param options Component options.
   * @param classDef Class definition.
   */
  protected static init<I extends HTMLElement, O extends BaseOptions, C extends Component<O>>(
    el: I,
    options: O,
    classDef: ComponentType<C, O>
  ): C;
  /**
   * Initializes component instances.
   * @param els HTML elements.
   * @param options Component options.
   * @param classDef Class definition.
   */
  protected static init<I extends InitElement, O extends BaseOptions, C extends Component<O>>(
    els: InitElements<I>,
    options: Partial<O>,
    classDef: ComponentType<C, O>
  ): C[];
  /**
   * Initializes component instances.
   * @param els HTML elements.
   * @param options Component options.
   * @param classDef Class definition.
   */
  protected static init<I extends InitElement, O extends BaseOptions, C extends Component<O>>(
    els: I | InitElements<I>,
    options: Partial<O>,
    classDef: ComponentType<C, O>
  ): C | C[];
  /**
   * Initializes component instances.
   * @param els HTML elements.
   * @param options Component options.
   * @param classDef Class definition.
   */
  protected static init<I extends InitElement, O extends BaseOptions, C extends Component<O>>(
    els: I | InitElements<I>,
    options: Partial<O>,
    classDef: ComponentType<C, O>
  ): C | C[] {
    if (els instanceof Element) return new classDef(<HTMLElement>els, options);
    return els ? Array.from(els, (el) => new classDef(<HTMLElement>el, options)) : null;
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
   * Runs an `on…` option callback with the element, then fires
   * `expressive:<type>` from it, so pages can listen instead of passing options.
   *
   * A callback or listener may close, reopen or destroy the component. Pass
   * `current` to tell whether the state `type` names still holds; the event
   * is skipped once it does not, or once the instance is destroyed, and the
   * result says whether to carry on.
   */
  protected _notify(type: string, callback?: ((el: HTMLElement) => void) | null, current = () => true): boolean {
    const live = () => (this.constructor as typeof Component).getInstance(this.el) === this && current();
    if (typeof callback === 'function') callback.call(this, this.el);
    if (!live()) return false;
    Utils.emit(this.el, type);
    return live();
  }

  /**
   * Destroy plugin instance and teardown.
   */
  destroy(): void {
    throw new Error('This method must be implemented.');
  }
}
