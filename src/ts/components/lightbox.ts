import { Utils, controllerFor, restoreAttribute } from '../core/utils';
import { BaseOptions, Component } from '../core/component';

export interface LightboxOptions extends BaseOptions {
  /**
   * Transition in duration in milliseconds.
   * @default 275
   */
  inDuration: number;
  /**
   * Transition out duration in milliseconds.
   * @default 200
   */
  outDuration: number;
  /**
   * Callback function called before lightbox is opened.
   * @default null
   */
  onOpenStart: (el: Element) => void;
  /**
   * Callback function called after lightbox is opened.
   * @default null
   */
  onOpenEnd: (el: Element) => void;
  /**
   * Callback function called before lightbox is closed.
   * @default null
   */
  onCloseStart: (el: Element) => void;
  /**
   * Callback function called after lightbox is closed.
   * @default null
   */
  onCloseEnd: (el: Element) => void;
}

const _defaults: LightboxOptions = {
  inDuration: 275,
  outDuration: 200,
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null
};

export class Lightbox extends Component<LightboxOptions> {
  /** If the lightbox overlay is showing. */
  overlayActive: boolean;
  /** If the lightbox is no longer being animated. */
  doneAnimating: boolean;
  /** Caption, if specified. */
  caption: string;
  /** Original width of image. */
  originalWidth: number;
  /** Original height of image. */
  originalHeight: number;
  private originInlineStyles: string;
  private placeholder: HTMLElement;
  private newHeight: number;
  private newWidth: number;
  private windowWidth: number;
  private windowHeight: number;
  private attrWidth: string;
  private attrHeight: string;
  private _overlay: HTMLElement;
  private _photoCaption: HTMLElement;
  private _trigger: HTMLElement;
  private _tabindex: string | null;
  private _timers = new Map<ReturnType<typeof setTimeout>, () => void>();
  private _motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private _isOpen = false;
  private _destroyed = false;
  /** Removes the listeners that close an open lightbox. */
  private _windowEvents: AbortController | undefined;
  private _revision = 0;
  // Counts opens and closes only. _revision also moves when reduced motion
  // flushes a transition, which must still report its end.
  private _phase = 0;

  constructor(el: HTMLElement, options: Partial<LightboxOptions>) {
    super(el, options);

    this.overlayActive = false;
    this.doneAnimating = true;
    this.placeholder = document.createElement('div');
    this.placeholder.classList.add('material-placeholder');
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.originInlineStyles = this.el.getAttribute('style');
    this.caption = this.el.getAttribute('data-caption') || '';
    this._tabindex = this.el.getAttribute('tabindex');
    this._trigger = this.el.closest('button') ?? this.el;
    this.el.tabIndex = this._trigger === this.el ? 0 : -1;
    // Wrap
    this.el.before(this.placeholder);
    this.placeholder.append(this.el);
    this._setupEventHandlers();
  }

  static get defaults(): LightboxOptions {
    return _defaults;
  }

  static key = 'Expressive_Lightbox';

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    const focused = (this.el.getRootNode() as Document | ShadowRoot).activeElement === this.el;
    this._cancel();
    this._reset();
    this.placeholder.replaceWith(this.el);
    if (focused) this._restoreFocus();
    restoreAttribute(this.el, 'tabindex', this._tabindex);
    super.destroy();
  }

  // Back to the trigger when focus fell to the body (or the shadow host), as
  // a click on the overlay, which cannot take focus, leaves it.
  private _restoreFocus() {
    const root = this.el.getRootNode() as Document | ShadowRoot;
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if ([document.body, (root as ShadowRoot).host].includes(active)) this._trigger.focus({ preventScroll: true });
  }

  private _reset() {
    this._windowEvents?.abort();
    // Removing a popover, or its attribute, takes it out of the top layer.
    this._overlay?.remove();
    this._photoCaption?.remove();
    this.el.removeAttribute('popover');
    if (this.attrWidth != null) this.el.setAttribute('width', this.attrWidth);
    if (this.attrHeight != null) this.el.setAttribute('height', this.attrHeight);
    this.el.classList.remove('active');
    this.placeholder.removeAttribute('style');
    restoreAttribute(this.el, 'style', this.originInlineStyles);
    this.overlayActive = false;
    this._isOpen = false;
    this.doneAnimating = true;
  }

  private _cancel() {
    for (const timer of this._timers.keys()) clearTimeout(timer);
    this._timers.clear();
    return ++this._revision;
  }

  private _schedule(callback: () => void, delay: number) {
    if (this._motion.matches) { callback(); return; }
    const timer = setTimeout(() => { this._timers.delete(timer); callback(); }, delay);
    this._timers.set(timer, callback);
  }

  private _handleMotionChange = () => {
    if (!this._motion.matches) return;
    const callbacks = [...this._timers.values()];
    const revision = this._cancel();
    for (const callback of callbacks) {
      if (revision !== this._revision) break;
      callback();
    }
    if (this.overlayActive) {
      for (const el of [this.el, this._overlay, this._photoCaption]) if (el) el.style.transition = 'none';
    }
  };

  private _setupEventHandlers() {
    const { signal } = this._events;
    this._motion.addEventListener('change', this._handleMotionChange, { signal });
    this._trigger.addEventListener('click', this._handleLightboxToggle, { signal });
    this.el.addEventListener('keydown', this._handleLightboxKeypress, { signal });
  }

  private _handleLightboxKeypress = (e: KeyboardEvent) => {
    if (this._trigger === this.el && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this._handleLightboxToggle();
    }
  };

  private _handleLightboxToggle = () => {
    // If already modal, return to original
    if (this._isOpen) this.close();
    else this.open();
  };

  private _handleWindowChange = () => {
    if (this.overlayActive) this.close();
  };

  private _handleWindowEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };

  // The image zooms in place, not in a modal, so Tab would reach the page
  // behind the overlay. Tab closes it instead, then moves focus as usual.
  private _handleWindowTab = (e: KeyboardEvent) => {
    if (e.key === 'Tab') this.close();
  };

  /**
   * Shows `el` as a manual popover, so it is in the top layer: no ancestor
   * clips or covers it, and it stacks above what was shown before it.
   */
  private _showOnTop(el: HTMLElement) {
    el.setAttribute('popover', 'manual');
    el.showPopover();
  }

  /** The placeholder's document position, where the image rests. */
  private _restingPlace() {
    const box = this.placeholder.getBoundingClientRect();
    return { left: box.left + window.scrollX + 'px', top: box.top + window.scrollY + 'px' };
  }

  private _updateVars(): void {
    this.windowWidth = window.innerWidth;
    this.windowHeight = window.innerHeight;
    this.caption = this.el.getAttribute('data-caption') || '';
  }

  // Image
  private _animateImageIn(): void {
    const phase = this._phase;
    this.el.style.maxHeight = this.newHeight.toString() + 'px';
    this.el.style.maxWidth = this.newWidth.toString() + 'px';
    const duration = this._motion.matches ? 0 : this.options.inDuration;
    // from
    this.el.style.transition = 'none';
    this.el.style.height = this.originalHeight + 'px';
    this.el.style.width = this.originalWidth + 'px';
    this._schedule(() => {
      // easeOutQuad
      this.el.style.transition = `height ${duration}ms ease,
        width ${duration}ms ease,
        left ${duration}ms ease,
        top ${duration}ms ease
      `;
      // to
      this.el.style.height = this.newHeight + 'px';
      this.el.style.width = this.newWidth + 'px';
      this.el.style.left = window.scrollX + (this.windowWidth - this.newWidth) / 2 + 'px';
      this.el.style.top = window.scrollY + (this.windowHeight - this.newHeight) / 2 + 'px';
    }, 1);

    this._schedule(() => {
      this.doneAnimating = true;
      this._notify('opened', this.options.onOpenEnd, { current: () => phase === this._phase });
    }, duration);

  }
  private _animateImageOut(): void {
    const phase = this._phase;
    const duration = this._motion.matches ? 0 : this.options.outDuration;
    // easeOutQuad
    this.el.style.transition = `height ${duration}ms ease,
      width ${duration}ms ease,
      left ${duration}ms ease,
      top ${duration}ms ease
    `;
    // to
    this.el.style.height = this.originalHeight + 'px'; // was originalWidth
    this.el.style.width = this.originalWidth + 'px';
    Object.assign(this.el.style, this._restingPlace());
    this._schedule(() => {
      this._reset();
      // onCloseEnd callback
      this._notify('closed', this.options.onCloseEnd, { current: () => phase === this._phase });
    }, duration);
  }

  // Caption
  private _addCaption(): void {
    this._photoCaption = document.createElement('div');
    this._photoCaption.classList.add('lightbox-caption');
    this._photoCaption.innerText = this.caption;
    Utils.portalRoot(this.el).append(this._photoCaption);
    this._photoCaption.style.display = 'inline';
    this._showOnTop(this._photoCaption);
    this._fadeIn(this._photoCaption);
  }

  // Overlay
  private _addOverlay(): void {
    this._overlay = document.createElement('div');
    this._overlay.id = 'lightbox-overlay';
    this._overlay.addEventListener(
      'click',
      (event) => {
        event.stopPropagation();
        this.close();
      },
      { once: true }
    );

    this.el.before(this._overlay);
    this._showOnTop(this._overlay);
    this._fadeIn(this._overlay);
  }

  private _fadeIn(el: HTMLElement): void {
    el.style.transition = 'none';
    el.style.opacity = '0';
    const duration = this._motion.matches ? 0 : this.options.inDuration;
    this._schedule(() => {
      el.style.transition = `opacity ${duration}ms ease`;
      el.style.opacity = '1';
    }, 1);
  }

  private _fadeOut(el: HTMLElement): void {
    const duration = this._motion.matches ? 0 : this.options.outDuration;
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = '0';
  }

  /**
   * Open lightbox.
   */
  open = () => {
    if (this._destroyed || this._isOpen) return;
    this._phase++;
    const revision = this._cancel();
    if (this.overlayActive) this._reset();
    this._updateVars();
    // Both rects are read up front: measuring the placeholder after writing
    // its width forced a second layout for the height.
    const originRect = this.el.getBoundingClientRect();
    const placeholderRect = this.placeholder.getBoundingClientRect();
    // An image not yet loaded, or hidden, has no size to zoom from; the
    // ratios below would be 0 / 0.
    if (!originRect.width || !originRect.height) return;
    this._isOpen = true;
    this.originalWidth = originRect.width;
    this.originalHeight = originRect.height;
    // Set states
    this.doneAnimating = false;
    this.el.classList.add('active');
    this.overlayActive = true;
    // onOpenStart callback
    if (!this._notify('open', this.options.onOpenStart, { current: () => revision === this._revision })) return;
    // Set positioning for placeholder
    this.placeholder.style.width = placeholderRect.width + 'px';
    this.placeholder.style.height = placeholderRect.height + 'px';
    // In the top layer the image is positioned in the document, starting
    // where the placeholder holds its place.
    this.el.style.position = 'absolute';
    this.el.style.inset = 'auto';
    this.el.style.left = placeholderRect.left + window.scrollX + 'px';
    this.el.style.top = placeholderRect.top + window.scrollY + 'px';
    this.el.style.willChange = 'left, top, width, height';
    // Change from width or height attribute to css
    this.attrWidth = this.el.getAttribute('width');
    this.attrHeight = this.el.getAttribute('height');
    if (this.attrWidth) {
      this.el.style.width = this.attrWidth + 'px';
      this.el.removeAttribute('width');
    }
    if (this.attrHeight) {
      this.el.style.height = this.attrHeight + 'px'; // was width, from the height attribute
      this.el.removeAttribute('height');
    }
    // The overlay, the image and the caption go into the top layer in that
    // order, so each stacks above the one before.
    this._addOverlay();
    this._showOnTop(this.el);
    if (this.caption !== '') this._addCaption();
    // Resize Image
    const widthPercent = this.originalWidth / this.windowWidth;
    const heightPercent = this.originalHeight / this.windowHeight;
    if (widthPercent > heightPercent) {
      // Width first
      const ratio = this.originalHeight / this.originalWidth;
      this.newWidth = this.windowWidth * 0.9;
      this.newHeight = this.windowWidth * 0.9 * ratio;
    } else {
      // Height first
      const ratio = this.originalWidth / this.originalHeight;
      this.newWidth = this.windowHeight * 0.9 * ratio;
      this.newHeight = this.windowHeight * 0.9;
    }
    // Handle Exit triggers
    this._windowEvents?.abort();
    this._windowEvents = controllerFor(this.el);
    const { signal } = this._windowEvents;
    window.addEventListener('scroll', this._handleWindowChange, { passive: true, signal });
    window.addEventListener('resize', this._handleWindowChange, { passive: true, signal });
    window.addEventListener('keyup', this._handleWindowEscape, { signal });
    window.addEventListener('keydown', this._handleWindowTab, { signal });
    this._animateImageIn();
  };

  /**
   * Close lightbox.
   */
  close = () => {
    if (this._destroyed || !this._isOpen) return;
    this._phase++;
    const revision = this._cancel();
    this._isOpen = false;
    this.doneAnimating = false;
    // onCloseStart callback
    if (!this._notify('close', this.options.onCloseStart, { current: () => revision === this._revision })) return;
    // disable exit handlers
    this._windowEvents?.abort();
    this._restoreFocus();
    if (this._overlay) this._fadeOut(this._overlay);
    if (this._photoCaption) this._fadeOut(this._photoCaption);
    this._animateImageOut();
  };
}
