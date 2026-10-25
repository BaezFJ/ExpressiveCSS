import { Component, BaseOptions } from '../core/component';

const _defaults = Object.freeze({});

/** A mask position: a slot that takes the characters `accepts` matches, or a literal the mask writes itself. */
type Token = { accepts: RegExp } | { literal: string };

/** What each slot character in a mask accepts. */
const SLOTS: Record<string, RegExp> = { '0': /[0-9]/, a: /\p{L}/u, '*': /[0-9\p{L}]/u };

/** Splits a mask into tokens. A backslash makes the character after it a literal. */
const parse = (mask: string): Token[] =>
  (mask.match(/\\[^]|[^]/gu) ?? []).map((part) => (SLOTS[part] ? { accepts: SLOTS[part] } : { literal: part.slice(-1) }));

/**
 * The token `ch` lands on from token `t`: the literal at `t` when `ch` is that
 * literal, otherwise the next slot. Only the literal at `t` counts, so a
 * digit is not taken for a literal further on, such as the 1 in `+1 (000)`.
 */
function landing(tokens: Token[], t: number, ch: string) {
  if ((tokens[t] as { literal?: string })?.literal === ch) return t;
  const slot = tokens.findIndex((token, i) => i >= t && 'accepts' in token);
  return slot < 0 ? tokens.length : slot;
}

/** Feeds `ch` to the mask at token `t`, keeping it in `chars` if a slot takes it. Returns the next token. */
function place(tokens: Token[], t: number, ch: string, chars: string[]) {
  const at = landing(tokens, t, ch);
  const token = tokens[at];
  if (!token) return t;
  if ('literal' in token) return at + 1;
  if (!token.accepts.test(ch)) return t;
  chars.push(ch);
  return at + 1;
}

/**
 * The slot characters in `value`, in order, and how many of them come before
 * `caret`. Characters are normalized first, so full-width digits from an IME
 * fill digit slots. A character that neither fits a slot nor matches the next
 * literal is dropped, and so is any past the last slot.
 */
function read(tokens: Token[], value: string, caret: number) {
  const chars: string[] = [];
  let t = 0;
  let at = 0;
  let before = 0;
  for (const typed of value) {
    for (const ch of typed.normalize('NFKC')) t = place(tokens, t, ch, chars);
    at += typed.length;
    if (at <= caret) before = chars.length;
  }
  return { chars, before };
}

/**
 * Writes `chars` into the mask's slots, with the literals that come before
 * each filled slot and none after the last. Returns the text and the index
 * just after each slot character.
 */
function write(tokens: Token[], chars: string[]) {
  let text = '';
  let pending = '';
  const ends: number[] = [];
  for (const token of tokens) {
    if (ends.length === chars.length) break;
    if ('literal' in token) pending += token.literal;
    else {
      text += pending + chars[ends.length];
      pending = '';
      ends.push(text.length);
    }
  }
  return { text, ends };
}

/**
 * Input mask. Formats a text field's value to the pattern in its `data-mask`
 * attribute as people type, paste or compose: `0` takes a digit, `a` a
 * letter, `*` either, and every other character is a literal the mask writes
 * itself. The form submits the value as the field shows it.
 */
export class InputMask extends Component<BaseOptions> {
  declare el: HTMLInputElement;
  static key = 'Expressive_InputMask';
  private _tokens: Token[];

  constructor(el: HTMLInputElement, options: Partial<BaseOptions>) {
    super(el, options);
    this._tokens = parse(el.dataset.mask ?? '');
    const signal = this._events.signal;
    // Capture, which runs before the field's own bubble listeners, so the
    // page's input listeners read the formatted value.
    el.addEventListener('input', this._onInput, { capture: true, signal });
    // An IME writes as it composes; the mask waits until it is done. Engines
    // fire the last input before or after compositionend, and formatting
    // twice changes nothing.
    el.addEventListener('compositionend', this._format, { signal });
    this._rewrite();
  }

  static get defaults(): BaseOptions {
    return _defaults;
  }

  private _onInput = (e: InputEvent) => {
    if (!e.isComposing) this._format();
  };

  private _format = () => {
    const caret = this._rewrite();
    if (caret !== null && this.el.ownerDocument.activeElement === this.el) this.el.setSelectionRange(caret, caret);
  };

  /** Rewrites the value to the mask. Returns where the caret goes, or null when the value already fit. */
  private _rewrite() {
    const el = this.el;
    const { chars, before } = read(this._tokens, el.value, el.selectionEnd ?? el.value.length);
    const { text, ends } = write(this._tokens, chars);
    if (text === el.value) return null;
    el.value = text;
    return ends[before - 1] ?? 0;
  }
}
