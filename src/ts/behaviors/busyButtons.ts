import { Utils } from '../core/utils';

const BUSY = 'button[aria-busy="true"], .button[aria-busy="true"]';

/**
 * Busy buttons. While the page sets `aria-busy="true"` on a `button` or
 * `.button`, a click on it is cancelled in the document's capture phase,
 * before handlers on the page's elements, so a mouse press, Enter, Space and
 * a form's implicit submission do nothing until the page clears the
 * attribute. Shaped buttons also show a
 * progress indicator (`_buttons.scss`). `requestSubmit()` sends no click, and
 * buttons in closed shadow roots are out of reach.
 */
export class BusyButtons {
  // A second Init adds nothing: addEventListener ignores a listener it has.
  static Init() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', BusyButtons._onClick, true);
    // Components that activate on keydown (Menu, ExpandingCard) skip the click.
    document.addEventListener('keydown', BusyButtons._onKey, true);
  }

  private static _onKey(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && Utils.closestInPath(e, BUSY)) BusyButtons._stop(e);
  }

  private static _onClick(e: MouseEvent) {
    if (Utils.closestInPath(e, BUSY)) BusyButtons._stop(e);
  }

  private static _stop(e: Event) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}
