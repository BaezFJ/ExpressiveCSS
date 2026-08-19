import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface NavigationRailOptions extends BaseOptions {
  /**
   * Called before the rail expands.
   */
  onOpenStart: (el: HTMLElement) => void;
  /**
   * Called after the rail expands.
   */
  onOpenEnd: (el: HTMLElement) => void;
  /**
   * Called before the rail collapses.
   */
  onCloseStart: (el: HTMLElement) => void;
  /**
   * Called after the rail collapses.
   */
  onCloseEnd: (el: HTMLElement) => void;
}

const _defaults: NavigationRailOptions = {
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null
};

const COMPACT = '(width < 601px)';

/**
 * Navigation rail. Layout is CSS (collapsed / .expanded). This class
 * toggles that class from the menu button, closes a compact overlay on
 * Escape or a scrim tap, and keeps aria-expanded in sync.
 */
export class NavigationRail extends Component<NavigationRailOptions> {
  isExpanded: boolean;
  private _toggle: HTMLButtonElement | null;
  private _mql: MediaQueryList;

  constructor(el: HTMLElement, options: Partial<NavigationRailOptions>) {
    super(el, options, NavigationRail);
    this.el['Expressive_NavigationRail'] = this;

    this.options = {
      ...NavigationRail.defaults,
      ...options
    };

    this._toggle = this._findToggle();
    this._mql = window.matchMedia(COMPACT);
    this.isExpanded = this.el.classList.contains('expanded');
    this._sync();
    this.el.addEventListener('click', this._onClick);
    document.addEventListener('keydown', this._onKeyDown);
  }

  static get defaults(): NavigationRailOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<NavigationRailOptions>): NavigationRail;
  static init(
    els: InitElements<InitElement>,
    options?: Partial<NavigationRailOptions>
  ): NavigationRail[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<NavigationRailOptions> = {}
  ): NavigationRail | NavigationRail[] {
    return super.init(els, options, NavigationRail);
  }

  static getInstance(el: HTMLElement): NavigationRail {
    return el['Expressive_NavigationRail'];
  }

  destroy() {
    this.el.removeEventListener('click', this._onClick);
    document.removeEventListener('keydown', this._onKeyDown);
    this.el['Expressive_NavigationRail'] = undefined;
  }

  /**
   * Expands the rail. On compact windows the overlay (scrim) is CSS.
   */
  expand = () => {
    if (this.isExpanded) return;
    if (typeof this.options.onOpenStart === 'function') {
      this.options.onOpenStart.call(this, this.el);
    }
    this.isExpanded = true;
    this.el.classList.add('expanded');
    this._sync();
    if (typeof this.options.onOpenEnd === 'function') {
      this.options.onOpenEnd.call(this, this.el);
    }
  };

  /**
   * Collapses the rail.
   */
  collapse = () => {
    if (!this.isExpanded) return;
    if (typeof this.options.onCloseStart === 'function') {
      this.options.onCloseStart.call(this, this.el);
    }
    this.isExpanded = false;
    this.el.classList.remove('expanded');
    this._sync();
    if (typeof this.options.onCloseEnd === 'function') {
      this.options.onCloseEnd.call(this, this.el);
    }
  };

  /**
   * Toggles expanded / collapsed.
   */
  toggle = () => {
    if (this.isExpanded) this.collapse();
    else this.expand();
  };

  private _findToggle(): HTMLButtonElement | null {
    const first = this.el.querySelector(':scope > button:not(.button)');
    return first instanceof HTMLButtonElement ? first : null;
  }

  private _isCompact() {
    return this._mql.matches;
  }

  private _isModal() {
    return this.el.classList.contains('modal') || this._isCompact();
  }

  private _sync() {
    this.el.setAttribute('aria-expanded', this.isExpanded ? 'true' : 'false');
    this._toggle?.setAttribute('aria-expanded', this.isExpanded ? 'true' : 'false');
  }

  private _onClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Node)) return;
    if (this._toggle && (target === this._toggle || this._toggle.contains(target))) {
      this.toggle();
      e.preventDefault();
      return;
    }
    if (target === this.el && this.isExpanded && this._isModal()) {
      this.collapse();
    }
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (this.isExpanded && this._isModal()) this.collapse();
  };
}
