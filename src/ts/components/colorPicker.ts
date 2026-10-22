import { Component, BaseOptions } from '../core/component';
import { Utils } from '../core/utils';

export interface ColorPickerOptions extends BaseOptions {
  /**
   * Called with the new `#rrggbb` value when a change is committed: the end
   * of a drag, a key press, a hue release or a typed hex value.
   * @default null
   */
  onChange: ((value: string) => void) | null;
}

const _defaults: ColorPickerOptions = {
  onChange: null
};

/** Hue in degrees, saturation and value from 0 to 1. */
interface Hsv { h: number; s: number; v: number }

const clamp = (n: number) => Math.min(1, Math.max(0, n));

// Hue in degrees of an RGB color with channels from 0 to 1.
function hueOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const range = max - Math.min(r, g, b);
  if (!range) return 0;
  const sector = max === r ? (g - b) / range : max === g ? (b - r) / range + 2 : (r - g) / range + 4;
  return (sector * 60 + 360) % 360;
}

function toHsv(hex: string): Hsv | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  return { h: hueOf(r, g, b), s: max ? (max - Math.min(r, g, b)) / max : 0, v: max };
}

function toHex({ h, s, v }: Hsv): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return '#' + [5, 3, 1].map((n) => Math.round(channel(n) * 255).toString(16).padStart(2, '0')).join('');
}

// Area keys as [saturation, brightness] steps of 1%; Shift takes ten of them.
// Home and End overshoot so the clamp lands on the ends of saturation.
const KEY_STEPS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  PageUp: [0, 10],
  PageDown: [0, -10],
  Home: [-100, 0],
  End: [100, 0]
};

/**
 * Color picker. Enhances a `.color-picker` holding an `<input type="color">`
 * with a saturation and brightness area, a hue slider and a hex field. The
 * native input stays the form value and the preview, so the browser's own
 * picker still opens from it, and it fires `input` and `change` as it would
 * if the person had used that picker.
 */
export class ColorPicker extends Component<ColorPickerOptions> {
  /** The native color input that holds the value. */
  input: HTMLInputElement | null;
  private _hsv: Hsv = { h: 0, s: 0, v: 0 };
  private _area: HTMLDivElement | null = null;
  private _thumb: HTMLDivElement | null = null;
  private _hue: HTMLInputElement | null = null;
  private _hex: HTMLInputElement | null = null;
  // Set while the picker writes the native input, so its own events are not
  // read back as an outside change.
  private _writing = false;

  constructor(el: HTMLElement, options: Partial<ColorPickerOptions>) {
    super(el, options);
    this.el['Expressive_ColorPicker'] = this;
    this.input = el.querySelector<HTMLInputElement>(':scope > input[type="color"]');
    if (!this.input) return;
    this._hsv = toHsv(this.input.value) ?? this._hsv;
    this._build();
    this.input.addEventListener('input', this._onNativeInput);
    this._render();
  }

  static get defaults(): ColorPickerOptions {
    return _defaults;
  }

  static getInstance(el: HTMLElement): ColorPicker {
    return el['Expressive_ColorPicker'];
  }

  destroy() {
    this.input?.removeEventListener('input', this._onNativeInput);
    for (const part of [this._area, this._hue, this._hex]) part?.remove();
    this._area = this._thumb = this._hue = this._hex = null;
    this.el.style.removeProperty('--_color-picker-hue');
    this.el['Expressive_ColorPicker'] = undefined;
  }

  /** The current color as `#rrggbb`. Setting it fires no events, as with a native input. */
  get value(): string {
    return this.input?.value ?? '';
  }

  set value(hex: string) {
    const hsv = toHsv(hex);
    if (!hsv || !this.input) return;
    this._hsv = hsv;
    this._writing = true;
    this.input.value = toHex(hsv);
    this._writing = false;
    this._render();
  }

  private _build() {
    const disabled = this.input!.disabled;

    const area = document.createElement('div');
    area.className = 'color-picker-area';
    const thumb = document.createElement('div');
    thumb.className = 'color-picker-thumb';
    thumb.setAttribute('role', 'slider');
    thumb.setAttribute('aria-label', 'Saturation and brightness');
    thumb.setAttribute('aria-valuemin', '0');
    thumb.setAttribute('aria-valuemax', '100');
    thumb.tabIndex = disabled ? -1 : 0;
    if (disabled) thumb.setAttribute('aria-disabled', 'true');
    area.append(thumb);

    const hue = document.createElement('input');
    hue.type = 'range';
    hue.className = 'color-picker-hue';
    hue.min = '0';
    hue.max = '359';
    hue.setAttribute('aria-label', 'Hue');
    hue.disabled = disabled;

    const hex = document.createElement('input');
    hex.type = 'text';
    hex.className = 'color-picker-hex';
    hex.setAttribute('aria-label', 'Hex color');
    hex.autocomplete = 'off';
    hex.spellcheck = false;
    hex.maxLength = 7;
    hex.disabled = disabled;

    // Area and hue before the native input, the hex field after it.
    this.input!.before(area, hue);
    this.input!.after(hex);
    this._area = area;
    this._thumb = thumb;
    this._hue = hue;
    this._hex = hex;

    area.addEventListener('pointerdown', this._onPointerDown);
    thumb.addEventListener('keydown', this._onKeyDown);
    hue.addEventListener('input', () => this._set({ ...this._hsv, h: Number(hue.value) }, false));
    hue.addEventListener('change', () => this._commit());
    hex.addEventListener('change', this._onHex);
    hex.addEventListener('keydown', (e) => {
      // Enter in a text field would submit the form; take it as "apply".
      if (e.key === 'Enter' && !Utils.isComposing(e)) {
        e.preventDefault();
        this._onHex();
      }
    });
  }

  private _render() {
    const { h, s, v } = this._hsv;
    const hex = toHex(this._hsv);
    const thumb = this._thumb!;
    this.el.style.setProperty('--_color-picker-hue', String(Math.round(h)));
    thumb.style.setProperty('--_color-picker-x', String(s));
    thumb.style.setProperty('--_color-picker-y', String(1 - v));
    thumb.style.setProperty('--_color-picker-color', hex);
    thumb.setAttribute('aria-valuenow', String(Math.round(s * 100)));
    thumb.setAttribute('aria-valuetext', `Saturation ${Math.round(s * 100)}%, brightness ${Math.round(v * 100)}%`);
    this._hue!.value = String(Math.round(h));
    // The hex field only commits on change, so rewriting it never fights typing.
    this._hex!.value = hex;
  }

  // Store the color, write it to the native input and fire `input`; with
  // `commit`, also fire `change` and onChange.
  // Only reached from the built controls, which a disabled input disables.
  private _set(hsv: Hsv, commit = true) {
    const input = this.input!;
    this._hsv = hsv;
    const hex = toHex(hsv);
    const changed = input.value !== hex;
    this._writing = true;
    input.value = hex;
    if (changed) input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this._writing = false;
    this._render();
    if (commit) this._commit();
  }

  private _commit() {
    if (!this.input) return;
    this._writing = true;
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    this._writing = false;
    this.options.onChange?.(this.input.value);
  }

  // The person used the browser's own picker on the native input.
  private _onNativeInput = () => {
    if (this._writing || !this.input) return;
    const hsv = toHsv(this.input.value);
    if (!hsv) return;
    this._hsv = hsv;
    this._render();
  };

  private _onHex = () => {
    const hsv = toHsv(this._hex!.value);
    if (hsv && toHex(hsv) !== this.input!.value) this._set(hsv);
    // An invalid entry goes back to the current color.
    this._hex!.value = toHex(this._hsv);
  };

  private _fromPoint(e: PointerEvent, commit: boolean) {
    const box = this._area!.getBoundingClientRect();
    const s = clamp((e.clientX - box.left) / box.width);
    const v = 1 - clamp((e.clientY - box.top) / box.height);
    this._set({ ...this._hsv, s, v }, commit);
  }

  private _onPointerDown = (e: PointerEvent) => {
    if (e.button || this.input!.disabled) return;
    const area = this._area!;
    e.preventDefault();
    this._thumb!.focus();
    area.setPointerCapture(e.pointerId);
    this._fromPoint(e, false);
    const move = (ev: PointerEvent) => this._fromPoint(ev, false);
    const up = (ev: PointerEvent) => {
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerup', up);
      area.removeEventListener('pointercancel', up);
      this._fromPoint(ev, true);
    };
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerup', up);
    area.addEventListener('pointercancel', up);
  };

  // Left and right change saturation, up and down brightness; see KEY_STEPS.
  private _onKeyDown = (e: KeyboardEvent) => {
    const steps = KEY_STEPS[e.key];
    if (!steps || this.input!.disabled) return;
    e.preventDefault();
    const unit = e.shiftKey ? 0.1 : 0.01;
    const { s, v } = this._hsv;
    this._set({ ...this._hsv, s: clamp(s + steps[0] * unit), v: clamp(v + steps[1] * unit) });
  };
}
