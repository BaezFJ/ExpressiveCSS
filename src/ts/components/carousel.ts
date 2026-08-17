import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

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
   * Linear snap track instead of 3D coverflow.
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
   * Called when a new item becomes the center.
   * @default null
   */
  onCycleTo: (current: Element, dragged: boolean) => void;
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
  onCycleTo: null
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

    this._flat =
      this.options.fullWidth ||
      this.el.classList.contains('flat');
    if (this._flat) {
      this.el.classList.add('flat');
      this.options.fullWidth = true;
      this.options.dist = 0;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

    this.hasMultipleSlides = this.images.length > 1;
    this.showIndicators = this.options.indicators && this.hasMultipleSlides;
    this.noWrap = this.options.noWrap || !this.hasMultipleSlides || this._flat;
    this.count = this.images.length;
    this.options.numVisible = Math.min(this.count, this.options.numVisible);

    this.images.forEach((item) => item.classList.add('carousel-item'));
    if (this._flat) this._wrapTrack();

    const firstItem = this.images[0];
    this.itemWidth = firstItem.clientWidth || this.el.clientWidth || 1;
    this.itemHeight = firstItem.clientHeight || this.el.clientHeight || 1;
    this.dim = this.itemWidth * 2 + this.options.padding || 1;

    if (this.showIndicators) this._setupIndicators();

    this.el.tabIndex = this.el.tabIndex >= 0 ? this.el.tabIndex : 0;
    this.el.setAttribute('aria-roledescription', 'carousel');

    this._setupEventHandlers();
    this._started = true;

    if (this._flat) {
      const start = Math.max(
        0,
        this.images.findIndex((el) => el.classList.contains('active'))
      );
      this.center = start;
      this._syncActive(start, false);
      this._scrollToIndex(start, false);
    } else {
      this._scroll(this.offset);
    }
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
    if (this.showIndicators && this._indicators) {
      this._indicators.addEventListener('click', this._handleIndicatorClick);
    }
    Carousel._live.add(this);
    if (!Carousel._resizeListening) {
      window.addEventListener('resize', Carousel._onResize, { passive: true });
      Carousel._resizeListening = true;
    }

    if (this._flat) {
      this._scroller.addEventListener('scroll', this._handleFlatScroll, { passive: true });
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
    if (this._indicators) {
      this._indicators.removeEventListener('click', this._handleIndicatorClick);
    }
    this._scroller.removeEventListener('scroll', this._handleFlatScroll);
    this.el.removeEventListener('pointerdown', this._handleCarouselTap);
    this.el.removeEventListener('pointermove', this._handleCarouselDrag);
    this.el.removeEventListener('pointerup', this._handleCarouselRelease);
    this.el.removeEventListener('pointercancel', this._handleCarouselRelease);
    this.el.removeEventListener('click', this._handleCarouselClick);

    Carousel._live.delete(this);
    if (Carousel._live.size === 0 && Carousel._resizeListening) {
      window.removeEventListener('resize', Carousel._onResize);
      Carousel._resizeListening = false;
    }
  }

  private _teardown() {
    this._removeEventHandlers();
    if (this._trackRaf !== null) cancelAnimationFrame(this._trackRaf);
    window.clearTimeout(this.scrollingTimeout);
    if (this._ownIndicators) this._indicators?.remove();
    this._unwrapTrack();
    this.images.forEach((el) => {
      el.style.transform = '';
      el.style.zIndex = '';
      el.style.opacity = '';
      el.style.visibility = '';
    });
  }

  _handleThrottledResize = Utils.throttle(() => this._handleResize(), 200);

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
      if (e.clientX - (e.target as HTMLElement).getBoundingClientRect().left > this.el.clientWidth / 2) {
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
    if (Utils.keys.ARROW_RIGHT.includes(e.key)) {
      e.preventDefault();
      this.next();
    } else if (Utils.keys.ARROW_LEFT.includes(e.key)) {
      e.preventDefault();
      this.prev();
    }
  };

  _handleFlatScroll = () => {
    if (this._ignoreScroll) return;
    const index = this._nearestIndex();
    if (index !== this.center) this._syncActive(index, this.dragged);
  };

  _handleResize = () => {
    if (!this.images.length) return;
    if (this._flat) {
      this._scrollToIndex(this.center, false);
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
      if (i === index) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', 'true');
    });
  }

  private _syncActive(index: number, dragged: boolean) {
    const prev = this.center;
    this.center = index;
    this.images.forEach((el, i) => el.classList.toggle('active', i === index));
    this._paintIndicators(index);
    this._syncA11y(index);
    const curr = this.images[index];
    if (prev !== index && typeof this.options.onCycleTo === 'function') {
      this.options.onCycleTo.call(this, curr, dragged);
    }
    if (typeof this.oneTimeCallback === 'function') {
      this.oneTimeCallback.call(this, curr, dragged);
      this.oneTimeCallback = null;
    }
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
    const left = this._scroller.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    this.images.forEach((el, i) => {
      const dist = Math.abs(el.offsetLeft - left);
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
    const left = el.offsetLeft;
    if (Math.abs(this._scroller.scrollLeft - left) < 1) {
      this._syncActive(n, false);
      return;
    }
    this._ignoreScroll = true;
    this._scroller.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
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
    if (n > this.count || n < 0) {
      if (this.noWrap) return;
      n = this._wrap(n);
    }
    this._cycleTo(n, callback);
  }
}
