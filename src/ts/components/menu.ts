import { Utils, restoreAttribute } from '../core/utils';
import { Component, BaseOptions } from '../core/component';

// CSS anchor positioning, where the browser has it. A menu opened from its
// trigger is anchored there and flips at the viewport edges in CSS; context
// menus open at a point and cover-trigger menus overlap their trigger, so
// both keep the measured placement, as does every browser without anchors.
/**
 * Whether a style makes its element the containing block of fixed-position
 * descendants: a transform of any kind, even an identity translate, a
 * filter, perspective or backdrop filter, layout or paint containment, or
 * will-change for one of those. Size containment and query containers do
 * not, in any engine.
 */
function containsFixed(style: CSSStyleDeclaration) {
  const effects = [style.transform, style.translate, style.rotate, style.scale, style.filter, style.perspective, style.getPropertyValue('backdrop-filter')];
  return effects.some((value) => value && value !== 'none') ||
    /paint|layout|strict|content/.test(style.contain) ||
    /transform|translate|rotate|scale|filter|perspective/.test(style.willChange);
}

/** The shadow roots an element sits in, nearest first. */
function shadowRoots(el: Element) {
  const roots: ShadowRoot[] = [];
  for (let root = el.getRootNode(); 'host' in root; root = (root as ShadowRoot).host.getRootNode()) roots.push(root as ShadowRoot);
  return roots;
}

/** An element's parent, or its shadow root's host. */
const parentOf = (el: Element): Element | null => el.parentElement ?? ((el.getRootNode() as ShadowRoot).host || null);

/**
 * The top and bottom an anchored menu can use: those of its fixed-position
 * containing block, where an ancestor makes one, within the viewport.
 */
function fixedBounds(menu: Element) {
  let block = parentOf(menu);
  while (block && !containsFixed(getComputedStyle(block))) block = parentOf(block);
  const rect = block?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
  return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
}

/**
 * The room a measured menu has when aligned at each edge of its trigger
 * `el`, within `container` or, when it lets content overflow, the viewport.
 * Aligned at `top` it starts `offset` below the trigger's top edge, and at
 * `bottom` it ends `offset` above its bottom edge. Negative room means the
 * menu does not fit that way.
 */
function room(el: HTMLElement, container: HTMLElement, menu: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, offset: number) {
  const rect = el.getBoundingClientRect();
  if (getComputedStyle(container).overflow === 'visible') {
    return {
      left: window.innerWidth - (rect.left + menu.width),
      right: rect.right - menu.width,
      top: window.innerHeight - (rect.top + menu.height + offset),
      bottom: rect.bottom - (menu.height + offset)
    };
  }
  const box = container.getBoundingClientRect();
  const x = menu.left - container.scrollLeft;
  const y = menu.top - container.scrollTop;
  return {
    left: Math.min(box.width, window.innerWidth) - (x + menu.width),
    right: x - menu.width + rect.width,
    top: Math.min(box.height, window.innerHeight) - (y + menu.height + offset),
    bottom: y + rect.height - (menu.height + offset)
  };
}

/** The keys that move between rows. Home and End go to the ends. */
const STEPS = { ArrowUp: -1, ArrowDown: 1 };
// A list's rows: its own items, and the items of each <li role="none"><ul
// role="group"> inside it.
const ROWS = ':scope > li, :scope > li > ul[role="group"] > li';

const anchorSupported = typeof CSS !== 'undefined' && !!CSS.supports?.('anchor-name: --a');

// The anchored inline properties, cleared together when the menu is reset.
const ANCHOR_STYLES = ['position', 'inset', 'max-height', 'position-anchor', 'position-area', 'position-try-fallbacks'];

export interface MenuOptions extends BaseOptions {
  /**
   * Defines the edge the menu is aligned to.
   * @default 'left'
   */
  alignment: 'left' | 'right';
  /**
   * If true, automatically focus menu el for keyboard.
   * @default true
   */
  autoFocus: boolean;
  /**
   * If true, constrainWidth to the size of the menu activator.
   *
   * A trigger narrower than the surface's own 112dp minimum cannot be
   * honoured, so such a menu is sized to its content instead - see
   * MIN_SURFACE_WIDTH.
   * @default true
   */
  constrainWidth: boolean;
  /**
   * Provide an element that will be the bounding container of the menu.
   * @default null
   */
  container: Element | ShadowRoot;
  /**
   * If false, the menu will show below the trigger.
   * That is the M3 placement. Pass `true` to cover the trigger.
   * @default false
   */
  coverTrigger: boolean;
  /**
   * The side of the trigger the menu opens on when there is room, such as
   * 'top' for a trigger in a bottom bar. It flips when there is not.
   * @default 'bottom'
   */
  placement: 'bottom' | 'top';
  /**
   * If true, close menu on item click.
   * @default true
   */
  closeOnClick: boolean;
  /**
   * If true, the menu will open on hover.
   * @default false
   */
  hover: boolean;
  /**
   * If true, the trigger is a region and the menu is its context menu: it
   * opens at the pointer on right-click, long-press or the keyboard context
   * menu key instead of on click. `data-context-menu` on the trigger sets it.
   * @default false
   */
  contextMenu: boolean;
  /**
   * The duration of the transition enter in milliseconds.
   * @default 150
   */
  inDuration: number;
  /**
   * The duration of the transition out in milliseconds.
   * @default 250
   */
  outDuration: number;
  /**
   * Function called when menu starts entering.
   * @default null
   */
  onOpenStart: (el: HTMLElement) => void;
  /**
   * Function called when menu finishes entering.
   * @default null
   */
  onOpenEnd: (el: HTMLElement) => void;
  /**
   * Function called when menu starts exiting.
   * @default null
   */
  onCloseStart: (el: HTMLElement) => void;
  /**
   * Function called when menu finishes exiting.
   * @default null
   */
  onCloseEnd: (el: HTMLElement) => void;
  /**
   * Function called when item is clicked.
   * @default null
   */
  onItemClick: (el: HTMLLIElement) => void;
}

// The menu surface's own width bounds, stated in `components/_menu.scss` and
// restated here because the constraint below has to reason about them.
const MIN_SURFACE_WIDTH = 112;
const MAX_SURFACE_WIDTH = 280;

const _defaults: MenuOptions = {
  alignment: 'left',
  autoFocus: true,
  constrainWidth: true,
  container: null,
  coverTrigger: false,
  placement: 'bottom',
  closeOnClick: true,
  hover: false,
  contextMenu: false,
  inDuration: 150,
  outDuration: 250,
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null,
  onItemClick: null
};

const SPACE = ' ';

export class Menu extends Component<MenuOptions> {
  static _menus: Menu[] = [];
  /** ID of the menu element. */
  id: string;
  /** The DOM element of the menu. */
  menuEl: HTMLElement;
  /** If the menu is open. */
  isOpen: boolean;
  /** If the menu content is scrollable. */
  isScrollable: boolean;
  isTouchMoving: boolean;
  /** The index of the item focused. */
  focusedIndex: number;
  filterQuery: string[];
  filterTimeout: ReturnType<typeof setTimeout>;
  private _pendingTimers = new Set<ReturnType<typeof setTimeout>>();
  private _transition = 0;
  private _originalInert: string | null;
  private _menuClickTargets = new WeakMap<Event, HTMLElement>();
  // True while Space activates a row, so the click it sends can keep a radio
  // menu open.
  private _spaceActivation = false;
  /** Whether the pointer opened the menu, so opening leaves focus where it was. */
  private _openedByHover = false;
  /**
   * Viewport point the open context menu belongs to. Null outside a
   * right-click, so a keyboard or programmatic open uses the region's corner
   * rather than an old pointer position.
   */
  private _contextPoint: { x: number; y: number } | null = null;
  /** What had focus when a context menu opened; focus goes back there. */
  private _contextReturn: HTMLElement | null = null;

  constructor(el: HTMLElement, options: Partial<MenuOptions>) {
    super(el, { contextMenu: el.hasAttribute('data-context-menu'), ...options });
    this.el['Expressive_Menu'] = this;

    Menu._menus.push(this);
    this.id = Utils.getIdFromTrigger(el);
    this.menuEl = Utils.getElementById(el, this.id);

    this.isOpen = false;
    this.isScrollable = false;
    this.isTouchMoving = false;
    this.focusedIndex = -1;
    this.filterQuery = [];
    // A context region is content, not a button: expanded, haspopup and
    // controls are not valid on it, and the menu key is how it is discovered.
    if (!this.options.contextMenu) {
      this.el.ariaExpanded = 'false';
      if (!this.el.hasAttribute('aria-haspopup')) this.el.setAttribute('aria-haspopup', 'menu');
      if (this.id && !this.el.hasAttribute('aria-controls'))
        this.el.setAttribute('aria-controls', this.id);
    }

    // Without a menu, moving it inserts a literal "null" text node and the
    // trigger's handlers would cancel its own clicks and keys to open nothing.
    if (!this.menuEl) {
      console.warn(`Menu skipped: no element matches target "${this.id}".`, el);
      return;
    }
    this._originalInert = this.menuEl.getAttribute('inert');
    // Keep the menu next to the trigger so positioning stays local.
    this._moveMenuToElement();
    this._setupAccessibility();
    this._makeMenuFocusable();
    this._setupSubmenus();
    this._setupEventHandlers();
  }

  static get defaults(): MenuOptions {
    return _defaults;
  }

  static getInstance(el: HTMLElement): Menu {
    return el['Expressive_Menu'];
  }

  destroy() {
    this._clearPendingTimers();
    this.isOpen = false;
    this._setExpanded(false);
    if (this.menuEl) Utils.setAnchorName(this.el, `--menu-${this.menuEl.id}`, false);
    clearTimeout(this.filterTimeout);
    this._resetMenuStyles();
    this._restoreInert();
    this._removeEventHandlers();
    // Temporary handlers only exist while open, but removing them is a no-op
    // otherwise and leaving them attached leaks the instance.
    this._removeTemporaryEventHandlers();
    const index = Menu._menus.indexOf(this);
    if (index >= 0) Menu._menus.splice(index, 1);
    this.el['Expressive_Menu'] = undefined;
  }

  _setupEventHandlers() {
    // Trigger keydown handler
    this.el.addEventListener('keydown', this._handleTriggerKeydown);
    // Item click handler
    this.menuEl?.addEventListener('click', this._handleMenuClick);
    if (this.menuEl?.querySelector(':scope > li > menu')) {
      this.menuEl.addEventListener('mouseover', this._handleSubmenuAlign);
    }
    if (this.options.contextMenu) {
      this.el.addEventListener('contextmenu', this._handleContextMenu);
    } else if (this.options.hover) {
      // Hover event handlers
      this.el.addEventListener('mouseenter', this._handleMouseEnter);
      this.el.addEventListener('mouseleave', this._handleMouseLeave);
      this.menuEl.addEventListener('mouseleave', this._handleMouseLeave);
      // Click event handlers
    } else {
      this.el.addEventListener('click', this._handleClick);
    }
  }

  _removeEventHandlers() {
    // `menuEl` is optional-chained on the way in (the trigger may point at
    // an id that does not resolve); it has to be here too, or destroy() throws
    // before it can detach anything else.
    this.el.removeEventListener('keydown', this._handleTriggerKeydown);
    this.menuEl?.removeEventListener('click', this._handleMenuClick);
    this.menuEl?.removeEventListener('mouseover', this._handleSubmenuAlign);
    if (this.options.contextMenu) {
      this.el.removeEventListener('contextmenu', this._handleContextMenu);
    } else if (this.options.hover) {
      this.el.removeEventListener('mouseenter', this._handleMouseEnter);
      this.el.removeEventListener('mouseleave', this._handleMouseLeave);
      this.menuEl?.removeEventListener('mouseleave', this._handleMouseLeave);
    } else {
      this.el.removeEventListener('click', this._handleClick);
    }
  }

  _setupTemporaryEventHandlers() {
    document.addEventListener('click', this._handleDocumentClick);
    this.menuEl?.addEventListener('pointerdown', this._handleMenuPointerdown, { passive: true });
    this.menuEl?.addEventListener('touchmove', this._handleDocumentTouchmove, { passive: true });
    document.addEventListener('touchmove', this._handleDocumentTouchmove, {
      passive: true
    });
    this.menuEl?.addEventListener('keydown', this._handleMenuKeydown);
    document.addEventListener('keydown', this._handleDocumentKeydown);
    window.addEventListener('resize', this._handleWindowResize);
    // A right-click elsewhere fires no click, so it would leave the menu open.
    if (this.options.contextMenu) document.addEventListener('contextmenu', this._handleDocumentContextMenu);
  }

  _removeTemporaryEventHandlers() {
    document.removeEventListener('click', this._handleDocumentClick);
    this.menuEl?.removeEventListener('pointerdown', this._handleMenuPointerdown);
    this.menuEl?.removeEventListener('touchmove', this._handleDocumentTouchmove);
    document.removeEventListener('touchmove', this._handleDocumentTouchmove);
    this.menuEl?.removeEventListener('keydown', this._handleMenuKeydown);
    document.removeEventListener('keydown', this._handleDocumentKeydown);
    window.removeEventListener('resize', this._handleWindowResize);
    document.removeEventListener('contextmenu', this._handleDocumentContextMenu);
  }

  _handleContextMenu = (e: MouseEvent) => {
    // A nested region already answered this right-click; this one closes so
    // two menus never stack.
    if (e.defaultPrevented) {
      this.close();
      return;
    }
    // A right-click on another open menu inside this region belongs to that
    // menu, which keeps itself open.
    const path = e.composedPath();
    if (Menu._menus.some((menu) => menu !== this && menu.isOpen && path.includes(menu.menuEl))) return;
    e.preventDefault();
    if (!this.isOpen) {
      const root = this.el.getRootNode() as Document | ShadowRoot;
      this._contextReturn = root.activeElement instanceof HTMLElement ? root.activeElement : null;
    }
    // The menu key and Shift+F10 fire this too, with a point that may sit
    // outside the region (0, 0 in some engines). Those leave the point unset
    // and open at the region's start corner.
    const rect = this.el.getBoundingClientRect();
    const fromPointer =
      (e.clientX !== 0 || e.clientY !== 0) &&
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom;
    this._contextPoint = fromPointer ? { x: e.clientX, y: e.clientY } : null;
    if (this.isOpen) this.recalculateDimensions();
    else this.open();
  };

  _handleDocumentContextMenu = (e: MouseEvent) => {
    const path = e.composedPath();
    // A right-click on the menu itself keeps it open and the browser's own
    // menu shut.
    if (path.includes(this.menuEl)) {
      e.preventDefault();
      return;
    }
    if (!path.includes(this.el)) this.close();
  };

  _handleClick = (e: MouseEvent) => {
    e.preventDefault();
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  };

  _handleMouseEnter = () => {
    if (this.isOpen) return;
    // A pointer passing over the trigger must not pull focus out of whatever
    // the user is typing in, so a hover-opened menu leaves focus alone.
    this._openedByHover = true;
    this.open();
  };

  _handleMouseLeave = (e: MouseEvent) => {
    const toEl = e.relatedTarget as HTMLElement;
    // relatedTarget is null when the pointer leaves the window entirely.
    if (!toEl) {
      this.close();
      return;
    }
    // Close hover menu if mouse did not leave to either active menu-trigger or menu-content
    const leaveToActiveMenuTrigger = toEl.closest('.menu-trigger')?.['Expressive_Menu']?.isOpen;
    if (!leaveToActiveMenuTrigger && !this.menuEl?.contains(toEl)) this.close();
  };

  _handleDocumentClick = (e: MouseEvent) => {
    const path = e.composedPath();
    const menuTarget = this._menuClickTargets.get(e);
    this._menuClickTargets.delete(e);
    // A click on the trigger belongs to the trigger's own click handler (which
    // toggles), not to outside dismissal: an Autocomplete input has no toggle,
    // so moving the caret closed its list. A context region still closes on a
    // left click, since that is how its menu is dismissed.
    if (!menuTarget && !this.options.contextMenu && path.includes(this.el)) {
      this.isTouchMoving = false;
      return;
    }
    const target = menuTarget ?? <HTMLElement>(path[0] || e.target);
    const inside = !!menuTarget || path.includes(this.menuEl) || this.menuEl?.contains(target);
    if (this._isSubmenuTriggerClick(target)) return;
    if (inside && this._closesOnClick(target)) {
      this.close();
    } else if (!inside) {
      // Do this one frame later so that if the element clicked also triggers _handleClick
      // For example, if a label for a select was clicked, that we don't close/open the menu
      this._schedule(() => this.close(), 0);
    }
    this.isTouchMoving = false;
  };

  // A hover-opened menu does not hold focus, so its own keydown handler never
  // sees Escape. Close it from wherever focus is, without moving focus, and
  // take the key only when it was pressed on the trigger.
  _handleDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !this._openedByHover) return;
    if (Utils.focusIsIn(this.el)) e.preventDefault();
    this.close();
  };

  _handleTriggerKeydown = (e: KeyboardEvent) => {
    // A context region keeps its keys for its own content; the browser turns
    // the menu key and Shift+F10 into a contextmenu event.
    if (this.options.contextMenu) return;
    // M3: Space, Enter, Arrow Down, and Arrow Up open a closed menu.
    const opensMenu =
      e.key === SPACE ||
      e.key === 'Enter' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowUp';
    if (!opensMenu) return;
    if (!this.isOpen) {
      e.preventDefault();
      this.open();
    } else if (this._openedByHover) {
      // The keyboard takes over a menu the pointer opened.
      e.preventDefault();
      this._openedByHover = false;
      this._focusInitialItem();
    }
  };

  // A scroll ends without a click, which is the only other place the flag is
  // cleared, so a new gesture has to clear it or the next tap is ignored.
  _handleMenuPointerdown = () => {
    this.isTouchMoving = false;
  };

  _handleDocumentTouchmove = (e: TouchEvent) => {
    const target = <HTMLElement>e.target;
    if (e.composedPath().includes(this.menuEl) || this.menuEl?.contains(target)) {
      this.isTouchMoving = true;
    }
  };

  _handleMenuClick = (e: MouseEvent) => {
    const target = <HTMLElement>e.target;
    // Closed shadow roots hide the original target from document listeners.
    this._menuClickTargets.set(e, target);
    const li = target.closest('li');
    if (li?.matches('.disabled, [aria-disabled="true"]')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (li && this._isSubmenuTriggerClick(target)) {
      e.preventDefault();
      e.stopPropagation();
      this._toggleSubmenu(li);
      return;
    }
    if (li) this._activateItem(li);
  };

  private _activateItem(li: HTMLLIElement) {
    const checked = this._toggleChecked(li);
    if (!this._notify('select', this.options.onItemClick, { args: [li], detail: { item: li } })) return;
    if (checked !== null) this._notify('change', null, { detail: { item: li, checked } });
  }

  // A menuitemcheckbox flips aria-checked, and a menuitemradio checks itself
  // and unchecks its group, before anyone hears of the click. Any other row,
  // or a radio that was already checked, returns null.
  private _toggleChecked(li: HTMLElement): boolean | null {
    const role = li.getAttribute('role');
    if (role === 'menuitemradio') return this._checkRadio(li);
    if (role !== 'menuitemcheckbox') return null;
    const checked = li.getAttribute('aria-checked') !== 'true';
    li.setAttribute('aria-checked', String(checked));
    return checked;
  }

  // A radio's group is its parent list: a <ul role="group">, or for radio
  // rows outside any group, their menu.
  private _checkRadio(li: HTMLElement): true | null {
    if (li.getAttribute('aria-checked') === 'true') return null;
    li.parentElement.querySelectorAll(':scope > li[role="menuitemradio"]').forEach((radio) => {
      radio.setAttribute('aria-checked', String(radio === li));
    });
    return true;
  }

  private _isCheckboxRow(el: Element | null | undefined) {
    return el?.closest('li')?.getAttribute('role') === 'menuitemcheckbox';
  }

  // isTouchMoving: a scroll on mobile is not a choice.
  private _closesOnClick(target: HTMLElement) {
    return this.options.closeOnClick && !this.isTouchMoving && !this._keepsOpen(target);
  }

  // Click and Space keep a checkbox menu open so several items can be
  // toggled. Space keeps a radio menu open too; a click on a radio closes it.
  private _keepsOpen(target: HTMLElement) {
    const role = target.closest('li')?.getAttribute('role');
    if (role === 'menuitemcheckbox') return true;
    return this._spaceActivation && role === 'menuitemradio';
  }

  // Enter toggles a checkbox item and then closes, as it does on any item.
  private _closeAfterEnter(e: KeyboardEvent, row: Element | undefined) {
    if (e.key === 'Enter' && this.options.closeOnClick && this._isCheckboxRow(row)) this.close();
  }

  private _setupAccessibility() {
    if (!this.menuEl) return;
    if (!this.menuEl.hasAttribute('role')) this.menuEl.setAttribute('role', 'menu');

    const menus = [this.menuEl, ...this.menuEl.querySelectorAll('menu')];
    menus.forEach((menu) => {
      if (!menu.hasAttribute('role')) menu.setAttribute('role', 'menu');
      if (menu.getAttribute('role') !== 'menu') return;

      menu.querySelectorAll(ROWS).forEach((li) => {
        if (li.classList.contains('divider')) {
          if (!li.hasAttribute('role')) li.setAttribute('role', 'separator');
          return;
        }
        if (li.classList.contains('gap')) {
          li.setAttribute('aria-hidden', 'true');
          return;
        }
        if (li.classList.contains('label') || li.classList.contains('optgroup')) {
          if (!li.hasAttribute('role')) li.setAttribute('role', 'presentation');
          return;
        }
        if (!li.hasAttribute('role')) li.setAttribute('role', 'menuitem');
        if (li.classList.contains('disabled') && !li.hasAttribute('aria-disabled')) {
          li.setAttribute('aria-disabled', 'true');
        }
      });
    });
  }

  private _isSubmenuTriggerClick(target: HTMLElement) {
    if (!this.menuEl) return false;
    const li = target.closest('li');
    if (!li || !this.menuEl.contains(li)) return false;
    const submenu = li.querySelector(':scope > menu');
    if (!submenu) return false;
    return !submenu.contains(target);
  }

  private _setupSubmenus() {
    this.menuEl?.querySelectorAll('li').forEach((li) => {
      if (!li.querySelector(':scope > menu')) return;
      const trigger = li.querySelector(':scope > a, :scope > button, :scope > span') ?? li;
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  private _toggleSubmenu(li: HTMLElement) {
    const open = !li.classList.contains('open');
    li.parentElement?.querySelectorAll(':scope > li.open').forEach((other) => {
      if (other !== li) this._closeSubmenu(other as HTMLElement);
    });
    li.classList.toggle('open', open);
    if (open) this._alignSubmenu(li);
    this._syncSubmenuAria(li, open);
  }

  private _syncSubmenuAria(li: HTMLElement, open: boolean) {
    const trigger = li.querySelector(':scope > a, :scope > button, :scope > span') ?? li;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  private _handleSubmenuAlign = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const li = target.closest('li');
    if (li?.querySelector(':scope > menu') && this.menuEl?.contains(li)) {
      this._alignSubmenu(li as HTMLElement);
    }
  };

  private _alignSubmenu(li: HTMLElement) {
    const menu = li.querySelector(':scope > menu') as HTMLElement | null;
    if (!menu) return;
    // Flyouts stay `display: block` (visibility/opacity hide them) so the
    // rect is readable without temporarily painting the menu.
    li.classList.remove('submenu-start');
    const rect = menu.getBoundingClientRect();
    if (rect.left < 8 || rect.right > window.innerWidth - 8) li.classList.add('submenu-start');
  }

  private _closeSubmenu(li: HTMLElement) {
    li.classList.remove('open', 'submenu-start');
    this._syncSubmenuAria(li, false);
  }

  private _closeSubmenus() {
    this.menuEl?.querySelectorAll('li.open').forEach((li) => this._closeSubmenu(li as HTMLElement));
  }

  private _containingSubmenu(e: Event): HTMLElement | null {
    const target = e.target;
    if (!(target instanceof Element)) return null;
    const submenu = target.closest('li > menu');
    if (submenu instanceof HTMLElement && this.menuEl?.contains(submenu)) return submenu;
    return null;
  }

  private _focusedRow(e: Event): HTMLElement | null {
    const target = e.target;
    if (!(target instanceof Element)) return null;
    const li = target.closest('li');
    if (li instanceof HTMLElement && this.menuEl?.contains(li)) return li;
    return null;
  }

  _handleMenuKeydown = (e: KeyboardEvent) => {
    if (!this.isOpen || !Utils.plainKey(e) || Utils.isComposing(e)) return;
    const list = this._containingSubmenu(e) ?? this.menuEl;
    const rtl = getComputedStyle(list).direction === 'rtl';
    const openKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backKey = rtl ? 'ArrowRight' : 'ArrowLeft';
    if ([openKey, backKey, 'ArrowUp', 'ArrowDown', 'Escape', 'Tab'].includes(e.key)) {
      clearTimeout(this.filterTimeout);
      this._resetFilterQuery();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      this.close();
    } else if (e.key === openKey) {
      const li = this._focusedRow(e);
      if (li?.querySelector(':scope > menu') && !li.matches('.disabled, [aria-disabled="true"]')) {
        e.preventDefault();
        li.classList.add('open');
        this._alignSubmenu(li);
        this._syncSubmenuAria(li, true);
        const first = Array.from(li.querySelector(':scope > menu').children).find(
          child => child instanceof HTMLElement && child.tabIndex !== -1
        ) as HTMLElement | undefined;
        if (first) this._focusRow(first);
      }
    } else if (e.key === backKey) {
      const submenu = this._containingSubmenu(e);
      if (submenu) {
        e.preventDefault();
        const parentLi = submenu.parentElement as HTMLElement;
        this._closeSubmenu(parentLi);
        this._focusRow(parentLi);
      }
    }
    // Up and Down move a row, Home and End to the ends.
    else if (this._moveFocus(list, e)) {
      e.preventDefault();
    }
    // SPACE OR ENTER selects the focused item.
    else if (e.key === 'Enter' || e.key === SPACE) {
      const li = this._focusedRow(e);
      e.preventDefault();
      if (li?.matches('.disabled, [aria-disabled="true"]')) return;
      if (li?.querySelector(':scope > menu')) {
        this._toggleSubmenu(li);
        return;
      }
      const focusedElement = li ?? this.menuEl.children[this.focusedIndex];
      const activatableElement = <HTMLElement>focusedElement?.querySelector(':scope > a, :scope > button');
      this._spaceActivation = e.key === SPACE;
      if (!!activatableElement) {
        activatableElement.click();
      } else if (focusedElement instanceof HTMLElement) {
        focusedElement.click();
      }
      this._spaceActivation = false;
      this._closeAfterEnter(e, focusedElement);
    }
    // Close menu on ESC
    else if (e.key === 'Escape') {
      e.preventDefault();
      const openSub = this._containingSubmenu(e)?.parentElement ??
        Array.from(this.menuEl.querySelectorAll('li.open')).reverse()[0];
      if (openSub) {
        this._closeSubmenu(openSub as HTMLElement);
        this._focusRow(openSub as HTMLElement);
      } else {
        this.close();
      }
    }

    const keyText = e.key.toLowerCase();
    if (e.key.length === 1 && e.key !== SPACE) {
      this.filterQuery.push(keyText);
      const string = this.filterQuery.join('');
      // textContent rather than innerText: this scans every item on every
      // keystroke, and innerText forces a layout flush per item.
      const newOptionEl = this._rows(list).find(
        (el) => !el.matches('.disabled, [aria-disabled="true"]') &&
          Array.from(el.childNodes).filter(node => !(node instanceof Element && node.matches('menu')))
            .map(node => node.textContent).join('').trim().toLowerCase().startsWith(string)
      );
      if (newOptionEl) {
        this._focusRow(newOptionEl as HTMLElement);
      }
      // Re-arm rather than stack: without the clear, every keystroke left a live
      // timer behind and the query could reset while the user was still typing.
      clearTimeout(this.filterTimeout);
      this.filterTimeout = setTimeout(this._resetFilterQuery, 1000);
    }
  };

  _handleWindowResize = () => {
    // Only re-place the menu if it's still visible
    // Accounts for elements hiding via media queries
    if (this.el.offsetParent) {
      this.recalculateDimensions();
    }
  };

  _resetFilterQuery = () => {
    this.filterQuery = [];
  };

  private _restoreInert() {
    if (this.menuEl) restoreAttribute(this.menuEl, 'inert', this._originalInert);
  }

  // focusedIndex is reset on close and only covers one list, so clearing by
  // index left an old highlight behind after reopening or a typeahead jump.
  private _clearActive() {
    this.menuEl?.querySelectorAll('li.active').forEach((li) => li.classList.remove('active'));
  }

  private _focusRow(item: HTMLElement) {
    this._clearActive();
    this.focusedIndex = Array.from(item.parentElement.children).indexOf(item);
    item.focus({ preventScroll: true });
    item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  _resetMenuStyles() {
    // destroy() runs this even when the menu target was never found.
    if (!this.menuEl) return;
    this.menuEl.style.display = '';
    this._resetMenuPositioningStyles();
    this.menuEl.style.transform = '';
    this.menuEl.style.opacity = '';
  }

  _resetMenuPositioningStyles() {
    this.menuEl.style.width = '';
    this.menuEl.style.height = '';
    this.menuEl.style.left = '';
    this.menuEl.style.top = '';
    this.menuEl.style.transformOrigin = '';
    for (const property of ANCHOR_STYLES) this.menuEl.style.removeProperty(property);
    this._stopReanchoring();
  }

  _moveMenuToElement(containerEl: HTMLElement = null) {
    if (this.options.container) {
      this.options.container.append(this.menuEl);
      return;
    }
    if (containerEl) {
      if (!containerEl.contains(this.menuEl)) containerEl.append(this.menuEl);
      return;
    }
    this.el.after(this.menuEl);
  }

  _makeMenuFocusable() {
    if (!this.menuEl) return;
    this.menuEl.popover = '';
    // Focus moves directly to menu items; the surface itself is not a stop.
    this.menuEl.tabIndex = -1;
    // Only set tabindex if it hasn't been set by user
    this.menuEl.querySelectorAll(':scope li').forEach((el) => {
      if (el.matches('.divider, .gap, .label, .optgroup, [role="none"]')) {
        el.setAttribute('tabindex', '-1');
        return;
      }
      if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
  }

  /**
   * Moves focus for Up, Down, Home or End among the list's focusable rows,
   * without wrapping, and says whether the key was one of those.
   */
  private _moveFocus(list: Element, e: KeyboardEvent) {
    const rows = this._rows(list);
    const from = this._focusedRow(e) ?? list.children[this.focusedIndex];
    const index = Utils._keyIndex(e.key, rows.indexOf(from as HTMLElement), rows.length, STEPS);
    if (Number.isNaN(index)) return false;
    const row = rows[index];
    if (row) {
      this._focusRow(row);
      row.classList.add('active');
    }
    return true;
  }

  /** The list's rows that take focus, in document order. */
  private _rows(list: Element) {
    return Array.from(list.querySelectorAll(ROWS)).filter(
      (row): row is HTMLElement => row instanceof HTMLElement && row.tabIndex !== -1
    );
  }

  private _focusInitialItem() {
    if (!this.menuEl || !this.options.autoFocus) return;
    const first = this._rows(this.menuEl)[0];
    if (!first) return;
    this._clearActive();
    this.focusedIndex = Array.from(first.parentElement.children).indexOf(first);
    first.focus({ preventScroll: true });
  }

  _focusFocusedItem() {
    if (
      this.focusedIndex >= 0 &&
      this.focusedIndex < this.menuEl.children.length &&
      this.options.autoFocus
    ) {
      (this.menuEl.children[this.focusedIndex] as HTMLElement).focus({
        preventScroll: true
      });
      this.menuEl.children[this.focusedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }

  /**
   * Whether a measured menu opens upward: when there is no room below, or
   * when placement 'top' asks for it and there is room above.
   */
  private _opensUp(space: { top: number; bottom: number }) {
    return space.top < 0 || (this.options.placement === 'top' && space.bottom >= 0);
  }

  _getMenuPosition(closestOverflowParent: HTMLElement) {
    const triggerBRect = this.el.getBoundingClientRect();
    const menuBRect = this.menuEl.getBoundingClientRect();

    let idealHeight = menuBRect.height;
    let idealWidth = menuBRect.width;
    let idealXPos = triggerBRect.left - menuBRect.left;
    let idealYPos = triggerBRect.top - menuBRect.top;

    const space = room(
      this.el,
      closestOverflowParent,
      { left: idealXPos, top: idealYPos, height: idealHeight, width: idealWidth },
      this.options.coverTrigger ? 0 : triggerBRect.height
    );

    let verticalAlignment = 'top';
    let horizontalAlignment = this.options.alignment;
    idealYPos += this.options.coverTrigger ? 0 : triggerBRect.height;

    // Reset isScrollable
    this.isScrollable = false;

    if (this._opensUp(space)) {
      if (space.bottom >= 0) {
        verticalAlignment = 'bottom';

        if (!this.options.coverTrigger) {
          idealYPos -= triggerBRect.height;
        }
      } else {
        this.isScrollable = true;

        // Determine which side has most space and cutoff at correct height
        idealHeight -= 20; // Add padding when cutoff
        if (space.bottom > space.top) {
          verticalAlignment = 'bottom';
          idealHeight += space.bottom;
          idealYPos -= this.options.coverTrigger
            ? space.bottom - 20
            : space.bottom - 20 + triggerBRect.height;
        } else {
          idealHeight += space.top;
        }
      }
    }

    // If preferred horizontal alignment is possible
    if (space[horizontalAlignment] < 0) {
      const oppositeAlignment = horizontalAlignment === 'left' ? 'right' : 'left';
      if (space[oppositeAlignment] >= 0) {
        horizontalAlignment = oppositeAlignment;
      } else {
        // Determine which side has most space and cutoff at correct height
        if (space.right > space.left) {
          horizontalAlignment = 'right';
          idealWidth += space.right;
          idealXPos -= space.right;
        } else {
          horizontalAlignment = 'left';
          idealWidth += space.left;
        }
      }
    }

    if (verticalAlignment === 'bottom') {
      idealYPos =
        idealYPos - menuBRect.height + (this.options.coverTrigger ? triggerBRect.height : 0);
    }
    if (horizontalAlignment === 'right') {
      idealXPos = idealXPos - menuBRect.width + triggerBRect.width;
    }
    return {
      x: idealXPos,
      y: idealYPos,
      verticalAlignment: verticalAlignment,
      horizontalAlignment: horizontalAlignment,
      height: idealHeight,
      width: idealWidth
    };
  }

  private _schedule(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      this._pendingTimers.delete(timer);
      callback();
    }, delay);
    this._pendingTimers.add(timer);
  }

  private _clearPendingTimers() {
    for (const timer of this._pendingTimers) clearTimeout(timer);
    this._pendingTimers.clear();
    return ++this._transition;
  }

  _animateIn() {
    const transition = this._transition;
    // Decided now: a hover open leaves focus alone, and if the keyboard takes
    // the menu over before the animation ends it has already placed focus,
    // so the delayed call must not pull it back to the first item.
    const focusOnOpen = !this._openedByHover;
    const duration = this.options.inDuration;
    this.menuEl.style.transition = 'none';
    // from
    this.menuEl.style.opacity = '0';
    this.menuEl.style.transform = 'scale(0.85)';
    this._schedule(() => {
      this.menuEl.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      this.menuEl.style.opacity = '1';
      this.menuEl.style.transform = 'scale(1)';
    }, 1);
    this._schedule(() => {
      if (focusOnOpen) this._focusInitialItem();
      if (transition !== this._transition) return;
      this._notify('opened', this.options.onOpenEnd, { current: () => transition === this._transition });
    }, duration);
  }

  _animateOut() {
    const transition = this._transition;
    const duration = this.options.outDuration;
    // easeOutQuad (opacity) & easeOutQuint
    this.menuEl.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    // to
    this.menuEl.style.opacity = '0';
    this.menuEl.style.transform = 'scale(0.85)';
    this._schedule(() => {
      this._resetMenuStyles();
      this._notify('closed', this.options.onCloseEnd, { current: () => transition === this._transition });
    }, duration);
  }

  private _getClosestAncestor(el: HTMLElement, condition: (Function) => boolean): HTMLElement {
    let ancestor: Node = el.parentNode;
    while (ancestor !== null && ancestor !== undefined && ancestor !== document) {
      // A shadow root is not an element and getComputedStyle() rejects it, so
      // step over it to the host - the elements that actually clip the menu
      // are above that.
      if (ancestor.nodeType === Node.ELEMENT_NODE && condition(ancestor)) {
        return <HTMLElement>ancestor;
      }
      ancestor = ancestor.parentNode ?? (<ShadowRoot>ancestor).host;
    }
    return null;
  }

  _placeMenu() {
    // Container here will be closest ancestor with overflow: hidden
    let closestOverflowParent: HTMLElement = this._getClosestAncestor(
      this.menuEl,
      (ancestor: HTMLElement) => {
        return (
          !['HTML', 'BODY'].includes(ancestor.tagName) &&
          getComputedStyle(ancestor).overflow !== 'visible'
        );
      }
    );
    // Fallback
    if (!closestOverflowParent) {
      const parent = !!this.menuEl.offsetParent ? this.menuEl.offsetParent : this.menuEl.parentNode;
      // Same hazard as the walk: the parent is a shadow root when the menu was
      // moved into one, and the next line reads its computed style.
      closestOverflowParent = <HTMLElement>((<ShadowRoot>parent).host ?? parent);
    }

    if (getComputedStyle(closestOverflowParent).position === 'static')
      closestOverflowParent.style.position = 'relative';

    // Set width before calculating positionInfo. Both callers reset the
    // positioning styles first, so this reads the surface's natural width.
    const natural = this.menuEl.getBoundingClientRect().width;
    // A trigger narrower than the surface's own minimum is not a constraint
    // the menu can honour: the width is written and `min-width` overrides it,
    // leaving the surface at the floor with every item inside it wrapped. So
    // constrain only to a trigger wide enough to mean something, and size by
    // content otherwise. An icon button and a split button's chevron are both
    // that case - 40dp and 48dp against a 112dp floor.
    const triggerWidth = this.el.getBoundingClientRect().width;
    const idealWidth =
      this.options.constrainWidth && !this.options.contextMenu && triggerWidth >= MIN_SURFACE_WIDTH
        ? triggerWidth
        : Math.min(MAX_SURFACE_WIDTH, Math.max(MIN_SURFACE_WIDTH, natural));
    this.menuEl.style.width = idealWidth + 'px';

    if (this.options.contextMenu) {
      this._placeMenuAtPoint(this._contextPoint ?? this._regionCorner(), closestOverflowParent);
      return;
    }

    if (anchorSupported && !this.options.coverTrigger) this._anchorMenu();
    else this._placeByCoordinates(closestOverflowParent);
  }

  /**
   * The side an anchored menu opens on: the one asked for when the whole
   * menu fits there, or else the roomier one. The anchored height is capped
   * to its side, so a menu that would only shrink never sets off the
   * flip-block fallback, and the choice is made here.
   */
  private _side(): 'top' | 'bottom' {
    const [rect, bounds] = [this.el.getBoundingClientRect(), fixedBounds(this.menuEl)];
    const room = { top: rect.top - bounds.top, bottom: bounds.bottom - rect.bottom };
    const [asked, other] = this.options.placement === 'top' ? ['top', 'bottom'] as const : ['bottom', 'top'] as const;
    return room[asked] >= this.menuEl.scrollHeight || room[asked] >= room[other] ? asked : other;
  }

  // Below the trigger, or above it for placement 'top', starting at its left
  // edge for alignment 'left' or its right edge for 'right', with the flips
  // position-try-fallbacks offers.
  // The height is capped to the room on the chosen side, so a long menu
  // scrolls there, as in the measured path.
  private _reanchorFrame = 0;
  /** Where the open anchored menu hears scrolling. */
  private _scrollTargets: EventTarget[] = [];

  private _anchorMenu() {
    const name = `--menu-${this.menuEl.id}`;
    Utils.setAnchorName(this.el, name, true);
    const style = this.menuEl.style;
    style.position = 'fixed';
    style.inset = 'auto';
    style.maxHeight = '100%';
    style.setProperty('position-anchor', name);
    this._placeAnchored();
    // Scrolling can move the trigger so the other side has more room. A
    // scroll inside a shadow root stays there, so each root around the
    // trigger is heard as well as the window.
    this._scrollTargets = [window, ...shadowRoots(this.el)];
    this._scrollTargets.forEach((target) => target.addEventListener('scroll', this._reanchor, { capture: true, passive: true }));
    window.addEventListener('resize', this._reanchor);
  }

  /** At most once a frame while the anchored menu is open, chooses its side again. */
  private _reanchor = () => {
    if (this._reanchorFrame) return;
    this._reanchorFrame = requestAnimationFrame(() => {
      this._reanchorFrame = 0;
      if (this.isOpen) this._placeAnchored();
    });
  };

  private _stopReanchoring() {
    this._scrollTargets.forEach((target) => target.removeEventListener('scroll', this._reanchor, { capture: true }));
    this._scrollTargets = [];
    window.removeEventListener('resize', this._reanchor);
    cancelAnimationFrame(this._reanchorFrame);
    this._reanchorFrame = 0;
  }

  /** The anchored menu's side, the edge it starts from and its growth origin. */
  private _placeAnchored() {
    const style = this.menuEl.style;
    const [side, edge] = [this._side(), this.options.alignment === 'right' ? 'left' : 'right'];
    style.setProperty('position-area', `${side} span-${edge}`);
    style.setProperty('position-try-fallbacks', 'flip-block, flip-inline, flip-block flip-inline');
    style.transformOrigin = `${edge === 'left' ? '100%' : '0'} ${side === 'top' ? '100%' : '0'}`;
    this.isScrollable = this.menuEl.scrollHeight > this.menuEl.clientHeight;
  }

  private _placeByCoordinates(closestOverflowParent: HTMLElement) {
    const positionInfo = this._getMenuPosition(closestOverflowParent);
    this.menuEl.style.left = positionInfo.x + 'px';
    this.menuEl.style.top = positionInfo.y + 'px';
    this.menuEl.style.height = positionInfo.height + 'px';
    this.menuEl.style.width = positionInfo.width + 'px';
    this.menuEl.style.transformOrigin = `${
      positionInfo.horizontalAlignment === 'left' ? '0' : '100%'
    } ${positionInfo.verticalAlignment === 'top' ? '0' : '100%'}`;
  }

  /** Where a context menu opens without a pointer: the region's start corner. */
  private _regionCorner() {
    const rect = this.el.getBoundingClientRect();
    const rtl = getComputedStyle(this.el).direction === 'rtl';
    return { x: rtl ? rect.right : rect.left, y: rect.bottom };
  }

  /**
   * Places a context menu with its start corner on the point, flipping to
   * the other side of the point where it would not fit. The bounds are the
   * viewport, narrowed to a scrolling or clipping ancestor the menu sits in;
   * a menu taller than them gets their height and scrolls.
   *
   * The menu rests at left/top 0 of its containing block, so its rect is the
   * offset to subtract - the same trick _getMenuPosition uses. It is measured
   * without the entry animation's scale, which a second right-click can catch.
   */
  private _placeMenuAtPoint({ x, y }: { x: number; y: number }, container: HTMLElement) {
    // A running transition would still report the interpolated scale, so it
    // is suspended for the read; the target transform is unchanged after.
    const { transform, transition } = this.menuEl.style;
    this.menuEl.style.transition = 'none';
    this.menuEl.style.transform = 'none';
    const menu = this.menuEl.getBoundingClientRect();
    this.menuEl.style.transform = transform;
    this.menuEl.style.transition = transition;

    let bounds = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    if (container && getComputedStyle(container).overflow !== 'visible') {
      const clip = container.getBoundingClientRect();
      bounds = {
        left: Math.max(bounds.left, clip.left),
        top: Math.max(bounds.top, clip.top),
        right: Math.min(bounds.right, clip.right),
        bottom: Math.min(bounds.bottom, clip.bottom)
      };
    }

    const width = menu.width;
    const height = Math.min(menu.height, bounds.bottom - bounds.top);
    this.isScrollable = height < menu.height;
    if (this.isScrollable) this.menuEl.style.height = height + 'px';

    const rtl = getComputedStyle(this.el).direction === 'rtl';
    const fitsRight = x + width <= bounds.right;
    const fitsLeft = x - width >= bounds.left;
    const leftward = rtl ? fitsLeft || !fitsRight : !fitsRight && fitsLeft;
    const upward = y + height > bounds.bottom && y - height >= bounds.top;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
    const left = clamp(leftward ? x - width : x, bounds.left, bounds.right - width);
    const top = clamp(upward ? y - height : y, bounds.top, bounds.bottom - height);
    this.menuEl.style.left = left - menu.left + 'px';
    this.menuEl.style.top = top - menu.top + 'px';
    this.menuEl.style.transformOrigin = `${leftward ? '100%' : '0'} ${upward ? '100%' : '0'}`;
  }

  private _setExpanded(expanded: boolean) {
    if (!this.options.contextMenu) this.el.ariaExpanded = String(expanded);
  }

  // A trigger whose target never resolved has no menu to open.
  private get _canOpen() {
    return !this.isOpen && !!this.menuEl && this.el['Expressive_Menu'] === this;
  }

  /**
   * Open menu.
   */
  open = () => {
    if (!this._canOpen) return;
    const transition = this._clearPendingTimers();
    this.isOpen = true;
    // onOpenStart callback
    if (!this._notify('open', this.options.onOpenStart, { current: () => transition === this._transition })) return;
    // Reset styles
    this._resetMenuStyles();
    this.menuEl.style.display = 'block';
    this._restoreInert();
    this._placeMenu();
    // Do this one frame later so that we don't bind an event handler that's immediately
    // called when the event bubbles up to the document and closes the menu
    this._schedule(() => this._setupTemporaryEventHandlers(), 0);
    // Queue handlers before initial focus, including zero-duration entry.
    this._animateIn();
    this._setExpanded(true);
  };

  /**
   * Close menu.
   */
  close = () => {
    if (!this.isOpen) return;
    const transition = this._clearPendingTimers();
    const root = this.menuEl.getRootNode() as Document | ShadowRoot;
    const focused = root.activeElement;
    this.isOpen = false;
    this._openedByHover = false;
    this.menuEl.setAttribute('inert', '');
    clearTimeout(this.filterTimeout);
    this._resetFilterQuery();
    this.focusedIndex = -1;
    this._clearActive();
    this._closeSubmenus();
    // onCloseStart callback
    if (!this._notify('close', this.options.onCloseStart, { current: () => transition === this._transition })) return;
    this._animateOut();
    this._removeTemporaryEventHandlers();
    this._setExpanded(false);
    if (this.options.autoFocus && this.menuEl.contains(focused) &&
      (root.activeElement === focused || this.el.ownerDocument.activeElement === this.el.ownerDocument.body)) {
      // A context region may not take focus itself; return to what had it.
      const back = this._contextReturn;
      (back?.isConnected && back !== this.el.ownerDocument.body ? back : this.el).focus();
    }
    this._contextReturn = null;
    this._contextPoint = null;
  };

  /**
   * While menu is open, you can recalculate its dimensions if its contents have changed.
   */
  recalculateDimensions = () => {
    if (this.isOpen) {
      this._resetMenuPositioningStyles();
      this._placeMenu();
    }
  };
}
