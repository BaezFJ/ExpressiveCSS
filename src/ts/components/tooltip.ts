import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';


// CSS anchor positioning, where the browser has it: the tooltip follows its
// trigger through scrolling and flips at the viewport edge without script
// measuring anything. Elsewhere the coordinate path below still runs.
const anchorSupported = typeof CSS !== 'undefined' && !!CSS.supports?.('anchor-name: --a');

// Per position: the position-area and the self-alignment that centers the
// tooltip on its trigger.
const ANCHOR_PLACEMENT: Record<string, [string, string]> = {
  top: ['top', 'justify-self'],
  right: ['right', 'align-self'],
  left: ['left', 'align-self'],
  bottom: ['bottom', 'justify-self'],
};

/**
 * On touch, a press held this long shows the tooltip, as Android's long
 * press does, and the tooltip stays this long after the finger lifts.
 */
const LONG_PRESS = 500;
const TOUCH_LINGER = 1500;
// After a touch the browser fires mouse events for compatibility; within
// this long of one they are the touch again, not a mouse.
const TOUCH_ECHO = 800;
// A long press that showed the tooltip was asking about the control, so the
// click its release sends, within this long, does not activate it.
const PRESS_CLICK = 400;
// A tooltip that opens while a tooltip is closing, or this long after that
// one's exitDelay ends, shows without enterDelay, as tooltips along a toolbar
// do. The window is shared by every tooltip; a clock earlier than its start,
// after the system clock went back, is outside it.
const SKIP_DELAY_WINDOW = 300;
let skipDelayFrom = -Infinity;
let skipDelayUntil = -Infinity;

const skippingDelay = (now: number) => now >= skipDelayFrom && now < skipDelayUntil;

/** A showing tooltip is closing: open the window, or extend it while an earlier one is still closing. */
function startSkipDelay(exitDelay: number) {
  const now = Date.now();
  const end = now + exitDelay + SKIP_DELAY_WINDOW;
  skipDelayUntil = skippingDelay(now) ? Math.max(skipDelayUntil, end) : end;
  skipDelayFrom = now;
}

export interface TooltipOptions extends BaseOptions {
  /**
   * Delay time before tooltip disappears.
   * @default 200
   */
  exitDelay: number;
  /**
   * Delay time before tooltip appears. Skipped while a tooltip is closing
   * and for 300ms after its exitDelay ends.
   * @default 0
   */
  enterDelay: number;
  /**
   * Element Id for the tooltip.
   * @default ""
   */
  tooltipId?: string;
  /**
   * Text string for the tooltip.
   * @default ""
   */
  text: string;
  /**
   * Set distance tooltip appears away from its activator
   * excluding transitionMovement.
   * @default 4
   */
  margin: number;
  /**
   * Enter transition duration.
   * @default 300
   */
  inDuration: number;
  /**
   * Opacity of the tooltip.
   * @default 1
   */
  opacity: number;
  /**
   * Exit transition duration.
   * @default 250
   */
  outDuration: number;
  /**
   * Set the direction of the tooltip.
   * @default 'bottom'
   */
  position: TooltipPosition;
  /**
   * Amount in px that the tooltip moves during its transition.
   * @default 10
   */
  transitionMovement: number;
  /**
   * Open on a click instead of hover and focus. A second click, Escape, a
   * click elsewhere or focus on another element closes it. On touch a tap
   * is the click, so the long press is off.
   * @default false
   */
  openOnClick: boolean;
}

const _defaults: TooltipOptions = {
  exitDelay: 200,
  enterDelay: 0,
  text: '',
  margin: 4,
  inDuration: 250,
  outDuration: 200,
  position: 'bottom',
  transitionMovement: 10,
  opacity: 1,
  openOnClick: false
};

export class Tooltip extends Component<TooltipOptions> {
  /**
   * If tooltip is open.
   */
  isOpen: boolean;
  /**
   * If tooltip is hovered.
   */
  isHovered: boolean;
  /**
   * If tooltip is focused.
   */
  isFocused: boolean;
  tooltipEl: HTMLElement;
  private _exitDelayTimeout: ReturnType<typeof setTimeout>;
  private _enterDelayTimeout: ReturnType<typeof setTimeout>;
  private _animationTimeout: ReturnType<typeof setTimeout>;
  private _pressTimeout: ReturnType<typeof setTimeout>;
  private _lingerTimeout: ReturnType<typeof setTimeout>;
  private _outsideTimeout: ReturnType<typeof setTimeout>;
  /** The last click on the trigger or inside the tooltip, which the document listener leaves alone. */
  private _insideClick: Event | null = null;
  /** When the last touch began or ended, to tell its mouse events from a mouse. */
  private _lastTouch = -Infinity;
  /** Whether a long press showed the tooltip, until it closes or a mouse hovers. */
  private _touchShown = false;
  /** Until when a click is the release of a long press, not a tap. */
  private _swallowClickUntil = -Infinity;
  // Whether the last animation showed the tooltip, so each change is reported once.
  private _shown = false;
  private _originalContent: {
    el: HTMLElement;
    marker: Comment;
    display: string;
    priority: string;
    hidden: string | null;
    contentClass: boolean;
  };
  xMovement: number;
  yMovement: number;

  constructor(el: HTMLElement, options: Partial<TooltipOptions>) {
    super(el, options, Tooltip);
    this.el['Expressive_Tooltip'] = this;

    this.options = {
      ...Tooltip.defaults,
      ...this._getAttributeOptions(),
      ...options
    };

    this.isOpen = false;
    this.isHovered = false;
    this.isFocused = false;
    this._appendTooltipEl();
    this._setupEventHandlers();
  }

  static get defaults(): TooltipOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Tooltip.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<TooltipOptions>): Tooltip;
  /**
   * Initializes instances of Tooltip.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<InitElement>, options?: Partial<TooltipOptions>): Tooltip[];
  /**
   * Initializes instances of Tooltip.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<TooltipOptions> = {}
  ): Tooltip | Tooltip[] {
    return super.init(els, options, Tooltip);
  }

  static getInstance(el: HTMLElement): Tooltip {
    return el['Expressive_Tooltip'];
  }

  destroy() {
    clearTimeout(this._enterDelayTimeout);
    clearTimeout(this._exitDelayTimeout);
    clearTimeout(this._animationTimeout);
    clearTimeout(this._pressTimeout);
    clearTimeout(this._lingerTimeout);
    clearTimeout(this._outsideTimeout);
    this.isOpen = false;
    this.isHovered = false;
    this.isFocused = false;
    const descriptions = this.el.getAttribute('aria-describedby')?.split(/\s+/);
    if (descriptions?.includes(this.tooltipEl.id)) {
      const remaining = descriptions.filter(id => id && id !== this.tooltipEl.id).join(' ');
      if (remaining) this.el.setAttribute('aria-describedby', remaining);
      else this.el.removeAttribute('aria-describedby');
    }
    if (this._originalContent) {
      const { el, marker, display, priority, hidden, contentClass } = this._originalContent;
      el.style.setProperty('display', display, priority);
      if (hidden === null) el.removeAttribute('hidden');
      else el.setAttribute('hidden', hidden);
      el.classList.toggle('tooltip-content', contentClass);
      if (!el.className) el.removeAttribute('class');
      marker.replaceWith(el);
      this._originalContent = null;
    }
    this.tooltipEl.remove();
    Utils.setAnchorName(this.el, `--${this.tooltipEl.id}`, false);
    this._removeEventHandlers();
    this.el['Expressive_Tooltip'] = undefined;
  }

  _appendTooltipEl() {
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.classList.add('tooltip');
    this.tooltipEl.id = `tooltip-${Utils.guid()}`;
    this.tooltipEl.setAttribute('role', 'tooltip');
    this.el.setAttribute('aria-describedby', [this.el.getAttribute('aria-describedby'), this.tooltipEl.id].filter(Boolean).join(' '));

    const richContentEl = this.options.tooltipId
      ? Utils.getElementById(this.el, this.options.tooltipId)
      : null;
    if (this.options.tooltipId && !richContentEl) {
      console.error(`Tooltip: no element with id "${this.options.tooltipId}"; showing the text tooltip instead.`);
    }
    const tooltipContentEl = richContentEl ?? document.createElement('div');
    if (richContentEl) {
      this.tooltipEl.classList.add('rich');
      const marker = document.createComment('');
      tooltipContentEl.before(marker);
      this._originalContent = {
        el: tooltipContentEl, marker,
        display: tooltipContentEl.style.display,
        priority: tooltipContentEl.style.getPropertyPriority('display'),
        hidden: tooltipContentEl.getAttribute('hidden'),
        contentClass: tooltipContentEl.classList.contains('tooltip-content')
      };
      tooltipContentEl.removeAttribute('hidden');
    }
    tooltipContentEl.style.display = '';
    tooltipContentEl.classList.add('tooltip-content');
    this._setTooltipContent(tooltipContentEl);
    this.tooltipEl.appendChild(tooltipContentEl);
    Utils.portalRoot(this.el).appendChild(this.tooltipEl);
  }

  _setTooltipContent(tooltipContentEl: HTMLElement) {
    if (this._originalContent) return;
    tooltipContentEl.innerText = this.options.text;
  }

  _updateTooltipContent() {
    this._setTooltipContent(this.tooltipEl.querySelector('.tooltip-content'));
  }

  _setupEventHandlers() {
    for (const el of [this.el, this.tooltipEl]) {
      el.addEventListener('mouseenter', this._handleMouseEnter);
      el.addEventListener('mouseleave', this._handleMouseLeave);
      el.addEventListener('focus', this._handleFocus, true);
      el.addEventListener('blur', this._handleBlur, true);
    }
    this.el.addEventListener('pointerenter', this._handlePointerEnter);
    this.el.addEventListener('pointerdown', this._handlePointerDown);
    this.el.addEventListener('pointerup', this._handlePointerEnd);
    this.el.addEventListener('pointercancel', this._handlePointerCancel);
    this.el.addEventListener('click', this._handleClick, true);
    this.tooltipEl.addEventListener('click', this._handleTooltipClick, true);
  }

  _removeEventHandlers() {
    for (const el of [this.el, this.tooltipEl]) {
      el.removeEventListener('mouseenter', this._handleMouseEnter);
      el.removeEventListener('mouseleave', this._handleMouseLeave);
      el.removeEventListener('focus', this._handleFocus, true);
      el.removeEventListener('blur', this._handleBlur, true);
    }
    this.el.removeEventListener('pointerenter', this._handlePointerEnter);
    this.el.removeEventListener('pointerdown', this._handlePointerDown);
    this.el.removeEventListener('pointerup', this._handlePointerEnd);
    this.el.removeEventListener('pointercancel', this._handlePointerCancel);
    this.el.removeEventListener('click', this._handleClick, true);
    this.tooltipEl.removeEventListener('click', this._handleTooltipClick, true);
    // Escape and outside clicks are only listened for while open; see open() and close().
    this.el.ownerDocument.removeEventListener('keydown', this._handleKeydown, true);
    this.el.ownerDocument.removeEventListener('click', this._handleDocumentClick);
  }

  /**
   * Show tooltip.
   */
  open = (isManual: boolean = true) => {
    if (this.isOpen) return;
    clearTimeout(this._exitDelayTimeout);
    clearTimeout(this._animationTimeout);
    this.isOpen = true;
    this.el.ownerDocument.addEventListener('keydown', this._handleKeydown, true);
    // A task later, so the click that opened it, on the trigger or on a page
    // button that called open(), does not reach the listener and close it.
    if (this.options.openOnClick) {
      this._outsideTimeout = setTimeout(() => this.el.ownerDocument.addEventListener('click', this._handleDocumentClick));
    }
    // Update tooltip content with HTML attribute options
    this.options = { ...this.options, ...this._getAttributeOptions() };
    this._updateTooltipContent();
    this._setEnterDelayTimeout(isManual);
  };

  /**
   * Hide tooltip.
   */
  close = () => {
    // A press or linger from an earlier touch has no say over a later opening.
    clearTimeout(this._pressTimeout);
    clearTimeout(this._lingerTimeout);
    this._touchShown = false;
    if (!this.isOpen) return;
    if (this._shown) startSkipDelay(this.options.exitDelay);
    this.isHovered = false;
    this.isFocused = false;
    this.isOpen = false;
    this.el.ownerDocument.removeEventListener('keydown', this._handleKeydown, true);
    clearTimeout(this._outsideTimeout);
    this.el.ownerDocument.removeEventListener('click', this._handleDocumentClick);
    clearTimeout(this._enterDelayTimeout);
    this._setExitDelayTimeout();
  };

  /** Show at once, without enterDelay, for a request that is its own delay: a long press or a click. */
  private _showNow() {
    this.open();
    clearTimeout(this._enterDelayTimeout);
    this._animateIn();
  }

  /** Hide at once, without exitDelay, for an explicit dismissal. */
  private _hideNow() {
    this.close();
    clearTimeout(this._exitDelayTimeout);
    this._animateOut();
  }

  _setExitDelayTimeout() {
    clearTimeout(this._exitDelayTimeout);
    this._exitDelayTimeout = setTimeout(() => {
      if (this.isHovered || this.isFocused) return;
      this._animateOut();
    }, this.options.exitDelay);
  }

  _setEnterDelayTimeout(isManual) {
    clearTimeout(this._enterDelayTimeout);
    const skipDelay = skippingDelay(Date.now());
    this._enterDelayTimeout = setTimeout(() => {
      if (!this.isHovered && !this.isFocused && !isManual) return;
      this._animateIn();
    }, skipDelay ? 0 : this.options.enterDelay);
  }

  _positionTooltip() {
    const tooltip: HTMLElement = this.tooltipEl;
    const origin = this.el,
      originHeight = origin.offsetHeight,
      originWidth = origin.offsetWidth,
      tooltipHeight = tooltip.offsetHeight,
      tooltipWidth = tooltip.offsetWidth,
      margin = this.options.margin;

    this.xMovement = 0;
    this.yMovement = 0;

    const originRect = origin.getBoundingClientRect();
    let targetTop = originRect.top + Utils.getDocumentScrollTop();
    let targetLeft = originRect.left + Utils.getDocumentScrollLeft();
    if (this.options.position === 'top') {
      targetTop += -tooltipHeight - margin;
      targetLeft += originWidth / 2 - tooltipWidth / 2;
      this.yMovement = -this.options.transitionMovement;
    } else if (this.options.position === 'right') {
      targetTop += originHeight / 2 - tooltipHeight / 2;
      targetLeft += originWidth + margin;
      this.xMovement = this.options.transitionMovement;
    } else if (this.options.position === 'left') {
      targetTop += originHeight / 2 - tooltipHeight / 2;
      targetLeft += -tooltipWidth - margin;
      this.xMovement = -this.options.transitionMovement;
    } else {
      targetTop += originHeight + margin;
      targetLeft += originWidth / 2 - tooltipWidth / 2;
      this.yMovement = this.options.transitionMovement;
    }

    const newCoordinates = this._repositionWithinScreen(
      targetLeft,
      targetTop,
      tooltipWidth,
      tooltipHeight
    );

    tooltip.style.setProperty('--md-comp-tooltip-anchor-gap', `${Math.max(0, margin) + Math.abs(this.options.transitionMovement)}px`);
    Utils._placeInOffsetParent(tooltip, newCoordinates);
  }

  _place() {
    if (anchorSupported) this._anchorTooltip();
    else this._positionTooltip();
  }

  // Anchored to the trigger in CSS: position-area places the tooltip on the
  // chosen side, centered, and position-try-fallbacks flips it to the other
  // side when that one would leave the viewport. Script cannot tell which
  // side won, so an anchored tooltip fades in without sliding, and the
  // slide's distance joins the gap instead.
  _anchorTooltip() {
    const [area, alignment] = ANCHOR_PLACEMENT[this.options.position] ?? ANCHOR_PLACEMENT.bottom;
    const name = `--${this.tooltipEl.id}`;
    this.xMovement = 0;
    this.yMovement = 0;
    Utils.setAnchorName(this.el, name, true);
    const style = this.tooltipEl.style;
    style.position = 'fixed';
    style.inset = 'auto';
    style.margin = `${Math.max(0, this.options.margin) + Math.abs(this.options.transitionMovement)}px`;
    style.setProperty('position-anchor', name);
    style.setProperty('position-area', area);
    style.setProperty(alignment, 'anchor-center');
    style.setProperty('position-try-fallbacks', 'flip-block, flip-inline');
  }

  _repositionWithinScreen(x: number, y: number, width: number, height: number) {
    return Utils._repositionWithinScreen(
      x, y, width, height, this.options.margin, this.options.transitionMovement, 'center'
    );
  }

  _animateIn() { this._animate(true); }

  _animateOut() { this._animate(false); }

  _animate(show: boolean) {
    const style = this.tooltipEl.style;
    const reduce = this.el.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? 0 : show ? this.options.inDuration : this.options.outDuration;
    if (show) {
      this._place();
      style.visibility = 'visible';
      style.overflow = 'visible';
    }
    style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    clearTimeout(this._animationTimeout);
    this._animationTimeout = setTimeout(() => {
      style.transform = show && !reduce ? `translateX(${this.xMovement}px) translateY(${this.yMovement}px)` : 'none';
      style.opacity = show ? (this.options.opacity || 1).toString() : '0';
      if (!show) this._animationTimeout = setTimeout(() => {
        style.visibility = 'hidden';
        style.overflow = '';
      }, duration);
    }, 1);
    this._reportShown(show);
  }

  private _reportShown(show: boolean) {
    if (show === this._shown) return;
    this._shown = show;
    this._notify(show ? 'open' : 'close');
  }

  _handleMouseEnter = () => {
    // A tap's mouse events are not a hover; touch shows the tooltip on a long press.
    if (this.options.openOnClick || performance.now() - this._lastTouch < TOUCH_ECHO) return;
    this._touchShown = false;
    this.isHovered = true;
    this.open(false);
  };

  /** Whether an event is a touch, noting when, so the mouse events that echo it are ignored. */
  private _touched(e: PointerEvent) {
    if (e.pointerType !== 'touch') return false;
    this._lastTouch = performance.now();
    return true;
  }

  /** Whether an event is a touch for the long press, which a click tooltip does without. */
  private _longPress(e: PointerEvent) {
    return !this.options.openOnClick && this._touched(e);
  }

  // pointerenter comes before any compatibility mouseenter, in whatever order
  // a browser sends those, so the touch is known before its mouse events.
  _handlePointerEnter = (e: PointerEvent) => {
    this._touched(e);
  };

  /** A touch held for LONG_PRESS shows the tooltip, unless it turns into a scroll first. */
  _handlePointerDown = (e: PointerEvent) => {
    if (!this._longPress(e)) return;
    clearTimeout(this._lingerTimeout);
    clearTimeout(this._pressTimeout);
    // The long press is the delay, so it shows at once rather than after
    // enterDelay, and the linger after the finger lifts always follows a
    // tooltip that is showing.
    this._pressTimeout = setTimeout(() => {
      this.isHovered = true;
      this._showNow();
      this._touchShown = true;
    }, LONG_PRESS);
  };

  /** The finger lifted: a press too short stays a tap, and a tooltip it showed lingers for TOUCH_LINGER. */
  _handlePointerEnd = (e: PointerEvent) => {
    if (!this._longPress(e)) return;
    clearTimeout(this._pressTimeout);
    if (this._touchShown) this._swallowClickUntil = performance.now() + PRESS_CLICK;
    // Any release while it shows, even a second tap during the linger, starts the linger again.
    if (!this.isOpen) return;
    this.isHovered = false;
    // A mouse that hovers in the meantime keeps it, as focus does.
    this._lingerTimeout = setTimeout(() => this.isHovered || this.isFocused || this.close(), TOUCH_LINGER);
  };

  /**
   * A click tooltip toggles. Otherwise the click a long press's release sends
   * would press the button or follow the link, so it is consumed.
   */
  _handleClick = (e: MouseEvent) => {
    if (this.options.openOnClick) return this._toggle(e);
    if (performance.now() > this._swallowClickUntil) return;
    this._swallowClickUntil = -Infinity;
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  /** A click tooltip toggles on what shows: one open() still holds back for enterDelay shows at once. */
  private _toggle(e: MouseEvent) {
    this._insideClick = e;
    if (this._shown) this._hideNow();
    else this._showNow();
  }

  // Marked rather than found on the composed path, which a document listener
  // cannot see into when the tooltip sits in a closed shadow root.
  _handleTooltipClick = (e: MouseEvent) => {
    this._insideClick = e;
  };

  _handleDocumentClick = (e: MouseEvent) => {
    if (e !== this._insideClick) this._hideNow();
  };

  /**
   * The browser took the touch to scroll: no tooltip opens, not even one
   * waiting out enterDelay, and one the touch showed closes at once.
   */
  _handlePointerCancel = (e: PointerEvent) => {
    if (!this._longPress(e)) return;
    clearTimeout(this._pressTimeout);
    // Lingering after an earlier press too; a mouse hover or focus keeps it.
    if (!this._touchShown) return;
    this.isHovered = false;
    if (!this.isFocused) this.close();
  };

  /** Whether a node is the trigger or the tooltip, or inside either. */
  private _holds(node: Node | null) {
    return !!node && (this.el.contains(node) || this.tooltipEl.contains(node));
  }

  _handleMouseLeave = (event: MouseEvent) => {
    if (this.options.openOnClick || this._holds(event.relatedTarget as Node | null)) return;
    this.isHovered = false;
    if (!this.isFocused) this.close();
  };

  _handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.isOpen) return;
    // Escape always dismisses the tooltip, but it is only the tooltip's key
    // when focus is on its trigger. A tooltip left open by hover must not
    // swallow the Escape meant for the dialog or menu that has focus.
    if (Utils.focusIsIn(this.el, this.tooltipEl)) {
      event.preventDefault();
      event.stopPropagation();
    }
    this._hideNow();
  };

  // Focus opens the tooltip only when it arrived by keyboard: a pointer press
  // on the trigger also focuses it, and _handleMouseEnter already covers that.
  _handleFocus = (event: FocusEvent) => {
    // A click tooltip opens on the click that Enter or Space sends instead.
    if (!this.options.openOnClick && (event.target as HTMLElement).matches(':focus-visible')) {
      this.isFocused = true;
      this.open(false);
    }
  };

  _handleBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (this._holds(next)) return;
    if (this.options.openOnClick) return this._blurClickTooltip(next);
    this.isFocused = false;
    if (!this.isHovered) this.close();
  };

  // A press on a rich tooltip's text blurs to nothing, so only focus that
  // lands on another element closes a click tooltip.
  private _blurClickTooltip(next: Node | null) {
    if (next && (this.isOpen || this._shown)) this._hideNow();
  }

  _getAttributeOptions(): Partial<TooltipOptions> {
    const attributeOptions: Partial<TooltipOptions> = {};
    const tooltipTextOption = this.el.getAttribute('data-tooltip');
    const tooltipId = this.el.getAttribute('data-tooltip-id');
    const positionOption = this.el.getAttribute('data-position');
    if (tooltipTextOption) {
      attributeOptions.text = tooltipTextOption;
    }
    if (positionOption) {
      attributeOptions.position = positionOption as TooltipPosition;
    }
    if (tooltipId) {
      attributeOptions.tooltipId = tooltipId;
    }

    return attributeOptions;
  }
}
