import { Component, BaseOptions } from '../core/component';
import { Utils, afterFormReset, formEventScope } from '../core/utils';

export interface CurrencyInputOptions extends BaseOptions {
  /** `invalid` is the validity message for text that holds no amount. */
  i18n: Partial<{ invalid: string }>;
}

const _defaults: CurrencyInputOptions = Object.freeze({ i18n: Object.freeze({ invalid: 'Enter an amount.' }) });

/** Latin digits in the order `_native` holds them, to map a locale's own digits back. */
const LATIN = '9876543210';

/**
 * Whether the separator at `mark` groups even though the currency could show
 * three digits after it. After a separator of the other kind it is a decimal,
 * as in `1.234,567`. A repeated separator groups, and so does a lone one that
 * is not one of the locale's `decimals`. The earlier separators are read from
 * the first digit, since a symbol such as `د.ب.` may hold marks.
 */
function groupsThree(clean: string, mark: number, decimals: string[]) {
  if (clean.length - mark !== 4) return false;
  const separator = clean[mark];
  const earlier = clean.slice(0, mark).replace(/^\D+|\d/g, '');
  if (earlier.split(separator).join('')) return false;
  return earlier.includes(separator) || !decimals.includes(separator);
}

/**
 * Splits digits and separators into whole and fraction digits. The last `.`
 * or `,` is the decimal mark when no more than `digits` digits follow it and
 * it does not group, so `1.234,5` and `1,234.50` both split at the end. Any
 * other separator groups.
 */
function split(clean: string, digits: number, decimals: string[]): [string, string] {
  const mark = Math.max(clean.lastIndexOf('.'), clean.lastIndexOf(','));
  const fraction = clean.slice(mark + 1);
  return mark >= 0 && fraction.length <= digits && !groupsThree(clean, mark, decimals) ? [clean.slice(0, mark), fraction] : [clean, ''];
}

/**
 * The marks a locale writes decimals with. Some use one for currency and
 * another for plain numbers: fr-CH shows `1.234 KWD` and edits `1,234`.
 */
function decimalMarks(formats: Intl.NumberFormat[]) {
  return formats.flatMap((format) => format.formatToParts(1.5).filter((part) => part.type === 'decimal').map((part) => part.value));
}

/**
 * Reads text in Latin digits as an amount, or null when it holds no digit.
 * Signs, spaces and letters are ignored, and a `-` or `−` before the first
 * digit makes the amount negative. A separator after the last digit is
 * dropped, since it belongs to a symbol such as `kr.`.
 */
function parse(text: string, digits: number, decimals: string[]): number | null {
  const clean = text.replace(/[^\d.,]/g, '').replace(/[.,]+$/, '');
  if (!/\d/.test(clean)) return null;
  const [whole, fraction] = split(clean, digits, decimals);
  const sign = /^\D*[-−]/.test(text) ? -1 : 1;
  return sign * Number(`${whole.replace(/[.,]/g, '')}.${fraction}`);
}

/**
 * Currency input. Shows a text field's amount in the page's locale and the
 * currency its `data-currency` attribute names once the field loses focus,
 * shows the plain number while it has focus, and puts the plain number in the
 * form data.
 */
export class CurrencyInput extends Component<CurrencyInputOptions> {
  declare el: HTMLInputElement;
  static key = 'Expressive_CurrencyInput';
  private _display: Intl.NumberFormat;
  /** Writes an amount for editing: the locale's digits and mark, no grouping or sign. */
  private _edit: Intl.NumberFormat;
  /** Writes an amount as the form submits it: Latin digits, a `.` mark, no grouping. */
  private _plain: Intl.NumberFormat;
  private _digits: number;
  /** The locale's digits for 9876543210. */
  private _native: string;
  /** Rewrites a decimal mark that is neither `.` nor `,`, such as Arabic's, to `.`. */
  private _marks: Record<string, string>;
  /** The locale's decimal marks, after `_marks`. */
  private _decimals: string[];

  constructor(el: HTMLInputElement, options: Partial<CurrencyInputOptions>) {
    super(el, options);
    const locale = Utils.locale(el);
    try {
      this._display = new Intl.NumberFormat(locale, { style: 'currency', currency: el.dataset.currency });
    } catch {
      // A malformed code leaves the field a plain text input.
      return;
    }
    this._digits = this._display.resolvedOptions().maximumFractionDigits;
    this._edit = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: this._digits });
    this._plain = new Intl.NumberFormat('en', { useGrouping: false, maximumFractionDigits: this._digits });
    this._native = new Intl.NumberFormat(locale, { useGrouping: false }).format(9876543210);
    const decimals = decimalMarks([this._display, this._edit]);
    this._marks = Object.fromEntries(decimals.filter((mark) => !'.,'.includes(mark)).map((mark) => [mark, '.']));
    this._decimals = decimals.map((mark) => this._marks[mark] ?? mark);
    const signal = this._events.signal;
    // Capture, so a page's change listener on the field reads the formatted
    // text. Blur covers a visit that changed nothing, which fires no change.
    el.addEventListener('change', this._onChange, { capture: true, signal });
    el.addEventListener('blur', this._format, { signal });
    el.addEventListener('focus', this._onFocus, { signal });
    el.addEventListener('input', this._validate, { signal });
    formEventScope(el).addEventListener('formdata', this._onFormData, { capture: true, signal });
    // The field formats the value a reset restores.
    afterFormReset(el, () => this._start(), signal);
    this._start();
  }

  static get defaults(): CurrencyInputOptions {
    return _defaults;
  }

  /** The amount the field holds, rounded as it shows, or null when it is empty or holds no digit. */
  get value(): number | null {
    return this._round(this._read(this.el.value));
  }

  /** Reads text in the locale's digits, or full-width ones from an IME, as an amount. */
  private _read(text: string) {
    const latin = Array.from(text.normalize('NFKC'), (ch) => this._marks[ch] ?? LATIN[this._native.indexOf(ch)] ?? ch);
    return parse(latin.join(''), this._digits, this._decimals);
  }

  private _round(amount: number | null) {
    return amount === null ? null : Number(this._plain.format(amount));
  }

  /**
   * Formats the starting value without events. It reads as a plain number
   * first, the form the field submits, so a saved `1.234` stays 1.234.
   */
  private _start() {
    const text = this.el.value;
    const number = Number(text);
    this._show(this._round(text.trim() && Number.isFinite(number) ? number : this._read(text)));
  }

  private _format = () => {
    this._show(this.value);
  };

  /**
   * Enter fires change while the field keeps focus. Formatting then would
   * put the next keystroke after the currency sign, so the field waits for
   * blur.
   */
  private _onChange = () => {
    if (!this.el.matches(':focus')) this._format();
  };

  /** Shows `amount` in the locale and currency, leaving text that reads as no amount as it is. */
  private _show(amount: number | null) {
    if (amount !== null) this.el.value = this._display.format(amount);
    this._validate();
  }

  /** Shows the amount as a plain number to edit, with the caret at the end. */
  private _onFocus = () => {
    const amount = this.value;
    if (amount === null) return;
    const text = this._edit.format(amount);
    this.el.value = text;
    this.el.setSelectionRange(text.length, text.length);
  };

  /** Marks text that holds no amount invalid, and clears the mark once it holds one or is empty. */
  private _validate = () => {
    const { el } = this;
    const invalid = el.value.trim() !== '' && this.value === null;
    el.setCustomValidity(invalid ? this.options.i18n.invalid : '');
  };

  /** Puts the plain number in the form data in place of the formatted text. */
  private _onFormData = (e: FormDataEvent) => {
    if (!this._submitsTo(e.target)) return;
    // ponytail: set() collapses fields that share this name into one entry; a
    // per-field swap if a form ever repeats a currency field's name.
    e.formData.set(this.el.name, String(this.value ?? this.el.value));
  };

  /** Whether the field has an entry in `form`'s data. */
  private _submitsTo(form: EventTarget) {
    const { el } = this;
    return form === el.form && el.name !== '' && !el.matches(':disabled');
  }

  /** Stops formatting and clears the validity message, leaving the text as it is. */
  destroy(): void {
    super.destroy();
    this.el.setCustomValidity('');
  }
}
