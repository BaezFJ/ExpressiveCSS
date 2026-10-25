import { Utils } from '../core/utils';
import { Component, BaseOptions } from '../core/component';

export interface HoverCardOptions extends BaseOptions {
  /**
   * How long the pointer or keyboard focus rests on the link before the card shows.
   * @default 500
   */
  enterDelay: number;
  /**
   * How long the card stays after the pointer and focus leave the link and the card.
   * @default 300
   */
  exitDelay: number;
}

const _defaults: HoverCardOptions = {
  enterDelay: 500,
  exitDelay: 300
};

/**
 * Hover card. A `.hover-card-trigger` link names its card, a `.popover` with
 * `popover="hint"`, in `aria-details`. The card shows against the link after
 * `enterDelay` and stays while the pointer or focus is on either.
 */
export class HoverCard extends Component<HoverCardOptions> {
  /** The card the link's `aria-details` names, or null when it names none. */
  cardEl: HTMLElement | null;
  /** Whether the instance has the card showing. */
  private _shown = false;
  /** What keeps the card wanted: the pointer, keyboard focus, or both. */
  private _holds = new Set<'pointer' | 'focus'>();
  private _timeout: ReturnType<typeof setTimeout>;

  constructor(el: HTMLElement, options: Partial<HoverCardOptions>) {
    super(el, options);
    this.cardEl = Utils.getElementById(el, el.getAttribute('aria-details') ?? '');
    if (!this.cardEl) {
      console.error(`HoverCard: aria-details names no element; the link shows no card.`);
      return;
    }
    // The browser hides a hint card itself on a click elsewhere, on Escape
    // and when another hint opens.
    const { signal } = this._events;
    this.cardEl.addEventListener('toggle', this._handleToggle, { signal });
    for (const target of [this.el, this.cardEl]) {
      target.addEventListener('pointerenter', this._handlePointerEnter, { signal });
      target.addEventListener('pointerleave', this._handlePointerLeave, { signal });
    }
  }

  static get defaults(): HoverCardOptions {
    return _defaults;
  }

  static key = 'Expressive_HoverCard';

  destroy() {
    clearTimeout(this._timeout);
    if (this._shown) this.cardEl.hidePopover();
    this._shown = false;
    super.destroy();
  }

  /**
   * Show the card now, without enterDelay.
   */
  open = () => {
    clearTimeout(this._timeout);
    if (!this.cardEl || this._shown) return;
    this._shown = true;
    // `source` makes the link the card's anchor and invoker, so Tab moves from the link into the card.
    (this.cardEl.showPopover as (options?: { source?: Element }) => void).call(this.cardEl, { source: this.el });
    this._notify('open');
  };

  /**
   * Hide the card now, without exitDelay.
   */
  close = () => {
    clearTimeout(this._timeout);
    if (!this._shown) return;
    this._shown = false;
    this.cardEl.hidePopover();
    this._notify('close');
  };

  /** Wanted cards show after enterDelay; once nothing holds the card, it hides after exitDelay. */
  private _schedule() {
    clearTimeout(this._timeout);
    const wanted = this._holds.size > 0;
    if (wanted === this._shown) return;
    const [change, delay] = wanted ? [this.open, this.options.enterDelay] as const : [this.close, this.options.exitDelay] as const;
    this._timeout = setTimeout(change, delay);
  }

  private _hold(by: 'pointer' | 'focus') {
    this._holds.add(by);
    this._schedule();
  }

  private _release(by: 'pointer' | 'focus') {
    this._holds.delete(by);
    this._schedule();
  }

  // A touch is a tap that follows the link, never a hover; pointer events
  // say so, and the mouse events a tap sends afterwards are not listened to.
  private _handlePointerEnter = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') this._hold('pointer');
  };

  private _handlePointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') this._release('pointer');
  };

  private _handleToggle = (e: Event) => {
    if ((e as ToggleEvent).newState !== 'closed' || !this._shown) return;
    this._shown = false;
    this._notify('close');
  };
}
