import { Component, BaseOptions, InitElements, MElement } from '../core/component';

export interface ScrollSpyOptions extends BaseOptions {
  /**
   * @deprecated Observation is IntersectionObserver. Accepted and ignored.
   * @default 100
   */
  throttle: number;
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
  /**
   * @deprecated Clicks are native hash navigation. Accepted and ignored.
   * @default null
   */
  animationDuration: number | null;
}

const _defaultGetActiveElement = (id: string): string => `a[href="#${id}"]`;

const _defaults: ScrollSpyOptions = {
  throttle: 100,
  scrollOffset: 200,
  activeClass: 'active',
  getActiveElement: _defaultGetActiveElement,
  keepTopElementActive: false,
  animationDuration: null
};

/**
 * ScrollSpy. IntersectionObserver decides which section is current.
 * Hash links are left to the browser (`scroll-margin` + `scroll-behavior`).
 */
export class ScrollSpy extends Component<ScrollSpyOptions> {
  static _elements: ScrollSpy[] = [];
  private static _observer: IntersectionObserver | null = null;
  private static _ratios = new Map<Element, number>();
  private static _active: Element | null = null;

  constructor(el: HTMLElement, options: Partial<ScrollSpyOptions>) {
    super(el, options, ScrollSpy);
    this.el['Expressive_ScrollSpy'] = this;

    this.options = {
      ...ScrollSpy.defaults,
      ...options
    };

    this.el.style.setProperty(
      '--md-comp-scrollspy-offset',
      `${this.options.scrollOffset}px`
    );

    ScrollSpy._elements.push(this);
    ScrollSpy._ensureObserver(this.options.scrollOffset);
    ScrollSpy._observer?.observe(this.el);
  }

  static get defaults(): ScrollSpyOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<ScrollSpyOptions>): ScrollSpy;
  static init(els: InitElements<MElement>, options?: Partial<ScrollSpyOptions>): ScrollSpy[];
  static init(
    els: HTMLElement | InitElements<MElement>,
    options: Partial<ScrollSpyOptions> = {}
  ): ScrollSpy | ScrollSpy[] {
    return super.init(els, options, ScrollSpy);
  }

  static getInstance(el: HTMLElement): ScrollSpy {
    return el['Expressive_ScrollSpy'];
  }

  destroy() {
    const index = ScrollSpy._elements.indexOf(this);
    if (index >= 0) ScrollSpy._elements.splice(index, 1);
    ScrollSpy._ratios.delete(this.el);
    ScrollSpy._observer?.unobserve(this.el);

    const link = ScrollSpy._linkFor(this.el.id, this.options);
    if (link && link === ScrollSpy._active) {
      ScrollSpy._clearActive(this.options);
    } else {
      link?.classList.remove(this.options.activeClass);
      link?.removeAttribute('aria-current');
    }

    if (ScrollSpy._elements.length === 0) {
      ScrollSpy._observer?.disconnect();
      ScrollSpy._observer = null;
      ScrollSpy._ratios.clear();
      ScrollSpy._active = null;
    } else {
      ScrollSpy._syncActive();
    }

    this.el['Expressive_ScrollSpy'] = undefined;
  }

  private static _ensureObserver(offset: number) {
    if (ScrollSpy._observer) return;
    if (typeof IntersectionObserver === 'undefined') return;
    ScrollSpy._observer = new IntersectionObserver(ScrollSpy._onIntersect, {
      rootMargin: `-${offset}px 0px -45% 0px`,
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    });
  }

  private static _onIntersect = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio > 0) {
        ScrollSpy._ratios.set(entry.target, entry.intersectionRatio);
      } else {
        ScrollSpy._ratios.delete(entry.target);
      }
    }
    ScrollSpy._syncActive();
  };

  private static _syncActive() {
    if (!ScrollSpy._elements.length) return;
    const options = ScrollSpy._elements[0].options;

    let best: ScrollSpy | null = null;
    let bestRatio = 0;
    for (const spy of ScrollSpy._elements) {
      const ratio = ScrollSpy._ratios.get(spy.el) ?? 0;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = spy;
      }
    }

    if (!best) {
      if (options.keepTopElementActive) {
        best = ScrollSpy._nearestAbove() ?? ScrollSpy._elements[0];
      } else {
        ScrollSpy._clearActive(options);
        return;
      }
    }

    const next = ScrollSpy._linkFor(best.el.id, best.options);
    if (next === ScrollSpy._active) return;
    ScrollSpy._clearActive(options);
    if (!next) return;
    next.classList.add(best.options.activeClass);
    next.setAttribute('aria-current', 'true');
    ScrollSpy._active = next;
  }

  private static _nearestAbove(): ScrollSpy | null {
    let best: ScrollSpy | null = null;
    let bestTop = -Infinity;
    for (const spy of ScrollSpy._elements) {
      const top = spy.el.getBoundingClientRect().top;
      if (top <= 0 && top >= bestTop) {
        bestTop = top;
        best = spy;
      }
    }
    return best;
  }

  private static _clearActive(options: ScrollSpyOptions) {
    if (!ScrollSpy._active) return;
    ScrollSpy._active.classList.remove(options.activeClass);
    ScrollSpy._active.removeAttribute('aria-current');
    ScrollSpy._active = null;
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
