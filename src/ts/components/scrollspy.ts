import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, MElement } from '../core/component';

export interface ScrollSpyOptions extends BaseOptions {
  /**
   * Throttle of scroll handler.
   * @default 100
   */
  throttle: number;
  /**
   * Offset for centering element when scrolled to.
   * @default 200
   */
  scrollOffset: number;
  /**
   * Class applied to active elements.
   * @default 'active'
   */
  activeClass: string;
  /**
   * Used to find active element.
   * @default id => 'a[href="#' + id + '"]'
   */
  getActiveElement: (id: string) => string;
  /**
   * Used to keep last top element active even if
   * scrollbar goes outside of scrollspy elements.
   *
   * If there is no last top element,
   * then the active one will be the first element.
   *
   * @default false
   */
  keepTopElementActive: boolean;
  /**
   * Used to set scroll animation duration in milliseconds.
   * @default null (browser's native animation implementation/duration)
   */
  animationDuration: number | null;
}

const _defaults: ScrollSpyOptions = {
  throttle: 100,
  scrollOffset: 200, // offset - 200 allows elements near bottom of page to scroll
  activeClass: 'active',
  getActiveElement: (id: string): string => {
    return 'a[href="#' + id + '"]';
  },
  keepTopElementActive: false,
  animationDuration: null
};

export class ScrollSpy extends Component<ScrollSpyOptions> {
  static _elements: ScrollSpy[];
  static _count: number;
  static _increment: number;
  static _elementsInView: ScrollSpy[];
  static _visibleElements: HTMLElement[];
  static _ticks: number;
  static _keptTopActiveElement: HTMLElement | null = null;
  // The document-level listeners are shared by every instance, so the
  // references they are registered with have to be shared too - registering
  // with one instance's bound handler and unregistering with another's is a
  // silent no-op that leaves the listener attached forever.
  private static _throttledScroll: (...args: unknown[]) => void = null;
  private static _throttledResize: (...args: unknown[]) => void = null;

  private tickId: number;
  private id: string;

  constructor(el: HTMLElement, options: Partial<ScrollSpyOptions>) {
    super(el, options, ScrollSpy);
    this.el['RoutePlate_ScrollSpy'] = this;

    this.options = {
      ...ScrollSpy.defaults,
      ...options
    };

    ScrollSpy._elements.push(this);
    ScrollSpy._count++;
    ScrollSpy._increment++;
    this.tickId = -1;
    this.id = ScrollSpy._increment.toString();
    this._setupEventHandlers();
    ScrollSpy._handleWindowScroll();
  }

  static get defaults(): ScrollSpyOptions {
    return _defaults;
  }

  /**
   * Initializes instance of ScrollSpy.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<ScrollSpyOptions>): ScrollSpy;
  /**
   * Initializes instances of ScrollSpy.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<MElement>, options?: Partial<ScrollSpyOptions>): ScrollSpy[];
  /**
   * Initializes instances of ScrollSpy.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<MElement>,
    options: Partial<ScrollSpyOptions> = {}
  ): ScrollSpy | ScrollSpy[] {
    return super.init(els, options, ScrollSpy);
  }

  static getInstance(el: HTMLElement): ScrollSpy {
    return el['RoutePlate_ScrollSpy'];
  }

  destroy() {
    const elementIndex = ScrollSpy._elements.indexOf(this);
    if (elementIndex >= 0) ScrollSpy._elements.splice(elementIndex, 1);
    const inViewIndex = ScrollSpy._elementsInView.indexOf(this);
    if (inViewIndex >= 0) ScrollSpy._elementsInView.splice(inViewIndex, 1);
    const visibleIndex = ScrollSpy._visibleElements.indexOf(this.el);
    if (visibleIndex >= 0) ScrollSpy._visibleElements.splice(visibleIndex, 1);
    ScrollSpy._count--;
    this._removeEventHandlers();
    // Optional: the trigger may already be gone from the DOM, and throwing
    // here would abort the rest of the teardown.
    const actElem = document.querySelector(this.options.getActiveElement(this.el.id));
    actElem?.classList.remove(this.options.activeClass);
    this.el['RoutePlate_ScrollSpy'] = undefined;
  }

  _setupEventHandlers() {
    if (ScrollSpy._count === 1) {
      // Honour the documented `throttle` option - the scroll handler reads
      // layout for every spied element, so running it on every scroll event
      // was the single most expensive thing this component did.
      ScrollSpy._throttledScroll = Utils.throttle(ScrollSpy._handleWindowScroll, this.options.throttle);
      ScrollSpy._throttledResize = Utils.throttle(ScrollSpy._handleWindowScroll, 200);
      window.addEventListener('scroll', ScrollSpy._throttledScroll, { passive: true });
      window.addEventListener('resize', ScrollSpy._throttledResize, { passive: true });
      document.body.addEventListener('click', ScrollSpy._handleTriggerClick);
    }
  }

  _removeEventHandlers() {
    if (ScrollSpy._count === 0) {
      window.removeEventListener('scroll', ScrollSpy._throttledScroll);
      window.removeEventListener('resize', ScrollSpy._throttledResize);
      document.body.removeEventListener('click', ScrollSpy._handleTriggerClick);
      ScrollSpy._throttledScroll = null;
      ScrollSpy._throttledResize = null;
    }
  }

  static _handleTriggerClick = (e: MouseEvent) => {
    const trigger = e.target;
    for (let i = ScrollSpy._elements.length - 1; i >= 0; i--) {
      const scrollspy = ScrollSpy._elements[i];
      const x = document.querySelector('a[href="#' + scrollspy.el.id + '"]');
      if (trigger === x) {
        e.preventDefault();

        if (scrollspy.el['RoutePlate_ScrollSpy'].options.animationDuration) {
          ScrollSpy._smoothScrollIntoView(
            scrollspy.el,
            scrollspy.el['RoutePlate_ScrollSpy'].options.animationDuration
          );
        } else {
          scrollspy.el.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      }
    }
  };

  static _handleWindowScroll = () => {
    // unique tick id
    ScrollSpy._ticks++;

    // viewport rectangle
    const top = Utils.getDocumentScrollTop(),
      left = Utils.getDocumentScrollLeft(),
      right = left + window.innerWidth,
      bottom = top + window.innerHeight;

    // determine which elements are in view
    const intersections = ScrollSpy._findElements(top, right, bottom, left);
    for (let i = 0; i < intersections.length; i++) {
      const scrollspy = intersections[i];
      const lastTick = scrollspy.tickId;
      if (lastTick < 0) {
        // entered into view
        scrollspy._enter();
      }

      // update tick id
      scrollspy.tickId = ScrollSpy._ticks;
    }

    for (let i = 0; i < ScrollSpy._elementsInView.length; i++) {
      const scrollspy = ScrollSpy._elementsInView[i];
      const lastTick = scrollspy.tickId;
      if (lastTick >= 0 && lastTick !== ScrollSpy._ticks) {
        // exited from view
        scrollspy._exit();
        scrollspy.tickId = -1;
      }
    }
    // remember elements in view for next tick
    ScrollSpy._elementsInView = intersections;
    if (ScrollSpy._elements.length) {
      const options = ScrollSpy._elements[0].el['RoutePlate_ScrollSpy'].options;
      if (options.keepTopElementActive && ScrollSpy._visibleElements.length === 0) {
        ScrollSpy._resetKeptTopActiveElement(options.activeClass);
        // Measure once per element, then sort on the numbers. Reading the
        // distance inside the comparator meant O(n log n) forced layouts.
        const topElements = ScrollSpy._elements
          .map((value) => ({ value, distance: ScrollSpy._getDistanceToViewport(value.el) }))
          .filter((entry) => entry.distance <= 0)
          .sort((a, b) => a.distance - b.distance)
          .map((entry) => entry.value);
        const nearestTopElement = topElements.length
          ? topElements[topElements.length - 1]
          : ScrollSpy._elements[0];
        const actElem = document.querySelector(options.getActiveElement(nearestTopElement.el.id));
        actElem?.classList.add(options.activeClass);
        ScrollSpy._keptTopActiveElement = actElem as HTMLElement;
      }
    }
  };

  static _findElements(top: number, right: number, bottom: number, left: number): ScrollSpy[] {
    const hits = [];
    // Hoisted out of the loop: these are per-document, not per-element, and
    // reading them inside would force a layout flush on every iteration.
    const docElem = document.documentElement;
    const clientTop = docElem.clientTop;
    const clientLeft = docElem.clientLeft;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    for (let i = 0; i < ScrollSpy._elements.length; i++) {
      const scrollspy = ScrollSpy._elements[i];
      const currTop = top + scrollspy.options.scrollOffset || 200;

      // One rect per element per tick. This used to take five - a height
      // check, two _offset() calls that each built their own rect, and two
      // more reads for width and height - and it runs for every spied element
      // on every scroll tick.
      const box = scrollspy.el.getBoundingClientRect();
      if (box.height > 0) {
        const elTop = box.top + scrollY - clientTop,
          elLeft = box.left + scrollX - clientLeft,
          elRight = elLeft + box.width,
          elBottom = elTop + box.height;

        const isIntersect = !(
          elLeft > right ||
          elRight < left ||
          elTop > bottom ||
          elBottom < currTop
        );

        if (isIntersect) {
          hits.push(scrollspy);
        }
      }
    }
    return hits;
  }

  _enter() {
    ScrollSpy._visibleElements = ScrollSpy._visibleElements.filter(
      (value) => value.getBoundingClientRect().height !== 0
    );

    if (ScrollSpy._visibleElements[0]) {
      const actElem = document.querySelector(
        this.options.getActiveElement(ScrollSpy._visibleElements[0].id)
      );
      actElem?.classList.remove(this.options.activeClass);

      if (
        ScrollSpy._visibleElements[0]['RoutePlate_ScrollSpy'] &&
        this.id < ScrollSpy._visibleElements[0]['RoutePlate_ScrollSpy'].id
      ) {
        ScrollSpy._visibleElements.unshift(this.el);
      } else {
        ScrollSpy._visibleElements.push(this.el);
      }
    } else {
      ScrollSpy._visibleElements.push(this.el);
    }
    ScrollSpy._resetKeptTopActiveElement(this.options.activeClass);
    const selector = this.options.getActiveElement(ScrollSpy._visibleElements[0].id);
    document.querySelector(selector)?.classList.add(this.options.activeClass);
  }

  _exit() {
    ScrollSpy._visibleElements = ScrollSpy._visibleElements.filter(
      (value) => value.getBoundingClientRect().height !== 0
    );

    if (ScrollSpy._visibleElements[0]) {
      const actElem = document.querySelector(
        this.options.getActiveElement(ScrollSpy._visibleElements[0].id)
      );
      actElem?.classList.remove(this.options.activeClass);

      ScrollSpy._visibleElements = ScrollSpy._visibleElements.filter((x) => x.id != this.el.id);

      if (ScrollSpy._visibleElements[0]) {
        // Check if empty
        const selector = this.options.getActiveElement(ScrollSpy._visibleElements[0].id);
        document.querySelector(selector)?.classList.add(this.options.activeClass);
        ScrollSpy._resetKeptTopActiveElement(this.options.activeClass);
      }
    }
  }

  private static _resetKeptTopActiveElement(activeClass: string) {
    if (ScrollSpy._keptTopActiveElement) {
      ScrollSpy._keptTopActiveElement.classList.remove(activeClass);
      ScrollSpy._keptTopActiveElement = null;
    }
  }

  private static _getDistanceToViewport(element) {
    const rect = element.getBoundingClientRect();
    const distance = rect.top;
    return distance;
  }

  private static _smoothScrollIntoView(element, duration = 300) {
    const targetPosition =
      element.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
    const startPosition = window.scrollY || window.pageYOffset;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();

    function scrollStep(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const scrollY = startPosition + distance * progress;

      if (progress < 1) {
        window.scrollTo(0, scrollY);
        requestAnimationFrame(scrollStep);
      } else {
        window.scrollTo(0, targetPosition);
      }
    }
    requestAnimationFrame(scrollStep);
  }

  static {
    ScrollSpy._elements = [];
    ScrollSpy._elementsInView = [];
    ScrollSpy._visibleElements = []; // Array.<cash>
    ScrollSpy._count = 0;
    ScrollSpy._increment = 0;
    ScrollSpy._ticks = 0;
  }
}
