import { Utils } from '../core/utils';

export class Forms {
  /**
   * Checks if the label has validation and apply
   * the correct class and styles
   * @param textfield
   */
  static validateField(textfield: HTMLInputElement) {
    if (!textfield) {
      console.error('No text field element found');
      return;
    }

    const hasLength = textfield.getAttribute('data-length') !== null;
    const lenAttr = parseInt(textfield.getAttribute('data-length'));
    const len = textfield.value.length;

    if (
      len === 0 &&
      textfield.validity.badInput === false &&
      !textfield.required &&
      textfield.classList.contains('validate')
    ) {
      textfield.classList.remove('invalid');
    } else if (textfield.classList.contains('validate')) {
      // Check for character counter attributes
      if (
        (textfield.validity.valid && hasLength && len <= lenAttr) ||
        (textfield.validity.valid && !hasLength)
      ) {
        textfield.classList.remove('invalid');
      } else {
        textfield.classList.add('invalid');
      }
    }
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
    if (!textarea.hasAttribute('original-height')) {
      textarea.setAttribute('original-height', textarea.getBoundingClientRect().height.toString());
    }
    const originalHeight = parseInt(textarea.getAttribute('original-height'));
    if (isNaN(originalHeight)) return;

    textarea.style.height = 'auto';
    // Three reads after a single write: one layout flush for the whole resize.
    const borders = textarea.offsetHeight - textarea.clientHeight;
    const contentHeight = textarea.scrollHeight + borders;
    textarea.style.height = Math.max(originalHeight, contentHeight) + 'px';
  }

  static Init() {
    Utils.onDocumentReady(() => {
      document.addEventListener('change', (e: KeyboardEvent) => {
        const target = <HTMLInputElement>e.target;
        if (target instanceof HTMLInputElement) {
          // The sibling-label loop that used to live here compared
          // `tagName == 'label'` (tagName is uppercase) so it never matched,
          // and no rule in the Sass styles `label.active` anyway - the
          // floating label is driven by CSS, not by a class from here.
          Forms.validateField(target);
        }
      });

      document.addEventListener('keyup', (e: KeyboardEvent) => {
        const target = <HTMLInputElement>e.target;
        // Radio and Checkbox focus class
        if (target instanceof HTMLInputElement && ['radio', 'checkbox'].includes(target.type)) {
          // TAB, check if tabbing to radio or checkbox.
          if (Utils.keys.TAB.includes(e.key)) {
            target.classList.add('tabbed');
            target.addEventListener('blur', () => target.classList.remove('tabbed'), {
              once: true
            });
          }
        }
      });

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

  static InitTextarea(textarea: HTMLTextAreaElement) {
    // Save Data in Element
    textarea.setAttribute('original-height', textarea.getBoundingClientRect().height.toString());
    Forms.textareaAutoResize(textarea);
    // `input` rather than keydown + keyup: it fires once per actual value
    // change and also covers paste, drag-drop and IME composition, which the
    // key events missed.
    textarea.addEventListener('input', (e) => Forms.textareaAutoResize(e.target));
  }

  static InitFileInputPath(fileInput: HTMLInputElement) {
    fileInput.addEventListener('change', () => {
      const fileField = fileInput.closest('.file-field');
      const pathInput = <HTMLInputElement>fileField.querySelector('input.file-path');
      const files = fileInput.files;
      const filenames = [];
      for (let i = 0; i < files.length; i++) {
        filenames.push(files[i].name);
      }
      pathInput.value = filenames.join(', ');
      pathInput.dispatchEvent(
        new Event('change', { bubbles: true, cancelable: true, composed: true })
      );
    });
  }
}
