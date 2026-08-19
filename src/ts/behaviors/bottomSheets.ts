import { Utils } from '../core/utils';

/**
 * Drag-to-dismiss for `dialog.bottom-sheet` / `dialog.bottom`.
 *
 * The handle is the top 48dp of the sheet (or an explicit `.handle`).
 * A downward drag past 96dp, or a flick, closes. Anything else snaps back.
 * Content below the handle scrolls normally. Light-dismiss on the scrim
 * stays with {@link Dialogs}.
 */
export class BottomSheets {
  private static _drag: {
    dialog: HTMLDialogElement;
    pointerId: number;
    startY: number;
    lastY: number;
    lastT: number;
    shift: number;
  } | null = null;

  static Init() {
    Utils.onDocumentReady(() => {
      document.addEventListener('pointerdown', BottomSheets._onDown, { passive: true });
      document.addEventListener('pointermove', BottomSheets._onMove, { passive: true });
      document.addEventListener('pointerup', BottomSheets._onUp, { passive: true });
      document.addEventListener('pointercancel', BottomSheets._onCancel, { passive: true });
    });
  }

  static _onDown(event: PointerEvent) {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const dialog = BottomSheets._sheet(event.target);
    if (!dialog?.open) {
      BottomSheets._drag = null;
      return;
    }
    if (!BottomSheets._inHandle(event, dialog)) {
      BottomSheets._drag = null;
      return;
    }
    dialog.style.transition = 'none';
    BottomSheets._drag = {
      dialog,
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastT: Date.now(),
      shift: 0
    };
  }

  static _onMove(event: PointerEvent) {
    const drag = BottomSheets._drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shift = Math.max(0, event.clientY - drag.startY);
    drag.shift = shift;
    drag.lastY = event.clientY;
    drag.lastT = Date.now();
    drag.dialog.style.setProperty('--md-comp-bottom-sheet-shift', `${shift}px`);
  }

  static _onUp(event: PointerEvent) {
    const drag = BottomSheets._drag;
    BottomSheets._drag = null;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dialog = drag.dialog;
    dialog.style.transition = '';
    const dt = Math.max(1, Date.now() - drag.lastT);
    const velocity = (event.clientY - drag.lastY) / dt;
    const dismiss = drag.shift > 96 || velocity > 0.5;
    if (dismiss && dialog.open) {
      dialog.close();
    }
    dialog.style.setProperty('--md-comp-bottom-sheet-shift', '0px');
  }

  static _onCancel() {
    const drag = BottomSheets._drag;
    BottomSheets._drag = null;
    if (!drag) return;
    drag.dialog.style.transition = '';
    drag.dialog.style.setProperty('--md-comp-bottom-sheet-shift', '0px');
  }

  private static _sheet(target: EventTarget | null): HTMLDialogElement | null {
    if (!(target instanceof Element)) return null;
    const dialog = target.closest('dialog.bottom-sheet, dialog.bottom');
    return dialog instanceof HTMLDialogElement ? dialog : null;
  }

  private static _inHandle(event: PointerEvent, dialog: HTMLDialogElement): boolean {
    const target = event.target;
    if (target instanceof Element && target.closest('.handle')) return true;
    const rect = dialog.getBoundingClientRect();
    return event.clientY >= rect.top && event.clientY <= rect.top + 48;
  }
}
