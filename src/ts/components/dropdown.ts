import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement, Openable } from '../core/component';

export interface DropdownOptions extends BaseOptions {
  /**
   * Defines the edge the menu is aligned to.
   * @default 'left'
   */
  alignment: 'left' | 'right';
  /**
   * If true, automatically focus dropdown el for keyboard.
   * @default true
   */
  autoFocus: boolean;
  /**
   * If true, constrainWidth to the size of the dropdown activator.
   * @default true
   */
  constrainWidth: boolean;
  /**
   * Provide an element that will be the bounding container of the dropdown.
   * @default null
   */
  container: Element;
  /**
   * If false, the dropdown will show below the trigger.
   * @default true
   */
  coverTrigger: boolean;
  /**
   * If true, close dropdown on item click.
   * @default true
   */
  closeOnClick: boolean;
  /**
   * If true, the dropdown will open on hover.
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
   * Function called when dropdown starts entering.
   * @default null
   */
  onOpenStart: (el: HTMLElement) => void;
  /**
   * Function called when dropdown finishes entering.
   * @default null
   */
  onOpenEnd: (el: HTMLElement) => void;
  /**
   * Function called when dropdown starts exiting.
   * @default null
   */
  onCloseStart: (el: HTMLElement) => void;
  /**
   * Function called when dropdown finishes exiting.
   * @default null
   */
  onCloseEnd: (el: HTMLElement) => void;
  /**
   * Function called when item is clicked.
   * @default null
   */
  onItemClick: (el: HTMLLIElement) => void;
}

const _defaults: DropdownOptions = {
  alignment: 'left',
  autoFocus: true,
  constrainWidth: true,
  container: null,
  coverTrigger: true,
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

export class Dropdown extends Component<DropdownOptions> implements Openable {
  static _dropdowns: Dropdown[] = [];
  /** ID of the dropdown element. */
  id: string;
  /** The DOM element of the dropdown. */
  dropdownEl: HTMLElement;
  /** If the dropdown is open. */
  isOpen: boolean;
  /** If the dropdown content is scrollable. */
  isScrollable: boolean;
  isTouchMoving: boolean;
  /** The index of the item focused. */
  focusedIndex: number;
  filterQuery: string[];
  filterTimeout: ReturnType<typeof setTimeout>;

  constructor(el: HTMLElement, options: Partial<DropdownOptions>) {
    super(el, options, Dropdown);
    this.el['Expressive_Dropdown'] = this;

    Dropdown._dropdowns.push(this);
    this.id = Utils.getIdFromTrigger(el);
    this.dropdownEl = document.getElementById(this.id);
    this.dropdownEl?.classList.add('dropdown-content');

    this.options = {
      ...Dropdown.defaults,
      ...options
    };

    this.isOpen = false;
    this.isScrollable = false;
    this.isTouchMoving = false;
    this.focusedIndex = -1;
    this.filterQuery = [];
    this.el.ariaExpanded = 'false';

    // Move dropdown-content after dropdown-trigger
    this._moveDropdownToElement();
    this._makeDropdownFocusable();
    this._setupSubmenus();
    this._setupEventHandlers();
  }

  static get defaults(): DropdownOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Dropdown.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<DropdownOptions>): Dropdown;
  /**
   * Initializes instances of Dropdown.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<InitElement>, options?: Partial<DropdownOptions>): Dropdown[];
  /**
   * Initializes instances of Dropdown.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<DropdownOptions> = {}
  ): Dropdown | Dropdown[] {
    return super.init(els, options, Dropdown);
  }

  static getInstance(el: HTMLElement): Dropdown {
    return el['Expressive_Dropdown'];
  }

  destroy() {
    clearTimeout(this.filterTimeout);
    this._resetDropdownStyles();
    this._removeEventHandlers();
    // Temporary handlers only exist while open, but removing them is a no-op
    // otherwise and leaving them attached leaks the instance.
    this._removeTemporaryEventHandlers();
    const index = Dropdown._dropdowns.indexOf(this);
    if (index >= 0) Dropdown._dropdowns.splice(index, 1);
    this.el['Expressive_Dropdown'] = undefined;
  }

  _setupEventHandlers() {
    // Trigger keydown handler
    this.el.addEventListener('keydown', this._handleTriggerKeydown);
    // Item click handler
    this.dropdownEl?.addEventListener('click', this._handleDropdownClick);
    if (this.dropdownEl?.querySelector(':scope > li > menu')) {
      this.dropdownEl.addEventListener('mouseover', this._handleSubmenuAlign);
    }
    // Hover event handlers
    if (this.options.hover) {
      this.el.addEventListener('mouseenter', this._handleMouseEnter);
      this.el.addEventListener('mouseleave', this._handleMouseLeave);
      this.dropdownEl.addEventListener('mouseleave', this._handleMouseLeave);
      // Click event handlers
    } else {
      this.el.addEventListener('click', this._handleClick);
    }
  }

  _removeEventHandlers() {
    // `dropdownEl` is optional-chained on the way in (the trigger may point at
    // an id that does not resolve); it has to be here too, or destroy() throws
    // before it can detach anything else.
    this.el.removeEventListener('keydown', this._handleTriggerKeydown);
    this.dropdownEl?.removeEventListener('click', this._handleDropdownClick);
    this.dropdownEl?.removeEventListener('mouseover', this._handleSubmenuAlign);
    if (this.options.hover) {
      this.el.removeEventListener('mouseenter', this._handleMouseEnter);
      this.el.removeEventListener('mouseleave', this._handleMouseLeave);
      this.dropdownEl?.removeEventListener('mouseleave', this._handleMouseLeave);
    } else {
      this.el.removeEventListener('click', this._handleClick);
    }
  }

  _setupTemporaryEventHandlers() {
    document.body.addEventListener('click', this._handleDocumentClick);
    document.body.addEventListener('touchmove', this._handleDocumentTouchmove, { passive: true });
    this.dropdownEl?.addEventListener('keydown', this._handleDropdownKeydown);
    window.addEventListener('resize', this._handleWindowResize);
  }

  _removeTemporaryEventHandlers() {
    document.body.removeEventListener('click', this._handleDocumentClick);
    document.body.removeEventListener('touchmove', this._handleDocumentTouchmove);
    this.dropdownEl?.removeEventListener('keydown', this._handleDropdownKeydown);
    window.removeEventListener('resize', this._handleWindowResize);
  }

  _handleClick = (e: MouseEvent) => {
    e.preventDefault();
    //this._moveDropdown((<HTMLElement>e.target).closest('li'));
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  };

  _handleMouseEnter = () => {
    //this._moveDropdown((<HTMLElement>e.target).closest('li'));
    this.open();
  };

  _handleMouseLeave = (e: MouseEvent) => {
    const toEl = e.relatedTarget as HTMLElement;
    // relatedTarget is null when the pointer leaves the window entirely.
    if (!toEl) {
      this.close();
      return;
    }
    const leaveToDropdownContent = !!toEl.closest('.dropdown-content, menu');
    let leaveToActiveDropdownTrigger = false;
    const closestTrigger = toEl.closest('.dropdown-trigger');
    if (closestTrigger && !!closestTrigger['Expressive_Dropdown'] && closestTrigger['Expressive_Dropdown'].isOpen) {
      leaveToActiveDropdownTrigger = true;
    }
    // Close hover dropdown if mouse did not leave to either active dropdown-trigger or dropdown-content
    if (!leaveToActiveDropdownTrigger && !leaveToDropdownContent) {
      this.close();
    }
  };

  _handleDocumentClick = (e: MouseEvent) => {
    const target = <HTMLElement>e.target;
    if (this._isSubmenuTriggerClick(target)) return;
    if (this.options.closeOnClick && target.closest('.dropdown-content, menu') && !this.isTouchMoving) {
      // isTouchMoving to check if scrolling on mobile.
      this.close();
    } else if (!target.closest('.dropdown-content, menu')) {
      // Do this one frame later so that if the element clicked also triggers _handleClick
      // For example, if a label for a select was clicked, that we don't close/open the dropdown
      setTimeout(() => {
        if (this.isOpen) {
          this.close();
        }
      }, 0);
    }
    this.isTouchMoving = false;
  };

  _handleTriggerKeydown = (e: KeyboardEvent) => {
    // ARROW DOWN OR ENTER WHEN SELECT IS CLOSED - open Dropdown
    const arrowDownOrEnter =
      Utils.keys.ARROW_DOWN.includes(e.key) || Utils.keys.ENTER.includes(e.key);
    if (arrowDownOrEnter && !this.isOpen) {
      e.preventDefault();
      this.open();
    }
  };

  _handleDocumentTouchmove = (e: TouchEvent) => {
    const target = <HTMLElement>e.target;
    if (target.closest('.dropdown-content, menu')) {
      this.isTouchMoving = true;
    }
  };

  _handleDropdownClick = (e: MouseEvent) => {
    const target = <HTMLElement>e.target;
    const li = target.closest('li');
    if (li && this._isSubmenuTriggerClick(target)) {
      e.preventDefault();
      e.stopPropagation();
      this._toggleSubmenu(li);
      return;
    }
    if (typeof this.options.onItemClick === 'function') {
      this.options.onItemClick.call(this, li);
    }
  };

  private _isSubmenuTriggerClick(target: HTMLElement) {
    if (!this.dropdownEl) return false;
    const li = target.closest('li');
    if (!li || !this.dropdownEl.contains(li)) return false;
    const submenu = li.querySelector(':scope > menu');
    if (!submenu) return false;
    return !submenu.contains(target);
  }

  private _setupSubmenus() {
    this.dropdownEl?.querySelectorAll('li').forEach((li) => {
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
    if (li?.querySelector(':scope > menu') && this.dropdownEl?.contains(li)) {
      this._alignSubmenu(li as HTMLElement);
    }
  };

  private _alignSubmenu(li: HTMLElement) {
    const menu = li.querySelector(':scope > menu') as HTMLElement | null;
    if (!menu) return;
    const wasHidden = getComputedStyle(menu).display === 'none';
    if (wasHidden) menu.style.display = 'block';
    li.classList.remove('submenu-start');
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) li.classList.add('submenu-start');
    if (wasHidden) menu.style.display = '';
  }

  private _closeSubmenus() {
    this.dropdownEl?.querySelectorAll('li.open').forEach((li) => {
      li.classList.remove('open', 'submenu-start');
      this._syncSubmenuAria(li as HTMLElement, false);
    });
  }

  private _containingSubmenu(e: Event): HTMLElement | null {
    const target = e.target;
    if (!(target instanceof Element)) return null;
    const submenu = target.closest('li > menu');
    if (submenu instanceof HTMLElement && this.dropdownEl?.contains(submenu)) return submenu;
    return null;
  }

  private _focusedRow(e: Event): HTMLElement | null {
    const target = e.target;
    if (!(target instanceof Element)) return null;
    const li = target.closest('li');
    if (li instanceof HTMLElement && this.dropdownEl?.contains(li)) return li;
    return null;
  }

  _handleDropdownKeydown = (e: KeyboardEvent) => {
    const arrowUpOrDown =
      Utils.keys.ARROW_DOWN.includes(e.key) || Utils.keys.ARROW_UP.includes(e.key);
    if (Utils.keys.TAB.includes(e.key)) {
      e.preventDefault();
      this.close();
    }
    else if (Utils.keys.ARROW_RIGHT.includes(e.key) && this.isOpen) {
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
    // Navigate down dropdown list
    else if (arrowUpOrDown && this.isOpen) {
      e.preventDefault();
      const direction = Utils.keys.ARROW_DOWN.includes(e.key) ? 1 : -1;
      const list = this._containingSubmenu(e) ?? this.dropdownEl;
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
        if (this.focusedIndex >= 0)
          list.children[this.focusedIndex]?.classList.remove('active');
        this.focusedIndex = newFocusedIndex;
        const item = list.children[this.focusedIndex] as HTMLElement;
        item.classList.add('active');
        item.focus({ preventScroll: true });
      }
    }
    // ENTER selects choice on focused item
    else if (Utils.keys.ENTER.includes(e.key) && this.isOpen) {
      const li = this._focusedRow(e);
      if (li?.querySelector(':scope > menu')) {
        e.preventDefault();
        this._toggleSubmenu(li);
        return;
      }
      const focusedElement = li ?? this.dropdownEl.children[this.focusedIndex];
      const activatableElement = <HTMLElement>focusedElement?.querySelector('a, button');
      if (!!activatableElement) {
        activatableElement.click();
      } else if (focusedElement instanceof HTMLElement) {
        focusedElement.click();
      }
    }
    // Close dropdown on ESC
    else if (Utils.keys.ESC.includes(e.key) && this.isOpen) {
      e.preventDefault();
      const openSub = this.dropdownEl.querySelector('li.open');
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
      ...Utils.keys.TAB
    ];
    if (isLetter && !specialKeys.includes(e.key)) {
      this.filterQuery.push(keyText);
      const string = this.filterQuery.join('');
      // textContent rather than innerText: this scans every item on every
      // keystroke, and innerText forces a layout flush per item.
      const list = this._containingSubmenu(e) ?? this.dropdownEl;
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
    // Only re-place the dropdown if it's still visible
    // Accounts for elements hiding via media queries
    if (this.el.offsetParent) {
      this.recalculateDimensions();
    }
  };

  _resetFilterQuery = () => {
    this.filterQuery = [];
  };

  _resetDropdownStyles() {
    this.dropdownEl.style.display = '';
    this._resetDropdownPositioningStyles();
    this.dropdownEl.style.transform = '';
    this.dropdownEl.style.opacity = '';
  }

  _resetDropdownPositioningStyles() {
    this.dropdownEl.style.width = '';
    this.dropdownEl.style.height = '';
    this.dropdownEl.style.left = '';
    this.dropdownEl.style.top = '';
    this.dropdownEl.style.transformOrigin = '';
  }

  _moveDropdownToElement(containerEl: HTMLElement = null) {
    if (this.options.container) {
      this.options.container.append(this.dropdownEl);
      return;
    }
    if (containerEl) {
      if (!containerEl.contains(this.dropdownEl)) containerEl.append(this.dropdownEl);
      return;
    }
    this.el.after(this.dropdownEl);
  }

  _makeDropdownFocusable() {
    if (!this.dropdownEl) return;
    this.dropdownEl.popover = '';
    // Needed for arrow key navigation
    this.dropdownEl.tabIndex = 0;
    // Only set tabindex if it hasn't been set by user
    this.dropdownEl.querySelectorAll(':scope li, :scope > hr').forEach((el) => {
      if (el instanceof HTMLHRElement || el.classList.contains('divider')) {
        el.setAttribute('tabindex', '-1');
        return;
      }
      if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
  }

  _focusFocusedItem() {
    if (
      this.focusedIndex >= 0 &&
      this.focusedIndex < this.dropdownEl.children.length &&
      this.options.autoFocus
    ) {
      (this.dropdownEl.children[this.focusedIndex] as HTMLElement).focus({
        preventScroll: true
      });
      this.dropdownEl.children[this.focusedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }

  _getDropdownPosition(closestOverflowParent: HTMLElement) {
    // const offsetParentBRect = this.el.offsetParent.getBoundingClientRect();
    const triggerBRect = this.el.getBoundingClientRect();
    const dropdownBRect = this.dropdownEl.getBoundingClientRect();

    let idealHeight = dropdownBRect.height;
    let idealWidth = dropdownBRect.width;
    let idealXPos = triggerBRect.left - dropdownBRect.left;
    let idealYPos = triggerBRect.top - dropdownBRect.top;

    const dropdownBounds = {
      left: idealXPos,
      top: idealYPos,
      height: idealHeight,
      width: idealWidth
    };

    const alignments = Utils.checkPossibleAlignments(
      this.el,
      closestOverflowParent,
      dropdownBounds,
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
        idealYPos - dropdownBRect.height + (this.options.coverTrigger ? triggerBRect.height : 0);
    }
    if (horizontalAlignment === 'right') {
      idealXPos = idealXPos - dropdownBRect.width + triggerBRect.width;
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
    this.dropdownEl.style.transition = 'none';
    // from
    this.dropdownEl.style.opacity = '0';
    this.dropdownEl.style.transform = 'scale(0.3, 0.3)';
    setTimeout(() => {
      // easeOutQuad (opacity) & easeOutQuint
      this.dropdownEl.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      // to
      this.dropdownEl.style.opacity = '1';
      this.dropdownEl.style.transform = 'scale(1, 1)';
    }, 1);
    setTimeout(() => {
      if (this.options.autoFocus) this.dropdownEl.focus();
      if (typeof this.options.onOpenEnd === 'function') this.options.onOpenEnd.call(this, this.el);
    }, duration);
  }

  _animateOut() {
    const duration = this.options.outDuration;
    // easeOutQuad (opacity) & easeOutQuint
    this.dropdownEl.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    // to
    this.dropdownEl.style.opacity = '0';
    this.dropdownEl.style.transform = 'scale(0.3, 0.3)';
    setTimeout(() => {
      this._resetDropdownStyles();
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

  _placeDropdown() {
    // Container here will be closest ancestor with overflow: hidden
    let closestOverflowParent: HTMLElement = this._getClosestAncestor(
      this.dropdownEl,
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
        (!!this.dropdownEl.offsetParent ? this.dropdownEl.offsetParent : this.dropdownEl.parentNode)
      );
    }

    if (getComputedStyle(closestOverflowParent).position === 'static')
      closestOverflowParent.style.position = 'relative';

    //this._moveDropdown(closestOverflowParent);

    // Set width before calculating positionInfo
    const idealWidth = this.options.constrainWidth
      ? this.el.getBoundingClientRect().width
      : this.dropdownEl.getBoundingClientRect().width;
    this.dropdownEl.style.width = idealWidth + 'px';

    const positionInfo = this._getDropdownPosition(closestOverflowParent);
    this.dropdownEl.style.left = positionInfo.x + 'px';
    this.dropdownEl.style.top = positionInfo.y + 'px';
    this.dropdownEl.style.height = positionInfo.height + 'px';
    this.dropdownEl.style.width = positionInfo.width + 'px';
    this.dropdownEl.style.transformOrigin = `${
      positionInfo.horizontalAlignment === 'left' ? '0' : '100%'
    } ${positionInfo.verticalAlignment === 'top' ? '0' : '100%'}`;
  }

  /**
   * Open dropdown.
   */
  open = () => {
    if (this.isOpen) return;
    this.isOpen = true;
    // onOpenStart callback
    if (typeof this.options.onOpenStart === 'function') {
      this.options.onOpenStart.call(this, this.el);
    }
    // Reset styles
    this._resetDropdownStyles();
    this.dropdownEl.style.display = 'block';
    this._placeDropdown();
    this._animateIn();
    // Do this one frame later so that we don't bind an event handler that's immediately
    // called when the event bubbles up to the document and closes the dropdown
    setTimeout(() => this._setupTemporaryEventHandlers(), 0);
    this.el.ariaExpanded = 'true';
  };

  /**
   * Close dropdown.
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
   * While dropdown is open, you can recalculate its dimensions if its contents have changed.
   */
  recalculateDimensions = () => {
    if (this.isOpen) {
      this._resetDropdownPositioningStyles();
      this._placeDropdown();
    }
  };
}
