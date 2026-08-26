import { BaseOptions } from '../core/component';
import { Utils } from '../core/utils';

export interface SnackbarOptions extends BaseOptions {
  /**
   * The content of the Snackbar.
   * @default ""
   */
  text: string;
  /**
   * Optional action label. Rendered as a trailing text button.
   * @default ""
   */
  action: string;
  /**
   * Called when the action button is pressed. The snackbar still dismisses.
   * @default null
   */
  onAction: () => void;
  /**
   * Show a trailing close icon button.
   * @default false
   */
  dismissible: boolean;
  /**
   * Element id of a `<template>` (or another element) used as the snackbar body.
   * @default ""
   */
  snackbarId?: string;
  /**
   * Length in ms the Snackbar stays before dismissal.
   * `Infinity` keeps it on screen until the user acts.
   * When `action` is set and this is omitted, the default is 10000.
   * @default 4000
   */
  displayLength: number;
  /**
   * Transition in duration in milliseconds.
   * @default 300
   */
  inDuration: number;
  /**
   * Transition out duration in milliseconds.
   * @default 375
   */
  outDuration: number;
  /**
   * Classes to be added to the snackbar element.
   * @default ""
   */
  classes: string;
  /**
   * Callback function called when the snackbar is dismissed.
   * @default null
   */
  completeCallback: () => void;
  /**
   * The percentage of the snackbar's width it takes for a drag
   * to dismiss a Snackbar.
   * @default 0.8
   */
  activationPercent: number;
  /**
   * Any element in the tree the snackbar should render into. A Snackbar has no
   * originating element to infer this from, so pass one when the page lives in
   * a shadow root — the container is appended to that root instead of to
   * `document.body`, where a root-scoped stylesheet could not reach it.
   * @default null
   */
  root: HTMLElement;
}

const _defaults: SnackbarOptions = {
  text: '',
  action: '',
  onAction: null,
  dismissible: false,
  displayLength: 4000,
  inDuration: 300,
  outDuration: 375,
  classes: '',
  completeCallback: null,
  activationPercent: 0.8,
  root: null
};

export class Snackbar {
  /** The snackbar element. */
  el: HTMLElement;
  /**
   * The remaining amount of time in ms that the snackbar
   * will stay before dismissal.
   */
  timeRemaining: number;
  /**
   * Describes the current pan state of the Snackbar.
   */
  panning: boolean;
  options: SnackbarOptions;
  message: string;
  counterTimeout: ReturnType<typeof setTimeout>;
  /** Wall-clock time the snackbar is due to dismiss, for pause/resume. */
  private _deadline: number;
  wasSwiped: boolean;
  startingXPos: number;
  xPos: number;
  time: number;
  deltaX: number;
  velocityX: number;
  private _dismissed = false;

  static _snackbars: Snackbar[];
  static _container: HTMLElement;
  static _draggedSnackbar: Snackbar;
  /** Which pointer owns the drag in flight; a second finger is ignored. */
  static _dragPointerId: number | null = null;

  constructor(options: Partial<SnackbarOptions> = {}) {
    this.options = {
      ...Snackbar.defaults,
      ...options
    };
    // With an action, stay long enough to tap it. Pass Infinity to remain
    // until the user acts; pass an explicit displayLength to override.
    if (options.displayLength === undefined && this.options.action) {
      this.options.displayLength = 10000;
    }
    this.message = this.options.text;
    this.panning = false;
    this.timeRemaining = this.options.displayLength;
    // One snackbar at a time so a new update does not stack over the page.
    if (Snackbar._snackbars.length > 0) {
      for (const snackbar of [...Snackbar._snackbars]) {
        snackbar._dismissed = true;
        clearTimeout(snackbar.counterTimeout);
        snackbar.el.remove();
      }
      Snackbar._snackbars.length = 0;
    }
    // One container serves every snackbar, and only one snackbar shows at a
    // time — so it is moved rather than duplicated when the root changes.
    const root = Utils.portalRoot(this.options.root ?? document.body);
    if (
      !Snackbar._container ||
      !Snackbar._container.isConnected ||
      Snackbar._container.parentNode !== root
    ) {
      if (Snackbar._container) Snackbar._removeContainer();
      Snackbar._createContainer(root);
    }
    Snackbar._snackbars.push(this);
    const snackbarElement = this._createSnackbar();
    snackbarElement['Expressive_Snackbar'] = this;
    this.el = snackbarElement;
    this._animateIn();
    this._setTimer();
  }

  static get defaults(): SnackbarOptions {
    return _defaults;
  }

  static getInstance(el: HTMLElement): Snackbar {
    return el['Expressive_Snackbar'];
  }

  static _createContainer(root: HTMLElement | ShadowRoot = document.body) {
    const container = document.createElement('div');
    container.setAttribute('id', 'snackbar-container');
    // One listener per stage. These used to be a touch trio on the container
    // plus a mouse trio split across the container and the document, with a
    // helper picking `targetTouches[0].clientX` or `clientX` apart afterwards.
    // Move and up stay on the document so a drag that leaves the container
    // still completes.
    container.addEventListener('pointerdown', Snackbar._onDragStart);
    document.addEventListener('pointermove', Snackbar._onDragMove);
    document.addEventListener('pointerup', Snackbar._onDragEnd);
    document.addEventListener('pointercancel', Snackbar._onDragCancel);
    root.appendChild(container);
    Snackbar._container = container;
  }

  static _removeContainer() {
    document.removeEventListener('pointermove', Snackbar._onDragMove);
    document.removeEventListener('pointerup', Snackbar._onDragEnd);
    document.removeEventListener('pointercancel', Snackbar._onDragCancel);
    Snackbar._container.remove();
    Snackbar._container = null;
  }

  static _onDragStart(e: PointerEvent) {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    // Don't start a swipe from the action or close — those are buttons.
    if (target && !target.closest('button, a') && target.closest('.snackbar')) {
      const snackbarElem = target.closest('.snackbar') as HTMLElement;
      const snackbar: Snackbar = snackbarElem['Expressive_Snackbar'];
      if (!snackbar) return;
      snackbar.panning = true;
      snackbar._pauseTimer();
      Snackbar._draggedSnackbar = snackbar;
      snackbar.el.classList.add('panning');
      snackbar.el.style.transition = '';
      Snackbar._dragPointerId = e.pointerId;
      snackbar.startingXPos = e.clientX;
      snackbar.time = Date.now();
      snackbar.xPos = e.clientX;
    }
  }

  static _onDragMove(e: PointerEvent) {
    if (Snackbar._dragPointerId !== e.pointerId) return;
    if (!!Snackbar._draggedSnackbar) {
      e.preventDefault();
      const snackbar = Snackbar._draggedSnackbar;
      snackbar.deltaX = Math.abs(snackbar.xPos - e.clientX);
      snackbar.xPos = e.clientX;
      snackbar.velocityX = snackbar.deltaX / (Date.now() - snackbar.time);
      snackbar.time = Date.now();

      const totalDeltaX = snackbar.xPos - snackbar.startingXPos;
      const activationDistance = snackbar.el.offsetWidth * snackbar.options.activationPercent;
      snackbar.el.style.transform = `translateX(${totalDeltaX}px)`;
      snackbar.el.style.opacity = (1 - Math.abs(totalDeltaX / activationDistance)).toString();
    }
  }

  static _onDragEnd(e: PointerEvent) {
    if (Snackbar._dragPointerId !== e.pointerId) return;
    Snackbar._dragPointerId = null;
    if (!!Snackbar._draggedSnackbar) {
      const snackbar = Snackbar._draggedSnackbar;
      snackbar.panning = false;
      snackbar.el.classList.remove('panning');

      const totalDeltaX = snackbar.xPos - snackbar.startingXPos;
      const activationDistance = snackbar.el.offsetWidth * snackbar.options.activationPercent;
      const shouldBeDismissed = Math.abs(totalDeltaX) > activationDistance || snackbar.velocityX > 1;

      // Remove snackbar
      if (shouldBeDismissed) {
        snackbar.wasSwiped = true;
        snackbar.dismiss();
        // Animate snackbar back to original position
      } else {
        snackbar.el.style.transition = 'transform .2s, opacity .2s';
        snackbar.el.style.transform = '';
        snackbar.el.style.opacity = '';
        snackbar._resumeTimer();
      }
      Snackbar._draggedSnackbar = null;
    }
  }

  /**
   * A cancelled pointer is not a short swipe. Snap back and resume the timer
   * without consulting the distance travelled - the browser took the gesture
   * over, so the movement so far says nothing about what the user wanted.
   */
  static _onDragCancel(e: PointerEvent) {
    if (Snackbar._dragPointerId !== e.pointerId) return;
    Snackbar._dragPointerId = null;
    const snackbar = Snackbar._draggedSnackbar;
    if (!snackbar) return;
    snackbar.panning = false;
    snackbar.el.classList.remove('panning');
    snackbar.el.style.transition = 'transform .2s, opacity .2s';
    snackbar.el.style.transform = '';
    snackbar.el.style.opacity = '';
    snackbar._resumeTimer();
    Snackbar._draggedSnackbar = null;
  }

  /**
   * dismiss all snackbars.
   */
  static dismissAll() {
    // Copy first: dismiss() splices the list it is iterating.
    for (const snackbar of [...Snackbar._snackbars]) {
      snackbar.dismiss();
    }
  }

  _createSnackbar() {
    let snackbar: HTMLElement = this.options.snackbarId
      ? Utils.getElementById(this.options.root ?? document.body, this.options.snackbarId)
      : document.createElement('div');
    if (snackbar instanceof HTMLTemplateElement) {
      const node = (snackbar as HTMLTemplateElement).content.cloneNode(true);
      snackbar = (node as HTMLElement).firstElementChild as HTMLElement;
    }
    snackbar.classList.add('snackbar');
    snackbar.setAttribute('role', 'status');
    snackbar.setAttribute('aria-live', 'polite');
    snackbar.setAttribute('aria-atomic', 'true');
    // Add custom classes onto snackbar
    if (this.options.classes.length > 0) {
      snackbar.classList.add(...this.options.classes.split(' ').filter(Boolean));
    }
    if (this.message) {
      const text = document.createElement('p');
      text.textContent = this.message;
      snackbar.replaceChildren(text);
    }
    if (this.options.action) {
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = this.options.action;
      action.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof this.options.onAction === 'function') {
          this.options.onAction();
        }
        this.dismiss();
      });
      snackbar.appendChild(action);
    }
    if (this.options.dismissible) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'circle';
      close.setAttribute('aria-label', 'Dismiss');
      const icon = document.createElement('i');
      icon.className = 'material-symbols';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = 'close';
      close.appendChild(icon);
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss();
      });
      snackbar.appendChild(close);
    }
    Snackbar._container.appendChild(snackbar);
    return snackbar;
  }

  _animateIn() {
    this.el.style.display = '';
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateY(24px)';
    this.el.style.transition = `
      transform ${this.options.inDuration}ms ease,
      opacity ${this.options.inDuration}ms ease
    `;
    setTimeout(() => {
      this.el.style.transform = '';
      this.el.style.opacity = '1';
    }, 1);
  }

  /**
   * Arm the dismissal timer.
   *
   * One timeout, not a 20ms interval ticking a counter down: the old form woke
   * the page up 50 times a second per snackbar purely to subtract 20 from a
   * number. Dragging pauses the countdown via _pauseTimer/_resumeTimer instead.
   */
  _setTimer() {
    if (this.timeRemaining === Infinity) return;
    this._deadline = Date.now() + this.timeRemaining;
    this.counterTimeout = setTimeout(() => this.dismiss(), this.timeRemaining);
  }

  /** Stop the countdown, banking the time that was left on it. */
  _pauseTimer() {
    if (this.counterTimeout == null) return;
    clearTimeout(this.counterTimeout);
    this.counterTimeout = null;
    this.timeRemaining = Math.max(0, this._deadline - Date.now());
  }

  /** Restart a countdown stopped by {@link _pauseTimer}. */
  _resumeTimer() {
    if (this.counterTimeout != null) return;
    this._setTimer();
  }

  /**
   * Dismiss snackbar with animation.
   */
  dismiss() {
    if (this._dismissed) return;
    this._dismissed = true;
    clearTimeout(this.counterTimeout);
    this.counterTimeout = null;
    const activationDistance = this.el.offsetWidth * this.options.activationPercent;

    if (this.wasSwiped) {
      this.el.style.transition = 'transform .05s, opacity .05s';
      this.el.style.transform = `translateX(${activationDistance}px)`;
      this.el.style.opacity = '0';
    }

    // easeOutExpo
    this.el.style.transition = `
      margin ${this.options.outDuration}ms ease,
      opacity ${this.options.outDuration}ms ease`;

    setTimeout(() => {
      this.el.style.opacity = '0';
      this.el.style.marginTop = '-40px';
    }, 1);

    setTimeout(() => {
      // Call the optional callback
      if (typeof this.options.completeCallback === 'function') {
        this.options.completeCallback();
      }
      // Remove snackbar from DOM
      if (this.el.id != this.options.snackbarId) {
        this.el.remove();
        // Guarded: splice(-1, 1) on an already-removed snackbar would drop an
        // unrelated one off the end of the list.
        const index = Snackbar._snackbars.indexOf(this);
        if (index >= 0) Snackbar._snackbars.splice(index, 1);
        if (
          Snackbar._snackbars.length === 0 &&
          Snackbar._container &&
          Snackbar._container.childElementCount === 0
        ) {
          Snackbar._removeContainer();
        }
      }
    }, this.options.outDuration);
  }

  static {
    Snackbar._snackbars = [];
    Snackbar._container = null;
    Snackbar._draggedSnackbar = null;
  }
}
