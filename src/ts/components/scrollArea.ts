import { Component, BaseOptions } from '../core/component';

export interface ScrollAreaOptions extends BaseOptions {
  /** Milliseconds after activity before hiding the bar. @default 1000 */
  idleDelay: number;
}

type Axis = 'x' | 'y';
interface Bar {
  axis: Axis;
  rail: HTMLElement;
  thumb: HTMLElement;
  animation: Animation | null;
  travel: number;
  range: number;
  extent: number;
}

/** A decorative scrollbar over a native scrollport. Keyboard and touch stay native. */
export class ScrollArea extends Component<ScrollAreaOptions> {
  static key = 'Expressive_ScrollArea';
  static get defaults(): ScrollAreaOptions { return { idleDelay: 1000 }; }

  private _view: Window;
  private _page: boolean;
  private _wrapper: HTMLElement | null = null;
  private _styles = new Map<string, [string, string]>();
  private _bars: Bar[] = [];
  private _rtl = false;
  private _resize: ResizeObserver;
  private _observed = new Set<Element>();
  private _mutations: MutationObserver;
  private _media: MediaQueryList[];
  private _frame = 0;
  private _active = false;
  private _idleTimer = 0;
  private _over = new Set<Bar>();
  private _drag: { bar: Bar; pointer: number; start: number; scroll: number } | null = null;

  constructor(el: HTMLElement, options: Partial<ScrollAreaOptions> = {}) {
    super(el, options);
    this._view = el.ownerDocument.defaultView;
    this._page = el === el.ownerDocument.documentElement;
    for (const axis of ['y', 'x'] as const) {
      const rail = el.ownerDocument.createElement('div');
      rail.className = `scroll-area-bar ${axis === 'y' ? 'vertical' : 'horizontal'}${this._page ? ' page' : ''}`;
      rail.setAttribute('aria-hidden', 'true');
      const thumb = el.ownerDocument.createElement('div');
      thumb.className = 'scroll-area-thumb';
      rail.append(thumb);
      const bar: Bar = { axis, rail, thumb, animation: null, travel: 0, range: 0, extent: 0 };
      this._bars.push(bar);
      const { signal } = this._events;
      rail.addEventListener('pointerenter', () => { this._over.add(bar); this._wake(); }, { signal });
      rail.addEventListener('pointerleave', () => { this._over.delete(bar); this._scheduleIdle(); }, { signal });
      rail.addEventListener('pointerdown', event => this._down(event, bar), { signal });
      rail.addEventListener('pointermove', this._move, { signal });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) rail.addEventListener(type, this._end, { signal });
    }
    if (this._page) el.ownerDocument.body.append(...this._bars.map(bar => bar.rail));
    else this._wrap();
    const { signal } = this._events;
    this._view.addEventListener('blur', this._end, { signal });
    this._media = ['(forced-colors: active)', '(pointer: coarse)'].map(query => this._view.matchMedia(query));
    this._media.forEach(media => media.addEventListener('change', this.refresh, { signal }));
    this._view.addEventListener('resize', this.refresh, { signal });
    (this._page ? el.ownerDocument : el).addEventListener('scroll', this._scroll, { signal, passive: true });
    el.addEventListener('load', this.refresh, { signal, capture: true });
    this._resize = new ResizeObserver(this.refresh);

    // A fixed-height scrollport need not resize when its children change.
    this._mutations = new MutationObserver(records => {
      if (records.some(record => !this._bars.some(bar => bar.rail.contains(record.target)) && !(record.target === this.el && record.attributeName === 'class'))) this.refresh();
    });
    this._mutations.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'dir'] });
    this.refresh();
  }

  /** Re-measure after application layout changes that do not resize content. */
  refresh = () => {
    if (this._events.signal.aborted || this._frame) return;
    this._frame = this._view.requestAnimationFrame(() => {
      this._frame = 0;
      this._measure();
    });
  };

  private _measure() {
    const targets = new Set<Element>([this.el, ...this.el.children]);
    if (this._page) targets.add(this.el.ownerDocument.body);
    for (const bar of this._bars) targets.delete(bar.rail);
    for (const old of this._observed) if (!targets.has(old)) this._resize.unobserve(old);
    for (const target of targets) if (!this._observed.has(target)) this._resize.observe(target);
    this._observed = targets;
    this._active = !this._media.some(media => media.matches);
    if (!this._active) this._end();
    this.el.classList.toggle('scroll-area-enhanced', this._active);
    const style = this._view.getComputedStyle(this.el);
    this._rtl = style.direction === 'rtl';
    for (const bar of this._bars) {
      bar.rail.style.colorScheme = style.colorScheme;
      for (const property of ['--scroll-area-thumb-color', '--scroll-area-track-color', '--scroll-area-inset-start', '--scroll-area-inset-end', '--scroll-area-z', '--md-sys-motion-spring-fast-spatial-duration', '--md-sys-motion-spring-fast-spatial']) {
        bar.rail.style.setProperty(property, style.getPropertyValue(property));
      }
      bar.rail.style.setProperty('--scroll-area-thumb-color', style.getPropertyValue('--scroll-area-thumb-color') || style.getPropertyValue('--md-sys-color-on-surface-variant'));
      bar.extent = bar.axis === 'y' ? this.el.clientHeight : this.el.clientWidth;
      const total = bar.axis === 'y' ? this.el.scrollHeight : this.el.scrollWidth;
      bar.range = Math.max(0, total - bar.extent);
      bar.rail.hidden = !this._active || !bar.range;
      bar.rail.style.direction = this._rtl ? 'rtl' : 'ltr';
    }
    for (const bar of this._bars) {
      const other = this._bars.find(candidate => candidate !== bar);
      const corner = other.range ? 16 : 0;
      bar.rail.classList.toggle('both', !!corner);
      if (this._wrapper) {
        const box = this.el.getBoundingClientRect(), frame = this._wrapper.getBoundingClientRect();
        const left = box.left - frame.left + this.el.clientLeft;
        const top = box.top - frame.top + this.el.clientTop;
        const vertical = bar.axis === 'y';
        bar.rail.style.inset = 'auto';
        bar.rail.style.top = `${top + (vertical ? 0 : this.el.clientHeight - 16)}px`;
        bar.rail.style.left = `${left + (vertical ? (this._rtl ? 0 : this.el.clientWidth - 16) : (this._rtl ? corner : 0))}px`;
        bar.rail.style.width = `${vertical ? 16 : this.el.clientWidth - corner}px`;
        bar.rail.style.height = `${vertical ? this.el.clientHeight - corner : 16}px`;
      }
      const length = bar.axis === 'y' ? bar.rail.clientHeight : bar.rail.clientWidth;
      const thumb = Math.min(length, Math.max(24, length * bar.extent / Math.max(bar.extent, bar.range + bar.extent)));
      bar.thumb.style[bar.axis === 'y' ? 'height' : 'width'] = `${thumb}px`;
      bar.travel = length - thumb;
      bar.animation?.cancel();
      bar.animation = null;
      const Timeline = (this._view as unknown as { ScrollTimeline?: new (options: object) => AnimationTimeline }).ScrollTimeline;
      if (this._active && bar.range && Timeline && bar.thumb.animate) {
        const reverse = bar.axis === 'x' && this._rtl;
        bar.animation = bar.thumb.animate(
          [{ transform: this._transform(bar, reverse ? bar.travel : 0) },
            { transform: this._transform(bar, reverse ? 0 : bar.travel) }],
          { timeline: new Timeline({ source: this.el, axis: bar.axis }), fill: 'both' }
        );
      }
    }
    this._position();
    this._wake();
  }

  private _wrap() {
    const wrapper = this.el.ownerDocument.createElement('div');
    wrapper.className = 'scroll-area-frame';
    const style = this._view.getComputedStyle(this.el);
    for (const property of ['flex', 'align-self', 'justify-self', 'order', 'grid-area', 'min-width', 'min-height']) {
      wrapper.style.setProperty(property, style.getPropertyValue(property));
    }
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      wrapper.style.setProperty(`margin-${edge}`, style.getPropertyValue(`margin-${edge}`));
      this._override(`margin-${edge}`, '0px');
    }
    for (const property of ['grid-row-start', 'grid-row-end', 'grid-column-start', 'grid-column-end']) this._override(property, '1');
    // Inline percentage sizes need the original containing block, not an
    // auto-sized intermediate grid. Transfer those constraints to the frame.
    for (const property of ['width', 'height']) {
      if (this.el.style.getPropertyValue(property).includes('%')) {
        wrapper.style.setProperty(property, this.el.style.getPropertyValue(property));
        this._override(property, '100%');
      }
    }
    this.el.before(wrapper);
    wrapper.append(this.el, ...this._bars.map(bar => bar.rail));
    this._wrapper = wrapper;
  }

  private _override(property: string, value: string) {
    this._styles.set(property, [this.el.style.getPropertyValue(property), this.el.style.getPropertyPriority(property)]);
    this.el.style.setProperty(property, value);
  }

  private _offset(bar: Bar) {
    return bar.axis === 'y' ? this.el.scrollTop : Math.abs(this.el.scrollLeft);
  }

  private _coordinate(event: PointerEvent, bar: Bar) {
    return bar.axis === 'y' ? event.clientY : event.clientX;
  }

  private _down(event: PointerEvent, bar: Bar) {
    if (!this._active || event.button !== 0 || !event.isPrimary || !bar.range) return;
    event.preventDefault();
    this._wake();
    if (bar.thumb.contains(event.target as Node)) {
      this._end();
      this._drag = { bar, pointer: event.pointerId, start: this._coordinate(event, bar), scroll: this._offset(bar) };
      bar.rail.setPointerCapture(event.pointerId);
      bar.rail.classList.add('dragging');
    } else {
      const box = bar.thumb.getBoundingClientRect();
      let direction = this._coordinate(event, bar) < (bar.axis === 'y' ? box.top : box.left) ? -1 : 1;
      if (bar.axis === 'x' && this._rtl) direction *= -1;
      this._setScroll(bar, this._offset(bar) + direction * bar.extent);
    }
  }

  private _move = (event: PointerEvent) => {
    if (!this._drag || event.pointerId !== this._drag.pointer) return;
    const { bar, start, scroll } = this._drag;
    if (!bar.travel) return;
    const sign = bar.axis === 'x' && this._rtl ? -1 : 1;
    this._setScroll(bar, scroll + sign * (this._coordinate(event, bar) - start) / bar.travel * bar.range);
  };

  private _end = () => {
    const drag = this._drag;
    this._drag = null;
    if (!drag) return;
    drag.bar.rail.classList.remove('dragging');
    if (drag.bar.rail.hasPointerCapture(drag.pointer)) drag.bar.rail.releasePointerCapture(drag.pointer);
    this._scheduleIdle();
  };

  private _setScroll(bar: Bar, offset: number) {
    const value = Math.max(0, Math.min(bar.range, offset));
    const position = bar.axis === 'y' ? { top: value } : { left: this._rtl ? -value : value };
    (this._page ? this._view : this.el).scrollTo({ ...position, behavior: 'instant' });
  }

  private _transform(bar: Bar, distance: number) { return `translate${bar.axis.toUpperCase()}(${distance}px)`; }

  private _wake() {
    for (const bar of this._bars) bar.rail.classList.remove('idle');
    this._scheduleIdle();
  }

  private _scheduleIdle() {
    this._view.clearTimeout(this._idleTimer);
    this._idleTimer = 0;
    if (this._events.signal.aborted || !this._active || this._over.size || this._drag) return;
    const delay = Number.isFinite(this.options.idleDelay) && this.options.idleDelay >= 0 ? this.options.idleDelay : 1000;
    this._idleTimer = this._view.setTimeout(() => {
      this._idleTimer = 0;
      for (const bar of this._bars) bar.rail.classList.add('idle');
    }, delay);
  }

  private _scroll = () => { this._position(); this._wake(); };

  private _position() {
    for (const bar of this._bars) if (!bar.animation) {
      let fraction = bar.range ? Math.max(0, Math.min(1, this._offset(bar) / bar.range)) : 0;
      if (bar.axis === 'x' && this._rtl) fraction = 1 - fraction;
      bar.thumb.style.transform = this._transform(bar, fraction * bar.travel);
    }
  }

  destroy() {
    this._end();
    this._view.clearTimeout(this._idleTimer);
    this._view.cancelAnimationFrame(this._frame);
    this._resize.disconnect();
    this._mutations.disconnect();
    for (const bar of this._bars) {
      bar.animation?.cancel();
      bar.rail.remove();
    }
    if (this._wrapper) {
      this._wrapper.replaceWith(this.el);
      this._wrapper = null;
    }
    for (const [property, [value, priority]] of this._styles) this.el.style.setProperty(property, value, priority);
    this._styles.clear();
    this.el.classList.remove('scroll-area-enhanced');
    super.destroy();
  }
}
