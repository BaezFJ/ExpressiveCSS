import { installSheetDrag } from './sheetDrag';

const startDocked = (dialog: HTMLDialogElement): boolean => dialog.classList.contains('start');

const leftDocked = (dialog: HTMLDialogElement): boolean =>
  startDocked(dialog) !== (getComputedStyle(dialog).direction === 'rtl');

/**
 * Drag-to-dismiss for side sheets (`dialog.side-sheet`).
 *
 * Grab the header or the inner 24dp edge and drag toward the docked side.
 * Past 96dp, or a flick, closes. Light-dismiss on the scrim stays with
 * {@link Dialogs}. The drag itself is {@link installSheetDrag}, shared with
 * the bottom sheet.
 */
export class SideSheets {
  static Init() {
    installSheetDrag({
      selector: 'dialog.side-sheet',
      axis: 'x',
      property: '--md-comp-side-sheet-shift',
      direction: (dialog) => (leftDocked(dialog) ? -1 : 1),
      inHandle: (event, dialog) => {
        // Only the sheet's own top bar: a <header> in its content, or one
        // around the dialog, is not a handle, so selecting text there is safe.
        const header = dialog.querySelector(':scope > header');
        if (header && event.composedPath().includes(header)) return true;
        const rect = dialog.getBoundingClientRect();
        return leftDocked(dialog)
          ? event.clientX >= rect.right - 24 && event.clientX <= rect.right
          : event.clientX >= rect.left && event.clientX <= rect.left + 24;
      }
    });
  }
}
