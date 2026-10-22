import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement, I18nOptions } from '../core/component';
import { DisplayPlugin, createDisplayPlugin, hideModal } from '../plugins/modalDisplayPlugin';

export type Views = 'hours' | 'minutes';

/** The clock's fields, in the order they appear. */
const UNITS = ['hours', 'minutes', 'seconds'] as const;
type Unit = (typeof UNITS)[number];

/** How far each key moves a field, wrapping round. */
const STEPS: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 };

/** A 12-hour time's hour of the day, 0 to 23. */
const dayHour = (hours: number, pm: boolean) => (hours % 12) + (pm ? 12 : 0);

/** Each field's length in seconds and how many values it has. */
const SPANS: Record<Unit, [number, number]> = { hours: [3600, 24], minutes: [60, 60], seconds: [1, 60] };

/** The last second of the day. */
const DAY_END = 24 * 3600 - 1;

/** An hour on the 24-hour clock, from one written with AM or PM. */
const hour24 = (hours: number, period?: string) => (period ? (hours % 12) + (period === 'PM' ? 12 : 0) : hours);

/**
 * The hour on the 24-hour clock, minute and second of a written time such as
 * '14:30', '02:30:45 PM' or 'now'. A missing part reads as 0.
 */
function readTime(text: string, fromNow: number): [number, number, number] {
  const upper = text.trim().toUpperCase();
  if (upper.split(':')[0] === 'NOW') {
    const now = new Date(+new Date() + fromNow);
    return [now.getHours(), now.getMinutes(), now.getSeconds()];
  }
  const period = /AM|PM/.exec(upper)?.[0];
  const parts = upper.replace(/AM|PM/, '').split(':');
  const [hours, minutes, seconds] = [0, 1, 2].map((i) => +parts[i] || 0);
  // A written AM or PM fixes the hour on either clock: "03:30 PM" is 15:30
  // on a 24-hour clock too.
  return [hour24(hours, period), minutes, seconds];
}

/** Seconds since midnight for an hour, minute and second. */
const daySeconds = ([hours, minutes, seconds]: number[]) => hours * 3600 + minutes * 60 + seconds;

/**
 * With a `lang` on or around the input, whether that language tells the
 * time on a 12-hour clock.
 */
function localeClock(el: Element): Partial<TimepickerOptions> {
  const locale = Utils.locale(el);
  if (!locale) return {};
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return { twelveHour: cycle === 'h11' || cycle === 'h12' };
}

export interface TimepickerOptions extends BaseOptions {
  /**
   * Dial radius.
   * @default 135
   */
  dialRadius: number;
  /**
   * Outer radius.
   * @default 105
   */
  outerRadius: number;
  /**
   * Inner radius.
   * @default 70
   */
  innerRadius: number;
  /**
   * Tick radius.
   * @default 20
   */
  tickRadius: number;
  /**
   * Duration of the transition from/to the hours/minutes view.
   * @default 350
   */
  duration: number;
  /**
   * Specify a DOM element OR selector for a DOM element to render
   * the time picker in, by default it will be placed before the input.
   * @default null
   */
  container: HTMLElement | string | null;
  /**
   * Show the clear button in the Timepicker.
   * @default false
   */
  showClearBtn: boolean;
  /**
   *  Autosubmit timepicker selection to input field
   *  @default true
   */
  autoSubmit: boolean;
  /**
   * Default time to set on the timepicker 'now' or '13:14'.
   * @default 'now';
   */
  defaultTime: string;
  /**
   * Millisecond offset from the defaultTime.
   * @default 0
   */
  fromNow: number;
  /**
   * Internationalization options.
   */
  i18n: Partial<I18nOptions & { hours: string; minutes: string; seconds: string }>;
  /**
   * Use 12 hour AM/PM clock instead of 24 hour clock.
   * @default true, or the clock the input's `lang` uses
   */
  twelveHour: boolean;
  /**
   * Add a seconds field after the minutes, and write `HH:MM:SS`. The dial
   * still sets hours and minutes only.
   * @default false
   */
  showSeconds: boolean;
  /**
   * The earliest time a person can choose, as 24-hour `'HH:MM'` or
   * `'HH:MM:SS'`. Without `showSeconds` it rounds up to a whole minute.
   * @default null
   */
  minTime: string | null;
  /**
   * The latest time a person can choose, as 24-hour `'HH:MM'` or
   * `'HH:MM:SS'`. Without `showSeconds` it rounds down to a whole minute.
   * @default null
   */
  maxTime: string | null;
  /**
   * Vibrate device when dragging clock hand.
   * @default true
   */
  vibrate: boolean;
  /**
   * Callback function when a time is selected.
   * @default null
   */
  onSelect: (hour: number, minute: number) => void;
  /**
   * Callback function for interaction with input field.
   * @default null
   */
  onInputInteraction: (() => void) | null;
  /**
   * Callback function for done.
   * @default null
   */
  onDone: (() => void) | null;
  /**
   * Callback function for cancel.
   * @default null
   */
  onCancel: (() => void) | null;
  /**
   * Display plugin: 'docked' for a popover under the input, or 'modal' for a
   * dialog with Cancel and Ok. A modal picker writes the input only on Ok,
   * so it clears `autoSubmit`.
   */
  displayPlugin: string;
  /**
   * Configurable display plugin options
   */
  displayPluginOptions: object;
}

const _defaults: TimepickerOptions = {
  dialRadius: 135,
  outerRadius: 105,
  innerRadius: 70,
  tickRadius: 20,
  duration: 350,
  container: null,
  defaultTime: 'now', // default time, 'now' or '13:14' e.g.
  fromNow: 0, // Millisecond offset from the defaultTime
  showClearBtn: false,
  autoSubmit: true,
  // internationalization
  i18n: {
    cancel: 'Cancel',
    clear: 'Clear',
    done: 'Ok',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds'
  },
  twelveHour: true, // change to 12 hour AM/PM clock from 24 hour
  showSeconds: false,
  minTime: null,
  maxTime: null,
  vibrate: true, // vibrate the device when dragging clock hand
  // Callbacks
  onSelect: null,
  onInputInteraction: null,
  onDone: null,
  onCancel: null,
  displayPlugin: null,
  displayPluginOptions: null,
};

export class Timepicker extends Component<TimepickerOptions> {
  declare el: HTMLInputElement;
  id: string;
  containerEl: HTMLElement;
  plate: HTMLElement;
  digitalClock: HTMLElement;
  inputHours: HTMLInputElement;
  inputMinutes: HTMLInputElement;
  /** The seconds field, or null without `showSeconds`. */
  inputSeconds: HTMLInputElement | null;
  x0: number;
  y0: number;
  moved: boolean;
  /** Which pointer is dragging the clock hand; a second finger is ignored. */
  private _dragPointerId: number | null = null;
  dx: number;
  dy: number;
  /**
   * Current view on the timepicker.
   * @default 'hours'
   */
  currentView: Views;
  hand: SVGElement;
  minutesView: HTMLElement;
  hours: number;
  minutes: number;
  seconds: number;
  /** The selected time. */
  time: string;
  /**
   * If the time is AM or PM on twelve-hour clock.
   * @default 'PM'
   */
  amOrPm: 'AM' | 'PM';
  static _template;
  /** Whether this device exposes the Vibration API at all. */
  canVibrate: boolean;
  _canvas: HTMLElement;
  hoursView: HTMLElement;
  spanAmPm: HTMLSpanElement;
  footer: HTMLElement;
  private _amBtn: HTMLButtonElement;
  private _pmBtn: HTMLButtonElement;
  bg: Element;
  g: Element;
  toggleViewTimer: ReturnType<typeof setTimeout>;
  vibrateTimer: ReturnType<typeof setTimeout>;
  private _autoSubmitTimer: ReturnType<typeof setTimeout>;
  private _clockResetTimer: ReturnType<typeof setTimeout>;
  private displayPlugin: DisplayPlugin;
  /** Whether the dial (ticks + SVG + AM/PM buttons) has been built yet. */
  private _clockBuilt = false;
  /** The first and last allowed second of the day. */
  private _limits: [number, number] = [0, DAY_END];

  constructor(el: HTMLInputElement, options: Partial<TimepickerOptions>) {
    super(el, options, Timepicker);
    this.el['Expressive_Timepicker'] = this;
    this.options = {
      ...Timepicker.defaults,
      ...localeClock(el),
      ...options,
      i18n: { ...Timepicker.defaults.i18n, ...options?.i18n }
    };
    // A modal clock writes on Ok, so it has the buttons.
    this.options.autoSubmit &&= this.options.displayPlugin !== 'modal';
    this.id = Utils.guid();
    this._readLimits();
    this._insertHTMLIntoDOM();
    this._setupVariables();
    this._setupEventHandlers();
    // The dial is ~40 elements (12 or 24 hour ticks, 12 minute ticks, the SVG
    // hand and the AM/PM buttons) and is built by _ensureClockBuilt() rather
    // than here - see _pickerSetup for when that first happens.
    this._pickerSetup();

    this.displayPlugin = createDisplayPlugin(this.options.displayPlugin, this.el, this.containerEl, this.options.displayPluginOptions, this.cancel);
  }

  static get defaults(): TimepickerOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Timepicker.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLInputElement, options?: Partial<TimepickerOptions>): Timepicker;
  /**
   * Initializes instances of Timepicker.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<HTMLInputElement | InitElement>,
    options?: Partial<TimepickerOptions>
  ): Timepicker[];
  /**
   * Initializes instances of Timepicker.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLInputElement | InitElements<HTMLInputElement | InitElement>,
    options: Partial<TimepickerOptions> = {}
  ): Timepicker | Timepicker[] {
    return super.init(els, options, Timepicker);
  }

  static _addLeadingZero(num: number) {
    return (num < 10 ? '0' : '') + num;
  }

  static _createSVGEl(name: string) {
    const svgNS = 'http://www.w3.org/2000/svg';
    return document.createElementNS(svgNS, name);
  }

  static getInstance(el: HTMLElement): Timepicker {
    return el['Expressive_Timepicker'];
  }

  destroy() {
    clearTimeout(this._autoSubmitTimer);
    clearTimeout(this.toggleViewTimer);
    clearTimeout(this.vibrateTimer);
    this._cancelClockReset();
    this._removeEventHandlers();
    this.displayPlugin?.destroy();
    this.containerEl.remove();
    this.el['Expressive_Timepicker'] = undefined;
  }

  _setupEventHandlers() {
    this.el.addEventListener('click', this._handleInputClick);
    this.el.addEventListener('keydown', this._handleInputKeydown);
    this.plate.addEventListener('pointerdown', this._handleClockClickStart);
    this.digitalClock.addEventListener('input', this._inputFromTextField);
    this.digitalClock.addEventListener('keydown', this._handleDigitalKeydown);
    this.inputHours.addEventListener('focus', () => this.showView('hours'));
    this.inputHours.addEventListener('focusout', () => this.formatHours());
    this.inputMinutes.addEventListener('focus', () => this.showView('minutes'));
    this.inputMinutes.addEventListener('focusout', () => this.formatMinutes());
    this.inputSeconds?.addEventListener('focusout', () => this.formatSeconds());
  }

  _removeEventHandlers() {
    this.digitalClock.removeEventListener('input', this._inputFromTextField);
    this.digitalClock.removeEventListener('keydown', this._handleDigitalKeydown);
    this.el.removeEventListener('click', this._handleInputClick);
    this.el.removeEventListener('keydown', this._handleInputKeydown);
    // Drag handlers live on the document while the clock hand is held; if the
    // component is destroyed mid-drag they would otherwise outlive it.
    this._removeDragListeners();
  }

  private _removeDragListeners() {
    document.removeEventListener('pointermove', this._handleDocumentClickMove);
    document.removeEventListener('pointerup', this._handleDocumentClickEnd);
    document.removeEventListener('pointercancel', this._handleDocumentClickCancel);
  }

  _handleInputClick = () => {
    this._updateTimeFromInput();
    // Before focus(): focusing inputHours fires the handler that calls
    // showView, and an already-focused input fires nothing at all.
    this._ensureClockBuilt();
    if (this.displayPlugin) this.displayPlugin.show();
    this.inputHours.focus();
    if (typeof this.options.onInputInteraction === 'function') this.options.onInputInteraction.call(this);
  };

  _handleInputKeydown = Utils.ignoringComposition((e: KeyboardEvent) => {
    if (e.key === Utils.keys.ENTER) {
      e.preventDefault();
      this._handleInputClick();
    }
  });

  _handleClockClickStart = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    this._ensureClockBuilt();
    const clockPlateBR = this.plate.getBoundingClientRect();
    const offset = { x: clockPlateBR.left, y: clockPlateBR.top };

    this.x0 = offset.x + this.options.dialRadius;
    this.y0 = offset.y + this.options.dialRadius;
    this.moved = false;
    this._dragPointerId = e.pointerId;
    this.dx = e.clientX - this.x0;
    this.dy = e.clientY - this.y0;

    // Set clock hands
    this.setHand(this.dx, this.dy, false);
    // The hand follows the pointer anywhere on the page while it is held.
    // `pointercancel` ends the drag the same way `pointerup` does: without it
    // these document listeners outlived a cancelled touch, because the
    // `touchend` pair this replaced had no `touchcancel` companion.
    document.addEventListener('pointermove', this._handleDocumentClickMove);
    document.addEventListener('pointerup', this._handleDocumentClickEnd);
    document.addEventListener('pointercancel', this._handleDocumentClickCancel);
  };

  _handleDocumentClickMove = (e: PointerEvent) => {
    if (e.pointerId !== this._dragPointerId) return;
    e.preventDefault();
    const x = e.clientX - this.x0;
    const y = e.clientY - this.y0;
    this.moved = true;
    this.setHand(x, y, false);
  };

  _handleDocumentClickEnd = (e: PointerEvent) => {
    if (e.pointerId !== this._dragPointerId) return;
    this._dragPointerId = null;
    e.preventDefault();
    this._removeDragListeners();
    const x = e.clientX - this.x0;
    const y = e.clientY - this.y0;
    if (this.moved && x === this.dx && y === this.dy) {
      this.setHand(x, y);
    }

    if (this.currentView === 'hours') {
      this.inputMinutes.focus();
      this.showView('minutes', this.options.duration / 2);
    } else {
      clearTimeout(this._autoSubmitTimer);
      this._autoSubmitTimer = setTimeout(() => {
        this._autoSubmitTimer = null;
        if (this.options.autoSubmit) this.done();
      }, this.options.duration / 2);
    }

    const { hours, minutes } = this;
    this._notify('select', this.options.onSelect, { args: [hours, minutes], detail: { hours, minutes }, current: () => this.hours === hours && this.minutes === minutes });
  };

  /**
   * A cancelled pointer is not a completed selection. The browser or the OS
   * took the gesture over, so this only lets go of the drag - it must not run
   * the pointer-up path, which advances hours to minutes, fires `onSelect`,
   * and under `autoSubmit` closes the picker on a time the user never chose.
   */
  _handleDocumentClickCancel = (e: PointerEvent) => {
    if (e.pointerId !== this._dragPointerId) return;
    this._dragPointerId = null;
    this.moved = false;
    this._removeDragListeners();
  };

  /**
   * Read `minTime` and `maxTime` as seconds of the day. Without a seconds
   * field the picker writes whole minutes, so the bounds round inward.
   */
  private _readLimits() {
    const { minTime, maxTime, showSeconds, fromNow } = this.options;
    const read = (time: string | null, fallback: number) => (time ? daySeconds(readTime(time, fromNow)) : fallback);
    let [min, max] = [read(minTime, 0), read(maxTime, DAY_END)];
    if (!showSeconds) [min, max] = [Math.ceil(min / 60) * 60, Math.floor(max / 60) * 60];
    if (min > max) return console.warn('Timepicker ignored minTime and maxTime: minTime is after maxTime.', this.el);
    this._limits = [min, max];
  }

  _insertHTMLIntoDOM() {
    const template = document.createElement('template');
    template.innerHTML = Timepicker._template.trim();

    this.containerEl = <HTMLElement>template.content.firstChild;
    this.containerEl.id = 'container-' + this.id;

    // Append popover to input by default
    const optEl = this.options.container;
    const containerEl = optEl instanceof HTMLElement ? optEl : document.querySelector(optEl);

    if (this.options.container && !!containerEl) {
      containerEl.append(this.containerEl);
    } else {
      this.el.parentElement.appendChild(this.containerEl);
    }
  }

  _setupVariables() {
    this.currentView = 'hours';
    // `navigator.webkitVibrate` never shipped in any browser - the probe it
    // came from was folklore. A plain feature check is the whole of it.
    this.canVibrate = typeof navigator.vibrate === 'function';
    this._canvas = this.containerEl.querySelector('.timepicker-canvas');
    this.plate = this.containerEl.querySelector('.timepicker-plate');
    this.digitalClock = this.containerEl.querySelector('.timepicker-display-column');
    this.hoursView = this.containerEl.querySelector('.timepicker-hours');
    this.minutesView = this.containerEl.querySelector('.timepicker-minutes');
    this.inputHours = this.containerEl.querySelector('.timepicker-input-hours');
    this.inputMinutes = this.containerEl.querySelector('.timepicker-input-minutes');
    this.inputSeconds = this.containerEl.querySelector('.timepicker-input-seconds');
    if (!this.options.showSeconds) this._removeSecondsField();
    // The fields are spin buttons: the arrows step them, and the hour and
    // minute fields move the hand.
    for (const unit of this._units()) {
      const [min, max] = this._bounds(unit);
      const attributes = { role: 'spinbutton', 'aria-valuemin': min, 'aria-valuemax': max, 'aria-label': this.options.i18n[unit] };
      Object.entries(attributes).forEach(([name, value]) => this._input(unit).setAttribute(name, String(value)));
    }
    this.spanAmPm = this.containerEl.querySelector('.timepicker-span-am-pm');
    this.footer = this.containerEl.querySelector('.timepicker-footer');
    this.amOrPm = 'PM';
  }

  private _removeSecondsField() {
    this.containerEl.querySelectorAll('.timepicker-seconds-divider, .timepicker-input-seconds-wrapper').forEach((el) => el.remove());
    this.inputSeconds = null;
  }

  private _input(unit: Unit): HTMLInputElement | null {
    return { hours: this.inputHours, minutes: this.inputMinutes, seconds: this.inputSeconds }[unit];
  }

  /** The units that have a field. */
  private _units(): Unit[] {
    return UNITS.filter((unit) => this._input(unit));
  }

  /** Which unit's field `target` is, if any. */
  private _unitOf(target: EventTarget): Unit | undefined {
    return this._units().find((unit) => this._input(unit) === target);
  }

  _pickerSetup() {
    Utils.createButton(
      this.footer,
      this.options.i18n.clear,
      ['timepicker-clear'],
      this.options.showClearBtn,
      this.clear
    );

    if (!this.options.autoSubmit) {
      Utils.createConfirmationContainer(
        this.footer,
        this.options.i18n.done,
        this.options.i18n.cancel,
        this.confirm,
        this.cancel
      );
    }

    this._updateTimeFromInput();

    // With a docked display the container is `visibility: hidden` until
    // show(), so the dial can wait for the first interaction. Without one it
    // is on screen from the moment it is inserted and has to be ready now.
    if (!this.options.displayPlugin) this.showView('hours');
  }

  /**
   * Build the dial, once. Cheap to call repeatedly - every entry point that
   * touches the clock calls it first, so the picker cannot be interacted with
   * before it exists.
   */
  private _ensureClockBuilt() {
    if (this._clockBuilt) return;
    this._clockBuilt = true;
    this._clockSetup();
    // Applies the AM/PM state _updateTimeFromInput worked out before the
    // buttons existed.
    this._updateAmPmView();
    this._updateRanges();
  }

  _clockSetup() {
    if (this.options.twelveHour) {
      // AM Button
      this._amBtn = document.createElement('button');
      this._amBtn.type = 'button';
      this._amBtn.classList.add('am-btn');
      this._amBtn.innerText = 'AM';
      this._amBtn.addEventListener('click', this._handleAmPmClick);
      this.spanAmPm.appendChild(this._amBtn);
      // PM Button
      this._pmBtn = document.createElement('button');
      this._pmBtn.type = 'button';
      this._pmBtn.classList.add('pm-btn');
      this._pmBtn.innerText = 'PM';
      this._pmBtn.addEventListener('click', this._handleAmPmClick);
      this.spanAmPm.appendChild(this._pmBtn);
    }
    this._buildHoursView();
    this._buildMinutesView();
    this._buildSVGClock();
  }

  _buildSVGClock() {
    // Draw clock hands and others
    const dialRadius = this.options.dialRadius;
    const tickRadius = this.options.tickRadius;
    const diameter = dialRadius * 2;
    // The ticks, hand and pointer math all centre on dialRadius, so the
    // painted face has to be the same size or the hand sits off centre.
    this.plate.style.width = this.plate.style.height = diameter + 'px';
    const svg = Timepicker._createSVGEl('svg');
    svg.setAttribute('class', 'timepicker-svg');
    svg.setAttribute('width', diameter.toString());
    svg.setAttribute('height', diameter.toString());
    const g = Timepicker._createSVGEl('g');
    g.setAttribute('transform', 'translate(' + dialRadius + ',' + dialRadius + ')');
    const bearing = Timepicker._createSVGEl('circle');
    bearing.setAttribute('class', 'timepicker-canvas-bearing');
    bearing.setAttribute('cx', '0');
    bearing.setAttribute('cy', '0');
    bearing.setAttribute('r', '4');
    const hand = Timepicker._createSVGEl('line');
    hand.setAttribute('x1', '0');
    hand.setAttribute('y1', '0');
    const bg = Timepicker._createSVGEl('circle');
    bg.setAttribute('class', 'timepicker-canvas-bg');
    bg.setAttribute('r', tickRadius.toString());
    g.appendChild(hand);
    g.appendChild(bg);
    g.appendChild(bearing);
    svg.appendChild(g);
    this._canvas.appendChild(svg);
    this.hand = hand;
    this.bg = bg;
    this.g = g;
  }

  _buildHoursView() {
    // Hours view
    if (this.options.twelveHour) {
      for (let i = 1; i < 13; i += 1) {
        const radian = (i / 6) * Math.PI;
        const radius = this.options.outerRadius;
        this._buildHoursTick(i, radian, radius);
      }
    } else {
      for (let i = 0; i < 24; i += 1) {
        const radian = (i / 6) * Math.PI;
        const inner = i > 0 && i < 13;
        const radius = inner ? this.options.innerRadius : this.options.outerRadius;
        this._buildHoursTick(i, radian, radius);
      }
    }
  }

  _buildHoursTick(i: number, radian: number, radius: number) {
    this._placeTick(this.hoursView, radian, radius, i === 0 ? '00' : i.toString());
  }

  _buildMinutesView() {
    for (let i = 0; i < 60; i += 5) {
      const radian = (i / 30) * Math.PI;
      this._placeTick(this.minutesView, radian, this.options.outerRadius, Timepicker._addLeadingZero(i));
    }
  }

  private _placeTick(view: HTMLElement, radian: number, radius: number, text: string) {
    const tick = document.createElement('div');
    tick.classList.add('timepicker-tick');
    tick.style.left =
      this.options.dialRadius + Math.sin(radian) * radius - this.options.tickRadius + 'px';
    tick.style.top =
      this.options.dialRadius - Math.cos(radian) * radius - this.options.tickRadius + 'px';
    tick.textContent = text;
    view.appendChild(tick);
  }

  _handleAmPmClick = (e: MouseEvent) => {
    this._handleAmPmInteraction(<HTMLElement>e.target);
  };

  _handleAmPmInteraction = (e: HTMLElement) => {
    this.amOrPm = e.classList.contains('am-btn') ? 'AM' : 'PM';
    this._updateAmPmView();
    this._afterChange();
    this.resetClock(null);
  }

  _updateAmPmView() {
    // _updateTimeFromInput settles amOrPm before the dial is built; the
    // buttons pick the state up in _ensureClockBuilt.
    if (!this._amBtn || !this._pmBtn) return;
    this._amBtn.setAttribute('aria-pressed', String(this.amOrPm === 'AM'));
    this._pmBtn.setAttribute('aria-pressed', String(this.amOrPm === 'PM'));
    this._amBtn.classList.toggle('outlined', this.amOrPm !== 'AM');
    this._pmBtn.classList.toggle('outlined', this.amOrPm !== 'PM');
    if (this.options.twelveHour) {
      if (this.amOrPm === 'PM') {
        this._amBtn.classList.remove('filled');
        this._pmBtn.classList.add('filled');
      } else if (this.amOrPm === 'AM') {
        this._amBtn.classList.add('filled');
        this._pmBtn.classList.remove('filled');
      }
    }
  }

  _updateTimeFromInput() {
    this._cancelClockReset();
    const [hours, minutes, seconds] = readTime(`${this.el.value || this.options.defaultTime || ''}`, this.options.fromNow);
    [this.minutes, this.seconds] = [minutes, seconds];
    this._setHours24(hours);
    this._clamp();
    this._writeFields();
    this._updateAmPmView();
    this._updateRanges();
  }

  /** Show the time in every field but `except`, which the person is typing in. */
  private _writeFields(except?: HTMLInputElement) {
    this._units().forEach((unit) => {
      if (this._input(unit) !== except) this._input(unit).value = Timepicker._addLeadingZero(this[unit]);
    });
  }

  /** After a change to the time: keep it in range and update what depends on it. */
  private _afterChange(except?: HTMLInputElement) {
    if (this._clamp()) this._writeFields(except);
    this._updateRanges();
  }

  /**
   * Give each field the allowed range of values, and disable a period with
   * no allowed time.
   */
  private _updateRanges() {
    for (const unit of this._units()) {
      const [min, max] = this._range(unit);
      this._input(unit).setAttribute('aria-valuemin', String(min));
      this._input(unit).setAttribute('aria-valuemax', String(max));
    }
    const [first, last] = this._dayRange('hours');
    if (this._amBtn) [this._amBtn.disabled, this._pmBtn.disabled] = [first > 11, last < 12];
  }

  /** The hour on the 24-hour clock, setting AM or PM on a 12-hour one. */
  private _setHours24(hour: number) {
    if (!this.options.twelveHour) return void (this.hours = hour);
    this.amOrPm = hour >= 12 ? 'PM' : 'AM';
    this.hours = hour % 12 || 12;
    this._updateAmPmView();
  }

  /** The time as seconds of the day. */
  private _time() {
    return daySeconds([this._hours24(), this.minutes, this.seconds]);
  }

  /** Move the time to the nearest allowed time, and say whether it moved. */
  private _clamp() {
    const time = this._time();
    const clamped = Math.min(Math.max(time, this._limits[0]), this._limits[1]);
    if (clamped === time) return false;
    this._setHours24(Math.floor(clamped / 3600));
    [this.minutes, this.seconds] = [Math.floor(clamped / 60) % 60, clamped % 60];
    return true;
  }

  /**
   * Show hours or minutes view on timepicker.
   * @param view The name of the view you want to switch to, 'hours' or 'minutes'.
   * @param delay
   */
  showView = (view: Views, delay: number = null) => {
    this._ensureClockBuilt();
    const isHours = view === 'hours',
      nextView = isHours ? this.hoursView : this.minutesView,
      hideView = isHours ? this.minutesView : this.hoursView;
    this.currentView = view;

    // Transition view
    hideView.classList.add('timepicker-dial-out');

    nextView.style.visibility = 'visible';
    nextView.classList.remove('timepicker-dial-out');

    // Reset clock hand
    this.resetClock(delay);
    // After transitions ended
    clearTimeout(this.toggleViewTimer);
    this.toggleViewTimer = setTimeout(() => {
      hideView.style.visibility = 'hidden';
    }, this.options.duration);
  };

  private _cancelClockReset() {
    clearTimeout(this._clockResetTimer);
    this._clockResetTimer = null;
    this._canvas?.classList.remove('timepicker-canvas-out');
  }

  resetClock(delay) {
    this._cancelClockReset();
    const view = this.currentView,
      value = this[view],
      isHours = view === 'hours',
      unit = Math.PI / (isHours ? 6 : 30),
      radian = value * unit,
      radius =
        isHours && value > 0 && value < 13 ? this.options.innerRadius : this.options.outerRadius,
      x = Math.sin(radian) * radius,
      y = -Math.cos(radian) * radius;

    if (delay) {
      this._canvas?.classList.add('timepicker-canvas-out');
      this._clockResetTimer = setTimeout(() => {
        this.setHand(x, y);
      }, delay);
    } else {
      this.setHand(x, y);
    }
  }

  /**
   * Enter in the hour or minute field commits the typed time. The dial ticks
   * are pointer targets only, and under `autoSubmit` there is no Ok button,
   * so without this a keyboard user could type a time but never set it.
   * Cancelling also keeps Enter from submitting a surrounding form. The
   * listener's column holds only the fields; AM/PM is a separate column.
   */
  _handleDigitalKeydown = Utils.ignoringComposition((event: KeyboardEvent) => {
    if (event.key in STEPS) return this._step(event);
    if (event.key !== Utils.keys.ENTER) return;
    event.preventDefault();
    // Normalize first, as leaving the field would: an emptied field takes its
    // default, and the committed time has to be the one the fields then show.
    this._formatFields();
    if (this.options.autoSubmit) this.done();
    else this.confirm();
  });

  /** The lowest and highest value a field can show. */
  private _bounds(unit: Unit): [number, number] {
    if (unit !== 'hours') return [0, 59];
    return this.options.twelveHour ? [1, 12] : [0, 23];
  }

  /** The lowest and highest allowed value of a field, given the others. */
  private _range(unit: Unit): [number, number] {
    const [min, max] = this._bounds(unit);
    const allowed = Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((value) => this._allows(unit, value));
    return allowed.length ? [Math.min(...allowed), Math.max(...allowed)] : [min, max];
  }

  /**
   * The first and last allowed value of a field, given the fields before it,
   * with hours on the 24-hour clock. An hour is allowed when any second of
   * it is, and so is a minute.
   */
  private _dayRange(unit: Unit): number[] {
    const [size, count] = SPANS[unit];
    const start = this._time() - (this._time() % (size * count));
    return this._limits.map((limit) => Math.min(Math.max(Math.floor((limit - start) / size), 0), count - 1));
  }

  /** A field's value with hours on the 24-hour clock. */
  private _dayValue(unit: Unit, value: number) {
    return unit === 'hours' && this.options.twelveHour ? dayHour(value, this.amOrPm === 'PM') : value;
  }

  /** Whether a field can take `value` within the range. */
  private _allows(unit: Unit, value: number) {
    const [first, last] = this._dayRange(unit);
    const day = this._dayValue(unit, value);
    return Math.min(Math.max(day, first), last) === day;
  }

  /** The whole number typed in a field, or NaN when the field can't take it. */
  private _fieldValue(unit: Unit, text: string) {
    const value = Number(text.trim() || NaN);
    return this._takes(unit, value) ? value : NaN;
  }

  /** Whether a field can show `value` and the range allows it. */
  private _takes(unit: Unit, value: number) {
    const [min, max] = this._bounds(unit);
    return Number.isInteger(value) && Math.min(Math.max(value, min), max) === value && this._allows(unit, value);
  }

  /** Point the hand at an hour or minute. Seconds have no dial view. */
  private _moveHand(unit: Unit, value: number) {
    if (unit === 'seconds') return;
    this._cancelClockReset();
    this.drawClockFromTimeInput(value, unit === 'hours');
  }

  /**
   * Up and Down step a field by one, Page Up and Page Down by five, round
   * the dial: past 59 minutes comes 00. The hand follows hours and minutes.
   * Hours step round the day, so in 12-hour time passing 12 switches AM and
   * PM. Minutes and seconds wrap without carrying. With `minTime` or
   * `maxTime`, a field that is not wholly allowed stops at its last allowed
   * value instead of wrapping.
   */
  private _step(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    const unit = this._unitOf(input);
    if (!unit) return;
    event.preventDefault();
    const value = this._stepValue(unit, STEPS[event.key]);
    if (unit === 'hours') this._setHours24(value);
    else this[unit] = value;
    this._afterChange();
    input.value = Timepicker._addLeadingZero(this[unit]);
    this._moveHand(unit, this[unit]);
  }

  /** A field's value `step` on, with hours on the 24-hour clock. */
  private _stepValue(unit: Unit, step: number) {
    const [first, last] = this._dayRange(unit);
    const count = SPANS[unit][1];
    const next = this._dayValue(unit, this[unit]) + step;
    return first === 0 && last === count - 1 ? (next + count) % count : Math.min(Math.max(next, first), last);
  }

  _inputFromTextField = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const unit = this._unitOf(input);
    if (!unit) return;
    // Any edit to an hour or minute cancels an older delayed hand move.
    if (unit !== 'seconds') this._cancelClockReset();
    const value = this._fieldValue(unit, input.value);
    if (Number.isNaN(value)) return;
    this[unit] = value;
    this._afterChange(input);
    this._moveHand(unit, value);
  };

  drawClockFromTimeInput(value, isHours) {
    const unit = Math.PI / (isHours ? 6 : 30);
    const radian = value * unit;
    let radius;
    if (this.options.twelveHour) {
      radius = this.options.outerRadius;
    } else {
      radius =
        isHours && value > 0 && value < 13 ? this.options.innerRadius : this.options.outerRadius;
    }
    this.setClockAttributes(radian, radius);
  }

  setHand(x, y, roundBy5: boolean = false) {
    this._cancelClockReset();
    const isHours = this.currentView === 'hours',
      unit = Math.PI / (isHours || roundBy5 ? 6 : 30),
      z = Math.sqrt(x * x + y * y),
      inner = isHours && z < (this.options.outerRadius + this.options.innerRadius) / 2;
    const radius = inner && !this.options.twelveHour ? this.options.innerRadius : this.options.outerRadius;
    let radian = Math.atan2(x, -y);

    // Radian should in range [0, 2PI]
    if (radian < 0) {
      radian = Math.PI * 2 + radian;
    }

    // Get the round value
    let value = Math.round(radian / unit);

    // Get the round radian
    radian = value * unit;

    // Correct the hours or minutes
    if (!isHours) {
      if (roundBy5) value *= 5;
      if (value === 60) value = 0;
    } else if (this.options.twelveHour) {
      if (value === 0) value = 12;
    } else if (value % 12 === 0) {
      // 0 and 12 share a position: 12 on the inner ring, 00 on the outer.
      value = inner ? 12 : 0;
    } else if (!inner) {
      value += 12;
    }

    // Once hours or minutes changed, vibrate the device. The timer keeps it
    // from vibrating too frequently.
    if (this[this.currentView] !== value && this.canVibrate && this.options.vibrate && !this.vibrateTimer) {
      navigator.vibrate(10);
      this.vibrateTimer = setTimeout(() => {
        this.vibrateTimer = null;
      }, 100);
    }

    this[this.currentView] = value;
    (isHours ? this.inputHours : this.inputMinutes).value = Timepicker._addLeadingZero(value);

    // Set clock hand and others' position
    this.setClockAttributes(radian, radius);
  }

  setClockAttributes(radian: number, radius: number) {
    // Nothing to point at until the SVG exists.
    if (!this.hand || !this.bg) return;
    const cx1 = Math.sin(radian) * (radius - this.options.tickRadius),
      cy1 = -Math.cos(radian) * (radius - this.options.tickRadius),
      cx2 = Math.sin(radian) * radius,
      cy2 = -Math.cos(radian) * radius;
    this.hand.setAttribute('x2', cx1.toString());
    this.hand.setAttribute('y2', cy1.toString());
    this.bg.setAttribute('cx', cx2.toString());
    this.bg.setAttribute('cy', cy2.toString());
  }

  formatHours() {
    if (this.inputHours.value == '') this.setHoursDefault();
    this.inputHours.value = Timepicker._addLeadingZero(this.hours);
  }

  formatMinutes() {
    if (this.inputMinutes.value == '') this.minutes = new Date().getMinutes();
    this.inputMinutes.value = Timepicker._addLeadingZero(this.minutes);
  }

  formatSeconds() {
    if (this.inputSeconds.value == '') this.seconds = new Date().getSeconds();
    this.inputSeconds.value = Timepicker._addLeadingZero(this.seconds);
  }

  /** Normalize every field, as leaving it would. */
  private _formatFields() {
    this.formatHours();
    this.formatMinutes();
    if (this.inputSeconds) this.formatSeconds();
  }

  setHoursDefault() {
    this.hours = new Date().getHours();
    if (this.options.twelveHour) this.hours = this.hours % 12 || 12;
    this.inputHours.value = this.hours.toString();
  }

  done = (clearValue = null) => {
    // Set input value
    const last = this.el.value;
    let value = clearValue ? '' : this._clockTime(this.hours);
    this.time = value;
    if (!clearValue) value = this._inputValue(value);
    this.el.value = value;
    // Trigger change event
    if (value !== last) {
      this.el.dispatchEvent(
        new Event('change', { bubbles: true, cancelable: true, composed: true })
      );
    }
  };

  /** `HH:MM` for the given hour, or `HH:MM:SS` with a seconds field. */
  private _clockTime(hours: number) {
    const parts = this.inputSeconds ? [hours, this.minutes, this.seconds] : [hours, this.minutes];
    return parts.map(Timepicker._addLeadingZero).join(':');
  }

  // A time input accepts only 24-hour HH:mm or HH:mm:ss and empties itself
  // on anything else, so it never gets the AM/PM a text input shows.
  private _inputValue(time: string) {
    if (this.el.type === 'time') return this._clockTime(this._hours24());
    return this.options.twelveHour ? `${time} ${this.amOrPm}` : time;
  }

  private _hours24() {
    if (!this.options.twelveHour) return this.hours;
    return (this.hours % 12) + (this.amOrPm === 'PM' ? 12 : 0);
  }

  confirm = () => {
    this.done();
    hideModal(this.displayPlugin);
    this._notify('confirm', this.options.onDone, { args: [] });
  }

  cancel = () => {
    // Cancel keeps the previously submitted value in the input.
    hideModal(this.displayPlugin);
    this._notify('cancel', this.options.onCancel, { args: [] });
  }

  clear = () => {
    this.done(true);
  };

  static {
    Timepicker._template = `<div class="timepicker-container">
          <div class="timepicker-digital-display">
            <div class="timepicker-text-container">
              <div class="timepicker-display-column timepicker-display-digital-clock">
                <div class="timepicker-input-hours-wrapper">
                  <input type="text" maxlength="2" class="timepicker-input-hours" />
                </div>
                <div class="timepicker-input-divider-wrapper">
                  <span class="timepicker-input-divider">:</span>
                </div>
                <div class="timepicker-input-minutes-wrapper">
                  <input type="text" maxlength="2" class="timepicker-input-minutes" />
                </div>
                <div class="timepicker-input-divider-wrapper timepicker-seconds-divider">
                  <span class="timepicker-input-divider">:</span>
                </div>
                <div class="timepicker-input-seconds-wrapper">
                  <input type="text" maxlength="2" class="timepicker-input-seconds" />
                </div>
              </div>
              <div class="timepicker-display-column timepicker-display-am-pm">
                <div class="timepicker-span-am-pm"></div>
              </div>
            </div>
          </div>
          <div class="timepicker-analog-display">
            <div class="timepicker-plate">
              <div class="timepicker-canvas"></div>
              <div class="timepicker-dial timepicker-hours"></div>
              <div class="timepicker-dial timepicker-minutes timepicker-dial-out"></div>
            </div>
            <div class="timepicker-footer"></div>
          </div>
        </div>`;
  }
}
