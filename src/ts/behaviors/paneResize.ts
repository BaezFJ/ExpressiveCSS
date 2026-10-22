import { Utils } from '../core/utils';

const container = ':is(.panes, .pane-layout, .list-detail, .supporting-pane-layout):not(.equal, .three-pane)';
const handleSelector = `${container} > button.drag-handle`;
// The narrowest a resized pane may get, and the arrow-key step.
const minWidth = 240;
const step = 16;

/**
 * Resizable panes. A `<button class="drag-handle">` between the two panes of a
 * list-detail or supporting layout resizes the pane whose width is a token:
 * the list pane, or the supporting pane. Dragging moves the boundary; Left and
 * Right move it 16px (64px with Shift); Home and End jump to the narrowest
 * and widest; a click, Enter or Space steps through narrow, middle and wide,
 * the single-pointer alternative to dragging. The other pane keeps at least
 * `--md-comp-pane-primary-min-width`.
 *
 * The width is written as `--md-comp-pane-list-width` or
 * `--md-comp-pane-supporting-width` on the container's style.
 */
export class PaneResize {
  private static _dragged = false;

  // A second Init adds nothing: addEventListener ignores a listener it has.
  static Init() {
    if (typeof document === 'undefined') return;
    document.addEventListener('pointerdown', PaneResize._onPointerDown);
    document.addEventListener('keydown', PaneResize._onKeyDown);
    document.addEventListener('click', PaneResize._onClick);
  }

  /** The current width of the handle's resizable pane, or null for a handle outside a supported layout. */
  static width(handle: Element): number | null {
    const pane = PaneResize._pane(handle);
    return pane ? pane.getBoundingClientRect().width : null;
  }

  /** Sets the resizable pane's width, clamped to what the layout can hold. */
  static setWidth(handle: Element, width: number) {
    const pane = PaneResize._pane(handle);
    if (!pane) return;
    const [min, max] = PaneResize._bounds(handle);
    const layout = handle.parentElement;
    layout.style.setProperty(PaneResize._token(layout), `${Math.round(Math.min(Math.max(width, min), max))}px`);
  }

  private static _token(layout: Element) {
    return layout.matches('.supporting, .supporting-pane-layout')
      ? '--md-comp-pane-supporting-width'
      : '--md-comp-pane-list-width';
  }

  /** The pane the handle resizes: the list or supporting pane beside it. */
  private static _pane(handle: Element): Element | null {
    if (!handle.matches(handleSelector)) return null;
    const layout = handle.parentElement;
    const trailing = layout.matches('.supporting, .supporting-pane-layout') && !layout.matches('.start, .left');
    return trailing ? handle.nextElementSibling : handle.previousElementSibling;
  }

  private static _bounds(handle: Element): [number, number] {
    const layout = handle.parentElement;
    const style = getComputedStyle(layout);
    const other = parseFloat(style.getPropertyValue('--md-comp-pane-primary-min-width')) || 360;
    // The separated appearance pads the layout, so measure its content box.
    const content = layout.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const room = content - handle.getBoundingClientRect().width - other;
    return [minWidth, Math.max(minWidth, room)];
  }

  /** True when the resizable pane sits physically left of the handle, so moving right widens it. */
  private static _paneIsLeft(handle: Element) {
    return PaneResize._pane(handle).getBoundingClientRect().left < handle.getBoundingClientRect().left;
  }

  private static _onPointerDown(e: PointerEvent) {
    const handle = Utils.closestInPath(e, handleSelector) as HTMLElement;
    if (!handle || e.button !== 0) return;
    const pane = PaneResize._pane(handle);
    if (!pane) return;
    const startX = e.clientX;
    const startWidth = pane.getBoundingClientRect().width;
    const sign = PaneResize._paneIsLeft(handle) ? 1 : -1;
    PaneResize._dragged = false;
    handle.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) => {
      const delta = event.clientX - startX;
      // A few pixels of travel is still a click.
      if (Math.abs(delta) < 4 && !PaneResize._dragged) return;
      PaneResize._dragged = true;
      PaneResize.setWidth(handle, startWidth + sign * delta);
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  private static _onClick(e: MouseEvent) {
    const handle = Utils.closestInPath(e, handleSelector);
    if (!handle) return;
    // The click that ends a mouse drag is not a request to step. A keyboard
    // click (detail 0) always is, even after a touch drag that left the flag
    // set; the next pointerdown clears it. BottomSheets guards the same way.
    if (e.detail !== 0 && PaneResize._dragged) return;
    const [min, max] = PaneResize._bounds(handle);
    const current = PaneResize.width(handle);
    const next = [min, (min + max) / 2, max].find((width) => width > current + 1) ?? min;
    PaneResize.setWidth(handle, next);
  }

  private static _onKeyDown(e: KeyboardEvent) {
    const handle = Utils.closestInPath(e, handleSelector);
    if (!handle || !Utils.plainKey(e)) return;
    const current = PaneResize.width(handle);
    const [min, max] = PaneResize._bounds(handle);
    const amount = e.shiftKey ? step * 4 : step;
    const physical = { ArrowLeft: -amount, ArrowRight: amount }[e.key];
    let width: number;
    if (physical) width = current + (PaneResize._paneIsLeft(handle) ? physical : -physical);
    else if (e.key === 'Home') width = min;
    else if (e.key === 'End') width = max;
    else return;
    e.preventDefault();
    PaneResize.setWidth(handle, width);
  }
}
