import { Utils } from '../core/utils';

const FILE_TYPES = '.drop-zone input[type="file"][data-validate-types]';

function fileSpecifier(value: string) {
  return /^\.[^\s/\\]+$/.test(value) || /^(image|audio|video)\/\*$/.test(value) ||
    /^[!#$%&'+.^_`|~0-9a-z-]+\/[!#$%&'+.^_`|~0-9a-z-]+$/.test(value);
}

function fileMatches(file: File, specifier: string) {
  if (specifier.startsWith('.')) return file.name.toLowerCase().endsWith(specifier);
  if (specifier.endsWith('/*')) return file.type.toLowerCase().startsWith(specifier.slice(0, -1));
  return file.type.toLowerCase() === specifier;
}

export class Forms {
  /**
   * Validates a `.validate` field: marks it `invalid` and `aria-invalid`
   * when it fails its constraints or `data-length`, and clears both when it
   * passes. An empty optional field never fails. The field is described by
   * its `[data-error]` supporting text, so the error the CSS shows there is
   * read with it.
   * @param textfield
   */
  static validateField(textfield: HTMLInputElement) {
    if (!textfield) {
      console.error('No text field element found');
      return;
    }
    if (Forms._typedFile(textfield)) return Forms._validateFileTypes(textfield);
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
    if (error) Forms._addDescription(field, Forms._idOf(error));
  }

  private static _idOf(el: Element) {
    if (!el.id) el.id = `field-error-${Utils.guid()}`;
    return el.id;
  }

  /** Adds an id to a field's aria-describedby once, after the page's own. */
  private static _addDescription(field: HTMLInputElement, id: string) {
    const ids = (field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    if (!ids.includes(id)) field.setAttribute('aria-describedby', [...ids, id].join(' '));
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
  private static _fileTypeErrors = new WeakMap<HTMLInputElement, string>();

  private static _typedFile(input: HTMLInputElement) {
    return input.matches(FILE_TYPES) || Forms._fileTypeErrors.has(input);
  }

  private static _rejectedFiles(input: HTMLInputElement) {
    const accepted = input.accept.split(',').map((value) => value.trim().toLowerCase()).filter(fileSpecifier);
    if (!accepted.length) return [];
    return Array.from(input.files ?? []).filter((file) => !accepted.some((specifier) => fileMatches(file, specifier)));
  }

  private static _validateFileTypes(input: HTMLInputElement) {
    if (input.matches(':disabled')) return;
    Forms._clearFileTypeError(input);
    if (!input.matches(FILE_TYPES)) {
      Forms._fileTypeErrors.delete(input);
      return;
    }
    Forms._fileTypeErrors.set(input, '');
    if (Forms._rejectedFiles(input).length) Forms._setFileTypeError(input);
  }

  private static _clearFileTypeError(input: HTMLInputElement) {
    const owned = Forms._fileTypeErrors.get(input);
    if (owned && owned === input.validationMessage) input.setCustomValidity('');
  }

  private static _setFileTypeError(input: HTMLInputElement) {
    if (input.validity.customError) return;
    const message = Forms._fileTypeMessage(input);
    input.setCustomValidity(message);
    Forms._fileTypeErrors.set(input, message);
  }

  private static _fileTypeMessage(input: HTMLInputElement) {
    const error = input.closest('.drop-zone').querySelector(':scope > [data-error]');
    return error?.getAttribute('data-error')?.trim() || `Choose files matching: ${input.accept}.`;
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
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.type === 'file') {
          const zone = target.closest('.drop-zone');
          if (zone) Forms.listDropZoneFiles(zone, target);
        }
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
      for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) {
        document.addEventListener(type, Forms.markDropZone);
      }

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
    const show = input.type === 'password';
    // Marked so the input is still found once it has become type="text".
    input.toggleAttribute('data-password', show);
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(show));
  }

  /**
   * A [data-step="up"] or [data-step="down"] button in a .field steps the
   * field's number input as the arrow keys would, within min, max and step,
   * and fires input and change. A disabled, read-only or step="any" input
   * is left alone; stepUp() would throw on step="any".
   */
  static stepNumber(e: MouseEvent) {
    const button = Utils.closestInPath(e, '.field > [data-step]:not(:disabled)') as HTMLElement | null;
    const input = button?.parentElement!.querySelector<HTMLInputElement>(
      ':scope > input[type="number"]:not(:disabled, [readonly], [step="any"])'
    );
    if (!input) return;
    input[button!.dataset.step === 'down' ? 'stepDown' : 'stepUp']();
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * A revealed password goes back to type="password" when its form is
   * submitted or reset, so it is never sent or autofilled as plain text and
   * a reset field does not stay revealed. A reset form also drops the file
   * lists it would otherwise leave showing: reset fires no change event.
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
      form.querySelectorAll('.drop-zone-files').forEach((list) => list.replaceChildren());
      form.querySelectorAll('.drop-zone.dragover').forEach((zone) => zone.classList.remove('dragover'));
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

  /**
   * The native file input covers its .drop-zone, so the browser already takes
   * a dropped file. This only shows the drag: the input is the topmost
   * element, so every drag event over the zone targets it and leaving it is
   * leaving the zone.
   */
  static markDropZone(e: DragEvent) {
    const input = Utils.eventTarget(e);
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    const zone = input.closest('.drop-zone');
    if (!zone) return;
    const over = e.type === 'dragenter' || e.type === 'dragover';
    zone.classList.toggle('dragover', over && !input.disabled);
  }

  /** Lists the chosen files, name and size, in the zone's .drop-zone-files. */
  static listDropZoneFiles(zone: Element, input: HTMLInputElement) {
    const list = zone.querySelector('.drop-zone-files');
    if (!list) return;
    const size = (bytes: number) => {
      const [value, unit] =
        bytes >= 1e6 ? [bytes / 1e6, 'megabyte'] : bytes >= 1e3 ? [bytes / 1e3, 'kilobyte'] : [bytes, 'byte'];
      return new Intl.NumberFormat(undefined, { style: 'unit', unit, maximumFractionDigits: 1 }).format(value);
    };
    list.replaceChildren(
      ...Array.from(input.files ?? [], (file) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        const meta = document.createElement('span');
        name.textContent = file.name;
        meta.textContent = size(file.size);
        item.append(name, meta);
        return item;
      })
    );
  }

  static InitTextarea(textarea: HTMLTextAreaElement) {
    // Measured afresh by textareaAutoResize, which skips a hidden textarea.
    textarea.removeAttribute('original-height');
    Forms.textareaAutoResize(textarea);
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
