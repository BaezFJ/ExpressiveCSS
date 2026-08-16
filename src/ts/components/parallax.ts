import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, MElement } from '../core/component';

export interface ParallaxOptions extends BaseOptions {
  /**
   * The minimum width of the screen, in pixels, where the parallax functionality starts working.
   * @default 0
   */
  responsiveThreshold: number;
}

const _defaults: ParallaxOptions = {
  responsiveThreshold: 0 // breakpoint for swipeable
};

export class Parallax extends Component<ParallaxOptions> {
  private _enabled: boolean;
  private _img: HTMLImageElement;
  static _parallaxes: Parallax[] = [];
  static _handleWindowResizeThrottled: (...args: unknown[]) => void;
  private static _scrollFrame: number = null;

  constructor(el: HTMLElement, options: Partial<ParallaxOptions>) {
    super(el, options, Parallax);
    this.el['Expressive_Parallax'] = this;

    this.options = {
      ...Parallax.defaults,
      ...options
    };

    this._enabled = window.innerWidth > this.options.responsiveThreshold;
    this._img = this.el.querySelector('img');
    if (!this._img) {
      console.error('Parallax: no <img> to move inside the .parallax element');
      return;
    }
    this._updateParallax();
    this._setupEventHandlers();
    this._setupStyles();
    Parallax._parallaxes.push(this);
  }

  static get defaults(): ParallaxOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Parallax.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<ParallaxOptions>): Parallax;
  /**
   * Initializes instances of Parallax.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<MElement>, options?: Partial<ParallaxOptions>): Parallax[];
  /**
   * Initializes instances of Parallax.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<MElement>,
    options: Partial<ParallaxOptions> = {}
  ): Parallax | Parallax[] {
    return super.init(els, options, Parallax);
  }

  static getInstance(el: HTMLElement): Parallax {
    return el['Expressive_Parallax'];
  }

  destroy() {
    const index = Parallax._parallaxes.indexOf(this);
    if (index >= 0) Parallax._parallaxes.splice(index, 1);
    if (this._img) this._img.style.transform = '';
    this._removeEventHandlers();
    this.el['Expressive_Parallax'] = undefined;
  }

  static _handleScroll() {
    for (let i = 0; i < Parallax._parallaxes.length; i++) {
      const parallaxInstance = Parallax._parallaxes[i];
      parallaxInstance._updateParallax.call(parallaxInstance);
    }
  }

  /**
   * Coalesce scroll events onto animation frames.
   *
   * The handler reads layout and then writes a transform, so running it more
   * than once per frame is wasted work - and the 5ms throttle it replaces was
   * short enough to let several run per frame anyway.
   */
  static _requestScrollUpdate = () => {
    if (Parallax._scrollFrame !== null) return;
    Parallax._scrollFrame = requestAnimationFrame(() => {
      Parallax._scrollFrame = null;
      Parallax._handleScroll();
    });
  };

  static _handleWindowResize() {
    for (let i = 0; i < Parallax._parallaxes.length; i++) {
      const parallaxInstance = Parallax._parallaxes[i];
      parallaxInstance._enabled = window.innerWidth > parallaxInstance.options.responsiveThreshold;
    }
  }

  _setupEventHandlers() {
    this._img?.addEventListener('load', this._handleImageLoad);
    if (Parallax._parallaxes.length === 0) {
      if (!Parallax._handleWindowResizeThrottled) {
        Parallax._handleWindowResizeThrottled = Utils.throttle(Parallax._handleWindowResize, 100);
      }
      window.addEventListener('scroll', Parallax._requestScrollUpdate, { passive: true });
      window.addEventListener('resize', Parallax._handleWindowResizeThrottled, { passive: true });
    }
  }

  _removeEventHandlers() {
    this._img?.removeEventListener('load', this._handleImageLoad);
    if (Parallax._parallaxes.length === 0) {
      window.removeEventListener('scroll', Parallax._requestScrollUpdate);
      window.removeEventListener('resize', Parallax._handleWindowResizeThrottled);
      if (Parallax._scrollFrame !== null) {
        cancelAnimationFrame(Parallax._scrollFrame);
        Parallax._scrollFrame = null;
      }
    }
  }

  _setupStyles() {
    if (this._img) this._img.style.opacity = '1';
  }

  _handleImageLoad = () => {
    this._updateParallax();
  };

  _updateParallax() {
    // Runs for every parallax element on every scroll tick, so it reads
    // layout once: one rect for the element, reused for the height check and
    // both offsets.
    const rect = this.el.getBoundingClientRect();
    const containerHeight = rect.height > 0 ? this.el.parentElement.offsetHeight : 500;
    const imgHeight = this._img.offsetHeight;
    const parallaxDist = imgHeight - containerHeight;
    const top = rect.top + window.scrollY - document.documentElement.clientTop;
    const bottom = top + containerHeight;
    const scrollTop = Utils.getDocumentScrollTop();
    const windowHeight = window.innerHeight;
    const windowBottom = scrollTop + windowHeight;
    const percentScrolled = (windowBottom - top) / (containerHeight + windowHeight);
    const parallax = parallaxDist * percentScrolled;

    if (!this._enabled) {
      this._img.style.transform = '';
    } else if (bottom > scrollTop && top < scrollTop + windowHeight) {
      this._img.style.transform = `translate3D(-50%, ${parallax}px, 0)`;
    }
  }
}
