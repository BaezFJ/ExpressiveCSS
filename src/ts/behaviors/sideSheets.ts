import { installSheetDrag } from './sheetDrag';

const startDocked = (dialog: HTMLDialogElement): boolean =>
  dialog.classList.contains('left') ||
  dialog.classList.contains('left-sheet') ||
  dialog.classList.contains('start');

/**
 * Drag-to-dismiss for side sheets (`dialog.side-sheet` / `.right` / `.left`).
 *
 * Grab the header or the inner 24dp edge and drag toward the docked side.
 * Past 96dp, or a flick, closes. Light-dismiss on the scrim stays with
 * {@link Dialogs}. The drag itself is {@link installSheetDrag}, shared with
 * the bottom sheet.
 */
export class SideSheets {
  static Init() {
    installSheetDrag({
      selector:
        'dialog.side-sheet, dialog.right, dialog.right-sheet, dialog.left, dialog.left-sheet',
      axis: 'x',
      property: '--md-comp-side-sheet-shift',
      // A start-docked sheet leaves toward the start edge, so its dismissal
      // direction is the negative one.
      direction: (dialog) => (startDocked(dialog) ? -1 : 1),
      inHandle: (event, dialog) => {
        const target = event.target;
        if (target instanceof Element && target.closest('header')) return true;
        const rect = dialog.getBoundingClientRect();
        return startDocked(dialog)
          ? event.clientX >= rect.right - 24 && event.clientX <= rect.right
          : event.clientX >= rect.left && event.clientX <= rect.left + 24;
      }
    });
  }
}
