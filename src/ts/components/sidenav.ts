import { Utils } from '../core/utils';
import { Component, BaseOptions, InitElements, MElement, Openable } from '../core/component';

export interface SidenavOptions extends BaseOptions {
  /**
   * Side of screen on which Sidenav appears.
   * @default 'left'
   */
  edge: 'left' | 'right';
  /**
   * Allow swipe gestures to open/close Sidenav.
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

const _defaults: SidenavOptions = {
  edge: 'left',
  draggable: true,
  dragTargetWidth: '10px',
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null
};

const LARGE_UP = '(width >= 993px)';

/**
 * Navigation drawer. Overlay is a modal <dialog>; fixed is a breakpoint.
 * JS opens/closes, handles the trigger, and writes --md-comp-nav-drawer-shift
 * while dragging. CSS owns the slide, the scrim, and the large-screen dock.
 */
export class Sidenav extends Component<SidenavOptions> implements Openable {
  id: string;
  /** Describes open/close state of the overlay drawer. */
  isOpen: boolean;
  /** Describes if sidenav has sidenav-fixed. */
  isFixed: boolean;
  /** Describes if Sidenav is being dragged. */
  isDragged: boolean;
  static _sidenavs: Sidenav[];
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

  constructor(el: HTMLElement, options: Partial<SidenavOptions>) {
    super(el, options, Sidenav);
    this.el['Expressive_Sidenav'] = this;

    this.options = {
      ...Sidenav.defaults,
      ...options
    };

    this.id = this.el.id;
    this.isOpen = false;
    this.isFixed = this.el.classList.contains('sidenav-fixed');
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

    this._mql = window.matchMedia(LARGE_UP);
    this._setupDialog();
    this._createDragTarget();
    this._setupClasses();
    this._setupEventHandlers();
    this._syncTriggers();

    Sidenav._sidenavs.push(this);
  }

  static get defaults(): SidenavOptions {
    return _defaults;
  }

  /**
   * Initializes instance of Sidenav.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<SidenavOptions>): Sidenav;
  /**
   * Initializes instances of Sidenav.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<MElement>, options?: Partial<SidenavOptions>): Sidenav[];
  /**
   * Initializes instances of Sidenav.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<MElement>,
    options: Partial<SidenavOptions> = {}
  ): Sidenav | Sidenav[] {
    return super.init(els, options, Sidenav);
  }

  static getInstance(el: HTMLElement): Sidenav {
    return el['Expressive_Sidenav'];
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
    this.el['Expressive_Sidenav'] = undefined;
    const index = Sidenav._sidenavs.indexOf(this);
    if (index >= 0) {
      Sidenav._sidenavs.splice(index, 1);
    }
  }

  /**
   * Opens the overlay drawer. No-op while the sidenav is docked
   * (sidenav-fixed at the large breakpoint).
   */
  open = () => {
    if (this._isCurrentlyFixed() || this.isOpen || !this._dialog) return;

    Sidenav._sidenavs.forEach((other) => {
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
    document.body.appendChild(dragTarget);
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
    if (Sidenav._sidenavs.length === 0) {
      document.body.addEventListener('click', Sidenav._handleTriggerClick);
    }
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
    if (Sidenav._sidenavs.length === 1) {
      document.body.removeEventListener('click', Sidenav._handleTriggerClick);
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
    const trigger = target.closest('.sidenav-trigger');
    if (!trigger || !(trigger instanceof HTMLElement)) return;
    const sidenavId = Utils.getIdFromTrigger(trigger);
    const sidenavInstance = document.getElementById(sidenavId)?.['Expressive_Sidenav'];
    if (sidenavInstance) {
      sidenavInstance.open();
      e.preventDefault();
    }
  }

  private _handleCloseTriggerClick = (e: Event) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const closeTrigger = target.closest('.sidenav-close');
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
    document.querySelectorAll('.sidenav-trigger').forEach((trigger) => {
      if (!(trigger instanceof HTMLElement)) return;
      if (Utils.getIdFromTrigger(trigger) !== this.id) return;
      trigger.setAttribute('aria-expanded', this.isOpen ? 'true' : 'false');
      trigger.setAttribute('aria-controls', this.id);
    });
  }

  static {
    Sidenav._sidenavs = [];
  }
}
