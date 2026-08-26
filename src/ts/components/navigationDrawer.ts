import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, InitElement, Openable } from '../core/component';

export interface NavigationDrawerOptions extends BaseOptions {
  /**
   * Side of screen on which NavigationDrawer appears.
   * @default 'left'
   */
  edge: 'left' | 'right';
  /**
   * Allow swipe gestures to open/close NavigationDrawer.
   * @default true
   */
  draggable: boolean;
  /**
   * Width of the area where you can start dragging.
   * @default '10px'
   */
  dragTargetWidth: string;
  /**
   * Function called when sidenav starts entering.
   */
  onOpenStart: (elem: HTMLElement) => void;
  /**
   * Function called when sidenav finishes entering.
   */
  onOpenEnd: (elem: HTMLElement) => void;
  /**
   * Function called when sidenav starts exiting.
   */
  onCloseStart: (elem: HTMLElement) => void;
  /**
   * Function called when sidenav finishes exiting.
   */
  onCloseEnd: (elem: HTMLElement) => void;
}

const _defaults: NavigationDrawerOptions = {
  edge: 'left',
  draggable: true,
  dragTargetWidth: '10px',
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null
};

const EXPANDED_UP = '(width >= 840px)';

/**
 * Navigation drawer. Overlay is a modal <dialog>; fixed is a breakpoint.
 * JS opens/closes, handles the trigger, and writes --md-comp-nav-drawer-shift
 * while dragging. CSS owns the slide, the scrim, and the Expanded+ dock.
 */
export class NavigationDrawer extends Component<NavigationDrawerOptions> implements Openable {
  id: string;
  /** Describes open/close state of the overlay drawer. */
  isOpen: boolean;
  /** Whether the drawer is docked (`navigation-drawer-fixed`). */
  isFixed: boolean;
  /** Describes if NavigationDrawer is being dragged. */
  isDragged: boolean;
  static _sidenavs: NavigationDrawer[];
  dragTarget: HTMLElement | null;
  private _dialog: HTMLDialogElement | null;
  private _createdDialog: boolean;
  private _closing: boolean;
  private _mql: MediaQueryList;
  private _startingXpos: number;
  private _xPos: number;
  private _width: number;
  private _initialScrollTop: number;
  private _verticallyScrolling: boolean;
  private percentOpen: number;

  constructor(el: HTMLElement, options: Partial<NavigationDrawerOptions>) {
    super(el, options, NavigationDrawer);
    this.el['Expressive_NavigationDrawer'] = this;

    this.options = {
      ...NavigationDrawer.defaults,
      ...options
    };

    this.id = this.el.id;
    this.isOpen = false;
    // Both spellings: the Sass alias made `.navigation-drawer-fixed` style
    // like the old class, but this read the old name only - so the canonical
    // markup was treated as an overlay at the Expanded breakpoint, leaving the
    // drag target live and letting open() call showModal() on a docked drawer.
    this.isFixed =
      this.el.classList.contains('navigation-drawer-fixed') ||
      this.el.classList.contains('sidenav-fixed');
    this.isDragged = false;
    this.dragTarget = null;
    this._dialog = null;
    this._createdDialog = false;
    this._closing = false;
    this.percentOpen = 0;
    this._startingXpos = 0;
    this._xPos = 0;
    this._width = 0;
    this._initialScrollTop = 0;
    this._verticallyScrolling = false;

    this._mql = window.matchMedia(EXPANDED_UP);
    this._setupDialog();
    this._createDragTarget();
    this._setupClasses();
    this._setupEventHandlers();
    this._syncTriggers();

    NavigationDrawer._sidenavs.push(this);
  }

  static get defaults(): NavigationDrawerOptions {
    return _defaults;
  }

  /**
   * Initializes instance of NavigationDrawer.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<NavigationDrawerOptions>): NavigationDrawer;
  /**
   * Initializes instances of NavigationDrawer.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<InitElement>, options?: Partial<NavigationDrawerOptions>): NavigationDrawer[];
  /**
   * Initializes instances of NavigationDrawer.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<NavigationDrawerOptions> = {}
  ): NavigationDrawer | NavigationDrawer[] {
    return super.init(els, options, NavigationDrawer);
  }

  static getInstance(el: HTMLElement): NavigationDrawer {
    return el['Expressive_NavigationDrawer'];
  }

  destroy() {
    this._removeEventHandlers();
    if (this._dialog?.open) {
      try {
        this._dialog.close();
      } catch {
        // already closed
      }
    }
    this._clearShift();
    this._unwrapDialog();
    this._removeDragTarget();
    this.el['Expressive_NavigationDrawer'] = undefined;
    const index = NavigationDrawer._sidenavs.indexOf(this);
    if (index >= 0) {
      NavigationDrawer._sidenavs.splice(index, 1);
    }
  }

  /**
   * Opens the overlay drawer. No-op while the sidenav is docked
   * (navigation-drawer-fixed at the Expanded breakpoint).
   */
  open = () => {
    if (this._isCurrentlyFixed() || this.isOpen || !this._dialog) return;

    NavigationDrawer._sidenavs.forEach((other) => {
      if (other !== this && other.isOpen) other.close();
    });

    if (typeof this.options.onOpenStart === 'function') {
      this.options.onOpenStart.call(this, this.el);
    }

    this.isOpen = true;
    this._dialog.classList.remove('dragging');
    this._clearShift();
    if (!this._dialog.open) {
      try {
        this._dialog.showModal();
      } catch {
        // already open
      }
    }
    this._syncTriggers();
    if (typeof this.options.onOpenEnd === 'function') {
      this.options.onOpenEnd.call(this, this.el);
    }
  };

  /**
   * Closes the overlay drawer. No-op while the sidenav is docked.
   */
  close = () => {
    if (this._isCurrentlyFixed() || !this.isOpen) return;
    this._beginClose();
    if (this._dialog?.open) {
      this._closing = true;
      this._dialog.close();
    } else {
      this._finishClose();
    }
  };

  private _beginClose() {
    this.isOpen = false;
    this._dialog?.classList.remove('dragging');
    this._clearShift();
    if (typeof this.options.onCloseStart === 'function') {
      this.options.onCloseStart.call(this, this.el);
    }
    this._syncTriggers();
  }

  private _finishClose() {
    if (typeof this.options.onCloseEnd === 'function') {
      this.options.onCloseEnd.call(this, this.el);
    }
  }

  private _onDialogClose = () => {
    if (this.isOpen) {
      this._beginClose();
      this._finishClose();
      return;
    }
    if (this._closing) {
      this._closing = false;
      this._finishClose();
    }
  };

  private _onBreakpointChange = () => {
    if (this._isCurrentlyFixed() && this.isOpen) {
      this.close();
    }
  };

  private _setupDialog() {
    if (this.el instanceof HTMLDialogElement) {
      this._dialog = this.el;
      this._createdDialog = false;
      return;
    }
    const parent = this.el.parentElement;
    if (parent instanceof HTMLDialogElement && parent.classList.contains('sidenav-overlay')) {
      this._dialog = parent;
      this._createdDialog = false;
      return;
    }
    const dialog = document.createElement('dialog');
    dialog.classList.add('sidenav-overlay');
    // Carry the drawer's name onto the dialog. A <dialog> takes no name from
    // its contents, so without this the drawer opened announced as just
    // "dialog" - and the label the author wrote on the wrapping <nav> is
    // outside the modal once it opens, where nothing will read it.
    const named = this.el.closest('[aria-label], [aria-labelledby]') ?? this.el;
    const label = named.getAttribute('aria-label');
    const labelledBy = named.getAttribute('aria-labelledby');
    if (label) dialog.setAttribute('aria-label', label);
    else if (labelledBy) dialog.setAttribute('aria-labelledby', labelledBy);
    this.el.replaceWith(dialog);
    dialog.appendChild(this.el);
    this._dialog = dialog;
    this._createdDialog = true;
  }

  private _unwrapDialog() {
    if (!this._createdDialog || !this._dialog) return;
    this._dialog.replaceWith(this.el);
    this._dialog = null;
    this._createdDialog = false;
  }

  private _createDragTarget() {
    if (!this.options.draggable) return;
    const dragTarget = document.createElement('div');
    dragTarget.classList.add('drag-target');
    dragTarget.style.width = this.options.dragTargetWidth;
    if (this.isFixed) dragTarget.dataset.fixed = '';
    Utils.portalRoot(this.el).appendChild(dragTarget);
    this.dragTarget = dragTarget;
  }

  private _removeDragTarget() {
    this.dragTarget?.remove();
    this.dragTarget = null;
  }

  private _setupClasses() {
    if (this.options.edge === 'right') {
      this.el.classList.add('right-aligned');
      this._dialog?.classList.add('right-aligned');
      this.dragTarget?.classList.add('right-aligned');
    }
  }

  private _setupEventHandlers() {
    if (NavigationDrawer._sidenavs.length === 0) {
      document.body.addEventListener('click', NavigationDrawer._handleTriggerClick);
    }
    // Touch events, deliberately, while four other components moved to Pointer
    // Events. There is no mouse pair here to collapse - the edge drag has only
    // ever been a touch gesture - so a conversion would not remove a listener;
    // it would add `pointerdown` + `setPointerCapture` to replace the implicit
    // capture `touchmove` already has, and would make the drawer mouse-
    // draggable, which is a new behaviour rather than a smaller one.
    const passive = { passive: true } as const;
    this.dragTarget?.addEventListener('touchmove', this._handleDragTargetDrag, passive);
    this.dragTarget?.addEventListener('touchend', this._handleDragTargetRelease);
    this._dialog?.addEventListener('touchmove', this._handleCloseDrag, passive);
    this._dialog?.addEventListener('touchend', this._handleCloseRelease);
    this._dialog?.addEventListener('close', this._onDialogClose);
    this.el.addEventListener('click', this._handleCloseTriggerClick);
    this._mql.addEventListener('change', this._onBreakpointChange);
  }

  private _removeEventHandlers() {
    if (NavigationDrawer._sidenavs.length === 1) {
      document.body.removeEventListener('click', NavigationDrawer._handleTriggerClick);
    }
    this.dragTarget?.removeEventListener('touchmove', this._handleDragTargetDrag);
    this.dragTarget?.removeEventListener('touchend', this._handleDragTargetRelease);
    this._dialog?.removeEventListener('touchmove', this._handleCloseDrag);
    this._dialog?.removeEventListener('touchend', this._handleCloseRelease);
    this._dialog?.removeEventListener('close', this._onDialogClose);
    this.el.removeEventListener('click', this._handleCloseTriggerClick);
    this._mql.removeEventListener('change', this._onBreakpointChange);
  }

  private static _handleTriggerClick(e: Event) {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest('.sidenav-trigger, .navigation-drawer-trigger');
    if (!trigger || !(trigger instanceof HTMLElement)) return;
    const sidenavId = Utils.getIdFromTrigger(trigger);
    const sidenavInstance =
      Utils.getElementById(trigger, sidenavId)?.['Expressive_NavigationDrawer'];
    if (sidenavInstance) {
      sidenavInstance.open();
      e.preventDefault();
    }
  }

  private _handleCloseTriggerClick = (e: Event) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const closeTrigger = target.closest('.sidenav-close, .navigation-drawer-close');
    if (closeTrigger && !this._isCurrentlyFixed()) {
      this.close();
    }
  };

  private _isDraggable() {
    return this.options.draggable && !this._isCurrentlyFixed() && !this._verticallyScrolling;
  }

  private _isCurrentlyFixed() {
    return this.isFixed && this._mql.matches;
  }

  private _startDrag(e: TouchEvent) {
    const clientX = e.targetTouches[0].clientX;
    this.isDragged = true;
    this._startingXpos = clientX;
    this._xPos = clientX;
    this._width =
      this._dialog?.getBoundingClientRect().width || this.el.getBoundingClientRect().width;
    this._initialScrollTop = this.isOpen ? this.el.scrollTop : Utils.getDocumentScrollTop();
    this._verticallyScrolling = false;
    this._dialog?.classList.add('dragging');
    if (this._dialog && !this._dialog.open) {
      try {
        this._dialog.showModal();
      } catch {
        // already open
      }
    }
  }

  private _dragMoveUpdate(e: TouchEvent) {
    const clientX = e.targetTouches[0].clientX;
    const currentScrollTop = this.isOpen ? this.el.scrollTop : Utils.getDocumentScrollTop();
    this._xPos = clientX;
    if (this._initialScrollTop !== currentScrollTop) {
      this._verticallyScrolling = true;
    }
  }

  private _rawDelta(e: TouchEvent) {
    if (!this.isDragged) this._startDrag(e);
    this._dragMoveUpdate(e);
    return this._xPos - this._startingXpos;
  }

  private _applyShift(shift: number, percentOpen: number) {
    this.percentOpen = percentOpen;
    const host = this._dialog ?? this.el;
    host.style.setProperty('--md-comp-nav-drawer-shift', `${shift}px`);
    host.style.setProperty('--md-comp-nav-drawer-open', String(percentOpen));
  }

  private _clearShift() {
    const host = this._dialog ?? this.el;
    host.style.removeProperty('--md-comp-nav-drawer-shift');
    host.style.removeProperty('--md-comp-nav-drawer-open');
  }

  private _handleDragTargetDrag = (e: TouchEvent) => {
    if (!this._isDraggable()) return;
    const delta = this._rawDelta(e);
    const towardOpen = this.options.edge === 'left' ? delta : -delta;
    const visible = Math.min(this._width, Math.max(0, towardOpen));
    const percentOpen = this._width ? visible / this._width : 0;
    this._applyShift(visible - this._width, percentOpen);
  };

  private _handleDragTargetRelease = () => {
    if (!this.isDragged) return;
    this._dialog?.classList.remove('dragging');
    if (this.percentOpen > 0.2) {
      this.open();
    } else if (this._dialog?.open && !this.isOpen) {
      this._clearShift();
      this._dialog.close();
    }
    this.isDragged = false;
    this._verticallyScrolling = false;
  };

  private _handleCloseDrag = (e: TouchEvent) => {
    if (!this.isOpen || !this._isDraggable()) return;
    const delta = this._rawDelta(e);
    const towardClose = this.options.edge === 'left' ? -delta : delta;
    const hidden = Math.min(this._width, Math.max(0, towardClose));
    const percentOpen = this._width ? 1 - hidden / this._width : 1;
    this._applyShift(-hidden, percentOpen);
  };

  private _handleCloseRelease = () => {
    if (!this.isOpen || !this.isDragged) return;
    this._dialog?.classList.remove('dragging');
    if (this.percentOpen > 0.8) {
      this._clearShift();
    } else {
      this.close();
    }
    this.isDragged = false;
    this._verticallyScrolling = false;
  };

  private _syncTriggers() {
    if (!this.id) return;
    document.querySelectorAll('.sidenav-trigger, .navigation-drawer-trigger').forEach((trigger) => {
      if (!(trigger instanceof HTMLElement)) return;
      if (Utils.getIdFromTrigger(trigger) !== this.id) return;
      trigger.setAttribute('aria-expanded', this.isOpen ? 'true' : 'false');
      trigger.setAttribute('aria-controls', this.id);
    });
  }

  static {
    NavigationDrawer._sidenavs = [];
  }
}
