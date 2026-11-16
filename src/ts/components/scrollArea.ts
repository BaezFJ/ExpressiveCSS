import { Component, BaseOptions } from '../core/component';
import { controllerFor, deepActiveElement, Utils } from '../core/utils';

/** A vertical scrollbar with thumb dragging and single-step track paging. */
export class ScrollArea extends Component<BaseOptions> {
  static key = 'Expressive_ScrollArea';
  private _bar?: HTMLDivElement;
  private _wrapper?: HTMLDivElement;
  private _anchor?: string;
  private _anchorValue = '';
  private _anchorPriority = '';
  private _hadStyle = false;
  private _observer?: ResizeObserver;
  private _modalObserver?: MutationObserver;
  private _childrenObserver?: MutationObserver;
  private _frame?: number;
  private _drag?: { pointerId: number; clientY: number; scrollTop: number; ratio: number };
  private _dragObserver?: MutationObserver;
  private _dragEvents?: AbortController;

  private get _window() {
    return this.el.ownerDocument.defaultView!;
  }

  constructor(el: HTMLElement, options: Partial<BaseOptions> = {}) {
    super(el, options);
    const doc = el.ownerDocument;
    if (!this._supported()) return;
    this._bar = doc.createElement('div');
    this._bar.className = 'scroll-area-bar';
    this._bar.setAttribute('aria-hidden', 'true');
    const thumb = doc.createElement('div');
    thumb.className = 'scroll-area-thumb';
    this._bar.append(thumb);
    this._placeBar();
    if (!this._bar) return;
    this._bar.addEventListener('click', e => {
      if (e.button !== 0 || e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
    }, { signal: this._events.signal });
    this._bar.addEventListener('pointerdown', this._handlePointerDown, { signal: this._events.signal });
    this._bar.addEventListener('pointermove', this._handlePointerMove, { signal: this._events.signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this._bar.addEventListener(type, this._handlePointerEnd, { signal: this._events.signal });
    }
    this._window.matchMedia('screen and (forced-colors: none) and (not (pointer: coarse))').addEventListener(
      'change', () => {
        this._endDrag();
        if (this._wrapper) this._queueMeasure();
      }, { signal: this._events.signal },
    );
    this._observer = new this._window.ResizeObserver(this._queueMeasure);
    this._observer.observe(el);
    this._window.addEventListener('resize', this._queueMeasure, { signal: this._events.signal });
    this._listenForScroll();
    this.refresh();
  }

  private _placeBar(): void {
    if (this.el === this.el.ownerDocument.documentElement) this.el.append(this._bar!);
    else {
      this._bar!.addEventListener('wheel', this._handleWheel, { passive: false, signal: this._events.signal });
      for (const query of ['(prefers-color-scheme: dark)', '(prefers-contrast: more)']) {
        this._window.matchMedia(query).addEventListener('change', this._queueMeasure, { signal: this._events.signal });
      }
      this._wrap();
    }
  }

  private get _scrollTarget(): Window | HTMLElement {
    return this._wrapper ? this.el : this._window;
  }

  private _handleWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || !this._canWheel(e)) return;
    e.preventDefault();
    const scale = [1, 40, this.el.clientHeight][e.deltaMode];
    this.el.scrollBy({ top: e.deltaY * scale, left: e.deltaX * scale, behavior: 'instant' });
  };

  private _canWheel(e: WheelEvent): boolean {
    if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      return this._hasTravel(e.deltaY, this.el.scrollTop, this.el.scrollHeight - this.el.clientHeight);
    }
    const range = this.el.scrollWidth - this.el.clientWidth;
    const offset = this.el.scrollLeft + (this._bar!.dir === 'rtl' ? range : 0);
    return this._hasTravel(e.deltaX, offset, range);
  }

  private _hasTravel(delta: number, offset: number, range: number): boolean {
    return delta < 0 ? offset > 0 : delta > 0 && offset < range;
  }

  private _supported(): boolean {
    return this.el === this.el.ownerDocument.documentElement || this._canWrap();
  }

  private _canWrap(): boolean {
    if (!this.el.parentNode || this.el === this.el.ownerDocument.body) return false;
    return !!this._window.CSS?.supports?.('anchor-name: --a');
  }

  private _saveState(): () => void {
    const { scrollTop, scrollLeft } = this.el;
    const active = this.el.getRootNode() as Document | ShadowRoot;
    const focused = active.activeElement;
    const focus = focused && this.el.contains(focused) ? deepActiveElement(active) as HTMLElement : undefined;
    return () => {
      this.el.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'instant' });
      focus?.focus({ preventScroll: true });
    };
  }

  private _wrap(): void {
    const restore = this._saveState();
    this._wrapper = this.el.ownerDocument.createElement('div');
    this._wrapper.className = 'scroll-area-wrapper';
    if (this.el.hasAttribute('slot')) this._wrapper.setAttribute('slot', this.el.getAttribute('slot')!);
    this._hadStyle = this.el.hasAttribute('style');
    this.el.before(this._wrapper);
    this._wrapper.append(this.el, this._bar!);
    if (!this._bar) return;
    this._anchor = `--scroll-area-${Utils.guid()}`;
    this._anchorValue = this.el.style.getPropertyValue('anchor-name');
    this._anchorPriority = this.el.style.getPropertyPriority('anchor-name');
    Utils.setAnchorName(this.el, this._anchor, true);
    this.el.style.setProperty('anchor-name', this.el.style.getPropertyValue('anchor-name'), this._anchorPriority);
    this._bar!.style.setProperty('position-anchor', this._anchor);
    restore();
  }

  private _removeAnchor(): void {
    const value = this.el.style.getPropertyValue('anchor-name');
    const priority = this.el.style.getPropertyPriority('anchor-name');
    const names = value.split(',').filter(name => name.trim() !== this._anchor);
    if (value === this._anchor && this._anchorValue === 'none') names.push('none');
    this.el.style.setProperty('anchor-name', names.join(','), priority);
  }

  private _unwrap(): void {
    if (!this._wrapper) return;
    const restore = this._saveState();
    this._wrapper.replaceWith(...this._wrapper.childNodes);
    this._wrapper = undefined;
    this._removeAnchor();
    if (!this._hadStyle && !this.el.style.cssText) this.el.removeAttribute('style');
    restore();
  }

  private _handlePointerDown = (e: PointerEvent): void => {
    if (!e.isPrimary || e.button !== 0 || e.ctrlKey) return;
    this._press(e);
  };

  private _press(e: PointerEvent): void {
    if (this._drag) return;
    e.preventDefault();
    const { length, travel, range, offset, scrollTop } = this._metrics;
    const y = e.clientY - this._bar!.getBoundingClientRect().top;
    if (y >= offset && y <= offset + length) this._startDrag(e, scrollTop, range, travel);
    else this._scrollTarget.scrollBy({ top: Math.sign(y - offset) * this.el.clientHeight });
  }

  private _startDrag(e: PointerEvent, scrollTop: number, range: number, travel: number): void {
    if (travel === 0) return;
    this._drag = { pointerId: e.pointerId, clientY: e.clientY, scrollTop, ratio: range / travel };
    this._bar!.setPointerCapture(e.pointerId);
    // Chromium withholds captured moves while a modal makes the bar inert.
    this._dragObserver ??= new this._window.MutationObserver(this._endHiddenDrag);
    const options = { attributes: true, attributeOldValue: true, subtree: true, attributeFilter: ['class', 'open', 'hidden', 'inert', 'style'] };
    const focused = deepActiveElement(this.el.ownerDocument);
    const roots = new Set([...this._composedAncestors(), ...this._composedAncestors(focused)].map(el => el.getRootNode()));
    this._dragEvents = controllerFor(this.el);
    for (const root of roots) {
      this._dragObserver.observe(root, options);
      // Focus transitions can expose modals in otherwise inaccessible roots.
      root.addEventListener('focusin', () => this._endDrag(), { capture: true, signal: this._dragEvents.signal });
    }
  }

  private _endHiddenDrag = (records: MutationRecord[]): void => {
    if (this._dragBlocked() || records.some(record => this._openedOutsideModal(record))) this._endDrag();
  };

  private _dragBlocked(): boolean {
    return !this._bar!.getClientRects().length || !this._containerHasHeight() || this._inertContainer();
  }

  private _containerHasHeight(): boolean {
    return !this._wrapper || this.el.clientHeight > 0;
  }

  private _inertContainer(): boolean {
    return this._composedAncestors().some(el => el.hasAttribute('inert'));
  }

  private _composedAncestors(el: Element | null | undefined = this.el): Element[] {
    const ancestors: Element[] = [];
    while (el) {
      ancestors.push(el);
      el = el.assignedSlot ?? el.parentElement ?? (el.getRootNode() as ShadowRoot).host;
    }
    return ancestors;
  }

  private _openedOutsideModal(record: MutationRecord): boolean {
    if (record.attributeName !== 'open' || record.oldValue !== null) return false;
    const modal = record.target as Element;
    return modal.matches('dialog:modal') && !this._composedAncestors().includes(modal);
  }

  private _handlePointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this._drag?.pointerId) return;
    if (this._dragBlocked()) { this._endDrag(); return; }
    const { clientY, scrollTop, ratio } = this._drag;
    this._scrollTarget.scrollTo({ top: scrollTop + (e.clientY - clientY) * ratio, behavior: 'instant' });
  }

  private _handlePointerEnd = (e: PointerEvent): void => {
    if (e.pointerId === this._drag?.pointerId) this._endDrag();
  };

  private _endDrag(): void {
    const drag = this._drag;
    this._drag = undefined;
    this._dragObserver?.disconnect();
    this._dragEvents?.abort();
    this._dragEvents = undefined;
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
    if (this._wrapper) {
      this.el.addEventListener('scroll', this._queueMeasure, { passive: true, signal: this._events.signal });
      return;
    }
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

  /** Remeasure content and style changes that do not resize the scroll area. */
  refresh(): void {
    if (!this._bar) return;
    if (this._wrapper) this._observeChildren();
    else { this._observeBody(); this._observeModal(); }
    this._measure();
  }

  private _observeChildren(): void {
    this._observer!.observe(this.el);
    for (const child of this.el.children) this._observer!.observe(child);
    this._childrenObserver ??= new this._window.MutationObserver(records => {
      if (records.some(record => record.type === 'childList')) this._observer!.disconnect();
      this._queueMeasure();
    });
    for (const ancestor of this._composedAncestors()) {
      this._childrenObserver.observe(ancestor, { attributes: true, childList: ancestor === this.el });
    }
  }

  private _copyContainerStyle(style: CSSStyleDeclaration): void {
    this._bar!.dir = style.direction;
    this._copyProperty('color', style.color);
    this._copyProperty('color-scheme', style.colorScheme);
    this._copyProperty('z-index', style.zIndex === 'auto' ? '' : style.zIndex);
    for (const side of ['block-start', 'block-end', 'inline-end']) {
      this._copyProperty(`--scroll-area-border-${side}`, style.getPropertyValue(`border-${side}-width`));
    }
    for (const name of ['--scroll-area-bar-size', '--scroll-area-thumb-color', '--scroll-area-track-color', '--md-sys-color-on-surface-variant']) {
      this._copyProperty(name, style.getPropertyValue(name));
    }
  }

  private _containerHidden(style: CSSStyleDeclaration): boolean {
    // Measure without native gutters, then restore them before paint if content fits.
    this._bar!.hidden = false;
    this._copyContainerStyle(style);
    return style.visibility !== 'visible' || this.el.parentNode !== this._wrapper;
  }

  private _copyProperty(name: string, value: string): void {
    if (value) this._bar!.style.setProperty(name, value);
    else this._bar!.style.removeProperty(name);
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

  private _unscrollable(range: number, style: CSSStyleDeclaration): boolean {
    return range === 0 || ['hidden', 'clip'].includes(style.overflowY);
  }

  private _measure(): void {
    const style = this._window.getComputedStyle(this.el);
    const hidden = this._wrapper ? this._containerHidden(style) : false;
    const { range, length, travel, offset } = this._metrics;
    this._bar!.hidden = this._unscrollable(range, style) || hidden;
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
    this._childrenObserver?.disconnect();
    this._bar?.remove();
    this._bar = undefined;
    this._unwrap();
    super.destroy();
  }
}
