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

// Links can share one card, such as a name mentioned twice; the link that
// last showed it owns it, and the next one takes it over.
const owners = new WeakMap<HTMLElement, HoverCard>();

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
  /** The anchor name the card is placed against while this link shows it. */
  private _anchorName = `--hover-card-${Utils.guid()}`;

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
      target.addEventListener('focusout', this._handleFocusOut, { signal });
    }
    this.el.addEventListener('focus', this._handleLinkFocus, { signal });
    this.cardEl.addEventListener('focusin', this._handleCardFocus, { signal });
  }

  static get defaults(): HoverCardOptions {
    return _defaults;
  }

  static key = 'Expressive_HoverCard';

  destroy() {
    clearTimeout(this._timeout);
    if (this._shown) {
      this.cardEl.hidePopover();
      this._hidden();
    }
    super.destroy();
  }

  /**
   * Show the card now, without enterDelay.
   */
  open = () => {
    clearTimeout(this._timeout);
    if (!this.cardEl || this._shown) return;
    owners.get(this.cardEl)?.close();
    // `source` makes the link the card's anchor and invoker, so Tab moves from
    // the link into the card. It throws for a card without the popover
    // attribute, before any state changes.
    (this.cardEl.showPopover as (options?: { source?: Element }) => void).call(this.cardEl, { source: this.el });
    owners.set(this.cardEl, this);
    this._shown = true;
    this._listenForEscape(true);
    this._anchor(true);
    this._notify('open');
  };

  /**
   * Hide the card now, without exitDelay.
   */
  close = () => {
    clearTimeout(this._timeout);
    if (!this._shown) return;
    this.cardEl.hidePopover();
    this._hidden();
    this._notify('close');
  };

  private _hidden() {
    this._shown = false;
    this._listenForEscape(false);
    this._anchor(false);
  }

  // `source` anchors the card too, but Firefox keeps the first source's
  // anchor for good, so a card two links share would stay at the first. A
  // named anchor, set only while the card shows, follows the link that shows it.
  private _anchor(on: boolean) {
    Utils.setAnchorName(this.el, this._anchorName, on);
    if (on) this.cardEl.style.setProperty('position-anchor', this._anchorName);
    else this.cardEl.style.removeProperty('position-anchor');
    for (const el of [this.el, this.cardEl]) if (!el.getAttribute('style')) el.removeAttribute('style');
  }

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

  // A pointer press also focuses the link, and the hover already covers it,
  // so only keyboard focus holds the card from the link.
  private _handleLinkFocus = () => {
    if (this.el.matches(':focus-visible')) this._hold('focus');
  };

  private _handleCardFocus = () => this._hold('focus');

  private _handleFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (!next || !(this.el.contains(next) || this.cardEl.contains(next))) this._release('focus');
  };

  /** Escape is listened for only while the card shows. close() removes it, and destroy() through the signal. */
  private _listenForEscape(on: boolean) {
    const doc = this.el.ownerDocument;
    if (on) doc.addEventListener('keydown', this._handleKeydown, { capture: true, signal: this._events.signal });
    else doc.removeEventListener('keydown', this._handleKeydown, true);
  }

  // Escape always hides the card, but it is only the card's key when focus is
  // on the link or in the card; otherwise it still reaches the dialog or menu
  // that has focus. An engine that does not know popover="hint" treats the
  // card as manual, which Escape would not close.
  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || Utils.isComposing(e)) return;
    if (Utils.focusIsIn(this.el, this.cardEl)) this._takeEscape(e);
    this.close();
  };

  /** Keeps Escape from the page and, when focus is in the card, takes it back to the link before the card hides. */
  private _takeEscape(e: KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (Utils.focusIsIn(this.cardEl)) this.el.focus();
  }

  private _handleToggle = (e: Event) => {
    if ((e as ToggleEvent).newState !== 'closed' || !this._shown) return;
    this._hidden();
    this._notify('close');
  };
}
