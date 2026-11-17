import { Component, BaseOptions } from '../core/component';

export interface ScrollAreaOptions extends BaseOptions {}

/** A decorative scrollbar over a native scrollport. Keyboard and touch stay native. */
export class ScrollArea extends Component<ScrollAreaOptions> {
  static key = 'Expressive_ScrollArea';
  static get defaults(): ScrollAreaOptions { return {}; }

  private _view: Window;
  private _page: boolean;
  private _rail: HTMLElement;
  private _thumb: HTMLElement;
  private _resize: ResizeObserver;
  private _mutations: MutationObserver;
  private _media: MediaQueryList[];
  private _frame = 0;
  private _animation: Animation | null = null;
  private _travel = 0;
  private _range = 0;
  private _active = false;
  private _drag: { pointer: number; start: number; scroll: number } | null = null;

  constructor(el: HTMLElement, options: Partial<ScrollAreaOptions> = {}) {
    super(el, options);
    this._view = el.ownerDocument.defaultView;
    this._page = el === el.ownerDocument.documentElement;
    this._rail = el.ownerDocument.createElement('div');
    this._rail.className = 'scroll-area-bar vertical page';
    this._rail.setAttribute('aria-hidden', 'true');
    this._thumb = el.ownerDocument.createElement('div');
    this._thumb.className = 'scroll-area-thumb';
    this._rail.append(this._thumb);
    el.ownerDocument.body.append(this._rail);
    const { signal } = this._events;
    this._rail.addEventListener('pointerdown', this._down, { signal });
    this._rail.addEventListener('pointermove', this._move, { signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this._rail.addEventListener(type, this._end, { signal });
    }
    this._view.addEventListener('blur', this._end, { signal });
    this._media = ['(forced-colors: active)', '(pointer: coarse)'].map(query => this._view.matchMedia(query));
    this._media.forEach(media => media.addEventListener('change', this.refresh, { signal }));
    this._view.addEventListener('resize', this.refresh, { signal });
    el.ownerDocument.addEventListener('scroll', this._scroll, { signal, passive: true });
    el.addEventListener('load', this.refresh, { signal, capture: true });
    this._resize = new ResizeObserver(this.refresh);
    this._resize.observe(el);
    this._resize.observe(el.ownerDocument.body);
    // A fixed-height scrollport need not resize when its children change.
    this._mutations = new MutationObserver(records => {
      if (records.some(record => !this._rail.contains(record.target))) this.refresh();
    });
    this._mutations.observe(el, { childList: true, subtree: true, characterData: true });
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
    this._active = this._page && !this._media.some(media => media.matches);
    if (!this._active) this._end();
    this.el.classList.toggle('scroll-area-enhanced', this._active);
    this._rail.hidden = !this._active;
    const extent = this.el.clientHeight;
    this._range = Math.max(0, this.el.scrollHeight - extent);
    this._rail.hidden ||= !this._range;
    const length = this._rail.clientHeight;
    const thumb = Math.min(length, Math.max(24, length * extent / Math.max(extent, this.el.scrollHeight)));
    this._thumb.style.height = `${thumb}px`;
    this._travel = length - thumb;
    this._animation?.cancel();
    this._animation = null;
    // WAAPI ScrollTimeline keeps position on the compositor where supported.
    // Other engines use the same geometry in a passive scroll listener.
    const Timeline = (this._view as unknown as { ScrollTimeline?: new (options: object) => AnimationTimeline }).ScrollTimeline;
    if (this._active && this._range && Timeline && this._thumb.animate) {
      this._animation = this._thumb.animate(
        [{ transform: 'translateY(0)' }, { transform: `translateY(${this._travel}px)` }],
        { timeline: new Timeline({ source: this.el, axis: 'y' }), fill: 'both' }
      );
    }
    this._position();
  }

  private _down = (event: PointerEvent) => {
    if (!this._active || event.button !== 0 || !event.isPrimary || !this._range) return;
    event.preventDefault();
    if (this._thumb.contains(event.target as Node)) {
      this._drag = { pointer: event.pointerId, start: event.clientY, scroll: this.el.scrollTop };
      this._rail.setPointerCapture(event.pointerId);
      this._rail.classList.add('dragging');
    } else {
      const direction = event.clientY < this._thumb.getBoundingClientRect().top ? -1 : 1;
      this._setScroll(this.el.scrollTop + direction * this.el.clientHeight);
    }
  };

  private _move = (event: PointerEvent) => {
    if (!this._drag || event.pointerId !== this._drag.pointer || !this._travel) return;
    this._setScroll(this._drag.scroll + (event.clientY - this._drag.start) / this._travel * this._range);
  };

  private _end = () => {
    const pointer = this._drag?.pointer;
    this._drag = null;
    this._rail.classList.remove('dragging');
    if (pointer !== undefined && this._rail.hasPointerCapture(pointer)) this._rail.releasePointerCapture(pointer);
  };

  private _setScroll(top: number) {
    this._view.scrollTo({ top, behavior: 'instant' });
  }

  private _scroll = () => { this._position(); };

  private _position() {
    if (!this._animation) {
      const fraction = this._range ? Math.max(0, Math.min(1, this.el.scrollTop / this._range)) : 0;
      this._thumb.style.transform = `translateY(${fraction * this._travel}px)`;
    }
  }

  destroy() {
    this._end();
    this._view.cancelAnimationFrame(this._frame);
    this._resize.disconnect();
    this._mutations.disconnect();
    this._animation?.cancel();
    this._rail.remove();
    this.el.classList.remove('scroll-area-enhanced');
    super.destroy();
  }
}
