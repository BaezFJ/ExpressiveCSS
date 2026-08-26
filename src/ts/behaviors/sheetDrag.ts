import { Utils } from '../core/utils';

/**
 * Drag-to-dismiss, shared by the bottom sheet and the side sheet.
 *
 * The two were the same state machine written twice on different axes - same
 * dismissal distance, same flick velocity, same transition suppression, same
 * pointer bookkeeping - so a fix to one could land without reaching the other.
 * What actually differs between them is stated as configuration below.
 *
 * Light-dismiss on the scrim is not here; it stays with `Dialogs`.
 */
export interface SheetDragConfig {
  /** Which dialogs this drag applies to. */
  selector: string;
  /** The axis the sheet travels on. */
  axis: 'x' | 'y';
  /** The custom property carrying the live drag offset. */
  property: string;
  /**
   * `1` when the sheet dismisses toward increasing coordinates (downward, or
   * rightward for an end-docked side sheet), `-1` when it dismisses toward
   * decreasing ones. A function rather than a constant because a side sheet's
   * direction depends on which edge each individual sheet is docked to.
   */
  direction: (dialog: HTMLDialogElement) => 1 | -1;
  /** Whether a press at this point landed on the sheet's drag handle. */
  inHandle: (event: PointerEvent, dialog: HTMLDialogElement) => boolean;
  /**
   * Called first on every `pointerdown`, before any guard rejects it. The
   * bottom sheet clears its dragged flag here so a sequence abandoned without
   * a `pointerup` cannot leave the flag set and swallow the next tap.
   */
  onPress?: () => void;
  /** Called when a drag ends, with whether the pointer actually moved. */
  onRelease?: (dragged: boolean) => void;
}

/** Past this the sheet dismisses rather than snapping back, in pixels. */
const DISMISS_DISTANCE = 96;
/** Past this a flick dismisses whatever the distance, in pixels per millisecond. */
const DISMISS_VELOCITY = 0.5;
/** Past this the pointer was dragging, not tapping. Hand jitter, in pixels. */
const DRAG_SLOP = 4;

/**
 * Register one sheet kind's drag handlers on the document. Called once per kind
 * at import time; there is nothing to tear down.
 */
export function installSheetDrag(config: SheetDragConfig): void {
  const coord = (event: PointerEvent) => (config.axis === 'x' ? event.clientX : event.clientY);

  let drag: {
    dialog: HTMLDialogElement;
    pointerId: number;
    direction: 1 | -1;
    start: number;
    last: number;
    lastT: number;
    shift: number;
  } | null = null;

  const sheetFor = (target: EventTarget | null): HTMLDialogElement | null => {
    if (!(target instanceof Element)) return null;
    const dialog = target.closest(config.selector);
    return dialog instanceof HTMLDialogElement ? dialog : null;
  };

  const reset = (dialog: HTMLDialogElement) => {
    dialog.style.transition = '';
    dialog.style.setProperty(config.property, '0px');
  };

  const onDown = (event: PointerEvent) => {
    config.onPress?.();
    // A press that is not the primary pointer is ignored without disturbing a
    // drag already in flight - a second finger must not abort the first one.
    // A press that lands off the sheet or off its handle does clear it.
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const dialog = sheetFor(event.target);
    if (!dialog?.open) {
      drag = null;
      return;
    }
    if (!config.inHandle(event, dialog)) {
      drag = null;
      return;
    }
    dialog.style.transition = 'none';
    drag = {
      dialog,
      pointerId: event.pointerId,
      direction: config.direction(dialog),
      start: coord(event),
      last: coord(event),
      lastT: Date.now(),
      shift: 0
    };
  };

  const onMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = coord(event) - drag.start;
    // Only movement toward dismissal counts; dragging the other way is a no-op
    // rather than a sheet that lifts off its edge.
    drag.shift = drag.direction === 1 ? Math.max(0, delta) : Math.min(0, delta);
    drag.last = coord(event);
    drag.lastT = Date.now();
    drag.dialog.style.setProperty(config.property, `${drag.shift}px`);
  };

  const onUp = (event: PointerEvent) => {
    const held = drag;
    if (!held || held.pointerId !== event.pointerId) return;
    drag = null;
    // Not `reset()`, though it looks like it: the two halves belong on either
    // side of close(). The transition has to be back before the sheet closes,
    // so the dismissal animates; the shift has to clear after, or a snap-back
    // would jump to zero before the transition could carry it there.
    held.dialog.style.transition = '';
    const dt = Math.max(1, Date.now() - held.lastT);
    const velocity = (coord(event) - held.last) / dt;
    config.onRelease?.(Math.abs(held.shift) > DRAG_SLOP);
    const dismiss =
      held.direction === 1
        ? held.shift > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY
        : held.shift < -DISMISS_DISTANCE || velocity < -DISMISS_VELOCITY;
    if (dismiss && held.dialog.open) held.dialog.close();
    held.dialog.style.setProperty(config.property, '0px');
  };

  const onCancel = () => {
    config.onRelease?.(false);
    const held = drag;
    drag = null;
    if (held) reset(held.dialog);
  };

  Utils.onDocumentReady(() => {
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onCancel, { passive: true });
  });
}
