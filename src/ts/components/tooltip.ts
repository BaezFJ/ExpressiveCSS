import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipOptions extends BaseOptions {
  /**
   * Delay time before tooltip disappears.
   * @default 200
   */
  exitDelay: number;
  /**
   * Delay time before tooltip appears.
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
}

const _defaults: TooltipOptions = {
  exitDelay: 200,
  enterDelay: 0,
  text: '',
  margin: 4,
  inDuration: 250,
  outDuration: 200,
  position: 'bottom' as TooltipPosition,
  transitionMovement: 10,
  opacity: 1
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
    this.isOpen = false;
    this.isHovered = false;
    this.isFocused = false;
    if (this.el.getAttribute('aria-describedby') === this.tooltipEl.id) {
      this.el.removeAttribute('aria-describedby');
    }
    this.tooltipEl.remove();
    this._removeEventHandlers();
    this.el['Expressive_Tooltip'] = undefined;
  }

  _appendTooltipEl() {
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.classList.add('tooltip');
    this.tooltipEl.id = `tooltip-${Utils.guid()}`;
    this.tooltipEl.setAttribute('role', 'tooltip');
    this.el.setAttribute('aria-describedby', this.tooltipEl.id);

    const tooltipContentEl = this.options.tooltipId
      ? Utils.getElementById(this.el, this.options.tooltipId)
      : document.createElement('div');
    if (this.options.tooltipId) {
      this.tooltipEl.classList.add('rich');
    }
    tooltipContentEl.style.display = '';
    tooltipContentEl.classList.add('tooltip-content');
    this._setTooltipContent(tooltipContentEl);
    this.tooltipEl.appendChild(tooltipContentEl);
    Utils.portalRoot(this.el).appendChild(this.tooltipEl);
  }

  _setTooltipContent(tooltipContentEl: HTMLElement) {
    if (this.options.tooltipId) return;
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
    this.el.ownerDocument.addEventListener('keydown', this._handleKeydown, true);
  }

  _removeEventHandlers() {
    for (const el of [this.el, this.tooltipEl]) {
      el.removeEventListener('mouseenter', this._handleMouseEnter);
      el.removeEventListener('mouseleave', this._handleMouseLeave);
      el.removeEventListener('focus', this._handleFocus, true);
      el.removeEventListener('blur', this._handleBlur, true);
    }
    this.el.ownerDocument.removeEventListener('keydown', this._handleKeydown, true);
  }

  /**
   * Show tooltip.
   */
  open = (isManual: boolean) => {
    if (this.isOpen) return;
    isManual = isManual === undefined ? true : undefined; // Default value true
    clearTimeout(this._exitDelayTimeout);
    clearTimeout(this._animationTimeout);
    this.isOpen = true;
    // Update tooltip content with HTML attribute options
    this.options = { ...this.options, ...this._getAttributeOptions() };
    this._updateTooltipContent();
    this._setEnterDelayTimeout(isManual);
  };

  /**
   * Hide tooltip.
   */
  close = () => {
    if (!this.isOpen) return;
    this.isHovered = false;
    this.isFocused = false;
    this.isOpen = false;
    clearTimeout(this._enterDelayTimeout);
    this._setExitDelayTimeout();
  };

  _setExitDelayTimeout() {
    clearTimeout(this._exitDelayTimeout);
    this._exitDelayTimeout = setTimeout(() => {
      if (this.isHovered || this.isFocused) return;
      this._animateOut();
    }, this.options.exitDelay);
  }

  _setEnterDelayTimeout(isManual) {
    clearTimeout(this._enterDelayTimeout);
    this._enterDelayTimeout = setTimeout(() => {
      if (!this.isHovered && !this.isFocused && !isManual) return;
      this._animateIn();
    }, this.options.enterDelay);
  }

  _positionTooltip() {
    const tooltip: HTMLElement = this.tooltipEl;
    const origin = this.el as HTMLElement,
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
    tooltip.style.top = newCoordinates.y + 'px';
    tooltip.style.left = newCoordinates.x + 'px';
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
      this._positionTooltip();
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
  }

  _handleMouseEnter = () => {
    this.isHovered = true;
    this.open(false);
  };

  _handleMouseLeave = (event: MouseEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && (this.el.contains(next) || this.tooltipEl.contains(next))) return;
    this.isHovered = false;
    if (!this.isFocused) this.close();
  };

  _handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
    clearTimeout(this._exitDelayTimeout);
    this._animateOut();
  };

  // Focus opens the tooltip only when it arrived by keyboard: a pointer press
  // on the trigger also focuses it, and _handleMouseEnter already covers that.
  _handleFocus = (event: FocusEvent) => {
    if ((event.target as HTMLElement).matches(':focus-visible')) {
      this.isFocused = true;
      this.open(false);
    }
  };

  _handleBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && (this.el.contains(next) || this.tooltipEl.contains(next))) return;
    this.isFocused = false;
    if (!this.isHovered) this.close();
  };

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
