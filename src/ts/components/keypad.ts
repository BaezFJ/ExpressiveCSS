import { Component, BaseOptions } from '../core/component';
import { Utils } from '../core/utils';

export interface KeypadOptions extends BaseOptions {
  /**
   * Called after every key press with the text typed ('7', 'A', ' ') or the
   * function key's name ('Backspace', 'Enter', 'Shift').
   * @default null
   */
  onKey: ((key: string) => void) | null;
  /** Text the keypad writes. */
  i18n: Partial<KeypadI18n>;
}

export interface KeypadI18n {
  /**
   * The validation message for a field whose keypad-typed value is shorter
   * than its minlength, which the browser only checks after typing.
   */
  tooShort: (minLength: number) => string;
}

const _defaults: KeypadOptions = {
  onKey: null,
  i18n: {
    tooShort: (minLength) => `Use at least ${minLength} characters.`
  }
};

type Field = HTMLInputElement | HTMLTextAreaElement;
type Root = Document | ShadowRoot;

const isField = (el: unknown): el is Field => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

const instances = new Set<Keypad>();
// Fields that have had focus, so their caret is one a person placed.
const touched = new WeakSet<Field>();
// Fields a keypad typed into, with that keypad. A value set by script skips
// minlength, so the keypad checks the length itself on every input.
const typed = new WeakMap<Field, Keypad>();
// The too-short message a keypad set on a field, so it clears only that one.
const marked = new WeakMap<Field, string>();

/** Sets the keypad's too-short message, unless the page set one; '' clears the keypad's own. */
function markShort(field: Field, message: string) {
  if (!message) return unmark(field);
  if (field.validity.customError) return;
  field.setCustomValidity(message);
  marked.set(field, message);
}

/** Clears the keypad's message, unless the page has since put its own in its place. */
const unmark = (field: Field) => {
  if (marked.get(field) === field.validationMessage) field.setCustomValidity('');
  marked.delete(field);
};
let segmenter: Intl.Segmenter | undefined;

// One listener per document or shadow root serves every keypad in it, kept
// while any keypad lives there. A key inside a keypad belongs to that keypad.
// A `data-key` key inside a field's `.field` wrapper, such as a trailing
// Backspace, belongs to the keypad that controls the field, found at press
// time: a field rendered after init or a changed aria-controls still works,
// and a press runs once however many keypads share the field. Other buttons
// there, such as a password toggle, stay their own.
function keyFor(e: Event): [Keypad, HTMLButtonElement] | null {
  const key = (e.target as Element).closest?.('button');
  if (!key) return null;
  const keypad = key.closest('.keypad, .keyboard')?.['Expressive_Keypad'] as Keypad | undefined;
  if (keypad) return [keypad, key];
  const wrapper = key.dataset.key && key.closest('.field');
  if (!wrapper) return null;
  for (const other of instances) {
    const field = other.target;
    if (field && wrapper.contains(field)) return [other, key];
  }
  return null;
}

const rootListeners: [string, EventListener][] = [
  // A pointer press on a key would move focus off the field and hide its
  // caret. Keep focus where it is while the field has it.
  ['mousedown', (e) => {
    const hit = keyFor(e);
    if (hit && hit[0]._root?.activeElement === hit[0].target) e.preventDefault();
  }],
  ['click', (e) => {
    const hit = keyFor(e);
    if (hit) hit[0]._press(hit[1]);
  }],
  ['focusin', (e) => {
    if (isField(e.target)) touched.add(e.target);
  }],
  ['input', (e) => {
    if (isField(e.target)) typed.get(e.target)?._checkLength(e.target);
  }],
  // A reset empties the fields, so the keypad's messages go with their values.
  ['reset', (e) => {
    for (const el of (e.target as HTMLFormElement).elements ?? []) if (isField(el)) unmark(el);
  }],
  // A hardware key held down in a field lights the keypad key it matches.
  ['keydown', (e) => light(e, true)],
  ['keyup', (e) => light(e, false)]
];
const attachEvents = ['focusin', 'mousedown', 'click'];

/** Lights or clears the key matching a hardware key; a release clears it wherever focus went. */
function light(e: Event, on: boolean) {
  for (const keypad of instances) {
    if (!on || keypad.target === e.target) keypad._light((e as KeyboardEvent).key, on);
  }
}

/** Whether a button types its value or runs a function key; any other button is not a key. */
const isKey = (key: HTMLButtonElement) => !key.disabled && (!!key.dataset.key || key.hasAttribute('value'));

/** Whether a keypad key is the one a hardware key names, by its function or, ignoring case, its value. */
const matches = (key: HTMLButtonElement, name: string) =>
  key.dataset.key === name || (key.hasAttribute('value') && key.value.toLowerCase() === name.toLowerCase());

/**
 * Keypad and keyboard. A `.keypad` or `.keyboard` whose `aria-controls`
 * names a text field types into it: a key's `value` is inserted at the caret,
 * and `data-key="Backspace"`, `"Enter"`, `"Shift"` and `"CapsLock"` edit,
 * submit and capitalize. A `data-key="Layer"` key shows the elements whose
 * `data-layer` matches its `value` and hides the other layers. The field
 * receives the same `input` event typing would fire.
 */
export class Keypad extends Component<KeypadOptions> {
  /** @internal */
  _root: Root | null;
  /** Fields this keypad typed into, whose messages it clears on destroy. */
  private _fields = new Set<Field>();

  constructor(el: HTMLElement, options: Partial<KeypadOptions>) {
    super(el, options);
    this.el['Expressive_Keypad'] = this;
    this.options.i18n = { ...Keypad.defaults.i18n, ...options.i18n };
    this._root = null;
    instances.add(this);
    this._attach();
  }

  // Listen on the keypad's document (9) or shadow root (11). A keypad
  // initialized while detached has neither yet, so it waits on its own element
  // for the first focus or press after insertion. The root listeners added
  // then still hear that same event as it bubbles up.
  private _attach = () => {
    const root = this.el.getRootNode();
    const attached = root.nodeType === 9 || root.nodeType === 11;
    this._waitForInsertion(!attached);
    if (!attached) return;
    this._root = root as Root;
    this._listen('addEventListener');
    const active = this._root.activeElement;
    if (isField(active)) touched.add(active);
  };

  private _waitForInsertion(wait: boolean) {
    for (const type of attachEvents) this.el[wait ? 'addEventListener' : 'removeEventListener'](type, this._attach);
  }

  // Only the first keypad on a root adds the listeners, and only the last removes them.
  private _listen(method: 'addEventListener' | 'removeEventListener') {
    if (!this._root || this._shared()) return;
    for (const [type, listener] of rootListeners) this._root[method](type, listener);
  }

  static get defaults(): KeypadOptions {
    return _defaults;
  }

  static getInstance(el: HTMLElement): Keypad {
    return el['Expressive_Keypad'];
  }

  destroy() {
    instances.delete(this);
    for (const field of this._fields) {
      unmark(field);
      if (typed.get(field) === this) typed.delete(field);
    }
    this._waitForInsertion(false);
    this._listen('removeEventListener');
    this.el['Expressive_Keypad'] = undefined;
  }

  /** The text field named by `aria-controls`, if there is one. */
  get target(): Field | null {
    const id = this.el.getAttribute('aria-controls');
    const field = id ? Utils.getElementById(this.el, id) : null;
    return isField(field) ? field : null;
  }

  // Whether another keypad already listens on this one's root.
  private _shared() {
    for (const other of instances) if (other !== this && other._root === this._root) return true;
    return false;
  }

  /** @internal */
  _press(key: HTMLButtonElement) {
    if (!isKey(key)) return;
    // Run the key first: an optional call skips its argument when there is no onKey.
    const pressed = this._act(key);
    this.options.onKey?.(pressed);
  }

  /** Runs a key and returns what onKey hears: the typed text or the function key's name. */
  private _act(key: HTMLButtonElement) {
    const name = key.dataset.key;
    if (name === 'Layer') return this._layer(key);
    if (name === 'Shift' || name === 'CapsLock') return this._latch(key, name);
    return this._type(key, name);
  }

  /** Shift and Caps Lock latch: pressed until pressed again, or for Shift until the next character. */
  private _latch(key: HTMLButtonElement, name: string) {
    key.setAttribute('aria-pressed', String(key.getAttribute('aria-pressed') !== 'true'));
    return name;
  }

  /** Shows the layer the key names and hides the others. */
  private _layer(key: HTMLButtonElement) {
    for (const part of this.el.querySelectorAll<HTMLElement>('[data-layer]')) part.hidden = part.dataset.layer !== key.value;
    return 'Layer';
  }

  private _type(key: HTMLButtonElement, name: string | undefined) {
    const text = name ? '' : this._case(key.value);
    const field = this._editable;
    if (field) this._apply(field, name, text);
    return name ?? text;
  }

  /** A character as Shift or Caps Lock writes it. Shift is one-shot: it releases after one character. */
  private _case(text: string) {
    const shift = this.el.querySelector('[data-key="Shift"][aria-pressed="true"]');
    shift?.setAttribute('aria-pressed', 'false');
    const upper = shift || this.el.querySelector('[data-key="CapsLock"][aria-pressed="true"]');
    return upper ? text.toUpperCase() : text;
  }

  /** The target field, unless it is disabled or read-only. */
  private get _editable(): Field | null {
    const field = this.target;
    return field && !field.matches(':disabled') && !field.readOnly ? field : null;
  }

  private _apply(field: Field, name: string | undefined, text: string) {
    if (name === 'Enter') return this._enter(field);
    if (name === 'Backspace') return this._edit(field, '', 'deleteContentBackward');
    if (text) this._edit(field, text, 'insertText');
  }

  /** Enter submits an input's form and starts a new line in a textarea. */
  private _enter(field: Field) {
    if (field instanceof HTMLInputElement) field.form?.requestSubmit();
    else this._edit(field, '\n', 'insertLineBreak');
  }

  /** @internal Lights or clears every key a hardware key matches. */
  _light(name: string, on: boolean) {
    for (const key of this.el.querySelectorAll<HTMLButtonElement>('button')) {
      if (matches(key, name)) key.classList.toggle('pressed', on);
    }
  }

  /** @internal A non-empty value shorter than minlength is invalid, as typing would make it. */
  _checkLength(field: Field) {
    // Without minlength a field keeps any message the page set.
    if (field.minLength < 1) return;
    const short = field.value.length > 0 && field.value.length < field.minLength;
    markShort(field, short ? this.options.i18n.tooShort!(field.minLength) : '');
  }

  private _edit(field: Field, text: string, inputType: string) {
    const { value } = field;
    // Number and email inputs expose no selection; type at the end.
    let start = field.selectionStart ?? value.length;
    let end = field.selectionEnd ?? value.length;
    // A field that has never had focus may report its caret at 0. Type at the
    // end, where a reader expects the next character.
    if (start === 0 && end === 0 && !touched.has(field)) start = end = value.length;
    // Backspace removes the whole character before the caret, emoji included.
    // A short tail holds the last grapheme, so long text is not walked.
    if (inputType === 'deleteContentBackward' && start === end && start) {
      const tail = value.slice(Math.max(0, start - 64), start);
      start -= (segmenter ??= new Intl.Segmenter()).segment(tail).containing(tail.length - 1).segment.length;
    }
    if (start === end && !text) return;
    if (text && field.maxLength >= 0 && value.length - (end - start) + text.length > field.maxLength) return;
    const next = value.slice(0, start) + text + value.slice(end);
    field.value = next;
    // A number input empties itself on a partial value such as "12." or "-".
    // Keep what was there; the docs point decimals and signs at a text field.
    if (next && !field.value) {
      field.value = value;
      return;
    }
    if (field.selectionStart !== null) field.setSelectionRange(start + text.length, start + text.length);
    touched.add(field);
    typed.set(field, this);
    this._fields.add(field);
    // Composed, so listeners outside a shadow root hear it as they do typing.
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType, data: text || null }));
  }
}
