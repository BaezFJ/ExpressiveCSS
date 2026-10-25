import { Utils } from '../core/utils';

const AVAILABLE = '.transfer-available';
const CHOSEN = '.transfer-chosen';

/** Each button's source list, destination list, and whether it moves every row or only the checked ones. */
const MOVES = new Map([
  ['add', { from: AVAILABLE, to: CHOSEN, all: false }],
  ['add-all', { from: AVAILABLE, to: CHOSEN, all: true }],
  ['remove', { from: CHOSEN, to: AVAILABLE, all: false }],
  ['remove-all', { from: CHOSEN, to: AVAILABLE, all: true }]
]);

/** The rows of both lists as they stood before a container's first move. */
interface Start {
  available: Element[];
  chosen: Element[];
}

/**
 * Transfer lists. A `.transfer-list` holds a `.transfer-available` and a
 * `.transfer-chosen` list of checkbox rows, with `[data-transfer]` buttons
 * between them. `add` and `remove` move the checked rows to the other list,
 * `add-all` and `remove-all` every row, skipping rows whose box is disabled.
 * Moved rows arrive unchecked. The chosen list keeps the order rows arrived
 * in; a row moved back returns to its slot in the order the lists had before
 * the first move. A form reset puts every row back there.
 *
 * After each move the container fires a bubbling `expressive:transfer` event
 * whose `detail` is `{ rows, from, to }`, and a polite live region beside it
 * announces the move. `TransferList.i18n.moved` holds that text.
 *
 * The checkboxes carry no name. When the form builds its data, each row of
 * the chosen list adds its checkbox value under the container's `data-name`,
 * in the chosen list's order. The listeners are on the document, so a list
 * added later needs no call, but a form inside a shadow root gets no entries.
 */
export class TransferList {
  static i18n = { moved: 'Moved {count} to {list}' };
  private static _starts = new WeakMap<Element, Start>();
  private static _regions = new WeakMap<Element, HTMLElement>();

  // A second Init adds nothing: addEventListener ignores a listener it has.
  static Init() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', TransferList._onClick);
    document.addEventListener('formdata', TransferList._onFormData, { capture: true });
    document.addEventListener('reset', TransferList._onReset, { capture: true });
  }

  private static _onClick(e: MouseEvent) {
    // A click on a disabled button's icon still reaches the document, so the selector skips it.
    const button = Utils.closestInPath(e, '.transfer-list [data-transfer]:not(:disabled, [aria-disabled="true"])');
    const move = MOVES.get(button?.getAttribute('data-transfer'));
    if (move) TransferList._move(button.closest('.transfer-list'), move);
  }

  private static _move(container: Element, move: { from: string; to: string; all: boolean }) {
    const [from, to] = [move.from, move.to].map((list) => container.querySelector(`:scope > ${list}`));
    const boxes = TransferList._boxes(container, move.from).filter((box) => !box.disabled && (move.all || box.checked));
    if (!to || !boxes.length) return;
    TransferList._record(container);
    const moved: Element[] = boxes.map((box) => box.closest('li'));
    for (const [i, row] of moved.entries()) {
      boxes[i].checked = false;
      to.insertBefore(row, TransferList._slot(container, row, to));
    }
    const rows = [...to.children].filter((row) => moved.includes(row));
    TransferList._announce(container, rows.length, to);
    container.dispatchEvent(new CustomEvent('expressive:transfer', { bubbles: true, detail: { rows, from, to } }));
  }

  /** The row checkboxes of one of a container's lists, in order. Only a row's own label counts, so a list nested in a row keeps its boxes. */
  private static _boxes(container: Element, list: string) {
    return [...container.querySelectorAll<HTMLInputElement>(`:scope > ${list} > li > label > input[type="checkbox"]`)];
  }

  /** Keeps the rows of both lists as they stand before a container's first move. */
  private static _record(container: Element) {
    if (TransferList._starts.has(container)) return;
    const rows = (list: string) => [...container.querySelectorAll(`:scope > ${list} > li`)];
    TransferList._starts.set(container, { available: rows(AVAILABLE), chosen: rows(CHOSEN) });
  }

  /**
   * The row a moved row goes before. In the available list that is the first
   * row that came after it before the first move; elsewhere, or for a row the
   * page added since, none, so it goes last.
   */
  private static _slot(container: Element, row: Element, to: Element) {
    const start = TransferList._starts.get(container);
    const order = [...start.available, ...start.chosen];
    const index = order.indexOf(row);
    if (!to.matches(AVAILABLE) || index < 0) return null;
    return [...to.children].find((other) => order.indexOf(other) > index) ?? null;
  }

  private static _announce(container: Element, count: number, to: Element) {
    let region = TransferList._regions.get(container);
    if (!region) {
      region = document.createElement('div');
      region.className = 'visually-hidden';
      region.setAttribute('aria-live', 'polite');
      container.after(region);
      TransferList._regions.set(container, region);
    }
    region.textContent = TransferList.i18n.moved.replace('{count}', String(count)).replace('{list}', TransferList._name(to));
  }

  /** A list's `aria-label`, or the text of the elements its `aria-labelledby` names. */
  private static _name(list: Element) {
    const label = list.getAttribute('aria-label');
    if (label !== null) return label;
    const root = list.getRootNode() as Document | ShadowRoot;
    const ids = (list.getAttribute('aria-labelledby') ?? '').split(/\s+/);
    return ids.map((id) => root.getElementById(id)?.textContent.trim()).filter(Boolean).join(' ');
  }

  private static _onFormData(e: FormDataEvent) {
    const containers = (e.target as HTMLFormElement).querySelectorAll<HTMLElement>('.transfer-list:not([data-name=""])[data-name]');
    for (const container of containers) {
      for (const box of TransferList._boxes(container, CHOSEN).filter(TransferList._submits)) {
        e.formData.append(container.dataset.name, box.value);
      }
    }
  }

  /**
   * Whether a chosen row submits. A disabled fieldset leaves it out, as it
   * does its own fields outside the first legend. A row's own disabled box
   * only keeps the row in place, so it still submits.
   */
  private static _submits(box: HTMLInputElement) {
    return !box.matches('fieldset[disabled] > :not(legend:first-of-type) *');
  }

  private static _onReset(e: Event) {
    const containers = [...(e.target as HTMLFormElement).querySelectorAll('.transfer-list')];
    // The form resets its fields after the event, and the page may cancel it,
    // so the rows go back a task later.
    setTimeout(() => {
      if (!e.defaultPrevented) containers.forEach(TransferList._restore);
    });
  }

  /** Puts every row a container had before its first move back in its list and order. */
  private static _restore(container: Element) {
    const start = TransferList._starts.get(container);
    if (!start) return;
    const kept = (rows: Element[]) => rows.filter((row) => container.contains(row));
    container.querySelector(`:scope > ${AVAILABLE}`)?.append(...kept(start.available));
    container.querySelector(`:scope > ${CHOSEN}`)?.append(...kept(start.chosen));
  }
}
