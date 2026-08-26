import { installSheetDrag } from './sheetDrag';
import { Utils } from '../core/utils';

const SHEET_SELECTOR = 'dialog.bottom-sheet, dialog.bottom';

/**
 * Drag-to-dismiss for `dialog.bottom-sheet` / `dialog.bottom`.
 *
 * The handle is the top 48dp of the sheet (or an explicit `.drag-handle`,
 * `.handle` being its pre-1.0 spelling). A downward drag past 96dp, or a
 * flick, closes. Anything else snaps back. Content below the handle scrolls
 * normally. Light-dismiss on the scrim stays with {@link Dialogs}.
 *
 * The drag itself is {@link installSheetDrag}, shared with the side sheet. What
 * is here is what is not shared: a handle written as a `<button>` also closes
 * the sheet when it is *activated*, which is what makes it reachable without a
 * pointer - dragging is a pointer gesture, so a control labelled "Dismiss" that
 * only answers a drag promises an action a keyboard user cannot perform. A
 * handle written as any other element is decoration and does nothing here -
 * Escape still closes the sheet either way, natively.
 */
export class BottomSheets {
  /**
   * Whether the last pointer sequence moved. A drag ends with a `click` on the
   * element it started on, so without this the tail of a drag that snapped back
   * would dismiss the sheet the drag had just declined to dismiss.
   */
  private static _dragged = false;

  static Init() {
    installSheetDrag({
      selector: SHEET_SELECTOR,
      axis: 'y',
      property: '--md-comp-bottom-sheet-shift',
      direction: () => 1,
      inHandle: (event, dialog) => {
        const target = event.target;
        if (target instanceof Element && target.closest('.handle')) return true;
        const rect = dialog.getBoundingClientRect();
        return event.clientY >= rect.top && event.clientY <= rect.top + 48;
      },
      onPress: () => {
        BottomSheets._dragged = false;
      },
      onRelease: (dragged) => {
        BottomSheets._dragged = dragged;
      }
    });
    Utils.onDocumentReady(() => {
      document.addEventListener('click', BottomSheets._onClick);
    });
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
    const dialog = handle.closest(SHEET_SELECTOR);
    if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
  }
}
