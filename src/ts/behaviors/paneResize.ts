import { Utils } from '../core/utils';
import { dragHandle, keyWidth, stepWidth } from '../core/resizeHandle';

const container = ':is(.panes, .pane-layout, .list-detail, .supporting-pane-layout):not(.equal, .three-pane)';
const handleSelector = `${container} > button.drag-handle`;
// The narrowest a resized pane may get.
const minWidth = 240;

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
  private static _drag = { dragged: false };

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
    const handle = Utils.closestInPath<HTMLElement>(e, handleSelector);
    if (!handle || e.button !== 0) return;
    const pane = PaneResize._pane(handle);
    if (!pane) return;
    const startWidth = pane.getBoundingClientRect().width;
    const sign = PaneResize._paneIsLeft(handle) ? 1 : -1;
    PaneResize._drag = dragHandle(handle, e, (delta) => PaneResize.setWidth(handle, startWidth + sign * delta));
  }

  private static _onClick(e: MouseEvent) {
    const handle = Utils.closestInPath(e, handleSelector);
    if (!handle) return;
    // The click that ends a mouse drag is not a request to step. A keyboard
    // click (detail 0) always is, even after a touch drag that left the flag
    // set; the next pointerdown clears it. BottomSheets guards the same way.
    if (e.detail !== 0 && PaneResize._drag.dragged) return;
    PaneResize.setWidth(handle, stepWidth(PaneResize._bounds(handle), PaneResize.width(handle)));
  }

  private static _onKeyDown(e: KeyboardEvent) {
    const handle = Utils.closestInPath(e, handleSelector);
    if (!handle || !Utils.plainKey(e)) return;
    // The arrow toward the pane's far side widens it.
    const sign = PaneResize._paneIsLeft(handle) ? 1 : -1;
    const width = keyWidth(e, PaneResize.width(handle), PaneResize._bounds(handle), sign);
    if (width === undefined) return;
    e.preventDefault();
    PaneResize.setWidth(handle, width);
  }
}
