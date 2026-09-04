import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement, Openable } from '../core/component';

export interface CardsOptions extends BaseOptions {
  onOpen: (el: Element) => void;
  onClose: (el: Element) => void;
}

const _defaults: CardsOptions = {
  onOpen: null,
  onClose: null
};

/**
 * What counts as a card reveal.
 *
 * Shared with `components/registry.ts` so `Cards.Init()` and `AutoInit()` use
 * the same semantic selector.
 */
export const CARDS_SELECTOR =
  'article:has(> aside[id]:not([id=""])):not(:has(> aside ~ aside)):has(> button.card-reveal-trigger[type="button"], > :not(aside) button.card-reveal-trigger[type="button"])';

const REVEAL_INITIALIZED_CLASS = 'card-reveal-initialized';

function isUsableCardTrigger(
  trigger: HTMLButtonElement,
  card: Element,
  panel: HTMLElement
) {
  return (
    trigger.closest('article') === card &&
    !panel.contains(trigger) &&
    !trigger.disabled &&
    trigger.getAttribute('aria-disabled') !== 'true'
  );
}

export function isCardReveal(el: Element): el is HTMLElement {
  if (el.tagName !== 'ARTICLE') return false;
  const panels = el.querySelectorAll<HTMLElement>(':scope > aside');
  if (panels.length !== 1 || !panels[0].id) return false;

  return Array.from(
    el.querySelectorAll<HTMLButtonElement>('button.card-reveal-trigger[type="button"]')
  ).some((trigger) => isUsableCardTrigger(trigger, el, panels[0]));
}

export class Cards extends Component<CardsOptions> implements Openable {
  isOpen: boolean = false;
  private readonly cardReveal: HTMLElement | null;
  private _activators: HTMLButtonElement[];
  private _ownsRevealInitializedClass = false;
  private _initialAriaControls = new Map<HTMLButtonElement, string | null>();
  private _lastActivator: HTMLButtonElement | null = null;

  constructor(el: HTMLElement, options: Partial<CardsOptions> = {}) {
    super(el, options, Cards);
    this.el['Expressive_Cards'] = this;

    this.options = {
      ...Cards.defaults,
      ...options
    };

    const cardReveals = this.el.querySelectorAll<HTMLElement>(':scope > aside');
    const cardReveal = cardReveals.length === 1 ? cardReveals[0] : null;
    const activators = cardReveal
      ? Array.from(
          this.el.querySelectorAll<HTMLButtonElement>(
            'button.card-reveal-trigger[type="button"]'
          )
        ).filter(
          (activator) => isUsableCardTrigger(activator, this.el, cardReveal)
        )
      : [];

    this.cardReveal = cardReveal?.id && activators.length > 0 ? cardReveal : null;
    this._activators = this.cardReveal ? activators : [];

    if (this.cardReveal) {
      this._ownsRevealInitializedClass = !this.el.classList.contains(REVEAL_INITIALIZED_CLASS);
      this.el.classList.add(REVEAL_INITIALIZED_CLASS);
      this._activators.forEach((activator) => {
        this._initialAriaControls.set(activator, activator.getAttribute('aria-controls'));
        activator.ariaExpanded = 'false';
        activator.setAttribute('aria-controls', this.cardReveal.id);
      });

      this.cardReveal.classList.remove('open');
      this.cardReveal.inert = true;
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
  static init(els: InitElements<InitElement>, options?: Partial<CardsOptions>): Cards[];
  /**
   * Initializes instances of Cards.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
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
    if (this.cardReveal) {
      this.cardReveal.classList.remove('open');
      this.cardReveal.inert = false;
      if (this._ownsRevealInitializedClass) this.el.classList.remove(REVEAL_INITIALIZED_CLASS);
    }
    this._activators.forEach((activator) => {
      activator.removeAttribute('aria-expanded');
      const initialAriaControls = this._initialAriaControls.get(activator);
      if (initialAriaControls === null) activator.removeAttribute('aria-controls');
      else if (initialAriaControls !== undefined) {
        activator.setAttribute('aria-controls', initialAriaControls);
      }
    });
    this.isOpen = false;
    this._activators = [];
    this._initialAriaControls.clear();
    this._lastActivator = null;
    this.el['Expressive_Cards'] = undefined;
  }

  _setupEventHandlers = () => {
    this._activators.forEach((activator) => {
      activator.addEventListener('click', this._handleClickInteraction);
    });
    this.el.addEventListener('keydown', this._handleKeydownEvent);
  };

  _removeEventHandlers = () => {
    this._activators.forEach((activator) => {
      activator.removeEventListener('click', this._handleClickInteraction);
    });
    this.el.removeEventListener('keydown', this._handleKeydownEvent);
  };

  _handleClickInteraction = (event: MouseEvent) => {
    this._lastActivator = event.currentTarget as HTMLButtonElement;
    this._handleRevealEvent();
  };

  _handleKeydownEvent = (event: KeyboardEvent) => {
    const target = event.target instanceof Element ? event.target.closest('article') : null;
    if (target !== this.el || event.key !== 'Escape' || !this.isOpen) return;
    event.preventDefault();
    this.close();
  };

  _handleRevealEvent = () => {
    if (this.isOpen) this.close();
    else this.open();
  };

  /**
   * Show card reveal.
   */
  open: () => void = () => {
    if (this.isOpen || !this.cardReveal) return;
    this.isOpen = true;
    this.cardReveal.classList.add('open');
    this.cardReveal.inert = false;
    this._activators.forEach((activator) => (activator.ariaExpanded = 'true'));
    if (typeof this.options.onOpen === 'function') {
      this.options.onOpen.call(this, this.el);
    }
  };

  /**
   * Hide card reveal.
   */
  close: () => void = () => {
    if (!this.isOpen || !this.cardReveal) return;

    const focusWasInside = this.cardReveal.contains(document.activeElement);
    this.isOpen = false;
    this.cardReveal.classList.remove('open');
    this.cardReveal.inert = true;
    this._activators.forEach((activator) => (activator.ariaExpanded = 'false'));
    if (typeof this.options.onClose === 'function') {
      this.options.onClose.call(this, this.el);
    }

    if (focusWasInside) {
      (this._lastActivator ?? this._activators[0])?.focus();
    }
  };

  static Init() {
    Utils.onDocumentReady(() => {
      const cards = Array.from(document.querySelectorAll(CARDS_SELECTOR)).filter(isCardReveal);
      cards.forEach((el) => {
        if (el && el['Expressive_Cards'] == undefined) this.init(el as HTMLElement);
      });
    });
  }
}
