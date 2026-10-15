const itemSelector = '.sortable > li';

interface Drag {
  item: HTMLElement;
  list: HTMLElement;
  from: number;
  pointerId: number;
}

/**
 * Sortable lists. In a `.sortable` list, an item moves by dragging its
 * `.drag-handle`, or with a `[data-move="up"]` or `[data-move="down"]` button
 * inside it. The buttons are the keyboard path and the single-pointer
 * alternative to dragging, so every sortable list needs them; they can sit in
 * the row or in a menu. Escape during a drag puts the item back.
 *
 * After each move the list fires a bubbling `change` event whose `detail`
 * holds `{ item, from, to }` (zero-based), and a polite live region beside the
 * list announces the new position. `Sortable.i18n.moved` holds that text.
 */
export class Sortable {
  static i18n = { moved: 'Moved to position {position} of {total}' };
  private static _initialized = false;
  private static _drag: Drag | null = null;
  private static _regions = new WeakMap<HTMLElement, HTMLElement>();

  static Init() {
    if (Sortable._initialized || typeof document === 'undefined') return;
    Sortable._initialized = true;
    document.addEventListener('click', Sortable._onClick);
    document.addEventListener('pointerdown', Sortable._onPointerDown);
  }

  /** Moves an item to a zero-based position in its list, then announces it and fires `change`. */
  static move(item: HTMLElement, to: number) {
    const list = item.parentElement;
    const items = [...list.children] as HTMLElement[];
    const from = items.indexOf(item);
    to = Math.min(Math.max(to, 0), items.length - 1);
    if (to === from) return;
    // Moving a node drops focus from inside it, so it is put back after.
    const focused = item.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
    list.insertBefore(item, items[to > from ? to + 1 : to] ?? null);
    focused?.focus();
    Sortable._done(list, item, from, to);
  }

  private static _done(list: HTMLElement, item: HTMLElement, from: number, to: number) {
    let region = Sortable._regions.get(list);
    if (!region) {
      region = document.createElement('div');
      region.className = 'visually-hidden';
      region.setAttribute('aria-live', 'polite');
      list.after(region);
      Sortable._regions.set(list, region);
    }
    region.textContent = Sortable.i18n.moved
      .replace('{position}', String(to + 1))
      .replace('{total}', String(list.children.length));
    list.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { item, from, to } }));
  }

  private static _onClick(e: MouseEvent) {
    const button = (<Element>e.target).closest?.('[data-move]');
    const item = button?.closest<HTMLElement>(itemSelector);
    if (!item || button.matches(':disabled, [aria-disabled="true"]')) return;
    const index = [...item.parentElement.children].indexOf(item);
    const direction = button.getAttribute('data-move');
    if (direction === 'up') Sortable.move(item, index - 1);
    else if (direction === 'down') Sortable.move(item, index + 1);
  }

  private static _onPointerDown(e: PointerEvent) {
    const handle = (<Element>e.target).closest?.('.drag-handle');
    const item = handle?.closest<HTMLElement>(itemSelector);
    if (!item || e.button !== 0 || Sortable._drag) return;
    e.preventDefault();
    const list = item.parentElement;
    Sortable._drag = { item, list, from: [...list.children].indexOf(item), pointerId: e.pointerId };
    item.classList.add('dragged');
    // On the document, not the handle: each swap moves the item in the DOM,
    // which releases any pointer capture the handle held.
    document.addEventListener('pointermove', Sortable._onPointerMove);
    document.addEventListener('pointerup', Sortable._onPointerEnd);
    document.addEventListener('pointercancel', Sortable._onPointerEnd);
    document.addEventListener('keydown', Sortable._onKeyDown);
  }

  private static _onPointerMove(e: PointerEvent) {
    const drag = Sortable._drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    // Swap with a neighbour once the pointer passes its middle.
    const previous = drag.item.previousElementSibling;
    const next = drag.item.nextElementSibling;
    const middle = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return rect.top + rect.height / 2;
    };
    if (previous && e.clientY < middle(previous)) drag.list.insertBefore(drag.item, previous);
    else if (next && e.clientY > middle(next)) drag.list.insertBefore(drag.item, next.nextElementSibling);
  }

  private static _onPointerEnd(e: PointerEvent) {
    if (e.pointerId === Sortable._drag?.pointerId) Sortable._finish(e.type === 'pointercancel');
  }

  private static _onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') Sortable._finish(true);
  }

  private static _finish(cancel: boolean) {
    const drag = Sortable._drag;
    if (!drag) return;
    Sortable._drag = null;
    document.removeEventListener('pointermove', Sortable._onPointerMove);
    document.removeEventListener('pointerup', Sortable._onPointerEnd);
    document.removeEventListener('pointercancel', Sortable._onPointerEnd);
    document.removeEventListener('keydown', Sortable._onKeyDown);
    drag.item.classList.remove('dragged');
    const to = [...drag.list.children].indexOf(drag.item);
    if (cancel) {
      drag.list.insertBefore(drag.item, drag.list.children[drag.from > to ? drag.from + 1 : drag.from] ?? null);
    } else if (to !== drag.from) {
      Sortable._done(drag.list, drag.item, drag.from, to);
    }
  }
}
