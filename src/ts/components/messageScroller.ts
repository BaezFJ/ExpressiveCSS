import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface MessageScrollerOptions extends BaseOptions {
  /**
   * If true, the viewport follows new content while the reader is at the
   * end, and a newly appended scroll anchor is brought to the top.
   * @default true
   */
  autoScroll: boolean;
  /**
   * Where the transcript opens: `'end'`, `'start'`, or `'last-anchor'`, the
   * start of the last anchored turn. `'last-anchor'` opens at the end when
   * that turn already fits in the viewport.
   * @default 'end'
   */
  defaultScrollPosition: 'start' | 'end' | 'last-anchor';
  /**
   * Pixels of the previous message left visible above an anchored turn or a
   * message reached with `scrollToMessage()`.
   * @default 64
   */
  peek: number;
}

const _defaults: MessageScrollerOptions = {
  autoScroll: true,
  defaultScrollPosition: 'end',
  peek: 64
};

// Distance from a scroll target, in px, that still counts as reaching it.
// Fractional layouts rarely land on the exact pixel.
const EDGE = 2;

// Keys that scroll toward the start. They release following at once, before
// the next streamed chunk can pull the viewport back to the end.
const UP_KEYS = new Set(['ArrowUp', 'PageUp', 'Home']);

// Listened on the document: a scrollbar drag can end outside the viewport.
const RELEASE_EVENTS = ['pointerup', 'pointercancel', 'touchend', 'touchcancel'];

type Target = number | 'end';

/**
 * A chat scroll container: a `.message-scroller` frame holding a scrolling
 * `.message-scroller-viewport` of messages and an optional
 * `.message-scroller-button`. Every child of the viewport is one message.
 *
 * While the reader is at the end, the viewport follows streamed output.
 * Scrolling toward the start releases it; reaching the end again, or the
 * button, resumes it. An appended message marked `data-scroll-anchor` starts a
 * turn and is scrolled to the top, with blank space below it until the reply
 * fills the viewport. Messages added above keep the reader's place.
 */
export class MessageScroller extends Component<MessageScrollerOptions> {
  /** The scrolling element. */
  viewport: HTMLElement;
  /** The scroll-to-latest button, if present. */
  button: HTMLButtonElement | null;
  private _opened = false;
  private _following = false;
  /** A press is down: it may be a tap or a scrollbar drag. */
  private _holding = false;
  private _lastTop = 0;
  /** Where a programmatic scroll is heading; null when none is running. */
  private _target: Target | null = null;
  /** Distance left to the target at the last scroll event. */
  private _distance = Infinity;
  /** The first visible message and its offset from the viewport top. */
  private _ref: Element | null = null;
  private _refOffset = 0;
  /** The latest anchored turn, which the spacer lets reach the top. */
  private _anchor: Element | null = null;
  private _spacer = 0;
  private _last: Element | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _mutationObserver: MutationObserver | null = null;

  constructor(el: HTMLElement, options: Partial<MessageScrollerOptions>) {
    super(el, options, MessageScroller);
    this.el['Expressive_MessageScroller'] = this;
    this.options = {
      ...MessageScroller.defaults,
      ...options
    };
    this.viewport = el.querySelector(':scope > .message-scroller-viewport');
    this.button = el.querySelector(':scope > .message-scroller-button');
    if (!this.viewport) {
      console.error('MessageScroller needs a .message-scroller-viewport child.');
      return;
    }
    this._last = this.viewport.lastElementChild;
    // A viewport that is not rendered yet (a closed dialog, a hidden tab)
    // has no size to position against; it opens on its first resize.
    if (this.viewport.clientHeight > 0) this._open();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(this._handleResize);
      // Border box: the spacer changes the padding, which must not count.
      this._resizeObserver.observe(this.viewport, { box: 'border-box' });
      for (const item of Array.from(this.viewport.children)) this._resizeObserver.observe(item);
    }
    this._mutationObserver = new MutationObserver(this._handleMutations);
    this._mutationObserver.observe(this.viewport, { childList: true });
    this.viewport.addEventListener('scroll', this._handleScroll, { passive: true });
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      this.viewport.addEventListener(type, this._handleUserScroll, { passive: true });
    }
    for (const type of RELEASE_EVENTS) document.addEventListener(type, this._handleRelease);
    this.button?.addEventListener('click', this._handleButtonClick);
  }

  static get defaults(): MessageScrollerOptions {
    return _defaults;
  }

  /**
   * Initializes instance of MessageScroller.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<MessageScrollerOptions>): MessageScroller;
  /**
   * Initializes instances of MessageScroller.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<InitElement>,
    options?: Partial<MessageScrollerOptions>
  ): MessageScroller[];
  /**
   * Initializes instances of MessageScroller.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<MessageScrollerOptions> = {}
  ): MessageScroller | MessageScroller[] {
    return super.init(els, options, MessageScroller);
  }

  static getInstance(el: HTMLElement): MessageScroller {
    return el['Expressive_MessageScroller'];
  }

  destroy() {
    this.el['Expressive_MessageScroller'] = undefined;
    if (!this.viewport) return;
    this._resizeObserver?.disconnect();
    this._mutationObserver?.disconnect();
    this.viewport.removeEventListener('scroll', this._handleScroll);
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      this.viewport.removeEventListener(type, this._handleUserScroll);
    }
    for (const type of RELEASE_EVENTS) document.removeEventListener(type, this._handleRelease);
    this.viewport.style.removeProperty('--md-comp-message-scroller-spacer');
    if (this.button) {
      this.button.removeEventListener('click', this._handleButtonClick);
      this.button.inert = false;
    }
  }

  /** Scrolls to the latest message and resumes following. */
  scrollToEnd() {
    // Set now: output streaming faster than the scroll can end it early.
    this._following = this.options.autoScroll;
    this._scrollTo('end');
  }

  /** Scrolls to the first message. */
  scrollToStart() {
    this._following = false;
    this._scrollTo(0);
  }

  /**
   * Scrolls the element with this id to the top of the viewport, below the
   * peek, and stops following.
   * @returns false when no such element is inside the viewport.
   */
  scrollToMessage(id: string): boolean {
    const target = Utils.getElementById(this.viewport, id);
    if (!target || !this.viewport.contains(target)) return false;
    this._following = false;
    this._scrollTo(this._top(target) - this.options.peek);
    return true;
  }

  private _open() {
    this._opened = true;
    const v = this.viewport;
    const position = this.options.defaultScrollPosition;
    const anchors = v.querySelectorAll(':scope > [data-scroll-anchor]');
    const anchor = position === 'last-anchor' ? anchors[anchors.length - 1] : null;
    if (position === 'start') v.scrollTop = 0;
    else if (anchor && this._contentEnd() - this._top(anchor) + this.options.peek > v.clientHeight) {
      v.scrollTop = this._top(anchor) - this.options.peek;
    } else v.scrollTop = v.scrollHeight;
    this._settle();
  }

  /**
   * Records where the reader is once no programmatic scroll is running.
   * Content can grow between a scroll and the resize that re-pins the end,
   * so only moving toward the start releases following.
   */
  private _settle() {
    const top = this.viewport.scrollTop;
    const kept = this._following && top >= this._lastTop - EDGE;
    this._following = this.options.autoScroll && (kept || this._atEnd());
    this._lastTop = top;
    this._capture();
    this._sync();
  }

  // A programmatic scroll ends when it arrives, or when a scroll moves away
  // from its target because something else took over.
  private _handleScroll = () => {
    if (this._target !== null) {
      const distance = Math.abs(this.viewport.scrollTop - this._resolve(this._target));
      if (distance > EDGE && distance < this._distance) {
        this._distance = distance;
        return;
      }
      this._target = null;
    }
    this._settle();
  };

  private _handleUserScroll = (e: Event) => {
    if (e.type === 'wheel' && (e as WheelEvent).deltaY >= 0) return;
    if (e.type === 'keydown' && !UP_KEYS.has((e as KeyboardEvent).key)) return;
    this._target = null;
    // A press may be a tap on a message or the start of a drag. Hold the end
    // until it is released; a scroll toward the start releases following.
    if (e.type === 'pointerdown' || e.type === 'touchstart') this._holding = true;
    else this._following = false;
  };

  private _handleRelease = () => {
    if (!this._holding) return;
    this._holding = false;
    if (this._following) this.viewport.scrollTop = this.viewport.scrollHeight;
    this._sync();
  };

  private _handleButtonClick = () => this.scrollToEnd();

  private _handleMutations = (records: MutationRecord[]) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) this._resizeObserver?.observe(node);
      });
      record.removedNodes.forEach((node) => {
        if (node instanceof Element) this._resizeObserver?.unobserve(node);
      });
    }
    const previous = this._last;
    this._last = this.viewport.lastElementChild;
    if (!this._opened) return;
    // Restore here, not only on resize: this runs before any scroll event
    // that could record the shifted position as the reader's place.
    if (!this._following && this._target === null) this._restore();
    if (!this.options.autoScroll) return;
    // Only messages appended after the previous last one start a new turn;
    // anchors in prepended history do not. If the last one was removed, the
    // list was replaced and nothing counts as appended.
    if (previous && previous.parentElement !== this.viewport) return;
    for (let item = this._last; item && item !== previous; item = item.previousElementSibling) {
      if (item.hasAttribute('data-scroll-anchor')) {
        this._anchor = item;
        this._updateSpacer();
        // Follow the reply once the turn reaches the top, unless the reader
        // scrolls away first. _settle keeps it because the scroll went down.
        this._following = true;
        this._scrollTo(this._top(item) - this.options.peek);
        return;
      }
    }
  };

  private _handleResize = () => {
    if (!this._opened) {
      if (this.viewport.clientHeight > 0) this._open();
      return;
    }
    this._updateSpacer();
    const v = this.viewport;
    if (this._target === 'end') this._scrollTo('end');
    else if (this._target === null) {
      if (this._following && !this._holding) v.scrollTop = v.scrollHeight;
      else this._restore();
    }
    this._sync();
  };

  private _scrollTo(target: Target) {
    const v = this.viewport;
    if (Math.abs(v.scrollTop - this._resolve(target)) <= EDGE) {
      this._target = null;
      this._settle();
      return;
    }
    this._target = target;
    this._distance = Infinity;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    v.scrollTo({
      top: target === 'end' ? v.scrollHeight : target,
      behavior: reduce ? 'auto' : 'smooth'
    });
  }

  private _resolve(target: Target) {
    const max = this.viewport.scrollHeight - this.viewport.clientHeight;
    return target === 'end' ? max : Math.max(0, Math.min(target, max));
  }

  private _atEnd() {
    const v = this.viewport;
    return v.scrollHeight - v.scrollTop - v.clientHeight <= EDGE;
  }

  /** Offset of an element from the top of the scrolled content. */
  private _top(el: Element) {
    const v = this.viewport;
    return el.getBoundingClientRect().top - v.getBoundingClientRect().top - v.clientTop + v.scrollTop;
  }

  /** Bottom of the content without the spacer, padding included. */
  private _contentEnd() {
    const last = this.viewport.lastElementChild;
    if (!last) return 0;
    const padding = parseFloat(getComputedStyle(this.viewport).paddingBlockEnd) - this._spacer;
    return this._top(last) + last.getBoundingClientRect().height + padding;
  }

  /** Remembers the first visible message so prepends can keep it in place. */
  private _capture() {
    const items = this.viewport.children;
    const top = this.viewport.getBoundingClientRect().top + this.viewport.clientTop;
    let low = 0;
    let high = items.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (items[mid].getBoundingClientRect().bottom > top) high = mid;
      else low = mid + 1;
    }
    this._ref = items[low] ?? null;
    this._refOffset = this._ref ? this._ref.getBoundingClientRect().top - top : 0;
  }

  /** Moves the remembered message back to where the reader last saw it. */
  private _restore() {
    if (this._ref?.parentElement !== this.viewport) {
      this._capture();
      return;
    }
    const top = this.viewport.getBoundingClientRect().top + this.viewport.clientTop;
    const delta = this._ref.getBoundingClientRect().top - top - this._refOffset;
    if (Math.abs(delta) >= 1) this.viewport.scrollTop += delta;
  }

  /** Sizes the blank space that lets the latest anchored turn reach the top. */
  private _updateSpacer() {
    let space = 0;
    if (this._anchor?.parentElement === this.viewport) {
      const room = this._top(this._anchor) - this.options.peek + this.viewport.clientHeight;
      space = Math.max(0, Math.ceil(room - this._contentEnd()));
    } else this._anchor = null;
    if (space === this._spacer) return;
    this._spacer = space;
    if (space) this.viewport.style.setProperty('--md-comp-message-scroller-spacer', `${space}px`);
    else this.viewport.style.removeProperty('--md-comp-message-scroller-spacer');
  }

  /** The button is inert while there is nothing below. */
  private _sync() {
    if (!this.button) return;
    const idle = this._atEnd();
    // The button's own root: inside a shadow root, document.activeElement is the host.
    const root = this.button.getRootNode() as Document | ShadowRoot;
    if (idle && root.activeElement === this.button) this.viewport.focus({ preventScroll: true });
    this.button.inert = idle;
  }
}
