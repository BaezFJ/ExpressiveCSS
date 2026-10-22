import { Component, BaseOptions } from '../core/component';

export interface NavigationRailOptions extends BaseOptions {
  /**
   * Called before the rail expands.
   */
  onOpenStart: (el: HTMLElement) => void;
  /**
   * Called after the rail expands.
   */
  onOpenEnd: (el: HTMLElement) => void;
  /**
   * Called before the rail collapses.
   */
  onCloseStart: (el: HTMLElement) => void;
  /**
   * Called after the rail collapses.
   */
  onCloseEnd: (el: HTMLElement) => void;
}

const _defaults: NavigationRailOptions = {
  onOpenStart: null,
  onOpenEnd: null,
  onCloseStart: null,
  onCloseEnd: null
};

const COMPACT = '(width < 600px)';
// Delay before a hovered destination opens its panel, and before the panel
// closes once the pointer leaves; it covers the trip across the rail's padding.
const HOVER_DELAY = 200;

/** The focused element, followed down through open shadow roots. */
function deepActiveElement(root: Document | ShadowRoot): Element | null {
  let active = root.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/**
 * Navigation rail. Layout is CSS (collapsed / .expanded). This class
 * toggles that class from the menu button, closes a compact overlay on
 * Escape or a scrim tap, and keeps aria-expanded in sync. A destination's
 * .navigation-rail-panel is a native popover; this class also opens it on
 * mouse hover.
 */
export class NavigationRail extends Component<NavigationRailOptions> {
  isExpanded: boolean;
  private _toggle: HTMLButtonElement | null;
  private _mql: MediaQueryList;
  private _hoverPanel: HTMLElement | null = null;
  private _hoverTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(el: HTMLElement, options: Partial<NavigationRailOptions>) {
    super(el, options);
    this.el['Expressive_NavigationRail'] = this;

    this._toggle = this._findToggle();
    this._mql = window.matchMedia(COMPACT);
    this.isExpanded = this.el.classList.contains('expanded');
    this._sync();
    this.el.addEventListener('click', this._onClick);
    this.el.addEventListener('pointerover', this._onPointerOver);
    this.el.addEventListener('pointerleave', this._onPointerLeave);
    document.addEventListener('keydown', this._onKeyDown);
  }

  static get defaults(): NavigationRailOptions {
    return _defaults;
  }

  static getInstance(el: HTMLElement): NavigationRail {
    return el['Expressive_NavigationRail'];
  }

  destroy() {
    this.el.removeEventListener('click', this._onClick);
    this.el.removeEventListener('pointerover', this._onPointerOver);
    this.el.removeEventListener('pointerleave', this._onPointerLeave);
    document.removeEventListener('keydown', this._onKeyDown);
    clearTimeout(this._hoverTimer);
    this.el['Expressive_NavigationRail'] = undefined;
  }

  /**
   * Expands the rail. On compact windows the overlay (scrim) is CSS.
   */
  expand = () => {
    if (this.isExpanded) return;
    if (!this._notify('open', this.options.onOpenStart, { current: () => !this.isExpanded })) return;
    this.isExpanded = true;
    this.el.classList.add('expanded');
    this._sync();
    this._notify('opened', this.options.onOpenEnd, { current: () => this.isExpanded });
  };

  /**
   * Collapses the rail.
   */
  collapse = () => {
    if (!this.isExpanded) return;
    if (!this._notify('close', this.options.onCloseStart, { current: () => this.isExpanded })) return;
    this.isExpanded = false;
    this.el.classList.remove('expanded');
    this._sync();
    this._notify('closed', this.options.onCloseEnd, { current: () => !this.isExpanded });
  };

  /**
   * Toggles expanded / collapsed.
   */
  toggle = () => {
    if (this.isExpanded) this.collapse();
    else this.expand();
  };

  private _findToggle(): HTMLButtonElement | null {
    const first = this.el.querySelector(':scope > button:not(.button, [popovertarget])');
    return first instanceof HTMLButtonElement ? first : null;
  }

  private _isCompact() {
    return this._mql.matches;
  }

  private _isModal() {
    return this.el.classList.contains('modal') || this._isCompact();
  }

  private _sync() {
    this.el.setAttribute('aria-expanded', this.isExpanded ? 'true' : 'false');
    this._toggle?.setAttribute('aria-expanded', this.isExpanded ? 'true' : 'false');
  }

  /** The side panel of the enabled destination around `target`, if any. */
  private _panelAt(target: EventTarget | null): HTMLElement | null {
    const trigger = target instanceof Element ? target.closest('button[popovertarget]:enabled') : null;
    const panel = (trigger as HTMLButtonElement | null)?.popoverTargetElement;
    return panel?.classList.contains('navigation-rail-panel') ? (panel as HTMLElement) : null;
  }

  // Looks the panel up again because the trigger can be disabled during the delay.
  private _hoverOpen(target: Element) {
    const panel = this._panelAt(target);
    if (!panel || panel.matches(':popover-open')) return;
    // `source` makes the trigger the panel's anchor and invoker, as a click would.
    (panel.showPopover as (options?: { source?: Element | null }) => void).call(panel, {
      source: target.closest('button[popovertarget]')
    });
    this._hoverPanel = panel;
  }

  // Closes the hover-opened panel after the delay, unless the pointer is still inside it.
  private _hoverClose(target: Element | null = null) {
    const panel = this._hoverPanel;
    if (!panel || panel.contains(target)) return;
    this._hoverTimer = setTimeout(() => {
      // Keyboard focus inside the panel keeps it open, as a click would.
      const root = this.el.getRootNode() as Document | ShadowRoot;
      if (panel.matches(':popover-open') && !panel.contains(root.activeElement)) panel.hidePopover();
      if (this._hoverPanel === panel) this._hoverPanel = null;
    }, HOVER_DELAY);
  }

  private _onPointerOver = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(this._hoverTimer);
    const target = e.target as Element;
    const panel = this._panelAt(target);
    if (!panel) this._hoverClose(target);
    // Hovering the open panel's own trigger leaves it as it is.
    else if (panel !== this._hoverPanel) {
      this._hoverTimer = setTimeout(() => this._hoverOpen(target), HOVER_DELAY);
    }
  };

  // The panel is a descendant, so moving onto it does not leave the rail.
  private _onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(this._hoverTimer);
    this._hoverClose();
  };

  // Clicking a hover-opened panel's trigger keeps it open instead of toggling
  // it shut; either way the panel no longer follows the pointer.
  private _pinPanel(e: MouseEvent): boolean {
    const panel = this._panelAt(e.target);
    if (!panel) return false;
    clearTimeout(this._hoverTimer);
    if (panel === this._hoverPanel && panel.matches(':popover-open')) e.preventDefault();
    this._hoverPanel = null;
    return true;
  }

  private _onClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Node) || this._pinPanel(e)) return;
    if (this._toggle?.contains(target)) {
      this.toggle();
      e.preventDefault();
      return;
    }
    if (this._isScrimClick(e) && this.isExpanded && this._isModal()) {
      this.collapse();
    }
  };

  // Escape closes an open side panel before the rail, and reports whether a
  // panel took the key. A hover-opened panel has no focus to return to, so
  // focus inside it goes back to its trigger.
  private _escapePanel(e: KeyboardEvent): boolean {
    // A pending hover would reopen a panel Escape just dismissed.
    clearTimeout(this._hoverTimer);
    this._hoverPanel = null;
    const panel = Array.from(this.el.querySelectorAll<HTMLElement>('.navigation-rail-panel')).find(
      (el) => el.matches(':popover-open')
    );
    if (!panel) return false;
    // A popover open inside the panel is on top; the browser closes it first.
    if (panel.querySelector(':popover-open')) return true;
    const root = this.el.getRootNode() as Document | ShadowRoot;
    const hadFocus = panel.contains(root.activeElement);
    panel.hidePopover();
    if (hadFocus) (panel.previousElementSibling as HTMLElement | null)?.focus();
    e.preventDefault();
    return true;
  }

  // The scrim is the rail's own ::before, so a click on blank space inside the
  // rail targets the rail just as a scrim click does. Only a click beside the
  // rail's box landed on the scrim; a modal rail spans the full height.
  private _isScrimClick(e: MouseEvent) {
    if (e.target !== this.el) return false;
    const { left, right } = this.el.getBoundingClientRect();
    return e.clientX < left || e.clientX > right;
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented || this._escapePanel(e)) return;
    if (this.isExpanded && this._isModal()) {
      const root = this.el.getRootNode() as Document | ShadowRoot;
      const restoreFocus = this.el.contains(root.activeElement);
      const focused = deepActiveElement(root);
      this.collapse();
      if (!this.isExpanded && restoreFocus && deepActiveElement(root) === focused) {
        this._toggle?.focus();
      }
    }
  };
}
