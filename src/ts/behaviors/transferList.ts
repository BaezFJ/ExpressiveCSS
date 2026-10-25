import { Utils } from '../core/utils';

/** Each button's source list, destination list, and whether it moves every row or only the checked ones. */
const MOVES = new Map([['add', { from: '.transfer-available', to: '.transfer-chosen', all: false }]]);

/**
 * Transfer lists. A `.transfer-list` holds a `.transfer-available` and a
 * `.transfer-chosen` list of checkbox rows, with `[data-transfer]` buttons
 * between them. `add` moves the checked rows of the available list to the end
 * of the chosen list, unchecked and in their order.
 *
 * The checkboxes carry no name. When the form builds its data, each row of
 * the chosen list adds its checkbox value under the container's `data-name`,
 * in the chosen list's order. The listeners are on the document, so a list
 * added later needs no call, but a form inside a shadow root gets no entries.
 */
export class TransferList {
  // A second Init adds nothing: addEventListener ignores a listener it has.
  static Init() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', TransferList._onClick);
    document.addEventListener('formdata', TransferList._onFormData, { capture: true });
  }

  private static _onClick(e: MouseEvent) {
    // A click on a disabled button's icon still reaches the document, so the selector skips it.
    const button = Utils.closestInPath(e, '.transfer-list [data-transfer]:not(:disabled, [aria-disabled="true"])');
    const move = MOVES.get(button?.getAttribute('data-transfer'));
    if (!move) return;
    const container = button.closest('.transfer-list');
    const to = container.querySelector(`:scope > ${move.to}`);
    if (!to) return;
    const boxes = TransferList._boxes(container, move.from).filter((box) => !box.disabled && (move.all || box.checked));
    for (const box of boxes) {
      box.checked = false;
      to.append(box.closest('li'));
    }
  }

  /** The row checkboxes of one of a container's lists, in order. */
  private static _boxes(container: Element, list: string) {
    return [...container.querySelectorAll<HTMLInputElement>(`:scope > ${list} > li input[type="checkbox"]`)];
  }

  private static _onFormData(e: FormDataEvent) {
    const containers = (e.target as HTMLFormElement).querySelectorAll<HTMLElement>('.transfer-list:not([data-name=""])[data-name]');
    for (const container of containers) {
      for (const box of TransferList._boxes(container, '.transfer-chosen')) e.formData.append(container.dataset.name, box.value);
    }
  }
}
