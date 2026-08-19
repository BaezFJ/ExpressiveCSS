import { Utils } from '../core/utils';

/**
 * Drag-to-dismiss for side sheets (`dialog.side-sheet` / `.right` / `.left`).
 *
 * Grab the header or the inner 24dp edge and drag toward the docked side.
 * Past 96dp, or a flick, closes. Light-dismiss on the scrim stays with
 * {@link Dialogs}.
 */
export class SideSheets {
  private static _drag: {
    dialog: HTMLDialogElement;
    pointerId: number;
    startX: number;
    lastX: number;
    lastT: number;
    shift: number;
    startDocked: boolean;
  } | null = null;

  static Init() {
    Utils.onDocumentReady(() => {
      document.addEventListener('pointerdown', SideSheets._onDown, { passive: true });
      document.addEventListener('pointermove', SideSheets._onMove, { passive: true });
      document.addEventListener('pointerup', SideSheets._onUp, { passive: true });
      document.addEventListener('pointercancel', SideSheets._onCancel, { passive: true });
    });
  }

  static _onDown(event: PointerEvent) {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const dialog = SideSheets._sheet(event.target);
    if (!dialog?.open) {
      SideSheets._drag = null;
      return;
    }
    if (!SideSheets._inHandle(event, dialog)) {
      SideSheets._drag = null;
      return;
    }
    dialog.style.transition = 'none';
    SideSheets._drag = {
      dialog,
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastT: Date.now(),
      shift: 0,
      startDocked: SideSheets._startDocked(dialog)
    };
  }

  static _onMove(event: PointerEvent) {
    const drag = SideSheets._drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    const shift = drag.startDocked ? Math.min(0, delta) : Math.max(0, delta);
    drag.shift = shift;
    drag.lastX = event.clientX;
    drag.lastT = Date.now();
    drag.dialog.style.setProperty('--md-comp-side-sheet-shift', `${shift}px`);
  }

  static _onUp(event: PointerEvent) {
    const drag = SideSheets._drag;
    SideSheets._drag = null;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dialog = drag.dialog;
    dialog.style.transition = '';
    const dt = Math.max(1, Date.now() - drag.lastT);
    const velocity = (event.clientX - drag.lastX) / dt;
    const dismiss = drag.startDocked
      ? drag.shift < -96 || velocity < -0.5
      : drag.shift > 96 || velocity > 0.5;
    if (dismiss && dialog.open) {
      dialog.close();
    }
    dialog.style.setProperty('--md-comp-side-sheet-shift', '0px');
  }

  static _onCancel() {
    const drag = SideSheets._drag;
    SideSheets._drag = null;
    if (!drag) return;
    drag.dialog.style.transition = '';
    drag.dialog.style.setProperty('--md-comp-side-sheet-shift', '0px');
  }

  private static _sheet(target: EventTarget | null): HTMLDialogElement | null {
    if (!(target instanceof Element)) return null;
    const dialog = target.closest(
      'dialog.side-sheet, dialog.right, dialog.right-sheet, dialog.left, dialog.left-sheet'
    );
    return dialog instanceof HTMLDialogElement ? dialog : null;
  }

  private static _startDocked(dialog: HTMLDialogElement): boolean {
    return (
      dialog.classList.contains('left') ||
      dialog.classList.contains('left-sheet') ||
      dialog.classList.contains('start')
    );
  }

  private static _inHandle(event: PointerEvent, dialog: HTMLDialogElement): boolean {
    const target = event.target;
    if (target instanceof Element && target.closest('header')) return true;
    const rect = dialog.getBoundingClientRect();
    if (SideSheets._startDocked(dialog)) {
      return event.clientX >= rect.right - 24 && event.clientX <= rect.right;
    }
    return event.clientX >= rect.left && event.clientX <= rect.left + 24;
  }
}
