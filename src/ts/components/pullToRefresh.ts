import { Component, BaseOptions } from '../core/component';
import { Utils } from '../core/utils';

/** What `expressive:refresh` carries, and what `onRefresh` receives. */
export interface PullToRefreshDetail {
  /** Keeps the refresh running until the promise settles, fulfilled or rejected. */
  waitUntil(promise: PromiseLike<unknown>): void;
}

/** What the container's status region announces. */
export interface PullToRefreshI18nOptions {
  /** Announced when a refresh starts. */
  refreshing: string;
  /** Announced when it finishes. */
  refreshed: string;
}

export interface PullToRefreshOptions extends BaseOptions {
  /**
   * How far a finger must pull down, in pixels, for the release to refresh.
   * A value that is not a positive number falls back to the default.
   * @default 64
   */
  threshold: number;
  /**
   * Called when a refresh starts, with the event's detail.
   * @default null
   */
  onRefresh: ((detail: PullToRefreshDetail) => void) | null;
  /** What the status region announces when a refresh starts and finishes. */
  i18n: Partial<PullToRefreshI18nOptions>;
}

const _defaults: PullToRefreshOptions = {
  threshold: 64,
  onRefresh: null,
  i18n: {
    refreshing: 'Refreshing',
    refreshed: 'Refreshed'
  }
};

/** One refresh, with how many `waitUntil()` promises it still waits for. */
type Run = { pending: number };

/** Past this the finger was moving, not resting. Hand jitter, in pixels. */
const SLOP = 4;
/** `overflow-y` values that make an element a scroll container. */
const SCROLLING = new Set(['auto', 'scroll']);

/**
 * Whether the walk up from a touch stops at `node`: a scroll container that
 * is scrolled down, so a downward drag scrolls it, or the one that holds the
 * pull-to-refresh container, which decides on its own.
 */
const stopsAt = (node: Element, el: Element) =>
  SCROLLING.has(getComputedStyle(node).overflowY) && (node.scrollTop > 0 || node.contains(el));

/**
 * Pull-to-refresh. A touch pull down from the top of the container, or a
 * `[data-refresh]` button inside it, starts a refresh. The refresh runs until
 * every promise passed to `waitUntil()` settles or the page calls `complete()`.
 *
 * Touch events rather than pointer events: a pointer drag the browser takes
 * for a pan ends in `pointercancel`, and Safari has no directional
 * `touch-action` to keep a downward pull from it. A mouse never fires touch
 * events; a stylus does where the browser reports it as touch, as Safari on
 * iPadOS does.
 */
export class PullToRefresh extends Component<PullToRefreshOptions> {
  static key = 'Expressive_PullToRefresh';
  /** Where the finger went down and on what, while it may still become a pull. */
  private _start: { x: number; y: number; target: Element | null } | null = null;
  private _pulling = false;
  private _travel = 0;
  /** The running refresh. A new object each time, so a promise from an earlier one cannot end it. */
  private _refresh: Run | null = null;
  /**
   * Announces the start and the finish. The author's indicator cannot: it is
   * hidden once the refresh ends, which would drop the finish.
   */
  private _status: HTMLElement;

  constructor(el: HTMLElement, options: Partial<PullToRefreshOptions>) {
    super(el, options);
    // Markup options are untrusted; zero or less would refresh on any pull.
    if (!(this.options.threshold > 0)) this.options.threshold = _defaults.threshold;
    this._status = el.ownerDocument.createElement('span');
    this._status.className = 'pull-to-refresh-status';
    this._status.setAttribute('role', 'status');
    el.append(this._status);
    const signal = this._events.signal;
    el.addEventListener('touchstart', this._onStart, { passive: true, signal });
    // Not passive: a pull cancels the move so the container does not also scroll.
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
    const run: Run = { pending: 0 };
    this._refresh = run;
    this.el.setAttribute('aria-busy', 'true');
    this._status.textContent = this.options.i18n.refreshing;
    const settle = () => {
      if (--run.pending === 0 && this._refresh === run) this.complete();
    };
    const detail: PullToRefreshDetail = {
      waitUntil: (promise) => {
        run.pending++;
        // finally() passes a rejection on, so a failure the page does not
        // catch still reaches unhandledrejection.
        Promise.resolve(promise).finally(settle);
      }
    };
    this._fireRefresh(run, detail);
  }

  /** Ends the running refresh: the indicator hides, `aria-busy` goes and the finish is announced. */
  complete() {
    if (this._refresh) this._status.textContent = this.options.i18n.refreshed;
    this._refresh = null;
    this.el.removeAttribute('aria-busy');
  }

  destroy() {
    this._endPull();
    this.complete();
    this._status.remove();
    super.destroy();
  }

  /**
   * Runs `onRefresh` and fires the event. A callback that throws ends the
   * refresh it started, so later pulls still work, and the error still reaches the page.
   */
  private _fireRefresh(run: Run, detail: PullToRefreshDetail) {
    try {
      this._notify('refresh', this.options.onRefresh, { args: [detail], detail });
    } catch (error) {
      if (this._refresh === run) this.complete();
      throw error;
    }
  }

  /**
   * Whether a downward drag from `target` would scroll something instead: a
   * scrolled-down scroller inside the container, the container itself, or
   * the scroller it sits in, which is the page when no ancestor scrolls.
   */
  private _canScrollUp(target: Element | null) {
    let node = target;
    while (node && !stopsAt(node, this.el)) node = node.parentElement;
    return (node ?? this.el.ownerDocument.scrollingElement!).scrollTop > 0;
  }

  private _onStart = (event: TouchEvent) => {
    if (this._refresh) return;
    // A second finger is a pinch or a mistake, not a pull.
    if (event.touches.length !== 1) {
      this._endPull();
      return;
    }
    const { clientX, clientY } = event.touches[0];
    this._start = { x: clientX, y: clientY, target: Utils.eventTarget(event) };
  };

  private _onMove = (event: TouchEvent) => {
    if (!this._start) return;
    const { clientX, clientY } = event.touches[0];
    const dx = clientX - this._start.x;
    const dy = clientY - this._start.y;
    if (!this._pulling) this._decide(dx, dy, this._start.target);
    if (this._pulling) this._drag(event, dy);
  };

  /** Pulls once the finger moves down, or leaves the touch to scrolling when it moves another way first. */
  private _decide(dx: number, dy: number, target: Element | null) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= SLOP) return;
    if (dy > Math.abs(dx) && !this._canScrollUp(target)) this._pulling = true;
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
    const button = Utils.eventTarget(event)?.closest('[data-refresh]');
    if (button && this.el.contains(button)) this.refresh();
  };
}
