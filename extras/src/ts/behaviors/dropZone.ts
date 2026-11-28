import { Utils, toggleIdRef } from '@expressivecss/expressive/core';
import { Forms } from '@expressivecss/expressive/modular';

const ZONE_INPUT = '.drop-zone input[type="file"]';
const FILE_RULES = `${ZONE_INPUT}:is([data-validate-types], [data-max-size], [data-max-files])`;

interface FileFailure {
  rejected: File[];
  reason: 'type' | 'size' | 'count';
  message: string;
}

function fileLimit(input: HTMLInputElement, attribute: string) {
  const value = (input.getAttribute(attribute) || '').trim();
  if (!/^\d+$/.test(value)) return 0;
  const limit = Number(value);
  return Number.isSafeInteger(limit) ? limit : 0;
}

function fileSpecifier(value: string) {
  if (value.endsWith('/*')) return /^(image|audio|video)\/\*$/.test(value);
  return /^\.[^\s/\\]+$/.test(value) ||
    /^[!#$%&'*+.^_`|~0-9a-z-]+\/[!#$%&'*+.^_`|~0-9a-z-]+$/.test(value);
}

function fileMatches(file: File, specifier: string) {
  if (specifier.startsWith('.')) return file.name.toLowerCase().endsWith(specifier);
  if (specifier.endsWith('/*')) return file.type.toLowerCase().startsWith(specifier.slice(0, -1));
  return file.type.toLowerCase() === specifier;
}

function markInvalid(field: HTMLInputElement, invalid: boolean) {
  field.classList.toggle('invalid', invalid);
  if (invalid) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');
}

function idOf(el: Element) {
  if (!el.id) el.id = `field-error-${Utils.guid()}`;
  return el.id;
}

/**
 * The drop zone's document behavior: it shows a drag over a `.drop-zone`,
 * lists the chosen files in its `.drop-zone-files`, validates the type, size
 * and count rules a marked file input carries, and clears all of it after a
 * form reset. Core's Forms validates the zone's other file inputs as usual.
 */
export class DropZone {
  private static _initialized = false;
  private static _fileErrors = new WeakMap<HTMLInputElement, string>();
  private static _fileSelections = new WeakMap<HTMLInputElement, { files: File[]; constraints: string }>();

  /**
   * Refreshes a drop-zone file input after script changes its files or rules:
   * a marked input validates its type, size and count rules and synchronizes
   * its native custom validity and the zone's error text, without emitting
   * events. Any other input goes to `Forms.validateField`.
   */
  static validateField(input: HTMLInputElement) {
    if (!input) {
      console.error('No text field element found');
      return;
    }
    if (DropZone._validatedFile(input)) {
      DropZone._validateFiles(input);
      return;
    }
    Forms.validateField(input);
  }

  private static _validatedFile(input: HTMLInputElement) {
    return input.matches(FILE_RULES) || DropZone._fileErrors.has(input);
  }

  private static _rejectedTypes(input: HTMLInputElement) {
    const accepted = input.accept.split(',').map((value) => value.trim().toLowerCase()).filter(fileSpecifier);
    if (!accepted.length) return [];
    return Array.from(input.files ?? []).filter((file) => !accepted.some((specifier) => fileMatches(file, specifier)));
  }

  private static _validateFiles(input: HTMLInputElement) {
    if (input.matches(':disabled')) return;
    DropZone._bindShadowForm(input);
    const failure = DropZone._checkFiles(input);
    DropZone._showFileError(input, failure?.message ?? input.validationMessage);
    return failure;
  }

  private static _checkFiles(input: HTMLInputElement) {
    DropZone._clearFileError(input);
    if (!input.matches(FILE_RULES)) {
      DropZone._fileErrors.delete(input);
      return;
    }
    DropZone._fileErrors.set(input, '');
    const failure = DropZone._fileFailure(input);
    if (failure) DropZone._setFileError(input, failure.message);
    return failure;
  }

  private static _fileFailure(input: HTMLInputElement) {
    return DropZone._typeFailure(input) ?? DropZone._sizeFailure(input) ?? DropZone._countFailure(input);
  }

  private static _typeFailure(input: HTMLInputElement): FileFailure | undefined {
    if (!input.hasAttribute('data-validate-types')) return;
    const rejected = DropZone._rejectedTypes(input);
    if (rejected.length) return { rejected, reason: 'type', message: DropZone._fileTypeMessage(input) };
  }

  private static _sizeFailure(input: HTMLInputElement): FileFailure | undefined {
    const limit = fileLimit(input, 'data-max-size');
    if (!limit) return;
    const rejected = Array.from(input.files ?? []).filter((file) => file.size > limit);
    if (!rejected.length) return;
    return { rejected, reason: 'size', message: DropZone._fileSizeMessage(input, limit) };
  }

  private static _fileSizeMessage(input: HTMLInputElement, limit: number) {
    return DropZone._fileError(input)?.getAttribute('data-error-size')?.trim() || `Maximum file size: ${limit} bytes.`;
  }

  private static _countFailure(input: HTMLInputElement): FileFailure | undefined {
    const limit = fileLimit(input, 'data-max-files');
    if (!limit) return;
    const rejected = Array.from(input.files ?? []);
    if (rejected.length > limit) return { rejected, reason: 'count', message: DropZone._fileCountMessage(input, limit) };
  }

  private static _fileCountMessage(input: HTMLInputElement, limit: number) {
    return DropZone._fileError(input)?.getAttribute('data-error-count')?.trim() || `Maximum file count: ${limit}.`;
  }

  private static _clearFileError(input: HTMLInputElement) {
    const owned = DropZone._fileErrors.get(input);
    if (owned && owned === input.validationMessage) input.setCustomValidity('');
  }

  private static _setFileError(input: HTMLInputElement, message: string) {
    if (input.validity.customError) return;
    input.setCustomValidity(message);
    DropZone._fileErrors.set(input, message);
  }

  private static _fileTypeMessage(input: HTMLInputElement) {
    const error = DropZone._fileError(input);
    return error?.getAttribute('data-error')?.trim() || `Choose files matching: ${input.accept}.`;
  }

  private static _fileError(input: HTMLInputElement) {
    return Array.from(input.closest('.drop-zone')?.children ?? [])
      .find((child) => child.hasAttribute('data-error')) as HTMLElement | undefined;
  }

  private static _showFileError(input: HTMLInputElement, message: string) {
    markInvalid(input, !input.validity.valid);
    const error = DropZone._fileError(input);
    if (!error) return;
    toggleIdRef(input, 'aria-describedby', idOf(error), true);
    error.textContent = message;
    error.hidden = !message;
  }

  private static _onFileInput = (event: Event) => {
    const input = Utils.closestInPath<HTMLInputElement>(event, ZONE_INPUT);
    if (!input) return;
    if (input.matches(':disabled')) return;
    DropZone._update(input);
  };

  private static _update(input: HTMLInputElement) {
    DropZone._bindShadowForm(input);
    const zone = input.closest('.drop-zone');
    const files = Array.from(input.files ?? []);
    const failure = DropZone._validate(input);
    DropZone.listFiles(zone, input);
    DropZone._reportFileRejection(input, files, failure);
  }

  private static _validate(input: HTMLInputElement) {
    if (DropZone._validatedFile(input)) return DropZone._validateFiles(input);
    Forms.validateField(input);
  }

  private static _reportFileRejection(input: HTMLInputElement, files: File[], failure?: FileFailure) {
    if (!input.matches(FILE_RULES)) {
      DropZone._fileSelections.delete(input);
      return;
    }
    if (!DropZone._newFileSelection(input, files)) return;
    if (!failure) return;
    Utils.emit(input.closest('.drop-zone'), 'reject', { input, files: files.slice(), rejected: failure.rejected.slice(), reason: failure.reason });
  }

  private static _newFileSelection(input: HTMLInputElement, files: File[]) {
    const constraints = JSON.stringify([input.hasAttribute('data-validate-types'), input.accept, fileLimit(input, 'data-max-size'), fileLimit(input, 'data-max-files')]);
    const previous = DropZone._fileSelections.get(input);
    DropZone._fileSelections.set(input, { files, constraints });
    return !previous || previous.constraints !== constraints || previous.files.length !== files.length ||
      !previous.files.every((file, index) => file === files[index]);
  }

  // Reset does not leave a shadow root, so the document never hears it.
  // Adding the same listener again does nothing.
  private static _bindShadowForm(input: HTMLInputElement) {
    if (!(input.getRootNode() as ShadowRoot).host) return;
    input.form?.addEventListener('reset', DropZone._onReset, true);
  }

  /** Clears a reset form's file lists and file errors once the native reset has run, unless it was cancelled. */
  private static _onReset = (e: Event) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    // Native events can run microtasks between listeners, before a later cancellation.
    setTimeout(() => {
      if (!e.defaultPrevented) DropZone._afterReset(form);
    }, 0);
  };

  private static _afterReset(form: HTMLFormElement) {
    Array.from(form.elements).filter((field): field is HTMLInputElement =>
      field instanceof HTMLInputElement && field.type === 'file').forEach(DropZone._resetFileInput);
  }

  private static _resetFileInput(input: HTMLInputElement) {
    if (input.files?.length) return;
    DropZone._fileSelections.delete(input);
    DropZone._resetFileList(input);
    DropZone._resetFileValidity(input);
  }

  private static _resetFileList(input: HTMLInputElement) {
    const zone = input.closest('.drop-zone');
    if (!zone) return;
    DropZone.listFiles(zone, input);
    zone.classList.remove('dragover');
  }

  private static _resetFileValidity(input: HTMLInputElement) {
    if (input.matches(':disabled')) return;
    if (!DropZone._validatedFile(input)) return;
    DropZone._clearFileError(input);
    DropZone._fileErrors.delete(input);
    DropZone._showFileError(input, input.validationMessage);
  }

  /**
   * Safe to call more than once: the extras entry calls it on import, and a
   * page that also loads the modular entry may call it again.
   */
  static Init() {
    if (DropZone._initialized) return;
    DropZone._initialized = true;
    Utils.onDocumentReady(() => {
      document.addEventListener('input', DropZone._onFileInput);
      // Core's Forms leaves drop-zone file inputs to this listener.
      document.addEventListener('change', DropZone._onFileInput);
      document.addEventListener('reset', DropZone._onReset, true);
      for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) {
        document.addEventListener(type, DropZone.markDrag);
      }
    });
  }

  /**
   * The native file input covers its .drop-zone, so the browser already takes
   * a dropped file. This only shows the drag: the input is the topmost
   * element, so every drag event over the zone targets it and leaving it is
   * leaving the zone.
   */
  static markDrag(e: DragEvent) {
    const input = Utils.eventTarget(e);
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    const zone = input.closest('.drop-zone');
    if (!zone) return;
    const over = e.type === 'dragenter' || e.type === 'dragover';
    zone.classList.toggle('dragover', over && !input.disabled);
  }

  /** Lists the chosen files, name and size, in the zone's .drop-zone-files. */
  static listFiles(zone: Element, input: HTMLInputElement) {
    const list = Array.from(zone.querySelectorAll('.drop-zone-files')).find((list) => list.closest('.drop-zone') === zone);
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
}
