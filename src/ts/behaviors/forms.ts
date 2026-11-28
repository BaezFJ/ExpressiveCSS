import { Utils, toggleIdRef } from '../core/utils';

export class Forms {
  /**
   * Validates a `.validate` field: marks it `invalid` and `aria-invalid`
   * when it fails its constraints or `data-length`, and clears both when it
   * passes. An empty optional field never fails. The field is described by
   * its `[data-error]` supporting text, so the error the CSS shows there is
   * read with it. A drop zone's file rules are DropZone's, in
   * `@expressivecss/extras`.
   * @param textfield
   */
  static validateField(textfield: HTMLInputElement) {
    if (!textfield) {
      console.error('No text field element found');
      return;
    }
    if (!textfield.classList.contains('validate')) return;
    Forms._markInvalid(textfield, Forms._fails(textfield));
    Forms._describeByError(textfield);
  }

  private static _markInvalid(field: HTMLInputElement, invalid: boolean) {
    field.classList.toggle('invalid', invalid);
    if (invalid) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  /** Whether a field fails its constraints or is longer than `data-length`. */
  private static _fails(field: HTMLInputElement) {
    return !Forms._blankOptional(field) && (!field.validity.valid || field.value.length > parseInt(field.getAttribute('data-length')));
  }

  /** An empty field that is not required, and holds no half-typed number or date, never fails. */
  private static _blankOptional(field: HTMLInputElement) {
    return field.value.length === 0 && !field.validity.badInput && !field.required;
  }

  /** Adds the field's `[data-error]` supporting text to its aria-describedby. */
  private static _describeByError(field: HTMLInputElement) {
    const error = field.parentElement?.querySelector(':scope > [data-error]');
    if (error) toggleIdRef(field, 'aria-describedby', Forms._idOf(error), true);
  }

  private static _idOf(el: Element) {
    if (!el.id) el.id = `field-error-${Utils.guid()}`;
    return el.id;
  }

  /**
   * Resizes the given TextArea after updating the
   *  value content dynamically.
   * @param e EventTarget
   */
  static textareaAutoResize(e: EventTarget) {
    const textarea = e as HTMLTextAreaElement;
    if (!textarea) return;

    // Measure the textarea against itself: collapse it to its natural height,
    // then read the content height back. `.expressive-textarea` is
    // `overflow-y: hidden`, so scrollHeight is the full content height and
    // offsetHeight - clientHeight is exactly the borders (no scrollbar to
    // account for) - which border-box sizing needs added back.
    //
    // This replaces a mirror div that the value was copied into via
    // `innerHTML = innerHTML.replace(...)` - a full serialize and reparse of
    // the text on every keystroke, plus getComputedStyle and seven style
    // writes, run twice per keystroke because it was bound to keydown and
    // keyup both.
    if (!textarea.hasAttribute('original-height')) Forms._measureTextarea(textarea);
    // Not measured yet when it was hidden.
    const originalHeight = parseInt(textarea.getAttribute('original-height'));
    if (isNaN(originalHeight)) return;

    textarea.style.height = 'auto';
    // Three reads after a single write: one layout flush for the whole resize.
    const borders = textarea.offsetHeight - textarea.clientHeight;
    const contentHeight = textarea.scrollHeight + borders;
    textarea.style.height = Math.max(originalHeight, contentHeight) + 'px';
  }

  // A hidden textarea (closed dialog, inactive tab) measures 0. Storing that
  // would pin it collapsed, so it waits for a focus or input to measure.
  private static _measureTextarea(textarea: HTMLTextAreaElement) {
    const height = textarea.getBoundingClientRect().height;
    if (height) textarea.setAttribute('original-height', height.toString());
  }

  private static _initialized = false;
  /** Textareas and file inputs already given their listeners, so a second Init adds none. */
  private static _wired = new WeakSet<Element>();
  // Submit and reset do not leave a shadow root, so the document never hears
  // them. Adding the same listener again does nothing.
  private static _bindShadowForm(input: HTMLInputElement) {
    if (!(input.getRootNode() as ShadowRoot).host) return;
    for (const type of ['submit', 'reset']) input.form?.addEventListener(type, Forms.resetFormExtras, true);
  }

  private static _afterReset(form: HTMLFormElement) {
    const fields = Array.from(form.elements);
    fields.filter((field) => field.classList.contains('validate'))
      .forEach((field: HTMLInputElement) => Forms._markInvalid(field, false));
    fields.filter((field) => field.classList.contains('expressive-textarea')).forEach(Forms.textareaAutoResize);
    const summary = form.querySelector<HTMLElement>('.error-summary');
    if (!summary) return;
    summary.hidden = true;
    summary.querySelector('ul, ol')?.replaceChildren();
  }

  /**
   * Safe to call more than once: the root entry calls it on import, and a page
   * that also loads the modular entry may call it again.
   */
  static Init() {
    if (Forms._initialized) return;
    Forms._initialized = true;
    Utils.onDocumentReady(() => {
      document.addEventListener('change', (e: Event) => {
        const target = Utils.eventTarget(e);
        if (!(target instanceof HTMLInputElement)) return;
        // DropZone, in @expressivecss/extras, validates these with their file rules.
        if (target.matches('.drop-zone input[type="file"]')) return;
        // The sibling-label loop that used to live here compared
        // `tagName == 'label'` (tagName is uppercase) so it never matched,
        // and no rule in the Sass styles `label.active` anyway - the
        // floating label is driven by CSS, not by a class from here.
        Forms.validateField(target);
      });

      document.addEventListener('click', Forms.togglePassword);
      document.addEventListener('click', Forms.stepNumber);
      // Capture, so the password is hidden again before any submit handler
      // reads the form or the browser offers to save it.
      document.addEventListener('submit', Forms.resetFormExtras, true);
      document.addEventListener('submit', Forms.summarizeErrors, true);
      document.addEventListener('click', Forms.focusSummaryField);
      document.addEventListener('reset', Forms.resetFormExtras, true);

      document.querySelectorAll('.expressive-textarea').forEach((textArea: HTMLTextAreaElement) => {
        Forms.InitTextarea(textArea);
      });

      // File Input Path
      document
        .querySelectorAll('.file-field input[type="file"]')
        .forEach((fileInput: HTMLInputElement) => {
          Forms.InitFileInputPath(fileInput);
        });
    });
  }

  /**
   * A .password-toggle button shows or hides the password in its field. The
   * button's own name stays put ("Show password"); aria-pressed carries the
   * state, so there is no generated text to translate.
   */
  static togglePassword(e: MouseEvent) {
    const button = Utils.closestInPath(e, '.password-toggle');
    const input = button?.closest('.field')?.querySelector<HTMLInputElement>(
      'input[type="password"], input[data-password]'
    );
    if (!input) return;
    Forms._bindShadowForm(input);
    const show = input.type === 'password';
    // Marked so the input is still found once it has become type="text".
    input.toggleAttribute('data-password', show);
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(show));
  }

  /**
   * A [data-step="up"] or [data-step="down"] button in a .field steps the
   * field's number input as the arrow keys would, within min, max and step,
   * and fires input and change if the value moved. A disabled, read-only or step="any" input
   * is left alone; stepUp() would throw on step="any".
   */
  static stepNumber(e: MouseEvent) {
    const button = Utils.closestInPath(e, '.field > [data-step]:not(:disabled)') as HTMLElement | null;
    const input = button?.parentElement!.querySelector<HTMLInputElement>(
      ':scope > input[type="number"]:not(:disabled, [readonly], [step="any"])'
    );
    if (!input) return;
    const before = input.value;
    input[button!.dataset.step === 'down' ? 'stepDown' : 'stepUp']();
    if (input.value === before) return;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * A revealed password goes back to type="password" when its form is
   * submitted or reset, so it is never sent or autofilled as plain text and
   * a reset field does not stay revealed. Reset fires no input or change
   * event, so a reset form also drops its `.validate` errors and
   * error summary, and fits each auto-resizing textarea to its restored text.
   * That cleanup waits for the native reset and respects later cancellation.
   */
  static resetFormExtras(e: Event) {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    form.querySelectorAll<HTMLInputElement>('input[data-password]').forEach((input) => {
      input.removeAttribute('data-password');
      input.type = 'password';
      input.closest('.field')?.querySelector('.password-toggle')?.setAttribute('aria-pressed', 'false');
    });
    if (e.type === 'reset') {
      // Native events can run microtasks between listeners, before a later cancellation.
      setTimeout(() => {
        if (!e.defaultPrevented) Forms._afterReset(form);
      }, 0);
    }
  }

  /**
   * Error summary. A `novalidate` form holding a `.error-summary` is checked
   * when it is submitted. While any field is invalid the submit stops, as it
   * would natively, and the summary's list gets one link per invalid field,
   * "Label: browser message", before the summary is shown and focused. A
   * valid submit hides it again. A submitter with `formnovalidate` skips the
   * check.
   */
  static summarizeErrors(e: SubmitEvent) {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const summary = form.querySelector<HTMLElement>('.error-summary');
    const list = summary?.querySelector('ul, ol');
    if (!list || e.submitter?.hasAttribute('formnovalidate')) return;
    // checkValidity fires `invalid` on each field, which FormSelect needs to
    // mark its generated field.
    if (form.checkValidity()) {
      summary.hidden = true;
      list.replaceChildren();
      return;
    }
    e.preventDefault();
    // Stop here, in the capture phase, so the page's own submit handlers do
    // not run for a form the browser would not have submitted.
    e.stopPropagation();
    const seen = new Set<string>();
    const items = [...form.elements].flatMap((field: HTMLInputElement) => {
      if (!field.willValidate || field.validity.valid) return [];
      // One entry per radio group.
      if (field.type === 'radio') {
        if (seen.has(field.name)) return [];
        seen.add(field.name);
      }
      if (!field.id) field.id = `field-${Utils.guid()}`;
      const group = field.type === 'radio' ? field.closest('fieldset')?.querySelector('legend') : null;
      // An enhanced select's label names the generated input, so fall back to
      // the label in the same .field.
      const named = group ?? field.labels?.[0] ?? field.closest('.field')?.querySelector('label');
      // A label can wrap its control; a select's options are not its name.
      const text = named?.cloneNode(true) as Element;
      text?.querySelectorAll('select, textarea').forEach((control) => control.remove());
      const label = text?.textContent ?? field.getAttribute('aria-label') ?? '';
      const link = document.createElement('a');
      link.href = `#${field.id}`;
      link.textContent = [label.replace(/\s+/g, ' ').trim(), field.validationMessage].filter(Boolean).join(': ');
      const item = document.createElement('li');
      item.append(link);
      return [item];
    });
    list.replaceChildren(...items);
    if (!summary.hasAttribute('tabindex')) summary.tabIndex = -1;
    summary.hidden = false;
    summary.focus();
  }

  /**
   * A summary link focuses its field instead of only scrolling to it. An
   * enhanced select passes that focus on to its generated input itself.
   */
  static focusSummaryField(e: MouseEvent) {
    const link = Utils.closestInPath(e, '.error-summary a[href^="#"]');
    const field = link && Utils.getElementById(link, link.getAttribute('href').slice(1));
    if (!field) return;
    e.preventDefault();
    field.focus();
  }

  static InitTextarea(textarea: HTMLTextAreaElement) {
    // Measured afresh by textareaAutoResize, which skips a hidden textarea.
    textarea.removeAttribute('original-height');
    Forms.textareaAutoResize(textarea);
    if (Forms._wired.has(textarea)) return;
    Forms._wired.add(textarea);
    // `input` rather than keydown + keyup: it fires once per actual value
    // change and also covers paste, drag-drop and IME composition, which the
    // key events missed.
    textarea.addEventListener('input', (e) => Forms.textareaAutoResize(e.target));
    // One that was hidden at init gets its first measurement once shown.
    textarea.addEventListener('focus', () => {
      if (!textarea.hasAttribute('original-height')) Forms.textareaAutoResize(textarea);
    });
  }

  static InitFileInputPath(fileInput: HTMLInputElement) {
    if (Forms._wired.has(fileInput)) return;
    Forms._wired.add(fileInput);
    fileInput.addEventListener('change', () => {
      const fileField = fileInput.closest('.file-field');
      const pathInput = fileField?.querySelector<HTMLInputElement>('input.file-path');
      if (!pathInput) return;
      pathInput.value = Array.from(fileInput.files, (f) => f.name).join(', ');
      pathInput.dispatchEvent(
        new Event('change', { bubbles: true, cancelable: true, composed: true })
      );
    });
  }
}
