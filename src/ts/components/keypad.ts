import { Component, BaseOptions, InitElements, InitElement } from '../core/component';
import { Utils } from '../core/utils';

export interface KeypadOptions extends BaseOptions {
  /**
   * Called after every key press with the text typed ('7', 'A', ' ') or the
   * function key's name ('Backspace', 'Enter', 'Shift').
   * @default null
   */
  onKey: ((key: string) => void) | null;
}

const _defaults: KeypadOptions = {
  onKey: null
};

type Field = HTMLInputElement | HTMLTextAreaElement;
type Root = Document | ShadowRoot;

const isField = (el: unknown): el is Field => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

const instances = new Set<Keypad>();
// Fields that have had focus, so their caret is one a person placed.
const touched = new WeakSet<Field>();
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
  }]
];
const attachEvents = ['focusin', 'mousedown', 'click'];

/**
 * Keypad and keyboard. A `.keypad` or `.keyboard` whose `aria-controls`
 * names a text field types into it: a key's `value` is inserted at the caret,
 * and `data-key="Backspace"`, `"Enter"` and `"Shift"` edit, submit and
 * capitalize. The field receives the same `input` event typing would fire.
 */
export class Keypad extends Component<KeypadOptions> {
  /** @internal */
  _root: Root | null;

  constructor(el: HTMLElement, options: Partial<KeypadOptions>) {
    super(el, options, Keypad);
    this.el['Expressive_Keypad'] = this;
    this.options = { ...Keypad.defaults, ...options };
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

  static init(el: HTMLElement, options?: Partial<KeypadOptions>): Keypad;
  static init(els: InitElements<InitElement>, options?: Partial<KeypadOptions>): Keypad[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<KeypadOptions> = {}
  ): Keypad | Keypad[] {
    return super.init(els, options, Keypad);
  }

  static getInstance(el: HTMLElement): Keypad {
    return el['Expressive_Keypad'];
  }

  destroy() {
    instances.delete(this);
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
    const name = key.dataset.key;
    // A button that is neither a value key nor a function key is not a key.
    if (key.disabled || (!name && !key.hasAttribute('value'))) return;
    if (name === 'Shift') {
      key.setAttribute('aria-pressed', String(key.getAttribute('aria-pressed') !== 'true'));
      this.options.onKey?.(name);
      return;
    }
    let text = name ? '' : key.value;
    // Shift is one-shot: it capitalizes the next character and releases.
    const shift = text && this.el.querySelector('[data-key="Shift"][aria-pressed="true"]');
    if (shift) {
      text = text.toUpperCase();
      shift.setAttribute('aria-pressed', 'false');
    }
    const field = this.target;
    if (field && !field.matches(':disabled') && !field.readOnly) {
      if (name === 'Enter' && field instanceof HTMLInputElement) field.form?.requestSubmit();
      else if (name === 'Enter') this._edit(field, '\n', 'insertLineBreak');
      else if (name === 'Backspace') this._edit(field, '', 'deleteContentBackward');
      else if (text) this._edit(field, text, 'insertText');
    }
    this.options.onKey?.(name ?? text);
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
    // Composed, so listeners outside a shadow root hear it as they do typing.
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType, data: text || null }));
  }
}
