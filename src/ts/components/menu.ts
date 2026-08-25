import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement, Openable } from '../core/component';

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
   * @default true
   */
  constrainWidth: boolean;
  /**
   * Provide an element that will be the bounding container of the menu.
   * @default null
   */
  container: Element;
  /**
   * If false, the menu will show below the trigger.
   * That is the M3 placement. Pass `true` to cover the trigger.
   * @default false
   */
  coverTrigger: boolean;
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

const _defaults: MenuOptions = {
  alignment: 'left',
  autoFocus: true,
  constrainWidth: true,
  container: null,
  coverTrigger: false,
  closeOnClick: true,
  hover: false,
  inDuration: 150,
  outDuration: 250,
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null,
  onItemClick: null
};

const SPACE_KEYS = [' ', 'Spacebar'];

export class Menu extends Component<MenuOptions> implements Openable {
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

  constructor(el: HTMLElement, options: Partial<MenuOptions>) {
    super(el, options, Menu);
    this.el['Expressive_Menu'] = this;

    Menu._menus.push(this);
    this.id = Utils.getIdFromTrigger(el);
    this.menuEl = document.getElementById(this.id);

    this.options = {
      ...Menu.defaults,
      ...options
    };

    this.isOpen = false;
    this.isScrollable = false;
    this.isTouchMoving = false;
    this.focusedIndex = -1;
    this.filterQuery = [];
    this.el.ariaExpanded = 'false';
    if (!this.el.hasAttribute('aria-haspopup')) this.el.setAttribute('aria-haspopup', 'menu');
    if (this.id && !this.el.hasAttribute('aria-controls'))
      this.el.setAttribute('aria-controls', this.id);

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

  /**
   * Initializes instance of Menu.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<MenuOptions>): Menu;
  /**
   * Initializes instances of Menu.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<InitElement>, options?: Partial<MenuOptions>): Menu[];
  /**
   * Initializes instances of Menu.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<MenuOptions> = {}
  ): Menu | Menu[] {
    return super.init(els, options, Menu);
  }

  static getInstance(el: HTMLElement): Menu {
    return el['Expressive_Menu'];
  }

  destroy() {
    clearTimeout(this.filterTimeout);
    this._resetMenuStyles();
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
    // Hover event handlers
    if (this.options.hover) {
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
    if (this.options.hover) {
      this.el.removeEventListener('mouseenter', this._handleMouseEnter);
      this.el.removeEventListener('mouseleave', this._handleMouseLeave);
      this.menuEl?.removeEventListener('mouseleave', this._handleMouseLeave);
    } else {
      this.el.removeEventListener('click', this._handleClick);
    }
  }

  _setupTemporaryEventHandlers() {
    document.body.addEventListener('click', this._handleDocumentClick);
    document.body.addEventListener('touchmove', this._handleDocumentTouchmove, {
      passive: true
    });
    this.menuEl?.addEventListener('keydown', this._handleMenuKeydown);
    window.addEventListener('resize', this._handleWindowResize);
  }

  _removeTemporaryEventHandlers() {
    document.body.removeEventListener('click', this._handleDocumentClick);
    document.body.removeEventListener('touchmove', this._handleDocumentTouchmove);
    this.menuEl?.removeEventListener('keydown', this._handleMenuKeydown);
    window.removeEventListener('resize', this._handleWindowResize);
  }

  _handleClick = (e: MouseEvent) => {
    e.preventDefault();
    //this._moveMenu((<HTMLElement>e.target).closest('li'));
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  };

  _handleMouseEnter = () => {
    //this._moveMenu((<HTMLElement>e.target).closest('li'));
    this.open();
  };

  _handleMouseLeave = (e: MouseEvent) => {
    const toEl = e.relatedTarget as HTMLElement;
    // relatedTarget is null when the pointer leaves the window entirely.
    if (!toEl) {
      this.close();
      return;
    }
    const leaveToMenuContent = !!(this.menuEl && toEl && this.menuEl.contains(toEl));
    let leaveToActiveMenuTrigger = false;
    const closestTrigger = toEl.closest('.menu-trigger');
    if (
      closestTrigger &&
      !!closestTrigger['Expressive_Menu'] &&
      closestTrigger['Expressive_Menu'].isOpen
    ) {
      leaveToActiveMenuTrigger = true;
    }
    // Close hover menu if mouse did not leave to either active menu-trigger or menu-content
    if (!leaveToActiveMenuTrigger && !leaveToMenuContent) {
      this.close();
    }
  };

  _handleDocumentClick = (e: MouseEvent) => {
    const target = <HTMLElement>e.target;
    if (this._isSubmenuTriggerClick(target)) return;
    if (this.options.closeOnClick && this.menuEl?.contains(target) && !this.isTouchMoving) {
      // isTouchMoving to check if scrolling on mobile.
      this.close();
    } else if (!this.menuEl?.contains(target)) {
      // Do this one frame later so that if the element clicked also triggers _handleClick
      // For example, if a label for a select was clicked, that we don't close/open the menu
      setTimeout(() => {
        if (this.isOpen) {
          this.close();
        }
      }, 0);
    }
    this.isTouchMoving = false;
  };

  _handleTriggerKeydown = (e: KeyboardEvent) => {
    // M3: Space, Enter, Arrow Down, and Arrow Up open a closed menu.
    const opensMenu =
      SPACE_KEYS.includes(e.key) ||
      Utils.keys.ENTER.includes(e.key) ||
      Utils.keys.ARROW_DOWN.includes(e.key) ||
      Utils.keys.ARROW_UP.includes(e.key);
    if (opensMenu && !this.isOpen) {
      e.preventDefault();
      this.open();
    }
  };

  _handleDocumentTouchmove = (e: TouchEvent) => {
    const target = <HTMLElement>e.target;
    if (this.menuEl?.contains(target)) {
      this.isTouchMoving = true;
    }
  };

  _handleMenuClick = (e: MouseEvent) => {
    const target = <HTMLElement>e.target;
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
    if (li && typeof this.options.onItemClick === 'function') {
      this.options.onItemClick.call(this, li);
    }
  };

  private _setupAccessibility() {
    if (!this.menuEl) return;
    if (!this.menuEl.hasAttribute('role')) this.menuEl.setAttribute('role', 'menu');

    const menus = [this.menuEl, ...this.menuEl.querySelectorAll('menu')];
    menus.forEach((menu) => {
      if (!menu.hasAttribute('role')) menu.setAttribute('role', 'menu');
      if (menu.getAttribute('role') !== 'menu') return;

      menu.querySelectorAll(':scope > li').forEach((li) => {
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
      if (other !== li) {
        other.classList.remove('open', 'submenu-start');
        this._syncSubmenuAria(other as HTMLElement, false);
      }
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
    if (rect.right > window.innerWidth - 8) li.classList.add('submenu-start');
  }

  private _closeSubmenus() {
    this.menuEl?.querySelectorAll('li.open').forEach((li) => {
      li.classList.remove('open', 'submenu-start');
      this._syncSubmenuAria(li as HTMLElement, false);
    });
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
    const arrowUpOrDown =
      Utils.keys.ARROW_DOWN.includes(e.key) || Utils.keys.ARROW_UP.includes(e.key);
    if (Utils.keys.TAB.includes(e.key)) {
      e.preventDefault();
      this.close();
    } else if (Utils.keys.ARROW_RIGHT.includes(e.key) && this.isOpen) {
      const li = this._focusedRow(e);
      if (li?.querySelector(':scope > menu')) {
        e.preventDefault();
        li.classList.add('open');
        this._alignSubmenu(li);
        this._syncSubmenuAria(li, true);
        const first = li.querySelector(':scope > menu > li') as HTMLElement | null;
        first?.focus();
      }
    } else if (Utils.keys.ARROW_LEFT.includes(e.key) && this.isOpen) {
      const submenu = this._containingSubmenu(e);
      if (submenu) {
        e.preventDefault();
        const parentLi = submenu.parentElement as HTMLElement;
        parentLi.classList.remove('open', 'submenu-start');
        this._syncSubmenuAria(parentLi, false);
        parentLi.focus();
      }
    }
    // Navigate down menu list
    else if (arrowUpOrDown && this.isOpen) {
      e.preventDefault();
      const direction = Utils.keys.ARROW_DOWN.includes(e.key) ? 1 : -1;
      const list = this._containingSubmenu(e) ?? this.menuEl;
      let newFocusedIndex = this.focusedIndex;
      let hasFoundNewIndex = false;
      do {
        newFocusedIndex = newFocusedIndex + direction;
        if (
          !!list.children[newFocusedIndex] &&
          (<HTMLLIElement>list.children[newFocusedIndex]).tabIndex !== -1
        ) {
          hasFoundNewIndex = true;
          break;
        }
      } while (newFocusedIndex < list.children.length && newFocusedIndex >= 0);

      if (hasFoundNewIndex) {
        if (this.focusedIndex >= 0) list.children[this.focusedIndex]?.classList.remove('active');
        this.focusedIndex = newFocusedIndex;
        const item = list.children[this.focusedIndex] as HTMLElement;
        item.classList.add('active');
        item.focus({ preventScroll: true });
      }
    }
    // SPACE OR ENTER selects the focused item.
    else if ((Utils.keys.ENTER.includes(e.key) || SPACE_KEYS.includes(e.key)) && this.isOpen) {
      const li = this._focusedRow(e);
      e.preventDefault();
      if (li?.matches('.disabled, [aria-disabled="true"]')) return;
      if (li?.querySelector(':scope > menu')) {
        this._toggleSubmenu(li);
        return;
      }
      const focusedElement = li ?? this.menuEl.children[this.focusedIndex];
      const activatableElement = <HTMLElement>focusedElement?.querySelector('a, button');
      if (!!activatableElement) {
        activatableElement.click();
      } else if (focusedElement instanceof HTMLElement) {
        focusedElement.click();
      }
    }
    // Close menu on ESC
    else if (Utils.keys.ESC.includes(e.key) && this.isOpen) {
      e.preventDefault();
      const openSub = this.menuEl.querySelector('li.open');
      if (openSub) {
        openSub.classList.remove('open', 'submenu-start');
        this._syncSubmenuAria(openSub as HTMLElement, false);
        (openSub as HTMLElement).focus();
      } else {
        this.close();
      }
    }

    // CASE WHEN USER TYPE LTTERS
    const keyText = e.key.toLowerCase();
    const isLetter = /[a-zA-Z0-9-_]/.test(keyText);
    const specialKeys = [
      ...Utils.keys.ARROW_DOWN,
      ...Utils.keys.ARROW_UP,
      ...Utils.keys.ENTER,
      ...Utils.keys.ESC,
      ...Utils.keys.TAB,
      ...SPACE_KEYS
    ];
    if (isLetter && !specialKeys.includes(e.key)) {
      this.filterQuery.push(keyText);
      const string = this.filterQuery.join('');
      // textContent rather than innerText: this scans every item on every
      // keystroke, and innerText forces a layout flush per item.
      const list = this._containingSubmenu(e) ?? this.menuEl;
      const newOptionEl = Array.from(list.querySelectorAll(':scope > li')).find(
        (el) => el.textContent.trim().toLowerCase().indexOf(string) === 0
      );
      if (newOptionEl) {
        this.focusedIndex = [...newOptionEl.parentNode.children].indexOf(newOptionEl);
        this._focusFocusedItem();
      }
    }
    // Re-arm rather than stack: without the clear, every keystroke left a live
    // timer behind and the query could reset while the user was still typing.
    clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(this._resetFilterQuery, 1000);
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

  _resetMenuStyles() {
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
    this.menuEl.querySelectorAll(':scope li, :scope > hr').forEach((el) => {
      if (
        el instanceof HTMLHRElement ||
        el.classList.contains('divider') ||
        el.classList.contains('gap') ||
        el.classList.contains('label') ||
        el.classList.contains('optgroup')
      ) {
        el.setAttribute('tabindex', '-1');
        return;
      }
      if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
  }

  private _focusInitialItem() {
    if (!this.menuEl || !this.options.autoFocus) return;
    const first = Array.from(this.menuEl.children).find(
      (child) => child instanceof HTMLElement && child.tabIndex !== -1
    ) as HTMLElement | undefined;
    if (!first) return;
    this.focusedIndex = Array.from(this.menuEl.children).indexOf(first);
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

  _getMenuPosition(closestOverflowParent: HTMLElement) {
    // const offsetParentBRect = this.el.offsetParent.getBoundingClientRect();
    const triggerBRect = this.el.getBoundingClientRect();
    const menuBRect = this.menuEl.getBoundingClientRect();

    let idealHeight = menuBRect.height;
    let idealWidth = menuBRect.width;
    let idealXPos = triggerBRect.left - menuBRect.left;
    let idealYPos = triggerBRect.top - menuBRect.top;

    const menuBounds = {
      left: idealXPos,
      top: idealYPos,
      height: idealHeight,
      width: idealWidth
    };

    const alignments = Utils.checkPossibleAlignments(
      this.el,
      closestOverflowParent,
      menuBounds,
      this.options.coverTrigger ? 0 : triggerBRect.height
    );

    let verticalAlignment = 'top';
    let horizontalAlignment = this.options.alignment;
    idealYPos += this.options.coverTrigger ? 0 : triggerBRect.height;

    // Reset isScrollable
    this.isScrollable = false;

    if (!alignments.top) {
      if (alignments.bottom) {
        verticalAlignment = 'bottom';

        if (!this.options.coverTrigger) {
          idealYPos -= triggerBRect.height;
        }
      } else {
        this.isScrollable = true;

        // Determine which side has most space and cutoff at correct height
        idealHeight -= 20; // Add padding when cutoff
        if (alignments.spaceOnTop > alignments.spaceOnBottom) {
          verticalAlignment = 'bottom';
          idealHeight += alignments.spaceOnTop;
          idealYPos -= this.options.coverTrigger
            ? alignments.spaceOnTop - 20
            : alignments.spaceOnTop - 20 + triggerBRect.height;
        } else {
          idealHeight += alignments.spaceOnBottom;
        }
      }
    }

    // If preferred horizontal alignment is possible
    if (!alignments[horizontalAlignment]) {
      const oppositeAlignment = horizontalAlignment === 'left' ? 'right' : 'left';
      if (alignments[oppositeAlignment]) {
        horizontalAlignment = oppositeAlignment;
      } else {
        // Determine which side has most space and cutoff at correct height
        if (alignments.spaceOnLeft > alignments.spaceOnRight) {
          horizontalAlignment = 'right';
          idealWidth += alignments.spaceOnLeft;
          idealXPos -= alignments.spaceOnLeft;
        } else {
          horizontalAlignment = 'left';
          idealWidth += alignments.spaceOnRight;
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

  _animateIn() {
    const duration = this.options.inDuration;
    this.menuEl.style.transition = 'none';
    // from
    this.menuEl.style.opacity = '0';
    this.menuEl.style.transform = 'scale(0.85)';
    setTimeout(() => {
      this.menuEl.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      this.menuEl.style.opacity = '1';
      this.menuEl.style.transform = 'scale(1)';
    }, 1);
    setTimeout(() => {
      this._focusInitialItem();
      if (typeof this.options.onOpenEnd === 'function') this.options.onOpenEnd.call(this, this.el);
    }, duration);
  }

  _animateOut() {
    const duration = this.options.outDuration;
    // easeOutQuad (opacity) & easeOutQuint
    this.menuEl.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    // to
    this.menuEl.style.opacity = '0';
    this.menuEl.style.transform = 'scale(0.85)';
    setTimeout(() => {
      this._resetMenuStyles();
      if (typeof this.options.onCloseEnd === 'function')
        this.options.onCloseEnd.call(this, this.el);
    }, duration);
  }

  private _getClosestAncestor(el: HTMLElement, condition: (Function) => boolean): HTMLElement {
    let ancestor = el.parentNode;
    while (ancestor !== null && ancestor !== document) {
      if (condition(ancestor)) {
        return <HTMLElement>ancestor;
      }
      ancestor = ancestor.parentElement;
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
      closestOverflowParent = <HTMLElement>(
        (!!this.menuEl.offsetParent ? this.menuEl.offsetParent : this.menuEl.parentNode)
      );
    }

    if (getComputedStyle(closestOverflowParent).position === 'static')
      closestOverflowParent.style.position = 'relative';

    //this._moveMenu(closestOverflowParent);

    // Set width before calculating positionInfo
    const natural = this.menuEl.getBoundingClientRect().width;
    const idealWidth = this.options.constrainWidth
      ? this.el.getBoundingClientRect().width
      : Math.min(280, Math.max(112, natural));
    this.menuEl.style.width = idealWidth + 'px';

    const positionInfo = this._getMenuPosition(closestOverflowParent);
    this.menuEl.style.left = positionInfo.x + 'px';
    this.menuEl.style.top = positionInfo.y + 'px';
    this.menuEl.style.height = positionInfo.height + 'px';
    this.menuEl.style.width = positionInfo.width + 'px';
    this.menuEl.style.transformOrigin = `${
      positionInfo.horizontalAlignment === 'left' ? '0' : '100%'
    } ${positionInfo.verticalAlignment === 'top' ? '0' : '100%'}`;
  }

  /**
   * Open menu.
   */
  open = () => {
    if (this.isOpen) return;
    this.isOpen = true;
    // onOpenStart callback
    if (typeof this.options.onOpenStart === 'function') {
      this.options.onOpenStart.call(this, this.el);
    }
    // Reset styles
    this._resetMenuStyles();
    this.menuEl.style.display = 'block';
    this._placeMenu();
    this._animateIn();
    // Do this one frame later so that we don't bind an event handler that's immediately
    // called when the event bubbles up to the document and closes the menu
    setTimeout(() => this._setupTemporaryEventHandlers(), 0);
    this.el.ariaExpanded = 'true';
  };

  /**
   * Close menu.
   */
  close = () => {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.focusedIndex = -1;
    this._closeSubmenus();
    // onCloseStart callback
    if (typeof this.options.onCloseStart === 'function') {
      this.options.onCloseStart.call(this, this.el);
    }
    this._animateOut();
    this._removeTemporaryEventHandlers();
    if (this.options.autoFocus) {
      this.el.focus();
    }
    this.el.ariaExpanded = 'false';
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
