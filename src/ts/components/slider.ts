import { Component, BaseOptions, InitElements, InitElement } from '../core/component';
import { Utils } from '../core/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SliderOptions extends BaseOptions {}

const _defaults: SliderOptions = {};

export class Slider extends Component<SliderOptions> {
  declare el: HTMLInputElement;
  private _mousedown: boolean;
  value: HTMLElement;
  thumb: HTMLElement;

  constructor(el: HTMLInputElement, options: Partial<SliderOptions>) {
    super(el, options, Slider);
    this.el['Expressive_Slider'] = this;

    this.options = {
      ...Slider.defaults,
      ...options
    };

    this._mousedown = false;
    this._setupThumb();
    this._sync();
    this._setupEventHandlers();
  }

  static get defaults(): SliderOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Slider.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLInputElement, options?: Partial<SliderOptions>): Slider;
  /**
   * Initializes instances of Slider.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<HTMLInputElement | InitElement>,
    options?: Partial<SliderOptions>
  ): Slider[];
  /**
   * Initializes instances of Slider.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLInputElement | InitElements<HTMLInputElement | InitElement>,
    options: Partial<SliderOptions> = {}
  ): Slider | Slider[] {
    return super.init(els, options, Slider);
  }

  static getInstance(el: HTMLInputElement): Slider {
    return el['Expressive_Slider'];
  }

  destroy() {
    this._removeEventHandlers();
    this._removeThumb();
    this.el['Expressive_Slider'] = undefined;
  }

  _setupEventHandlers() {
    this.el.addEventListener('change', this._handleRangeChange);
    this.el.addEventListener('mousedown', this._handleRangeMousedownTouchstart);
    this.el.addEventListener('touchstart', this._handleRangeMousedownTouchstart);
    this.el.addEventListener('input', this._handleRangeInputMousemoveTouchmove);
    this.el.addEventListener('mousemove', this._handleRangeInputMousemoveTouchmove);
    // Never calls preventDefault, so it does not need to block scrolling.
    this.el.addEventListener('touchmove', this._handleRangeInputMousemoveTouchmove, {
      passive: true
    });
    this.el.addEventListener('mouseup', this._handleRangeMouseupTouchend);
    this.el.addEventListener('touchend', this._handleRangeMouseupTouchend);
    this.el.addEventListener('blur', this._handleRangeBlurMouseoutTouchleave);
    this.el.addEventListener('mouseout', this._handleRangeBlurMouseoutTouchleave);
    this.el.addEventListener('touchleave', this._handleRangeBlurMouseoutTouchleave);
  }

  _removeEventHandlers() {
    this.el.removeEventListener('change', this._handleRangeChange);
    this.el.removeEventListener('mousedown', this._handleRangeMousedownTouchstart);
    this.el.removeEventListener('touchstart', this._handleRangeMousedownTouchstart);
    this.el.removeEventListener('input', this._handleRangeInputMousemoveTouchmove);
    this.el.removeEventListener('mousemove', this._handleRangeInputMousemoveTouchmove);
    this.el.removeEventListener('touchmove', this._handleRangeInputMousemoveTouchmove);
    this.el.removeEventListener('mouseup', this._handleRangeMouseupTouchend);
    this.el.removeEventListener('touchend', this._handleRangeMouseupTouchend);
    this.el.removeEventListener('blur', this._handleRangeBlurMouseoutTouchleave);
    this.el.removeEventListener('mouseout', this._handleRangeBlurMouseoutTouchleave);
    this.el.removeEventListener('touchleave', this._handleRangeBlurMouseoutTouchleave);
  }

  _handleRangeChange = () => {
    this._clampDual();
    this._sync();
    this.thumb.classList.add('active');
  };

  _handleRangeMousedownTouchstart = (e: MouseEvent | TouchEvent) => {
    this._mousedown = true;
    this.el.classList.add('active');
    this._clampDual();
    this._sync();
    if (e.type !== 'input') {
      this.thumb.classList.add('active');
    }
  };

  _handleRangeInputMousemoveTouchmove = () => {
    if (this._mousedown) {
      this._clampDual();
      this._sync();
      this.thumb.classList.add('active');
    }
  };

  _handleRangeMouseupTouchend = () => {
    this._mousedown = false;
    this.el.classList.remove('active');
  };

  _handleRangeBlurMouseoutTouchleave = () => {
    if (!this._mousedown) {
      this.thumb.classList.remove('active');
    }
  };

  _setupThumb() {
    this.thumb = document.createElement('span');
    this.value = document.createElement('span');
    this.thumb.classList.add('thumb');
    this.value.classList.add('value');
    this.thumb.append(this.value);
    this.el.after(this.thumb);
  }

  _removeThumb() {
    this.thumb.remove();
  }

  _isVertical(): boolean {
    return !!this.el.closest('.vertical');
  }

  _host(): HTMLElement | null {
    // `.slider` is the documented host now; without it here a dual-handle
    // control could not find its wrapper, so the handles never clamped and the
    // shared start/end fractions never tracked the interval.
    return this.el.closest('.slider, .range, .range-field, label');
  }

  _clampDual() {
    const host = this._host();
    const peers = host?.querySelectorAll('input[type="range"]');
    if (!peers || peers.length !== 2) return;
    const start = peers[0] as HTMLInputElement;
    const end = peers[1] as HTMLInputElement;
    if (this.el === start && +start.value > +end.value) start.value = end.value;
    if (this.el === end && +end.value < +start.value) end.value = start.value;
  }

  _fraction(el: HTMLInputElement): number {
    const max = parseFloat(el.max) || 100;
    const min = parseFloat(el.min) || 0;
    const val = parseFloat(el.value) || 0;
    return max === min ? 0 : (val - min) / (max - min);
  }

  _sync() {
    const percent = this._fraction(this.el);
    const fraction = `${percent * 100}%`;

    // Read before writing. This runs on every pointer move during a drag, and
    // setting the custom property first made each of the four offset reads
    // below flush a fresh layout.
    const left = this.el.offsetLeft;
    const top = this.el.offsetTop;
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;

    this.el.style.setProperty('--md-comp-slider-active-fraction', fraction);

    const host = this._host();
    const peers = host?.querySelectorAll('input[type="range"]');
    if (host && peers && peers.length === 2) {
      const nums = Array.from(peers).map((el) => this._fraction(el as HTMLInputElement));
      host.style.setProperty('--md-comp-slider-start-fraction', `${Math.min(...nums) * 100}%`);
      host.style.setProperty('--md-comp-slider-end-fraction', `${Math.max(...nums) * 100}%`);
    }
    if (host?.classList.contains('stops')) {
      const max = parseFloat(this.el.max) || 100;
      const min = parseFloat(this.el.min) || 0;
      const step = parseFloat(this.el.step);
      if (step > 0 && Number.isFinite(step)) {
        const n = Math.round((max - min) / step) + 1;
        host.style.setProperty('--md-comp-slider-stop-count', String(Math.max(2, n)));
      }
    }

    this.value.textContent = this.el.value;
    if (this._isVertical()) {
      this.thumb.style.left = `${left + width / 2}px`;
      this.thumb.style.top = `${top + (1 - percent) * height}px`;
    } else {
      this.thumb.style.left = `${left + percent * width}px`;
      this.thumb.style.top = `${top}px`;
    }
  }

  /**
   * Initializes every range input in the current document.
   */
  static Init() {
    // Deferred like every other Init(): this ran at import time, so a bundle
    // loaded in <head> found no inputs at all.
    Utils.onDocumentReady(() => {
      Slider.init(document.querySelectorAll('input[type=range]') as NodeListOf<HTMLInputElement>, {});
    });
  }
}
