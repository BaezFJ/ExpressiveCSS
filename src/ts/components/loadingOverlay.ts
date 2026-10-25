import { Component, BaseOptions } from '../core/component';

/** What the status region announces. */
export interface LoadingOverlayI18nOptions {
  /** Announced when the region becomes busy. */
  loading: string;
  /** Announced when it clears. */
  loaded: string;
}

export interface LoadingOverlayOptions extends BaseOptions {
  /** What the status region announces when the region becomes busy and when it clears. */
  i18n: Partial<LoadingOverlayI18nOptions>;
}

const _defaults: LoadingOverlayOptions = {
  i18n: {
    loading: 'Loading',
    loaded: 'Loaded'
  }
};

/** Whether focus has gone nowhere: an element that turns inert drops it to the body. */
const focusLost = (doc: Document) => !doc.activeElement || doc.activeElement === doc.body;

/**
 * Loading overlay. While the page sets `aria-busy="true"` on the region, the
 * region is inert, so nothing inside it takes a click, a tap or keyboard
 * focus, and the stylesheet shows a scrim and the author's loading indicator
 * over it. The page clears the region by removing the attribute or setting it
 * to anything else; there is no method for either.
 *
 * Inert content leaves the accessibility tree, the indicator's status
 * included, so the start and the finish are announced from a status region
 * the script adds after the region.
 */
export class LoadingOverlay extends Component<LoadingOverlayOptions> {
  static key = 'Expressive_LoadingOverlay';
  private _status: HTMLElement;
  private _observer: MutationObserver;
  private _busy = false;
  /** The region's own `inert`, put back when it clears. */
  private _wasInert = false;
  /** The element inside the region that had focus when it became busy. */
  private _focus: HTMLElement | null = null;

  constructor(el: HTMLElement, options: Partial<LoadingOverlayOptions>) {
    super(el, options);
    this._status = el.ownerDocument.createElement('span');
    this._status.className = 'loading-overlay-status';
    this._status.setAttribute('role', 'status');
    el.after(this._status);
    this._observer = new MutationObserver(() => this._sync());
    this._observer.observe(el, { attributeFilter: ['aria-busy'] });
    this._sync();
  }

  static get defaults(): LoadingOverlayOptions {
    return _defaults;
  }

  destroy() {
    this._observer.disconnect();
    if (this._busy) this.el.inert = this._wasInert;
    this._status.remove();
    super.destroy();
  }

  /** Follows `aria-busy`. Other values than "true" clear, as ARIA treats them. */
  private _sync() {
    const busy = this.el.getAttribute('aria-busy') === 'true';
    if (busy === this._busy) return;
    this._busy = busy;
    if (busy) this._start();
    else this._clear();
  }

  private _start() {
    const active = this.el.ownerDocument.activeElement;
    // Read before inert drops it.
    this._focus = active instanceof HTMLElement && this.el.contains(active) ? active : null;
    this._wasInert = this.el.inert;
    this.el.inert = true;
    this._status.textContent = this.options.i18n.loading;
  }

  private _clear() {
    this.el.inert = this._wasInert;
    this._status.textContent = this.options.i18n.loaded;
    const focus = this._focus;
    this._focus = null;
    // Not over a move the person made while it loaded, and not to an element the page removed.
    if (focus?.isConnected && focusLost(this.el.ownerDocument)) focus.focus();
  }
}
