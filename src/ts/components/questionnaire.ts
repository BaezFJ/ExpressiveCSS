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
}

const _defaults: QuestionnaireOptions = {
  progressLabel: 'Question {current} of {total}',
  requiredMessage: 'Choose an answer to continue.'
};

const NAVIGATION = ['previous', 'skip', 'next'];

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

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
    this._render();
    const controls = this._controls(item).filter((control) => !control.disabled);
    (controls.find((control) => (control as HTMLInputElement).checked) ?? controls[0])?.focus();
  };

  /** Checks the shown question and moves to the next one if it is answered. */
  next = () => {
    if (this._validate(this._active)) this.goTo(this.index + 1);
  };

  /** Moves to the previous question. */
  previous = () => this.goTo(this.index - 1);

  /** Clears the answer to the shown question and moves to the next one. */
  skip = () => {
    if (!this._active) return;
    for (const control of this._controls(this._active)) {
      const isChoice = control instanceof HTMLInputElement && (control.type === 'radio' || control.type === 'checkbox');
      if (isChoice ? !control.checked : !control.value) continue;
      if (isChoice) control.checked = false;
      else control.value = '';
      control.dispatchEvent(new Event('change', { bubbles: true }));
    }
    this.goTo(this.index + 1);
  };

  destroy() {
    this._observer.disconnect();
    this.el.removeEventListener('click', this._handleClick);
    this.el.removeEventListener('keydown', this._handleKeydown);
    this.el.removeEventListener('input', this._handleInput);
    this.el.removeEventListener('invalid', this._handleInvalid, true);
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
    if (!items.includes(this._active)) {
      const all = this._fieldsets();
      const after = all.slice(all.indexOf(this._active) + 1).find((item) => !item.disabled);
      this._active = after ?? items[items.length - 1] ?? null;
    }
    const index = items.indexOf(this._active);
    const last = index === items.length - 1;
    for (const item of this._fieldsets()) item.hidden = item !== this._active;
    for (const button of this._buttons()) {
      if (button.value === 'previous') button.hidden = index <= 0;
      else if (button.value === 'skip') button.hidden = last || !this._active || this._required(this._active);
      else if (button.value === 'next') button.hidden = last;
      else button.hidden = !last;
    }
    this._progressText.textContent = this.options.progressLabel
      .replace('{current}', String(index + 1))
      .replace('{total}', String(items.length));
    this._progressBar.max = Math.max(items.length, 1);
    this._progressBar.value = index + 1;
  }

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

  // Enter in a field moves on instead of submitting the form early.
  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
    if (!(e.target instanceof HTMLInputElement) || this.index >= this.items.length - 1) return;
    e.preventDefault();
    this.next();
  };

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
    this._render();
    this._validate(item);
  };

  // An answer clears the question's error.
  private _handleInput = (e: Event) => {
    this._syncRequired();
    const item = (e.target as Element).closest?.('fieldset');
    if (item instanceof HTMLFieldSetElement && item.classList.contains('invalid')) this._setInvalid(item, false);
  };
}
