import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, MElement } from '../core/component';

export interface CollapsibleOptions extends BaseOptions {
  /**
   * If accordion versus collapsible. When omitted, `.expandable` on the
   * element turns accordion off. `<details>` with the same `name` already
   * exclusive-open in the browser; this option is the switch for the
   * `<ul>/<li>` alias and assigns `name` when it is missing.
   * @default true
   */
  accordion: boolean;
  /**
   * Callback function called before collapsible is opened.
   * @default null
   */
  onOpenStart: (el: Element) => void;
  /**
   * Callback function called after collapsible is opened.
   * @default null
   */
  onOpenEnd: (el: Element) => void;
  /**
   * Callback function called before collapsible is closed.
   * @default null
   */
  onCloseStart: (el: Element) => void;
  /**
   * Callback function called after collapsible is closed.
   * @default null
   */
  onCloseEnd: (el: Element) => void;
}

const _defaults: CollapsibleOptions = {
  accordion: true,
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null
};

/**
 * Collapsible. Open/close is HTML (`<details>` / `[open]`, or `.active` on
 * the `<li>` alias). Height is CSS. This class is the public API, accordion
 * for the alias, and aria on non-native headers.
 */
export class Collapsible extends Component<CollapsibleOptions> {
  private _items: HTMLElement[] = [];
  private _groupName: string;
  private _endTimers: number[] = [];
  private _wrappedBodies: HTMLElement[] = [];

  constructor(el: HTMLElement, options: Partial<CollapsibleOptions>) {
    super(el, options, Collapsible);
    this.el['Expressive_Collapsible'] = this;

    const accordion =
      options.accordion !== undefined
        ? options.accordion
        : !el.classList.contains('expandable');

    this.options = {
      ...Collapsible.defaults,
      ...options,
      accordion
    };

    this._groupName = el.id ? `collapsible-${el.id}` : `collapsible-${Utils.guid()}`;
    this._items = this._collectItems();
    this._wrapDetailsBodies();
    this._setupItems();
    this._setupEventHandlers();
  }

  static get defaults(): CollapsibleOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Collapsible.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<CollapsibleOptions>): Collapsible;
  /**
   * Initializes instances of Collapsible.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<MElement>, options?: Partial<CollapsibleOptions>): Collapsible[];
  /**
   * Initializes instances of Collapsible.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<MElement>,
    options: Partial<CollapsibleOptions> = {}
  ): Collapsible | Collapsible[] {
    return super.init(els, options, Collapsible);
  }

  static getInstance(el: HTMLElement): Collapsible {
    return el['Expressive_Collapsible'];
  }

  destroy() {
    this._removeEventHandlers();
    this._endTimers.forEach((id) => clearTimeout(id));
    this._endTimers = [];
    this._unwrapDetailsBodies();
    this.el['Expressive_Collapsible'] = undefined;
  }

  /**
   * Open collapsible section.
   * @param index 0-based index of the section to open.
   */
  open = (index: number) => {
    const item = this._items[index];
    if (!item || this._isOpen(item)) return;

    if (this.options.accordion) {
      this._items.forEach((other, i) => {
        if (i !== index && this._isOpen(other)) this.close(i);
      });
    }

    this._setOpen(item, true);
  };

  /**
   * Close collapsible section.
   * @param index 0-based index of the section to close.
   */
  close = (index: number) => {
    const item = this._items[index];
    if (!item || !this._isOpen(item)) return;
    this._setOpen(item, false);
  };

  private _collectItems(): HTMLElement[] {
    const details = Array.from(this.el.querySelectorAll(':scope > details')) as HTMLElement[];
    if (details.length) return details;
    return Array.from(this.el.children).filter((c) => c.tagName === 'LI') as HTMLElement[];
  }

  private _setupItems() {
    if (this.options.accordion) {
      this._items.forEach((item) => {
        if (item instanceof HTMLDetailsElement && !item.getAttribute('name')) {
          item.setAttribute('name', this._groupName);
        }
      });
    }

    const opened = this._items.filter((item) => this._isOpen(item));
    if (this.options.accordion && opened.length > 1) {
      opened.slice(1).forEach((item) => {
        if (item instanceof HTMLDetailsElement) item.open = false;
        else item.classList.remove('active');
      });
    }

    this._items.forEach((item) => this._syncAria(item));
  }

  private _isOpen(item: HTMLElement): boolean {
    if (item instanceof HTMLDetailsElement) return item.open;
    return item.classList.contains('active');
  }

  private _setOpen(item: HTMLElement, open: boolean) {
    if (item instanceof HTMLDetailsElement) {
      item.open = open;
      return;
    }
    item.classList.toggle('active', open);
    this._syncAria(item);
    this._notify(item, open);
  }

  private _headerOf(item: HTMLElement): HTMLElement | null {
    if (item instanceof HTMLDetailsElement) {
      return item.querySelector(':scope > summary');
    }
    return item.querySelector(':scope > .collapsible-header');
  }

  private _wrapDetailsBodies() {
    this._items.forEach((item) => {
      if (!(item instanceof HTMLDetailsElement)) return;
      if (item.querySelector(':scope > .collapsible-body')) return;
      const body = document.createElement('div');
      body.className = 'collapsible-body';
      Array.from(item.childNodes).forEach((node) => {
        if (node instanceof HTMLElement && node.tagName === 'SUMMARY') return;
        body.appendChild(node);
      });
      item.appendChild(body);
      this._wrappedBodies.push(body);
    });
  }

  private _unwrapDetailsBodies() {
    this._wrappedBodies.forEach((body) => {
      const parent = body.parentNode;
      if (!parent) return;
      while (body.firstChild) parent.insertBefore(body.firstChild, body);
      body.remove();
    });
    this._wrappedBodies = [];
  }

  private _bodyOf(item: HTMLElement): HTMLElement | null {
    return item.querySelector(':scope > .collapsible-body');
  }

  private _syncAria(item: HTMLElement) {
    if (item instanceof HTMLDetailsElement) return;
    const header = this._headerOf(item);
    const body = this._bodyOf(item);
    if (!header) return;

    header.setAttribute('aria-expanded', String(this._isOpen(item)));
    if (body) {
      if (!body.id) body.id = `collapsible-body-${Utils.guid()}`;
      header.setAttribute('aria-controls', body.id);
    }
    if (!header.matches('a, button, summary')) {
      header.setAttribute('role', 'button');
      if (header.tabIndex < 0) header.tabIndex = 0;
    }
  }

  private _setupEventHandlers() {
    this.el.addEventListener('click', this._handleClick);
    this.el.addEventListener('keydown', this._handleKeydown);
    this.el.addEventListener('toggle', this._handleToggle, true);
  }

  private _removeEventHandlers() {
    this.el.removeEventListener('click', this._handleClick);
    this.el.removeEventListener('keydown', this._handleKeydown);
    this.el.removeEventListener('toggle', this._handleToggle, true);
  }

  private _handleClick = (e: MouseEvent) => {
    const header = (e.target as HTMLElement).closest('.collapsible-header');
    if (!header || header.closest('.collapsible') !== this.el) return;
    if (header.closest('details')) return;

    const item = header.closest('li');
    if (!item) return;
    const index = this._items.indexOf(item as HTMLElement);
    if (index < 0) return;

    if (this._isOpen(item as HTMLElement)) this.close(index);
    else this.open(index);
  };

  private _handleKeydown = (e: KeyboardEvent) => {
    if (!Utils.keys.ENTER.includes(e.key) && e.key !== ' ') return;
    const header = (e.target as HTMLElement).closest('.collapsible-header');
    if (!header || header.closest('.collapsible') !== this.el) return;
    if (header.closest('details')) return;
    if (header.matches('a, button')) return;

    e.preventDefault();
    const item = header.closest('li');
    if (!item) return;
    const index = this._items.indexOf(item as HTMLElement);
    if (index < 0) return;

    if (this._isOpen(item as HTMLElement)) this.close(index);
    else this.open(index);
  };

  private _handleToggle = (e: Event) => {
    const item = e.target as HTMLElement;
    if (!(item instanceof HTMLDetailsElement)) return;
    if (!this._items.includes(item)) return;
    this._notify(item, item.open);
  };

  private _notify(item: HTMLElement, opening: boolean) {
    const start = opening ? this.options.onOpenStart : this.options.onCloseStart;
    if (typeof start === 'function') start.call(this, item);

    const end = opening ? this.options.onOpenEnd : this.options.onCloseEnd;
    if (typeof end !== 'function') return;

    const target = this._bodyOf(item) ?? item;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      target.removeEventListener('transitionend', onEnd);
      end.call(this, item);
    };
    const onEnd = (ev: TransitionEvent) => {
      if (ev.target !== target) return;
      finish();
    };
    target.addEventListener('transitionend', onEnd);
    this._endTimers.push(window.setTimeout(finish, this._durationMs() + 50));
  }

  private _durationMs(): number {
    const raw = getComputedStyle(this.el)
      .getPropertyValue('--md-comp-collapsible-duration')
      .trim();
    if (!raw) return 500;
    if (raw.endsWith('ms')) return parseFloat(raw);
    if (raw.endsWith('s')) return parseFloat(raw) * 1000;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 500;
  }
}
