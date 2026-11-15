import { Component, BaseOptions } from '../core/component';
import { Utils, deepActiveElement } from '../core/utils';

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
// The menu toggle the CSS styles: a first-child button that isn't the FAB or a panel trigger.
const TOGGLE = ':scope > button:first-child:not(.button, [popovertarget])';

/** A button focus can return to: still in the page, enabled and shown. */
const usable = (button: HTMLButtonElement | null): button is HTMLButtonElement =>
  Boolean(button?.isConnected) && !button.disabled && !button.closest('[hidden]');
// Delay before a hovered destination opens its panel, and before the panel
// closes once the pointer leaves; it covers the trip across the rail's padding.
const HOVER_DELAY = 200;

/**
 * Navigation rail. Layout is CSS (collapsed / .expanded). This class
 * toggles that class from the menu button, or from any button outside the
 * rail whose aria-controls names it, closes a compact overlay on Escape or a
 * scrim tap, and keeps aria-expanded in sync on every toggle. A destination's
 * .navigation-rail-panel is a native popover; this class also opens it on
 * mouse hover.
 */
export class NavigationRail extends Component<NavigationRailOptions> {
  isExpanded: boolean;
  private _toggle: HTMLButtonElement | null;
  private _mql: MediaQueryList;
  private _hoverPanel: HTMLElement | null = null;
  private _hoverTimer: ReturnType<typeof setTimeout> | undefined;
  // The toggle that last opened the rail, for Escape to return focus to.
  private _opener: HTMLButtonElement | null = null;

  constructor(el: HTMLElement, options: Partial<NavigationRailOptions>) {
    super(el, options);

    this._toggle = this._findToggle();
    this._mql = window.matchMedia(COMPACT);
    this.isExpanded = this.el.classList.contains('expanded');
    this._sync();
    const { signal } = this._events;
    this.el.addEventListener('click', this._onClick, { signal });
    this.el.addEventListener('pointerover', this._onPointerOver, { signal });
    this.el.addEventListener('pointerleave', this._onPointerLeave, { signal });
    document.addEventListener('keydown', this._onKeyDown, { signal });
    document.addEventListener('click', this._onDocumentClick, { signal });
  }

  static get defaults(): NavigationRailOptions {
    return _defaults;
  }

  static key = 'Expressive_NavigationRail';

  destroy() {
    clearTimeout(this._hoverTimer);
    super.destroy();
  }

  /**
   * Expands the rail. On compact windows the overlay (scrim) is CSS.
   */
  expand = () => {
    if (this.isExpanded) return;
    this._opener = null;
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
    const first = this.el.querySelector(TOGGLE);
    return first instanceof HTMLButtonElement ? first : null;
  }

  // Looked up on every use, so a button added after the rail started counts.
  // An ID reference can't cross a shadow boundary, so only the rail's own root.
  private _outsideToggles(): HTMLButtonElement[] {
    const id = this.el.id;
    if (!id) return [];
    const root = this.el.getRootNode() as ParentNode;
    return Array.from(root.querySelectorAll<HTMLButtonElement>('button[aria-controls]')).filter(
      (button) => !this.el.contains(button) && button.getAttribute('aria-controls').split(/\s+/).includes(id)
    );
  }

  // Records the opener only when the rail really opened.
  private _toggleFrom(button: HTMLButtonElement) {
    if (this.isExpanded) return this.collapse();
    this.expand();
    if (this.isExpanded) this._opener = button;
  }

  // Where Escape sends focus: the opener, else the inside toggle, else the
  // first outside toggle, skipping any that are gone, disabled or hidden.
  private _returnTarget(): HTMLButtonElement | null {
    const outside = this._outsideToggles();
    const names = (button: HTMLButtonElement) => button === this._toggle || outside.includes(button);
    return [this._opener, this._toggle, ...outside].find((button) => usable(button) && names(button)) ?? null;
  }

  private _isCompact() {
    return this._mql.matches;
  }

  private _isModal() {
    return this.el.classList.contains('modal') || this._isCompact();
  }

  private _sync() {
    const value = this.isExpanded ? 'true' : 'false';
    for (const el of [this.el, this._toggle, ...this._outsideToggles()]) el?.setAttribute('aria-expanded', value);
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
      if (panel.matches(':popover-open') && !Utils.focusIsIn(panel)) panel.hidePopover();
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
    if (!(target instanceof Node) || this._pinPanel(e) || this._insideToggleClick(e, target)) return;
    if (this._isScrimClick(e) && this._isOverlay()) this.collapse();
  };

  // Reports whether the click was on the rail's own menu toggle.
  private _insideToggleClick(e: MouseEvent, target: Node): boolean {
    if (!this._toggle?.contains(target)) return false;
    this._toggleFrom(this._toggle);
    e.preventDefault();
    return true;
  }

  // An expanded rail drawn as an overlay, which Escape and the scrim close.
  private _isOverlay() {
    return this.isExpanded && this._isModal();
  }

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
    const hadFocus = Utils.focusIsIn(panel);
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

  // A click on an outside toggle, or on its icon. Prevented, so a submit
  // button in an app bar form doesn't submit.
  private _onDocumentClick = (e: MouseEvent) => {
    const button = Utils.closestInPath<HTMLButtonElement>(e, 'button[aria-controls]:enabled');
    if (!button || !this._outsideToggles().includes(button)) return;
    e.preventDefault();
    this._toggleFrom(button);
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented || this._escapePanel(e)) return;
    if (this._isOverlay()) this._escapeRail();
  };

  // Collapses the overlay. Focus that was inside the rail goes to the return
  // target, unless a close callback moved it.
  private _escapeRail() {
    const root = this.el.getRootNode() as Document | ShadowRoot;
    const before = Utils.focusIsIn(this.el) ? deepActiveElement(root) : null;
    const target = this._returnTarget();
    this.collapse();
    if (!this.isExpanded) this._restoreFocus(root, before, target);
  }

  private _restoreFocus(root: Document | ShadowRoot, before: Element | null, target: HTMLButtonElement | null) {
    if (before && deepActiveElement(root) === before) target?.focus();
  }
}
