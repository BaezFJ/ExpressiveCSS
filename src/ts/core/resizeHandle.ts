import { controllerFor } from './utils';

/** The arrow-key step of a resize handle, in pixels. Shift moves four. */
const STEP = 16;

/**
 * The next of narrow, middle and wide after `current`, wrapping to narrow:
 * a click on a resize handle, the single-pointer alternative to dragging.
 */
export function stepWidth([min, max]: [number, number], current: number) {
  return [min, (min + max) / 2, max].find((width) => width > current + 1) ?? min;
}

/**
 * The width a key on a resize handle asks for, or undefined for another key.
 * `sign` is 1 when ArrowRight widens; Home and End jump to the bounds.
 */
export function keyWidth(e: KeyboardEvent, current: number, [min, max]: [number, number], sign: number) {
  const amount = (e.shiftKey ? 4 : 1) * STEP * sign;
  const widths: Record<string, number> = { ArrowRight: current + amount, ArrowLeft: current - amount, Home: min, End: max };
  return widths[e.key] as number | undefined;
}

/**
 * Follows a drag on a resize handle from `start`, calling `move` with the
 * horizontal travel once it passes a few pixels, which are still a click, and
 * `end` when the pointer lifts. The returned `dragged` tells the click that
 * ends a mouse drag from a request to step.
 */
export function dragHandle(handle: HTMLElement, start: PointerEvent, move: (delta: number) => void, end?: (dragged: boolean) => void) {
  const state = { dragged: false };
  handle.setPointerCapture(start.pointerId);
  const drag = controllerFor(handle);
  const { signal } = drag;
  handle.addEventListener('pointermove', (e) => {
    const delta = e.clientX - start.clientX;
    if (Math.abs(delta) < 4 && !state.dragged) return;
    state.dragged = true;
    move(delta);
  }, { signal });
  const stop = () => {
    drag.abort();
    end?.(state.dragged);
  };
  handle.addEventListener('pointerup', stop, { signal });
  handle.addEventListener('pointercancel', stop, { signal });
  return state;
}
