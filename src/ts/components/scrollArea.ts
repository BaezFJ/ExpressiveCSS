import { Component, BaseOptions } from '../core/component';

/** A vertical page scrollbar with thumb dragging and single-step track paging. */
export class ScrollArea extends Component<BaseOptions> {
  static key = 'Expressive_ScrollArea';
  private _bar?: HTMLDivElement;
  private _observer?: ResizeObserver;
  private _modalObserver?: MutationObserver;
  private _frame?: number;
  private _drag?: { pointerId: number; clientY: number; scrollTop: number; ratio: number };
  private _dragObserver?: MutationObserver;

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
    this._bar.addEventListener('pointerdown', this._handlePointerDown, { signal: this._events.signal });
    this._bar.addEventListener('pointermove', this._handlePointerMove, { signal: this._events.signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this._bar.addEventListener(type, this._handlePointerEnd, { signal: this._events.signal });
    }
    this._observer = new this._window.ResizeObserver(this._queueMeasure);
    this._observer.observe(el);
    this._window.addEventListener('resize', this._queueMeasure, { signal: this._events.signal });
    this._listenForScroll();
    this.refresh();
  }

  private _handlePointerDown = (e: PointerEvent): void => {
    if (!e.isPrimary || e.button !== 0 || e.ctrlKey) return;
    this._press(e);
  };

  private _press(e: PointerEvent): void {
    if (this._drag) return;
    e.preventDefault();
    const { length, travel, range, offset, scrollTop } = this._metrics;
    if (e.clientY >= offset && e.clientY <= offset + length) this._startDrag(e, scrollTop, range, travel);
    else this._window.scrollBy({ top: Math.sign(e.clientY - offset) * this.el.clientHeight });
  }

  private _startDrag(e: PointerEvent, scrollTop: number, range: number, travel: number): void {
    if (travel === 0) return;
    this._drag = { pointerId: e.pointerId, clientY: e.clientY, scrollTop, ratio: range / travel };
    this._bar!.setPointerCapture(e.pointerId);
    // Chromium withholds captured moves while a modal makes the bar inert.
    this._dragObserver ??= new this._window.MutationObserver(this._endHiddenDrag);
    this._dragObserver.observe(this.el, { attributes: true, subtree: true, attributeFilter: ['class', 'open'] });
  }

  private _endHiddenDrag = (): void => {
    if (!this._bar!.getClientRects().length) this._endDrag();
  };

  private _handlePointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this._drag?.pointerId) return;
    if (!this._bar!.getClientRects().length) { this._endDrag(); return; }
    const { clientY, scrollTop, ratio } = this._drag;
    this._window.scrollTo({ top: scrollTop + (e.clientY - clientY) * ratio, behavior: 'instant' });
  }

  private _handlePointerEnd = (e: PointerEvent): void => {
    if (e.pointerId === this._drag?.pointerId) this._endDrag();
  };

  private _endDrag(): void {
    const drag = this._drag;
    this._drag = undefined;
    this._dragObserver?.disconnect();
    if (drag && this._bar?.hasPointerCapture(drag.pointerId)) this._bar.releasePointerCapture(drag.pointerId);
  }

  private get _metrics() {
    const { clientHeight, scrollHeight, scrollTop } = this.el;
    const range = Math.max(0, scrollHeight - clientHeight);
    const length = Math.min(clientHeight, Math.max(48, clientHeight * clientHeight / Math.max(1, scrollHeight)));
    const travel = clientHeight - length;
    const progress = Math.min(1, Math.max(0, scrollTop / Math.max(1, range)));
    return { length, travel, range, offset: progress * travel, scrollTop };
  };

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
    const { range, length, travel, offset } = this._metrics;
    const overflow = this._window.getComputedStyle(this.el).overflowY;
    this._bar!.hidden = range === 0 || ['hidden', 'clip'].includes(overflow);
    if (this._bar!.hidden) this._endDrag();
    this._bar!.style.setProperty('--scroll-area-thumb-length', `${length}px`);
    this._bar!.style.setProperty('--scroll-area-thumb-travel', `${travel}px`);
    this._bar!.style.setProperty('--scroll-area-thumb-offset', `${offset}px`);
  }

  destroy(): void {
    this._endDrag();
    if (this._frame !== undefined) this._window.cancelAnimationFrame(this._frame);
    this._frame = undefined;
    this._observer?.disconnect();
    this._modalObserver?.disconnect();
    this._bar?.remove();
    this._bar = undefined;
    super.destroy();
  }
}
