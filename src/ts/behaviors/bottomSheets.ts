import { Utils } from '../core/utils';

/**
 * Drag-to-dismiss for `dialog.bottom-sheet` / `dialog.bottom`.
 *
 * The handle is the top 48dp of the sheet (or an explicit `.drag-handle`,
 * `.handle` being its pre-1.0 spelling). A downward drag past 96dp, or a
 * flick, closes. Anything else snaps back. Content below the handle scrolls
 * normally. Light-dismiss on the scrim stays with {@link Dialogs}.
 *
 * A handle written as a `<button>` also closes the sheet when it is
 * *activated*, which is what makes it reachable without a pointer: dragging is
 * a pointer gesture, so a control labelled "Dismiss" that only answers a drag
 * promises an action a keyboard user cannot perform. A handle written as any
 * other element is decoration and does nothing here - Escape still closes the
 * sheet either way, natively.
 */
/** Past this the pointer was dragging, not tapping. Hand jitter, in pixels. */
const DRAG_SLOP = 4;

export class BottomSheets {
  /**
   * Whether the last pointer sequence moved. A drag ends with a `click` on the
   * element it started on, so without this the tail of a drag that snapped back
   * would dismiss the sheet the drag had just declined to dismiss.
   */
  private static _dragged = false;

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
      document.addEventListener('click', BottomSheets._onClick);
    });
  }

  static _onDown(event: PointerEvent) {
    // Cleared before any early return, so a sequence abandoned without a
    // pointerup cannot leave the flag set and swallow the next tap.
    BottomSheets._dragged = false;
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
    BottomSheets._dragged = drag.shift > DRAG_SLOP;
    const dismiss = drag.shift > 96 || velocity > 0.5;
    if (dismiss && dialog.open) {
      dialog.close();
    }
    dialog.style.setProperty('--md-comp-bottom-sheet-shift', '0px');
  }

  static _onClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const handle = target.closest('.handle, .drag-handle');
    // Only a <button> is a control. A decorative <span> in the same slot is
    // exactly what it looks like, and clicking it does nothing.
    if (!(handle instanceof HTMLButtonElement)) return;
    // `detail` is 0 when the click came from Enter or Space and >= 1 when a
    // pointer produced it, so the keyboard path is decided without consulting
    // pointer state at all - a stale drag can never swallow a key press.
    if (event.detail !== 0 && BottomSheets._dragged) return;
    const dialog = BottomSheets._sheet(handle);
    if (dialog?.open) dialog.close();
  }

  static _onCancel() {
    BottomSheets._dragged = false;
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
