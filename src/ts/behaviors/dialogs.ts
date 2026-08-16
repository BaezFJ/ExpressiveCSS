import { Utils } from '../core/utils';

type ClosedBy = 'any' | 'closerequest' | 'none';

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
 */
export class Dialogs {
  private static _down: { dialog: HTMLDialogElement; pointerId: number } | null = null;

  static Init() {
    Utils.onDocumentReady(() => {
      document.addEventListener('pointerdown', Dialogs._onPointerDown, { passive: true });
      document.addEventListener('pointerup', Dialogs._onPointerUp, { passive: true });
      document.addEventListener('pointercancel', Dialogs._onPointerCancel, { passive: true });
    });
  }

  static _onPointerDown(event: PointerEvent) {
    if (!Dialogs._isPrimaryPress(event)) {
      Dialogs._down = null;
      return;
    }
    const dialog = Dialogs._backdropDialog(event);
    if (!dialog || !Dialogs._lightDismissible(dialog) || !Dialogs._outside(event, dialog)) {
      Dialogs._down = null;
      return;
    }
    Dialogs._down = { dialog, pointerId: event.pointerId };
  }

  static _onPointerUp(event: PointerEvent) {
    const started = Dialogs._down;
    Dialogs._down = null;
    if (!started || started.pointerId !== event.pointerId) return;
    if (!event.isPrimary) return;
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
    const target = event.target;
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

  private static _lightDismissible(dialog: HTMLDialogElement): boolean {
    const value = Dialogs._closedBy(dialog);
    if (value === 'none' || value === 'closerequest') return false;
    // Native closedby="any" already light-dismisses with the same
    // "both ends outside" rule. Don't race it.
    if (value === 'any' && 'closedBy' in HTMLDialogElement.prototype) return false;
    return true;
  }

  // Read the attribute only. The IDL default for an unset closedby is
  // "closerequest" (Escape, no light dismiss) — treating that as an
  // author opt-out made every dialog undismissable from the scrim.
  private static _closedBy(dialog: HTMLDialogElement): ClosedBy | null {
    const attr = dialog.getAttribute('closedby');
    if (attr === 'any' || attr === 'closerequest' || attr === 'none') return attr;
    return null;
  }
}
