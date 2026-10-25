import { Utils } from '../core/utils';

export interface ConfirmOptions {
  /** The question, shown as the supporting text. */
  text: string;
  /** An optional headline above the text. */
  headline?: string;
  /** The confirm button's label. Defaults to `Dialogs.i18n.confirm`. */
  confirm?: string;
  /** The cancel button's label. Defaults to `Dialogs.i18n.cancel`. */
  cancel?: string;
}

/** An element holding `text`, set as text so markup in it is never parsed. */
function textElement<K extends keyof HTMLElementTagNameMap>(tag: K, text: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

/** A submit button that closes its dialog with `value` as the return value. */
function actionButton(label: string, value: string): HTMLButtonElement {
  const button = textElement('button', label);
  button.type = 'submit';
  button.value = value;
  return button;
}

/**
 * Light-dismiss for native `<dialog>` elements.
 *
 * `showModal()` does not close on a backdrop tap. A naive `click` listener
 * on the dialog (where `::backdrop` events retarget) also fires when the
 * user starts a gesture on the dialog and releases on the scrim — selecting
 * text, missing a button, dragging a thumb. Both ends of the pointer
 * gesture must land outside the dialog's border box.
 *
 * Default is on. Opt out with `closedby="none"` or `closedby="closerequest"`.
 * If the browser already honours `closedby="any"`, we leave that alone.
 *
 * `Dialogs.confirm()` asks a yes-or-no question from script and needs no Init.
 */
export class Dialogs {
  /** The confirm dialog's default button labels. */
  static i18n = { confirm: 'OK', cancel: 'Cancel' };
  private static _down: { dialog: HTMLDialogElement; pointerId: number } | null = null;
  private static _confirms = 0;

  /**
   * Asks a yes-or-no question in a modal alert dialog. Resolves true on the
   * confirm button and false on Cancel, Escape or a scrim tap, then removes
   * the dialog. The browser returns focus to the element that had it.
   */
  static confirm(options: ConfirmOptions): Promise<boolean> {
    const dialog = Dialogs._confirmDialog(options);
    document.body.append(dialog);
    // A new dialog's returnValue is '', and Escape and close() leave it alone,
    // so only the confirm button sets it.
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener(
        'close',
        () => {
          dialog.remove();
          resolve(dialog.returnValue === 'confirm');
        },
        { once: true }
      );
    });
  }

  private static _confirmDialog({ text, headline, confirm, cancel }: ConfirmOptions): HTMLDialogElement {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('role', 'alertdialog');
    const id = `expressive-confirm-${++Dialogs._confirms}`;
    const body = textElement('p', text);
    body.id = `${id}-text`;
    const cancelButton = actionButton(cancel ?? Dialogs.i18n.cancel, '');
    cancelButton.className = 'text';
    // The less destructive action takes focus when the dialog opens.
    cancelButton.autofocus = true;
    const form = document.createElement('form');
    form.method = 'dialog';
    form.append(cancelButton, actionButton(confirm ?? Dialogs.i18n.confirm, 'confirm'));
    dialog.append(body, form);
    Dialogs._name(dialog, body, headline);
    return dialog;
  }

  /** Names the dialog by its headline and describes it by the text, or names it by the text alone. */
  private static _name(dialog: HTMLDialogElement, body: HTMLElement, headline?: string) {
    if (!headline) {
      dialog.setAttribute('aria-labelledby', body.id);
      return;
    }
    const heading = textElement('h2', headline);
    heading.id = body.id.replace(/-text$/, '-headline');
    dialog.prepend(heading);
    dialog.setAttribute('aria-labelledby', heading.id);
    dialog.setAttribute('aria-describedby', body.id);
  }

  static Init() {
    Utils.onDocumentReady(() => {
      document.addEventListener('pointerdown', Dialogs._onPointerDown, { passive: true });
      document.addEventListener('pointerup', Dialogs._onPointerUp, { passive: true });
      document.addEventListener('pointercancel', Dialogs._onPointerCancel, { passive: true });
    });
  }

  static _onPointerDown(event: PointerEvent) {
    const dialog = Dialogs._isPrimaryPress(event) ? Dialogs._backdropDialog(event) : null;
    Dialogs._down =
      dialog && Dialogs._lightDismissible(dialog) && Dialogs._outside(event, dialog)
        ? { dialog, pointerId: event.pointerId }
        : null;
  }

  static _onPointerUp(event: PointerEvent) {
    const started = Dialogs._down;
    Dialogs._down = null;
    if (!started || started.pointerId !== event.pointerId) return;
    if (!started.dialog.isConnected || !started.dialog.open) return;
    if (!Dialogs._lightDismissible(started.dialog)) return;
    if (Dialogs._backdropDialog(event) !== started.dialog) return;
    if (Dialogs._outside(event, started.dialog)) {
      started.dialog.close();
    }
  }

  static _onPointerCancel() {
    Dialogs._down = null;
  }

  /** Backdrop hits retarget to the dialog itself, never a child. */
  private static _backdropDialog(event: Event): HTMLDialogElement | null {
    const target = Utils.eventTarget(event);
    if (!(target instanceof HTMLDialogElement) || !target.open) return null;
    return target;
  }

  private static _outside(event: PointerEvent, dialog: HTMLDialogElement): boolean {
    const rect = dialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }

  private static _isPrimaryPress(event: PointerEvent): boolean {
    if (!event.isPrimary) return false;
    return event.pointerType !== 'mouse' || event.button === 0;
  }

  // Read the attribute only. The IDL default for an unset closedby is
  // "closerequest" (Escape, no light dismiss) — treating that as an
  // author opt-out made every dialog undismissable from the scrim.
  // Native closedby="any" already light-dismisses with the same "both ends
  // outside" rule, so leave it to the browser where it has one.
  private static _lightDismissible(dialog: HTMLDialogElement): boolean {
    const value = dialog.getAttribute('closedby');
    if (value === 'any') return !('closedBy' in HTMLDialogElement.prototype);
    return value !== 'none' && value !== 'closerequest';
  }
}
