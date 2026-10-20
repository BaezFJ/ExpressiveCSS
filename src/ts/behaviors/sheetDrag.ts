import { Utils } from '../core/utils';
import { Spring, animatePath, springPath, springToken } from '../core/spring';

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
   * The sheet's motion easing token; `-duration` names its duration. While
   * both are the default spatial spring's, a snap-back solves that spring
   * at run time; an override keeps the CSS transition it asks for.
   */
  motion: string;
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
   * Called on primary `pointerdown`, after clearing the previous drag. The
   * bottom sheet clears its dragged flag here so a sequence abandoned without
   * a `pointerup` cannot leave the flag set and swallow the next tap.
   */
  onPress?: () => void;
  /** Called when a drag ends, with whether the pointer actually moved. */
  onRelease?: (dragged: boolean) => void;
  /**
   * Called when a drag that moved ends on an open sheet, before it can
   * dismiss, with how far the pointer travelled along the axis (either way,
   * unlike the dismissing shift) and its flick velocity. Returns whether the
   * drag did something else, such as resizing the sheet, so it does not also
   * dismiss it.
   */
  release?: (dialog: HTMLDialogElement, delta: number, velocity: number) => boolean;
}

const REDUCED = '(prefers-reduced-motion: reduce)';

/** Past this the sheet dismisses rather than snapping back, in pixels. */
export const DISMISS_DISTANCE = 96;
/** Past this a flick dismisses whatever the distance, in pixels per millisecond. */
export const DISMISS_VELOCITY = 0.5;
/** Ignore a flick after the pointer has rested for this many milliseconds. */
const FLICK_TIMEOUT = 100;
/** Past this the pointer was dragging, not tapping. Hand jitter, in pixels. */
const DRAG_SLOP = 4;

/** One drag in flight. */
interface Drag {
  dialog: HTMLDialogElement;
  pointerId: number;
  direction: 1 | -1;
  start: number;
  last: number;
  lastT: number;
  velocity: number;
  shift: number;
}

/** The pointer's velocity at release, or 0 once it has rested past the flick window. */
const flickVelocity = (held: Drag) => (Date.now() - held.lastT < FLICK_TIMEOUT ? held.velocity : 0);

/** Whether the drag went past the dismissal distance, or flicked, toward the sheet's edge. */
const dismisses = (held: Drag, velocity: number) =>
  held.shift * held.direction > DISMISS_DISTANCE || velocity * held.direction > DISMISS_VELOCITY;

/**
 * Each sheet's snap-back spring while it runs, as the function that ends
 * it, restoring the CSS transition or, for a drag that caught it, not.
 */
const springs = new WeakMap<HTMLDialogElement, (restore: boolean) => void>();

/**
 * Stops a sheet's snap-back where it is and returns how far off its edge
 * that is, so a drag carries on from there instead of jumping.
 */
function catchSpring(dialog: HTMLDialogElement, axis: 'x' | 'y') {
  const end = springs.get(dialog);
  if (!end) return 0;
  const [x, y = '0'] = getComputedStyle(dialog).translate.split(' ');
  end(false);
  return parseFloat(axis === 'x' ? x : y) || 0;
}

/** Selectors whose drag is already installed, so a second `Init()` is a no-op. */
const installed = new Set<string>();

/**
 * Register one sheet kind's drag handlers on the document. Called once per kind
 * at import time; there is nothing to tear down.
 */
export function installSheetDrag(config: SheetDragConfig): void {
  if (installed.has(config.selector)) return;
  installed.add(config.selector);
  const coord = (event: PointerEvent) => (config.axis === 'x' ? event.clientX : event.clientY);
  let observer: MutationObserver;

  let drag: Drag | null = null;

  const sheetFor = (event: Event): HTMLDialogElement | null => {
    const dialog = Utils.closestInPath(event, config.selector);
    return dialog instanceof HTMLDialogElement ? dialog : null;
  };

  const reset = (dialog: HTMLDialogElement) => {
    dialog.style.transition = '';
    dialog.style.setProperty(config.property, '0px');
  };

  const onDown = (event: PointerEvent) => {
    // A press that is not the primary pointer is ignored without disturbing a
    // drag already in flight - a second finger must not abort the first one.
    // A press that lands off the sheet or off its handle does clear it.
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    onCancel();
    config.onPress?.();
    const dialog = sheetFor(event);
    if (!dialog?.open || !config.inHandle(event, dialog)) return;
    dialog.style.transition = 'none';
    const at = coord(event);
    // A sheet caught mid-spring carries on from where it is.
    const caught = catchSpring(dialog, config.axis);
    dialog.style.setProperty(config.property, `${caught}px`);
    drag = {
      dialog,
      pointerId: event.pointerId,
      direction: config.direction(dialog),
      start: at - caught,
      last: at,
      lastT: Date.now(),
      velocity: 0,
      shift: caught
    };
    // The document cannot see inside a shadow root, so a sheet there is
    // watched in its own root too; host removal still shows up in the document.
    const watch = { childList: true, subtree: true, attributes: true, attributeFilter: ['open'], attributeOldValue: true };
    const root = dialog.getRootNode();
    observer.observe(document, watch);
    if (root !== document) observer.observe(root, watch);
  };

  const onMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.dialog.open || !drag.dialog.isConnected) {
      onCancel();
      return;
    }
    const at = coord(event);
    const delta = at - drag.start;
    // Only movement toward dismissal counts; dragging the other way is a no-op
    // rather than a sheet that lifts off its edge.
    drag.shift = drag.direction === 1 ? Math.max(0, delta) : Math.min(0, delta);
    if (at !== drag.last) {
      const now = Date.now();
      drag.velocity = (at - drag.last) / Math.max(1, now - drag.lastT);
      drag.last = at;
      drag.lastT = now;
    }
    drag.dialog.style.setProperty(config.property, `${drag.shift}px`);
  };

  const onUp = (event: PointerEvent) => {
    const held = drag;
    if (!held || held.pointerId !== event.pointerId) return;
    if (!held.dialog.open || !held.dialog.isConnected) {
      onCancel();
      return;
    }
    onMove(event);
    drag = null;
    observer.disconnect();
    letGo(held);
  };

  /**
   * A finished drag resizes or dismisses the sheet, or else it springs back.
   * Not `reset()`, though it looks like it: the two halves belong on either
   * side of close(). The transition has to be back before the sheet closes,
   * so the dismissal animates; the shift has to clear after, or a snap-back
   * would jump to zero before the transition could carry it there.
   */
  const letGo = (held: Drag) => {
    const spring = springFor(held);
    held.dialog.style.transition = '';
    clearShift(held, !settle(held) && held.dialog.open ? spring : null);
  };

  /**
   * Clears the drag's shift, springing back on `spring` when there is one.
   * A running CSS transition would outrank the spring, so it waits until
   * the spring ends. It goes off before the shift changes: switched off
   * after, WebKit has already started it.
   */
  const clearShift = (held: Drag, spring: Spring | null) => {
    if (spring) held.dialog.style.transition = 'none';
    held.dialog.style.setProperty(config.property, '0px');
    if (spring) springBack(held, spring);
  };

  /**
   * The spring a released sheet snaps back on, or null for the CSS snap:
   * no shift, reduced motion, or motion tokens the page overrode.
   */
  const springFor = (held: Drag) => {
    if (!held.shift || matchMedia(REDUCED).matches || !onSpring(held.dialog)) return null;
    return springToken(held.dialog, 'default-spatial');
  };

  /** Whether the sheet's motion tokens are still the default spatial spring's. */
  const onSpring = (dialog: HTMLDialogElement) => {
    const style = getComputedStyle(dialog);
    const read = (name: string) => style.getPropertyValue(name).trim();
    const spring = '--md-sys-motion-spring-default-spatial';
    return read(config.motion) === read(spring) && read(`${config.motion}-duration`) === read(`${spring}-duration`);
  };

  /**
   * The snap-back: a spring solved from where the sheet is and the
   * finger's speed, instead of the CSS spring that starts from rest.
   */
  const springBack = (held: Drag, spring: Spring) => {
    const dialog = held.dialog;
    const write = config.axis === 'x' ? (value: number) => `${value}px 0` : (value: number) => `0 ${value}px`;
    const running = animatePath(dialog, 'translate', springPath(held.shift, 0, flickVelocity(held), spring), write);
    // It ends when it settles, and early when the sheet closes or the reader
    // asks for reduced motion, so neither inherits a stale spring or a
    // transition left off.
    const reduced = matchMedia(REDUCED);
    const closing = new MutationObserver(() => dialog.open || end(true));
    const end = (restore: boolean) => {
      springs.delete(dialog);
      closing.disconnect();
      reduced.removeEventListener('change', stop);
      running.onfinish = null;
      running.cancel();
      if (restore) dialog.style.transition = '';
    };
    const stop = () => end(true);
    springs.set(dialog, end);
    running.onfinish = stop;
    reduced.addEventListener('change', stop);
    closing.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  };

  const onRelease = config.onRelease ?? (() => {});
  const release = config.release ?? (() => false);

  /**
   * A drag that moved resizes the sheet, if the sheet handles that, or else
   * dismisses it past the distance or a flick. Returns whether the release
   * did something other than let the sheet snap back.
   */
  const settle = (held: Drag) => {
    const velocity = flickVelocity(held);
    const delta = held.last - held.start;
    // Movement either way is a drag, so the click that ends it is not a tap.
    const dragged = Math.abs(delta) > DRAG_SLOP;
    onRelease(dragged);
    const handled = !dragged || release(held.dialog, delta, velocity);
    if (!handled && dismisses(held, velocity)) held.dialog.close();
    return handled;
  };

  const onCancel = (event?: PointerEvent) => {
    if (event && drag?.pointerId !== event.pointerId) return;
    observer.disconnect();
    onRelease(false);
    const held = drag;
    drag = null;
    if (held) reset(held.dialog);
  };

  Utils.onDocumentReady(() => {
    observer = new MutationObserver(records => {
      const dialog = drag?.dialog;
      if (dialog && (!dialog.open || !dialog.isConnected || records.some(record =>
        (record.type === 'attributes' && record.target === dialog && record.oldValue === null) ||
        [...record.removedNodes].some(node => node.contains(dialog))
      ))) onCancel();
    });
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onCancel, { passive: true });
  });
}
