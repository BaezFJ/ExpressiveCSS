import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface CarouselI18nOptions {
  carousel: string;
  item: string;
  of: string;
}

export interface CarouselOptions extends BaseOptions {
  /**
   * Transition duration in milliseconds (coverflow). Snap mode uses CSS.
   * @default 200
   */
  duration: number;
  /**
   * Perspective zoom. If 0, all items are the same size. Coverflow only.
   * @default -100
   */
  dist: number;
  /**
   * Extra spacing on the center item. Coverflow only.
   * @default 0
   */
  shift: number;
  /**
   * Padding between items that are not in the center. Coverflow only.
   * @default 0
   */
  padding: number;
  /**
   * How many items stay visible. Coverflow only.
   * @default 5
   */
  numVisible: number;
  /**
   * Full-width compatibility track. Material 3 layouts are already linear.
   * Also implied by `.flat`.
   * @default false
   */
  fullWidth: boolean;
  /**
   * Show paging dots. Only drawn when there is more than one item.
   * @default false
   */
  indicators: boolean;
  /**
   * Stop at the first and last items instead of wrapping. Coverflow only.
   * Snap tracks do not wrap.
   * @default false
   */
  noWrap: boolean;
  /**
   * Milliseconds to rest between automatic advances, on top of `duration` -
   * the gap follows each transition rather than containing it, so a full cycle
   * takes `duration + interval`. 0 leaves auto-advance off.
   * Whenever it is set the track pauses on hover and on keyboard focus, and
   * `prefers-reduced-motion: reduce` suppresses it entirely - auto-advancing
   * content is WCAG 2.2.2 territory, so neither is an option an author can
   * turn off. `noWrap` stops it after one pass instead of looping.
   * @default 0
   */
  interval: number;
  /**
   * Fixed track height in pixels. `null` sizes the carousel from its content.
   * A fixed height gives the indicators their own row below the track instead
   * of laying them over the media.
   * @default null
   */
  height: number | null;
  /**
   * Called when a new item becomes the center.
   * @default null
   */
  onCycleTo: (current: Element, dragged: boolean) => void;
  /**
   * Accessible names generated for an unlabeled carousel and its items.
   */
  i18n: Partial<CarouselI18nOptions>;
}

const _defaults: CarouselOptions = {
  duration: 200,
  dist: -100,
  shift: 0,
  padding: 0,
  numVisible: 5,
  fullWidth: false,
  indicators: false,
  noWrap: false,
  interval: 0,
  height: null,
  onCycleTo: null,
  i18n: {
    carousel: 'Carousel',
    item: 'Item',
    of: 'of'
  }
};

export class Carousel extends Component<CarouselOptions> {
  hasMultipleSlides: boolean;
  showIndicators: boolean;
  noWrap: boolean;
  pressed: boolean;
  dragged: boolean;
  offset: number;
  target: number;
  images: HTMLElement[];
  itemWidth: number;
  itemHeight: number;
  dim: number;
  _indicators: HTMLUListElement | HTMLElement;
  count: number;
  verticalDragged: boolean;
  reference: number;
  referenceY: number;
  velocity: number;
  frame: number;
  timestamp: number;
  amplitude: number;
  center: number = 0;
  imageHeight: number;
  scrollingTimeout: ReturnType<typeof setTimeout>;
  oneTimeCallback: (current: Element, dragged: boolean) => void | null;

  private _flat: boolean;
  private _ownIndicators: boolean = false;
  private _trackEl: HTMLElement | null = null;
  private _ignoreScroll: boolean = false;
  private _trackRaf: number = null;
  private _started: boolean = false;
  private _vertical: boolean = false;
  private _resizeObserver: ResizeObserver | null = null;
  private _usesWindowResize: boolean = false;
  private _dragPointerId: number | null = null;
  private _dragStartX: number = 0;
  private _dragStartY: number = 0;
  private _dragStartScroll: number = 0;
  private _suppressClick: boolean = false;
  private _suppressClickTimeout: ReturnType<typeof setTimeout> = null;
  private _generatedContainerRole: boolean = false;
  private _generatedContainerLabel: boolean = false;
  private _generatedContainerDescription: boolean = false;
  private _generatedWideLayout: boolean = false;
  private _generatedFixedHeight: boolean = false;
  private _authoredInlineHeight: string | null = null;
  private _autoAdvanceTimer: ReturnType<typeof setInterval> = null;
  private _autoAdvances: boolean = false;
  private _autoPaused: boolean = false;
  private _hovered: boolean = false;
  private _focused: boolean = false;
  private _generatedItemTabIndexes = new Set<HTMLElement>();
  private _generatedItemLabels = new Set<HTMLElement>();
  private _generatedItemDescriptions = new Set<HTMLElement>();
  private _generatedItemSizes = new Set<HTMLElement>();
  private _authoredItemSizes = new Set<HTMLElement>();
  private _itemA11yOriginal = new Map<
    HTMLElement,
    { ariaHidden: string | null; tabIndex: string | null }
  >();

  private get _scroller(): HTMLElement {
    return this._trackEl ?? this.el;
  }

  private static _live = new Set<Carousel>();
  private static _resizeListening = false;
  private static _onResize = Utils.throttle(() => {
    Carousel._live.forEach((c) => c._handleResize());
  }, 200);

  constructor(el: HTMLElement, options: Partial<CarouselOptions>) {
    super(el, options, Carousel);
    this.el['Expressive_Carousel'] = this;

    this.options = {
      ...Carousel.defaults,
      ...options
    };
    if (options?.i18n) {
      this.options.i18n = { ...Carousel.defaults.i18n, ...options.i18n };
    }

    // Material 3 layouts are native scroll tracks. The former 3D behavior is
    // retained only as an explicit `.coverflow` migration path.
    this._flat =
      !this.el.classList.contains('coverflow') ||
      this.options.fullWidth ||
      this.el.classList.contains('flat');
    if (this.options.fullWidth || this.el.classList.contains('flat')) {
      this.el.classList.add('flat');
      this.options.fullWidth = true;
      this.options.dist = 0;
    }
    this._vertical = this.el.classList.contains('full-screen');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.options.duration = 1;
      if (!this._flat) this.options.dist = 0;
    }

    this.pressed = false;
    this.dragged = false;
    this.offset = this.target = 0;
    this.images = this._collectItems();
    if (!this.images.length) {
      console.error('Carousel: no .carousel-item elements to show');
      return;
    }
    this.images.forEach((item) => {
      this._itemA11yOriginal.set(item, {
        ariaHidden: item.getAttribute('aria-hidden'),
        tabIndex: item.getAttribute('tabindex')
      });
      if (item.hasAttribute('data-carousel-size')) this._authoredItemSizes.add(item);
    });

    this.hasMultipleSlides = this.images.length > 1;
    this.showIndicators = this.options.indicators && this.hasMultipleSlides;
    this.noWrap = this.options.noWrap || !this.hasMultipleSlides || this._flat;
    this.count = this.images.length;
    this.options.numVisible = Math.min(this.count, this.options.numVisible);

    this._autoAdvances = this.options.interval > 0 && this.hasMultipleSlides && !reducedMotion;

    this.images.forEach((item) => item.classList.add('carousel-item'));
    if (this.options.height !== null) {
      this._generatedFixedHeight = !this.el.classList.contains('fixed-height');
      this._authoredInlineHeight = this.el.style.getPropertyValue('--carousel-height') || null;
      this.el.classList.add('fixed-height');
      this.el.style.setProperty('--carousel-height', `${this.options.height}px`);
    }
    if (this._flat) this._wrapTrack();
    this._syncAdaptiveMode();

    const firstItem = this.images[0];
    this.itemWidth = firstItem.clientWidth || this.el.clientWidth || 1;
    this.itemHeight = firstItem.clientHeight || this.el.clientHeight || 1;
    this.dim = this.itemWidth * 2 + this.options.padding || 1;

    if (this.showIndicators) this._setupIndicators();

    this._setupAccessibility();

    this._setupEventHandlers();
    this._started = true;

    if (this._flat) {
      const start = Math.max(
        0,
        this.images.findIndex((el) => el.classList.contains('active'))
      );
      this.center = start;
      this._syncActive(start, false);
      this._updateParallax();
      this._scrollToIndex(start, false);
    } else {
      this._scroll(this.offset);
    }

    this._syncAutoAdvance();
  }

  static get defaults(): CarouselOptions {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<CarouselOptions>): Carousel;
  static init(els: InitElements<InitElement>, options?: Partial<CarouselOptions>): Carousel[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<CarouselOptions> = {}
  ): Carousel | Carousel[] {
    return super.init(els, options, Carousel);
  }

  static getInstance(el: HTMLElement): Carousel {
    return el['Expressive_Carousel'];
  }

  destroy() {
    if (this._started) this._teardown();
    this.el['Expressive_Carousel'] = undefined;
  }

  private _collectItems(): HTMLElement[] {
    const explicit = Array.from(this.el.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains('carousel-item')
    );
    if (explicit.length) return explicit;
    return Array.from(this.el.children).filter((el): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.classList.contains('indicators') || el.classList.contains('carousel-fixed-item')) {
        return false;
      }
      return el.tagName !== 'NAV';
    });
  }

  private _setupAccessibility() {
    if (!this.el.hasAttribute('role')) {
      this.el.setAttribute('role', 'region');
      this._generatedContainerRole = true;
    }
    if (!this.el.hasAttribute('aria-label') && !this.el.hasAttribute('aria-labelledby')) {
      this.el.setAttribute('aria-label', this.options.i18n.carousel);
      this._generatedContainerLabel = true;
    }
    if (!this.el.hasAttribute('aria-roledescription')) {
      this.el.setAttribute('aria-roledescription', 'carousel');
      this._generatedContainerDescription = true;
    }

    const naturallyFocusable =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    this.images.forEach((item, index) => {
      if (!item.hasAttribute('aria-roledescription')) {
        item.setAttribute('aria-roledescription', 'slide');
        this._generatedItemDescriptions.add(item);
      }

      if (!item.hasAttribute('aria-label') && !item.hasAttribute('aria-labelledby')) {
        const mediaName = item.querySelector('img[alt]')?.getAttribute('alt')?.trim();
        const textName = item.textContent?.replace(/\s+/g, ' ').trim();
        const name = mediaName || textName;
        const position = `${this.options.i18n.item} ${index + 1} ${this.options.i18n.of} ${this.count}`;
        item.setAttribute('aria-label', name ? `${name}, ${position}` : position);
        this._generatedItemLabels.add(item);
      }

      if (!item.matches(naturallyFocusable) && !item.querySelector(naturallyFocusable)) {
        item.tabIndex = 0;
        this._generatedItemTabIndexes.add(item);
      }
    });
  }

  private _setupIndicators() {
    const existing = Array.from(this.el.children).find(
      (el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains('indicators')
    );
    this._indicators = existing ?? document.createElement('nav');
    this._ownIndicators = !existing;
    this._indicators.classList.add('indicators');
    this._indicators.setAttribute('aria-label', 'Slides');
    this._indicators.replaceChildren();

    this.images.forEach((_, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('indicator-item');
      if (i === 0) {
        button.classList.add('active');
        button.setAttribute('aria-current', 'true');
      }
      button.setAttribute('aria-label', `Slide ${i + 1}`);
      this._indicators.appendChild(button);
    });

    if (this._ownIndicators) this.el.appendChild(this._indicators);
    if (this._flat) {
      this.el.querySelector('.carousel-fixed-item')?.classList.add('with-indicators');
    }
  }

  _setupEventHandlers() {
    this.el.addEventListener('keydown', this._handleKeydown);
    if (this._autoAdvances) {
      this.el.addEventListener('mouseenter', this._handleAutoAdvanceState);
      this.el.addEventListener('mouseleave', this._handleAutoAdvanceState);
      this.el.addEventListener('focusin', this._handleAutoAdvanceState);
      this.el.addEventListener('focusout', this._handleAutoAdvanceState);
      // Browsers clamp a background tab's timers rather than stopping them, so
      // without this the track keeps cycling out of sight.
      document.addEventListener('visibilitychange', this._handleAutoAdvanceState);
    }
    if (this.showIndicators && this._indicators) {
      this._indicators.addEventListener('click', this._handleIndicatorClick);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._handleThrottledResize());
      this._resizeObserver.observe(this.el);
    }

    // Coverflow depends on viewport geometry. Full-screen also needs a window
    // signal when orientation changes without changing the container width.
    // ResizeObserver handles every other native track, including pane resizes.
    this._usesWindowResize =
      !this._resizeObserver || !this._flat || this.el.classList.contains('full-screen');
    if (this._usesWindowResize) {
      Carousel._live.add(this);
      if (!Carousel._resizeListening) {
        window.addEventListener('resize', Carousel._onResize, {
          passive: true
        });
        Carousel._resizeListening = true;
      }
    }

    if (this._flat) {
      this._scroller.addEventListener('scroll', this._handleFlatScroll, {
        passive: true
      });
      this._scroller.addEventListener('pointerdown', this._handleTrackPointerDown);
      this._scroller.addEventListener('pointermove', this._handleTrackPointerMove);
      this._scroller.addEventListener('pointerup', this._handleTrackPointerUp);
      this._scroller.addEventListener('pointercancel', this._handleTrackPointerUp);
      this._scroller.addEventListener('click', this._handleTrackClick, true);
      this._scroller.addEventListener('dragstart', this._handleTrackDragStart);
      return;
    }

    this.el.addEventListener('pointerdown', this._handleCarouselTap);
    this.el.addEventListener('pointermove', this._handleCarouselDrag);
    this.el.addEventListener('pointerup', this._handleCarouselRelease);
    this.el.addEventListener('pointercancel', this._handleCarouselRelease);
    this.el.addEventListener('click', this._handleCarouselClick);
  }

  _removeEventHandlers() {
    this.el.removeEventListener('keydown', this._handleKeydown);
    this.el.removeEventListener('mouseenter', this._handleAutoAdvanceState);
    this.el.removeEventListener('mouseleave', this._handleAutoAdvanceState);
    this.el.removeEventListener('focusin', this._handleAutoAdvanceState);
    this.el.removeEventListener('focusout', this._handleAutoAdvanceState);
    document.removeEventListener('visibilitychange', this._handleAutoAdvanceState);
    if (this._indicators) {
      this._indicators.removeEventListener('click', this._handleIndicatorClick);
    }
    this._scroller.removeEventListener('scroll', this._handleFlatScroll);
    this._scroller.removeEventListener('pointerdown', this._handleTrackPointerDown);
    this._scroller.removeEventListener('pointermove', this._handleTrackPointerMove);
    this._scroller.removeEventListener('pointerup', this._handleTrackPointerUp);
    this._scroller.removeEventListener('pointercancel', this._handleTrackPointerUp);
    this._scroller.removeEventListener('click', this._handleTrackClick, true);
    this._scroller.removeEventListener('dragstart', this._handleTrackDragStart);
    this.el.removeEventListener('pointerdown', this._handleCarouselTap);
    this.el.removeEventListener('pointermove', this._handleCarouselDrag);
    this.el.removeEventListener('pointerup', this._handleCarouselRelease);
    this.el.removeEventListener('pointercancel', this._handleCarouselRelease);
    this.el.removeEventListener('click', this._handleCarouselClick);

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._usesWindowResize) {
      Carousel._live.delete(this);
      if (Carousel._live.size === 0 && Carousel._resizeListening) {
        window.removeEventListener('resize', Carousel._onResize);
        Carousel._resizeListening = false;
      }
    }
  }

  private _teardown() {
    this._removeEventHandlers();
    this._autoAdvances = false;
    this._syncAutoAdvance();
    if (this._trackRaf !== null) cancelAnimationFrame(this._trackRaf);
    window.clearTimeout(this.scrollingTimeout);
    window.clearTimeout(this._suppressClickTimeout);
    if (this._ownIndicators) this._indicators?.remove();
    this._unwrapTrack();
    this.images.forEach((el) => {
      el.style.transform = '';
      el.style.zIndex = '';
      el.style.opacity = '';
      el.style.visibility = '';
      el.style.removeProperty('--md-comp-carousel-item-parallax');
      if (this._generatedItemLabels.has(el)) el.removeAttribute('aria-label');
      if (this._generatedItemDescriptions.has(el)) el.removeAttribute('aria-roledescription');
      if (this._generatedItemSizes.has(el)) el.removeAttribute('data-carousel-size');
      const original = this._itemA11yOriginal.get(el);
      if (original?.ariaHidden === null) el.removeAttribute('aria-hidden');
      else if (original) el.setAttribute('aria-hidden', original.ariaHidden);
      if (original?.tabIndex === null) el.removeAttribute('tabindex');
      else if (original) el.setAttribute('tabindex', original.tabIndex);
    });
    if (this._generatedContainerRole) this.el.removeAttribute('role');
    if (this._generatedContainerLabel) this.el.removeAttribute('aria-label');
    if (this._generatedContainerDescription) this.el.removeAttribute('aria-roledescription');
    if (this._generatedFixedHeight) this.el.classList.remove('fixed-height');
    if (this.options.height !== null) {
      if (this._authoredInlineHeight === null) this.el.style.removeProperty('--carousel-height');
      else this.el.style.setProperty('--carousel-height', this._authoredInlineHeight);
    }
    if (this._generatedWideLayout) {
      this.el.classList.remove(
        'multi-wide',
        'multi-large',
        'multi-extra-large',
        'full-screen-horizontal'
      );
    }
  }

  _handleThrottledResize = Utils.throttle(() => this._handleResize(), 200);

  _handleAutoAdvanceState = (e: Event) => {
    if (e.type === 'mouseenter') this._hovered = true;
    else if (e.type === 'mouseleave') this._hovered = false;
    else if (e.type === 'focusin') this._focused = true;
    else if (e.type === 'focusout') this._focused = false;
    this._syncAutoAdvance();
  };

  /** Start or stop the timer to match the current pause state. */
  private _syncAutoAdvance() {
    const run =
      this._autoAdvances &&
      !this._autoPaused &&
      !this._hovered &&
      !this._focused &&
      !document.hidden;
    if (run && this._autoAdvanceTimer === null) {
      // The gap follows the transition rather than containing it. Otherwise an
      // interval shorter than `duration` ticks while the previous move is still
      // animating, and coverflow - whose `center` advances continuously through
      // the tween - retargets from a half-way index instead of moving one item.
      this._autoAdvanceTimer = setInterval(
        this._advance,
        this.options.duration + this.options.interval
      );
    } else if (!run && this._autoAdvanceTimer !== null) {
      clearInterval(this._autoAdvanceTimer);
      this._autoAdvanceTimer = null;
    }
  }

  private _advance = () => {
    // Coverflow eases by `amplitude * exp(-elapsed / duration)` until the step
    // falls under 2px, so it settles after `duration * ln(|amplitude| / 2)` --
    // several multiples of `duration`, not one, and `center` climbs through the
    // whole tween. Advancing off that intermediate index would retarget the
    // running animation instead of moving one item, so a tick that finds the
    // track still moving is dropped and the next one takes it. Every path that
    // leaves `offset` short of `target` starts the loop that closes the gap, so
    // this waits on an animation that is always running. Native tracks commit
    // `center` synchronously in `_cycleTo` and never read an in-between value.
    if (!this._flat && this.offset !== this.target) return;

    const next = this.center + 1;
    if (next < this.count) {
      this.set(next);
      return;
    }
    // `this.noWrap` is forced true for every native track, because arrow keys
    // do not wrap a scroll container - so the timer reads the author's own
    // request instead. Looping back to the first item is just a scroll; an
    // author who asked for no wrapping gets one pass and then silence.
    if (this.options.noWrap) {
      this._autoAdvances = false;
      this._syncAutoAdvance();
      return;
    }
    this.set(0);
  };

  _handleTrackPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    this.pressed = true;
    this.dragged = false;
    this._suppressClick = false;
    this._dragPointerId = e.pointerId;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._dragStartScroll = this._vertical ? this._scroller.scrollTop : this._scroller.scrollLeft;
    try {
      this._scroller.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is optional in older browsers and test DOMs.
    }
  };

  _handleTrackPointerMove = (e: PointerEvent) => {
    if (!this.pressed || e.pointerId !== this._dragPointerId) return;
    const deltaX = e.clientX - this._dragStartX;
    const deltaY = e.clientY - this._dragStartY;
    const primaryDelta = this._vertical ? deltaY : deltaX;
    const crossDelta = this._vertical ? deltaX : deltaY;

    if (!this.dragged) {
      if (Math.abs(primaryDelta) < 6 || Math.abs(primaryDelta) <= Math.abs(crossDelta)) return;
      this.dragged = true;
      this.el.classList.add('dragging');
    }

    if (this._vertical) this._scroller.scrollTop = this._dragStartScroll - deltaY;
    else this._scroller.scrollLeft = this._dragStartScroll - deltaX;
    e.preventDefault();
  };

  _handleTrackPointerUp = (e: PointerEvent) => {
    if (!this.pressed || e.pointerId !== this._dragPointerId) return;
    this.pressed = false;
    this._dragPointerId = null;
    this.el.classList.remove('dragging');
    try {
      this._scroller.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already have been released.
    }

    if (!this.dragged) return;
    this._suppressClick = true;
    window.clearTimeout(this._suppressClickTimeout);
    this._suppressClickTimeout = setTimeout(() => {
      this._suppressClick = false;
    }, 0);
    this._syncActive(this._nearestIndex(), true);
  };

  _handleTrackClick = (e: MouseEvent) => {
    if (!this._suppressClick) return;
    this._suppressClick = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  _handleTrackDragStart = (e: DragEvent) => {
    if ((e.target as HTMLElement).closest('img, picture, video')) e.preventDefault();
  };

  _handleCarouselTap = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.tagName === 'IMG') {
      e.preventDefault();
    }
    this.pressed = true;
    this.dragged = false;
    this.verticalDragged = false;
    this.reference = e.clientX;
    this.referenceY = e.clientY;
    this.velocity = this.amplitude = 0;
    this.frame = this.offset;
    this.timestamp = Date.now();
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      // capture is optional
    }
    if (this._trackRaf !== null) cancelAnimationFrame(this._trackRaf);
    const loop = () => {
      this._track();
      if (this.pressed) this._trackRaf = requestAnimationFrame(loop);
      else this._trackRaf = null;
    };
    this._trackRaf = requestAnimationFrame(loop);
  };

  _handleCarouselDrag = (e: PointerEvent) => {
    if (!this.pressed) return;
    const delta = this.reference - e.clientX;
    const deltaY = Math.abs(this.referenceY - e.clientY);
    if (deltaY < 30 && !this.verticalDragged) {
      if (delta > 2 || delta < -2) {
        this.dragged = true;
        this.reference = e.clientX;
        this._scroll(this.offset + delta);
      }
    } else if (this.dragged) {
      e.preventDefault();
    } else {
      this.verticalDragged = true;
    }
    if (this.dragged) e.preventDefault();
  };

  _handleCarouselRelease = (e: PointerEvent) => {
    if (!this.pressed) return;
    this.pressed = false;
    if (this._trackRaf !== null) {
      cancelAnimationFrame(this._trackRaf);
      this._trackRaf = null;
    }
    try {
      this.el.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    this.target = this.offset;
    if (this.velocity > 10 || this.velocity < -10) {
      this.amplitude = 0.9 * this.velocity;
      this.target = this.offset + this.amplitude;
    }
    this.target = Math.round(this.target / this.dim) * this.dim;
    if (this.noWrap) {
      if (this.target >= this.dim * (this.count - 1)) {
        this.target = this.dim * (this.count - 1);
      } else if (this.target < 0) {
        this.target = 0;
      }
    }
    this.amplitude = this.target - this.offset;
    this.timestamp = Date.now();
    requestAnimationFrame(this._autoScroll);
    if (this.dragged) e.preventDefault();
  };

  _handleCarouselClick = (e: MouseEvent) => {
    if (this.dragged) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const clickedElem = (e.target as HTMLElement).closest('.carousel-item');
    if (!clickedElem || !this.el.contains(clickedElem)) return;
    const clickedIndex = this.images.indexOf(clickedElem as HTMLElement);
    const diff = this._wrap(this.center) - clickedIndex;
    if (diff !== 0) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (clickedIndex < 0) {
      if (
        e.clientX - (e.target as HTMLElement).getBoundingClientRect().left >
        this.el.clientWidth / 2
      ) {
        this.next();
      } else {
        this.prev();
      }
    } else {
      this._cycleTo(clickedIndex);
    }
  };

  _handleIndicatorClick = (e: Event) => {
    e.stopPropagation();
    const indicator = (e.target as HTMLElement).closest('.indicator-item');
    if (!indicator || !this._indicators.contains(indicator)) return;
    const index = [...this._indicators.children].indexOf(indicator);
    if (index < 0) return;
    this._cycleTo(index);
  };

  _handleKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const forward = this._vertical ? e.key === 'ArrowDown' : Utils.keys.ARROW_RIGHT.includes(e.key);
    const backward = this._vertical ? e.key === 'ArrowUp' : Utils.keys.ARROW_LEFT.includes(e.key);
    if (e.key === 'Home') {
      e.preventDefault();
      this.set(0);
      this._focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.set(this.count - 1);
      this._focusItem(this.count - 1);
    } else if (forward) {
      e.preventDefault();
      this.next();
      this._focusItem(this.center);
    } else if (backward) {
      e.preventDefault();
      this.prev();
      this._focusItem(this.center);
    }
  };

  _handleFlatScroll = () => {
    if (!this.el.classList.contains('scrolling')) this.el.classList.add('scrolling');
    window.clearTimeout(this.scrollingTimeout);
    this.scrollingTimeout = setTimeout(() => this.el.classList.remove('scrolling'), 120);
    if (this._trackRaf !== null) return;
    this._trackRaf = requestAnimationFrame(() => {
      this._trackRaf = null;
      this._updateParallax();
      if (this._ignoreScroll) return;
      const index = this._nearestIndex();
      if (index !== this.center) this._syncActive(index, this.dragged);
    });
  };

  _handleResize = () => {
    if (!this.images.length) return;
    this._syncAdaptiveMode();
    if (this._flat) {
      this._syncLayoutRoles(this.center);
      this._scrollToIndex(this.center, false);
      this._updateParallax();
      return;
    }
    if (this.options.fullWidth) {
      const firstItem = this.images[0];
      if (!firstItem) return;
      this.itemWidth = firstItem.clientWidth;
      this.dim = this.itemWidth * 2 + this.options.padding;
      this.offset = this.center * 2 * this.itemWidth;
      this.target = this.offset;
    } else {
      this._scroll();
    }
  };

  _xpos(e: PointerEvent | MouseEvent | TouchEvent) {
    if ('clientX' in e) return e.clientX;
    return 0;
  }

  _ypos(e: PointerEvent | MouseEvent | TouchEvent) {
    if ('clientY' in e) return e.clientY;
    return 0;
  }

  _wrap(x: number) {
    return x >= this.count ? x % this.count : x < 0 ? this._wrap(this.count + (x % this.count)) : x;
  }

  _track = () => {
    const now = Date.now();
    const elapsed = now - this.timestamp;
    const delta = this.offset - this.frame;
    const v = (1000 * delta) / (1 + elapsed);
    this.timestamp = now;
    this.frame = this.offset;
    this.velocity = 0.8 * v + 0.2 * this.velocity;
  };

  _autoScroll = () => {
    if (!this.amplitude) return;
    const elapsed = Date.now() - this.timestamp;
    const delta = this.amplitude * Math.exp(-elapsed / this.options.duration);
    if (delta > 2 || delta < -2) {
      this._scroll(this.target - delta);
      requestAnimationFrame(this._autoScroll);
    } else {
      this._scroll(this.target);
    }
  };

  _scroll(x: number = 0) {
    if (!this.el.classList.contains('scrolling')) {
      this.el.classList.add('scrolling');
    }
    window.clearTimeout(this.scrollingTimeout);
    this.scrollingTimeout = setTimeout(() => {
      this.el.classList.remove('scrolling');
    }, this.options.duration);

    this.offset = typeof x === 'number' ? x : this.offset;
    this.center = Math.floor((this.offset + this.dim / 2) / this.dim);

    const half = this.count >> 1;
    const delta = this.offset - this.center * this.dim;
    const dir = delta < 0 ? 1 : -1;
    const tween = (-dir * delta * 2) / this.dim;
    const lastCenter = this.center;
    const numVisibleOffset = 1 / this.options.numVisible;

    let alignment: string;
    let centerTweenedOpacity: number;
    if (this.options.fullWidth) {
      alignment = 'translateX(0)';
      centerTweenedOpacity = 1;
    } else {
      alignment = 'translateX(' + (this.el.clientWidth - this.itemWidth) / 2 + 'px) ';
      alignment += 'translateY(' + (this.el.clientHeight - this.itemHeight) / 2 + 'px)';
      centerTweenedOpacity = 1 - numVisibleOffset * tween;
    }

    this._paintIndicators(this.center);

    if (!this.noWrap || (this.center >= 0 && this.center < this.count)) {
      const el = this.images[this._wrap(this.center)];
      if (el && !el.classList.contains('active')) {
        this.el.querySelector('.carousel-item.active')?.classList.remove('active');
        el.classList.add('active');
      }
    }

    for (let i = 1; i <= half; ++i) {
      let zTranslation: number;
      let tweenedOpacity: number;
      if (this.options.fullWidth) {
        zTranslation = this.options.dist;
        tweenedOpacity = i === half && delta < 0 ? 1 - tween : 1;
      } else {
        zTranslation = this.options.dist * (i * 2 + tween * dir);
        tweenedOpacity = 1 - numVisibleOffset * (i * 2 + tween * dir);
      }
      if (!this.noWrap || this.center + i < this.count) {
        const el = this.images[this._wrap(this.center + i)];
        const transformString = `${alignment} translateX(${
          this.options.shift + (this.dim * i - delta) / 2
        }px) translateZ(${zTranslation}px)`;
        this._updateItemStyle(el, tweenedOpacity, -i, transformString);
      }
      if (this.options.fullWidth) {
        zTranslation = this.options.dist;
        tweenedOpacity = i === half && delta > 0 ? 1 - tween : 1;
      } else {
        zTranslation = this.options.dist * (i * 2 - tween * dir);
        tweenedOpacity = 1 - numVisibleOffset * (i * 2 - tween * dir);
      }
      if (!this.noWrap || this.center - i >= 0) {
        const el = this.images[this._wrap(this.center - i)];
        const transformString = `${alignment} translateX(${
          -this.options.shift + (-this.dim * i - delta) / 2
        }px) translateZ(${zTranslation}px)`;
        this._updateItemStyle(el, tweenedOpacity, -i, transformString);
      }
    }

    if (!this.noWrap || (this.center >= 0 && this.center < this.count)) {
      const el = this.images[this._wrap(this.center)];
      const transformString = `${alignment} translateX(${-delta / 2}px) translateX(${
        dir * this.options.shift * tween
      }px) translateZ(${this.options.dist * tween}px)`;
      this._updateItemStyle(el, centerTweenedOpacity, 0, transformString);
    }

    const currItem = this.images[this._wrap(this.center)];
    this._syncA11y(this._wrap(this.center));

    if (lastCenter !== this.center && typeof this.options.onCycleTo === 'function') {
      this.options.onCycleTo.call(this, currItem, this.dragged);
    }
    if (typeof this.oneTimeCallback === 'function') {
      this.oneTimeCallback.call(this, currItem, this.dragged);
      this.oneTimeCallback = null;
    }
  }

  _updateItemStyle(el: HTMLElement, opacity: number, zIndex: number, transform: string) {
    if (!el) return;
    el.style.transform = transform;
    el.style.zIndex = zIndex.toString();
    el.style.opacity = opacity.toString();
    el.style.visibility = 'visible';
  }

  private _paintIndicators(center: number) {
    if (!this.showIndicators || !this._indicators) return;
    const pos = ((center % this.count) + this.count) % this.count;
    this._indicators.querySelectorAll('.indicator-item').forEach((el, i) => {
      const on = i === pos;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  }

  private _syncA11y(index: number) {
    this.images.forEach((el, i) => {
      if (i === index) {
        el.removeAttribute('aria-hidden');
        el.removeAttribute('tabindex');
      } else {
        // A slide is an <a>, so hiding it from assistive technology while
        // leaving it in the tab order put focus on a link the user had no way
        // to perceive. tabindex="-1" takes away the tab stop and nothing else.
        //
        // Not `inert`, which also removes the slide from hit-testing: in
        // coverflow the neighbouring slides are visible and clicking one is
        // how you advance to it, so inert made the carousel mouse-dead.
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('tabindex', '-1');
      }
    });
  }

  private _syncActive(index: number, dragged: boolean) {
    const prev = this.center;
    this.center = index;
    this.images.forEach((el, i) => el.classList.toggle('active', i === index));
    this._paintIndicators(index);
    if (this._flat) {
      this._syncLayoutRoles(index);
    } else {
      this._syncA11y(index);
    }
    const curr = this.images[index];
    if (prev !== index && typeof this.options.onCycleTo === 'function') {
      this.options.onCycleTo.call(this, curr, dragged);
    }
    if (typeof this.oneTimeCallback === 'function') {
      this.oneTimeCallback.call(this, curr, dragged);
      this.oneTimeCallback = null;
    }
  }

  private _syncLayoutRoles(index: number) {
    if (!this._flat) return;

    const setSize = (item: HTMLElement, size: 'large' | 'medium' | 'small') => {
      if (this._authoredItemSizes.has(item)) return;
      item.setAttribute('data-carousel-size', size);
      this._generatedItemSizes.add(item);
    };

    this.images.forEach((item) => setSize(item, 'large'));

    if (
      this.el.classList.contains('flat') ||
      this.el.classList.contains('uncontained') ||
      (this.el.classList.contains('full-screen') && this._vertical)
    ) {
      return;
    }

    if (
      this.el.classList.contains('hero') ||
      this.el.classList.contains('full-screen-horizontal')
    ) {
      const next = this.images[index + 1];
      if (next) setSize(next, 'small');
      if (this.el.classList.contains('center-aligned')) {
        const previous = this.images[index - 1];
        if (previous) setSize(previous, 'small');
      }
      return;
    }

    const width = this.el.clientWidth;
    const desiredLargeCount = width >= 1600 ? 4 : width >= 1200 ? 3 : width >= 600 ? 2 : 1;
    const largeCount = Math.min(desiredLargeCount, Math.max(1, this.count - 2));
    this.el.classList.remove('multi-wide', 'multi-large', 'multi-extra-large');
    if (largeCount === 2) this.el.classList.add('multi-wide');
    else if (largeCount === 3) this.el.classList.add('multi-large');
    else if (largeCount >= 4) this.el.classList.add('multi-extra-large');
    this._generatedWideLayout = this._generatedWideLayout || largeCount > 1;

    for (let offset = 1; offset < largeCount; offset += 1) {
      const item = this.images[index + offset];
      if (item) setSize(item, 'large');
    }
    const medium = this.images[index + largeCount];
    const small = this.images[index + largeCount + 1];
    if (medium) setSize(medium, 'medium');
    if (small) setSize(small, 'small');
  }

  private _syncAdaptiveMode() {
    if (!this.el.classList.contains('full-screen')) return;
    const landscape = window.matchMedia('(orientation: landscape)').matches;
    const horizontal = this.el.clientWidth >= 840 || landscape;
    const wasVertical = this._vertical;
    this._vertical = !horizontal;
    this.el.classList.toggle('full-screen-horizontal', horizontal);
    this._generatedWideLayout = this._generatedWideLayout || horizontal;

    if (this._started && wasVertical !== this._vertical) {
      this._scroller.scrollTo({ left: 0, top: 0, behavior: 'auto' });
    }
  }

  private _focusItem(index: number) {
    const item = this.images[index];
    if (!item) return;
    const focusable = item.matches(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
        'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
      ? item
      : item.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
            'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
    (focusable ?? item).focus({ preventScroll: true });
  }

  private _updateParallax() {
    if (!this._flat) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.images.forEach((item) =>
        item.style.setProperty('--md-comp-carousel-item-parallax', '0px')
      );
      return;
    }

    const scrollerRect = this._scroller.getBoundingClientRect();
    const viewportCenter = this._vertical
      ? scrollerRect.top + scrollerRect.height / 2
      : scrollerRect.left + scrollerRect.width / 2;
    const viewportSize = Math.max(1, this._vertical ? scrollerRect.height : scrollerRect.width);

    this.images.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const itemCenter = this._vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
      const progress = Math.max(-1, Math.min(1, (itemCenter - viewportCenter) / viewportSize));
      item.style.setProperty('--md-comp-carousel-item-parallax', `${progress * -24}px`);
    });
  }

  private _wrapTrack() {
    const track = document.createElement('div');
    track.className = 'carousel-track';
    this.images[0].before(track);
    this.images.forEach((el) => track.appendChild(el));
    this._trackEl = track;
  }

  private _unwrapTrack() {
    if (!this._trackEl) return;
    this.images.forEach((el) => this.el.insertBefore(el, this._trackEl));
    this._trackEl.remove();
    this._trackEl = null;
  }

  private _nearestIndex(): number {
    const centered = this.el.classList.contains('center-aligned');
    const position = this._vertical ? this._scroller.scrollTop : this._scroller.scrollLeft;
    const viewportCenter =
      position + (this._vertical ? this._scroller.clientHeight : this._scroller.clientWidth) / 2;
    let best = 0;
    let bestDist = Infinity;
    this.images.forEach((el, i) => {
      const start = this._vertical ? el.offsetTop : el.offsetLeft;
      const size = this._vertical ? el.offsetHeight : el.offsetWidth;
      const target = centered ? start + size / 2 : start;
      const dist = Math.abs(target - (centered ? viewportCenter : position));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  private _scrollToIndex(n: number, smooth = true) {
    const el = this.images[n];
    if (!el) return;
    const centered = this.el.classList.contains('center-aligned');
    const style = getComputedStyle(this._scroller);
    const inlinePadding = Number.parseFloat(style.paddingInlineStart) || 0;
    const blockPadding = Number.parseFloat(style.paddingBlockStart) || 0;
    const left = centered
      ? el.offsetLeft - (this._scroller.clientWidth - el.offsetWidth) / 2
      : el.offsetLeft - inlinePadding;
    const top = el.offsetTop - blockPadding;
    const current = this._vertical ? this._scroller.scrollTop : this._scroller.scrollLeft;
    const target = this._vertical ? top : left;
    if (Math.abs(current - target) < 1) {
      this._syncActive(n, false);
      return;
    }
    this._ignoreScroll = true;
    this._scroller.scrollTo({
      left: this._vertical ? 0 : left,
      top: this._vertical ? top : 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
    const done = () => {
      this._ignoreScroll = false;
    };
    this._scroller.addEventListener('scrollend', done, { once: true });
    window.setTimeout(done, this.options.duration + 350);
  }

  _cycleTo(n: number, callback: CarouselOptions['onCycleTo'] = null) {
    if (this._flat) {
      if (typeof callback === 'function') this.oneTimeCallback = callback;
      this._syncActive(n, false);
      this._scrollToIndex(n);
      return;
    }
    let diff = (this.center % this.count) - n;
    if (!this.noWrap) {
      if (diff < 0) {
        if (Math.abs(diff + this.count) < Math.abs(diff)) {
          diff += this.count;
        }
      } else if (diff > 0) {
        if (Math.abs(diff - this.count) < diff) {
          diff -= this.count;
        }
      }
    }
    this.target = this.dim * Math.round(this.offset / this.dim);
    if (diff < 0) {
      this.target += this.dim * Math.abs(diff);
    } else if (diff > 0) {
      this.target -= this.dim * diff;
    }
    if (typeof callback === 'function') {
      this.oneTimeCallback = callback;
    }
    if (this.offset !== this.target) {
      this.amplitude = this.target - this.offset;
      this.timestamp = Date.now();
      requestAnimationFrame(this._autoScroll);
    }
  }

  /**
   * Stop auto-advance until start() is called. Without an `interval` there is
   * nothing to stop and this does nothing.
   */
  pause() {
    this._autoPaused = true;
    this._syncAutoAdvance();
  }

  /** Resume auto-advance after pause(). */
  start() {
    this._autoPaused = false;
    this._syncAutoAdvance();
  }

  next(n: number = 1) {
    if (n === undefined || isNaN(n)) n = 1;
    let index = this.center + n;
    if (index >= this.count || index < 0) {
      if (this.noWrap) return;
      index = this._wrap(index);
    }
    this._cycleTo(index);
  }

  prev(n: number = 1) {
    if (n === undefined || isNaN(n)) n = 1;
    let index = this.center - n;
    if (index >= this.count || index < 0) {
      if (this.noWrap) return;
      index = this._wrap(index);
    }
    this._cycleTo(index);
  }

  set(n: number, callback?: CarouselOptions['onCycleTo']) {
    if (n === undefined || isNaN(n)) n = 0;
    if (n >= this.count || n < 0) {
      if (this.noWrap) return;
      n = this._wrap(n);
    }
    this._cycleTo(n, callback);
  }
}
