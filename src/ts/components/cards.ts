import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, MElement, Openable } from '../core/component';

export interface CardsOptions extends BaseOptions {
  onOpen: (el: Element) => void;
  onClose: (el: Element) => void;
}

const _defaults: CardsOptions = {
  onOpen: null,
  onClose: null
};

/**
 * What counts as a card.
 *
 * Shared with `components/registry.ts` rather than written out twice: the
 * registry used to claim `.cards`, which matches nothing this component
 * actually initializes, so the AutoInit entry was dead while `Cards.Init()`
 * quietly did the work through the selector below.
 */
export const CARDS_SELECTOR = '.card, article:has(> aside), article:has(.card-reveal)';

export class Cards extends Component<CardsOptions> implements Openable {
  isOpen: boolean = false;
  private readonly cardReveal: HTMLElement | null;
  private _activators: HTMLElement[] | null;
  private cardRevealClose: HTMLElement | null;

  constructor(el: HTMLElement, options: Partial<CardsOptions>) {
    super(el, options, Cards);
    this.el['Expressive_Cards'] = this;

    this.options = {
      ...Cards.defaults,
      ...options
    };

    this._activators = [];

    this.cardReveal = this.el.querySelector(':scope > aside, .card-reveal');
    if (this.cardReveal) {
      this._activators = Array.from(this.el.querySelectorAll('.activator'));
      this._activators.forEach((el: HTMLElement) => {
        if (el) el.tabIndex = 0;
      });

      this.cardRevealClose = this.cardReveal.querySelector(
        '.card-title, :scope > :is(h1, h2, h3, h4, h5, h6)'
      );
      if (this.cardRevealClose) this.cardRevealClose.tabIndex = -1;

      this.cardReveal.ariaExpanded = 'false';
      this._setupEventHandlers();
    }
  }

  static get defaults(): CardsOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Cards.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<CardsOptions>): Cards;
  /**
   * Initializes instances of Cards.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<MElement>, options?: Partial<CardsOptions>): Cards[];
  /**
   * Initializes instances of Cards.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<MElement>,
    options?: Partial<CardsOptions>
  ): Cards | Cards[] {
    return super.init(els, options, Cards);
  }

  static getInstance(el: HTMLElement): Cards {
    return el['Expressive_Cards'];
  }

  /**
   * {@inheritDoc}
   */
  destroy() {
    this._removeEventHandlers();
    if (this.cardRevealClose) this._removeRevealCloseEventHandlers();
    this._activators = [];
    this.el['Expressive_Cards'] = undefined;
  }

  _setupEventHandlers = () => {
    this._activators.forEach((el: HTMLElement) => {
      el.addEventListener('click', this._handleClickInteraction);
      el.addEventListener('keypress', this._handleKeypressEvent);
    });
  };

  _removeEventHandlers = () => {
    this._activators.forEach((el: HTMLElement) => {
      el.removeEventListener('click', this._handleClickInteraction);
      el.removeEventListener('keypress', this._handleKeypressEvent);
    });
  };

  _handleClickInteraction = () => {
    this._handleRevealEvent();
  };

  _handleKeypressEvent: (e: KeyboardEvent) => void = (e: KeyboardEvent) => {
    if (Utils.keys.ENTER.includes(e.key)) {
      this._handleRevealEvent();
    }
  };

  _handleRevealEvent = () => {
    // Reveal Card
    this._activators.forEach((el: HTMLElement) => (el.tabIndex = -1));
    this.open();
  };

  _setupRevealCloseEventHandlers = () => {
    this.cardRevealClose.addEventListener('click', this.close);
    this.cardRevealClose.addEventListener('keypress', this._handleKeypressCloseEvent);
  };

  _removeRevealCloseEventHandlers = () => {
    this.cardRevealClose.removeEventListener('click', this.close);
    this.cardRevealClose.removeEventListener('keypress', this._handleKeypressCloseEvent);
  };

  _handleKeypressCloseEvent: (e: KeyboardEvent) => void = (e: KeyboardEvent) => {
    if (Utils.keys.ENTER.includes(e.key)) {
      this.close();
    }
  };

  /**
   * Show card reveal.
   */
  open: () => void = () => {
    if (this.isOpen || !this.cardReveal) return;
    this.isOpen = true;
    this.cardReveal.ariaExpanded = 'true';
    // A reveal without a title has no close affordance; that is allowed.
    if (this.cardRevealClose) this.cardRevealClose.tabIndex = 0;
    if (typeof this.options.onOpen === 'function') {
      this.options.onOpen.call(this);
    }
    if (this.cardRevealClose) this._setupRevealCloseEventHandlers();
  };

  /**
   * Hide card reveal.
   */
  close: () => void = () => {
    if (!this.isOpen || !this.cardReveal) return;
    this.isOpen = false;
    this.cardReveal.ariaExpanded = 'false';
    this._activators.forEach((el: HTMLElement) => (el.tabIndex = 0));
    if (this.cardRevealClose) this.cardRevealClose.tabIndex = -1;
    if (typeof this.options.onClose === 'function') {
      this.options.onClose.call(this);
    }
    if (this.cardRevealClose) this._removeRevealCloseEventHandlers();
  };

  static Init() {
    // Handle initialization of static cards.
    Utils.onDocumentReady(() => {
      const cards = document.querySelectorAll(CARDS_SELECTOR);
      cards.forEach((el) => {
        if (el && el['Expressive_Cards'] == undefined) this.init(el as HTMLElement);
      });
    });
  }
}
