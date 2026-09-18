import { Utils } from '../core/utils';
import { BaseOptions, Component, InitElements, InitElement } from '../core/component';

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
  /** Ancestors forced to `overflow: visible`, with the inline value to put back. */
  private _changedAncestorList: HTMLElement[] = [];
  private static _overflow = new WeakMap<HTMLElement, { count: number; value: string; priority: string }>();
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
  private _revision = 0;

  constructor(el: HTMLElement, options: Partial<LightboxOptions>) {
    super(el, options, Lightbox);
    this.el['Expressive_Lightbox'] = this;

    this.options = {
      ...Lightbox.defaults,
      ...options
    };

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

  /**
   * Initializes instance of Lightbox.
   * @param el HTML element.
   * @param options Component options.
   */
  static init(el: HTMLElement, options?: Partial<LightboxOptions>): Lightbox;
  /**
   * Initializes instances of Lightbox.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(els: InitElements<InitElement>, options?: Partial<LightboxOptions>): Lightbox[];
  /**
   * Initializes instances of Lightbox.
   * @param els HTML elements.
   * @param options Component options.
   */
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<LightboxOptions> = {}
  ): Lightbox | Lightbox[] {
    return super.init(els, options, Lightbox);
  }

  static getInstance(el: HTMLElement): Lightbox {
    return el['Expressive_Lightbox'];
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    const root = this.el.getRootNode() as Document | ShadowRoot;
    const focused = root.activeElement === this.el;
    this._removeEventHandlers();
    this._cancel();
    this._reset();
    this.placeholder.replaceWith(this.el);
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (focused && (active === document.body || active === (root as ShadowRoot).host)) this._trigger.focus();
    if (this._tabindex === null) this.el.removeAttribute('tabindex');
    else this.el.setAttribute('tabindex', this._tabindex);
    this.el['Expressive_Lightbox'] = undefined;
  }

  private _reset() {
    window.removeEventListener('scroll', this._handleWindowScroll);
    window.removeEventListener('resize', this._handleWindowResize);
    window.removeEventListener('keyup', this._handleWindowEscape);
    this._overlay?.remove();
    this._photoCaption?.remove();
    for (const ancestor of this._changedAncestorList) {
      const saved = Lightbox._overflow.get(ancestor);
      if (--saved.count === 0) {
        ancestor.style.setProperty('overflow', saved.value, saved.priority);
        Lightbox._overflow.delete(ancestor);
      }
    }
    this._changedAncestorList = [];
    if (this.attrWidth !== null && this.attrWidth !== undefined) this.el.setAttribute('width', this.attrWidth);
    if (this.attrHeight !== null && this.attrHeight !== undefined) this.el.setAttribute('height', this.attrHeight);
    this.el.classList.remove('active');
    this.placeholder.removeAttribute('style');
    if (this.originInlineStyles === null) this.el.removeAttribute('style');
    else this.el.setAttribute('style', this.originInlineStyles);
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
    this._motion.addEventListener('change', this._handleMotionChange);
    this._trigger.addEventListener('click', this._handleLightboxClick);
    this.el.addEventListener('keydown', this._handleLightboxKeypress);
  }

  private _removeEventHandlers() {
    this._motion.removeEventListener('change', this._handleMotionChange);
    this._trigger.removeEventListener('click', this._handleLightboxClick);
    this.el.removeEventListener('keydown', this._handleLightboxKeypress);
  }

  private _handleLightboxClick = () => {
    this._handleLightboxToggle();
  };

  private _handleLightboxKeypress = (e: KeyboardEvent) => {
    if (this._trigger === this.el && (e.key === Utils.keys.ENTER || e.key === ' ')) {
      e.preventDefault();
      this._handleLightboxToggle();
    }
  };

  private _handleLightboxToggle = () => {
    // If already modal, return to original
    if (this._isOpen) this.close();
    else this.open();
  };

  private _handleWindowScroll = () => {
    if (this.overlayActive) this.close();
  };

  private _handleWindowResize = () => {
    if (this.overlayActive) this.close();
  };

  private _handleWindowEscape = (e: KeyboardEvent) => {
    if (e.key === Utils.keys.ESC) this.close();
  };

  private _makeAncestorsOverflowVisible() {
    this._changedAncestorList = [];
    let ancestor: Node = this.placeholder.parentNode;
    while (ancestor !== null && ancestor !== undefined && ancestor !== document) {
      const curr = <HTMLElement>ancestor;
      // A shadow root has no style; the clipping ancestors are above its host.
      if (curr.style && (curr.style.overflow !== 'visible' || Lightbox._overflow.has(curr))) {
        // Read before the write: an author's inline `overflow` has to come
        // back on close, and restoring '' would silently discard it.
        const saved = Lightbox._overflow.get(curr) ?? { count: 0, value: curr.style.overflow, priority: curr.style.getPropertyPriority('overflow') };
        saved.count++;
        Lightbox._overflow.set(curr, saved);
        this._changedAncestorList.push(curr);
        curr.style.overflow = 'visible';
      }
      ancestor = ancestor.parentNode ?? (<ShadowRoot>ancestor).host;
    }
  }

  private _offset(el: HTMLElement) {
    const box = el.getBoundingClientRect();
    const docElem = document.documentElement;
    return {
      top: box.top + window.scrollY - docElem.clientTop,
      left: box.left + window.scrollX - docElem.clientLeft
    };
  }
  private _updateVars(): void {
    this.windowWidth = window.innerWidth;
    this.windowHeight = window.innerHeight;
    this.caption = this.el.getAttribute('data-caption') || '';
  }

  // Image
  private _animateImageIn(): void {
    this.el.style.maxHeight = this.newHeight.toString() + 'px';
    this.el.style.maxWidth = this.newWidth.toString() + 'px';
    const duration = this._motion.matches ? 0 : this.options.inDuration;
    // from
    this.el.style.transition = 'none';
    this.el.style.height = this.originalHeight + 'px';
    this.el.style.width = this.originalWidth + 'px';
    this._schedule(() => {
      // One offset for both axes, read before any of the writes below.
      const placeholderOffset = this._offset(this.placeholder);
      // easeOutQuad
      this.el.style.transition = `height ${duration}ms ease,
        width ${duration}ms ease,
        left ${duration}ms ease,
        top ${duration}ms ease
      `;
      // to
      this.el.style.height = this.newHeight + 'px';
      this.el.style.width = this.newWidth + 'px';
      this.el.style.left =
        Utils.getDocumentScrollLeft() +
        this.windowWidth / 2 -
        placeholderOffset.left -
        this.newWidth / 2 +
        'px';

      this.el.style.top =
        Utils.getDocumentScrollTop() +
        this.windowHeight / 2 -
        placeholderOffset.top -
        this.newHeight / 2 +
        'px';
    }, 1);

    this._schedule(() => {
      this.doneAnimating = true;
      if (typeof this.options.onOpenEnd === 'function') this.options.onOpenEnd.call(this, this.el);
    }, duration);

  }
  private _animateImageOut(): void {
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
    this.el.style.left = '0';
    this.el.style.top = '0';
    this._schedule(() => {
      this._reset();
      // onCloseEnd callback
      if (typeof this.options.onCloseEnd === 'function')
        this.options.onCloseEnd.call(this, this.el);
    }, duration);
  }

  // Caption
  private _addCaption(): void {
    this._photoCaption = document.createElement('div');
    this._photoCaption.classList.add('lightbox-caption');
    this._photoCaption.innerText = this.caption;
    Utils.portalRoot(this.el).append(this._photoCaption);
    this._photoCaption.style.display = 'inline';
    // Animate
    this._photoCaption.style.transition = 'none';
    this._photoCaption.style.opacity = '0';
    const duration = this._motion.matches ? 0 : this.options.inDuration;
    this._schedule(() => {
      this._photoCaption.style.transition = `opacity ${duration}ms ease`;
      this._photoCaption.style.opacity = '1';
    }, 1);
  }
  private _removeCaption(): void {
    const duration = this._motion.matches ? 0 : this.options.outDuration;
    this._photoCaption.style.transition = `opacity ${duration}ms ease`;
    this._photoCaption.style.opacity = '0';
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

    // Put before in origin image to preserve z-index layering.
    this.el.before(this._overlay);

    // Set dimensions if needed
    const overlayOffset = this._overlay.getBoundingClientRect();
    this._overlay.style.width = this.windowWidth + 'px';
    this._overlay.style.height = this.windowHeight + 'px';
    this._overlay.style.left = -1 * overlayOffset.left + 'px';
    this._overlay.style.top = -1 * overlayOffset.top + 'px';

    // Animate
    this._overlay.style.transition = 'none';
    this._overlay.style.opacity = '0';
    const duration = this._motion.matches ? 0 : this.options.inDuration;
    this._schedule(() => {
      this._overlay.style.transition = `opacity ${duration}ms ease`;
      this._overlay.style.opacity = '1';
    }, 1);
  }
  private _removeOverlay(): void {
    const duration = this._motion.matches ? 0 : this.options.outDuration;
    this._overlay.style.transition = `opacity ${duration}ms ease`;
    this._overlay.style.opacity = '0';
  }

  /**
   * Open lightbox.
   */
  open = () => {
    if (this._destroyed || this._isOpen) return;
    const revision = this._cancel();
    if (this.overlayActive) this._reset();
    this._isOpen = true;
    this._updateVars();
    // Both rects are read up front: measuring the placeholder after writing
    // its width forced a second layout for the height.
    const originRect = this.el.getBoundingClientRect();
    const placeholderRect = this.placeholder.getBoundingClientRect();
    this.originalWidth = originRect.width;
    this.originalHeight = originRect.height;
    // Set states
    this.doneAnimating = false;
    this.el.classList.add('active');
    this.overlayActive = true;
    // onOpenStart callback
    if (typeof this.options.onOpenStart === 'function')
      this.options.onOpenStart.call(this, this.el);
    if (revision !== this._revision) return;
    // Set positioning for placeholder
    this.placeholder.style.width = placeholderRect.width + 'px';
    this.placeholder.style.height = placeholderRect.height + 'px';
    this.placeholder.style.position = 'relative';
    this.placeholder.style.top = '0';
    this.placeholder.style.left = '0';
    this._makeAncestorsOverflowVisible();
    // Set css on origin
    this.el.style.position = 'absolute';
    this.el.style.zIndex = '1000';
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
    this._addOverlay();
    // Add and animate caption if it exists
    if (this.caption !== '') this._addCaption();
    // Resize Image
    const widthPercent = this.originalWidth / this.windowWidth;
    const heightPercent = this.originalHeight / this.windowHeight;
    this.newWidth = 0;
    this.newHeight = 0;
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
    window.addEventListener('scroll', this._handleWindowScroll, { passive: true });
    window.addEventListener('resize', this._handleWindowResize, { passive: true });
    window.addEventListener('keyup', this._handleWindowEscape);
    this._animateImageIn();
  };

  /**
   * Close lightbox.
   */
  close = () => {
    if (this._destroyed || !this._isOpen) return;
    const revision = this._cancel();
    this._isOpen = false;
    this.doneAnimating = false;
    // onCloseStart callback
    if (typeof this.options.onCloseStart === 'function')
      this.options.onCloseStart.call(this, this.el);
    if (revision !== this._revision) return;
    // disable exit handlers
    window.removeEventListener('scroll', this._handleWindowScroll);
    window.removeEventListener('resize', this._handleWindowResize);
    window.removeEventListener('keyup', this._handleWindowEscape);
    if (this._overlay) this._removeOverlay();
    if (this._photoCaption) this._removeCaption();
    this._animateImageOut();
  };
}
