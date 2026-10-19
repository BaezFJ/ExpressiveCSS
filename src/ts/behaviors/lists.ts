import { Utils } from '../core/utils';

/** A row that is one link or button from edge to edge, as the list docs write it. */
const rowTarget = ':scope > li > :is(a[href], button):only-child';

const STEPS = { ArrowUp: -1, ArrowDown: 1 };

/**
 * Keys for lists of actionable rows. In a `.list` whose rows are each a
 * single link or button, Up and Down move focus to the row before or after,
 * and Home and End to the first and last, skipping disabled rows. Every row
 * stays a Tab stop and keeps its own role, so the keys are a shortcut on
 * top of native navigation rather than a listbox. Radio rows already move
 * with the arrows, and other lists are left alone.
 */
export class Lists {
  private static _initialized = false;

  static Init() {
    if (Lists._initialized || typeof document === 'undefined') return;
    Lists._initialized = true;
    document.addEventListener('keydown', Lists._onKeydown);
  }

  private static _onKeydown = (e: KeyboardEvent) => {
    const list = Utils.eventTarget(e)?.closest('.list');
    if (!list) return;
    const target = Utils.focusTarget([...list.querySelectorAll<HTMLElement>(rowTarget)], e, STEPS);
    if (!target) return;
    e.preventDefault();
    target.focus();
  };
}
