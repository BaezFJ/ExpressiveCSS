import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface ScrollSpyOptions extends BaseOptions {
  /**
   * Offset used as IntersectionObserver rootMargin and as
   * `--md-comp-scrollspy-offset` (scroll-margin on the section).
   * @default 200
   */
  scrollOffset: number;
  /**
   * Class applied to active elements.
   * @default 'active'
   */
  activeClass: string;
  /**
   * Returns a CSS selector for the TOC link. The default is unused: links
   * are found by comparing `a[href^="#"]` to `#id`. A custom function
   * still runs through `querySelector` (escape any author id yourself).
   * @default id => 'a[href="#' + id + '"]'
   */
  getActiveElement: (id: string) => string;
  /**
   * If true, keep the last section above the viewport active when nothing
   * intersects. If there is no such section, the first one stays active.
   * @default false
   */
  keepTopElementActive: boolean;
}

const _defaultGetActiveElement = (id: string): string => `a[href="#${id}"]`;

const _defaults: ScrollSpyOptions = {
  scrollOffset: 200,
  activeClass: 'active',
  getActiveElement: _defaultGetActiveElement,
  keepTopElementActive: false
};

/**
 * ScrollSpy. IntersectionObserver decides which section is current.
 * Hash links are left to the browser (`scroll-margin` + `scroll-behavior`).
 */
export class ScrollSpy extends Component<ScrollSpyOptions> {
  static _elements: ScrollSpy[] = [];
  private static _active = new Map<ScrollSpyOptions['getActiveElement'], ScrollSpy>();
  private _observer: IntersectionObserver;
  private _ratio = 0;
  private _link: Element | null = null;
  private _offset: string;
  private _offsetPriority: string;

  constructor(el: HTMLElement, options: Partial<ScrollSpyOptions>) {
    super(el, options, ScrollSpy);
    this.el['Expressive_ScrollSpy'] = this;

    this.options = {
      ...ScrollSpy.defaults,
      ...options
    };

    this._offset = this.el.style.getPropertyValue('--md-comp-scrollspy-offset');
    this._offsetPriority = this.el.style.getPropertyPriority('--md-comp-scrollspy-offset');
    this.el.style.setProperty(
      '--md-comp-scrollspy-offset',
      `${this.options.scrollOffset}px`
    );

    ScrollSpy._elements.push(this);
    if (typeof IntersectionObserver !== 'undefined') {
      this._observer = new IntersectionObserver((entries) => {
        if (ScrollSpy.getInstance(this.el) !== this) return;
        for (const entry of entries) this._ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        ScrollSpy._syncActive(this.options.getActiveElement);
      }, {
        rootMargin: `-${this.options.scrollOffset}px 0px -45% 0px`,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
      });
      this._observer.observe(this.el);
    }
  }

  static get defaults(): ScrollSpyOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<ScrollSpyOptions>): ScrollSpy;
  static init(els: InitElements<InitElement>, options?: Partial<ScrollSpyOptions>): ScrollSpy[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<ScrollSpyOptions> = {}
  ): ScrollSpy | ScrollSpy[] {
    return super.init(els, options, ScrollSpy);
  }

  static getInstance(el: HTMLElement): ScrollSpy {
    return el['Expressive_ScrollSpy'];
  }

  destroy() {
    const index = ScrollSpy._elements.indexOf(this);
    if (index < 0) return;
    ScrollSpy._elements.splice(index, 1);
    this._observer?.disconnect();
    const resolver = this.options.getActiveElement;
    if (ScrollSpy._active.get(resolver) === this) ScrollSpy._clearActive(resolver);
    this.el.style.setProperty('--md-comp-scrollspy-offset', this._offset, this._offsetPriority);
    this.el['Expressive_ScrollSpy'] = undefined;
    ScrollSpy._syncActive(resolver);
  }

  private static _syncActive(resolver: ScrollSpyOptions['getActiveElement']) {
    const elements = ScrollSpy._elements.filter(spy => spy.options.getActiveElement === resolver);

    let best: ScrollSpy | null = null;
    let bestRatio = 0;
    for (const spy of elements) {
      const ratio = spy._ratio;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = spy;
      }
    }

    if (!best) {
      const retained = elements.filter(spy => spy.options.keepTopElementActive);
      best = ScrollSpy._nearestAbove(retained) ?? retained[0];
    }

    const next = best ? ScrollSpy._linkFor(best.el.id, best.options) : null;
    const active = ScrollSpy._active.get(resolver);
    if (active === best && active?._link === next) return;
    ScrollSpy._clearActive(resolver);
    if (!next) return;
    next.classList.add(best.options.activeClass);
    next.setAttribute('aria-current', 'true');
    best._link = next;
    ScrollSpy._active.set(resolver, best);
  }

  private static _nearestAbove(elements: ScrollSpy[]): ScrollSpy | null {
    let best: ScrollSpy | null = null;
    let bestTop = -Infinity;
    for (const spy of elements) {
      const top = spy.el.getBoundingClientRect().top;
      if (top <= 0 && top >= bestTop) {
        bestTop = top;
        best = spy;
      }
    }
    return best;
  }

  private static _clearActive(resolver: ScrollSpyOptions['getActiveElement']) {
    const active = ScrollSpy._active.get(resolver);
    if (!active) return;
    active._link?.classList.remove(active.options.activeClass);
    active._link?.removeAttribute('aria-current');
    active._link = null;
    ScrollSpy._active.delete(resolver);
  }

  /**
   * Default lookup compares href attributes (no interpolated selector).
   * A custom getActiveElement still returns a selector.
   */
  static _linkFor(id: string, options: ScrollSpyOptions): Element | null {
    if (!id) return null;
    if (options.getActiveElement !== _defaultGetActiveElement) {
      try {
        return document.querySelector(options.getActiveElement(id));
      } catch {
        return null;
      }
    }
    const href = `#${id}`;
    const links = document.querySelectorAll('a[href^="#"]');
    for (let i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === href) return links[i];
    }
    return null;
  }
}
