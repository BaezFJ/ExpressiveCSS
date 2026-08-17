import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement, Openable } from '../core/component';

export interface TapTargetOptions extends BaseOptions {
  /**
   * Callback function called when Tap Target is opened.
   * @default null
   */
  onOpen: (origin: HTMLElement) => void;
  /**
   * Callback function called when Tap Target is closed.
   * @default null
   */
  onClose: (origin: HTMLElement) => void;
}

const _defaults: TapTargetOptions = {
  onOpen: null,
  onClose: null
};

/**
 * Tap target (Feature Discovery). Placement is CSS custom properties;
 * the wrapper is a popover when the platform has one. This class is
 * open/close, origin lookup, and the two geometry variables.
 */
export class TapTarget extends Component<TapTargetOptions> implements Openable {
  isOpen: boolean;
  originEl: HTMLElement | null;

  static _taptargets: TapTarget[];

  private wrapper: HTMLElement | null = null;
  private waveEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private _createdWrapper = false;
  private _createdWave = false;
  private _usePopover = false;
  private _liftedStatic = false;
  private _opening = false;

  constructor(el: HTMLElement, options: Partial<TapTargetOptions>) {
    super(el, options, TapTarget);
    this.el['Expressive_TapTarget'] = this;

    this.options = {
      ...TapTarget.defaults,
      ...options
    };

    this.isOpen = false;
    // getElementById, not a `#${…}` selector: data-target is author content
    // and anything that is not a bare identifier either threw a SyntaxError
    // here or steered the query somewhere else.
    this.originEl = el.dataset.target ? document.getElementById(el.dataset.target) : null;
    if (!this.originEl) {
      console.error(`TapTarget: no element with id "${el.dataset.target ?? ''}" to attach to`);
      return;
    }

    this._setup();
    this._calculatePositioning();
    this._setupEventHandlers();

    TapTarget._taptargets.push(this);
  }

  static get defaults(): TapTargetOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<TapTargetOptions>): TapTarget;
  static init(els: InitElements<InitElement>, options?: Partial<TapTargetOptions>): TapTarget[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<TapTargetOptions> = {}
  ): TapTarget | TapTarget[] {
    return super.init(els, options, TapTarget);
  }

  static getInstance(el: HTMLElement): TapTarget {
    return el['Expressive_TapTarget'];
  }

  destroy() {
    this.close();
    this._removeEventHandlers();
    this._teardownDom();
    this.el['Expressive_TapTarget'] = undefined;
    const index = TapTarget._taptargets.indexOf(this);
    if (index >= 0) TapTarget._taptargets.splice(index, 1);
  }

  /**
   * Open Tap Target.
   */
  open = () => {
    if (this.isOpen || !this.originEl || !this.wrapper) return;

    TapTarget._taptargets.forEach((other) => {
      if (other !== this) other.close();
    });

    this._calculatePositioning();

    if (typeof this.options.onOpen === 'function') {
      this.options.onOpen.call(this, this.originEl);
    }

    this.isOpen = true;
    this.wrapper.classList.add('open');
    this.originEl.setAttribute('aria-expanded', 'true');

    if (!this._usePopover) {
      this.originEl.classList.add('tap-target-origin');
      if (getComputedStyle(this.originEl).position === 'static') {
        this.originEl.style.position = 'relative';
        this._liftedStatic = true;
      }
    }

    if (this._usePopover) {
      this._opening = true;
      try {
        this.wrapper.showPopover();
      } catch {
        // already open
      }
      requestAnimationFrame(() => {
        this._opening = false;
      });
    }
  };

  /**
   * Close Tap Target.
   */
  close = () => {
    if (!this.isOpen) return;

    if (typeof this.options.onClose === 'function' && this.originEl) {
      this.options.onClose.call(this, this.originEl);
    }

    this.isOpen = false;
    this.wrapper?.classList.remove('open');
    this.originEl?.setAttribute('aria-expanded', 'false');
    this.originEl?.classList.remove('tap-target-origin');
    if (this._liftedStatic && this.originEl) {
      this.originEl.style.position = '';
      this._liftedStatic = false;
    }

    if (this._usePopover && this.wrapper) {
      try {
        this.wrapper.hidePopover();
      } catch {
        // already closed
      }
    }
  };

  private _setup() {
    const parent = this.el.parentElement;
    if (parent?.classList.contains('tap-target-wrapper')) {
      this.wrapper = parent;
    } else {
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('tap-target-wrapper');
      this.el.before(this.wrapper);
      this.wrapper.append(this.el);
      this._createdWrapper = true;
    }

    this.contentEl = this.el.querySelector('.tap-target-content');
    if (!this.contentEl) {
      this.contentEl = document.createElement('div');
      this.contentEl.className = 'tap-target-content';
      while (this.el.firstChild) this.contentEl.append(this.el.firstChild);
      this.el.append(this.contentEl);
    }

    this.waveEl =
      this.el.querySelector('.tap-target-wave') ??
      this.wrapper.querySelector('.tap-target-wave');
    if (!this.waveEl) {
      this.waveEl = document.createElement('div');
      this.waveEl.className = 'tap-target-wave';
      this._createdWave = true;
    }
    // Inside the circle, behind .tap-target-content — a sibling of the
    // circle paints over the copy.
    this.el.prepend(this.waveEl);

    this.el.setAttribute('role', 'dialog');
    this._labelFromHeading();

    const origin = this.originEl;
    origin.setAttribute('aria-expanded', 'false');
    origin.setAttribute('aria-controls', this.el.id || this._ensureId());

    this._usePopover = typeof this.wrapper.showPopover === 'function';
    if (this._usePopover) {
      this.wrapper.setAttribute('popover', 'auto');
    }
  }

  private _ensureId(): string {
    if (!this.el.id) this.el.id = `tap-target-${Utils.guid()}`;
    return this.el.id;
  }

  private _labelFromHeading() {
    const heading = this.contentEl?.querySelector('h1, h2, h3, h4, h5, h6');
    if (!heading) return;
    if (!heading.id) heading.id = `tap-target-title-${Utils.guid()}`;
    this.el.setAttribute('aria-labelledby', heading.id);
  }

  private _teardownDom() {
    if (this._createdWave) this.waveEl?.remove();
    if (this._createdWrapper && this.wrapper) {
      this.wrapper.before(this.el);
      this.wrapper.remove();
    }
    this.wrapper = null;
    this.waveEl = null;
  }

  private _setupEventHandlers() {
    if (!this.originEl) return;
    this.originEl.addEventListener('click', this._handleTargetToggle);
    if (!this.originEl.matches('button, a, [tabindex], [role="button"]')) {
      this.originEl.tabIndex = 0;
      this.originEl.addEventListener('keydown', this._handleOriginKeydown);
    }
    this.wrapper?.addEventListener('toggle', this._handlePopoverToggle);
    window.addEventListener('resize', this._handleThrottledResize, { passive: true });
  }

  private _removeEventHandlers() {
    if (!this.originEl) return;
    this.originEl.removeEventListener('click', this._handleTargetToggle);
    this.originEl.removeEventListener('keydown', this._handleOriginKeydown);
    this.wrapper?.removeEventListener('toggle', this._handlePopoverToggle);
    window.removeEventListener('resize', this._handleThrottledResize);
  }

  // Built once per instance; a fresh throttle per event never fires.
  private _handleThrottledResize = Utils.throttle(() => this._handleResize(), 200);

  private _handleOriginKeydown = (e: KeyboardEvent) => {
    if (Utils.keys.ENTER.includes(e.key) || e.key === ' ') {
      e.preventDefault();
      this._handleTargetToggle();
    }
  };

  private _handleTargetToggle = () => {
    if (!this.isOpen) this.open();
    else this.close();
  };

  private _handleResize = () => {
    if (this.isOpen) this._calculatePositioning();
  };

  private _handlePopoverToggle = (e: Event) => {
    const state = 'newState' in e ? String((e as { newState: string }).newState) : '';
    if (state === 'open') return;
    if (this._opening) {
      try {
        this.wrapper?.showPopover();
      } catch {
        /* still opening */
      }
      return;
    }
    if (this.isOpen) this.close();
  };

  private _calculatePositioning() {
    if (!this.originEl || !this.wrapper) return;
    const rect = this.originEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const size = Math.max(rect.width, rect.height, 1);

    this.wrapper.style.setProperty('--md-comp-tap-target-x', `${x}px`);
    this.wrapper.style.setProperty('--md-comp-tap-target-y', `${y}px`);
    this.wrapper.style.setProperty('--md-comp-tap-target-origin-size', `${size}px`);

    const vertical = y <= window.innerHeight / 2 ? 'top' : 'bottom';
    const onCenter = x >= window.innerWidth * 0.25 && x <= window.innerWidth * 0.75;
    const horizontal = onCenter ? 'center' : x <= window.innerWidth / 2 ? 'left' : 'right';
    this.wrapper.dataset.edge = `${vertical}-${horizontal}`;
  }

  static {
    TapTarget._taptargets = [];
  }
}
