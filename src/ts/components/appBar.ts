import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

const _defaults: BaseOptions = {};

/**
 * Collapse medium/large flexible app bars on scroll, and open the related
 * search view when the search field in a search app bar is selected.
 *
 * Observation is IntersectionObserver on a sentinel after the header.
 * A scroll listener would re-enter layout on every tick; this does not.
 */
export class AppBar extends Component<BaseOptions> {
  private _observer: IntersectionObserver | null = null;
  private _sentinel: HTMLElement | null = null;
  private _input: HTMLInputElement | null = null;
  private _view: HTMLElement | null = null;
  private _searchOpen = false;

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
    this._input?.removeEventListener('click', this._onSearchFocus);
    this._view?.removeEventListener('close', this._onSearchViewClose);
    this.el.classList.remove('collapsed');
    this.el['Expressive_AppBar'] = undefined;
  }

  private _setupCollapse() {
    if (!this.el.classList.contains('medium') && !this.el.classList.contains('large')) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') return;

    // Collapsing shrinks the header, and scroll anchoring then scrolls the page
    // back by the height it lost. The sentinel follows the header, so it moves
    // with the page and that correction cannot bring it back into view. It sits
    // 64px, the small bar's height, above the header's bottom edge. An expanded
    // bar therefore collapses once the page has scrolled by the height that
    // collapsing removes, and a collapsed bar expands when the page is back at
    // its top. Zero height and no margins keep it out of the layout.
    this._sentinel = document.createElement('span');
    this._sentinel.setAttribute('aria-hidden', 'true');
    this._sentinel.style.cssText =
      'display:block;height:0;position:relative;top:-64px;pointer-events:none;visibility:hidden';
    this.el.insertAdjacentElement('afterend', this._sentinel);
    this._observer = new IntersectionObserver(this._onIntersect);
    this._observer.observe(this._sentinel);
  }

  private _onIntersect = (entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    if (!entry) return;
    // Collapse only when the sentinel has gone above the pinned header. A
    // sentinel below the viewport would move back into view as the bar shrank,
    // and the bar would switch sizes on every frame.
    this.el.classList.toggle(
      'collapsed',
      !entry.isIntersecting && entry.boundingClientRect.top < this.el.getBoundingClientRect().top
    );
  };

  private _setupSearch() {
    this._input = this.el.querySelector('input[type="search"]');
    if (!this._input) return;

    const id = this._input.getAttribute('aria-controls');
    if (id) this._view = document.getElementById(id);
    if (!this._view) this._view = this.el.querySelector('.search-view');
    if (!this._view) return;

    this._input.addEventListener('focus', this._onSearchFocus);
    this._input.addEventListener('click', this._onSearchFocus);
    if (this._view instanceof HTMLDialogElement) {
      this._view.addEventListener('close', this._onSearchViewClose);
    }
  }

  private _onSearchViewClose = () => {
    this._searchOpen = (this._view as HTMLDialogElement).open;
  };

  private _onSearchFocus = () => {
    if (!this._view || this._searchOpen) return;
    if (this._view instanceof HTMLDialogElement) {
      this._searchOpen = true;
      if (!this._view.open) this._view.showModal();
      return;
    }
    this._view.hidden = false;
    this._input?.setAttribute('aria-expanded', 'true');
  };
}
