import { Component, BaseOptions } from '../core/component';
import { controllerFor, deepActiveElement, Utils } from '../core/utils';

const axes = [
  { client: 'clientHeight', size: 'scrollHeight', scroll: 'scrollTop', overflow: 'overflowY', pointer: 'clientY', edge: 'top', position: 'top' },
  { client: 'clientWidth', size: 'scrollWidth', scroll: 'scrollLeft', overflow: 'overflowX', pointer: 'clientX', edge: 'left', position: 'left' },
] as const;
type Axis = typeof axes[number];

/** Scrollbars for both axes with thumb dragging and single-step track paging. */
export class ScrollArea extends Component<BaseOptions> {
  static key = 'Expressive_ScrollArea';
  private _bar?: HTMLDivElement;
  private _horizontal?: HTMLDivElement;
  private _wrapper?: HTMLDivElement;
  private _anchor?: string;
  private _anchorValue = '';
  private _anchorPriority = '';
  private _hadStyle = false;
  private _observer?: ResizeObserver;
  private _modalObserver?: MutationObserver;
  private _childrenObserver?: MutationObserver;
  private _frame?: number;
  private _drag?: { bar: HTMLDivElement; axis: Axis; pointerId: number; pointer: number; scroll: number; ratio: number };
  private _dragObserver?: MutationObserver;
  private _dragEvents?: AbortController;

  private get _window() {
    return this.el.ownerDocument.defaultView!;
  }

  constructor(el: HTMLElement, options: Partial<BaseOptions> = {}) {
    super(el, options);
    if (!this._supported()) return;
    this._bar = this._createBar();
    this._horizontal = this._createBar(true);
    this._placeBar();
    for (const bar of this._bars) this._listenBar(bar);
    if (!this._bar) return;
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

  private get _bars(): HTMLDivElement[] {
    return [this._bar, this._horizontal].filter((bar): bar is HTMLDivElement => !!bar);
  }

  private _createBar(horizontal = false): HTMLDivElement {
    const bar = this.el.ownerDocument.createElement('div');
    bar.className = `scroll-area-bar${horizontal ? ' horizontal' : ''}`;
    bar.setAttribute('aria-hidden', 'true');
    const thumb = this.el.ownerDocument.createElement('div');
    thumb.className = 'scroll-area-thumb';
    bar.append(thumb);
    return bar;
  }

  private _listenBar(bar: HTMLDivElement): void {
    bar.addEventListener('click', e => {
      if (e.button !== 0 || e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
    }, { signal: this._events.signal });
    bar.addEventListener('pointerdown', this._handlePointerDown, { signal: this._events.signal });
    bar.addEventListener('pointermove', this._handlePointerMove, { signal: this._events.signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      bar.addEventListener(type, this._handlePointerEnd, { signal: this._events.signal });
    }
  }

  private _placeBar(): void {
    if (this.el === this.el.ownerDocument.documentElement) this.el.append(...this._bars);
    else {
      for (const bar of this._bars) bar.addEventListener('wheel', this._handleWheel, { passive: false, signal: this._events.signal });
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
    this._wrapper.append(this.el, ...this._bars);
    if (!this._bar) return;
    this._anchor = `--scroll-area-${Utils.guid()}`;
    this._anchorValue = this.el.style.getPropertyValue('anchor-name');
    this._anchorPriority = this.el.style.getPropertyPriority('anchor-name');
    Utils.setAnchorName(this.el, this._anchor, true);
    this.el.style.setProperty('anchor-name', this.el.style.getPropertyValue('anchor-name'), this._anchorPriority);
    for (const bar of this._bars) bar.style.setProperty('position-anchor', this._anchor);
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
    const bar = e.currentTarget as HTMLDivElement;
    const axis = this._axis(bar);
    const metrics = this._metrics(axis);
    const offset = this._thumbOffset(axis, metrics);
    const at = e[axis.pointer] - bar.getBoundingClientRect()[axis.edge];
    if (at >= offset && at <= offset + metrics.length) this._startDrag(e, bar, axis, metrics);
    else this._scrollTarget.scrollBy({ [axis.position]: Math.sign(at - offset) * this.el[axis.client] });
  }

  private _axis(bar: HTMLDivElement): Axis {
    return axes[Number(bar === this._horizontal)];
  }

  private _thumbOffset(axis: Axis, metrics: ReturnType<ScrollArea['_geometry']>): number {
    if (axis === axes[1] && this._window.getComputedStyle(this.el).direction === 'rtl') return metrics.travel - metrics.offset;
    return metrics.offset;
  }

  private _startDrag(e: PointerEvent, bar: HTMLDivElement, axis: Axis, metrics: ReturnType<ScrollArea['_geometry']>): void {
    if (metrics.travel === 0) return;
    this._drag = { bar, axis, pointerId: e.pointerId, pointer: e[axis.pointer], scroll: metrics.scrollTop, ratio: metrics.range / metrics.travel };
    bar.setPointerCapture(e.pointerId);
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
    return !this._drag?.bar.getClientRects().length || !this._containerHasHeight() || this._inertContainer();
  }

  private _containerHasHeight(): boolean {
    return !this._wrapper || this.el[this._drag!.axis.client] > 0;
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
    const { axis, pointer, scroll, ratio } = this._drag;
    this._scrollTarget.scrollTo({ [axis.position]: scroll + (e[axis.pointer] - pointer) * ratio, behavior: 'instant' });
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
    if (drag?.bar.hasPointerCapture(drag.pointerId)) drag.bar.releasePointerCapture(drag.pointerId);
  }

  private get _corner(): number {
    if (this._bars.some(bar => bar.hidden)) return 0;
    return parseFloat(this._window.getComputedStyle(this._bar!).inlineSize) || 0;
  }

  private _metrics(axis: Axis = axes[0], corner = this._corner) {
    return this._geometry(this.el[axis.client], this.el[axis.size], this.el[axis.scroll], corner, axis === axes[1]);
  }

  private _geometry(client: number, size: number, scrollTop: number, corner: number, inline = false) {
    const range = Math.max(0, size - client);
    const track = Math.max(0, client - corner);
    const length = Math.min(track, Math.max(48, track * client / Math.max(1, size)));
    const travel = track - length;
    const progress = Math.min(1, Math.max(0, (inline ? Math.abs(scrollTop) : scrollTop) / Math.max(1, range)));
    return { client, size, length, travel, range, offset: progress * travel, scrollTop };
  }

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
    this._bar!.dir = this._horizontal!.dir = style.direction;
    this._copyProperty('color', style.color);
    this._copyProperty('color-scheme', style.colorScheme);
    this._copyProperty('z-index', style.zIndex === 'auto' ? '' : style.zIndex);
    for (const side of ['block-start', 'block-end', 'inline-start', 'inline-end']) {
      this._copyProperty(`--scroll-area-border-${side}`, style.getPropertyValue(`border-${side}-width`));
    }
    for (const name of ['--scroll-area-bar-size', '--scroll-area-thumb-color', '--scroll-area-track-color', '--md-sys-color-on-surface-variant']) {
      this._copyProperty(name, style.getPropertyValue(name));
    }
  }

  private _containerHidden(style: CSSStyleDeclaration): boolean {
    // Measure without native gutters, then restore them before paint if content fits.
    if (this._bars.every(bar => bar.hidden)) this._bar!.hidden = false;
    this._copyContainerStyle(style);
    return style.visibility !== 'visible' || this.el.parentNode !== this._wrapper;
  }

  private _copyProperty(name: string, value: string): void {
    for (const bar of this._bars) {
      if (value) bar.style.setProperty(name, value);
      else bar.style.removeProperty(name);
    }
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

  private _unscrollable(range: number, overflow: string): boolean {
    return range === 0 || ['hidden', 'clip'].includes(overflow);
  }

  private _endBarDrag(bar: HTMLDivElement): void {
    if (bar === this._drag?.bar) this._endDrag();
  }

  private _writeBar(bar: HTMLDivElement, metrics: ReturnType<ScrollArea['_geometry']>, sign: number): void {
    bar.style.setProperty('--scroll-area-thumb-length', `${metrics.length}px`);
    bar.style.setProperty('--scroll-area-thumb-travel', `${metrics.travel * sign}px`);
    bar.style.setProperty('--scroll-area-thumb-offset', `${metrics.offset * sign}px`);
  }

  private _measure(): void {
    const style = this._window.getComputedStyle(this.el);
    const hidden = this._wrapper ? this._containerHidden(style) : false;
    const metrics = axes.map(axis => this._metrics(axis, 0));
    const flags = axes.map((axis, i) => hidden || this._unscrollable(metrics[i].range, style[axis.overflow]));
    const corner = flags.some(Boolean) ? 0 : parseFloat(this._window.getComputedStyle(this._bar!).inlineSize) || 0;
    this._bars.forEach((bar, i) => {
      if (bar.hidden !== flags[i]) bar.hidden = flags[i];
      if (flags[i]) this._endBarDrag(bar);
    });
    this._bars.forEach((bar, i) => {
      const { client, size, scrollTop } = metrics[i];
      const sign = i === 1 && style.direction === 'rtl' ? -1 : 1;
      this._writeBar(bar, this._geometry(client, size, scrollTop, corner, i === 1), sign);
    });
  }

  destroy(): void {
    this._endDrag();
    if (this._frame !== undefined) this._window.cancelAnimationFrame(this._frame);
    this._frame = undefined;
    this._observer?.disconnect();
    this._modalObserver?.disconnect();
    this._childrenObserver?.disconnect();
    for (const bar of this._bars) bar.remove();
    this._bar = this._horizontal = undefined;
    this._unwrap();
    super.destroy();
  }
}
