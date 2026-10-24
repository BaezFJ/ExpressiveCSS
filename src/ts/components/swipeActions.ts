import { Component, BaseOptions } from '../core/component';
import { Utils } from '../core/utils';

/** What `expressive:swipetoggle` carries, and what `onToggle` receives. */
export interface SwipeActionsDetail {
  /** The row that opened or closed. */
  row: HTMLElement;
  /** Whether it is now open. */
  open: boolean;
}

export interface SwipeActionsOptions extends BaseOptions {
  /**
   * Called when a row opens or closes, with the event's detail.
   * @default null
   */
  onToggle: ((detail: SwipeActionsDetail) => void) | null;
}

const _defaults: SwipeActionsOptions = {
  onToggle: null
};

/** Past this the finger was moving, not resting. Hand jitter, in pixels. */
const SLOP = 4;
/** Past this a flick opens or closes whatever the distance, in pixels per millisecond. The sheets use the same. */
const FLICK_VELOCITY = 0.5;
/** Ignore a flick after the finger has rested for this many milliseconds. */
const FLICK_TIMEOUT = 100;

/** One touch on a row, from the finger going down until it lifts. */
interface Swipe {
  row: HTMLElement;
  x: number;
  y: number;
  /** -1 when the row opens toward the left, 1 toward the right (right-to-left pages). */
  sign: 1 | -1;
  /** How far the actions reach, which is as far as the row slides. */
  width: number;
  /** How far open the row was when the finger went down, 0 to `width`. */
  base: number;
  /** How far open it is now. */
  reveal: number;
  /** Set once the finger moves sideways first; until then the touch may still scroll. */
  swiping: boolean;
  last: number;
  lastT: number;
  velocity: number;
}

/** The pointer's velocity toward opening at release, or 0 once it has rested past the flick window. */
const flick = (swipe: Swipe) => (Date.now() - swipe.lastT < FLICK_TIMEOUT ? swipe.velocity * swipe.sign : 0);

/** Whether a released swipe leaves the row open: a flick decides, else whether it is past halfway. */
const opensOnRelease = (swipe: Swipe) => {
  const velocity = flick(swipe);
  if (Math.abs(velocity) > FLICK_VELOCITY) return velocity > 0;
  return swipe.reveal > swipe.width / 2;
};

/**
 * Swipe actions. In a `.list.swipeable`, a touch swipe toward a row's inline
 * start slides the row and reveals its `.swipe-actions` group at the inline
 * end. A swipe only reveals; nothing runs until a person presses an action.
 * The row's `[data-swipe-toggle]` button opens and closes it without a
 * swipe, and focus on an action opens its row, so keyboard and single-pointer
 * users reach the same actions. One row in the list is open at a time.
 *
 * Touch events rather than pointer events, as in PullToRefresh: a pointer
 * drag the browser takes for a pan ends in `pointercancel`. A mouse never
 * fires touch events, so it never swipes.
 */
export class SwipeActions extends Component<SwipeActionsOptions> {
  static key = 'Expressive_SwipeActions';
  /** The open row, if any. */
  private _open: HTMLElement | null = null;
  /** The touch in progress, while it may still become a swipe or is one. */
  private _swipe: Swipe | null = null;

  constructor(el: HTMLElement, options: Partial<SwipeActionsOptions>) {
    super(el, options);
    this._rows().forEach((row) => this._toggleFor(row)?.setAttribute('aria-expanded', 'false'));
    const signal = this._events.signal;
    const doc = el.ownerDocument;
    el.addEventListener('click', this._onClick, { signal });
    el.addEventListener('keydown', this._onKeydown, { signal });
    el.addEventListener('touchstart', this._onStart, { passive: true, signal });
    // Not passive: a swipe cancels the move so nothing scrolls sideways under it.
    el.addEventListener('touchmove', this._onMove, { passive: false, signal });
    el.addEventListener('touchcancel', this._onCancel, { signal });
    el.addEventListener('touchend', this._onEnd, { signal });
    doc.addEventListener('focusin', this._onFocusin, { signal });
    doc.addEventListener('pointerdown', this._onPointerdown, { signal });
  }

  static get defaults(): SwipeActionsOptions {
    return _defaults;
  }

  /** Opens a row of this list, closing the one that was open. */
  open(row: HTMLElement) {
    if (!this._isRow(row)) return;
    // Also puts back a row a swipe left part-way open.
    this._place(row, this._width(row));
    if (this._open === row) return;
    this.close();
    this._open = row;
    row.classList.add('swipe-open');
    this._toggleFor(row)?.setAttribute('aria-expanded', 'true');
    this._fire(row, true);
  }

  /** Closes the open row, if there is one. */
  close() {
    const row = this._open;
    if (!row) return;
    this._open = null;
    this._shut(row);
    this._fire(row, false);
  }

  destroy() {
    // A row part-way through a swipe goes back too, not only the open one.
    const rows = [this._swipe?.row, this._open];
    this._swipe = null;
    this._open = null;
    rows.forEach((row) => row && this._shut(row));
    this._rows().forEach((row) => this._toggleFor(row)?.removeAttribute('aria-expanded'));
    super.destroy();
  }

  private _rows() {
    return [...this.el.querySelectorAll<HTMLElement>(':scope > li:has(> .swipe-actions)')];
  }

  /** Whether `row` is a row of this list with actions. */
  private _isRow(row: Element | null): row is HTMLElement {
    return !!row && row.parentElement === this.el && !!row.querySelector(':scope > .swipe-actions');
  }

  private _rowFor(target: Element | null) {
    const row = target?.closest('li') ?? null;
    return this._isRow(row) ? row : null;
  }

  private _toggleFor(row: HTMLElement) {
    return row.querySelector<HTMLElement>('[data-swipe-toggle]');
  }

  private _width(row: HTMLElement) {
    return row.querySelector<HTMLElement>(':scope > .swipe-actions')!.offsetWidth;
  }

  /** -1 when rows open toward the left, 1 when they open toward the right. */
  private _sign(row: HTMLElement): 1 | -1 {
    return getComputedStyle(row).direction === 'rtl' ? 1 : -1;
  }

  /** Slides a row `reveal` pixels open. */
  private _place(row: HTMLElement, reveal: number) {
    row.style.setProperty('--swipe-offset', `${reveal * this._sign(row)}px`);
  }

  /** Puts a row back closed, without telling anyone. */
  private _shut(row: HTMLElement) {
    row.classList.remove('swipe-open', 'swiping');
    row.style.removeProperty('--swipe-offset');
    this._toggleFor(row)?.setAttribute('aria-expanded', 'false');
  }

  private _fire(row: HTMLElement, open: boolean) {
    const detail: SwipeActionsDetail = { row, open };
    this._notify('swipetoggle', this.options.onToggle, { args: [detail], detail });
  }

  private _onStart = (event: TouchEvent) => {
    // A second finger is a pinch or a mistake, not a swipe.
    if (event.touches.length !== 1) {
      this._cancel();
      return;
    }
    const row = this._rowFor(Utils.eventTarget(event));
    if (!row) return;
    const { clientX: x, clientY: y } = event.touches[0];
    const width = this._width(row);
    const base = row === this._open ? width : 0;
    this._swipe = { row, x, y, sign: this._sign(row), width, base, reveal: base, swiping: false, last: x, lastT: Date.now(), velocity: 0 };
  };

  private _onMove = (event: TouchEvent) => {
    const swipe = this._swipe;
    if (!swipe) return;
    const { clientX, clientY } = event.touches[0];
    if (swipe.swiping || this._decide(swipe, clientX - swipe.x, clientY - swipe.y)) this._drag(event, swipe, clientX);
  };

  /**
   * Swipes once the finger moves sideways, or leaves the touch to scrolling
   * when it moves up or down first. Returns whether it is now a swipe.
   */
  private _decide(swipe: Swipe, dx: number, dy: number) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= SLOP) return false;
    swipe.swiping = Math.abs(dx) > Math.abs(dy);
    if (!swipe.swiping) this._swipe = null;
    return swipe.swiping;
  }

  /** Slides the row with the finger, no farther than its actions reach. */
  private _drag(event: TouchEvent, swipe: Swipe, x: number) {
    if (event.cancelable) event.preventDefault();
    const now = Date.now();
    if (x !== swipe.last) {
      swipe.velocity = (x - swipe.last) / Math.max(1, now - swipe.lastT);
      swipe.last = x;
      swipe.lastT = now;
    }
    swipe.reveal = Math.min(Math.max(swipe.base + (x - swipe.x) * swipe.sign, 0), swipe.width);
    swipe.row.classList.add('swiping');
    this._place(swipe.row, swipe.reveal);
  }

  private _onEnd = () => {
    const swipe = this._swipe;
    this._swipe = null;
    if (!swipe?.swiping) return;
    swipe.row.classList.remove('swiping');
    this._settle(swipe.row, opensOnRelease(swipe));
  };

  /** Leaves a released row open or closed, putting its offset where that state has it. */
  private _settle(row: HTMLElement, open: boolean) {
    if (open) this.open(row);
    else if (row === this._open) this.close();
    else this._shut(row);
  }

  private _onCancel = () => this._cancel();

  /** Ends a swipe without deciding anything: the row goes back to how it was. */
  private _cancel() {
    const swipe = this._swipe;
    this._swipe = null;
    if (!swipe?.swiping) return;
    swipe.row.classList.remove('swiping');
    this._settle(swipe.row, swipe.row === this._open);
  }

  private _onClick = (event: MouseEvent) => {
    const target = Utils.eventTarget(event);
    const row = this._rowFor(target);
    if (!row) return;
    if (target.closest('[data-swipe-toggle]')) this._toggle(row);
    else if (target.closest('.swipe-actions button')) this._closeFrom(row);
  };

  private _toggle(row: HTMLElement) {
    if (row === this._open) this.close();
    else this.open(row);
  }

  /** Closes a row from inside its actions, moving focus to its toggle so it does not stay on a hidden button. */
  private _closeFrom(row: HTMLElement) {
    const focused = row.querySelector(':scope > .swipe-actions')!.contains(row.ownerDocument.activeElement);
    if (row === this._open) this.close();
    if (focused && row.isConnected) this._toggleFor(row)?.focus();
  }

  private _onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    const row = this._rowFor(Utils.eventTarget(event));
    if (row && row === this._open) this._closeFrom(row);
  };

  /** Focus on an action opens its row; focus anywhere outside the open row closes it. */
  private _onFocusin = (event: FocusEvent) => {
    const target = Utils.eventTarget(event);
    // open() ignores anything that is not a row of this list.
    if (target?.closest('.swipe-actions')) this.open(this._rowFor(target)!);
    else this._closeOutside(target);
  };

  /** A tap or click outside the open row closes it. */
  private _onPointerdown = (event: PointerEvent) => this._closeOutside(Utils.eventTarget(event));

  private _closeOutside(target: Element | null) {
    if (this._open && !this._open.contains(target)) this.close();
  }
}
