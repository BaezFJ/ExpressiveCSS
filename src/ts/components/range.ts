import { Component, BaseOptions, InitElements, MElement } from '../core/component';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RangeOptions extends BaseOptions {}

const _defaults: RangeOptions = {};

export class Range extends Component<RangeOptions> {
  declare el: HTMLInputElement;
  private _mousedown: boolean;
  value: HTMLElement;
  thumb: HTMLElement;

  constructor(el: HTMLInputElement, options: Partial<RangeOptions>) {
    super(el, options, Range);
    this.el['RoutePlate_Range'] = this;

    this.options = {
      ...Range.defaults,
      ...options
    };

    this._mousedown = false;
    this._setupThumb();
    this._sync();
    this._setupEventHandlers();
  }

  static get defaults(): RangeOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Range.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLInputElement, options?: Partial<RangeOptions>): Range;
  /**
   * Initializes instances of Range.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<HTMLInputElement | MElement>,
    options?: Partial<RangeOptions>
  ): Range[];
  /**
   * Initializes instances of Range.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLInputElement | InitElements<HTMLInputElement | MElement>,
    options: Partial<RangeOptions> = {}
  ): Range | Range[] {
    return super.init(els, options, Range);
  }

  static getInstance(el: HTMLInputElement): Range {
    return el['RoutePlate_Range'];
  }

  destroy() {
    this._removeEventHandlers();
    this._removeThumb();
    this.el['RoutePlate_Range'] = undefined;
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
    this._sync();
    this.thumb.classList.add('active');
  };

  _handleRangeMousedownTouchstart = (e: MouseEvent | TouchEvent) => {
    this._mousedown = true;
    this.el.classList.add('active');
    this._sync();
    if (e.type !== 'input') {
      this.thumb.classList.add('active');
    }
  };

  _handleRangeInputMousemoveTouchmove = () => {
    if (this._mousedown) {
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

  _sync() {
    const max = parseFloat(this.el.getAttribute('max')) || 100;
    const min = parseFloat(this.el.getAttribute('min')) || 0;
    const val = parseFloat(this.el.value) || 0;
    const percent = max === min ? 0 : (val - min) / (max - min);

    // Read before writing. This runs on every pointer move during a drag, and
    // setting the custom property first made each of the four offset reads
    // below flush a fresh layout.
    const left = this.el.offsetLeft;
    const top = this.el.offsetTop;
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;

    this.el.style.setProperty('--md-comp-slider-active-fraction', `${percent * 100}%`);
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
    if (typeof document !== 'undefined')
      Range.init(
        document?.querySelectorAll('input[type=range]') as NodeListOf<HTMLInputElement>,
        {}
      );
  }
}
