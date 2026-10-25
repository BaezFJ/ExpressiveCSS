import { restoreAttribute } from './utils';

/**
 * A form-associated element that wraps a text input and submits for it, so
 * the browser handles the field's values, reset, validity and disabled state.
 * Chips and Cascader each define one under their own tag.
 */
export interface FormControl extends HTMLElement {
  readonly internals: ElementInternals;
  /** Called for a form reset no listener canceled, in the same task. */
  onFormReset: (() => void) | null;
}

/** Whether the browser has form-associated custom elements. jsdom does not. */
export const formAssociated = () => typeof ElementInternals !== 'undefined' && 'setFormValue' in ElementInternals.prototype;

/** Each control's observer of its input's attributes. */
const mirrors = new WeakMap<FormControl, MutationObserver>();

/**
 * Defines `tag` on first use, so importing the bundle needs no DOM, and only
 * once, so a second copy of the bundle on the page uses the first one's. The
 * form sees the control, so it answers what a field does; its anchor and
 * focus are the input it wraps.
 */
function define(tag: string) {
  if (customElements.get(tag)) return;
  customElements.define(tag, class extends HTMLElement {
    static formAssociated = true;
    readonly internals = this.attachInternals();
    onFormReset: (() => void) | null = null;
    formResetCallback() { this.onFormReset?.(); }
    get form() { return this.internals.form; }
    get name() { return this.getAttribute('name') ?? ''; }
    get labels() { return this._input?.labels; }
    get validity() { return this.internals.validity; }
    get validationMessage() { return this.internals.validationMessage; }
    get willValidate() { return this.internals.willValidate; }
    checkValidity() { return this.internals.checkValidity(); }
    reportValidity() { return this.internals.reportValidity(); }
    focus(options?: FocusOptions) { this._input?.focus(options); }
    private get _input() { return this.querySelector<HTMLInputElement>(':scope > input'); }
  });
}

/** The control is disabled with the input, or with a fieldset by itself, and submits to the input's form. */
function copyState(control: FormControl, input: HTMLInputElement) {
  ['disabled', 'form'].forEach((name) => restoreAttribute(control, name, input.getAttribute(name)));
}

/**
 * Wraps `input` in a `tag` control that takes its name. `display: contents`
 * lays the input out as a child of the field still. The control follows the
 * input's disabled and form attributes, and `onChange` runs after the input's
 * disabled, readonly or form attribute changes.
 */
export function wrapInControl(tag: string, input: HTMLInputElement, onChange: () => void): FormControl {
  define(tag);
  const control = document.createElement(tag) as FormControl;
  control.style.display = 'contents';
  control.setAttribute('name', input.getAttribute('name') ?? '');
  input.removeAttribute('name');
  input.replaceWith(control);
  control.append(input);
  copyState(control, input);
  const mirror = new MutationObserver(() => (copyState(control, input), onChange()));
  mirror.observe(input, { attributeFilter: ['disabled', 'readonly', 'form'] });
  mirrors.set(control, mirror);
  return control;
}

/** Unwraps the control, with whatever else went in it, and gives `input` its name back. */
export function unwrapControl(control: FormControl, input: HTMLInputElement) {
  mirrors.get(control)?.disconnect();
  control.replaceWith(...control.childNodes);
  input.setAttribute('name', control.getAttribute('name') ?? '');
}
