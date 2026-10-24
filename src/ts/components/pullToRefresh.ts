import { Component, BaseOptions } from '../core/component';

/** What `expressive:refresh` carries, and what `onRefresh` receives. */
export interface PullToRefreshDetail {
  /** Keeps the refresh running until the promise settles, fulfilled or rejected. */
  waitUntil(promise: PromiseLike<unknown>): void;
}

export interface PullToRefreshOptions extends BaseOptions {
  /**
   * How far a finger must pull down, in pixels, for the release to refresh.
   * @default 64
   */
  threshold: number;
  /**
   * Called when a refresh starts, with the event's detail.
   * @default null
   */
  onRefresh: ((detail: PullToRefreshDetail) => void) | null;
}

const _defaults: PullToRefreshOptions = {
  threshold: 64,
  onRefresh: null
};

/** Past this the finger was moving, not resting. Hand jitter, in pixels. */
const SLOP = 4;
/** `overflow-y` values that give the container its own scroll. */
const SCROLLING = new Set(['auto', 'scroll']);

/**
 * Pull-to-refresh. A touch pull down from the top of the container, or a
 * `[data-refresh]` button inside it, starts a refresh. The refresh runs until
 * every promise passed to `waitUntil()` settles or the page calls `complete()`.
 *
 * Touch events rather than pointer events: a pointer drag the browser takes
 * for a pan ends in `pointercancel`, and Safari has no directional
 * `touch-action` to keep a downward pull from it. Browsers fire touch events
 * for a stylus and never for a mouse.
 */
export class PullToRefresh extends Component<PullToRefreshOptions> {
  static key = 'Expressive_PullToRefresh';
  /** Where the finger went down, while it may still become a pull. */
  private _start: { x: number; y: number } | null = null;
  private _pulling = false;
  private _travel = 0;
  /** The running refresh. A new object each time, so a promise from an earlier one cannot end it. */
  private _refresh: { pending: number } | null = null;

  constructor(el: HTMLElement, options: Partial<PullToRefreshOptions>) {
    super(el, options);
    const signal = this._events.signal;
    // Not passive: a pull cancels the move so the container does not also scroll.
    el.addEventListener('touchstart', this._onStart, { passive: true, signal });
    el.addEventListener('touchmove', this._onMove, { passive: false, signal });
    el.addEventListener('touchend', this._onEnd, { signal });
    el.addEventListener('touchcancel', this._endPull, { signal });
    el.addEventListener('click', this._onClick, { signal });
  }

  static get defaults(): PullToRefreshOptions {
    return _defaults;
  }

  /** Starts a refresh, as a pull or the refresh button does. Does nothing while one runs. */
  refresh() {
    if (this._refresh || PullToRefresh.getInstance(this.el) !== this) return;
    const run = { pending: 0 };
    this._refresh = run;
    this.el.setAttribute('aria-busy', 'true');
    const settle = () => {
      if (--run.pending === 0 && this._refresh === run) this.complete();
    };
    const detail: PullToRefreshDetail = {
      waitUntil: (promise) => {
        run.pending++;
        Promise.resolve(promise).then(settle, settle);
      }
    };
    this._notify('refresh', this.options.onRefresh, { args: [detail], detail });
  }

  /** Ends the running refresh: the indicator hides and `aria-busy` goes. */
  complete() {
    this._refresh = null;
    this.el.removeAttribute('aria-busy');
  }

  destroy() {
    this._endPull();
    this.complete();
    super.destroy();
  }

  /** The scroll position of the container, or of the page when the container does not scroll. */
  private _scrollTop() {
    const scrolls = SCROLLING.has(getComputedStyle(this.el).overflowY);
    return (scrolls ? this.el : this.el.ownerDocument.scrollingElement!).scrollTop;
  }

  private _onStart = (event: TouchEvent) => {
    if (this._refresh || event.touches.length !== 1 || this._scrollTop() > 0) return;
    const { clientX, clientY } = event.touches[0];
    this._start = { x: clientX, y: clientY };
  };

  private _onMove = (event: TouchEvent) => {
    if (!this._start) return;
    const { clientX, clientY } = event.touches[0];
    const [dx, dy] = [clientX - this._start.x, clientY - this._start.y];
    if (!this._pulling) this._decide(dx, dy);
    if (this._pulling) this._drag(event, dy);
  };

  /** Pulls once the finger moves down, or leaves the touch to scrolling when it moves another way first. */
  private _decide(dx: number, dy: number) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= SLOP) return;
    if (dy > Math.abs(dx) && this._scrollTop() <= 0) this._pulling = true;
    else this._start = null;
  }

  /** Moves the indicator down with the finger, at half its travel, and fades it in toward the threshold. */
  private _drag(event: TouchEvent, dy: number) {
    if (event.cancelable) event.preventDefault();
    const { threshold } = this.options;
    this._travel = Math.max(dy, 0);
    this.el.classList.add('pulling');
    this.el.style.setProperty('--pull-to-refresh-offset', `${Math.min(this._travel, threshold * 2) / 2}px`);
    this.el.style.setProperty('--pull-to-refresh-progress', `${Math.min(this._travel / threshold, 1)}`);
  }

  private _onEnd = () => {
    const ready = this._pulling && this._travel >= this.options.threshold;
    this._endPull();
    if (ready) this.refresh();
  };

  private _endPull = () => {
    this._start = null;
    this._pulling = false;
    this._travel = 0;
    this.el.classList.remove('pulling');
    this.el.style.removeProperty('--pull-to-refresh-offset');
    this.el.style.removeProperty('--pull-to-refresh-progress');
  };

  private _onClick = (event: MouseEvent) => {
    const button = (event.target as Element).closest('[data-refresh]');
    if (button && this.el.contains(button)) this.refresh();
  };
}
