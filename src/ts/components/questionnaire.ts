import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement } from '../core/component';

export interface QuestionnaireOptions extends BaseOptions {
  /**
   * Text above the progress bar. `{current}` and `{total}` are replaced with
   * the question number and the number of questions. `data-progress-label`
   * on the form sets it.
   * @default 'Question {current} of {total}'
   */
  progressLabel: string;
  /**
   * Error shown when a question has no `.questionnaire-error` of its own and
   * the browser gives no validation message, as for a `data-required` group
   * of checkboxes.
   * @default 'Choose an answer to continue.'
   */
  requiredMessage: string;
  /**
   * With `data-summary`, the heading of the review step and the text above
   * the progress bar there.
   * @default 'Review your answers'
   */
  summaryLabel: string;
  /** With `data-summary`, the text of each answer's edit button. @default 'Edit' */
  editLabel: string;
  /** With `data-summary`, the answer shown for a question left blank. @default 'Not answered' */
  skippedLabel: string;
}

const _defaults: QuestionnaireOptions = {
  progressLabel: 'Question {current} of {total}',
  requiredMessage: 'Choose an answer to continue.',
  summaryLabel: 'Review your answers',
  editLabel: 'Edit',
  skippedLabel: 'Not answered'
};

const NAVIGATION = ['previous', 'skip', 'next'];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
/** A control's answer as saved: whether a choice is checked, a select's chosen values, or a field's value. */
type Saved = boolean | string | string[];

const isChoice = (control: Control): control is HTMLInputElement =>
  control instanceof HTMLInputElement && (control.type === 'radio' || control.type === 'checkbox');

/** A choice's label text, without its input or the description in <small>. */
function labelText(control: HTMLInputElement) {
  const label = control.closest('label')?.cloneNode(true) as HTMLElement | undefined;
  label?.querySelectorAll('input, small').forEach((el) => el.remove());
  return label?.textContent.trim() || control.value;
}

/** A control's answer as text for the summary. */
function answerText(control: Control) {
  if (control instanceof HTMLSelectElement) return Array.from(control.selectedOptions, (option) => option.text).join(', ');
  if (isChoice(control)) return control.checked ? labelText(control) : '';
  return control.value.trim();
}

const savedState = (control: Control): Saved => {
  if (control instanceof HTMLSelectElement) return Array.from(control.selectedOptions, (option) => option.value);
  return isChoice(control) ? control.checked : control.value;
};

/** Saved state with a list of answers, or null. */
const validSaved = (saved: { answers?: unknown } | null) =>
  (Array.isArray(saved?.answers) ? saved : null) as { index: number; answers: Saved[] } | null;

function restoreState(control: Control, saved: Saved) {
  if (control instanceof HTMLSelectElement) {
    for (const option of control.options) option.selected = (saved as string[]).includes(option.value);
  } else if (isChoice(control)) control.checked = saved as boolean;
  else control.value = saved as string;
}

/**
 * The answer a shortcut key picks, counted from 0: a digit 1 to 9 or a
 * letter. Keys typed into a text field, or with a modifier, pick nothing.
 */
function shortcut(e: KeyboardEvent) {
  if (typingIn(e.target) || modified(e)) return -1;
  const digit = '123456789'.indexOf(e.key);
  return digit >= 0 ? digit : letterIndex(e.key);
}

const TYPING = 'textarea, select, [contenteditable], input:not([type="radio"], [type="checkbox"], [type="button"], [type="submit"], [type="reset"])';
const typingIn = (target: EventTarget | null) => !!(target as Element).matches?.(TYPING);
const modified = (e: KeyboardEvent) => e.ctrlKey || e.metaKey || e.altKey;

const letterIndex = (key: string) => (key.length === 1 ? LETTERS.indexOf(key.toLowerCase()) : -1);

/**
 * A multi-step questionnaire: a <form class="questionnaire"> whose
 * <fieldset> children are the questions, shown one at a time, and a <footer>
 * of buttons. `value="previous"`, `value="skip"` and `value="next"` mark the
 * navigation buttons; a submit button sends the form on the last question.
 *
 * A question is required when one of its controls is `required`, or when the
 * fieldset has `data-required` (at least one enabled checkbox, held as a
 * custom validity on the first one). Next and every way of submitting check
 * it with the browser's own validation; an optional question gets Skip, which
 * clears its answer. A disabled fieldset is left out, so a page can switch
 * questions on and off from earlier answers.
 *
 * Three attributes on the form add to that: `data-shortcuts` lets a letter or
 * digit pick an answer, `data-summary` adds a review step listing every
 * answer before the submit button, and `data-save="key"` keeps the answers
 * and the shown question in localStorage under that key until the form is
 * submitted.
 *
 * Without JavaScript every question shows at once and the submit button sends
 * the form. The answers are ordinary form controls, so FormData reads them.
 */
export class Questionnaire extends Component<QuestionnaireOptions> {
  declare el: HTMLFormElement;
  private _active: HTMLFieldSetElement | null = null;
  private _progress: HTMLElement;
  private _progressText: HTMLElement;
  private _progressBar: HTMLProgressElement;
  private _generated: HTMLElement[] = [];
  private _generatedIds: HTMLElement[] = [];
  private _observer: MutationObserver;
  /** Set while one submission's invalid events arrive, so only the first opens. */
  private _reporting = false;
  /** With data-summary, the review step, and whether it is shown. */
  private _summary: HTMLElement | null = null;
  private _reviewing = false;

  constructor(el: HTMLFormElement, options: Partial<QuestionnaireOptions>) {
    super(el, options, Questionnaire);
    this.el['Expressive_Questionnaire'] = this;
    const progressLabel = el.dataset.progressLabel;
    this.options = {
      ...Questionnaire.defaults,
      ...(progressLabel ? { progressLabel } : {}),
      ...options
    };

    this._progress = document.createElement('div');
    this._progress.className = 'questionnaire-progress';
    this._progressText = document.createElement('span');
    this._progressText.id = `questionnaire-progress-${Utils.guid()}`;
    this._progressBar = document.createElement('progress');
    this._progressBar.className = 'progress';
    this._progressBar.setAttribute('aria-labelledby', this._progressText.id);
    this._progress.append(this._progressText, this._progressBar);
    this.el.prepend(this._progress);

    for (const item of this._fieldsets()) {
      const ids = Array.from(item.querySelectorAll<HTMLElement>(':scope > p:not(.questionnaire-error)'))
        .map((p) => this._ensureId(p, 'questionnaire-description'));
      if (ids.length && !item.hasAttribute('aria-describedby')) {
        item.setAttribute('aria-describedby', ids.join(' '));
        this._generatedIds.push(item);
      }
    }

    this._active = this.items[0] ?? null;
    this._summary = this._createSummary();
    this._restore();
    this._syncRequired();
    this._render();
    // A page enabling or disabling a question from an earlier answer changes
    // the count and the buttons.
    this._observer = new MutationObserver(() => {
      this._syncRequired();
      this._render();
    });
    this._observer.observe(this.el, { attributes: true, subtree: true, attributeFilter: ['disabled'] });
    this.el.addEventListener('click', this._handleClick);
    this.el.addEventListener('keydown', this._handleKeydown);
    this.el.addEventListener('input', this._handleInput);
    this.el.addEventListener('change', this._save);
    this.el.addEventListener('submit', this._forget);
    // invalid does not bubble.
    this.el.addEventListener('invalid', this._handleInvalid, true);
  }

  static get defaults(): QuestionnaireOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Questionnaire.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<QuestionnaireOptions>): Questionnaire;
  /**
   * Initializes instances of Questionnaire.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: InitElements<InitElement>,
    options?: Partial<QuestionnaireOptions>
  ): Questionnaire[];
  /**
   * Initializes instances of Questionnaire.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<QuestionnaireOptions> = {}
  ): Questionnaire | Questionnaire[] {
    return super.init(els, options, Questionnaire);
  }

  static getInstance(el: HTMLElement): Questionnaire {
    return el['Expressive_Questionnaire'];
  }

  /** The questions that apply: every fieldset child that is not disabled. */
  get items(): HTMLFieldSetElement[] {
    return this._fieldsets().filter((item) => !item.disabled);
  }

  /** Position of the shown question in `items`. */
  get index(): number {
    return this.items.indexOf(this._active);
  }

  /** Shows the question at `index` without checking the current one. */
  goTo = (index: number) => {
    const item = this.items[index];
    if (!item) return;
    this._active = item;
    this._reviewing = false;
    this._render();
    this._save();
    const controls = this._controls(item).filter((control) => !control.disabled);
    (controls.find((control) => (control as HTMLInputElement).checked) ?? controls[0])?.focus();
  };

  /** Checks the shown question and moves to the next one if it is answered. */
  next = () => {
    if (this._validate(this._active)) this._advance();
  };

  /** Moves to the previous question, or from the review step back to the last one. */
  previous = () => this.goTo(this._reviewing ? this.items.length - 1 : this.index - 1);

  /** Shows the review step of a questionnaire with data-summary. */
  review = () => {
    if (!this._summary) return;
    this._fillSummary(this._summary);
    this._reviewing = true;
    this._render();
    this._summary.focus();
  };

  /** The next question, or after the last one the review step. */
  private _advance() {
    if (this._summary && this.index === this.items.length - 1) this.review();
    else this.goTo(this.index + 1);
  }

  /** Clears the answer to the shown question and moves to the next one. */
  skip = () => {
    if (!this._active) return;
    for (const control of this._controls(this._active)) {
      const choice = isChoice(control);
      if (choice ? !control.checked : !control.value) continue;
      if (choice) control.checked = false;
      else control.value = '';
      control.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // A skipped question has no answer left to be wrong about. Clearing fires
    // only `change`, not the `input` that clears an error, so clear it here.
    this._setInvalid(this._active, false);
    this._advance();
  };

  destroy() {
    this._observer.disconnect();
    this.el.removeEventListener('click', this._handleClick);
    this.el.removeEventListener('keydown', this._handleKeydown);
    this.el.removeEventListener('input', this._handleInput);
    this.el.removeEventListener('change', this._save);
    this.el.removeEventListener('submit', this._forget);
    this.el.removeEventListener('invalid', this._handleInvalid, true);
    this._summary?.remove();
    for (const item of this._fieldsets()) {
      if (item.hasAttribute('data-required')) for (const control of this._controls(item)) control.setCustomValidity('');
      item.hidden = false;
      this._setInvalid(item, false);
    }
    for (const button of this._buttons()) button.hidden = false;
    this._progress.remove();
    for (const el of this._generated) el.remove();
    for (const el of this._generatedIds) {
      el.removeAttribute(el instanceof HTMLFieldSetElement ? 'aria-describedby' : 'id');
    }
    this.el['Expressive_Questionnaire'] = undefined;
  }

  private _fieldsets() {
    return Array.from(this.el.querySelectorAll<HTMLFieldSetElement>(':scope > fieldset'));
  }

  /** The footer's navigation and submit buttons. */
  private _buttons() {
    return Array.from(this.el.querySelectorAll<HTMLButtonElement>(':scope > footer > button')).filter(
      (button) => NAVIGATION.includes(button.value) || button.type === 'submit'
    );
  }

  private _controls(item: HTMLFieldSetElement) {
    return Array.from(item.elements).filter(
      (el): el is Control =>
        el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement && el.type !== 'button' && el.type !== 'submit')
    );
  }

  private _required(item: HTMLFieldSetElement) {
    return item.hasAttribute('data-required') || this._controls(item).some((control) => control.required);
  }

  private _ensureId(el: HTMLElement, prefix: string) {
    if (!el.id) {
      el.id = `${prefix}-${Utils.guid()}`;
      this._generatedIds.push(el);
    }
    return el.id;
  }

  private _render() {
    const items = this.items;
    // The shown question was switched off: carry on from the next one.
    if (!items.includes(this._active)) this._active = this._after(items);
    const index = items.indexOf(this._active);
    for (const item of this._fieldsets()) item.hidden = this._reviewing || item !== this._active;
    this._summary?.toggleAttribute('hidden', !this._reviewing);
    for (const button of this._buttons()) button.hidden = !this._shows(button, index);
    this._renderProgress(index, items.length);
  }

  /** The question after the shown one, which was switched off, or the last that applies. */
  private _after(items: HTMLFieldSetElement[]) {
    const all = this._fieldsets();
    const after = all.slice(all.indexOf(this._active) + 1).find((item) => !item.disabled);
    return after ?? items[items.length - 1] ?? null;
  }

  /** Whether the shown step is the one that submits: the review step, or without one the last question. */
  private get _end() {
    return this._summary ? this._reviewing : this.index === this.items.length - 1;
  }

  /** Whether a footer button applies to the shown step. */
  private _shows(button: HTMLButtonElement, index: number) {
    const end = this._end;
    const shown: Record<string, boolean> = {
      previous: index > 0 || this._reviewing,
      skip: !end && this._skippable(),
      next: !end
    };
    return shown[button.value] ?? end;
  }

  /** Whether the shown question may be skipped: it applies and needs no answer. */
  private _skippable() {
    return !!this._active && !this._required(this._active);
  }

  private _renderProgress(index: number, total: number) {
    this._progressText.textContent = this._reviewing
      ? this.options.summaryLabel
      : this.options.progressLabel.replace('{current}', String(index + 1)).replace('{total}', String(total));
    this._progressBar.max = Math.max(total, 1);
    this._progressBar.value = this._reviewing ? total : index + 1;
  }

  /** With data-summary, the review step: a list of the questions and their answers, before the footer. */
  private _createSummary() {
    if (!this.el.hasAttribute('data-summary')) return null;
    const summary = document.createElement('section');
    summary.className = 'questionnaire-summary';
    summary.tabIndex = -1;
    summary.setAttribute('aria-label', this.options.summaryLabel);
    summary.hidden = true;
    summary.addEventListener('click', (e) => {
      const edit = (e.target as Element).closest<HTMLButtonElement>('button[data-question]');
      if (edit) this.goTo(Number(edit.dataset.question));
    });
    const footer = this.el.querySelector(':scope > footer');
    if (footer) footer.before(summary);
    else this.el.append(summary);
    return summary;
  }

  /** Lists each question that applies with its answer and a button back to it. */
  private _fillSummary(summary: HTMLElement) {
    const list = document.createElement('dl');
    list.append(...this.items.map((item, i) => {
      const row = document.createElement('div');
      const [term, answer, action] = [document.createElement('dt'), document.createElement('dd'), document.createElement('dd')];
      term.id = `questionnaire-summary-${Utils.guid()}`;
      term.textContent = item.querySelector(':scope > legend')?.textContent.trim() ?? '';
      answer.textContent = this._controls(item).map(answerText).filter(Boolean).join(', ') || this.options.skippedLabel;
      const edit = document.createElement('button');
      Object.assign(edit, { type: 'button', className: 'text', textContent: this.options.editLabel });
      edit.dataset.question = String(i);
      edit.setAttribute('aria-describedby', term.id);
      action.append(edit);
      row.append(term, answer, action);
      return row;
    }));
    summary.replaceChildren(list);
  }

  /** The storage key from data-save, or '' without it. */
  private get _key() {
    const key = this.el.dataset.save;
    return key ? `questionnaire:${key}` : '';
  }

  /** Every answer control, in order. */
  private _allControls() {
    return this._fieldsets().flatMap((item) => this._controls(item));
  }

  /** With data-save, stores the answers and the shown question. */
  private _save = () => {
    const key = this._key;
    if (!key) return;
    const state = { index: this.index, answers: this._allControls().map(savedState) };
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the questionnaire still works unsaved.
    }
  };

  /** Puts back saved answers and the question they reached, if the questions are the same. */
  private _restore() {
    const saved = this._read();
    const controls = this._allControls();
    if (saved?.answers.length !== controls.length) return;
    controls.forEach((control, i) => restoreState(control, saved!.answers[i]));
    this._active = this.items[saved!.index] ?? this._active;
  }

  /** The saved state, or null for none or a broken one. */
  private _read(): { index: number; answers: Saved[] } | null {
    try {
      return validSaved(JSON.parse(localStorage.getItem(this._key) ?? 'null'));
    } catch {
      return null;
    }
  }

  /** A submitted questionnaire has nothing left to resume. */
  private _forget = () => {
    try {
      if (this._key) localStorage.removeItem(this._key);
    } catch {
      // Blocked storage has nothing saved.
    }
  };

  /**
   * Puts "choose at least one" on the first enabled checkbox of each
   * data-required group with none checked, so the browser's validation, and
   * every way of submitting, sees it. A disabled checkbox is not sent, so it
   * does not count.
   */
  private _syncRequired() {
    for (const item of this._fieldsets()) {
      if (!item.hasAttribute('data-required')) continue;
      const boxes = this._controls(item).filter(
        (control): control is HTMLInputElement => control instanceof HTMLInputElement && control.type === 'checkbox'
      );
      const enabled = boxes.filter((box) => !box.disabled);
      for (const box of boxes) box.setCustomValidity('');
      if (enabled.length && !enabled.some((box) => box.checked)) {
        const error = item.querySelector<HTMLElement>(':scope > .questionnaire-error:not([data-generated])');
        enabled[0].setCustomValidity(error?.textContent.trim() || this.options.requiredMessage);
      }
    }
  }

  /** The first control in the question that still needs an answer. */
  private _invalidControl(item: HTMLFieldSetElement): Control | undefined {
    return this._controls(item).find((control) => control.willValidate && !control.validity.valid);
  }

  /** Shows the question's error and returns false when it needs an answer. */
  private _validate(item: HTMLFieldSetElement | null) {
    this._syncRequired();
    const invalid = item && this._invalidControl(item);
    if (!invalid) return true;
    let error = item.querySelector<HTMLElement>(':scope > .questionnaire-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'questionnaire-error';
      error.dataset.generated = '';
      error.textContent = invalid.validationMessage || this.options.requiredMessage;
      item.append(error);
      this._generated.push(error);
    }
    this._setInvalid(item, true);
    invalid.focus();
    return false;
  }

  private _setInvalid(item: HTMLFieldSetElement, invalid: boolean) {
    item.classList.toggle('invalid', invalid);
    const error = item.querySelector<HTMLElement>(':scope > .questionnaire-error');
    const described = (item.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id && id !== error?.id);
    if (invalid && error) described.push(this._ensureId(error, 'questionnaire-error'));
    if (described.length) item.setAttribute('aria-describedby', described.join(' '));
    else item.removeAttribute('aria-describedby');
    for (const control of this._controls(item)) {
      if (invalid) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
    if (!invalid && this._generated.includes(error)) {
      error.remove();
      this._generated.splice(this._generated.indexOf(error), 1);
    }
  }

  private _handleClick = (e: MouseEvent) => {
    const button = (e.target as Element).closest?.('button');
    if (!button || !this._buttons().includes(button)) return;
    if (NAVIGATION.includes(button.value)) {
      // Also stops a navigation button written without type="button" from
      // submitting the form.
      e.preventDefault();
      this[button.value as 'previous' | 'skip' | 'next']();
      return;
    }
    // Submit by click or Enter: catch answers a script set without an event.
    this._syncRequired();
  };

  // Enter in a field moves on instead of submitting the form early. With
  // data-shortcuts, a letter or digit picks an answer.
  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return this._handleShortcut(e);
    if (e.defaultPrevented || e.isComposing) return;
    if (!(e.target instanceof HTMLInputElement) || this._end) return;
    e.preventDefault();
    this.next();
  };

  /** Whether a shortcut key can pick an answer now: data-shortcuts is set and a question shows. */
  private get _shortcuts() {
    return this.el.hasAttribute('data-shortcuts') && !!this._active && !this._reviewing;
  }

  private _handleShortcut(e: KeyboardEvent) {
    if (!this._shortcuts) return;
    const choice = this._controls(this._active!).filter((control) => isChoice(control) && !control.disabled)[shortcut(e)];
    if (!choice) return;
    e.preventDefault();
    choice.click();
    choice.focus();
  }

  // A submission found an unanswered question, possibly a hidden one. Open the
  // first instead of letting the browser report a control it cannot show.
  // One submission fires its invalid events in a single task.
  private _handleInvalid = (e: Event) => {
    const item = this.items.find((item) => item.contains(e.target as Node));
    if (!item) return;
    e.preventDefault();
    if (this._reporting) return;
    this._reporting = true;
    setTimeout(() => (this._reporting = false));
    this._active = item;
    this._reviewing = false;
    this._render();
    this._validate(item);
  };

  // An answer clears the question's error.
  private _handleInput = (e: Event) => {
    this._syncRequired();
    this._save();
    const item = (e.target as Element).closest?.('fieldset');
    if (item instanceof HTMLFieldSetElement && item.classList.contains('invalid')) this._setInvalid(item, false);
  };
}
