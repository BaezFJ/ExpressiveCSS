import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

const _defaults: BaseOptions = {};

/**
 * Collapse medium/large flexible app bars on scroll, and open the related
 * search view when the search field in a search app bar is selected.
 *
 * Observation is IntersectionObserver on a 1px sentinel ahead of the header.
 * A scroll listener would re-enter layout on every tick; this does not.
 */
export class AppBar extends Component<BaseOptions> {
  private _observer: IntersectionObserver | null = null;
  private _sentinel: HTMLElement | null = null;
  private _input: HTMLInputElement | null = null;
  private _view: HTMLElement | null = null;
  private _suppressSearchOpen = false;

  constructor(el: HTMLElement, options: Partial<BaseOptions>) {
    super(el, options, AppBar);
    this.el['Expressive_AppBar'] = this;
    this.options = { ...AppBar.defaults, ...options };
    this._setupCollapse();
    this._setupSearch();
  }

  static get defaults(): BaseOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<BaseOptions>): AppBar;
  static init(els: InitElements<InitElement>, options?: Partial<BaseOptions>): AppBar[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<BaseOptions> = {}
  ): AppBar | AppBar[] {
    return super.init(els, options, AppBar);
  }

  static getInstance(el: HTMLElement): AppBar {
    return el['Expressive_AppBar'];
  }

  destroy() {
    this._observer?.disconnect();
    this._observer = null;
    this._sentinel?.remove();
    this._sentinel = null;
    this._input?.removeEventListener('focus', this._onSearchFocus);
    this._view?.removeEventListener('close', this._onSearchViewClose);
    this.el.classList.remove('collapsed');
    this.el['Expressive_AppBar'] = undefined;
  }

  private _setupCollapse() {
    if (!this.el.classList.contains('medium') && !this.el.classList.contains('large')) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') return;

    this._sentinel = document.createElement('span');
    this._sentinel.setAttribute('aria-hidden', 'true');
    this._sentinel.style.cssText =
      'display:block;width:100%;height:1px;margin-top:-1px;pointer-events:none;visibility:hidden';
    this.el.insertAdjacentElement('beforebegin', this._sentinel);
    this._observer = new IntersectionObserver(this._onIntersect);
    this._observer.observe(this._sentinel);
  }

  private _onIntersect = (entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    if (!entry) return;
    this.el.classList.toggle('collapsed', !entry.isIntersecting);
  };

  private _setupSearch() {
    this._input = this.el.querySelector('input[type="search"]');
    if (!this._input) return;

    const id = this._input.getAttribute('aria-controls');
    if (id) this._view = document.getElementById(id);
    if (!this._view) this._view = this.el.querySelector('.search-view');
    if (!this._view) return;

    this._input.addEventListener('focus', this._onSearchFocus);
    if (this._view instanceof HTMLDialogElement) {
      this._view.addEventListener('close', this._onSearchViewClose);
    }
  }

  private _onSearchViewClose = () => {
    // Closing restores focus to the field; swallow that one so the view
    // does not immediately showModal() again.
    this._suppressSearchOpen = true;
  };

  private _onSearchFocus = () => {
    if (!this._view) return;
    if (this._suppressSearchOpen) {
      this._suppressSearchOpen = false;
      return;
    }
    if (this._view instanceof HTMLDialogElement) {
      if (!this._view.open) this._view.showModal();
      return;
    }
    this._view.hidden = false;
    this._input?.setAttribute('aria-expanded', 'true');
  };
}
