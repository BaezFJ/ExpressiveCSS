import { Utils, pickerFooter } from '../core/utils';
import { FormSelect } from './select';
import { BaseOptions, Component, I18nOptions } from '../core/component';
import { DisplayPlugin, ModalDisplayPlugin, createDisplayPlugin, hideModal } from '../plugins/modalDisplayPlugin';

export interface DateI18nOptions extends I18nOptions {
  previousMonth: string;
  nextMonth: string;
  months: string[];
  monthsShort: string[];
  weekdays: string[];
  weekdaysShort: string[];
  weekdaysAbbrev: string[];
}

/** A day in each month, and each weekday from Sunday: 1 January 2023 was one. */
const MONTHS = Array.from({ length: 12 }, (_, month) => new Date(Date.UTC(2023, month, 1)));
const WEEKDAYS = Array.from({ length: 7 }, (_, day) => new Date(Date.UTC(2023, 0, 1 + day)));

type WeekLocale = Intl.Locale & { getWeekInfo?(): { firstDay: number }; weekInfo?: { firstDay: number } };

/**
 * Month and weekday names in a language, as Intl writes them, and its first
 * day of the week where the browser knows it. The button words are not
 * dates, so they stay as given.
 */
function localeDates(locale: string) {
  const names = (dates: Date[], options: Intl.DateTimeFormatOptions) => {
    // The picker draws Gregorian dates, so the names are Gregorian too: in fa
    // the default calendar is Persian, whose first month is not January.
    const format = new Intl.DateTimeFormat(locale, { ...options, calendar: 'gregory', timeZone: 'UTC' });
    return dates.map((date) => format.format(date));
  };
  const intl = new Intl.Locale(locale) as WeekLocale;
  // Intl counts the days from Monday (1) to Sunday (7); firstDay counts from Sunday (0).
  const week = intl.getWeekInfo?.() ?? intl.weekInfo;
  return {
    week: week ? { firstDay: week.firstDay % 7 } : {},
    i18n: {
      months: names(MONTHS, { month: 'long' }),
      monthsShort: names(MONTHS, { month: 'short' }),
      weekdays: names(WEEKDAYS, { weekday: 'long' }),
      weekdaysShort: names(WEEKDAYS, { weekday: 'short' }),
      weekdaysAbbrev: names(WEEKDAYS, { weekday: 'narrow' })
    }
  };
}

type DateParts = { year?: number; month?: number; day?: number };
type Reader = [pattern: string, set: (parts: DateParts, text: string) => void];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NUMBER = '(\\d{1,2})';
/** A pattern for any of `names`, and what sets `key` to the index of the one found. */
const named = (names: string[], key?: keyof DateParts): Reader => [
  `(${names.map(escapeRegExp).join('|')})`,
  (parts, text) => key && (parts[key] = names.findIndex((name) => name.toLowerCase() === text.toLowerCase()))
];

/** How each format token reads back. Weekday names are read past, not used. */
const READERS: Record<string, (i18n: Partial<DateI18nOptions>) => Reader> = {
  d: () => [NUMBER, (parts, text) => (parts.day = +text)],
  dd: () => [NUMBER, (parts, text) => (parts.day = +text)],
  ddd: (i18n) => named(i18n.weekdaysShort),
  dddd: (i18n) => named(i18n.weekdays),
  m: () => [NUMBER, (parts, text) => (parts.month = +text - 1)],
  mm: () => [NUMBER, (parts, text) => (parts.month = +text - 1)],
  mmm: (i18n) => named(i18n.monthsShort, 'month'),
  mmmm: (i18n) => named(i18n.months, 'month'),
  // As Date.parse reads them: 00 to 49 in this century, 50 to 99 in the last.
  yy: () => ['(\\d{2})', (parts, text) => (parts.year = +text + (+text < 50 ? 2000 : 1900))],
  yyyy: () => ['(\\d{4})', (parts, text) => (parts.year = +text)]
};

const pad = (n: number) => String(n).padStart(2, '0');
/** What each `format` token writes for a date. */
const FORMATS: Record<string, (date: Date, i18n: Partial<DateI18nOptions>) => string | number> = {
  d: (date) => date.getDate(),
  dd: (date) => pad(date.getDate()),
  ddd: (date, i18n) => i18n.weekdaysShort[date.getDay()],
  dddd: (date, i18n) => i18n.weekdays[date.getDay()],
  m: (date) => date.getMonth() + 1,
  mm: (date) => pad(date.getMonth() + 1),
  mmm: (date, i18n) => i18n.monthsShort[date.getMonth()],
  mmmm: (date, i18n) => i18n.months[date.getMonth()],
  yy: (date) => String(date.getFullYear()).slice(2),
  yyyy: (date) => date.getFullYear()
};

/**
 * Reads a date written in a string format with the names it was written
 * in, so a German "Mär 15, 2026" reads back as Date.parse never would.
 * Null for text that does not fit the format, or a day the month lacks.
 */
export function readDate(value: string, format: string, i18n: Partial<DateI18nOptions>): Date | null {
  const readers: Reader[] = [];
  const pattern = format.split(/(d{1,4}|m{1,4}|y{4}|yy|!.)/g).map((token) => {
    const reader = READERS[token]?.(i18n);
    if (reader) readers.push(reader);
    return reader ? reader[0] : escapeRegExp(token);
  });
  const match = new RegExp(`^\\s*${pattern.join('')}\\s*$`, 'iu').exec(value);
  if (!match) return null;
  const parts: DateParts = {};
  readers.forEach(([, set], i) => set(parts, match[i + 1]));
  // setFullYear keeps a year below 100, which the Date constructor moves to the 1900s.
  const date = new Date(2000, 0, 1);
  date.setFullYear(parts.year, parts.month, parts.day);
  const same = [date.getFullYear(), date.getMonth(), date.getDate()].join() === [parts.year, parts.month, parts.day].join();
  return same ? date : null;
}

/**
 * The options under the page's: with a `lang` on or around the input, its
 * month and weekday names and first day of the week.
 */
function withLocale(el: Element, options: Partial<DatepickerOptions> = {}): Partial<DatepickerOptions> {
  const locale = Utils.locale(el);
  if (!locale) return options;
  const { week, i18n } = localeDates(locale);
  return { ...week, ...options, i18n: { ...i18n, ...options.i18n } };
}

export interface DatepickerOptions extends BaseOptions {
  /**
   * The date output format for the input field value
   * or a function taking the date and outputting the
   * formatted date string.
   * @default 'mmm dd, yyyy'
   */
  format: string | ((d: Date) => string);
  /**
   * Used to create date object from current input string.
   * Receives the format string, or an empty string when format is a function.
   * Not called for blank input.
   * @default null
   */
  parse: ((value: string, format: string) => Date) | null;
  /**
   * The initial condition if the datepicker is based on date range.
   * @default false
   */
  isDateRange: boolean;
  /**
   * The selector of the user specified date range end element
   */
  dateRangeEndEl: string | null;
  /**
   * The initial condition if the datepicker is based on multiple date selection.
   * @default false
   */
  isMultipleSelection: boolean;
  /**
   * The initial date to view when first opened.
   * @default null
   */
  defaultDate: Date | null;
  /**
   * The initial end date to view when first opened.
   * @default null
   */
  defaultEndDate: Date | null;
  /**
   * Make the `defaultDate` the initial selected value.
   * @default false
   */
  setDefaultDate: boolean;
  /**
   * Make the `defaultEndDate` the initial selected value.
   * @default false
   */
  setDefaultEndDate: boolean;
  /**
   * Prevent selection of any date on the weekend.
   * @default false
   */
  disableWeekends: boolean;
  /**
   * Custom function to disable certain days.
   * @default null
   */
  disableDayFn: ((day: Date) => boolean) | null;
  /**
   * First day of week (0: Sunday, 1: Monday etc).
   * @default 0, or the first day in the input's `lang` where the browser knows it
   */
  firstDay: number;
  /**
   * The earliest date that can be selected.
   * @default null
   */
  minDate: Date | null;
  /**
   * The latest date that can be selected.
   * @default null
   */
  maxDate: Date | null;
  /**
   * Number of years either side, or array of upper/lower range.
   * @default 10
   */
  yearRange: number | number[];
  /**
   * Sort year range in reverse order.
   * @default false
   */
  yearRangeReverse: boolean;
  /**
   * Changes Datepicker to RTL.
   * @default false
   */
  isRTL: boolean;
  /**
   * Show month after year in Datepicker title.
   * @default false
   */
  showMonthAfterYear: boolean;
  /**
   * Render days of the calendar grid that fall in the next
   * or previous month.
   * @default false
   */
  showDaysInNextAndPreviousMonths: boolean;
  /**
   * Specify if the docked datepicker is in open state by default
   */
  openByDefault: boolean;
  /**
   * Specify a DOM element OR selector for a DOM element to render
   * the calendar in, by default it will be placed before the input.
   * @default null
   */
  container: HTMLElement | string | null;
  /**
   * Show the clear button in the datepicker.
   * @default false
   */
  showClearBtn: boolean;
  /**
   *  Autosubmit calendar day select to input field
   *  @default true
   */
  autoSubmit: boolean;
  /**
   * Internationalization options. With a `lang` on or around the input, the
   * month and weekday names default to that language's, as Intl writes them.
   */
  i18n: Partial<DateI18nOptions>;
  /**
   * An array of string returned by `Date.toDateString()`,
   * indicating there are events in the specified days.
   * @default []
   */
  events: string[];
  /**
   * Callback function when date is selected,
   * first parameter is the newly selected date.
   * @default null
   */
  onSelect: ((selectedDate: Date) => void) | null;
  /**
   * Callback function when Datepicker HTML is refreshed.
   * @default null
   */
  onDraw: (() => void) | null;
  /**
   * Callback function for interaction with input field.
   * @default null
   */
  onInputInteraction: (() => void) | null;
  /**
   * Callback function for interaction with confirm button.
   * @default null
   */
  onConfirm: (() => void) | null;
  /**
   * Callback function for interaction with close button.
   * @default null
   */
  onCancel: (() => void) | null;

  /** Field used for internal calculations DO NOT CHANGE IT */
  minYear?: number;
  /** Field used for internal calculations DO NOT CHANGE IT */
  maxYear?: number;
  /** Field used for internal calculations DO NOT CHANGE IT */
  minMonth?: number;
  /** Field used for internal calculations DO NOT CHANGE IT */
  maxMonth?: number;
  /**
   * Display plugin: 'docked' for a popover under the input, or 'modal' for a
   * dialog with Cancel and Ok. A modal picker is always open inside its
   * dialog and writes the input only on Ok, so it sets `openByDefault` and
   * clears `autoSubmit`.
   */
  displayPlugin: string;
  /**
   * Configurable display plugin options
   */
  displayPluginOptions: object;
}

const _defaults: DatepickerOptions = {
  // the default output format for the input field value
  format: 'mmm dd, yyyy',
  // Used to create date object from current input string
  parse: null,
  // The initial condition if the datepicker is based on date range
  isDateRange: false,
  // The selector of the user specified date range end element
  dateRangeEndEl: null,
  // The initial condition if the datepicker is based on multiple date selection
  isMultipleSelection: false,
  // The initial date to view when first opened
  defaultDate: null,
  // The initial end date to view when first opened
  defaultEndDate: null,
  // Make the `defaultDate` the initial selected value
  setDefaultDate: false,
  // Make the `defaultEndDate` the initial selected value
  setDefaultEndDate: false,
  disableWeekends: false,
  disableDayFn: null,
  // First day of week (0: Sunday, 1: Monday etc)
  firstDay: 0,
  // The earliest date that can be selected
  minDate: null,
  // Thelatest date that can be selected
  maxDate: null,
  // Number of years either side, or array of upper/lower range
  yearRange: 10,
  // used internally (don't config outside)
  minYear: 0,
  maxYear: 9999,
  minMonth: undefined,
  maxMonth: undefined,
  isRTL: false,
  yearRangeReverse: false,
  // Render the month after year in the calendar title
  showMonthAfterYear: false,
  // Render days of the calendar grid that fall in the next or previous month
  showDaysInNextAndPreviousMonths: false,
  // Specify if docked picker is in open state by default
  openByDefault: false,
  // Specify a DOM element to render the calendar in
  container: null,
  // Show clear button
  showClearBtn: false,
  // Autosubmit
  autoSubmit: true,
  // internationalization
  i18n: {
    cancel: 'Cancel',
    clear: 'Clear',
    done: 'Ok',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ],
    monthsShort: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekdaysAbbrev: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  },
  // events array
  events: [],
  // callback function
  onSelect: null,
  onDraw: null,
  onInputInteraction: null,
  displayPlugin: null,
  displayPluginOptions: null,
  onConfirm: null,
  onCancel: null,
};

export class Datepicker extends Component<DatepickerOptions> {
  declare el: HTMLInputElement;
  id: string;
  multiple: boolean = false;
  calendarEl: HTMLElement;
  containerEl: HTMLElement;
  dateTextEl: HTMLElement;
  endDateEl: HTMLInputElement;
  dateEls: HTMLInputElement[];
  /** The selected Date. */
  date: Date;
  endDate: null | Date;
  dates: Date[];
  calendars: [{ month: number; year: number }];
  private displayPlugin: DisplayPlugin;
  /** What setInputValue last wrote, so reading it back does not depend on the parser. */
  private _writtenInputs = new WeakMap<HTMLInputElement, { value: string; date: Date | null }>();
  private _form: HTMLFormElement | null = null;
  private _resetDates = new WeakMap<HTMLInputElement, { value: string; date: Date | null }>();
  // Counts selections, so a callback that selects again silences the stale event.
  private _selection = 0;
  private _resetTimer: ReturnType<typeof setTimeout>;
  private footer: HTMLElement;
  /** Nesting depth of {@link _batchDraws}; > 0 means draws are being collected. */
  private _drawDepth = 0;
  /** Whether a draw was requested while batching. */
  private _drawDirty = false;
  /** Shape of the currently rendered controls; see {@link _controlsCacheKey}. */
  private _controlsKey: string = null;
  /** id linking the controls element to the table's aria-labelledby. */
  private _randId: string = null;
  private _focusedDate: Date = null;
  static _template: string;

  constructor(el: HTMLInputElement, options: Partial<DatepickerOptions>) {
    options = withLocale(el, options);
    super(el, options);

    // A modal calendar is always open in its dialog and writes on Ok.
    if (this.options.displayPlugin === 'modal') Object.assign(this.options, { openByDefault: true, autoSubmit: false });

    // Remove time component from minDate and maxDate options, on copies: the
    // caller's Date objects are theirs.
    const { minDate, maxDate } = this.options;
    if (minDate) this.options.minDate = new Date(new Date(minDate.getTime()).setHours(0, 0, 0, 0));
    if (maxDate) this.options.maxDate = new Date(new Date(maxDate.getTime()).setHours(0, 0, 0, 0));

    this.id = Utils.guid();
    if (this.options.isMultipleSelection) {
      this.multiple = true;
      this.dates = [];
      this.dateEls = [el];
    }

    this._setupVariables();
    this._insertHTMLIntoDOM();
    this._setupEventHandlers();

    const fromValue = !this.options.defaultDate;
    if (fromValue) {
      this.options.defaultDate = this._parseInput(this.el.value);
    }

    const defDate = this.options.defaultDate;
    if (Datepicker._isDate(defDate)) {
      if (this.options.setDefaultDate) {
        this.setDate(defDate, true);
        this.setInputValue(this.el, defDate);
      } else if (fromValue && this._isSelectableDay(defDate)) {
        // The input already holds this date, so it is the selection, as it
        // is once the input is clicked. Its text is left as written.
        this.setDate(defDate, true);
      } else {
        this.gotoDate(defDate);
      }
    } else {
      this.gotoDate(new Date());
    }
    if (this.options.isDateRange) {
      this.multiple = true;
      const defEndDate = this.options.defaultEndDate;
      if (Datepicker._isDate(defEndDate)) {
        if (this.options.setDefaultEndDate) {
          this.setDate(defEndDate, true, true);
          this.setInputValue(this.endDateEl, defEndDate);
        }
      }
    }
    this.displayPlugin = createDisplayPlugin(this.options.displayPlugin, this.el, this.containerEl, this.options.displayPluginOptions, this._cancel);
    if (this.endDateEl) this.displayPlugin?.triggers.push(this.endDateEl);
    // A form reset brings back these texts long after the cache of written
    // values has moved on, so keep the dates they stood for.
    for (const input of [this.el, this.endDateEl]) this._rememberResetDate(input);
  }

  // Only a default the picker wrote needs this: any other default text parses
  // at reset exactly as it did here.
  private _rememberResetDate(input: HTMLInputElement | undefined) {
    const written = input && this._writtenInputs.get(input);
    if (written && written.value === input.defaultValue) this._resetDates.set(input, written);
  }

  static get defaults() {
    return _defaults;
  }

  /**
   * Escape a value for interpolation into the calendar markup.
   *
   * `draw()` assembles the calendar as an HTML string, so every value that is
   * not a number this class computed itself has to go through here. In
   * practice that means the i18n strings: month and weekday names are the one
   * part of a datepicker that routinely comes from a translation file, and a
   * translation file is as trustworthy as whatever wrote it.
   */
  static _escape(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static _isDate(obj) {
    return /Date/.test(Object.prototype.toString.call(obj)) && !isNaN(obj.getTime());
  }

  /**
   * A value read without a custom parser: in the picker's own string format
   * with its names, or else as an ISO date or by the browser.
   */
  private _readDefault(value: string, el: HTMLInputElement): Date {
    const { format, i18n } = this.options;
    // A native date input's value is ISO, whatever the display format.
    const read = typeof format === 'string' && el.type !== 'date' ? readDate(value, format, i18n) : null;
    return read ?? Datepicker._parseDate(value);
  }

  private static _parseDate(value: string): Date {
    value = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(Date.parse(value));
    // An ISO time without an offset is local. Reject days that roll into the next month.
    const date = new Date(value + 'T00:00:00');
    return date.getDate() === Number(value.slice(-2)) ? date : new Date(NaN);
  }

  private _parseInput(value: string, el: HTMLInputElement = this.el as HTMLInputElement): Date {
    if (!value.trim() || !this.options.parse) return this._readDefault(value, el);
    return this.options.parse(
      value,
      typeof this.options.format === 'string' ? this.options.format : ''
    );
  }

  /**
   * @deprecated as this function has no effect without any return statement or global parameter setter.
   */
  static _setToStartOfDay(date) {
    if (Datepicker._isDate(date)) date.setHours(0, 0, 0, 0);
  }

  static _compareDates(a, b) {
    // weak date comparison (use setToStartOfDay(date) to ensure correct result)
    return a.getTime() === b.getTime();
  }

  static key = 'Expressive_Datepicker';

  destroy() {
    this._removeEventHandlers();
    this.dateEls?.slice(1).forEach(input => this._removeDateInput(input));
    if (!this.options.dateRangeEndEl && this.endDateEl) this._removeDateInput(this.endDateEl);
    this.displayPlugin?.destroy();
    this.containerEl.remove();
    this.destroySelects();
    this._removeDateOverlay();
    super.destroy();
  }

  // CSS paints data-date over a native date input's own text.
  private _removeDateOverlay() {
    this.el.classList.remove('datepicker-date-input');
    for (const input of [this.el, this.endDateEl]) if (input?.type === 'date') input.removeAttribute('data-date');
  }

  destroySelects() {
    this._formSelect('.orig-select-year')?.destroy();
    this._formSelect('.orig-select-month')?.destroy();
  }

  _insertHTMLIntoDOM() {
    // HTML5 input date field support
    if (this.el.type == 'date') {
      this.el.classList.add('datepicker-date-input');
    }

    // `!x === null` is always false, so this never ran; _renderDateInputFormat
    // now no-ops on its own when there is no hint element to fill in.
    this._renderDateInputFormat(this.el);

    if (this.options.isDateRange) {
      this.containerEl.classList.add('daterange');
      if (!this.options.dateRangeEndEl) {
        this.endDateEl = this.createDateInput();
        this.endDateEl.classList.add('datepicker-end-date');
      } else {
        // querySelector returns null, never undefined: the old check compared
        // against undefined, so a miss skipped the warning and fell through to
        // dereferencing null.
        this.endDateEl = document.querySelector(this.options.dateRangeEndEl);
        if (!this.endDateEl) {
          console.warn('Specified date range end input element in dateRangeEndEl not found');
        } else {
          this._renderDateInputFormat(this.endDateEl);
        }
      }
    }

    pickerFooter(this.footer, this.options, 'datepicker-clear', this._handleClearClick, this._confirm, this._cancel);

    if (this.options.container) {
      const optEl = this.options.container;
      this.options.container =
        optEl instanceof HTMLElement ? optEl : (document.querySelector(optEl) as HTMLElement);
      this.options.container.append(this.containerEl);
    } else {
      const appendTo = !this.endDateEl ? this.el : this.endDateEl;
      if (!this.options.openByDefault) (this.containerEl as HTMLElement).setAttribute('style', 'display: none; visibility: hidden;');
      appendTo.parentElement.after(this.containerEl);
    }
  }

  /**
   * Renders the date input format into the optional `.datepicker-format` hint
   * next to the input, if the consumer provided one.
   */
  _renderDateInputFormat(el: HTMLInputElement) {
    const formatEl = el.parentElement?.querySelector('.datepicker-format');
    if (!formatEl) return;
    // textContent, and nothing at all for a function format: this used to be
    // `innerHTML = format.toString()`, which rendered a format string as
    // markup and dumped a function's entire source into the page.
    formatEl.textContent =
      typeof this.options.format === 'function' ? '' : String(this.options.format);
  }

  /**
   * Gets a string representation of the given date.
   */
  toString(date: Date = this.date, format: string | ((d: Date) => string) = null): string {
    format = format || this.options.format;
    if (typeof format === 'function') return format(date);
    if (!Datepicker._isDate(date)) return '';
    // String Format
    return this.formatDate(date, format);
  }

  /**
   * Returns the formatted date.
   */
  formatDate(date: Date, format: string) {
    const formatArray = format.split(/(d{1,4}|m{1,4}|y{4}|yy|!.)/g);
    return formatArray
      .map((label) => (FORMATS[label] ? FORMATS[label](date, this.options.i18n) : label))
      .join('');
  }

  /**
   * Sets date from input field.
   */
  setDateFromInput(el: HTMLInputElement) {
    // The native input's overlay follows edits, including cleared or partial values.
    this._syncDataDate(el);
    if ((this.options.isDateRange || !this.options.isMultipleSelection) && !el.value.trim()) {
      this.setSingleDate(null, el === this.endDateEl);
      this.draw();
      return;
    }
    const parsedDate = this._dateInInput(el);
    if (!Datepicker._isDate(parsedDate)) return;
    const date = new Date(parsedDate.getTime());
    Datepicker._setToStartOfDay(date);
    const isEndDate = el === this.endDateEl;
    // A day the calendar would not let anyone pick, or a range end before its
    // start, puts the input back to the date already chosen. The typed text
    // is what the form submits, so it cannot be left behind a clamped date.
    const outOfOrder = this.options.isDateRange && (isEndDate
      ? this.date && date < this.date
      : this.endDate && date > this.endDate);
    if (outOfOrder || this._isDisabledDay(date)) {
      this.setInputValue(el, this._selectedDateFor(el));
      return;
    }
    this._selectTypedMultiDate(el, date);
    this.setDate(date, false, isEndDate, true);
  }

  // setDate does not toggle a typed date into a multiple selection, so it goes
  // in here, in place of the date its input showed. Re-reading an input on
  // click leaves the selection as it was.
  private _selectTypedMultiDate(el: HTMLInputElement, date: Date) {
    if (!this.options.isMultipleSelection) return;
    const shown = this._selectedDateFor(el);
    this.dates = this.dates.filter((day) => day !== shown && day.getTime() !== date.getTime());
    this.setMultiDate(date);
  }

  /**
   * Set a date on the datepicker.
   * @param date Date to set on the datepicker.
   * @param preventOnSelect Undocumented as of 5 March 2018.
   * @param isEndDate
   * @param fromUserInput
   */
  setDate(
    date: Date = null,
    preventOnSelect: boolean = false,
    isEndDate: boolean = false,
    fromUserInput: boolean = false
  ) {
    const selectedDate = this.validateDate(date);
    if (!selectedDate) {
      return;
    }
    Datepicker._setToStartOfDay(selectedDate);
    // Silent updates count too: they replace whatever an outer call reports.
    const selection = ++this._selection;
    if (!this.options.isMultipleSelection) this.setSingleDate(selectedDate, isEndDate);
    else if (!fromUserInput) this.setMultiDate(selectedDate);
    this.gotoDate(selectedDate);
    if (preventOnSelect) return;
    this._notify('select', this.options.onSelect, { args: [selectedDate], detail: { date: selectedDate }, current: () => selection === this._selection });
  }

  validateDate(date: Date) {
    if (!date) {
      this._renderDateDisplay(date);
      return this.draw();
    }
    if (typeof date === 'string') {
      date = Datepicker._parseDate(date);
    }
    if (!Datepicker._isDate(date)) {
      return;
    }
    const min = this.options.minDate,
      max = this.options.maxDate;
    if (Datepicker._isDate(min) && date < min) {
      date = min;
    } else if (Datepicker._isDate(max) && date > max) {
      date = max;
    }
    return new Date(date.getTime());
  }

  /**
   * The date an input holds. Without a custom parser, Date.parse reads
   * "05/10/2026" from a dd/mm/yyyy format as 10 May, so reuse the date behind
   * a value the picker wrote, or behind the value the input resets to.
   */
  _dateInInput(el: HTMLInputElement): Date | null {
    const known = !this.options.parse && [this._writtenInputs.get(el), this._resetDates.get(el)]
      .find((entry) => entry?.value === el.value);
    return known ? known.date : this._parseInput(el.value, el);
  }

  /** The selected date an input shows: its place in `dates` for a multiple selection. */
  _selectedDateFor(el: HTMLInputElement): Date | null {
    if (this.options.isMultipleSelection) return this.dates[this.dateEls.indexOf(el)] ?? null;
    return el === this.endDateEl ? this.endDate : this.date;
  }

  /** `_isDisabledDay` for a date that may carry a time of day. */
  _isSelectableDay(date: Date): boolean {
    const day = new Date(date.getTime());
    Datepicker._setToStartOfDay(day);
    return !this._isDisabledDay(day);
  }

  /** Whether the calendar shows `day` as disabled: outside the bounds, or refused by an option. */
  _isDisabledDay(day: Date): boolean {
    return this._isOutOfBounds(day) || this._isRefusedDay(day);
  }

  _isOutOfBounds(day: Date): boolean {
    const { minDate, maxDate } = this.options;
    return (minDate && day < minDate) || (maxDate && day > maxDate);
  }

  _isRefusedDay(day: Date): boolean {
    const { disableWeekends, disableDayFn } = this.options;
    return (disableWeekends && [0, 6].includes(day.getDay())) || !!disableDayFn?.(day);
  }

  /**
   * Set a single date on the datepicker.
   * @param date Date to set on the datepicker.
   * @param isEndDate
   */
  setSingleDate(date: Date, isEndDate: boolean) {
    if (!isEndDate) {
      this.date = date;
    } else {
      this.endDate = date;
    }
  }

  /**
   * Set a multi date on the datepicker.
   * @param date Date to set on the datepicker.
   */
  setMultiDate(date: Date) {
    const index = this.dates.findIndex((item) => item.getTime() === date.getTime());
    if (index === -1) {
      this.dates.push(date);
    } else {
      this.dates.splice(index, 1);
    }
    this.dates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
  }

  /**
   * Sets the data-date attribute on the date input field
   */
  setDataDate(el, date) {
    el.setAttribute('data-date', Datepicker._isDate(date) ? this.toString(date) : '');
  }

  /**
   * Sets dates on the input values.
   */
  setInputValues() {
    if (!this.options?.isMultipleSelection) {
      this.setInputValue(this.el, this.date);
      if (this.options?.isDateRange) {
        this.setInputValue(this.endDateEl, this.endDate);
      }
      return;
    }
    this.setMultipleSelectionInputValues();
  }

  setMultipleSelectionInputValues() {
    const count = Math.max(1, this.dates.length);
    for (const input of this.dateEls.splice(count)) this._removeDateInput(input);
    while (this.dateEls.length < count) this.dateEls.push(this.createDateInput());
    this.dateEls.forEach((input, index) => this.setInputValue(input, this.dates[index] ?? null));
  }

  /**
   * Sets given date as the input value on the given element.
   */
  setInputValue(el, date) {
    if (!el) return;
    if (el.type == 'date') this.setDataDate(el, date);
    if (!Datepicker._isDate(date)) {
      el.value = '';
    } else if (el.type == 'date') {
      el.value = this.formatDate(date, 'yyyy-mm-dd');
    } else {
      el.value = this.toString(date);
    }
    this._writtenInputs.set(el, { value: el.value, date: Datepicker._isDate(date) ? new Date(date.getTime()) : null });
    el.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { firedBy: this }
      })
    );
  }

  /**
   * Renders the date in the modal head section.
   */
  _renderDateDisplay(date: Date, endDate: Date = null) {
    const displayDate = Datepicker._isDate(date) ? date : new Date();
    // @todo should we include an option for date formatting by component options?
    // textContent: formatDate splices i18n month and weekday names in.
    if (!this.options.isDateRange) {
      this.dateTextEl.textContent = this.formatDate(displayDate, 'ddd, mmm d');
    } else {
      const displayEndDate = Datepicker._isDate(endDate) ? endDate : new Date();
      this.dateTextEl.textContent = `${this.formatDate(displayDate, 'mmm d')} - ${this.formatDate(displayEndDate, 'mmm d')}`;
    }
  }

  /**
   * Change date view to a specific date on the datepicker.
   * @param date Date to show on the datepicker.
   */
  gotoDate(date: Date) {
    let newCalendar = true;
    if (!Datepicker._isDate(date)) {
      return;
    }
    if (this.calendars) {
      const firstVisibleDate = new Date(this.calendars[0].year, this.calendars[0].month, 1),
        lastVisibleDate = new Date(
          this.calendars[this.calendars.length - 1].year,
          this.calendars[this.calendars.length - 1].month,
          1
        ),
        visibleDate = date.getTime();
      // get the end of the month
      lastVisibleDate.setMonth(lastVisibleDate.getMonth() + 1);
      lastVisibleDate.setDate(lastVisibleDate.getDate() - 1);
      newCalendar =
        visibleDate < firstVisibleDate.getTime() || lastVisibleDate.getTime() < visibleDate;
    }
    if (newCalendar) {
      this.calendars = [
        {
          month: date.getMonth(),
          year: date.getFullYear()
        }
      ];
    }
    this.adjustCalendars();
  }

  adjustCalendars() {
    this.calendars[0] = this.adjustCalendar(this.calendars[0]);
    this.draw();
  }

  adjustCalendar(calendar) {
    if (calendar.month < 0) {
      calendar.year -= Math.ceil(Math.abs(calendar.month) / 12);
      calendar.month += 12;
    }
    if (calendar.month > 11) {
      calendar.year += Math.floor(Math.abs(calendar.month) / 12);
      calendar.month -= 12;
    }
    return calendar;
  }

  nextMonth() {
    this.calendars[0].month++;
    this.adjustCalendars();
  }

  prevMonth() {
    this.calendars[0].month--;
    this.adjustCalendars();
  }

  render(year, month, randId) {
    const now = new Date(),
      // Day 0 of the next month is the last of this one.
      days = new Date(year, month + 1, 0).getDate(),
      data = [];
    let before = new Date(year, month, 1).getDay(),
      row = [];
    Datepicker._setToStartOfDay(now);
    if (this.options.firstDay > 0) {
      before -= this.options.firstDay;
      if (before < 0) {
        before += 7;
      }
    }
    const previousMonth = month === 0 ? 11 : month - 1,
      nextMonth = month === 11 ? 0 : month + 1,
      yearOfPreviousMonth = month === 0 ? year - 1 : year,
      yearOfNextMonth = month === 11 ? year + 1 : year,
      daysInPreviousMonth = new Date(year, month, 0).getDate();
    const cells = Math.ceil((days + before) / 7) * 7;
    for (let i = 0, r = 0; i < cells; i++) {
      const day = new Date(year, month, 1 + (i - before)),
        isToday = Datepicker._compareDates(day, now),
        hasEvent = this.options.events.indexOf(day.toDateString()) !== -1,
        isEmpty = i < before || i >= days + before,
        isDisabled = this._isDisabledDay(day),
        isDateRangeStart = this.options.isDateRange && this.date && this.endDate && Datepicker._compareDates(this.date, day),
        isDateRangeEnd = this.options.isDateRange && this.endDate && Datepicker._compareDates(this.endDate, day),
        isDateRange =
          this.options.isDateRange &&
          [this.date, this.endDate].every(Datepicker._isDate) &&
          day > this.date &&
          day < this.endDate;
      let dayNumber = 1 + (i - before),
        monthNumber = month,
        yearNumber = year;

      let isSelected = false;
      if (Datepicker._isDate(this.date)) {
        isSelected = Datepicker._compareDates(day, this.date);
      }

      if (!isSelected && Datepicker._isDate(this.endDate)) {
        isSelected = Datepicker._compareDates(day, this.endDate);
      }

      if (
        this.options.isMultipleSelection &&
        this.dates?.some((item) => item.getTime() === day.getTime())
      ) {
        isSelected = true;
      }

      if (isEmpty) {
        if (i < before) {
          dayNumber = daysInPreviousMonth + dayNumber;
          monthNumber = previousMonth;
          yearNumber = yearOfPreviousMonth;
        } else {
          dayNumber = dayNumber - days;
          monthNumber = nextMonth;
          yearNumber = yearOfNextMonth;
        }
      }

      const dayConfig = {
        day: dayNumber,
        month: monthNumber,
        year: yearNumber,
        hasEvent: hasEvent,
        isSelected: isSelected,
        isToday: isToday,
        isDisabled: isDisabled,
        isEmpty: isEmpty,
        showDaysInNextAndPreviousMonths: this.options.showDaysInNextAndPreviousMonths,
        isDateRangeStart: isDateRangeStart,
        isDateRangeEnd: isDateRangeEnd,
        isDateRange: isDateRange
      };

      row.push(this.renderDay(dayConfig));

      if (++r === 7) {
        data.push(this.renderRow(row, this.options.isRTL, false));
        row = [];
        r = 0;
      }
    }
    return this.renderTable(this.options, data, randId);
  }

  renderDay(opts) {
    const classMap = {
        isDisabled: 'is-disabled',
        isToday: 'is-today',
        isSelected: 'is-selected',
        hasEvent: 'has-event',
        isDateRangeStart: 'is-daterange-start',
        isDateRangeEnd: 'is-daterange-end',
        isDateRange: 'is-daterange'
      },
      ariaSelected = opts.isSelected === true || opts.isDateRange === true,
      arr = ['datepicker-day'];

    if (opts.isEmpty) {
      if (opts.showDaysInNextAndPreviousMonths) {
        arr.push('is-outside-current-month');
        arr.push('is-selection-disabled');
      } else {
        return '<td class="is-empty"></td>';
      }
    }

    for (const [property, className] of Object.entries(classMap)) {
      if (opts.hasOwnProperty(property) && opts[property]) {
        arr.push(className);
      }
    }

    const day = Datepicker._escape(opts.day);
    const month = Datepicker._escape(opts.month);
    const year = Datepicker._escape(opts.year);
    return (
      `<td data-day="${day}" class="${arr.join(' ')}" aria-selected="${ariaSelected}">` +
      `<button class="datepicker-day-button" type="button" data-year="${year}" data-month="${month}" data-day="${day}">${day}</button>` +
      '</td>'
    );
  }

  /** Assemble calendar cells; reject unsupported elements and attributes. */
  renderRow(days, isRTL, isRowSelected) {
    const row =
      '<tr class="datepicker-row' +
      (isRowSelected ? ' is-selected' : '') +
      '">' +
      Datepicker._calendarMarkup((isRTL ? days.reverse() : days).join(''), 'tr') +
      '</tr>';
    return row;
  }

  /** Assemble calendar rows; reject unsupported elements and attributes. */
  renderTable(opts, data, randId) {
    return (
      '<div class="datepicker-table-wrapper"><table cellpadding="0" cellspacing="0" class="datepicker-table" role="grid" aria-labelledby="' +
      Datepicker._escape(randId) +
      '">' +
      this.renderHead(opts) +
      this.renderBody(data) +
      '</table></div>'
    );
  }

  renderHead(opts) {
    const arr = [];
    let i;
    for (i = 0; i < 7; i++) {
      const full = Datepicker._escape(this.renderDayName(opts, i));
      const abbrev = Datepicker._escape(this.renderDayName(opts, i, true));
      arr.push(`<th scope="col"><abbr title="${full}">${abbrev}</abbr></th>`);
    }
    return '<thead><tr>' + (opts.isRTL ? arr.reverse() : arr).join('') + '</tr></thead>';
  }

  /** Wrap calendar rows after validating and encoding their contents. */
  renderBody(rows) {
    const html = rows.join('');
    // Always sanitize row markup before insertion to avoid propagating unsafe library input.
    const safeHtml = Datepicker._calendarMarkup(html, 'tbody');
    return '<tbody>' + safeHtml + '</tbody>';
  }

  private static _calendarMarkup(html: string, parent: string): string {
    const template = document.createElement('template');
    // Template contents stay inert. Only rebuilt, encoded markup leaves here.
    template.innerHTML = html;
    const childOf: Record<string, 'tr' | 'td' | 'button'> = { tbody: 'tr', tr: 'td', td: 'button' };
    const attributes = {
      tr: ['class'],
      td: ['class', 'data-day', 'aria-selected'],
      button: ['class', 'type', 'data-year', 'data-month', 'data-day', 'aria-label', 'disabled', 'tabindex']
    };
    const render = (node: Node, container: string): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (container === 'tbody' || container === 'tr') {
          if (node.textContent.trim()) throw new TypeError('Unsupported calendar row content');
        }
        return Datepicker._escape(node.textContent);
      }
      if (!(node instanceof HTMLElement)) throw new TypeError('Unsupported calendar row content');
      const tag = childOf[container];
      if (!tag || node.localName !== tag) {
        throw new TypeError('Unsupported calendar row element');
      }
      if ([...node.attributes].some(attr => !attributes[tag].includes(attr.name))) {
        throw new TypeError('Unsupported calendar row attribute');
      }
      if (tag === 'button' && node.getAttribute('type') !== 'button') {
        throw new TypeError('Calendar day buttons require type="button"');
      }
      const attrs = attributes[tag].filter(name => node.hasAttribute(name))
        .map(name => ` ${name}="${Datepicker._escape(node.getAttribute(name))}"`).join('');
      return `<${tag}${attrs}>${[...node.childNodes].map(child => render(child, tag)).join('')}</${tag}>`;
    };
    return [...template.content.childNodes].map(node => render(node, parent)).join('');
  }

  /**
   * Whether each month arrow is usable at this position in the allowed range.
   *
   * Depends on the month, which is deliberately *not* part of the controls
   * cache key - so the reuse path has to recompute and reapply it.
   */
  private _arrowState(year: number, month: number) {
    const opts = this.options;
    const isMinYear = year === opts.minYear;
    const isMaxYear = year === opts.maxYear;
    return {
      prev: !(isMinYear && (month === 0 || opts.minMonth >= month)),
      next: !(isMaxYear && (month === 11 || opts.maxMonth <= month))
    };
  }

  /**
   * Identifies the *shape* of the controls - everything that changes which
   * options the month and year selects contain, as opposed to which one is
   * picked. While this is stable the two FormSelects can be left alone.
   *
   * `year` is in the key because a numeric `yearRange` centres the year list
   * on the displayed year, so paging across a year boundary does change it.
   */
  private _controlsCacheKey(year: number): string {
    const o = this.options;
    return [
      year,
      o.minYear,
      o.maxYear,
      o.minMonth,
      o.maxMonth,
      Array.isArray(o.yearRange) ? o.yearRange.join('-') : o.yearRange,
      o.yearRangeReverse,
      o.showMonthAfterYear
    ].join('|');
  }

  renderTitle(instance, c, year, month, refYear, randId) {
    const opts = this.options,
      isMinYear = year === opts.minYear,
      isMaxYear = year === opts.maxYear;
    let i,
      j,
      arr = [],
      html =
        '<div id="' +
        Datepicker._escape(randId) +
        '" class="datepicker-controls" role="heading" aria-live="assertive">';

    // Decided up front. These used to be computed *below* the month-prev
    // button that reads `prev`, so the previous arrow was never disabled at
    // the start of the allowed range.
    const { prev, next } = this._arrowState(year, month);

    for (i = 0; i < 12; i++) {
      arr.push(
        '<option value="' +
          (year === refYear ? i - c : 12 + i - c) +
          '"' +
          (i === month ? ' selected="selected"' : '') +
          ((isMinYear && i < opts.minMonth) || (isMaxYear && i > opts.maxMonth)
            ? 'disabled="disabled"'
            : '') +
          '>' +
          Datepicker._escape(opts.i18n.months[i]) +
          '</option>'
      );
    }

    const monthHtml =
      '<select class="datepicker-select orig-select-month" tabindex="-1">' +
      arr.join('') +
      '</select>';

    if (Array.isArray(opts.yearRange)) {
      i = opts.yearRange[0];
      j = opts.yearRange[1] + 1;
    } else {
      i = year - opts.yearRange;
      j = 1 + year + opts.yearRange;
    }

    for (arr = []; i < j && i <= opts.maxYear; i++) {
      if (i >= opts.minYear) {
        arr.push(`<option value="${i}" ${i === year ? 'selected="selected"' : ''}>${i}</option>`);
      }
    }
    if (opts.yearRangeReverse) arr.reverse();

    const yearHtml = `<select class="datepicker-select orig-select-year" tabindex="-1">${arr.join('')}</select>`;

    const leftArrow =
      '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z"/><path d="M0-.5h24v24H0z" fill="none"/></svg>';
    html += `<button class="month-prev${prev ? '' : ' is-disabled'}" type="button" aria-label="${Datepicker._escape(opts.i18n.previousMonth)}">${leftArrow}</button>`;

    html += '<div class="selects-container">';
    if (opts.showMonthAfterYear) {
      html += yearHtml + monthHtml;
    } else {
      html += monthHtml + yearHtml;
    }
    html += '</div>';

    const rightArrow =
      '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"/><path d="M0-.25h24v24H0z" fill="none"/></svg>';
    html += `<button class="month-next${next ? '' : ' is-disabled'}" type="button" aria-label="${Datepicker._escape(opts.i18n.nextMonth)}">${rightArrow}</button>`;

    return (html += '</div>');
  }

  /**
   * Run `fn`, collapsing every draw it triggers into a single one at the end.
   *
   * A single input click reaches draw() three times - once through
   * setDateFromInput -> setDate -> gotoDate, once directly, and once through
   * the trailing gotoDate - and each one destroys two FormSelect instances,
   * reparses the calendar and builds two fresh FormSelects. The three calls
   * cannot simply be deleted: the direct draw() is what covers an empty input
   * (setDate bails before drawing when the value does not parse), and the
   * trailing gotoDate re-centres on a date validateDate may have clamped to
   * minDate/maxDate. So they are collected instead of removed.
   *
   * Deliberately synchronous: the constructor and callers read calendarEl
   * immediately after init(), which a microtask-deferred draw would leave
   * empty.
   */
  private _batchDraws(fn: () => void) {
    this._drawDepth++;
    try {
      fn();
    } finally {
      this._drawDepth--;
      if (this._drawDepth === 0 && this._drawDirty) {
        this._drawDirty = false;
        this.draw();
      }
    }
  }

  // refresh HTML
  draw() {
    // Inside a batch, note that a draw is due and let the batch do it once.
    if (this._drawDepth > 0) {
      this._drawDirty = true;
      return;
    }
    const active = (this.calendarEl.getRootNode() as Document | ShadowRoot).activeElement;
    const restoreDayFocus = active?.matches('.datepicker-day-button') && this.calendarEl.contains(active);
    const restoreArrow = this.calendarEl.contains(active) && active?.matches('.month-prev, .month-next')
      ? active.classList.contains('month-prev') ? '.month-prev' : '.month-next' : null;
    const restoreSelect = this._selectFocusRestorer(active);
    const year = this.calendars[0].year;
    const month = this.calendars[0].month;

    this._renderDateDisplay(this.date, this.endDate);

    // Only the day grid changes when you page within a year. Rebuilding the
    // controls as well meant tearing down and reconstructing two FormSelects -
    // each with its own <ul> of 12 or 21+ options, an input, a caret and a
    // Menu - on every single draw.
    const key = this._controlsCacheKey(year);
    if (key === this._controlsKey && this.calendarEl.querySelector('.datepicker-controls')) {
      this._reuseControls(year, month);
    } else {
      this._controlsKey = key;
      // Held across table re-renders: the table's aria-labelledby points at
      // the controls element's id.
      this._randId = 'datepicker-title-' + Utils.guid();
      this._rebuildControls(year, month);
    }
    this._renderCalendarTable(year, month);
    this._syncCalendarFocus(!!restoreDayFocus);
    if (restoreArrow) this.calendarEl.querySelector<HTMLButtonElement>(restoreArrow)?.focus();
    restoreSelect();

    if (typeof this.options.onDraw === 'function') {
      this.options.onDraw.call(this);
    }
  }

  private _formSelect(selector: string): FormSelect | undefined {
    const el = this.calendarEl.querySelector<HTMLElement>(selector);
    return el ? FormSelect.getInstance(el) : undefined;
  }

  /**
   * Picking a year rebuilds both selects under the focus, which is on the old
   * input or in its menu. The returned callback, run after the redraw, gives
   * focus to the matching new input if the old one went with the rebuild.
   */
  private _selectFocusRestorer(active: Element | null) {
    const holdsFocus = (select?: FormSelect) =>
      !!select && (select.input === active || !!select.menuEl?.contains(active));
    const selector = ['.orig-select-year', '.orig-select-month'].find((s) => holdsFocus(this._formSelect(s)));
    return () => {
      if (selector && !active.isConnected) this._formSelect(selector)?.input.focus();
    };
  }

  /** Tear down the two FormSelects and render the controls from scratch. */
  private _rebuildControls(year: number, month: number) {
    this.destroySelects();
    this.calendarEl.innerHTML = this.renderTitle(this, 0, year, month, year, this._randId);

    const yearSelect = this.calendarEl.querySelector('.orig-select-year') as HTMLSelectElement;
    const monthSelect = this.calendarEl.querySelector('.orig-select-month') as HTMLSelectElement;
    // @todo fix accessibility
    FormSelect.init(yearSelect, {
      classes: 'select-year',
      menuOptions: { container: Utils.portalRoot(this.el), constrainWidth: false }
    });
    FormSelect.init(monthSelect, {
      classes: 'select-month',
      menuOptions: { container: Utils.portalRoot(this.el), constrainWidth: false }
    });

    // Add change handlers for select
    yearSelect.addEventListener('change', this._handleYearChange);
    monthSelect.addEventListener('change', this._handleMonthChange);
  }

  /**
   * Keep the existing controls and bring them up to date: the selected month,
   * and the arrow states, which depend on the month rather than on the key.
   */
  private _reuseControls(year: number, month: number) {
    const monthSelect = this.calendarEl.querySelector('.orig-select-month') as HTMLSelectElement;
    if (monthSelect && monthSelect.value !== month.toString()) {
      monthSelect.value = month.toString();
      // Assigning .value fires no change event, so the wrapper needs telling.
      FormSelect.getInstance(monthSelect)?.refresh();
    }

    const { prev, next } = this._arrowState(year, month);
    this.calendarEl.querySelector('.month-prev')?.classList.toggle('is-disabled', !prev);
    this.calendarEl.querySelector('.month-next')?.classList.toggle('is-disabled', !next);
  }

  /** Replace just the day grid, leaving the controls in place. */
  private _renderCalendarTable(year: number, month: number) {
    const html = this.render(year, month, this._randId);
    const existing = this.calendarEl.querySelector('.datepicker-table-wrapper');
    if (existing) existing.outerHTML = html;
    else this.calendarEl.insertAdjacentHTML('beforeend', html);
  }

  _setupEventHandlers() {
    this._addInputEventHandlers(this.el);
    if (this.endDateEl) this._addInputEventHandlers(this.endDateEl);
    this._form = this.el.form;
    this._form?.addEventListener('reset', this._handleFormReset);
    this.calendarEl.addEventListener('click', this._handleCalendarClick);
    this.calendarEl.addEventListener('keydown', this._handleCalendarKeydown);
    this.calendarEl.addEventListener('focusin', this._handleCalendarFocus);
  }

  _setupVariables() {
    const template = document.createElement('template');
    template.innerHTML = Datepicker._template.trim();

    this.containerEl = <HTMLElement>template.content.firstChild;

    this.calendarEl = this.containerEl.querySelector('.datepicker-calendar');
    this.dateTextEl = this.containerEl.querySelector('.date-text');
    this.footer = this.containerEl.querySelector('.datepicker-footer');
  }

  _removeEventHandlers() {
    this._form?.removeEventListener('reset', this._handleFormReset);
    clearTimeout(this._resetTimer);
    for (const input of this.dateEls ?? [this.el]) this._removeInputEventHandlers(input);
    this.calendarEl.removeEventListener('click', this._handleCalendarClick);
    this.calendarEl.removeEventListener('keydown', this._handleCalendarKeydown);
    this.calendarEl.removeEventListener('focusin', this._handleCalendarFocus);
    if (this.options.isDateRange && this.endDateEl) {
      this._removeInputEventHandlers(this.endDateEl);
    }
  }

  private _addInputEventHandlers(input: HTMLInputElement) {
    input.addEventListener('click', this._handleInputClick);
    input.addEventListener('keydown', this._handleInputKeydown);
    input.addEventListener('change', this._handleInputChange);
  }

  private _removeInputEventHandlers(input: HTMLInputElement) {
    input.removeEventListener('click', this._handleInputClick);
    input.removeEventListener('keydown', this._handleInputKeydown);
    input.removeEventListener('change', this._handleInputChange);
  }

  private _removeDateInput(input: HTMLInputElement) {
    const focused = (input.getRootNode() as Document | ShadowRoot).activeElement === input;
    this._removeInputEventHandlers(input);
    input.remove();
    if (focused && document.activeElement === document.body) this.el.focus();
  }

  _handleInputClick = (e) => {
    // Block the native date picker only when the calendar is shown to replace it.
    if (e.target.type == 'date' && (this.options.openByDefault || this.options.container)) e.preventDefault();
    this._batchDraws(() => {
      this.setDateFromInput(e.target as HTMLInputElement);
      this.draw();
      this.gotoDate(<HTMLElement>e.target === this.el ? this.date : this.endDate);
    });
    this._showDisplay();
    if (this.options.onInputInteraction) this.options.onInputInteraction.call(this);
  };

  /** Shows a docked or modal calendar. A modal takes focus from the input, so the selected day gets it. */
  private _showDisplay() {
    this.displayPlugin?.show();
    if (this.displayPlugin instanceof ModalDisplayPlugin) this._syncCalendarFocus(true);
  }

  _handleInputKeydown = Utils.ignoringComposition((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._batchDraws(() => {
        this.setDateFromInput(e.target as HTMLInputElement);
        this._focusedDate = e.target === this.endDateEl ? this.endDate : this.date;
        this.draw();
      });
      if (this.displayPlugin) this.displayPlugin.show();
      this._syncCalendarFocus(true);
      if (this.options.onInputInteraction) this.options.onInputInteraction.call(this);
    }
  });

  private _dayDate(button: HTMLElement) {
    const date = new Date(0);
    date.setFullYear(Number(button.dataset.year), Number(button.dataset.month), Number(button.dataset.day));
    Datepicker._setToStartOfDay(date);
    return date;
  }

  private _syncCalendarFocus(restore = false) {
    const buttons = [...this.calendarEl.querySelectorAll<HTMLButtonElement>('.datepicker-day-button')];
    const current = buttons.filter(button => !button.parentElement.classList.contains('is-selection-disabled'));
    // Today at midnight: day buttons compare by exact time.
    const preferred = this._focusedDate || this.date || new Date(new Date().setHours(0, 0, 0, 0));
    const target = current.find(button => Datepicker._compareDates(this._dayDate(button), preferred))
      || current.find(button => button.parentElement.classList.contains('is-selected'))
      || current.find(button => !button.parentElement.classList.contains('is-disabled')) || current[0];
    for (const button of buttons) {
      button.tabIndex = button === target ? 0 : -1;
      button.setAttribute('aria-disabled', String(button.parentElement.matches('.is-disabled, .is-selection-disabled')));
    }
    if (target) {
      this._focusedDate = this._dayDate(target);
      if (restore) target.focus();
    }
  }

  private _handleCalendarFocus = (event: FocusEvent) => {
    const button = event.target as HTMLElement;
    if (!button.matches('.datepicker-day-button')) return;
    this._focusedDate = this._dayDate(button);
    this._syncCalendarFocus();
  };

  private _handleCalendarKeydown = (event: KeyboardEvent) => {
    const button = event.target as HTMLElement;
    if (!button.matches('.datepicker-day-button') || !Utils.plainKey(event)) return;
    const date = this._dayDate(button);
    const weekday = (date.getDay() - this.options.firstDay + 7) % 7;
    const offsets = { ArrowLeft: this.options.isRTL ? 1 : -1, ArrowRight: this.options.isRTL ? -1 : 1,
      ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    if (Object.hasOwn(offsets, event.key)) date.setDate(date.getDate() + offsets[event.key]);
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const day = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
      const last = new Date(date.getTime());
      last.setMonth(last.getMonth() + 1, 0);
      date.setDate(Math.min(day, last.getDate()));
    } else return;
    event.preventDefault();
    const { minDate, maxDate, minYear, maxYear, minMonth, maxMonth } = this.options;
    if (minDate && date < minDate) date.setTime(minDate.getTime());
    if (maxDate && date > maxDate) date.setTime(maxDate.getTime());
    if (date.getFullYear() < minYear || date.getFullYear() > maxYear
      || (date.getFullYear() === minYear && date.getMonth() < (minMonth ?? 0))
      || (date.getFullYear() === maxYear && date.getMonth() > (maxMonth ?? 11))) return;
    this._focusedDate = date;
    // Moving within the shown month only moves focus; redrawing the grid on
    // every held arrow key rebuilt 42 cells for nothing.
    const { year, month } = this.calendars[0];
    if (date.getFullYear() === year && date.getMonth() === month) this._syncCalendarFocus(true);
    else this.gotoDate(date);
  };

  _handleCalendarClick = (e) => {
    const target = <HTMLElement>e.target;
    if (target.classList.contains('is-disabled')) return;

    this._batchDraws(() => {
      if (
        target.classList.contains('datepicker-day-button') &&
        !target.classList.contains('is-empty') &&
        !target.parentElement.classList.contains('is-disabled') &&
        !target.parentElement.classList.contains('is-selection-disabled')
      ) {
        const selectedDate = new Date(
          e.target.getAttribute('data-year'),
          e.target.getAttribute('data-month'),
          e.target.getAttribute('data-day')
        );

        if (!this.multiple || this.options.isMultipleSelection) {
          this.setDate(selectedDate);
        }

        // Selecting a range end draws a second time on top of setDate's.
        if (this.options.isDateRange) {
          this._handleDateRangeCalendarClick(selectedDate);
        }

        if (this.options.autoSubmit) this._finishSelection();
      } else if (target.closest('.month-prev')) {
        this.prevMonth();
      } else if (target.closest('.month-next')) {
        this.nextMonth();
      }
    });
  };

  _handleDateRangeCalendarClick = (date: Date) => {
    if (this.endDate == null || !Datepicker._compareDates(date, this.endDate)) {
      if (Datepicker._isDate(this.date) && date < this.date) {
        return;
      }

      this.setDate(date, false, Datepicker._isDate(this.date));
      return;
    }

    this._clearDates();
    this.draw();
  };

  _handleClearClick = () => {
    this._clearDates();
    this.setInputValues();
  };

  _clearDates = () => {
    this.date = null;
    this.endDate = null;
    this.dates?.splice(0);
    this.draw();
  };

  _handleMonthChange = (e) => {
    this.gotoMonth(e.target.value);
  };

  _handleYearChange = (e) => {
    this.gotoYear(e.target.value);
  };

  // change view to a specific month (zero-index, e.g. 0: January)
  gotoMonth(month) {
    if (!isNaN(month)) {
      this.calendars[0].month = parseInt(month, 10);
      this.adjustCalendars();
    }
  }

  // change view to a specific full year (e.g. "2012")
  gotoYear(year) {
    if (!isNaN(year)) {
      this.calendars[0].year = parseInt(year, 10);
      this.adjustCalendars();
    }
  }

  // A reset restores the inputs' values after its event, without a change
  // event. Drop the inputs added for extra dates and read the selection back
  // from what the reset left.
  _handleFormReset = (e: Event) => {
    clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => {
      if (e.defaultPrevented) return;
      if (this.options.isMultipleSelection) this._readBackMultiple();
      else this._readBackSingle();
      this.draw();
    });
  };

  private _readBackMultiple() {
    for (const input of this.dateEls.splice(1)) this._removeDateInput(input);
    this.dates = [];
    this._syncDataDate(this.el);
    const date = this._dateInInput(this.el);
    if (Datepicker._isDate(date) && this._isSelectableDay(date)) this.setDate(date, true);
  }

  /** A native date input's overlay text follows its value, including an empty one. */
  private _syncDataDate(el: HTMLInputElement) {
    if (el.type === 'date') this.setDataDate(el, Datepicker._parseDate(el.value));
  }

  private _readBackSingle() {
    this.setSingleDate(null, false);
    this.setSingleDate(null, true);
    for (const input of [this.el, this.endDateEl]) if (input) this.setDateFromInput(input);
  }

  _handleInputChange = (e: Event) => {
    // Prevent change event from being fired when triggered by the plugin
    if (e['detail']?.firedBy === this) return;
    this.setDateFromInput(e.target as HTMLInputElement);
  };

  renderDayName(opts, day, abbr: boolean = false) {
    day += opts.firstDay;
    while (day >= 7) {
      day -= 7;
    }
    return abbr ? opts.i18n.weekdaysAbbrev[day] : opts.i18n.weekdays[day];
  }

  createDateInput() {
    const dateInput = <HTMLInputElement>this.el.cloneNode(true);
    // cloneNode copies the id too, and two elements sharing one id break every
    // lookup that goes through it.
    dateInput.removeAttribute('id');
    dateInput.classList.add('no-autoinit');
    this._addInputEventHandlers(dateInput);
    this.el.parentElement.appendChild(dateInput);
    return dateInput;
  }

  _finishSelection = () => {
    this.setInputValues();
  };

  _confirm = () => {
    this._finishSelection();
    hideModal(this.displayPlugin);
    this._notify('confirm', this.options.onConfirm, { args: [] });
  }

  _cancel = () => {
    hideModal(this.displayPlugin);
    this._notify('cancel', this.options.onCancel, { args: [] });
  };

  static {
    Datepicker._template = `
        <div class="datepicker-container">
          <div class="datepicker-date-display">
            <span class="date-text"></span>
          </div>
          <div class="datepicker-calendar-container">
            <div class="datepicker-calendar"></div>
            <div class="datepicker-footer"></div>
          </div>
        </div>`;
  }
}
