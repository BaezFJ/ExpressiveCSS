import { Component, BaseOptions } from '../core/component';

/** A decorative vertical scrollbar for the page. Scrolling stays native. */
export class ScrollArea extends Component<BaseOptions> {
  static key = 'Expressive_ScrollArea';
  private _bar?: HTMLDivElement;
  private _observer?: ResizeObserver;
  private _modalObserver?: MutationObserver;
  private _frame?: number;

  private get _window() {
    return this.el.ownerDocument.defaultView!;
  }

  constructor(el: HTMLElement, options: Partial<BaseOptions> = {}) {
    super(el, options);
    const doc = el.ownerDocument;
    if (el !== doc.documentElement) return;
    this._bar = doc.createElement('div');
    this._bar.className = 'scroll-area-bar';
    this._bar.setAttribute('aria-hidden', 'true');
    const thumb = doc.createElement('div');
    thumb.className = 'scroll-area-thumb';
    this._bar.append(thumb);
    el.append(this._bar);
    this._observer = new this._window.ResizeObserver(this._queueMeasure);
    this._observer.observe(el);
    this._window.addEventListener('resize', this._queueMeasure, { signal: this._events.signal });
    this._listenForScroll();
    this.refresh();
  }

  private _listenForScroll(): void {
    if (this._window.CSS?.supports('animation-timeline: scroll()')) return;
    this._window.addEventListener('scroll', this._queueMeasure, {
      passive: true,
      signal: this._events.signal,
    });
  }

  private _queueMeasure = (): void => {
    if (this._frame !== undefined) return;
    this._frame = this._window.requestAnimationFrame(() => {
      this._frame = undefined;
      this.refresh();
    });
  };

  /** Remeasure after content overflows a fixed-height body or a custom scroll lock changes. */
  refresh(): void {
    if (!this._bar) return;
    this._observeBody();
    this._observeModal();
    this._measure();
  }

  private _observeBody(): void {
    const body = this.el.ownerDocument.body;
    if (body) this._observer!.observe(body);
  }

  private _observeModal(): void {
    this._modalObserver?.disconnect();
    if (!this.el.matches(':has(dialog:modal)')) return;
    // Removing a modal or its ancestor unlocks the page without firing close.
    this._modalObserver ??= new this._window.MutationObserver(this._queueMeasure);
    this._modalObserver.observe(this.el, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['open'],
    });
  }

  private _measure(): void {
    const { clientHeight, scrollHeight, scrollTop } = this.el;
    const range = Math.max(0, scrollHeight - clientHeight);
    const length = Math.min(clientHeight, Math.max(48, clientHeight * clientHeight / Math.max(1, scrollHeight)));
    const travel = clientHeight - length;
    const progress = Math.min(1, Math.max(0, scrollTop / Math.max(1, range)));
    const overflow = this._window.getComputedStyle(this.el).overflowY;
    this._bar!.hidden = range === 0 || ['hidden', 'clip'].includes(overflow);
    this._bar!.style.setProperty('--scroll-area-thumb-length', `${length}px`);
    this._bar!.style.setProperty('--scroll-area-thumb-travel', `${travel}px`);
    this._bar!.style.setProperty('--scroll-area-thumb-offset', `${progress * travel}px`);
  }

  destroy(): void {
    if (this._frame !== undefined) this._window.cancelAnimationFrame(this._frame);
    this._frame = undefined;
    this._observer?.disconnect();
    this._modalObserver?.disconnect();
    this._bar?.remove();
    this._bar = undefined;
    super.destroy();
  }
}
