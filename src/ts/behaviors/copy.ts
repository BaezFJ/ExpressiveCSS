import { Snackbar } from '../components/snackbar';
import { Utils } from '../core/utils';

/**
 * Copy buttons. A click on `[data-copy]` writes that attribute's text to the
 * clipboard; a click on `[data-copy-for="id"]` writes the named element's
 * value (fields) or text content (anything else). A snackbar confirms the
 * result, which is also what screen readers announce: it is a polite status.
 * `Copy.i18n` holds its two texts; `data-copy-message` and `data-copy-error`
 * replace them for one button.
 */
export class Copy {
  static i18n = { copied: 'Copied', failed: "Couldn't copy" };
  // A second Init adds nothing: addEventListener ignores a listener it has.
  static Init() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', Copy._onClick);
  }

  /** The text a copy button would write, or null when it names nothing. */
  static textFor(button: Element): string | null {
    if (button.hasAttribute('data-copy')) return button.getAttribute('data-copy');
    const source = Utils.getElementById(button, button.getAttribute('data-copy-for') ?? '');
    if (!source) return null;
    return source instanceof HTMLInputElement ||
      source instanceof HTMLTextAreaElement ||
      source instanceof HTMLSelectElement
      ? source.value
      : (source.textContent ?? '').trim();
  }

  private static async _onClick(e: MouseEvent) {
    const button = Utils.closestInPath(e, '[data-copy], [data-copy-for]');
    if (!button || button.matches(':disabled, [aria-disabled="true"]')) return;
    const text = Copy.textFor(button);
    if (text === null) return;
    let copied = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard API outside a secure context, or permission refused.
      copied = false;
    }
    new Snackbar({
      text: copied
        ? button.getAttribute('data-copy-message') || Copy.i18n.copied
        : button.getAttribute('data-copy-error') || Copy.i18n.failed,
      root: button as HTMLElement,
      // A second copy answers at once rather than waiting behind the first.
      replace: true
    });
    Utils.emit(button, 'copy', { text, copied });
  }
}
