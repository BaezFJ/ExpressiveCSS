import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface CarouselI18nOptions {
  carousel: string;
  item: string;
  of: string;
  indicators: string;
  slide: string;
}

export interface CarouselOptions extends BaseOptions {
  /**
   * Milliseconds allowed for a programmatic scroll to land. The track itself
   * scrolls at the browser's own smooth-scroll speed; this only bounds how
   * long the component waits for `scrollend` before assuming it arrived, and
   * is added to `interval` to time each auto-advance rest.
   * @default 200
   */
  duration: number;
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
   * Stop auto-advance at the last item instead of looping back to the first.
   * A scroll track never wraps under arrow keys or `set()` either way.
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
   * Accessible names generated for an unlabeled carousel, its items and its
   * indicators.
   */
  i18n: Partial<CarouselI18nOptions>;
}

const _defaults: CarouselOptions = {
  duration: 200,
  fullWidth: false,
  indicators: false,
  noWrap: false,
  interval: 0,
  height: null,
  onCycleTo: null,
  i18n: {
    carousel: 'Carousel',
    item: 'Item',
    of: 'of',
    indicators: 'Slides',
    slide: 'Slide'
  }
};

export class Carousel extends Component<CarouselOptions> {
  hasMultipleSlides: boolean;
  showIndicators: boolean;
  pressed: boolean;
  dragged: boolean;
  images: HTMLElement[];
  _indicators: HTMLUListElement | HTMLElement;
  count: number;
  center: number = 0;
  scrollingTimeout: ReturnType<typeof setTimeout>;
  oneTimeCallback: (current: Element, dragged: boolean) => void | null;

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
  private _autoAdvanceTimer: ReturnType<typeof setTimeout> = null;
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

    if (this.options.fullWidth || this.el.classList.contains('flat')) {
      this.el.classList.add('flat');
      this.options.fullWidth = true;
    }
    this._vertical = this.el.classList.contains('full-screen');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) this.options.duration = 1;

    this.pressed = false;
    this.dragged = false;
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
    this.count = this.images.length;

    this._autoAdvances = this.options.interval > 0 && this.hasMultipleSlides && !reducedMotion;

    this.images.forEach((item) => item.classList.add('carousel-item'));
    if (this.options.height !== null) {
      this._generatedFixedHeight = !this.el.classList.contains('fixed-height');
      this._authoredInlineHeight = this.el.style.getPropertyValue('--carousel-height') || null;
      this.el.classList.add('fixed-height');
      this.el.style.setProperty('--carousel-height', `${this.options.height}px`);
    }
    this._wrapTrack();
    this._syncAdaptiveMode();

    if (this.showIndicators) this._setupIndicators();

    this._setupAccessibility();

    this._setupEventHandlers();
    this._started = true;

    const start = Math.max(
      0,
      this.images.findIndex((el) => el.classList.contains('active'))
    );
    this.center = start;
    this._syncActive(start, false);
    this._updateParallax();
    this._scrollToIndex(start, false);

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
    this._indicators.setAttribute('aria-label', this.options.i18n.indicators);
    this._indicators.replaceChildren();

    this.images.forEach((_, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('indicator-item');
      if (i === 0) {
        button.classList.add('active');
        button.setAttribute('aria-current', 'true');
      }
      button.setAttribute('aria-label', `${this.options.i18n.slide} ${i + 1}`);
      this._indicators.appendChild(button);
    });

    if (this._ownIndicators) this.el.appendChild(this._indicators);
    this.el.querySelector('.carousel-fixed-item')?.classList.add('with-indicators');
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

    // Full-screen needs a window signal when orientation changes without
    // changing the container width. ResizeObserver handles every other track,
    // including pane resizes.
    this._usesWindowResize =
      !this._resizeObserver || this.el.classList.contains('full-screen');
    if (this._usesWindowResize) {
      Carousel._live.add(this);
      if (!Carousel._resizeListening) {
        window.addEventListener('resize', Carousel._onResize, {
          passive: true
        });
        Carousel._resizeListening = true;
      }
    }

    this._scroller.addEventListener('scroll', this._handleTrackScroll, {
      passive: true
    });
    this._scroller.addEventListener('pointerdown', this._handleTrackPointerDown);
    this._scroller.addEventListener('pointermove', this._handleTrackPointerMove);
    this._scroller.addEventListener('pointerup', this._handleTrackPointerUp);
    this._scroller.addEventListener('pointercancel', this._handleTrackPointerUp);
    this._scroller.addEventListener('click', this._handleTrackClick, true);
    this._scroller.addEventListener('dragstart', this._handleTrackDragStart);
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
    this._scroller.removeEventListener('scroll', this._handleTrackScroll);
    this._scroller.removeEventListener('pointerdown', this._handleTrackPointerDown);
    this._scroller.removeEventListener('pointermove', this._handleTrackPointerMove);
    this._scroller.removeEventListener('pointerup', this._handleTrackPointerUp);
    this._scroller.removeEventListener('pointercancel', this._handleTrackPointerUp);
    this._scroller.removeEventListener('click', this._handleTrackClick, true);
    this._scroller.removeEventListener('dragstart', this._handleTrackDragStart);

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
      // Each rest is armed after the move before it, never on a fixed phase.
      // A repeating timer assumes the work it triggers is instant; a smooth
      // scroll is not, so a fixed period either lands mid-scroll or, once a
      // tick is dropped, leaves whatever is left of the period as the next
      // rest.
      this._autoAdvanceTimer = setTimeout(
        this._tick,
        this.options.duration + this.options.interval
      );
    } else if (!run && this._autoAdvanceTimer !== null) {
      clearTimeout(this._autoAdvanceTimer);
      this._autoAdvanceTimer = null;
    }
  }

  private _tick = () => {
    this._autoAdvanceTimer = null;
    this._advance();
    this._syncAutoAdvance();
  };

  private _advance = () => {
    const next = this.center + 1;
    if (next < this.count) {
      this.set(next);
      return;
    }
    // Arrow keys and `set()` never wrap, because a scroll container has ends.
    // Auto-advance is the one caller that can: looping back to the first item
    // is just a scroll. An author who asked for no wrapping gets one pass and
    // then silence.
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
    const forward = this._vertical ? e.key === 'ArrowDown' : e.key === Utils.keys.ARROW_RIGHT;
    const backward = this._vertical ? e.key === 'ArrowUp' : e.key === Utils.keys.ARROW_LEFT;
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

  _handleTrackScroll = () => {
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
    this._syncLayoutRoles(this.center);
    this._scrollToIndex(this.center, false);
    this._updateParallax();
  };

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

  private _syncActive(index: number, dragged: boolean) {
    const prev = this.center;
    this.center = index;
    this.images.forEach((el, i) => el.classList.toggle('active', i === index));
    this._paintIndicators(index);
    this._syncLayoutRoles(index);
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
    if (typeof callback === 'function') this.oneTimeCallback = callback;
    this._syncActive(n, false);
    this._scrollToIndex(n);
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
    const index = this.center + n;
    if (index >= this.count || index < 0) return;
    this._cycleTo(index);
  }

  prev(n: number = 1) {
    if (n === undefined || isNaN(n)) n = 1;
    const index = this.center - n;
    if (index >= this.count || index < 0) return;
    this._cycleTo(index);
  }

  set(n: number, callback?: CarouselOptions['onCycleTo']) {
    if (n === undefined || isNaN(n)) n = 0;
    if (n >= this.count || n < 0) return;
    this._cycleTo(n, callback);
  }
}
