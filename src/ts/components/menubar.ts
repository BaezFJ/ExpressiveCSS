import { Utils } from '../core/utils';
import { Component, BaseOptions } from '../core/component';
import { Menu, MenuOptions } from './menu';

export interface MenubarOptions extends BaseOptions {
  /**
   * Options for each item's Menu. The defaults size the menus to their
   * content and open them below the bar.
   * @default { constrainWidth: false, coverTrigger: false }
   */
  menuOptions: Partial<MenuOptions>;
}

const _defaults: MenubarOptions = {
  menuOptions: { constrainWidth: false, coverTrigger: false }
};

/**
 * Menubar. An application's row of menus, such as File, Edit and View. A
 * `.menubar` holds `.menu-trigger` buttons whose `data-target` menus are
 * ordinary Menus; this adds the ARIA menubar contract around them. The bar
 * is `role="menubar"` and each button a `menuitem`, with one tab stop that
 * follows focus. Left and Right move between items, wrapping, and Home and
 * End go to the first and last; with a menu open, Left and Right close it
 * and open the neighbour's, unless the focused row opens or closes a
 * submenu. Down, Up, Enter and Space open a menu, and Escape closes it,
 * through Menu itself.
 */
export class Menubar extends Component<MenubarOptions> {
  private _added: { el: Element; name: string }[] = [];

  constructor(el: HTMLElement, options: Partial<MenubarOptions>) {
    super(el, options);
    this._setAttribute(this.el, 'role', 'menubar');
    this._items.forEach((item, index) => {
      Menu.init(item, this.options.menuOptions);
      this._setAttribute(item, 'role', 'menuitem');
      item.tabIndex = index === 0 ? 0 : -1;
    });
    const { signal } = this._events;
    this.el.addEventListener('keydown', this._onBarKeydown, { signal });
    this.el.addEventListener('focusin', this._onFocusin, { signal });
    document.addEventListener('keydown', this._onMenuKeydown, { signal });
  }

  static get defaults(): MenubarOptions {
    return _defaults;
  }

  static key = 'Expressive_Menubar';

  destroy() {
    this._items.forEach((item) => {
      Menu.getInstance(item)?.destroy();
      item.removeAttribute('tabindex');
    });
    this._added.forEach(({ el, name }) => el.removeAttribute(name));
    this._added = [];
    super.destroy();
  }

  private get _items(): HTMLElement[] {
    return [...this.el.querySelectorAll<HTMLElement>(':scope > .menu-trigger')];
  }

  /** Sets an attribute the author left out, remembering it for destroy(). */
  private _setAttribute(el: Element, name: string, value: string) {
    if (el.hasAttribute(name)) return;
    el.setAttribute(name, value);
    this._added.push({ el, name });
  }

  private _step(key: string): number | null {
    const rtl = getComputedStyle(this.el).direction === 'rtl';
    if (key === 'ArrowRight') return rtl ? -1 : 1;
    if (key === 'ArrowLeft') return rtl ? 1 : -1;
    return null;
  }

  /** Focuses the first enabled item after `index` in the `step` direction, wrapping. */
  private _focusItem(index: number, step: number, open: boolean) {
    const items = this._items;
    const n = items.length;
    // focus() on a disabled button does nothing, which stranded every item
    // past it, and opening its menu would bypass the disabled state.
    const item = items
      .map((_, i) => items[(((index + step * (i + 1)) % n) + n) % n])
      .find((candidate) => !candidate.matches(':disabled, [aria-disabled="true"]'));
    if (!item) return;
    items.forEach((other) => {
      const menu = Menu.getInstance(other);
      if (other !== item && menu?.isOpen) menu.close();
    });
    item.focus();
    if (open) Menu.getInstance(item)?.open();
  }

  private _onFocusin = (e: FocusEvent) => {
    const items = this._items;
    if (!items.includes(e.target as HTMLElement)) return;
    items.forEach((item) => (item.tabIndex = item === e.target ? 0 : -1));
  };

  private _onBarKeydown = (e: KeyboardEvent) => {
    if (!Utils.plainKey(e)) return;
    const items = this._items;
    const index = items.indexOf(e.target as HTMLElement);
    if (index < 0) return;
    const step = this._step(e.key);
    // Home and End search from just outside the ends of the bar.
    if (step) this._focusItem(index, step, false);
    else if (e.key === 'Home') this._focusItem(-1, 1, false);
    else if (e.key === 'End') this._focusItem(items.length, -1, false);
    else return;
    e.preventDefault();
  };

  // Inside an open menu, Menu handles every key first and takes Left and
  // Right only for submenus; whatever it leaves moves along the bar.
  private _onMenuKeydown = (e: KeyboardEvent) => {
    const step = this._step(e.key);
    if (!step || e.defaultPrevented || !Utils.plainKey(e)) return;
    const items = this._items;
    const path = e.composedPath();
    const index = items.findIndex((item) => {
      const menu = Menu.getInstance(item);
      return menu?.isOpen && menu.menuEl && path.includes(menu.menuEl);
    });
    if (index < 0) return;
    e.preventDefault();
    this._focusItem(index, step, true);
  };
}
