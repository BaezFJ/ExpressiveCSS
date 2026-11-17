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

  private _scroll = () => { this._position(); };

  private _position() {
    if (!this._animation) {
      const fraction = this._range ? Math.max(0, Math.min(1, this.el.scrollTop / this._range)) : 0;
      this._thumb.style.transform = `translateY(${fraction * this._travel}px)`;
    }
  }

  destroy() {
    this._view.cancelAnimationFrame(this._frame);
    this._resize.disconnect();
    this._mutations.disconnect();
    this._animation?.cancel();
    this._rail.remove();
    this.el.classList.remove('scroll-area-enhanced');
    super.destroy();
  }
}
