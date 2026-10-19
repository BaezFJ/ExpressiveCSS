import { DISMISS_DISTANCE, DISMISS_VELOCITY, installSheetDrag } from './sheetDrag';
import { Utils } from '../core/utils';

const SHEET_SELECTOR = 'dialog.bottom-sheet';
/** Past this a drag up expands an .expandable sheet, in pixels; a drag down uses the dismissal distance. */
const RESIZE_DISTANCE = 48;

/** Whether a drag went past `distance`, or flicked, down (1) or up (-1). */
const toward = (sign: 1 | -1, distance: number, delta: number, velocity: number) =>
  delta * sign > distance || velocity * sign > DISMISS_VELOCITY;

/**
 * Drag-to-dismiss for `dialog.bottom-sheet`, and two heights for
 * `.expandable` sheets.
 *
 * The handle is the top 48dp of the sheet, or an explicit `.drag-handle`. A downward drag past 96dp, or a
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
 *
 * An `.expandable` sheet opens partly expanded. A drag up, or a flick up,
 * expands it to its full height with `.expanded`; from there a drag down
 * collapses it, and a drag down from the partial height dismisses as usual.
 * Its handle button switches between the two heights instead of closing,
 * and carries `aria-expanded`. Closing the sheet puts it back to partial.
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
        if (Utils.closestInPath(event, '.drag-handle')) return true;
        const rect = dialog.getBoundingClientRect();
        return event.clientY >= rect.top && event.clientY <= rect.top + 48;
      },
      onPress: () => {
        BottomSheets._dragged = false;
      },
      onRelease: (dragged) => {
        BottomSheets._dragged = dragged;
      },
      release: (dialog, delta, velocity) => BottomSheets._resize(dialog, delta, velocity)
    });
    Utils.onDocumentReady(() => {
      document.addEventListener('click', BottomSheets._onClick);
      // close does not bubble, so it is caught on its way down.
      document.addEventListener('close', BottomSheets._onClose, true);
    });
  }

  /**
   * For an .expandable sheet, a drag up expands it and a drag down from
   * expanded collapses it. Returns whether the drag resized the sheet.
   */
  static _resize(dialog: HTMLDialogElement, delta: number, velocity: number): boolean {
    if (!dialog.classList.contains('expandable')) return false;
    const expanded = dialog.classList.contains('expanded');
    const next = expanded ? !toward(1, DISMISS_DISTANCE, delta, velocity) : toward(-1, RESIZE_DISTANCE, delta, velocity);
    if (next === expanded) return false;
    BottomSheets.setExpanded(dialog, next);
    return true;
  }

  /** Sets an .expandable sheet to its full height or back to partial, and tells its handle. */
  static setExpanded(dialog: HTMLDialogElement, expanded: boolean) {
    dialog.classList.toggle('expanded', expanded);
    dialog.querySelector(':scope > button.drag-handle')?.setAttribute('aria-expanded', String(expanded));
  }

  private static _onClose(event: Event) {
    const dialog = event.target as Element;
    if (dialog.matches?.(`${SHEET_SELECTOR}.expandable`)) BottomSheets.setExpanded(dialog as HTMLDialogElement, false);
  }

  static _onClick(event: MouseEvent) {
    const handle = Utils.closestInPath(event, '.drag-handle');
    // Only a <button> is a control. A decorative <span> in the same slot is
    // exactly what it looks like, and clicking it does nothing.
    if (!(handle instanceof HTMLButtonElement)) return;
    // `detail` is 0 when the click came from Enter or Space and >= 1 when a
    // pointer produced it, so the keyboard path is decided without consulting
    // pointer state at all - a stale drag can never swallow a key press.
    if (event.detail !== 0 && BottomSheets._dragged) return;
    const dialog = handle.closest(SHEET_SELECTOR);
    if (dialog instanceof HTMLDialogElement && dialog.open) BottomSheets._activate(dialog);
  }

  /** The handle button switches an .expandable sheet's height, and closes any other. */
  private static _activate(dialog: HTMLDialogElement) {
    if (dialog.classList.contains('expandable')) BottomSheets.setExpanded(dialog, !dialog.classList.contains('expanded'));
    else dialog.close();
  }
}
