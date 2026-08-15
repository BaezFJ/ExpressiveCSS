import { Component, BaseOptions, InitElements, MElement, Openable } from "../core/component";
import { Utils } from '../core/utils';

export interface FloatingActionButtonOptions extends BaseOptions {
  /**
   * Direction FAB menu opens.
   * @default "top"
   */
  direction: 'top' | 'right' | 'bottom' | 'left';
  /**
   * true: FAB menu appears on hover, false: FAB menu appears on click.
   * @default true
   */
  hoverEnabled: boolean;
  /**
   * Enable transit the FAB into a toolbar on click.
   * @default false
   */
  toolbarEnabled: boolean;
}

const _defaults: FloatingActionButtonOptions = {
  direction: 'top',
  hoverEnabled: true,
  toolbarEnabled: false
};

export class FloatingActionButton
  extends Component<FloatingActionButtonOptions>
  implements Openable
{
  /**
   * Describes open/close state of FAB.
   */
  isOpen: boolean;

  private _anchor: HTMLElement;
  private _menu: HTMLElement | null;
  private _floatingBtns: HTMLElement[];
  private _floatingBtnsReverse: HTMLElement[];
  /** Toolbar-mode backdrop, kept so closing can take it back out. */
  private _backdrop: HTMLElement | null = null;

  offsetY: number;
  offsetX: number;
  btnBottom: number;
  btnLeft: number;
  btnWidth: number;

  constructor(el: HTMLElement, options: Partial<FloatingActionButtonOptions>) {
    super(el, options, FloatingActionButton);
    this.el['RoutePlate_FloatingActionButton'] = this;

    this.options = {
      ...FloatingActionButton.defaults,
      ...options
    };

    this.isOpen = false;
    this._anchor = this.el.querySelector('a, button');
    this._menu = this.el.querySelector('ul');
    this._floatingBtns = Array.from(this.el.querySelectorAll('ul .btn-floating'));
    this._floatingBtnsReverse = this._floatingBtns.reverse();
    this.offsetY = 0;
    this.offsetX = 0;

    this.el.classList.add(`direction-${this.options.direction}`);
    if (this._anchor) this._anchor.tabIndex = 0;
    if (this._menu) this._menu.ariaExpanded = 'false';
    if (this.options.direction === 'top')
      this.offsetY = 40;
    else if (this.options.direction === 'right')
      this.offsetX = -40;
    else if (this.options.direction === 'bottom')
      this.offsetY = -40;
    else
      this.offsetX = 40;
    this._setupEventHandlers();
  }

  static get defaults() {
    return _defaults;
  }

  /**
   * Initializes instance of FloatingActionButton.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(
    el: HTMLElement,
    options?: Partial<FloatingActionButtonOptions>
  ): FloatingActionButton;
  /**
   * Initializes instances of FloatingActionButton.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<MElement>,
    options?: Partial<FloatingActionButtonOptions>
  ): FloatingActionButton[];
  /**
   * Initializes instances of FloatingActionButton.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<MElement>,
    options: Partial<FloatingActionButtonOptions> = {}
  ): FloatingActionButton | FloatingActionButton[] {
    return super.init(els, options, FloatingActionButton);
  }

  static getInstance(el: HTMLElement): FloatingActionButton {
    return el['RoutePlate_FloatingActionButton'];
  }

  destroy() {
    this._removeEventHandlers();
    // Toolbar mode parks a capture-phase scroll listener and a body click
    // listener on the document; close() is what takes them back off.
    this.close();
    this.el['RoutePlate_FloatingActionButton'] = undefined;
  }

  _setupEventHandlers() {
    if (this.options.hoverEnabled && !this.options.toolbarEnabled) {
      this.el.addEventListener('mouseenter', this.open);
      this.el.addEventListener('mouseleave', this.close);
    } else {
      this.el.addEventListener('click', this._handleFABClick);
    }
    this.el.addEventListener('keypress', this._handleFABKeyPress);
  }

  _removeEventHandlers() {
    if (this.options.hoverEnabled && !this.options.toolbarEnabled) {
      this.el.removeEventListener('mouseenter', this.open);
      this.el.removeEventListener('mouseleave', this.close);
    } else {
      this.el.removeEventListener('click', this._handleFABClick);
    }
    this.el.removeEventListener('keypress', this._handleFABKeyPress);
  }

  _handleFABClick = () => {
    this._handleFABToggle()
}

  _handleFABKeyPress = (e) => {
    if(Utils.keys.ENTER.includes(e.key)) {
      this._handleFABToggle();
    }
  }

  _handleFABToggle = () => {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  };

  _handleDocumentClick = (e: MouseEvent) => {
    const elem = e.target;
    if (elem !== this._menu) this.close();
  };

  /**
   * Open FAB.
   */
  open = (): void => {
    if (this.isOpen) return;
    if (this.options.toolbarEnabled) this._animateInToolbar();
    else this._animateInFAB();
    this.isOpen = true;
  };

  /**
   * Close FAB.
   */
  close = (): void => {
    if (!this.isOpen) return;
    if (this.options.toolbarEnabled) {
      window.removeEventListener('scroll', this.close, true);
      document.body.removeEventListener('click', this._handleDocumentClick, true);
      this._animateOutToolbar();
    } else {
      this._animateOutFAB();
    }
    this.isOpen = false;
  };

  _animateInFAB() {
    this.el.classList.add('active');
    if (this._menu) this._menu.ariaExpanded = 'true';
    const delayIncrement = 40;
    const duration = 275;

    this._floatingBtnsReverse.forEach((el, index) => {
      const delay = delayIncrement * index;
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(0.4)`;
      setTimeout(() => {
        // from:
        el.style.opacity = '0.4';
        // easeInOutQuad
        setTimeout(() => {
          // to:
          el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
          el.style.opacity = '1';
          el.style.transform = 'translate(0, 0) scale(1)';
          el.tabIndex = 0;
        }, 1);
      }, delay);
    });
  }

  _animateOutFAB() {
    const duration = 175;
    setTimeout(() => {
      this.el.classList.remove('active');
      if (this._menu) this._menu.ariaExpanded = 'false';
    }, duration);
    this._floatingBtnsReverse.forEach((el) => {
      el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      // to
      el.style.opacity = '0';
      el.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(0.4)`;
      el.tabIndex = -1;
    });
  }

  _animateInToolbar() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const btnRect = this.el.getBoundingClientRect();
    const fabColor = getComputedStyle(this._anchor).backgroundColor;

    // The backdrop has to be in the document before it has a width. Reading
    // `backdrop[0].clientWidth` off a bare element - a leftover from the
    // cash-based original, where [0] unwrapped the collection - threw here and
    // took the whole of toolbar mode with it.
    const backdrop = document.createElement('div');
    backdrop.classList.add('fab-backdrop');
    backdrop.style.backgroundColor = fabColor;
    this._anchor.append(backdrop);
    this._backdrop = backdrop;
    const backdropWidth = backdrop.clientWidth;
    const scaleFactor = backdropWidth > 0 ? windowWidth / backdropWidth : 1;

    this.offsetX = btnRect.left - windowWidth / 2 + btnRect.width / 2;
    this.offsetY = windowHeight - btnRect.bottom;
    this.btnBottom = btnRect.bottom;
    this.btnLeft = btnRect.left;
    this.btnWidth = btnRect.width;

    // Set initial state
    this.el.classList.add('active');
    this.el.style.textAlign = 'center';
    this.el.style.width = '100%';
    this.el.style.bottom = '0';
    this.el.style.left = '0';
    this.el.style.transform = 'translateX(' + this.offsetX + 'px)';
    this.el.style.transition = 'none';
    if (this._menu) this._menu.ariaExpanded = 'true';

    // Was missing its closing paren, so the browser dropped the declaration.
    this._anchor.style.transform = `translateY(${this.offsetY}px)`;
    this._anchor.style.transition = 'none';

    setTimeout(() => {
      this.el.style.transform = '';
      this.el.style.transition =
        'transform .2s cubic-bezier(0.550, 0.085, 0.680, 0.530), background-color 0s linear .2s';

      this._anchor.style.overflow = 'visible';
      this._anchor.style.transform = '';
      this._anchor.style.transition = 'transform .2s';

      setTimeout(() => {
        this.el.style.overflow = 'hidden';
        this.el.style.backgroundColor = fabColor;

        backdrop.style.transform = 'scale(' + scaleFactor + ')';
        backdrop.style.transition = 'transform .2s cubic-bezier(0.550, 0.055, 0.675, 0.190)';

        this._menu.querySelectorAll('li > a').forEach((a: HTMLAnchorElement) => {
          a.style.opacity = '1';
          a.tabIndex = 0;
        });

        // Scroll to close.
        window.addEventListener('scroll', this.close, true);
        document.body.addEventListener('click', this._handleDocumentClick, true);
      }, 100);
    }, 0);
  }

  /**
   * Reverse {@link _animateInToolbar}.
   *
   * Closing used to only unbind the listeners, leaving the FAB stretched
   * across the viewport with its backdrop still in the DOM - and a fresh
   * backdrop appended on every subsequent open.
   */
  _animateOutToolbar() {
    const backdrop = this._backdrop;
    this._backdrop = null;

    this._menu?.querySelectorAll('li > a').forEach((a: HTMLAnchorElement) => {
      a.style.opacity = '';
      a.tabIndex = -1;
    });

    if (backdrop) {
      backdrop.style.transition = 'transform .2s';
      backdrop.style.transform = 'scale(0)';
    }

    this.el.style.overflow = '';
    this.el.style.backgroundColor = '';
    this.el.style.transition = 'transform .2s';
    this.el.style.transform = `translateX(${this.offsetX}px)`;
    this._anchor.style.transition = 'transform .2s';
    this._anchor.style.transform = `translateY(${this.offsetY}px)`;

    setTimeout(() => {
      backdrop?.remove();
      this.el.classList.remove('active');
      if (this._menu) this._menu.ariaExpanded = 'false';
      // Clear every inline style _animateInToolbar wrote.
      this.el.style.textAlign = '';
      this.el.style.width = '';
      this.el.style.bottom = '';
      this.el.style.left = '';
      this.el.style.transform = '';
      this.el.style.transition = '';
      this._anchor.style.overflow = '';
      this._anchor.style.transform = '';
      this._anchor.style.transition = '';
    }, 200);
  }
}
